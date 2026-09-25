#!/usr/bin/env python3
"""Download a CC0 GLB, validate it, and host it for the project.

Automates the model-into-project step so you don't hand-roll curl + asset
hosting (and don't ship a draco-compressed model that silently fails to load):

    code--exec cp /tmp/knowledge/skill/3d-game/scripts/fetch_model.py /tmp/fetch_model.py
    code--exec python /tmp/fetch_model.py <glb-url> --name sports-car

Steps: download → check the `glTF` magic bytes (a few-KB "model" is usually a
saved error page) → detect KHR_draco_mesh_compression (rejected unless
--allow-draco, because drei's useGLTF needs an explicit decoder for it) → host
via `lovable-assets` when present/large, else keep in public/models/. Prints
the URL to pass to useGLTF.

LICENSING IS YOUR JOB, NOT THIS SCRIPT'S: only fetch CC0 models, and verify the
license at the source in this session (see model-sourcing.md). This script does
not and cannot check licenses.
"""

import argparse
import os
import struct
import subprocess
import sys
import urllib.request

GLB_MAGIC = 0x46546C67  # 'glTF', little-endian
JSON_CHUNK = 0x4E4F534A  # 'JSON'
ASSET_HOST_THRESHOLD = 2 * 1024 * 1024  # >2 MB → prefer the asset CDN over public/


def download(url: str, dest: str) -> None:
    os.makedirs(os.path.dirname(dest) or ".", exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": "lovable-3d-game/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r, open(dest, "wb") as f:  # noqa: S310 — fixed https sources
        f.write(r.read())


def read_json_chunk(path: str) -> bytes:
    """Return the raw bytes of the GLB JSON chunk, or raise on a bad header."""
    with open(path, "rb") as f:
        header = f.read(12)
        if len(header) < 12:
            raise ValueError("file too small to be a GLB")
        magic, _version, _length = struct.unpack("<III", header)
        if magic != GLB_MAGIC:
            raise ValueError("missing glTF magic bytes — likely an error page, not a model")
        chunk_len, chunk_type = struct.unpack("<II", f.read(8))
        if chunk_type != JSON_CHUNK:
            raise ValueError("first GLB chunk is not JSON")
        return f.read(chunk_len)


def lovable_assets_available() -> bool:
    return subprocess.run(["which", "lovable-assets"], capture_output=True).returncode == 0


def host(path: str, prefer_assets: bool) -> str:
    size = os.path.getsize(path)
    if (prefer_assets or size > ASSET_HOST_THRESHOLD) and lovable_assets_available():
        out = subprocess.run(
            ["lovable-assets", "create", "--file", path],
            capture_output=True, text=True, check=True,
        )
        # lovable-assets prints the hosted URL (…/__l5e/assets-v1/<id>/<name>).
        return out.stdout.strip()
    return "/" + path[len("public/"):] if path.startswith("public/") else path


def main() -> int:
    ap = argparse.ArgumentParser(description="Download, validate, and host a CC0 GLB.")
    ap.add_argument("url", help="Direct GLB URL (CC0 — verify the license at the source first).")
    ap.add_argument("--name", help="Base filename (default: derived from the URL).")
    ap.add_argument("--allow-draco", action="store_true", help="Permit draco-compressed GLBs (needs a decoder in useGLTF).")
    ap.add_argument("--host", choices=["auto", "assets", "public"], default="auto", help="Where to host the file.")
    args = ap.parse_args()

    name = args.name or os.path.splitext(os.path.basename(args.url.split("?")[0]))[0]
    dest = f"public/models/{name}.glb"

    try:
        download(args.url, dest)
    except Exception as e:  # noqa: BLE001
        print(f"ERROR: download failed: {e}", file=sys.stderr)
        return 1

    size = os.path.getsize(dest)
    try:
        meta = read_json_chunk(dest).decode("utf-8", "replace")
    except Exception as e:  # noqa: BLE001
        print(f"ERROR: not a valid GLB ({e}); got {size} bytes at {dest}", file=sys.stderr)
        return 1

    if "KHR_draco_mesh_compression" in meta and not args.allow_draco:
        print(
            "ERROR: this GLB is draco-compressed. drei's useGLTF will not load it "
            "without a configured DRACOLoader. Pick an uncompressed CC0 model "
            "instead (Kenney/Quaternius kits are uncompressed — see "
            "model-sourcing.md); only pass --allow-draco if you will configure "
            "useGLTF's draco decoder yourself.",
            file=sys.stderr,
        )
        return 1

    if args.host == "public":
        url = "/" + dest[len("public/"):]
    else:
        url = host(dest, prefer_assets=(args.host == "assets"))

    print(f"OK: {dest} ({size} bytes)")
    print(f"useGLTF url: {url}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
