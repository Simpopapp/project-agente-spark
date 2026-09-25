#!/usr/bin/env python3
"""Headless-browser verification for a 3D scene in the Lovable sandbox.

There is no built-in screenshot tool, so copy this and run it via code--exec:

    code--exec cp /tmp/knowledge/skill/3d-game/scripts/verify.py /tmp/verify.py
    code--exec python /tmp/verify.py --url http://localhost:8080 --shot /tmp/shot.png --keys "Space ArrowLeft"
    code--view /tmp/shot.png

It loads the page, optionally enters the game (keys/click) so the screenshot
captures live gameplay rather than a title gate, writes a PNG, and prints
console messages, page errors, and failed network requests (a 404 on a GLB
leaves the Suspense fallback up forever with no console error). Exits non-zero
if the page threw, so a broken scene is a signal, not just text.

Requires Playwright (preinstalled in the sandbox).
"""

import argparse
import os
import sys

from playwright.sync_api import sync_playwright


def main() -> int:
    ap = argparse.ArgumentParser(description="Screenshot + diagnose a 3D scene.")
    ap.add_argument("--url", default="http://localhost:8080", help="Dev server URL (sandbox default: 8080).")
    ap.add_argument("--shot", default="/tmp/shot.png", help="Screenshot output path.")
    ap.add_argument("--keys", default="", help='Space-separated keys to press to enter/drive, e.g. "Space ArrowLeft".')
    ap.add_argument("--click", default="", help='Click at "x,y" before the shot (e.g. a start button).')
    ap.add_argument("--click-selector", default="", help="Click this CSS selector before the shot.")
    ap.add_argument("--wait", type=int, default=4000, help="Settle time in ms after load before acting. The sandbox renders WebGL in software — heavy scenes settle slowly; raise this before concluding a blank frame is broken.")
    ap.add_argument("--hold", type=int, default=500, help="ms to hold each key (for steering/driving).")
    args = ap.parse_args()

    console: list[str] = []
    page_errors: list[str] = []
    failed: list[str] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_context(viewport={"width": 1280, "height": 800}).new_page()
        page.on("console", lambda m: console.append(f"[{m.type}] {m.text}"))
        page.on("pageerror", lambda e: page_errors.append(str(e)))
        page.on("requestfailed", lambda r: failed.append(f"{r.method} {r.url} — {r.failure}"))
        page.on("response", lambda r: failed.append(f"{r.status} {r.url}") if r.status >= 400 else None)

        page.goto(args.url, wait_until="domcontentloaded")
        page.wait_for_timeout(args.wait)

        if args.click_selector:
            try:
                page.click(args.click_selector, timeout=2000)
            except Exception as e:  # noqa: BLE001 — best-effort gate entry
                console.append(f"[verify] click-selector failed: {e}")
        if args.click:
            x, y = (float(v) for v in args.click.split(","))
            page.mouse.click(x, y)
        for key in args.keys.split():
            page.keyboard.down(key)
            page.wait_for_timeout(args.hold)
            page.keyboard.up(key)
        page.wait_for_timeout(800)

        page.screenshot(path=args.shot)
        # A near-uniform frame compresses to a tiny PNG — usually the scene
        # hasn't finished its first software-WebGL render, not a real blank.
        if os.path.getsize(args.shot) < 20_000:
            console.append("[verify] near-uniform frame; waiting longer and reshooting once")
            page.wait_for_timeout(args.wait)
            page.screenshot(path=args.shot)
        browser.close()

    def section(title: str, lines: list[str], tail: int = 40) -> None:
        print(f"\n=== {title} ({len(lines)}) ===")
        for line in lines[-tail:]:
            print(line)

    print(f"screenshot: {args.shot}")
    section("console", console)
    section("page errors", page_errors)
    section("failed/4xx-5xx requests", failed)

    # A page error means the scene almost certainly did not render — fail loud.
    return 1 if page_errors else 0


if __name__ == "__main__":
    sys.exit(main())
