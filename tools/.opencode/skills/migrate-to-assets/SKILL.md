---
name: migrate-to-assets
description: >-
  Use this skill when the user asks to migrate large binary files (images, fonts, audio, video, PDFs, archives, 3D models, lottie) out of the project's git repo and into the Lovable CDN asset system. Trigger phrase "Migrate large files to CDN assets". Starts with a preflight scan that lists every binary above the size threshold, checks each against the CDN MIME allowlist, and flags SVGs used via inline `<use>` (which can't be migrated safely because the CDN serves SVG with Content-Disposition: attachment). Then summarises the candidate set back to the user, gets confirmation, runs `lovable-assets create` on each file, rewrites imports / CSS `url()` / HTML `src` and `href` references to the resulting `/__l5e/assets-v1/...` URL, deletes the originals, and verifies with `bun run build`. The `.asset.json` pointer files stay committed in place of the binaries.
---

# Migrate large binary files to CDN assets

This skill removes large binary files from the project repo and replaces them with `.asset.json` pointer files served from the Lovable CDN at `/__l5e/assets-v1/{asset_id}/{filename}`. The work is deterministic for ~90% of references; the remainder is judgement calls on dynamic/computed paths.

**Reversibility.** The user can revert the migration commit from chat history. Keep that true: do all work in this turn, no external side effects.

**Use `code--view` and `code--exec` (for `grep`/`rg`)** — not bash `cat`/`ls`. Reference docs in this skill live under `knowledge://skill/migrate-to-assets/reference/`.

---

## Preflight — eligibility

Before touching any files:

1. Confirm `lovable-assets` is on `PATH` (it's injected by the assets integration on every agent wake). Run:
   ```bash
   command -v lovable-assets
   ```
   If missing, stop and tell the user the assets integration isn't active for this project.

2. List binary files >100 KB tracked in git. From the project root:
   ```bash
   git ls-files -z | xargs -0 -I{} sh -c 'test -f "{}" && find "{}" -size +100k -type f' | sort
   ```

3. Filter to **migratable extensions** using the CDN MIME allowlist (see `knowledge://skill/migrate-to-assets/reference/assets-reference.md`). Skip anything not on the allowlist and tell the user which files were skipped and why.

4. **SVG `<use>` check.** For any candidate `.svg`, grep the project for `<use href="..."` or `<use xlink:href="..."` references to that file. If found, flag and exclude — the CDN serves SVGs with `Content-Disposition: attachment` so they download instead of rendering inline. Inline `<img src="foo.svg">` and CSS `background-image: url(foo.svg)` are fine.

5. **ES module import check (data files).** For each candidate, classify every JS/TS reference to it. If the file's *only* JS/TS references are ES module imports that consume its parsed value — `import data from "./foo.json"`, `import rows from "./foo.csv"`, `const cfg = require("./foo.yaml")` — exclude it from migration regardless of size. The bundler parses and inlines those values at build time; a CDN URL string is not a drop-in replacement and the code will break at runtime. Only include files whose references are URL-style call sites: `fetch("/foo.json")`, `<img src="./foo.png">`, CSS `url("./foo.woff2")`, HTML `src`/`href`/`poster`/`srcset` attributes, or `new URL("./foo.json", import.meta.url)` / dynamic `import()` used purely for the URL string. When a file has both kinds of references, exclude it and surface the conflict to the user. See `knowledge://skill/migrate-to-assets/reference/assets-reference.md` for the full pattern list.

If after filtering there are zero candidates, stop and tell the user there's nothing to migrate.

---

## Step 0 — Scan & summarise

For each remaining candidate, collect:

- Path, size (human-readable), detected MIME
- Location class: `src/assets/*` (bundler-imported) vs `public/*` (served by literal path) vs other
- Every reference in the codebase. Search at minimum:
  - ES `import` / `import.meta.url` / `require`
  - CSS `url(...)` (in `.css`, `.scss`, styled-components, Tailwind config)
  - HTML attributes: `src=`, `href=`, `poster=`, `srcset=`, `data-*`
  - JSON / YAML config files (manifest.json, site.webmanifest)
  - String literals matching the basename (catches computed paths)

Post a concise markdown summary back to the user: a table of files with size, type, location class, and reference count. Call out any file with **zero** references (likely dead) and any with **dynamic/computed** references (will need manual review at Step 2).

**Stop and ask for confirmation before proceeding.** The user may want to exclude specific files.

Once the user confirms, start Step 1. Steps 1–3 add `.asset.json` pointers, rewrite imports across the project, and delete the original binaries; treat module-resolution errors from HMR on intermediate edits as noise, not signal — Step 4's build gate and its dev-server restart settle the preview at the end.

---

## Step 1 — Upload

For each confirmed file, in sequence:

```bash
lovable-assets create --file <path>
```

The CLI writes the `.asset.json` JSON to stdout. Capture the `url` field (`/__l5e/assets-v1/{asset_id}/{filename}`). Write the JSON to disk at `<path>.asset.json` using `write_file`. Do not hand-write the pointer JSON; always use the CLI output verbatim.

If a single upload fails, stop the loop, surface the error, and ask the user how to proceed. Do not continue mutating references for partially-uploaded files.

---

## Step 2 — Rewrite references

For each migrated file, replace every reference identified in Step 0 with the CDN URL.

**Bundler-imported (`src/assets/*`):**

```ts
// before
import logo from "./assets/logo.png";

// after — preferred (keeps `logo` as a string used by JSX)
import logoAsset from "./assets/logo.png.asset.json";
const logo = logoAsset.url;
```

For one-off uses, inlining the URL literal is acceptable. Prefer importing the `.asset.json` so future regenerations don't require touching call sites.

**CSS `url()`:**

```css
/* before */
background-image: url("./hero.jpg");
@font-face { src: url("./Inter.woff2") format("woff2"); }

/* after */
background-image: url("/__l5e/assets-v1/<asset_id>/hero.jpg");
@font-face { src: url("/__l5e/assets-v1/<asset_id>/Inter.woff2") format("woff2"); }
```

**HTML attributes** (`index.html`, `public/*.html`):

```html
<link rel="icon" href="/__l5e/assets-v1/<asset_id>/favicon.ico" />
<img src="/__l5e/assets-v1/<asset_id>/hero.jpg" alt="..." />
```

**Public assets** (`public/foo.png` referenced as `/foo.png`) — replace the literal path string everywhere it appears.

**Dynamic / computed paths.** If Step 0 flagged references like `` `assets/${name}.png` `` or `require(path)`, **do not silently rewrite**. Surface them to the user with file:line and ask which CDN URL each should resolve to (or whether to leave the file in the repo).

---

## Step 3 — Remove originals

After every reference for a file has been rewritten, delete the original binary:

```bash
rm <path>
```

The `.asset.json` pointer next to it stays committed. The `lovable-assets delete` CLI is **only** for later cleanup of unused assets (see reference doc); do not run it during this migration.

Optionally, propose adding `*.png`, `*.jpg`, etc. to `.gitignore` under the migrated directories to prevent accidental re-adds. Ask the user before editing `.gitignore` — they may want to keep small icons in-repo.

---

## Step 4 — Verify

From the project root:

```bash
bun run build
```

If it exits 0, restart the dev server to settle the preview on the migrated tree — via `code--exec`, kill the Vite process (`kill -9 $(ps -ef | grep -E '[v]ite|bun run dev' | grep -v grep | awk '{print $2}')`; the daemon respawns it) and poll until port 8080 answers again — then post a final summary: count of files migrated, total bytes removed from the repo, and any files that were skipped at preflight or Step 2.

If it exits non-zero, surface the first error and stop. Common failures: a missed reference (string literal not caught by Step 0's grep), a typo'd CDN URL, an import path that no longer resolves. Fix in this same turn before declaring the migration done — the user reverts the whole commit if they want to abort. Once the build is green, restart the dev server the same way (kill the Vite process and wait for the respawn).

---

## Reference

`knowledge://skill/migrate-to-assets/reference/assets-reference.md` — MIME allowlist, `Content-Disposition: attachment` rules, `lovable-assets delete` CLI, `src/assets/` vs `public/` differences.
