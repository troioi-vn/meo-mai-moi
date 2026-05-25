import { useEffect } from "react";
import { setNeedsRefreshCallback } from "@/pwa";
import { useSilentAppUpdate } from "@/hooks/use-app-update";

/**
 * Hook that handles PWA update notifications.
 * Shows a toast when a new version is available and allows the user to update.
 *
 * Usage: Call this hook once in your App component.
 */
export function usePwaUpdate() {
  const { requestSilentAppUpdate } = useSilentAppUpdate();

  useEffect(() => {
    // Register callback to be notified when SW detects a new version
    setNeedsRefreshCallback(() => {
      requestSilentAppUpdate();
    });

    return () => {
      setNeedsRefreshCallback(null);
    };
  }, [requestSilentAppUpdate]);
}
