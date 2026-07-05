/**
 * ip-geo-outbound-rename.js
 *
 * 目标：
 * 1) 按节点 IP / 域名解析后的真实 IP 归属地重命名节点
 * 2) 可选地检测本机真实出口归属地，并追加到节点名末尾
 *
 * 适用：Sub-Store Script Operator
 *
 * 参数（URL fragment / $arguments）：
 * - nm=true        保留无法识别的节点（默认 false；false 时丢弃）
 * - out=true       追加出口归属地（默认 false）
 * - sep= |         名称分隔符，默认 " | "
 * - outSep= |      出口前缀分隔符，默认与 sep 相同
 * - debug=true     打印调试日志
 * - city=true      尽量追加城市（若 Geo API 返回）
 * - countryCode=true  使用国家代码而不是国家全名
 * - bare=true      只输出国家，不带原节点名
 * - chinese=true   输出中文国家名（默认 true）
 *
 * 推荐：
 * - 节点名格式：国家 | 出口国
 * - 加国旗
 * - 增加缓存，减少 API 请求
 */

const args = typeof $arguments === 'object' && $arguments ? $arguments : {};
const nm = toBool(args.nm, false);
const outEnabled = toBool(args.out, false);
const debug = toBool(args.debug, false);
const includeCity = toBool(args.city, false);
const useCountryCode = toBool(args.countryCode, false);
const bareCountryOnly = toBool(args.bare, false);
const chineseNames = toBool(args.chinese, true);
const sep = decodeOrDefault(args.sep, ' | ');
const outSep = decodeOrDefault(args.outSep, sep);

const GEO_CACHE = new Map();
const RESOLVE_CACHE = new Map();
let outboundGeoPromise = null;
const REGION_ZH = typeof Intl !== 'undefined' && Intl.DisplayNames
  ? new Intl.DisplayNames(['zh-Hans'], { type: 'region' })
  : null;

function toBool(v, fallback) {
  if (v === undefined || v === null || v === '') return fallback;
  if (typeof v === 'boolean') return v;
  const s = String(v).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on', 'y'].includes(s)) return true;
  if (['0', 'false', 'no', 'off', 'n'].includes(s)) return false;
  return fallback;
}

function decodeOrDefault(v, fallback) {
  if (v === undefined || v === null || v === '') return fallback;
  try {
    return decodeURIComponent(String(v));
  } catch (_) {
    return String(v);
  }
}

function log(...parts) {
  if (debug) console.log('[ip-geo-rename]', ...parts);
}

function isIPv4(value) {
  if (typeof value !== 'string') return false;
  return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(value) && value.split('.').every((n) => Number(n) >= 0 && Number(n) <= 255);
}

function isIPv6(value) {
  if (typeof value !== 'string') return false;
  return /^[0-9a-fA-F:]+$/.test(value) && value.includes(':');
}

function getHostFromNode(node) {
  return (
    node.server ||
    node.address ||
    node.host ||
    node.add ||
    node.hostname ||
    node.ip ||
    node.ipv4 ||
    node.ipv6 ||
    ''
  );
}

function stripAuthAndPort(host) {
  if (!host) return '';
  let s = String(host).trim();
  if (s.includes('@')) s = s.split('@').pop();
  if (s.startsWith('[') && s.includes(']')) {
    const end = s.indexOf(']');
    return s.slice(1, end);
  }
  const portMatch = s.match(/^(.+):([0-9]{1,5})$/);
  if (portMatch && !portMatch[1].includes(':')) return portMatch[1];
  return s;
}

function regionName(code) {
  const cc = String(code || '').trim().toUpperCase();
  if (!cc) return '';
  if (REGION_ZH) {
    try {
      const zh = REGION_ZH.of(cc);
      if (zh) return zh;
    } catch (_) {}
  }
  return cc;
}

function flagFromCountryCode(code) {
  const cc = String(code || '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return '';
  const A = 0x1F1E6;
  return String.fromCodePoint(A + (cc.charCodeAt(0) - 65), A + (cc.charCodeAt(1) - 65));
}

function getCountryLabel(info) {
  if (!info) return '';
  const rawCode = info.countryCode || info.country_code || '';
  const countryText = useCountryCode
    ? rawCode
    : (chineseNames ? regionName(rawCode) : (info.country || info.countryName || info.country_name || ''));
  const flag = flagFromCountryCode(rawCode);
  if (!countryText) return '';
  return flag ? `${flag} ${countryText}` : countryText;
}

function normalizeGeoResponse(data, fallbackIp) {
  return {
    ip: data.ip || fallbackIp || '',
    country: data.country_name || data.country || data.countryName || '',
    countryCode: data.country || data.country_code || data.countryCode || '',
    city: data.city || '',
    region: data.region || data.region_name || '',
    asn: data.asn || data.asn_org || '',
    org: data.org || data.asn_org || data.company || '',
    raw: data,
  };
}

async function fetchJson(url, opts = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeout || 8000);
  try {
    const resp = await fetch(url, {
      method: 'GET',
      headers: opts.headers || {},
      signal: controller.signal,
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchText(url, opts = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeout || 8000);
  try {
    const resp = await fetch(url, {
      method: 'GET',
      headers: opts.headers || {},
      signal: controller.signal,
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return (await resp.text()).trim();
  } finally {
    clearTimeout(timeout);
  }
}

async function getGeoByIp(ip) {
  if (!ip) throw new Error('empty ip');
  const key = String(ip).trim();
  if (GEO_CACHE.has(key)) return GEO_CACHE.get(key);

  const providers = [
    () => fetchJson(`https://ipapi.co/${encodeURIComponent(key)}/json/`, { timeout: 8000 }),
    () => fetchJson(`https://ipwho.is/${encodeURIComponent(key)}`, { timeout: 8000 }),
  ];

  let lastErr = null;
  for (const provider of providers) {
    try {
      const data = await provider();
      if (data && data.success === false && data.message) throw new Error(data.message);
      const geo = normalizeGeoResponse(data, key);
      if (!geo.country && !geo.countryCode) throw new Error('geo response missing country');
      GEO_CACHE.set(key, geo);
      return geo;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error(`geo lookup failed: ${key}`);
}

async function resolveHostToIp(host) {
  const key = String(host || '').trim();
  if (!key) throw new Error('empty host');
  if (RESOLVE_CACHE.has(key)) return RESOLVE_CACHE.get(key);

  if (isIPv4(key) || isIPv6(key)) {
    RESOLVE_CACHE.set(key, key);
    return key;
  }

  const resolvers = [
    async () => {
      const data = await fetchJson(`https://dns.google/resolve?name=${encodeURIComponent(key)}&type=A`, { timeout: 8000 });
      const answer = Array.isArray(data.Answer) ? data.Answer.find((x) => x.type === 1 && x.data) : null;
      return answer ? answer.data : '';
    },
    async () => {
      const data = await fetchJson(`https://dns.google/resolve?name=${encodeURIComponent(key)}&type=AAAA`, { timeout: 8000 });
      const answer = Array.isArray(data.Answer) ? data.Answer.find((x) => x.type === 28 && x.data) : null;
      return answer ? answer.data : '';
    },
  ];

  let lastErr = null;
  for (const resolver of resolvers) {
    try {
      const ip = await resolver();
      if (ip && (isIPv4(ip) || isIPv6(ip))) {
        RESOLVE_CACHE.set(key, ip);
        return ip;
      }
    } catch (err) {
      lastErr = err;
    }
  }

  throw lastErr || new Error(`resolve failed: ${key}`);
}

async function detectOutboundGeo() {
  if (!outEnabled) return null;
  if (outboundGeoPromise) return outboundGeoPromise;

  outboundGeoPromise = (async () => {
    const ipSources = [
      'https://api.ipify.org',
      'https://ifconfig.me/ip',
      'https://ident.me',
    ];

    let outIp = '';
    let lastErr = null;
    for (const url of ipSources) {
      try {
        const text = await fetchText(url, { timeout: 7000 });
        if (text && (isIPv4(text) || isIPv6(text))) {
          outIp = text;
          break;
        }
      } catch (err) {
        lastErr = err;
      }
    }
    if (!outIp) throw lastErr || new Error('failed to detect outbound ip');
    const geo = await getGeoByIp(outIp);
    log('outbound', outIp, '=>', getCountryLabel(geo));
    return { ip: outIp, geo };
  })();

  return outboundGeoPromise;
}

function buildBaseName(node, geo) {
  const name = String(node.name || '').trim();
  const label = getCountryLabel(geo);
  if (!label) return nm ? name : '';
  return bareCountryOnly ? label : (name ? `${name}${sep}${label}` : label);
}

function getTag(node) {
  const host = stripAuthAndPort(getHostFromNode(node));
  return host;
}

async function resolveNodeGeo(node) {
  const host = getTag(node);
  if (!host) throw new Error('node missing host/server/address');
  const ip = await resolveHostToIp(host);
  const geo = await getGeoByIp(ip);
  return { host, ip, geo };
}

async function operator(proxies) {
  const outbound = await detectOutboundGeo().catch((err) => {
    log('outbound geo skipped:', err && err.message ? err.message : err);
    return null;
  });
  const outboundLabel = outbound ? getCountryLabel(outbound.geo) : '';

  const result = [];
  for (const node of proxies) {
    try {
      const { host, ip, geo } = await resolveNodeGeo(node);
      const baseName = buildBaseName(node, geo);
      if (!baseName) {
        if (!nm) {
          log('drop', node.name, 'host=', host, 'ip=', ip, 'reason=no geo label');
          continue;
        }
        node.name = String(node.name || '');
      } else {
        node.name = outboundLabel ? `${baseName}${outSep}↗ ${outboundLabel}` : baseName;
      }
      node._ipGeo = { host, ip, country: geo.country, countryCode: geo.countryCode, city: geo.city };
      result.push(node);
      log('rename', host, '=>', node.name);
    } catch (err) {
      if (nm) {
        if (outboundLabel && node.name) node.name = `${node.name}${outSep}↗ ${outboundLabel}`;
        result.push(node);
        log('fallback keep', node.name, err && err.message ? err.message : err);
      } else {
        log('drop node', node.name, err && err.message ? err.message : err);
      }
    }
  }

  return result;
}

if (typeof module !== 'undefined' && module.exports) module.exports = operator;
if (typeof globalThis !== 'undefined') globalThis.operator = operator;
