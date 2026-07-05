/*
 * Sub-Store Script Operator: lightweight rename script.
 *
 * Goals:
 * - strip Telegram/HTTP links from node names
 * - drop loopback nodes (127.0.0.1, localhost, ::1)
 * - normalize names with country labels in Chinese
 * - support flag emoji and English country names in names
 * - keep script ES5-safe and synchronous
 */

var args = typeof $arguments === 'object' && $arguments ? $arguments : {};
var nm = toBool(args.nm, true);
var chinese = toBool(args.chinese, true);
var bare = toBool(args.bare, true);
var dedupe = toBool(args.dedupe, false);
var sep = decodeOrDefault(args.sep, ' | ');
var debug = toBool(args.debug, false);

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
  TR: ['土耳其', '🇹🇷'], TW: ['台湾', '🇹🇼'], UA: ['乌克兰', '🇺🇦'], US: ['美国', '🇺🇸'], UZ: ['乌兹别克斯坦', '🇺🇿'], VN: ['越南', '🇻🇳'],
  ZA: ['南非', '🇿🇦']
};

var COUNTRY_ALIAS = {
  albania: 'AL', argentina: 'AR', armenia: 'AM', australia: 'AU', austria: 'AT', azerbaijan: 'AZ', bahrain: 'BH', bangladesh: 'BD',
  belarus: 'BY', belgium: 'BE', brazil: 'BR', bulgaria: 'BG', cambodia: 'KH', canada: 'CA', chile: 'CL', china: 'CN', colombia: 'CO', croatia: 'HR',
  czech: 'CZ', denmark: 'DK', egypt: 'EG', finland: 'FI', france: 'FR', germany: 'DE', greece: 'GR', hongkong: 'HK', hungary: 'HU',
  iceland: 'IS', india: 'IN', indonesia: 'ID', iran: 'IR', iraq: 'IQ', ireland: 'IE', israel: 'IL', italy: 'IT', japan: 'JP', korea: 'KR',
  kazakhstan: 'KZ', kuwait: 'KW', latvia: 'LV', lithuania: 'LT', malaysia: 'MY', mexico: 'MX', moldova: 'MD', mongolia: 'MN', morocco: 'MA',
  netherlands: 'NL', newzealand: 'NZ', norway: 'NO', pakistan: 'PK', philippines: 'PH', poland: 'PL', portugal: 'PT', romania: 'RO', russia: 'RU',
  saudiarabia: 'SA', serbia: 'RS', singapore: 'SG', slovakia: 'SK', slovenia: 'SI', southafrica: 'ZA', spain: 'ES', sweden: 'SE', switzerland: 'CH',
  taiwan: 'TW', thailand: 'TH', turkey: 'TR', ukraine: 'UA', unitedstates: 'US', usa: 'US', us: 'US', unitedkingdom: 'GB', uk: 'GB',
  vietnam: 'VN', uzbekistan: 'UZ', southkorea: 'KR', northkorea: 'KP', macedonia: 'MK', algeria: 'DZ', tunisia: 'TN',
  unitedarabemirates: 'AE', uae: 'AE', dubai: 'AE'


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

function log() {
  if (debug && typeof console !== 'undefined' && console.log) console.log.apply(console, arguments);
}

function stripNodeLinks(text) {
  return String(text || '')
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/t\.me\/\S+/gi, ' ')
    .replace(/telegram\.me\/\S+/gi, ' ')
    .replace(/telegram\.dog\/\S+/gi, ' ')
    .replace(/@[A-Za-z0-9_]{4,}/g, ' ')
    .replace(/\s*\|\s*\|/g, ' | ')
    .replace(/[|｜]+\s*$/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function isLoopbackHost(host) {
  var h = String(host || '').trim().toLowerCase();
  return h === '127.0.0.1' || h === 'localhost' || h === '::1' || h === '[::1]';
}

function cleanKey(s) {
  return String(s || '').toLowerCase().replace(/[^a-z]/g, '');
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

function detectCodeFromText(text) {
  var raw = String(text || '');
  if (!raw) return '';
  var m = raw.match(/([\uD83C][\uDDE6-\uDDFF]){2}/);
  if (m) {
    var flagCode = flagToCode(m[0]);
    if (flagCode) return flagCode;
  }
  var tokens = raw.split(/[^A-Za-z]+/);
  for (var i = 0; i < tokens.length; i++) {
    var t = tokens[i];
    if (!t) continue;
    var up = normalizeCode(t);
    if (COUNTRY_MAP[up]) return up;
    var ck = cleanKey(t);
    if (COUNTRY_ALIAS[ck]) return COUNTRY_ALIAS[ck];
  }
  var all = cleanKey(raw);
  for (var k in COUNTRY_ALIAS) {
    if (COUNTRY_ALIAS.hasOwnProperty(k) && all.indexOf(k) >= 0) return COUNTRY_ALIAS[k];
  }
  return '';
}

function getHost(node) {
  return node.server || node.address || node.host || node.add || node.hostname || node.ip || '';
}

function labelFromCode(code) {
  var c = normalizeCode(code);
  var item = COUNTRY_MAP[c];
  if (!item) return '';
  return (chinese ? item[0] : c);
}

function chooseLabel(node) {
  var cleaned = stripNodeLinks(String(node.name || ''));
  var code = detectCodeFromText(cleaned) || detectCodeFromText(node.ps) || detectCodeFromText(node.remarks) || detectCodeFromText(getHost(node));
  var flag = code ? flagEmojiFromCode(code) : '';
  var country = code ? labelFromCode(code) : '';
  var rawName = cleaned
    .replace(/^[\s\|\-—–_:,，、]+|[\s\|\-—–_:,，、]+$/g, '')
    .trim();
  if (flag && country) return { code: code, label: country, flag: flag, rawName: rawName };
  if (rawName) return { code: '', label: rawName, flag: '', rawName: rawName };
  return { code: '', label: '未知', flag: '', rawName: '' };
}

function operator(proxies) {
  var result = [];
  var seen = {};
  for (var i = 0; i < proxies.length; i++) {
    var node = proxies[i];
    var host = getHost(node);
    if (isLoopbackHost(host)) {
      log('drop loopback', node.name || host);
      continue;
    }
    var pick = chooseLabel(node);
    var finalName = bare ? ((pick.flag ? pick.flag + ' ' : '') + pick.label) : (pick.rawName ? (pick.rawName + sep + pick.label) : pick.label);
    if (!finalName) {
      if (!nm) continue;
      finalName = stripNodeLinks(String(node.name || '')) || '未知';
    }
    if (dedupe) {
      seen[finalName] = (seen[finalName] || 0) + 1;
      if (seen[finalName] > 1) finalName += ' #' + seen[finalName];
    }
    node.name = finalName;
    result.push(node);
  }
  return result;
}

if (typeof module !== 'undefined' && module.exports) module.exports = operator;
if (typeof globalThis !== 'undefined') globalThis.operator = operator;
