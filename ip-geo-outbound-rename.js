/*
 * Sub-Store Script Operator: Chinese country rename with outbound cache.
 * ES5 synchronous version for reliable Sub-Store local script mode.
 *
 * Output: 节点国家 | 出口国家, e.g. 🇩🇪 德国 | 🇯🇵 日本
 *
 * Arguments:
 * - bare=true              only output country/outbound, do not keep original name
 * - chinese=true           Chinese country names, default true
 * - out=true               append outbound country, default true
 * - outboundTtl=21600      outbound cache TTL seconds, default 6h
 * - outboundCacheKey=...   cache key used by updater and script
 * - sep= |                 separator
 * - nm=true                keep original name if country cannot be detected
 * - debug=true             log debug output
 *
 * Notes:
 * - This Script Operator is intentionally synchronous: no fetch/Promise.
 * - A host-side updater refreshes outbound cache in /home/ubuntu/substore/root.json.
 */

var args = typeof $arguments === 'object' && $arguments ? $arguments : {};
var nm = toBool(args.nm, true);
var debug = toBool(args.debug, false);
var bare = toBool(args.bare, true);
var chinese = toBool(args.chinese, true);
var outEnabled = toBool(args.out, true);
var sep = decodeOrDefault(args.sep, ' | ');
var outboundTtl = parseInt(args.outboundTtl || '21600', 10);
if (!outboundTtl || outboundTtl < 60) outboundTtl = 21600;
var outboundCacheKey = String(args.outboundCacheKey || 'substore_rename_outbound_geo_v1');

var COUNTRY_CACHE = {};
var OUTBOUND_CACHE = null;

var COUNTRY_MAP = {
  AD: ['安道尔', '🇦🇩'], AE: ['阿联酋', '🇦🇪'], AF: ['阿富汗', '🇦🇫'], AL: ['阿尔巴尼亚', '🇦🇱'], AM: ['亚美尼亚', '🇦🇲'], AO: ['安哥拉', '🇦🇴'],
  AR: ['阿根廷', '🇦🇷'], AT: ['奥地利', '🇦🇹'], AU: ['澳大利亚', '🇦🇺'], AZ: ['阿塞拜疆', '🇦🇿'], BA: ['波黑', '🇧🇦'], BD: ['孟加拉国', '🇧🇩'],
  BE: ['比利时', '🇧🇪'], BG: ['保加利亚', '🇧🇬'], BH: ['巴林', '🇧🇭'], BR: ['巴西', '🇧🇷'], BY: ['白俄罗斯', '🇧🇾'], CA: ['加拿大', '🇨🇦'],
  CH: ['瑞士', '🇨🇭'], CL: ['智利', '🇨🇱'], CN: ['中国', '🇨🇳'], CO: ['哥伦比亚', '🇨🇴'], CR: ['哥斯达黎加', '🇨🇷'], CY: ['塞浦路斯', '🇨🇾'],
  CZ: ['捷克', '🇨🇿'], DE: ['德国', '🇩🇪'], DK: ['丹麦', '🇩🇰'], EE: ['爱沙尼亚', '🇪🇪'], EG: ['埃及', '🇪🇬'], ES: ['西班牙', '🇪🇸'],
  FI: ['芬兰', '🇫🇮'], FR: ['法国', '🇫🇷'], GB: ['英国', '🇬🇧'], GR: ['希腊', '🇬🇷'], HK: ['香港', '🇭🇰'], HR: ['克罗地亚', '🇭🇷'],
  HU: ['匈牙利', '🇭🇺'], ID: ['印度尼西亚', '🇮🇩'], IE: ['爱尔兰', '🇮🇪'], IL: ['以色列', '🇮🇱'], IN: ['印度', '🇮🇳'], IR: ['伊朗', '🇮🇷'],
  IS: ['冰岛', '🇮🇸'], IT: ['意大利', '🇮🇹'], JP: ['日本', '🇯🇵'], KR: ['韩国', '🇰🇷'], KH: ['柬埔寨', '🇰🇭'], KZ: ['哈萨克斯坦', '🇰🇿'],
  LT: ['立陶宛', '🇱🇹'], LU: ['卢森堡', '🇱🇺'], LV: ['拉脱维亚', '🇱🇻'], MA: ['摩洛哥', '🇲🇦'], MD: ['摩尔多瓦', '🇲🇩'], MX: ['墨西哥', '🇲🇽'],
  MY: ['马来西亚', '🇲🇾'], NL: ['荷兰', '🇳🇱'], NO: ['挪威', '🇳🇴'], NZ: ['新西兰', '🇳🇿'], PH: ['菲律宾', '🇵🇭'], PK: ['巴基斯坦', '🇵🇰'],
  PL: ['波兰', '🇵🇱'], PT: ['葡萄牙', '🇵🇹'], RO: ['罗马尼亚', '🇷🇴'], RS: ['塞尔维亚', '🇷🇸'], RU: ['俄罗斯', '🇷🇺'], SA: ['沙特阿拉伯', '🇸🇦'],
  SE: ['瑞典', '🇸🇪'], SG: ['新加坡', '🇸🇬'], SI: ['斯洛文尼亚', '🇸🇮'], SK: ['斯洛伐克', '🇸🇰'], TH: ['泰国', '🇹🇭'], TR: ['土耳其', '🇹🇷'],
  TW: ['台湾', '🇹🇼'], UA: ['乌克兰', '🇺🇦'], UK: ['英国', '🇬🇧'], US: ['美国', '🇺🇸'], VN: ['越南', '🇻🇳'], ZA: ['南非', '🇿🇦']
};

var NAME_ALIASES = {
  usa: 'US', us: 'US', unitedstates: 'US', america: 'US', losangeles: 'US', washington: 'US', chicago: 'US', seattle: 'US', dallas: 'US', denver: 'US',
  frankfurt: 'DE', germany: 'DE', de: 'DE', japan: 'JP', tokyo: 'JP', jp: 'JP', singapore: 'SG', sg: 'SG', hongkong: 'HK', hk: 'HK', taiwan: 'TW', tw: 'TW',
  canada: 'CA', ca: 'CA', toronto: 'CA', netherlands: 'NL', holland: 'NL', amsterdam: 'NL', nl: 'NL', uk: 'GB', gb: 'GB', london: 'GB', unitedkingdom: 'GB',
  france: 'FR', paris: 'FR', fr: 'FR', finland: 'FI', helsinki: 'FI', fi: 'FI', norway: 'NO', oslo: 'NO', no: 'NO', sweden: 'SE', stockholm: 'SE', se: 'SE',
  poland: 'PL', warsaw: 'PL', pl: 'PL', austria: 'AT', vienna: 'AT', at: 'AT', turkey: 'TR', türkiye: 'TR', istanbul: 'TR', tr: 'TR', uae: 'AE', dubai: 'AE', ae: 'AE',
  newzealand: 'NZ', auckland: 'NZ', nz: 'NZ', australia: 'AU', au: 'AU', brazil: 'BR', br: 'BR', india: 'IN', in: 'IN', indonesia: 'ID', id: 'ID', spain: 'ES', es: 'ES',
  italy: 'IT', it: 'IT', swiss: 'CH', switzerland: 'CH', ch: 'CH'
};

function toBool(v, fallback) {
  if (v === undefined || v === null || v === '') return fallback;
  if (typeof v === 'boolean') return v;
  var s = String(v).toLowerCase();
  if (s === '1' || s === 'true' || s === 'yes' || s === 'on') return true;
  if (s === '0' || s === 'false' || s === 'no' || s === 'off') return false;
  return fallback;
}

function decodeOrDefault(v, fallback) {
  if (v === undefined || v === null || v === '') return fallback;
  try { return decodeURIComponent(String(v)); } catch (e) { return String(v); }
}

function nowMs() { return new Date().getTime(); }
function log(msg) { if (debug && typeof console !== 'undefined' && console.log) console.log('[substore-rename] ' + msg); }
function cleanKey(s) { return String(s || '').toLowerCase().replace(/[^a-z]/g, ''); }
function normalizeCode(code) { var c = String(code || '').toUpperCase(); if (c === 'UK') return 'GB'; return c; }
function labelFromCode(code) { var c = normalizeCode(code); var item = COUNTRY_MAP[c]; if (!item) return c || ''; return item[1] + ' ' + (chinese ? item[0] : c); }

function detectCodeFromText(text) {
  var raw = String(text || '');
  if (!raw) return '';
  if (COUNTRY_CACHE[raw]) return COUNTRY_CACHE[raw];
  var tokens = raw.split(/[^A-Za-z]+/);
  for (var i = 0; i < tokens.length; i++) {
    var t = tokens[i];
    if (!t) continue;
    var up = normalizeCode(t);
    if (COUNTRY_MAP[up]) { COUNTRY_CACHE[raw] = up; return up; }
    var ck = cleanKey(t);
    if (NAME_ALIASES[ck]) { COUNTRY_CACHE[raw] = NAME_ALIASES[ck]; return NAME_ALIASES[ck]; }
  }
  var all = cleanKey(raw);
  for (var k in NAME_ALIASES) if (NAME_ALIASES.hasOwnProperty(k) && all.indexOf(k) >= 0) { COUNTRY_CACHE[raw] = NAME_ALIASES[k]; return NAME_ALIASES[k]; }
  COUNTRY_CACHE[raw] = '';
  return '';
}

function getHost(node) { return node.server || node.address || node.host || node.add || node.hostname || node.ip || ''; }
function detectNodeCode(node) { return detectCodeFromText(node.name) || detectCodeFromText(node.ps) || detectCodeFromText(node.remarks) || detectCodeFromText(getHost(node)); }

function readStore(key) {
  var keys = ['#' + key, key];
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    try {
      if (typeof $ !== 'undefined' && $ && $.read) {
        var v0 = $.read(k);
        if (v0) return v0;
      }
    } catch (e0) {}
    try {
      if (typeof $persistentStore !== 'undefined' && $persistentStore && $persistentStore.read) {
        var v1 = $persistentStore.read(k);
        if (v1) return v1;
      }
    } catch (e1) {}
    try {
      if (typeof $prefs !== 'undefined' && $prefs && $prefs.valueForKey) {
        var v2 = $prefs.valueForKey(k);
        if (v2) return v2;
      }
    } catch (e2) {}
  }
  return '';
}

function parseCachedOutbound(raw) {
  if (!raw) return null;
  try {
    var obj = JSON.parse(raw);
    if (!obj || !obj.code) return null;
    if (obj.expiresAt && Number(obj.expiresAt) > nowMs()) return obj;
    if (obj.updatedAt && nowMs() - Number(obj.updatedAt) < outboundTtl * 1000) return obj;
  } catch (e) {}
  return null;
}

function getOutboundLabel() {
  if (!outEnabled) return '';
  if (OUTBOUND_CACHE !== null) return OUTBOUND_CACHE;
  var cached = parseCachedOutbound(readStore(outboundCacheKey));
  if (cached && cached.code) {
    // Include region if available
    var regionPart = cached.region ? ' ' + cached.region : '';
    OUTBOUND_CACHE = labelFromCode(cached.code) + regionPart;
    log('outbound cache hit: ' + cached.code + (regionPart ? (' region=' + cached.region) : ''));
    return OUTBOUND_CACHE;
  }
  OUTBOUND_CACHE = '';
  log('outbound cache miss: ' + outboundCacheKey);
  return OUTBOUND_CACHE;
}

function operator(proxies) {
  var outboundLabel = getOutboundLabel();
  var result = [];
  var nameCounts = {};
  for (var i = 0; i < proxies.length; i++) {
    var node = proxies[i];
    var code = detectNodeCode(node);
    var base = code ? labelFromCode(code) : '';
    if (!base) {
      if (nm) result.push(node);
      continue;
    }
    if (!bare && node.name) base = String(node.name) + sep + base;
    var combined = outboundLabel ? (base + sep + outboundLabel) : base;
    // Ensure uniqueness by appending a numeric suffix if needed
    if (nameCounts[combined] === undefined) {
      nameCounts[combined] = 1;
    } else {
      nameCounts[combined] += 1;
    }
    var suffix = nameCounts[combined] > 1 ? ' #' + nameCounts[combined] : '';
    node.name = combined + suffix;
    result.push(node);
  }
  return result;
}
