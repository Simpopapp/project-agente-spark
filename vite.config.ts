// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// OpenCode web runs as a local process inside the sandbox. The preview is served over
// https on port 8080 only, so the UI is reached through a same-origin dev proxy.
const OPENCODE_TARGET = process.env["OPENCODE_URL"] ?? "http://127.0.0.1:4096";

// Root paths owned by the OpenCode server (SPA assets + its HTTP/SSE API).
// "/api/*" entries are listed individually so the app's own /api routes keep working.
const OPENCODE_PATHS = [
  "/assets",
  "/doc",
  "/event",
  "/config",
  "/global",
  "/instance",
  "/session",
  "/project",
  "/file",
  "/find",
  "/formatter",
  "/log",
  "/lsp",
  "/mcp",
  "/permission",
  "/question",
  "/path",
  "/skill",
  "/agent",
  "/command",
  "/provider",
  "/pty",
  "/sync",
  "/tui",
  "/vcs",
  "/experimental",
  "/auth",
  "/site.webmanifest",
  "/favicon-96x96-v3.png",
  "/favicon-v3.svg",
  "/favicon-v3.ico",
  "/apple-touch-icon-v3.png",
  "/api/session",
  "/api/event",
  "/api/agent",
  "/api/command",
  "/api/config",
  "/api/credential",
  "/api/fs",
  "/api/health",
  "/api/integration",
  "/api/location",
  "/api/model",
  "/api/permission",
  "/api/provider",
  "/api/pty",
  "/api/question",
  "/api/reference",
  "/api/skill",
];

const opencodeProxy: Record<string, unknown> = {
  // iframe entry point for the embedded OpenCode web UI
  "/oc": {
    target: OPENCODE_TARGET,
    changeOrigin: true,
    ws: true,
    rewrite: (path: string) => path.replace(/^\/oc/, "") || "/",
  },
};

for (const path of OPENCODE_PATHS) {
  opencodeProxy[path] = { target: OPENCODE_TARGET, changeOrigin: true, ws: true };
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    server: { proxy: opencodeProxy },
  },
});
