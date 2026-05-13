import { registerSW } from "virtual:pwa-register";

// Enhanced service worker registration for PWA
// Provides update detection, periodic checks, and iOS focus-based updates
let swRegistration: ServiceWorkerRegistration | undefined;
let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined;
let needsRefreshCallback: (() => void) | null = null;
let pwaUpdatePending = false;
let updateInProgress = false;
let updateReloadFallbackTimer: number | undefined;

const FORCE_RELOAD_ON_UPDATE = import.meta.env.VITE_FORCE_RELOAD_ON_UPDATE === "true";
const UPDATE_RELOAD_FALLBACK_MS = 4000;

export function setNeedsRefreshCallback(callback: (() => void) | null) {
  needsRefreshCallback = callback;
}

function clearUpdateReloadFallback() {
  if (updateReloadFallbackTimer === undefined || typeof window === "undefined") return;

  window.clearTimeout(updateReloadFallbackTimer);
  updateReloadFallbackTimer = undefined;
}

function reloadPageForUpdate() {
  if (typeof window === "undefined") return;

  window.location.reload();
}

function scheduleUpdateReloadFallback() {
  if (typeof window === "undefined") return;

  clearUpdateReloadFallback();
  updateReloadFallbackTimer = window.setTimeout(() => {
    console.warn("[PWA] Service worker update did not reload in time; forcing page reload");
    updateInProgress = false;
    reloadPageForUpdate();
  }, UPDATE_RELOAD_FALLBACK_MS);
}

function reloadWhenServiceWorkerTakesControl() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

  navigator.serviceWorker.addEventListener(
    "controllerchange",
    () => {
      clearUpdateReloadFallback();
      updateInProgress = false;
      reloadPageForUpdate();
    },
    { once: true },
  );
}

export function triggerAppUpdate() {
  pwaUpdatePending = false;

  if (updateInProgress) {
    return;
  }

  updateInProgress = true;
  scheduleUpdateReloadFallback();
  reloadWhenServiceWorkerTakesControl();

  if (!updateSW) {
    console.warn("[PWA] Update requested before service worker updater was ready; reloading page");
    reloadPageForUpdate();
    return;
  }

  void updateSW(true).catch((error: unknown) => {
    console.warn("[PWA] Service worker update failed; forcing page reload", error);
    updateInProgress = false;
    reloadPageForUpdate();
  });
}

/**
 * Registers the PWA service worker.
 *
 * Important: this must be called from the real browser entrypoint (`main.tsx`).
 * It is intentionally NOT run at module import time so tests can safely import
 * helpers like `setNeedsRefreshCallback` without bootstrapping the whole app.
 */
export function initPwaServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  if (navigator.webdriver) {
    // Playwright/E2E runs should always use the current build artifacts directly.
    // A persisted service worker can keep serving stale hashed bundles across rebuilds.
    void navigator.serviceWorker
      .getRegistrations()
      .then((registrations) =>
        Promise.all(registrations.map((registration) => registration.unregister())),
      )
      .catch(() => {
        // Ignore cleanup errors in automation.
      });
    return;
  }

  updateSW = registerSW({
    immediate: true,

    onNeedRefresh() {
      console.log("[PWA] New version available");

      if (pwaUpdatePending) {
        console.log("[PWA] Update already pending; skipping duplicate refresh prompt");
        return;
      }

      pwaUpdatePending = true;

      // If explicitly enabled, reload immediately when a new SW is ready.
      // This is the strongest guarantee that users will move to the latest deploy.
      if (FORCE_RELOAD_ON_UPDATE) {
        console.log("[PWA] Forcing reload to apply update");
        triggerAppUpdate();
        return;
      }

      if (needsRefreshCallback) {
        needsRefreshCallback();
      }
    },

    onOfflineReady() {
      console.log("[PWA] App ready to work offline");
    },

    onRegisteredSW(swUrl, registration) {
      console.log("[PWA] Service worker registered:", swUrl);
      swRegistration = registration;

      if (registration) {
        // Periodic update checks every hour for long-lived sessions
        setInterval(
          () => {
            console.log("[PWA] Checking for updates...");
            registration.update().catch((err: unknown) => {
              console.warn("[PWA] Update check failed:", err);
            });
          },
          60 * 60 * 1000,
        );
      }
    },

    onRegisterError(error) {
      console.error("[PWA] Registration failed:", error);
    },
  });

  // iOS/Safari: Check for updates when app regains focus
  // iOS doesn't check as frequently in background
  window.addEventListener("focus", () => {
    if (swRegistration) {
      console.log("[PWA] Focus event - checking for updates");
      swRegistration.update().catch(() => {
        // Ignore errors on focus check
      });
    }
  });
}
