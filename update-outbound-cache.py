#!/usr/bin/env python3
"""Update outbound geo cache for Sub-Store rename script.

Writes a value readable by Sub-Store's $persistentStore.read(key) in Node mode.
The value is stored inside /home/ubuntu/substore/root.json because the Sub-Store
backend persists script/runtime cache there.
"""
import json
import time
import urllib.request
from pathlib import Path

ROOT = Path('/home/ubuntu/substore/root.json')
KEY = 'substore_rename_outbound_geo_v1'
TTL_SECONDS = 21600  # 6 hours

IP_URLS = [
    'https://api.ipify.org',
    'https://ident.me',
    'https://ifconfig.me/ip',
]
GEO_URLS = [
    'https://ipapi.co/{ip}/json/',
    'https://ipwho.is/{ip}',
]

def fetch_text(url, timeout=10):
    req = urllib.request.Request(url, headers={'User-Agent': 'substore-rename-cache/1.0'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode('utf-8', 'replace').strip()

def fetch_json(url, timeout=10):
    return json.loads(fetch_text(url, timeout))

def load_root():
    if not ROOT.exists():
        return {}
    try:
        return json.loads(ROOT.read_text())
    except Exception:
        return {}

def save_root(data):
    ROOT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')

def read_cached(root):
    raw = root.get(KEY)
    if not raw:
        return None
    try:
        obj = json.loads(raw)
        if obj.get('code') and obj.get('expiresAt', 0) > int(time.time() * 1000):
            return obj
    except Exception:
        return None
    return None

def get_public_ip():
    last = None
    for url in IP_URLS:
        try:
            ip = fetch_text(url)
            if ip and len(ip) < 80:
                return ip
        except Exception as e:
            last = e
    raise RuntimeError('failed to get public ip: %r' % (last,))

def get_geo(ip):
    last = None
    for tpl in GEO_URLS:
        try:
            data = fetch_json(tpl.format(ip=ip))
            if data.get('success') is False and data.get('message'):
                raise RuntimeError(data.get('message'))
            code = data.get('country_code') or data.get('country') or data.get('countryCode')
            country = data.get('country_name') or data.get('country') or data.get('countryName') or ''
            if code:
                code = str(code).upper()
                if len(code) != 2 and data.get('country_code'):
                    code = str(data.get('country_code')).upper()
                return {
                    'ip': ip,
                    'code': code,
                    'country': country,
                    'updatedAt': int(time.time() * 1000),
                    'expiresAt': int((time.time() + TTL_SECONDS) * 1000),
                }
        except Exception as e:
            last = e
    raise RuntimeError('failed to get geo for %s: %r' % (ip, last))

def main():
    root = load_root()
    cached = read_cached(root)
    if cached:
        print('cache valid: code=%s ip=%s expiresAt=%s' % (cached.get('code'), cached.get('ip'), cached.get('expiresAt')))
        return
    ip = get_public_ip()
    geo = get_geo(ip)
    root[KEY] = json.dumps(geo, ensure_ascii=False)
    save_root(root)
    print('cache updated: code=%s ip=%s country=%s' % (geo.get('code'), geo.get('ip'), geo.get('country')))

if __name__ == '__main__':
    main()
