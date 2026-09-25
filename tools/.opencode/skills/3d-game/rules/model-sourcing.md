---
name: model-sourcing
description: Finding free CC0 GLB models and texture images online, downloading them into the project, and the licensing rules that gate every download.
metadata:
  tags: models, glb, textures, cc0, licensing, kenney, poly-pizza
---

# Sourcing Free Models & Textures

Once you have a direct CC0 GLB URL (from the sources below), the
`fetch_model.py` helper downloads, validates the `glTF` magic bytes, rejects
draco-compressed files, and hosts it — instead of hand-rolling curl + asset
upload:

```bash
code--exec cp /tmp/knowledge/skill/3d-game/scripts/fetch_model.py /tmp/fetch_model.py
code--exec python /tmp/fetch_model.py <glb-url> --name sports-car
```

It does NOT check licenses — that is your job (CC0 only, verified at the source
this session). Use the manual recipes below to find the URL and confirm the
license, then load the model per `models-and-animation.md`.

**Reach for a CC0 asset when the brief names a real-world thing.** A named
object (car, character, tree, rock, crate, weapon, building) looks far better
as a Kenney/Quaternius CC0 model than a primitive approximation; a realistic
surface looks far better with a CC0 image texture (Poly Haven / ambientCG) than
flat color. Stay procedural for abstract, stylized, voxel, or generated forms,
and use canvas textures for stylized looks — don't default the whole scene to
untextured primitives (Core Philosophy #2 in `SKILL.md`).

## Licensing — Read Before Downloading

**CC0 (public domain) only.** Verify the license on the model's page or
metadata *before* downloading — "free download" does not mean "free license".
Verify from the source itself, in this session — never assert a license from
memory, even for a model you recognize.

| License | Action |
| --- | --- |
| CC0 / public domain | Use freely — no attribution required |
| CC-BY, CC-BY-SA, CC-NC, CC-ND | Skip — don't ship attribution obligations into the user's project. Offer a CC0 alternative or procedural assets |
| Custom "royalty-free" EULA (TurboSquid, CGTrader) | Never — these forbid shipping raw extractable model files, which is exactly what `public/*.glb` is |

Download models into the project at build time. Never hotlink third-party
CDNs from the deployed game — URLs rot and you don't control uptime.

## Sources

| Source | Art style | License | How |
| --- | --- | --- | --- |
| poly.pizza (Quaternius + Kenney catalogs) | Low-poly, game-ready | CC0 (verify per model) | Direct GLB, recipe below |
| kenney.nl | Low-poly kits (cars, characters, nature) | CC0, all packs | Zip download, recipe below |
| polyhaven.com | Photoreal scanned props | CC0, all assets | JSON API, recipe below |
| Khronos glTF-Sample-Assets | Renderer test assets | Varies per model | Last resort, check `metadata.json` |

## poly.pizza (best first stop)

Individual low-poly GLBs, no auth. The Quaternius
(`https://poly.pizza/u/Quaternius`) and Kenney catalogs are CC0; the Google
Poly archive models on the same site are CC-BY — **check the license shown on
the model page and skip non-CC0**.

If a `POLY_PIZZA_API_KEY` env var is set, use the official API (header
`x-auth-token`):

```bash
curl -s -H "x-auth-token: $POLY_PIZZA_API_KEY" 'https://api.poly.pizza/v1.1/search/car'
```

Without a key, fetch the public model page and pull the GLB URL out of the
HTML (the site's robots.txt permits this):

```bash
curl -s https://poly.pizza/m/<model-id> -o /tmp/model-page.html
# Find the asset URL in the page (shape: https://static.poly.pizza/<uuid>.glb)
grep -o 'https://static\.poly\.pizza/[^"]*\.glb' /tmp/model-page.html | head -1
curl -s -o public/models/<name>.glb '<that url>'
```

## kenney.nl (themed packs)

Every pack is CC0. Modern 3D kits ship a `Models/GLB format/` folder with
individual GLBs (15–250 KB each — ideal sizes). The zip URL contains a
per-release hash, so find it in the asset page HTML:

```bash
curl -s https://kenney.nl/assets/<pack-slug> -o /tmp/kenney.html
grep -o 'https://kenney\.nl/media/pages/assets/[^"]*\.zip' /tmp/kenney.html | head -1
curl -s -o /tmp/pack.zip '<that url>'
unzip -o /tmp/pack.zip -d /tmp/pack
cp '/tmp/pack/Models/GLB format/<model>.glb' public/models/
```

Browse the 3D catalog at `https://kenney.nl/assets/category:3D` (car-kit,
city-kit, nature-kit, mini-characters, …).

## polyhaven.com (photoreal props)

All CC0, free JSON API, but **multi-file glTF** (`.gltf` + `.bin` +
`textures/*.jpg`) and photoreal — usually wrong for stylized games, right for
realistic props. Use the 1k texture variant; 4k is multi-MB.

```bash
curl -s 'https://api.polyhaven.com/assets?type=models' | head -c 2000   # browse
curl -s 'https://api.polyhaven.com/files/<asset_id>'                    # file URLs
```

The files response lists every file with its CDN URL. Download the `.gltf`,
`.bin`, and each texture, preserving the relative paths (`textures/` next to
the `.gltf`), into one folder under `public/models/<asset>/`.

## Khronos glTF-Sample-Assets (last resort)

Renderer test assets, not game art. Licenses vary per model. **Before
downloading any model from this repo, fetch its `metadata.json` and confirm
the license is CC0** — even if you already know the model by name:

```bash
curl -s https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/<name>/metadata.json | grep -o '"license"[^,}]*'
# Must show CC0. Anything else (CC-BY, SCEA, ...) → skip the model.
```

Browse the catalog via
`https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/model-index.json`.

## CC0 Texture Images

Every rule above (CC0-only, verify in-session, download at build time, never
hotlink) applies to textures too. Load with `useTexture` — recipe in
`procedural-textures.md`.

**Poly Haven** — same keyless API with `type=textures`; maps are top-level
keys (`Diffuse`, `nor_gl`, `Rough`, `AO`) with per-resolution URLs. Use 1k
JPGs (~0.5 MB each):

```bash
curl -s 'https://api.polyhaven.com/assets?type=textures' | head -c 2000   # browse
curl -s 'https://api.polyhaven.com/files/<asset_id>'                      # per-map URLs
curl -s -o public/textures/<name>_diff.jpg '<the .Diffuse."1k".jpg url>'
```

**ambientCG** — all CC0, free JSON API, zip per resolution containing
Color/NormalGL/Roughness JPGs:

```bash
curl -s 'https://ambientcg.com/api/v2/full_json?type=Material&limit=10&q=<term>&include=downloadData'
# downloadLink shape: https://ambientcg.com/get?file=<AssetID>_1K-JPG.zip
curl -sL -o /tmp/tex.zip '<the 1K-JPG downloadLink>' && unzip -o /tmp/tex.zip -d /tmp/tex
cp /tmp/tex/*_Color.jpg public/textures/<name>_color.jpg
```

**Kenney** — the CC0 packs include 2D/texture assets; same zip recipe as
above.

## Never Use

- **Sketchfab** — the download API requires an account token you don't have.
- **TurboSquid / CGTrader "free" models** — their EULAs prohibit shipping raw
  extractable files (see licensing table above).
- **market.pmnd.rs** — dead (404).

## After Downloading

Do this **before writing any code that references the file** — a
`useGLTF("/models/x.glb")` pointing at a file that never landed hangs the
Suspense fallback forever with no error. If the download failed, pick the
next source or state the procedural fallback to the user; never leave code
referencing a phantom path.

1. Sanity-check the file: `ls -la public/models/` — a few KB means you saved
   an error page or an HTML redirect, not a model. `head -c 4
   public/models/<name>.glb` must print `glTF` (the GLB magic bytes; the
   `file` utility is not installed in the sandbox).
2. Load it with `useGLTF` and normalize scale — see `models-and-animation.md`.
3. Large models: above ~2 MB per file (or ~5 MB total), upload to the Lovable
   asset CDN instead of `public/`:

   ```bash
   lovable-assets create --file public/models/big.glb
   # → returns /__l5e/assets-v1/<asset_id>/big.glb — use that URL in useGLTF
   ```

   If `lovable-assets` is not on PATH, the assets integration isn't active —
   keep the file in `public/`.
