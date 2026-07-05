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

function flagEmojiFromCode(code) {
  var c = normalizeCode(code);
  if (!/^[A-Z]{2}$/.test(c)) return '';
  var A = 0x1F1E6;
  return String.fromCodePoint(A + (c.charCodeAt(0) - 65), A + (c.charCodeAt(1) - 65));
}

function labelFromCode(code) {
  var map = { CA: '加拿大', US: '美国', GB: '英国', AU: '澳大利亚', JP: '日本', KR: '韩国', TW: '台湾', SG: '新加坡', DE: '德国', FR: '法国', NL: '荷兰', RU: '俄罗斯', BG: '保加利亚', BH: '巴林', KH: '柬埔寨', AL: '阿尔巴尼亚', AR: '阿根廷', AM: '亚美尼亚', AT: '奥地利', AZ: '阿塞拜疆', BD: '孟加拉国', BE: '比利时', BR: '巴西', CH: '瑞士', CL: '智利', CN: '中国', CO: '哥伦比亚', CR: '哥斯达黎加', CY: '塞浦路斯', CZ: '捷克', DK: '丹麦', EE: '爱沙尼亚', EG: '埃及', ES: '西班牙', FI: '芬兰', GR: '希腊', HK: '香港', HR: '克罗地亚', HU: '匈牙利', ID: '印度尼西亚', IE: '爱尔兰', IL: '以色列', IN: '印度', IQ: '伊拉克', IR: '伊朗', IS: '冰岛', IT: '意大利', KZ: '哈萨克斯坦', LT: '立陶宛', LU: '卢森堡', LV: '拉脱维亚', MA: '摩洛哥', MD: '摩尔多瓦', MX: '墨西哥', MY: '马来西亚', NO: '挪威', NZ: '新西兰', PH: '菲律宾', PK: '巴基斯坦', PL: '波兰', PT: '葡萄牙', RO: '罗马尼亚', RS: '塞尔维亚', SA: '沙特阿拉伯', SE: '瑞典', SI: '斯洛文尼亚', SK: '斯洛伐克', TH: '泰国', TR: '土耳其', UA: '乌克兰', UZ: '乌兹别克斯坦', VN: '越南', ZA: '南非', MK: '马其顿', DZ: '阿尔及利亚', TN: '突尼斯', AE: '阿联酋' };
  return map[normalizeCode(code)] || normalizeCode(code);
}

function detectCodeFromText(text) {
  var raw = String(text || '');
  var s = raw.toLowerCase().replace(/[^a-z]/g, '');
  var aliases = { canada:'CA', unitedstates:'US', usa:'US', us:'US', unitedkingdom:'GB', uk:'GB', germany:'DE', france:'FR', japan:'JP', korea:'KR', southkorea:'KR', northkorea:'KP', australia:'AU', singapore:'SG', taiwan:'TW', bulgaria:'BG', bahrain:'BH', cambodia:'KH', albania:'AL', argentina:'AR', armenia:'AM', austria:'AT', azerbaijan:'AZ', bangladesh:'BD', belgium:'BE', brazil:'BR', chile:'CL', china:'CN', colombia:'CO', croatia:'HR', czech:'CZ', czechrepublic:'CZ', denmark:'DK', egypt:'EG', finland:'FI', greece:'GR', hongkong:'HK', hungary:'HU', iceland:'IS', india:'IN', indonesia:'ID', iran:'IR', iraq:'IQ', ireland:'IE', israel:'IL', italy:'IT', kazakhstan:'KZ', latvia:'LV', lithuania:'LT', malaysia:'MY', mexico:'MX', morocco:'MA', netherlands:'NL', newzealand:'NZ', norway:'NO', pakistan:'PK', philippines:'PH', poland:'PL', portugal:'PT', romania:'RO', russia:'RU', saudiarabia:'SA', serbia:'RS', sweden:'SE', switzerland:'CH', thailand:'TH', turkey:'TR', ukraine:'UA', vietnam:'VN', uzbekistan:'UZ', macedonia:'MK', algeria:'DZ', tunisia:'TN', unitedarabemirates:'AE' };
  for (var k in aliases) if (s.indexOf(k) >= 0) return aliases[k];
  return '';
}

function getCachedGeoByHost(host) {
  var root = readCacheJson('substore_node_country_cache_v1');
  if (!root || !root.entries) return null;
  return root.entries[host] || null;
}

function operator(proxies) {
  var result = [];
  var seen = {};
  for (var i = 0; i < proxies.length; i++) {
    var node = proxies[i];
    var host = String(node.server || node.address || node.host || node.add || node.hostname || node.ip || '').trim();
    if (!host) { result.push(node); continue; }
    var current = stripNodeLinks(String(node.name || ''));
    var code = detectCodeFromText(current) || detectCodeFromText(node.ps) || detectCodeFromText(node.remarks);
    var finalName;
    if (code) {
      finalName = flagEmojiFromCode(code) + ' ' + labelFromCode(code);
    } else {
      var cached = getCachedGeoByHost(host);
      if (cached && cached.code) {
        finalName = flagEmojiFromCode(cached.code) + ' ' + labelFromCode(cached.code);
      } else if (cached && cached.country) {
        finalName = cached.country;
      } else {
        if (!nm) continue;
        finalName = current || '未知';
      }
    }
    seen[finalName] = (seen[finalName] || 0) + 1;
    if (seen[finalName] > 1) finalName += '-' + String(seen[finalName]).padStart(2, '0');
    node.name = finalName;
    result.push(node);
  }
  return result;
}
