import re
import urllib.request

base = "https://main.d38reumk2s9v29.amplifyapp.com"

try:
    req = urllib.request.Request(base, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        html = resp.read().decode("utf-8", errors="replace")
        print(f"URL: {base} -> STATUS {resp.status}, SIZE {len(html)} bytes")
        assets = re.findall(r'/(assets/[^"\'>\s]+)', html)
        for path in assets:
            url = f"{base}/{path}"
            try:
                areq = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(areq, timeout=15) as aresp:
                    data = aresp.read()
                    print(f"URL: {url} -> STATUS {aresp.status}, SIZE {len(data)} bytes")
            except Exception as e:
                print(f"URL: {url} -> FAILED: {e}")
except Exception as e:
    print(f"URL: {base} -> FAILED: {e}")
