#!/usr/bin/env python3
"""Capture individual ad cards from a Google Ads Transparency Center or Meta Ad Library page as JPEG screenshots,
original creatives under the 500 KB figure cap, and a <out>/<library>-ads.json manifest; exit 3 when nothing was saved."""

import argparse
import asyncio
import base64
import io
import ipaddress
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

from playwright.async_api import TimeoutError as PlaywrightTimeout
from playwright.async_api import async_playwright

FIGURE_MAX_BYTES = 500_000
CARD_QUALITIES = (70, 55, 40)
MAX_CREATIVE_EDGE = 1600
ICON_GLYPHS = {"videocam", "play_circle", "play_arrow", "image", "open_in_new", "arrow_drop_down", "check"}
BLOCK_MARKERS = (
    "sorry, you have been blocked",
    "unusual traffic",
    "verify you are human",
    "log in to continue",
    "log in or sign up to view",
    "our systems have detected",
)

META_CARD_JS = """
(args) => {
  const [needle, attr] = args;
  const ids = [];
  if (!document.body) return ids;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (!node.textContent.trim().startsWith(needle)) continue;
    const id = node.textContent.replace(/\\D/g, "");
    if (!id || ids.includes(id)) continue;
    let el = node.parentElement;
    while (el && el !== document.body) {
      const r = el.getBoundingClientRect();
      if (r.width >= 300 && r.width < 700 && r.height >= 200 && el.querySelector("img,video")) break;
      el = el.parentElement;
    }
    if (!el || el === document.body) continue;
    el.setAttribute(attr, id);
    ids.push(id);
  }
  return ids;
}
"""

CARD_INFO_JS = """
(el) => {
  const media = [...el.querySelectorAll("img,video")].map((m) => {
    const b = m.getBoundingClientRect();
    return {
      tag: m.tagName.toLowerCase(),
      w: Math.round(b.width),
      h: Math.round(b.height),
      src: m.currentSrc || m.src || m.getAttribute("src") || "",
      poster: m.poster || "",
    };
  });
  const links = [...el.querySelectorAll("a[href]")].map((a) => a.href);
  return { text: el.innerText || "", media, links };
}
"""


def log(message):
    print(message, flush=True)


def slug(value):
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-") or "ad"


def clean_text(text):
    text = re.sub("[\\u200b\\u2066-\\u2069]", "", text)
    lines = [re.sub(r"\s+", " ", line).strip() for line in text.splitlines()]
    return [line for line in lines if line]


def with_english(url):
    if "adstransparency.google.com" in url and "hl=" not in url:
        return url + ("&" if "?" in url else "?") + "hl=en"
    return url


def fit_bytes(data, content_type):
    """Return (bytes, suffix) under the figure cap, re-encoding through Pillow when needed."""
    suffix = {"image/png": ".png", "image/webp": ".webp"}.get(content_type, ".jpg")
    if len(data) <= FIGURE_MAX_BYTES and content_type in ("image/jpeg", "image/png", "image/webp"):
        return data, suffix
    try:
        from PIL import Image
    except ImportError:
        return None, None
    try:
        image = Image.open(io.BytesIO(data))
        image.load()
    except Exception:
        return None, None
    if image.mode not in ("RGB", "L"):
        image = image.convert("RGB")
    longest = max(image.size)
    if longest > MAX_CREATIVE_EDGE:
        ratio = MAX_CREATIVE_EDGE / longest
        image = image.resize((max(1, round(image.width * ratio)), max(1, round(image.height * ratio))))
    for quality in (85, 70, 55, 40):
        out = io.BytesIO()
        image.save(out, format="JPEG", quality=quality, optimize=True)
        if out.tell() <= FIGURE_MAX_BYTES:
            return out.getvalue(), ".jpg"
    return None, None


def public_http(url):
    """The sandbox network policy blocks private ranges; this only rejects odd schemes and literal private IPs."""
    parts = urlparse(url)
    if parts.scheme not in ("http", "https") or not parts.hostname:
        return False
    try:
        return ipaddress.ip_address(parts.hostname).is_global
    except ValueError:
        return True


async def fetch_image(page, url):
    """Fetch an image the page already displays, first through the browser context, then in-page."""
    if not public_http(url):
        return None, None
    try:
        response = await page.context.request.get(url, timeout=8000)
        if response.ok:
            content_type = response.headers.get("content-type", "").split(";")[0].strip()
            if content_type.startswith("image/"):
                return await response.body(), content_type
    except Exception:
        pass
    try:
        result = await page.evaluate(
            """async (url) => {
                const r = await fetch(url, {credentials: "include"});
                if (!r.ok) return null;
                const blob = await r.blob();
                const buf = await blob.arrayBuffer();
                let s = ""; const bytes = new Uint8Array(buf);
                for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
                return {type: blob.type, data: btoa(s)};
            }""",
            url,
        )
        if result and result["type"].startswith("image/"):
            return base64.b64decode(result["data"]), result["type"]
    except Exception:
        pass
    return None, None


async def screenshot_card(card, path):
    await card.scroll_into_view_if_needed(timeout=5000)
    for quality in CARD_QUALITIES:
        data = await card.screenshot(type="jpeg", quality=quality)
        if len(data) <= FIGURE_MAX_BYTES:
            path.write_bytes(data)
            return len(data)
    return 0


def pick_creative(media):
    """The largest displayed image, or a video's poster frame; avatars and icons are skipped."""
    best = None
    for item in media:
        if item["tag"] == "video" and item["poster"]:
            return item["poster"], "video-poster"
        if item["tag"] == "img" and item["src"].startswith("http") and min(item["w"], item["h"]) >= 100:
            if best is None or item["w"] * item["h"] > best["w"] * best["h"]:
                best = item
    return (best["src"], "image") if best else (None, None)


async def google_cards(page, args):
    try:
        await page.wait_for_selector("creative-preview", timeout=min(args.wait, args.seconds_left()) * 1000)
    except PlaywrightTimeout:
        return []
    await page.wait_for_timeout(2500)
    cards = page.locator("creative-preview")
    found = []
    for index in range(await cards.count()):
        card = cards.nth(index)
        info = await card.evaluate(CARD_INFO_JS)
        lines = [line for line in clean_text(info["text"]) if line.lower() not in ICON_GLYPHS]
        advertiser = lines[lines.index("Verified", 1) - 1] if "Verified" in lines[1:] else (lines[0] if lines else "")
        has_video = any(line.lower() == "videocam" for line in clean_text(info["text"]))
        creative_link = next((link for link in info["links"] if "/creative/" in link), "")
        match = re.search(r"/advertiser/([A-Z0-9]+)/creative/([A-Z0-9]+)", creative_link)
        ad_id = match.group(2) if match else f"card{index + 1}"
        copy = []
        for frame in page.frames:
            if "adframe" not in frame.url:
                continue
            try:
                owner = await frame.frame_element()
                if await owner.evaluate("(f, c) => c.contains(f)", await card.element_handle()):
                    copy = clean_text(await frame.evaluate("() => document.body ? document.body.innerText : ''"))
                    break
            except Exception:
                continue
        creative_src, kind = pick_creative(info["media"])
        found.append(
            {
                "id": ad_id,
                "advertiser": advertiser,
                "source_url": creative_link or page.url,
                "copy": copy or [line for line in lines[1:] if line.lower() != "verified"],
                "format": "video-thumbnail" if has_video and kind == "image" else kind or ("text" if copy else "unknown"),
                "creative_src": creative_src,
                "_card": card,
            }
        )
    return found


async def meta_cards(page, args):
    attr = "data-capture-card"
    deadline = time.monotonic() + min(args.wait, args.seconds_left())
    ids = []
    while time.monotonic() < deadline:
        ids = await page.evaluate(META_CARD_JS, ["Library ID", attr])
        if ids:
            break
        await page.wait_for_timeout(1000)
    await page.wait_for_timeout(1500)
    found = []
    for ad_id in ids:
        card = page.locator(f"[{attr}='{ad_id}']").first
        info = await card.evaluate(CARD_INFO_JS)
        lines = clean_text(info["text"])
        page_name = ""
        if "Sponsored" in lines:
            at = lines.index("Sponsored")
            page_name = lines[at - 1] if at > 0 else ""
        started = next((line for line in lines if line.startswith("Started running")), "")
        creative_src, kind = pick_creative(info["media"])
        skip = {"Active", "Sponsored", "Platforms", "Open Dropdown", "See ad details", "See summary details", page_name, started}
        copy = [line for line in lines if line not in skip and not line.startswith("Library ID") and not re.fullmatch(r"\d+:\d\d / \d+:\d\d", line)]
        found.append(
            {
                "id": ad_id,
                "advertiser": page_name,
                "source_url": f"https://www.facebook.com/ads/library/?id={ad_id}",
                "copy": copy,
                "started": started,
                "format": kind or "unknown",
                "creative_src": creative_src,
                "_card": card,
            }
        )
    return found


def matching(cards, needle):
    """Cards whose advertiser or page identity carries the name as a whole word, then unreadable identities whose copy does."""
    word = re.compile(r"(?<!\w)" + re.escape(needle.lower()) + r"(?!\w)")
    by_identity, by_copy = [], []
    for card in cards:
        if word.search(card["advertiser"].lower()):
            card["match_basis"] = "advertiser"
            by_identity.append(card)
        elif not card["advertiser"] and word.search(" ".join(card["copy"]).lower()):
            card["match_basis"] = "copy"
            by_copy.append(card)
    return by_identity + by_copy


async def run(args, results):
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    captured_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    status = "no cards rendered"
    async with async_playwright() as pw:
        browser = await pw.chromium.launch()
        context = await browser.new_context(viewport={"width": 1280, "height": 1800}, locale="en-US")
        context.set_default_timeout(min(20, args.deadline) * 1000)
        page = await context.new_page()
        try:
            await page.goto(with_english(args.url), wait_until="domcontentloaded", timeout=min(20, args.seconds_left()) * 1000)
            body = (await page.inner_text("body")).lower()
            if any(marker in body for marker in BLOCK_MARKERS):
                status = "blocked: the library showed a login wall, block page, or challenge"
                return results, status
            cards = await (google_cards(page, args) if args.library == "google" else meta_cards(page, args))
            if not cards:
                status = "no ad cards rendered within the wait; not evidence of no ads"
                return results, status
            if args.match:
                cards = matching(cards, args.match)
                if not cards:
                    status = f"no cards matched {args.match!r}"
            for card in cards[: args.max]:
                name = f"{args.library}-{slug(card['id'])}"
                entry = {k: v for k, v in card.items() if not k.startswith("_")}
                entry["captured_at"] = captured_at
                entry["library_url"] = page.url
                card_path = out / f"{name}-card.jpg"
                entry["card_path"] = str(card_path)
                entry["card_bytes"] = await screenshot_card(card["_card"], card_path)
                if not entry["card_bytes"]:
                    entry["card_path"] = None
                entry["creative_path"] = None
                results.append(entry)
                if card["creative_src"]:
                    data, content_type = await fetch_image(page, card["creative_src"])
                    if data:
                        fitted, suffix = fit_bytes(data, content_type)
                        if fitted:
                            creative_path = out / f"{name}-creative{suffix}"
                            creative_path.write_bytes(fitted)
                            entry["creative_path"] = str(creative_path)
                            entry["creative_bytes"] = len(fitted)
                        else:
                            entry["creative_note"] = "original creative over the figure cap even after re-encoding; card screenshot only"
                    else:
                        entry["creative_note"] = "original creative could not be fetched; card screenshot only"
        except Exception as error:
            status = f"stopped early: {type(error).__name__}: {str(error).splitlines()[0][:160]}"
        finally:
            await browser.close()
    if results:
        status = f"captured {len(results)} ad(s)" + (f"; {status}" if status.startswith("stopped") else "")
    return results, status


def main(argv):
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--library", choices=("google", "meta"), required=True)
    parser.add_argument("--url", required=True, help="the library page to capture, exactly as the skill builds it")
    parser.add_argument("--out", required=True, help="capture directory under /tmp/browser/")
    parser.add_argument("--max", type=int, default=4, help="cards to capture (default 4)")
    parser.add_argument("--match", default="", help="keep only cards whose advertiser or copy contains this text")
    parser.add_argument("--wait", type=int, default=12, help="seconds to wait for cards to render (default 12)")
    parser.add_argument("--deadline", type=int, default=30, help="hard stop for the whole run in seconds (default 30)")
    args = parser.parse_args(argv)
    if not Path(args.out).resolve().is_relative_to(Path("/tmp/browser").resolve()):
        print("error: --out must be a directory under /tmp/browser/", file=sys.stderr)
        return 2
    started = time.monotonic()
    args.seconds_left = lambda: max(1, int(args.deadline - (time.monotonic() - started)))
    results = []
    try:
        results, status = asyncio.run(asyncio.wait_for(run(args, results), timeout=args.deadline))
    except asyncio.TimeoutError:
        saved = f"after saving {len(results)} ad(s)" if results else "before any card was saved"
        status = f"stopped at the {args.deadline}s deadline {saved}"
        if results:
            status = f"captured {len(results)} ad(s); {status}"
    Path(args.out).mkdir(parents=True, exist_ok=True)
    manifest = Path(args.out) / f"{args.library}-ads.json"
    manifest.write_text(json.dumps({"library": args.library, "url": args.url, "status": status, "ads": results}, indent=2))
    for ad in results:
        creative = f" creative={Path(ad['creative_path']).name} ({ad.get('creative_bytes', 0)} bytes)" if ad.get("creative_path") else ""
        card = f" card={Path(ad['card_path']).name} ({ad['card_bytes']} bytes)" if ad.get("card_path") else " card=none"
        log(f"{ad['id']} | {ad['advertiser'] or 'unknown advertiser'} | {ad['format']}{card}{creative}")
    log(f"manifest {manifest}")
    log(f"{args.library}: {status}")
    return 0 if results else 3


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
