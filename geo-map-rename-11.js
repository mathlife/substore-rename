/*
 * geo-map-rename-11.js
 *
 * Sync-only Sub-Store rename script.
 * Reads host/IP -> geo mapping from root.json persisted store.
 * Designed for current runtime compatibility.
 *
 * Params:
 * - nm=true               keep original name if no mapping
 * - chinese=true          output Chinese names
 * - bare=true             output country only
 * - dedupe=true           append sequence number
 * - sep=%20|%20           separator
 * - geoMapKey=substore_geo_map_11
 */

var args = typeof $arguments === 'object' && $arguments ? $arguments : {};
var nm = toBool(args.nm, true);
var chinese = toBool(args.chinese, true);
var bare = toBool(args.bare, true);
var dedupe = toBool(args.dedupe, false);
var debug = toBool(args.debug, false);
var sep = decodeOrDefault(args.sep, ' | ');
var geoMapKey = String(args.geoMapKey || 'substore_geo_map_11');

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
  if (debug && typeof console !== 'undefined' && console.log) console.log('[geo-map-rename] ' + msg);
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

function loadGeoMap() {
  var raw = readStore(geoMapKey);
  if (!raw) return {};
  try {
    var obj = JSON.parse(raw);
    return obj && typeof obj === 'object' ? obj : {};
  } catch (e) {
    return {};
  }
}

function operator(proxies) {
  var geoMap = loadGeoMap();
  var counts = {};
  var result = [];
  for (var i = 0; i < proxies.length; i++) {
    var node = proxies[i];
    var host = String(getHost(node) || '').trim();
    var geo = host ? geoMap[host] : null;
    var label = geo && geo.code ? labelFromCode(geo.code) : '';
    if (!label) {
      if (!nm) continue;
      result.push(node);
      continue;
    }
    var finalName = bare ? label : ((node.name ? String(node.name) + sep : '') + label);
    if (dedupe) {
      counts[finalName] = (counts[finalName] || 0) + 1;
      if (counts[finalName] > 1) finalName += ' #' + counts[finalName];
    }
    node.name = finalName;
    result.push(node);
    log(host + ' => ' + finalName);
  }
  return result;
}

if (typeof module !== 'undefined' && module.exports) module.exports = operator;
if (typeof globalThis !== 'undefined') globalThis.operator = operator;
