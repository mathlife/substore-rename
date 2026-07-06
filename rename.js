function readCacheJson(key) {
  try {
    if (typeof $persistentStore !== 'undefined' && $persistentStore && $persistentStore.read) {
      var v = $persistentStore.read(key);
      if (v) return JSON.parse(v);
    }
  } catch (e) {}
  try {
    if (typeof $ !== 'undefined' && $ && $.read) {
      var v2 = $.read(key);
      if (v2) return JSON.parse(v2);
    }
  } catch (e2) {}
  return null;
}

function stripNodeLinks(text) {
  return String(text || '')
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/t\.me\/\S+/gi, ' ')
    .replace(/telegram\.me\/\S+/gi, ' ')
    .replace(/telegram\.dog\/\S+/gi, ' ')
    .replace(/@[A-Za-z0-9_]{4,}/g, ' ')
    .replace(/\s*\|\s*/g, ' | ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function normalizeCode(code) {
  var c = String(code || '').toUpperCase();
  if (c === 'UK') return 'GB';
  return c;
}

function flagToCode(flag) {
  if (!flag || typeof flag !== 'string') return '';
  var chars = [];
  for (var i = 0; i < flag.length; i++) {
    var cp = flag.codePointAt(i);
    if (cp >= 0x1F1E6 && cp <= 0x1F1FF) chars.push(String.fromCharCode(65 + cp - 0x1F1E6));
    if (cp > 0xFFFF) i++;
  }
  return chars.length === 2 ? chars.join('') : '';
}

function flagEmojiFromCode(code) {
  var c = normalizeCode(code);
  if (!/^[A-Z]{2}$/.test(c)) return '';
  var A = 0x1F1E6;
  return String.fromCodePoint(A + (c.charCodeAt(0) - 65), A + (c.charCodeAt(1) - 65));
}

function labelFromCode(code) {
  var map = {
    AD: '安道尔', AE: '阿联酋', AF: '阿富汗', AL: '阿尔巴尼亚', AM: '亚美尼亚', AO: '安哥拉', AR: '阿根廷', AT: '奥地利', AU: '澳大利亚', AZ: '阿塞拜疆',
    BA: '波黑', BD: '孟加拉国', BE: '比利时', BG: '保加利亚', BH: '巴林', BR: '巴西', BY: '白俄罗斯', CA: '加拿大', CH: '瑞士', CL: '智利', CN: '中国',
    CO: '哥伦比亚', CR: '哥斯达黎加', CY: '塞浦路斯', CZ: '捷克', DE: '德国', DK: '丹麦', EE: '爱沙尼亚', EG: '埃及', ES: '西班牙', FI: '芬兰', FR: '法国',
    GB: '英国', GR: '希腊', HK: '香港', HR: '克罗地亚', HU: '匈牙利', ID: '印度尼西亚', IE: '爱尔兰', IL: '以色列', IN: '印度', IQ: '伊拉克', IR: '伊朗',
    IS: '冰岛', IT: '意大利', JP: '日本', KR: '韩国', KH: '柬埔寨', KZ: '哈萨克斯坦', LT: '立陶宛', LU: '卢森堡', LV: '拉脱维亚', MA: '摩洛哥', MD: '摩尔多瓦',
    MK: '北马其顿', MX: '墨西哥', MY: '马来西亚', NL: '荷兰', NO: '挪威', NZ: '新西兰', PH: '菲律宾', PK: '巴基斯坦', PL: '波兰', PT: '葡萄牙', RO: '罗马尼亚',
    RS: '塞尔维亚', RU: '俄罗斯', SA: '沙特阿拉伯', SE: '瑞典', SG: '新加坡', SI: '斯洛文尼亚', SK: '斯洛伐克', TH: '泰国', TR: '土耳其', TW: '台湾', UA: '乌克兰',
    US: '美国', UZ: '乌兹别克斯坦', VN: '越南', WS: '萨摩亚', ZA: '南非', DZ: '阿尔及利亚', TN: '突尼斯', NP: '尼泊尔', TM: '土库曼斯坦', TJ: '塔吉克斯坦', LK: '斯里兰卡'
  };
  return map[normalizeCode(code)] || normalizeCode(code);
}

function detectCodeFromText(text) {
  var raw = String(text || '');
  var flagMatch = raw.match(/([\uD83C][\uDDE6-\uDDFF]){2}/);
  if (flagMatch) {
    var flagCode = flagToCode(flagMatch[0]);
    if (flagCode) return flagCode;
  }
  var s = raw.toLowerCase().replace(/[^a-z]/g, '');
  var aliases = {
    albania: 'AL', algeria: 'DZ', argentina: 'AR', armenia: 'AM', australia: 'AU', austria: 'AT', azerbaijan: 'AZ', bahrain: 'BH', bangladesh: 'BD', belgium: 'BE',
    brazil: 'BR', bulgaria: 'BG', cambodia: 'KH', canada: 'CA', chile: 'CL', china: 'CN', colombia: 'CO', croatia: 'HR', czech: 'CZ', czechrepublic: 'CZ', denmark: 'DK',
    dubai: 'AE', egypt: 'EG', finland: 'FI', france: 'FR', germany: 'DE', greece: 'GR', hongkong: 'HK', hungary: 'HU', iceland: 'IS', india: 'IN', indonesia: 'ID', iran: 'IR',
    iraq: 'IQ', ireland: 'IE', israel: 'IL', italy: 'IT', japan: 'JP', kazakhstan: 'KZ', latvia: 'LV', lithuania: 'LT', malaysia: 'MY', mexico: 'MX', morocco: 'MA', netherlands: 'NL',
    newzealand: 'NZ', norway: 'NO', pakistan: 'PK', philippines: 'PH', poland: 'PL', portugal: 'PT', romania: 'RO', russia: 'RU', saudiarabia: 'SA', serbia: 'RS', singapore: 'SG',
    slovakia: 'SK', slovenia: 'SI', southafrica: 'ZA', southkorea: 'KR', korea: 'KR', northkorea: 'KP', spain: 'ES', sweden: 'SE', switzerland: 'CH', taiwan: 'TW', thailand: 'TH',
    turkey: 'TR', ukraine: 'UA', unitedarabemirates: 'AE', unitedkingdom: 'GB', unitedstates: 'US', usa: 'US', us: 'US', vietnam: 'VN', uzbekistan: 'UZ', macedonia: 'MK',
    cloudflare: 'US', hetzner: 'DE', netcup: 'DE', ovh: 'FR', yottasrc: 'FR', yottasource: 'FR',
    dmit: 'HK', tencent: 'SG', hostpapa: 'US', akari: 'WS', digitalocean: 'US', bagecloud: 'DE', bage: 'DE'
  };
  for (var k in aliases) {
    if (s.indexOf(k) >= 0) return aliases[k];
  }
  return '';
}

function getCachedGeoByHost(host) {
  var root = readCacheJson('substore_node_country_cache_v1');
  if (!root || !root.entries) return null;
  return root.entries[host] || null;
}

function getProtocol(node) {
  var p = String(node.type || node.protocol || node.network || '').trim().toLowerCase();
  if (!p) return '';
  return p.replace(/[^a-z0-9_-]+/g, '');
}

function splitTailSuffix(text) {
  var s = String(text || '').trim();
  var m = s.match(/(\s*(?:\[[^\]]+\]|\([^\)]+\))[¹²³⁴⁵⁶⁷⁸⁹⁰0-9]*)$/);
  if (!m) return { core: s, suffix: '' };
  return { core: s.slice(0, s.length - m[1].length).trim(), suffix: m[1].trim() };
}

function splitArrow(text) {
  var s = String(text || '');
  var idx = s.indexOf('➮');
  if (idx < 0) return null;
  return {
    left: s.slice(0, idx).trim(),
    right: s.slice(idx + 1).trim()
  };
}

function looksLikeAsnLabel(text) {
  var s = String(text || '').trim();
  if (!s) return false;
  if (/([\uD83C][\uDDE6-\uDDFF]){2}/.test(s)) return true;
  if (/^[A-Z]{2}(?:\s|$)/.test(s)) return true;
  if (/\[[^\]]+\]/.test(s)) return true;
  if (/\b(LLC|INC|LTD|GMBH|NETWORKS|CLOUD|COMMUNICATION|BUILDING|ONLINE|SERVICES|GROUP|DIGITAL|CONSTANT|HOSTPAPA|AKARI|DMIT|TENCENT|OVH|NETCUP|HETZNER)\b/i.test(s)) return true;
  return false;
}

// New helper: detect country code from "Signal-xx" pattern
function detectSignalCode(text) {
  var m = String(text || '').match(/Signal-([a-z]{2})/i);
  if (m) return m[1].toUpperCase();
  return '';
}

function pickCountry(text, node) {
  var cleaned = stripNodeLinks(String(text || ''));
  if (/\bWS\b/i.test(cleaned)) {
    return flagEmojiFromCode('TW') + ' ' + labelFromCode('TW');
  }
  if (/(?:^|\s)WS(?:\s|$)/i.test(cleaned) && (/(台湾|Taiwan|TW|Data Communication Business Group|Digital United Inc\.?)/i.test(cleaned) || /tw/i.test(String(node.server || '')))) {
    return flagEmojiFromCode('TW') + ' ' + labelFromCode('TW');
  }
  var code = detectCodeFromText(cleaned) || detectCodeFromText(node.ps) || detectCodeFromText(node.remarks) || detectCodeFromText(node.name) || detectCodeFromText(node.server || node.address || node.host || node.add || node.hostname || node.ip || '');
  if (!code) {
    var host = String(node.server || node.address || node.host || node.add || node.hostname || node.ip || '').trim();
    var cached = host ? getCachedGeoByHost(host) : null;
    if (cached && cached.code) code = cached.code;
  }
  if (code) return flagEmojiFromCode(code) + ' ' + labelFromCode(code);

  var hostCache = getCachedGeoByHost(String(node.server || node.address || node.host || node.add || node.hostname || node.ip || '').trim());
  if (hostCache && hostCache.code) return flagEmojiFromCode(hostCache.code) + ' ' + labelFromCode(hostCache.code);
  if (hostCache && hostCache.country) return hostCache.country;

  return cleaned;
}

function detectCountryCity(text) {
  var raw = String(text || '').trim();
  raw = raw.replace(/^\p{Extended_Pictographic}+/gu, '').trim();
  // Detect patterns like "United State-<city>" or "United States-<city>"
  var m = raw.match(/^United\s+States?-?\s*[-_]?\s*([^#]+)/i);
  if (m) {
    return { code: 'US', city: m[1].trim().replace(/\d+$/, '') };
  }
  // Detect patterns like "VIP-GB-London48" / "GB-London48"
  var m2 = raw.match(/(?:^|[-_\s])([A-Z]{2})-([A-Za-z]+\d*)$/i);
  if (m2) {
    return { code: normalizeCode(m2[1]), city: m2[2].trim().replace(/\d+$/, '') };
  }
  return null;
}


// Translate city names to Chinese when possible
function translateCity(code, city) {
  var c = normalizeCode(code);
  var s = String(city || '').trim();
  if (!s) return '';
  var key = s.toLowerCase().replace(/[^a-z]/g, '');

  var cityMap = {
    US: {
      arizona: '\u4e9a\u5229\u6851\u90a3',
      atlanta: '\u4e9a\u7279\u5170\u5927',
      buffalo: '\u5e03\u6c34\u725b\u57ce',
      charlotte: '\u590f\u6d1b\u7279',
      chicago: '\u829d\u52a0\u54e5',
      columbus: '\u54e5\u4f26\u5e03',
      dallas: '\u8fbe\u62c9\u65af',
      denver: '\u4e39\u4f5b',
      lasvegas: '\u62c9\u65af\u7ef4\u52a0\u65af',
      losangeles: '\u6d1b\u6749\u77f6',
      miami: '\u8fc8\u963f\u5bc6',
      minneapolis: '\u660e\u5c3c\u963f\u6ce2\u5229\u65af',
      newyork: '\u7ebd\u7ea6',
      phoenix: '\u51e4\u51f0\u57ce',
      portland: '\u6ce2\u7279\u5170',
      sanfrancisco: '\u65e7\u91d1\u5c71',
      santaclara: '\u5723\u514b\u62c9\u62c9',
      seattle: '\u897f\u96c5\u56fe',
      virginia: '\u7ef4\u5409\u5c3c\u4e9a',
      ashburn: '\u963f\u4ec0\u672c'
    },
    GB: {
      london: '\u4f26\u6566'
    },
    HK: {
      hongkong: ''
    },
    TW: {
      taiwan: ''
    },
    AU: {
      australia: ''
    },
    AT: {
      austria: ''
    },
    BE: {
      belgium: ''
    },
    BR: {
      brazil: ''
    },
    BG: {
      bulgaria: ''
    },
    KH: {
      cambodia: ''
    },
    CA: {
      canada: ''
    },
    CO: {
      colombia: ''
    },
    HR: {
      croatia: ''
    },
    CZ: {
      czechrepublic: ''
    },
    DK: {
      denmark: ''
    },
    EG: {
      egypt: ''
    },
    EE: {
      estonia: ''
    },
    FI: {
      finland: ''
    },
    FR: {
      france: ''
    },
    DE: {
      germany: ''
    },
    GR: {
      greece: ''
    },
    HU: {
      hungary: ''
    },
    IS: {
      iceland: ''
    },
    IN: {
      india: ''
    },
    ID: {
      indonesia: ''
    },
    IE: {
      ireland: ''
    },
    IL: {
      israel: ''
    },
    IT: {
      italy: ''
    },
    JP: {
      japan: ''
    },
    KZ: {
      kazakhstan: ''
    },
    LV: {
      latvia: ''
    },
    LT: {
      lithuania: ''
    },
    LU: {
      luxembourg: ''
    },
    MY: {
      malaysia: ''
    },
    MX: {
      mexico: ''
    },
    MD: {
      moldova: ''
    },
    NP: {
      nepal: ''
    },
    NL: {
      netherlands: ''
    },
    NZ: {
      newzealand: ''
    },
    NO: {
      norway: ''
    },
    PH: {
      philippines: ''
    },
    PL: {
      poland: ''
    },
    PT: {
      portugal: ''
    },
    RO: {
      romania: ''
    },
    RU: {
      russia: ''
    },
    RS: {
      serbia: ''
    },
    SG: {
      singapore: ''
    },
    SK: {
      slovakia: ''
    },
    ZA: {
      southafrica: ''
    },
    KR: {
      southkorea: ''
    },
    ES: {
      spain: ''
    },
    LK: {
      srilanka: ''
    },
    SE: {
      sweden: ''
    },
    CH: {
      switzerland: ''
    },
    TJ: {
      tajikistan: ''
    },
    TR: {
      turkey: ''
    },
    TM: {
      turkmenistan: ''
    },
    UA: {
      ukraine: ''
    }
  };

  if (cityMap[c] && Object.prototype.hasOwnProperty.call(cityMap[c], key)) {
    return cityMap[c][key];
  }
  return '';
}

function formatName(node) {
  var original = String(node.name || '');
  // First, handle Signal-XX patterns directly
  var signalCode = detectSignalCode(original);
  var parts = splitTailSuffix(original);
  if (signalCode) {
    var out = flagEmojiFromCode(signalCode) + ' ' + labelFromCode(signalCode);
    if (parts.suffix) out += ' ' + parts.suffix;
    return out;
  }

  // Handle Country-City formats like "United State-Ashburn" or "United States-SantaClara"
  var cc = detectCountryCity(parts.core);
  if (cc) {
    var out2 = flagEmojiFromCode(cc.code) + ' ' + labelFromCode(cc.code);
    var cityText = cc.city ? translateCity(cc.code, cc.city) : '';
    if (cityText) out2 += ' ' + cityText;
    if (parts.suffix) out2 += ' ' + parts.suffix;
    return out2;
  }

  var arrow = splitArrow(parts.core);
  var protocol = getProtocol(node);

  if (arrow) {
    var left = pickCountry(arrow.left, node);
    var right = pickCountry(arrow.right, node);
    var out = left + ' ➮ ' + right;
    if (parts.suffix) out += ' ' + parts.suffix;
    return out;
  }

  var single = pickCountry(parts.core, node);
  if (!arrow && looksLikeAsnLabel(parts.core) && node._geo && node._geo.countryCode) {
    single = flagEmojiFromCode(node._geo.countryCode) + ' ' + labelFromCode(node._geo.countryCode);
  }
  if (parts.suffix) {
    if (protocol && !/\[[^\]]+\]/.test(parts.suffix)) {
      return single + ' ' + '[' + protocol + ']' + ' ' + parts.suffix;
    }
    return single + ' ' + parts.suffix;
  }
  if (protocol && !/\[[^\]]+\]/.test(single)) {
    // already has protocol, keep as is
    return single;
  }
  return single;
}

function isRecognizedCountryName(name) {
  var s = String(name || '').trim();
  return /^([\uD83C][\uDDE6-\uDDFF]){2}\s+/.test(s);
}

function readScriptArgs() {
  try {
    if (typeof $arguments !== 'undefined' && $arguments && typeof $arguments === 'object' && !Array.isArray($arguments)) {
      return $arguments;
    }
  } catch (e0) {}
  var raw = '';
  try {
    if (typeof $arguments !== 'undefined' && $arguments) raw = String($arguments);
  } catch (e) {}
  try {
    if (!raw && typeof $argument !== 'undefined' && $argument) raw = String($argument);
  } catch (e2) {}
  try {
    if (!raw && typeof globalThis !== 'undefined' && globalThis && globalThis.$arguments) raw = String(globalThis.$arguments);
  } catch (e3) {}
  var out = {};
  if (!raw) return out;
  raw.split('&').forEach(function (part) {
    if (!part) return;
    var idx = part.indexOf('=');
    var k = idx >= 0 ? part.slice(0, idx) : part;
    var v = idx >= 0 ? part.slice(idx + 1) : 'true';
    try {
      k = decodeURIComponent(k).trim();
      v = decodeURIComponent(v).trim();
    } catch (e4) {}
    if (!k) return;
    out[k] = /^(1|true|yes|on)$/i.test(v);
  });
  return out;
}

function operator(proxies) {
  var result = [];
  var seen = new Set(); // 用于去除重复节点
  var args = readScriptArgs();
  var keepKnown = !!args.keepKnown;
  var keepUnknown = !!args.keepUnknown;
  for (var i = 0; i < proxies.length; i++) {
    var node = proxies[i];
    // 构造唯一标识，基于 server、port、protocol、sni、host、path、uuid(或 password)
    var server = (node.server || node.address || node.host || node.add || node.hostname || node.ip || '').trim();
    var port = String(node.port || '');
    var proto = String(node.type || node.protocol || node.network || '').trim().toLowerCase();
    var sni = (node.sni || node.servername || node.peer || (node["reality-opts"] && node["reality-opts"]["server-name"]))?.trim() || '';
    var host = (node.host || (node["ws-opts"] && node["ws-opts"].headers && node["ws-opts"].headers.Host) || (node["ws-opts"] && node["ws-opts"].headers && node["ws-opts"].headers.host))?.trim() || '';
    var path = (node["ws-opts"] && node["ws-opts"].path) || (node["grpc-opts"] && node["grpc-opts"]["grpc-service-name"]) || '';
    var uuid = String(node.uuid || node.password || node.client_id || '').trim();
    var key = [server, port, proto, sni, host, path, uuid].join('\x01');
    if (seen.has(key)) {
      // 重复节点直接跳过
      continue;
    }
    seen.add(key);
    node.name = formatName(node);
    var known = isRecognizedCountryName(node.name);
    if (keepKnown && !known) continue;
    if (keepUnknown && known) continue;
    result.push(node);
  }
  return result;
}

if (typeof module !== 'undefined' && module.exports) module.exports = operator;
if (typeof globalThis !== 'undefined') globalThis.operator = operator;
