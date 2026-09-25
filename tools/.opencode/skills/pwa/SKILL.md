---
name: pwa
description: Building installable web apps, offline support, or web push without breaking Lovable previews. Use this skill when the user asks for an app they can install, add to a phone home screen, or launch from an app icon; for offline / works-without-internet / cached app-shell behavior; for web push / browser notifications / Firebase Cloud Messaging (FCM) / background notifications; or when they mention PWA, progressive web app, service worker, manifest, install prompt, or a stale app / cache / won't-update issue. Do not use for native app store builds unless the user chooses an installable web app.
---

# PWA

Build installable web app support without breaking Lovable previews.

## Decide The Scope

Use the smallest option that satisfies the user:

| User asks for | Implement |
| --- | --- |
| "Install on my phone", "Add to Home Screen", "make it feel like an app", "app icon" | Manifest-only home-screen support |
| "Work offline", "open without internet", "offline mode", "cache the app" | Controlled PWA with service worker |
| "Push notifications", "web push", "FCM", "background notifications" | Dedicated messaging service worker (see Push Notifications below) |
| App Store, Play Store, native camera/push/background features | Explain native mobile is a separate Capacitor path unless they choose web installability |

Do not add offline behavior unless the user explicitly asks for offline use. Most users who ask for a "phone app" only need home-screen app metadata.

## Push Notifications

Web push needs a messaging service worker such as `firebase-messaging-sw.js`. It is not an app-shell cache and is separate from installability and offline. Implement it through the messaging integration the user picks (Firebase Cloud Messaging), and keep any existing messaging worker. The offline registration guards and the kill-switch cleanup below apply only to app-shell service workers — leave the messaging worker outside them.

## Manifest-Only Home-Screen Support

For home-screen support without offline behavior:

1. Add or update a web app manifest in `public/manifest.webmanifest` or `public/manifest.json`.
2. Add app name, short name, theme color, background color, `display: "standalone"`, and icon entries.
3. Add matching head tags for `manifest`, `theme-color`, `apple-touch-icon`, and favicons in the app's head entry point.
4. Add icons under `public/`.

Do not introduce `vite-plugin-pwa`, `workbox-*`, app-shell service workers such as `public/sw.js`, `serviceWorker.register`, `virtual:pwa-register`, cache-busting reload loops, or version polling for manifest-only installability. Leave unrelated existing workers such as Firebase Messaging or OneSignal untouched unless you are cleaning up a broken app-shell PWA.

Browser install prompts vary by platform. Still use manifest-only for home-screen/app-icon requests unless the user explicitly asks for offline support.

## Offline Support

For explicit offline support, use `vite-plugin-pwa` with `generateSW`. Do not hand-write a service worker or switch to another service-worker library.

Use these constraints:

| Area | Required behavior |
| --- | --- |
| Registration | Register only from a single wrapper module |
| Plugin dev mode | Set `devOptions: { enabled: false }` so the plugin emits no SW in dev |
| Auto-injection | Set `injectRegister: null` so the plugin never injects its own registration; the wrapper is the only registrar |
| Development | Never register in dev or Lovable preview |
| Existing SWs | Unregister matching stale app SWs in dev/preview |
| Kill switch | Support `?sw=off` to unregister matching app SWs |
| SW filename | Use `/sw.js` |
| Updates | Use `registerType: "autoUpdate"` |
| HTML navigations | Use `NetworkFirst`, never cache-first |
| Built assets | Use `CacheFirst` only for same-origin hashed assets |
| OAuth | Exclude `/~oauth` from navigation fallback/caching |

The registration wrapper must refuse registration when any of these are true:

- `!import.meta.env.PROD`
- the app is inside an iframe
- hostname starts with `id-preview--` or `preview--`
- hostname is `lovableproject.com` or ends with `.lovableproject.com`
- hostname is `lovableproject-dev.com` or ends with `.lovableproject-dev.com`
- hostname is `beta.lovable.dev` or ends with `.beta.lovable.dev`
- the current URL has `?sw=off`

In any refused context, unregister matching registrations for `/sw.js` before returning.

## Do Not Do

- Do not hand-write a custom `public/sw.js` for new offline behavior — generate it with `vite-plugin-pwa` (`generateSW`).
- Do not switch to another service-worker package to avoid `vite-plugin-pwa` — stay on `vite-plugin-pwa`.
- Do not use cache-first HTML or navigation caching — use `NetworkFirst` for navigations.
- Do not register a service worker in Lovable preview, iframe preview, or dev — register only from the guarded wrapper module.
- Do not add browser cache-busting hacks for manifest-only apps — rely on Lovable's revalidation cache headers.
- Do not promise offline behavior in the Lovable editor preview — tell the user offline works only in the published app.
- Do not debug service workers in DevTools for a new build; do that only when cleaning up an existing broken PWA.

## Existing Broken PWA

If the project already has stale caches, a white screen after deploy, or an installed app that will not update:

1. Find existing service worker paths and registration code.
2. If it is a Workbox or `vite-plugin-pwa` service worker, replace the same deployed SW path with a kill-switch worker for one release cycle.
3. Remove registration UI and imports from `virtual:pwa-register`, `workbox-window`, and old manual `serviceWorker.register` calls that target the old app SW.
4. Keep Firebase Messaging and OneSignal workers untouched because they use separate worker files and scopes.

Do not rely on deleting the service-worker source, removing `vite-plugin-pwa`, or `selfDestroying: true` as the cleanup. Returning browsers need a same-path replacement worker to evict the old registration.

Ship this kill-switch worker at the old SW path(s) (`/sw.js`, and `/service-worker.js` if that path was used). Two constraints make it safe: Cache Storage is origin-scoped, so delete only the app SW's own caches (a blanket `caches.delete` wipes Firebase Messaging / OneSignal caches you promised to leave alone), and `unregister()` must run in `finally` because `activate` fires only once — any earlier rejection would otherwise strand the worker registered forever.

```js
// public/sw.js (and public/service-worker.js if previously served there)
// Cache Storage is origin-scoped; only delete the app SW's own Workbox caches.
function isWorkboxCacheForThisRegistration(name) {
  const hasWorkboxBucket = /(^|-)precache-v\d+-|(^|-)runtime-|(^|-)googleAnalytics-/.test(name);
  return hasWorkboxBucket && name.endsWith(self.registration.scope);
}

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        const workboxCacheNames = cacheNames.filter(isWorkboxCacheForThisRegistration);
        await Promise.allSettled(workboxCacheNames.map((name) => caches.delete(name)));
        await self.clients.claim();
        const windowClients = await self.clients.matchAll({ type: "window" });
        await Promise.allSettled(windowClients.map((client) => client.navigate(client.url)));
      } finally {
        await self.registration.unregister();
      }
    })(),
  ),
);
```

Tell the user what changed in non-technical language: home-screen support is kept when possible, offline mode may be removed or rebuilt, and returning visitors update after the browser sees the replacement worker.
