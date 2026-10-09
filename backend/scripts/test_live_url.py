import urllib.request

base = "https://main.d38reumk2s9v29.amplifyapp.com"
targets = ["", "assets/index-D7Img-gr.js", "assets/index-CqOdA0f-.css"]

for path in targets:
    url = f"{base}/{path}" if path else base
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req) as resp:
            data = resp.read()
            print(f"URL: {url} -> STATUS {resp.status}, SIZE {len(data)} bytes")
    except Exception as e:
        print(f"URL: {url} -> FAILED: {e}")
