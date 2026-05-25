import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { hasBlockingDialogOpen, waitForBlockingDialogsToClose } from "@/lib/blocking-dialog";
import { triggerAppUpdate } from "@/pwa";
import { AppUpdateContext, type AppUpdateContextValue } from "@/contexts/app-update-context-store";

export function AppUpdateProvider({ children }: { children: React.ReactNode }) {
  const [dirtyForms, setDirtyForms] = useState<Record<string, boolean>>({});
  const [isUpdatePending, setIsUpdatePending] = useState(false);
  const cancelDialogWaitRef = useRef<(() => void) | null>(null);
  const updateTriggeredRef = useRef(false);

  const hasDirtyForms = Object.values(dirtyForms).some(Boolean);
  const hasDirtyFormsRef = useRef(hasDirtyForms);
  const isUpdatePendingRef = useRef(isUpdatePending);

  useEffect(() => {
    hasDirtyFormsRef.current = hasDirtyForms;
  }, [hasDirtyForms]);

  useEffect(() => {
    isUpdatePendingRef.current = isUpdatePending;
  }, [isUpdatePending]);

  const tryApplyPendingUpdate = useCallback(() => {
    cancelDialogWaitRef.current?.();
    cancelDialogWaitRef.current = null;

    if (!isUpdatePendingRef.current || updateTriggeredRef.current) {
      return;
    }

    if (hasDirtyFormsRef.current) {
      return;
    }

    if (hasBlockingDialogOpen()) {
      cancelDialogWaitRef.current = waitForBlockingDialogsToClose(() => {
        tryApplyPendingUpdate();
      });
      return;
    }

    updateTriggeredRef.current = true;
    setIsUpdatePending(false);
    triggerAppUpdate();
  }, []);

  useEffect(() => {
    tryApplyPendingUpdate();

    return () => {
      cancelDialogWaitRef.current?.();
      cancelDialogWaitRef.current = null;
    };
  }, [hasDirtyForms, isUpdatePending, tryApplyPendingUpdate]);

  const requestSilentAppUpdate = useCallback(() => {
    setIsUpdatePending((current) => current || !updateTriggeredRef.current);
  }, []);

  const setDirtyFormState = useCallback((formId: string, isDirty: boolean) => {
    setDirtyForms((current) => {
      if (current[formId] === isDirty) {
        return current;
      }

      return {
        ...current,
        [formId]: isDirty,
      };
    });
  }, []);

  const clearDirtyFormState = useCallback((formId: string) => {
    setDirtyForms((current) => {
      if (!(formId in current)) {
        return current;
      }

      const { [formId]: _removed, ...next } = current;
      return next;
    });
  }, []);

  const value = useMemo<AppUpdateContextValue>(
    () => ({
      hasDirtyForms,
      isUpdatePending,
      requestSilentAppUpdate,
      setDirtyFormState,
      clearDirtyFormState,
    }),
    [
      clearDirtyFormState,
      hasDirtyForms,
      isUpdatePending,
      requestSilentAppUpdate,
      setDirtyFormState,
    ],
  );

  return <AppUpdateContext.Provider value={value}>{children}</AppUpdateContext.Provider>;
}
