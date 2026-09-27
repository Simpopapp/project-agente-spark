#!/usr/bin/env python3
"""Generate an image through Lovable AI Gateway exactly like the Lovable agent's image tool.

Model: openai/gpt-image-2.5-sunburst (platform default), OpenAI Images format.
Usage: python3 gen_image.py "prompt" --output path.jpg [--width 1024 --height 1024] [--quality fast|standard|premium]
"""
import argparse, base64, json, os, sys, time, urllib.request, urllib.error

URL = "https://ai.gateway.lovable.dev/v1/images/generations"
MODEL = "openai/gpt-image-2.5-sunburst"
QUALITY = {"fast": "low", "standard": "medium", "premium": "high"}


def main():
    p = argparse.ArgumentParser()
    p.add_argument("prompt")
    p.add_argument("--output", required=True)
    p.add_argument("--width", type=int, default=1024)
    p.add_argument("--height", type=int, default=1024)
    p.add_argument("--quality", choices=list(QUALITY), default="fast")
    a = p.parse_args()

    key = os.environ.get("LOVABLE_API_KEY")
    if not key:
        sys.exit("ERROR: LOVABLE_API_KEY missing")
    body = json.dumps({
        "model": MODEL,
        "prompt": a.prompt,
        "size": f"{a.width}x{a.height}",
        "quality": QUALITY[a.quality],
        "n": 1,
    }).encode()
    req = urllib.request.Request(URL, data=body, method="POST", headers={
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "X-Lovable-AIG-SDK": "fetch",
    })
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                data = json.load(r)
            break
        except urllib.error.HTTPError as e:
            msg = e.read().decode(errors="replace")[:500]
            if e.code in (429,) or e.code >= 500:
                if attempt < 2:
                    time.sleep(int(e.headers.get("Retry-After", 5 * (attempt + 1))))
                    continue
            sys.exit(f"ERROR {e.code}: {msg}")
    item = data["data"][0]
    if item.get("b64_json"):
        img = base64.b64decode(item["b64_json"])
    else:
        img = urllib.request.urlopen(item["url"], timeout=120).read()
    os.makedirs(os.path.dirname(os.path.abspath(a.output)), exist_ok=True)
    with open(a.output, "wb") as f:
        f.write(img)
    print(json.dumps({"ok": True, "model": MODEL, "output": a.output, "bytes": len(img)}))


if __name__ == "__main__":
    main()
