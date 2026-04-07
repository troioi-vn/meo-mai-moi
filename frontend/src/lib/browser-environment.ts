export interface BrowserEnvironment {
  isInstagramInAppBrowser: boolean;
  isFacebookInAppBrowser: boolean;
  isTelegramMiniApp: boolean;
  isLikelyInAppBrowser: boolean;
}

interface BrowserEnvironmentInput {
  userAgent?: string;
  referrer?: string;
}

export function getBrowserEnvironment(input?: BrowserEnvironmentInput): BrowserEnvironment {
  const userAgent =
    (input?.userAgent ??
      (typeof navigator !== "undefined" && typeof navigator.userAgent === "string"
        ? navigator.userAgent
        : "")) ||
    "";
  const referrer =
    (input?.referrer ??
      (typeof document !== "undefined" && typeof document.referrer === "string"
        ? document.referrer
        : "")) ||
    "";

  const ua = userAgent.toLowerCase();
  const ref = referrer.toLowerCase();

  const isInstagramInAppBrowser = ua.includes("instagram");
  const isFacebookInAppBrowser =
    ua.includes("fban") || ua.includes("fb_iab") || ua.includes("fbav") || ua.includes("fb4a");
  const isTelegramMiniApp =
    ua.includes("telegram") ||
    (typeof window !== "undefined" && typeof window.Telegram?.WebApp !== "undefined");

  const isLikelyInAppBrowser =
    isInstagramInAppBrowser ||
    isFacebookInAppBrowser ||
    ref.includes("l.instagram.com") ||
    ref.includes("lm.facebook.com");

  return {
    isInstagramInAppBrowser,
    isFacebookInAppBrowser,
    isTelegramMiniApp,
    isLikelyInAppBrowser,
  };
}
