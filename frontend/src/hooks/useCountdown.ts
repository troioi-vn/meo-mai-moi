import { useState, useEffect, useCallback, useRef } from "react";

interface UseCountdownResult {
  remainingSeconds: number;
  isExpired: boolean;
  formatted: string;
}

export const useCountdown = (expiresAt: string, onExpired?: () => void): UseCountdownResult => {
  const calcRemaining = useCallback(() => {
    const expiresAtMs = new Date(expiresAt).getTime();
    if (Number.isNaN(expiresAtMs)) {
      return 0;
    }

    const diff = expiresAtMs - Date.now();
    return Math.max(0, Math.floor(diff / 1000));
  }, [expiresAt]);

  const [remainingSeconds, setRemainingSeconds] = useState(() => calcRemaining());
  const onExpiredRef = useRef(onExpired);
  const expiredAtRef = useRef<string | null>(null);

  useEffect(() => {
    onExpiredRef.current = onExpired;
  }, [onExpired]);

  useEffect(() => {
    const notifyExpired = (remaining: number) => {
      if (remaining > 0) {
        expiredAtRef.current = null;
        return false;
      }

      if (expiredAtRef.current === expiresAt) {
        return true;
      }

      expiredAtRef.current = expiresAt;
      onExpiredRef.current?.();

      return true;
    };

    const initialRemaining = calcRemaining();
    setRemainingSeconds(initialRemaining);

    if (notifyExpired(initialRemaining)) {
      return;
    }

    const interval = setInterval(() => {
      const remaining = calcRemaining();
      setRemainingSeconds(remaining);

      if (notifyExpired(remaining)) {
        clearInterval(interval);
      }
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [calcRemaining]);

  const isExpired = remainingSeconds <= 0;
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return { remainingSeconds, isExpired, formatted };
};
