## Goal
Turn the existing responsive React app into an **installable Progressive Web App** with offline support, so it works as a real app on mobile, tablet, and desktop. The current UI is already responsive (Tailwind breakpoints in `AppShell`, tables collapse to cards on mobile, OCR uses `capture="environment"`), so this plan focuses on PWA wiring + a few mobile polish items.

> ⚠️ **About the Lovable preview**: PWA install + offline behavior only works on the **published/deployed** site (`*.lovable.app` or your custom domain `dmr2grn.siplproducts.com`), **not** in the in-editor preview iframe. The service worker is intentionally disabled in dev/iframe contexts to avoid cache issues.

---

## 1. Add PWA tooling

**Install dependency**
- `vite-plugin-pwa` (devDependency) — handles manifest + Workbox service worker generation.

**Update `vite.config.ts`**
- Register `VitePWA` plugin with:
  - `registerType: "autoUpdate"` so users auto-get new versions.
  - `devOptions: { enabled: false }` — never run SW in Lovable preview.
  - `workbox.navigateFallbackDenylist: [/^\/~oauth/, /^\/api/]` — never cache the SAP middleware proxy or OAuth.
  - `workbox.runtimeCaching` rules:
    - Google Fonts → `CacheFirst`.
    - Supabase REST/Edge functions → `NetworkFirst` with short timeout.
    - App shell + assets → precached automatically.
  - Inline manifest (see step 2).

---

## 2. Web app manifest (configured inside the plugin)

```
name: "DMR & GRN Portal"
short_name: "DMR Portal"
description: "Daily Material Receipt & GRN management with OCR + SAP"
theme_color: "#0F172A"
background_color: "#ffffff"
display: "standalone"
orientation: "any"
start_url: "/"
scope: "/"
categories: ["business", "productivity"]
```
Icons (step 3) referenced for 192, 512 + maskable.

---

## 3. Generate PWA icons

Create in `public/`:
- `pwa-192x192.png`
- `pwa-512x512.png`
- `pwa-maskable-512x512.png` (with safe-zone padding for Android adaptive icons)
- `apple-touch-icon.png` (180×180, for iOS home-screen install)

Generated from `src/assets/rithwik-logo.png` so the installed app uses your brand.

---

## 4. Mobile-friendly meta tags in `index.html`

Add inside `<head>`:
- `<meta name="theme-color" content="#0F172A" />`
- `<meta name="apple-mobile-web-app-capable" content="yes" />`
- `<meta name="apple-mobile-web-app-status-bar-style" content="default" />`
- `<meta name="apple-mobile-web-app-title" content="DMR Portal" />`
- `<link rel="apple-touch-icon" href="/apple-touch-icon.png" />`
- Tighten viewport: `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />`

---

## 5. Iframe / preview safety guard in `src/main.tsx`

Before any SW registration, add a guard that:
- Detects iframe (`window.self !== window.top`).
- Detects Lovable preview hosts (`id-preview--`, `lovableproject.com`).
- In those contexts, **unregisters any existing service workers** so the editor preview is never stuck on cached content.
- Production (`dmr2grn.siplproducts.com` and the published `*.lovable.app`) registers normally via the plugin's auto-injected `registerSW`.

---

## 6. Install prompt UX

- New `src/components/InstallPwaButton.tsx`:
  - Listens for `beforeinstallprompt`, stashes the event, shows a button only when installable and not already installed (`display-mode: standalone` check).
  - On iOS Safari (no `beforeinstallprompt`), shows a brief tooltip: *“Tap Share → Add to Home Screen”*.
- Mount it in the top bar of `src/components/AppShell.tsx` next to the bell icon (icon-only on mobile, icon + label on ≥md).

---

## 7. Mobile / tablet polish (small, targeted)

App is already responsive; these tighten the installed experience:
- **`AppShell.tsx`**: iOS safe areas — `pt-[env(safe-area-inset-top)]` on header, `pb-[env(safe-area-inset-bottom)]` on main.
- **`DMRNew.tsx` / `OcrCaptureCard.tsx`**: confirm camera input works on mobile (already uses `capture="environment"`); enlarge “Take Photo / Upload” touch targets to `min-h-11` on `<sm`.
- **`SapLiveTable.tsx`**: wrap table with `-mx-4 sm:mx-0` so it goes edge-to-edge on phones for readable columns.
- **`index.css`**: `html, body { overscroll-behavior-y: none; }` to avoid pull-to-refresh hijacking the installed app.

---

## 8. Verification checklist (after deploy)

I'll instruct you to:
1. **Publish** the app (frontend changes require clicking Update in the Publish dialog).
2. Open the published URL in Chrome desktop → DevTools → *Application* → *Manifest* → confirm icons + name.
3. On Android Chrome: visit site → menu → *Install app*.
4. On iPhone Safari: Share → *Add to Home Screen*.
5. Confirm app launches standalone, routes work after refresh, and offline mode loads the shell.

---

## Files to be created / edited

**Created**
- `public/pwa-192x192.png`
- `public/pwa-512x512.png`
- `public/pwa-maskable-512x512.png`
- `public/apple-touch-icon.png`
- `src/components/InstallPwaButton.tsx`

**Edited**
- `package.json` (add `vite-plugin-pwa`)
- `vite.config.ts` (register plugin + manifest + workbox config)
- `index.html` (PWA meta tags, viewport-fit)
- `src/main.tsx` (iframe/preview SW guard)
- `src/components/AppShell.tsx` (mount install button, safe-area padding)
- `src/components/SapLiveTable.tsx` (edge-to-edge table on mobile)
- `src/components/OcrCaptureCard.tsx` (touch-target sizing)
- `src/index.css` (overscroll-behavior)

---

## Out of scope (ask if you want these next)
- True native iOS/Android app via Capacitor (App Store / Play Store).
- Offline **data** sync / queueing of DMR submissions made while offline (current plan caches the **shell**, not writes against SAP).
- Push notifications.