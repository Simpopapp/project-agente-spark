# CDN assets reference

Background facts the `migrate-to-assets` skill relies on. Read this when a
decision in the skill is ambiguous (e.g. "is this extension supported?", "why
won't this SVG render?").

## CDN URL shape

```
/__l5e/assets-v1/{asset_id}/{filename}
```

Served by `proxy-worker2` from the R2 key `a/v1/{project_id}/{asset_id}/{filename}`.
The `{project_id}` is resolved from the request hostname, not the URL — so the
same `/__l5e/assets-v1/...` path works across preview, published, and custom
domains for the project.

Cache: `public, max-age=31536000, immutable`. Asset IDs are UUIDs and never
reused, so URLs are stable forever.

## MIME allowlist

The `lovable-assets` CLI validates the file's extension and detected content
type against this allowlist (`go/sandbox-cli/internal/assets/content_types.go`).
Anything outside it is rejected by the CLI — do not attempt to upload it.

| Category   | Extensions |
|------------|------------|
| Images     | `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.avif`, `.svg`, `.ico`, `.bmp`, `.tiff` |
| Fonts      | `.woff`, `.woff2`, `.ttf`, `.otf` |
| Audio      | `.mp3`, `.ogg`, `.wav`, `.flac`, `.aac` |
| Video      | `.mp4`, `.webm`, `.mov` |
| Documents  | `.pdf`, `.docx`, `.xlsx`, `.pptx`, `.doc`, `.xls`, `.ppt`, `.epub`, `.rtf` |
| Data       | `.json`, `.csv`, `.xml`, `.yaml`, `.yml`, `.txt` |
| Archives   | `.zip`, `.gz`, `.tar`, `.rar`, `.7z` |
| 3D         | `.glb`, `.gltf`, `.stl`, `.obj`, `.fbx` |
| Animations | `.lottie` |

Source code (`.ts`, `.tsx`, `.js`, `.css`, `.html`) is intentionally excluded.
Do not migrate it.

## `Content-Disposition: attachment` caveat

`proxy-worker2` serves any object whose content type is `image/svg+xml`,
`text/html`, or `application/javascript` with `Content-Disposition: attachment`
and `Content-Security-Policy: default-src 'none'`. The browser downloads the
file instead of rendering it inline.

Implications for migration:

- **`<img src="foo.svg">` and CSS `background-image: url(foo.svg)`** — fine.
  The browser fetches the bytes and renders them as an image; the disposition
  header is ignored for image contexts.
- **`<use href="foo.svg#icon">` (inline SVG sprite)** — broken. The browser
  needs to parse the SVG inline to reach `#icon`; `attachment` forces a
  download. Leave these files in the repo.
- **`<object data="foo.svg">` / `<iframe src="foo.svg">`** — broken for the
  same reason.
- **HTML files served from the CDN** — broken as a page (download only).
- **JS files served from the CDN** — cannot be loaded as a `<script src>`.

If the project already imports `.svg` as a React component (e.g. `import { ReactComponent as Logo } from './logo.svg'` under `vite-plugin-svgr`), do **not** migrate — the SVG is source code at that point, not a binary asset.

## Data files imported as ES modules — do not migrate

Data files (`.json`, `.csv`, `.yaml`, `.yml`, `.xml`, `.toml`, `.txt`) are on the CDN MIME allowlist, but that only means the CLI *accepts* them. Whether a specific file can be migrated depends entirely on **how it's referenced**.

A `.asset.json` pointer gives you a URL string. That works for any reference that already wants a URL (image `src`, CSS `url()`, `fetch()`). It does **not** work for references that consume the file's *parsed contents* via the bundler. When Vite/webpack/bun sees `import data from "./foo.json"`, it parses the JSON at build time and inlines the resulting object — swapping that for a URL string breaks every call site immediately.

**Disqualifying patterns** (exclude from migration):

```ts
import data from "./foo.json";          // bundler parses & inlines the object
import rows from "./data.csv";          // requires a CSV loader plugin; same shape
import cfg from "./config.yaml";        // same
const x = require("./foo.json");        // CJS equivalent
import("./foo.json").then(m => m.default); // dynamic import that reads .default
```

**Qualifying patterns** (safe to migrate — the reference is already a URL):

```ts
fetch("/data/foo.json").then(r => r.json());     // runtime fetch by URL
fetch(new URL("./foo.json", import.meta.url));   // Vite asset URL helper
<img src="./hero.png" />                          // HTML/JSX src attribute
<link rel="icon" href="/favicon.ico" />           // href attribute
background-image: url("./hero.jpg");              // CSS url()
@font-face { src: url("./Inter.woff2"); }         // CSS @font-face
const u = new URL("./video.mp4", import.meta.url).href; // URL-only dynamic import
```

If a file has *both* kinds of references in the codebase, exclude it and surface the conflict — migrating it would silently break the parsed-import call sites.

This restriction does not apply to true binary assets (images, fonts, audio, video, archives, 3D, PDFs) — those are virtually never `import`ed for their parsed value; the bundler returns a URL string in the first place. The check is specifically for text-shaped data formats on the allowlist.

## `src/assets/` vs `public/`

| | `src/assets/*` | `public/*` |
|---|---|---|
| Resolution | Bundler-imported (`import x from "./assets/x.png"`) | Served verbatim at the URL `/x.png` |
| Reference style | Module identifiers in JS/TS | Literal string paths in HTML/CSS/JS |
| Post-migration | `import x from "./assets/x.png.asset.json"` then `x.url` | Replace `/x.png` literals with `/__l5e/assets-v1/.../x.png` |
| Files left behind | `x.png.asset.json` lives in `src/assets/` | `x.png.asset.json` lives in `public/` (no special handling) |

The pointer file can live anywhere — only the JSON contents matter at runtime. Keeping it next to where the original lived minimises churn for code reviewers.

## `lovable-assets delete` CLI (not used during migration)

Cleanup command exposed by the sandbox CLI. Takes one or more `--file
<path.asset.json>` pointers, validates that each `project_id` matches the
current project, deletes the R2 object, and removes the pointer file from the
repo. Use it **only** to clean up an asset that is no longer referenced
anywhere, including in earlier versions of the project — the URL is
permanently dead after deletion, breaking past previews and deployments that
referenced it.

During this migration, the originals are removed with `rm` and the pointer
files are kept. `lovable-assets delete` would also remove the R2 object, which
is the opposite of what's needed here.

## Pointer file format

```json
{
  "version": 1,
  "asset_id": "uuid",
  "project_id": "project-uuid",
  "url": "/__l5e/assets-v1/{asset_id}/{filename}",
  "r2_key": "a/v1/{project_id}/{asset_id}/{filename}",
  "original_filename": "logo.png",
  "size": 12345,
  "content_type": "image/png",
  "created_at": "2026-06-05T12:00:00Z"
}
```

Always write the `lovable-assets create` stdout verbatim to disk. Do not
hand-construct or hand-edit pointer JSON — `asset_id`, `r2_key`, and
`project_id` must match the upload exactly or the CDN serves a 404.
