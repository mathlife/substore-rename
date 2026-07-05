/*
 * Sub-Store Script Operator: sync-compatible rename script.
 *
 * Goal:
 * - keep compatibility with current Sub-Store runtime
 * - rename by node name / host text matching
 * - optional outbound cache label (sync only)
 * - optional dedupe suffix
 *
 * Params:
 * - bare=true        only output country label, do not keep original name
 * - chinese=true     output Chinese country names (default true)
 * - nm=true          keep original name if not matched (default true)
 * - out=true         append outbound label from cache (default false)
 * - dedupe=true      append #N on duplicate final names (default false)
 * - sep=%20|%20      separator, default " | "
 * - debug=true       print debug logs
 * - outboundCacheKey=substore_rename_outbound_geo_v1
 */

var args = typeof $arguments === 'object' && $arguments ? $arguments : {};
var bare = toBool(args.bare, true);
var chinese = toBool(args.chinese, true);
var nm = toBool(args.nm, true);
var outEnabled = toBool(args.out, false);
var dedupe = toBool(args.dedupe, false);
var debug = toBool(args.debug, false);
var sep = decodeOrDefault(args.sep, ' | ');
var outboundCacheKey = String(args.outboundCacheKey || 'substore_rename_outbound_geo_v1');

var COUNTRY_MAP = {
  AD: ['安道尔', '🇦🇩'], AE: ['阿联酋', '🇦🇪'], AF: ['阿富汗', '🇦🇫'], AL: ['阿尔巴尼亚', '🇦🇱'], AM: ['亚美尼亚', '🇦🇲'], AO: ['安哥拉', '🇦🇴'],
  AR: ['阿根廷', '🇦🇷'], AT: ['奥地利', '🇦🇹'], AU: ['澳大利亚', '🇦🇺'], AZ: ['阿塞拜疆', '🇦🇿'], BA: ['波黑', '🇧🇦'], BD: ['孟加拉国', '🇧🇩'],
  BE: ['比利时', '🇧🇪'], BG: ['保加利亚', '🇧🇬'], BH: ['巴林', '🇧🇭'], BR: ['巴西', '🇧🇷'], BY: ['白俄罗斯', '🇧🇾'], CA: ['加拿大', '🇨🇦'],
  CH: ['瑞士', '🇨🇭'], CL: ['智利', '🇨🇱'], CN: ['中国', '🇨🇳'], CO: ['哥伦比亚', '🇨🇴'], CR: ['哥斯达黎加', '🇨🇷'], CY: ['塞浦路斯', '🇨🇾'],
  CZ: ['捷克', '🇨🇿'], DE: ['德国', '🇩🇪'], DK: ['丹麦', '🇩🇰'], EE: ['爱沙尼亚', '🇪🇪'], EG: ['埃及', '🇪🇬'], ES: ['西班牙', '🇪🇸'],
  FI: ['芬兰', '🇫🇮'], FR: ['法国', '🇫🇷'], GB: ['英国', '🇬🇧'], GR: ['希腊', '🇬🇷'], HK: ['香港', '🇭🇰'], HR: ['克罗地亚', '🇭🇷'],
  HU: ['匈牙利', '🇭🇺'], ID: ['印度尼西亚', '🇮🇩'], IE: ['爱尔兰', '🇮🇪'], IL: ['以色列', '🇮🇱'], IN: ['印度', '🇮🇳'], IQ: ['伊拉克', '🇮🇶'],
  IR: ['伊朗', '🇮🇷'], IS: ['冰岛', '🇮🇸'], IT: ['意大利', '🇮🇹'], JP: ['日本', '🇯🇵'], KR: ['韩国', '🇰🇷'], KH: ['柬埔寨', '🇰🇭'],
  KZ: ['哈萨克斯坦', '🇰🇿'], LT: ['立陶宛', '🇱🇹'], LU: ['卢森堡', '🇱🇺'], LV: ['拉脱维亚', '🇱🇻'], MA: ['摩洛哥', '🇲🇦'], MD: ['摩尔多瓦', '🇲🇩'],
  MX: ['墨西哥', '🇲🇽'], MY: ['马来西亚', '🇲🇾'], NL: ['荷兰', '🇳🇱'], NO: ['挪威', '🇳🇴'], NZ: ['新西兰', '🇳🇿'], PH: ['菲律宾', '🇵🇭'],
  PK: ['巴基斯坦', '🇵🇰'], PL: ['波兰', '🇵🇱'], PT: ['葡萄牙', '🇵🇹'], RO: ['罗马尼亚', '🇷🇴'], RS: ['塞尔维亚', '🇷🇸'], RU: ['俄罗斯', '🇷🇺'],
  SA: ['沙特阿拉伯', '🇸🇦'], SE: ['瑞典', '🇸🇪'], SG: ['新加坡', '🇸🇬'], SI: ['斯洛文尼亚', '🇸🇮'], SK: ['斯洛伐克', '🇸🇰'], TH: ['泰国', '🇹🇭'],
  TR: ['土耳其', '🇹🇷'], TW: ['台湾', '🇹🇼'], UA: ['乌克兰', '🇺🇦'], UK: ['英国', '🇬🇧'], US: ['美国', '🇺🇸'], UZ: ['乌兹别克斯坦', '🇺🇿'],
  VN: ['越南', '🇻🇳'], ZA: ['南非', '🇿🇦']
};

var NAME_ALIASES = {
  usa: 'US', us: 'US', unitedstates: 'US', america: 'US', losangeles: 'US', washington: 'US', chicago: 'US', dallas: 'US',
  germany: 'DE', de: 'DE', frankfurt: 'DE', berlin: 'DE',
  japan: 'JP', jp: 'JP', tokyo: 'JP', osaka: 'JP',
  singapore: 'SG', sg: 'SG',
  hongkong: 'HK', hk: 'HK',
  taiwan: 'TW', tw: 'TW', taipei: 'TW',
  korea: 'KR', kr: 'KR', seoul: 'KR',
  france: 'FR', fr: 'FR', paris: 'FR',
  netherlands: 'NL', nl: 'NL', amsterdam: 'NL', holland: 'NL',
  uk: 'GB', gb: 'GB', london: 'GB', unitedkingdom: 'GB',
  uae: 'AE', ae: 'AE', dubai: 'AE',
  turkey: 'TR', tr: 'TR', istanbul: 'TR',
  malaysia: 'MY', my: 'MY',
  india: 'IN', in: 'IN', mumbai: 'IN',
  indonesia: 'ID', id: 'ID', jakarta: 'ID',
  poland: 'PL', pl: 'PL', warsaw: 'PL',
  sweden: 'SE', se: 'SE', stockholm: 'SE',
  norway: 'NO', no: 'NO', oslo: 'NO',
  mexico: 'MX', mx: 'MX',
  vietnam: 'VN', vn: 'VN', hanoi: 'VN',
  australia: 'AU', au: 'AU', sydney: 'AU', melbourne: 'AU',
  italy: 'IT', it: 'IT', milan: 'IT',
  southafrica: 'ZA', za: 'ZA', johannesburg: 'ZA',
  pakistan: 'PK', pk: 'PK', karachi: 'PK',
  philippines: 'PH', ph: 'PH', manila: 'PH',
  greece: 'GR', gr: 'GR', athens: 'GR',
  finland: 'FI', fi: 'FI', helsinki: 'FI',
  argentina: 'AR', ar: 'AR', buenosaires: 'AR',
  chile: 'CL', cl: 'CL', santiago: 'CL',
  egypt: 'EG', eg: 'EG', cairo: 'EG',
  uzbekistan: 'UZ', uz: 'UZ', tashkent: 'UZ',
  iraq: 'IQ', iq: 'IQ', baghdad: 'IQ',
  iceland: 'IS', is: 'IS', reykjavik: 'IS'
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

function log(msg) {
  if (debug && typeof console !== 'undefined' && console.log) console.log('[substore-rename] ' + msg);
}

function cleanKey(s) {
  return String(s || '').toLowerCase().replace(/[^a-z]/g, '');
}

function normalizeCode(code) {
  var c = String(code || '').toUpperCase();
  if (c === 'UK') return 'GB';
  return c;
}

function labelFromCode(code) {
  var c = normalizeCode(code);
  var item = COUNTRY_MAP[c];
  if (!item) return c || '';
  return item[1] + ' ' + (chinese ? item[0] : c);
}

function detectCodeFromText(text) {
  var raw = String(text || '');
  if (!raw) return '';
  var tokens = raw.split(/[^A-Za-z]+/);
  var i, t, up, ck;
  for (i = 0; i < tokens.length; i++) {
    t = tokens[i];
    if (!t) continue;
    up = normalizeCode(t);
    if (COUNTRY_MAP[up]) return up;
    ck = cleanKey(t);
    if (NAME_ALIASES[ck]) return NAME_ALIASES[ck];
  }
  var all = cleanKey(raw);
  for (var k in NAME_ALIASES) {
    if (NAME_ALIASES.hasOwnProperty(k) && all.indexOf(k) >= 0) return NAME_ALIASES[k];
  }
  return '';
}

function getHost(node) {
  return node.server || node.address || node.host || node.add || node.hostname || node.ip || '';
}

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
    return obj;
  } catch (e) {
    return null;
  }
}

function getOutboundLabel() {
  if (!outEnabled) return '';
  var cached = parseCachedOutbound(readStore(outboundCacheKey));
  if (!cached || !cached.code) return '';
  var label = labelFromCode(cached.code);
  if (cached.region) label += ' ' + cached.region;
  return label;
}

function operator(proxies) {
  var outboundLabel = getOutboundLabel();
  var result = [];
  var counts = {};
  for (var i = 0; i < proxies.length; i++) {
    var node = proxies[i];
    var code = detectCodeFromText(node.name) || detectCodeFromText(node.ps) || detectCodeFromText(node.remarks) || detectCodeFromText(getHost(node));
    var base = code ? labelFromCode(code) : '';
    if (!base) {
      if (!nm) continue;
      base = String(node.name || '').trim();
      if (!base) base = String(getHost(node) || '').trim();
      if (!base) base = 'Unknown';
    }
    var finalName = bare ? base : ((node.name ? String(node.name) + sep : '') + base);
    if (outboundLabel) finalName += sep + outboundLabel;
    if (dedupe) {
      counts[finalName] = (counts[finalName] || 0) + 1;
      if (counts[finalName] > 1) finalName += ' #' + counts[finalName];
    }
    node.name = finalName;
    result.push(node);
    log('rename => ' + finalName);
  }
  return result;
}

if (typeof module !== 'undefined' && module.exports) module.exports = operator;
if (typeof globalThis !== 'undefined') globalThis.operator = operator;
