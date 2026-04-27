import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// --- PWA service-worker handling ---------------------------------------------
// Inside the Lovable editor preview (iframe / preview hostnames) we MUST NOT
// run the service worker — it would cache the app shell and prevent edits from
// showing up. In production (published site / custom domain) we register it.
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true; // cross-origin block → assume iframe
  }
})();

const host = window.location.hostname;
const isPreviewHost =
  host.includes("id-preview--") ||
  host.includes("lovableproject.com") ||
  host === "localhost" ||
  host === "127.0.0.1";

if (isPreviewHost || isInIframe) {
  // Aggressively unregister any SW that may have been installed previously,
  // so the editor preview always serves fresh content.
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => regs.forEach((r) => r.unregister()))
      .catch(() => {});
  }
} else {
  // Production: register the auto-generated SW from vite-plugin-pwa.
  import("virtual:pwa-register")
    .then(({ registerSW }) => {
      registerSW({ immediate: true });
    })
    .catch(() => {
      // plugin missing in some dev contexts — safe to ignore
    });
}

createRoot(document.getElementById("root")!).render(<App />);
