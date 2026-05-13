import { useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { setVersionMismatchHandler } from "@/api/axios";
import { hasBlockingDialogOpen, waitForBlockingDialogsToClose } from "@/lib/blocking-dialog";
import { triggerAppUpdate } from "@/pwa";

const SNOOZE_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Listens for API version mismatches (via X-App-Version header)
 * and shows a persistent toast prompting the user to reload.
 *
 * If the user clicks "Later", the toast is suppressed for 30 minutes
 * and then reappears on the next API call that still carries a new version.
 *
 * Usage: call once in App component, alongside usePwaUpdate.
 */
export function useVersionCheck() {
  const { t } = useTranslation("common");
  const snoozedUntilRef = useRef(0);
  const toastVisibleRef = useRef(false);
  const toastPendingRef = useRef(false);
  const cancelPendingToastRef = useRef<(() => void) | null>(null);

  const handleReload = useCallback(() => {
    triggerAppUpdate();
  }, []);

  const handleSnooze = useCallback(() => {
    cancelPendingToastRef.current?.();
    cancelPendingToastRef.current = null;
    toastPendingRef.current = false;
    snoozedUntilRef.current = Date.now() + SNOOZE_MS;
    toastVisibleRef.current = false;
  }, []);

  const showToast = useCallback(() => {
    cancelPendingToastRef.current?.();
    cancelPendingToastRef.current = null;
    toastPendingRef.current = false;

    if (toastVisibleRef.current) return;
    if (Date.now() < snoozedUntilRef.current) return;

    toastVisibleRef.current = true;

    toast(t("versionUpdate.title"), {
      description: t("versionUpdate.description"),
      duration: Infinity,
      action: {
        label: t("versionUpdate.reload"),
        onClick: handleReload,
      },
      cancel: {
        label: t("versionUpdate.later"),
        onClick: handleSnooze,
      },
    });
  }, [t, handleReload, handleSnooze]);

  useEffect(() => {
    setVersionMismatchHandler(() => {
      if (toastVisibleRef.current) return;
      if (toastPendingRef.current) return;
      if (Date.now() < snoozedUntilRef.current) return;

      if (hasBlockingDialogOpen()) {
        toastPendingRef.current = true;
        cancelPendingToastRef.current = waitForBlockingDialogsToClose(showToast);
        return;
      }

      showToast();
    });

    return () => {
      cancelPendingToastRef.current?.();
      cancelPendingToastRef.current = null;
      toastPendingRef.current = false;
      setVersionMismatchHandler(null);
    };
  }, [showToast]);
}
