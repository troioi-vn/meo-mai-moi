import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vite-plus/test";
import type { ReactNode } from "react";

// Mock PWA functions (hoisted before importing the hook so the hook sees the mock)
vi.mock("@/pwa", () => ({
  setNeedsRefreshCallback: vi.fn(),
  triggerAppUpdate: vi.fn(),
}));

import { usePwaUpdate } from "./use-pwa-update";
import { toast } from "sonner";
import { setNeedsRefreshCallback, triggerAppUpdate } from "@/pwa";
import { AppUpdateProvider } from "@/contexts/app-update-context";

function TestWrapper({ children }: { children: ReactNode }) {
  return <AppUpdateProvider>{children}</AppUpdateProvider>;
}

function appendBlockingDialogOverlay() {
  const overlay = document.createElement("div");
  overlay.setAttribute("data-slot", "dialog-overlay");
  document.body.appendChild(overlay);
  return overlay;
}

describe("usePwaUpdate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers and unregisters callback", () => {
    const { unmount } = renderHook(
      () => {
        usePwaUpdate();
      },
      { wrapper: TestWrapper },
    );

    expect(setNeedsRefreshCallback).toHaveBeenCalledWith(expect.any(Function));

    unmount();

    expect(setNeedsRefreshCallback).toHaveBeenCalledWith(null);
  });

  it("silently triggers the app update when the service worker signals a refresh", async () => {
    renderHook(
      () => {
        usePwaUpdate();
      },
      { wrapper: TestWrapper },
    );

    // Get the callback that was registered
    const callback = vi.mocked(setNeedsRefreshCallback).mock.calls[0]?.[0];
    expect(callback).toBeTypeOf("function");
    if (typeof callback !== "function") throw new Error("Refresh callback not registered");

    // Simulate SW detecting update
    act(() => {
      callback();
    });

    await waitFor(() => {
      expect(triggerAppUpdate).toHaveBeenCalledTimes(1);
    });

    expect(toast).not.toHaveBeenCalled();
  });

  it("waits until dialogs close before silently applying the pending update", async () => {
    renderHook(
      () => {
        usePwaUpdate();
      },
      { wrapper: TestWrapper },
    );

    const callback = vi.mocked(setNeedsRefreshCallback).mock.calls[0]?.[0];
    expect(callback).toBeTypeOf("function");
    if (typeof callback !== "function") throw new Error("Refresh callback not registered");

    const overlay = appendBlockingDialogOverlay();

    act(() => {
      callback();
    });

    expect(triggerAppUpdate).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();

    act(() => {
      overlay.remove();
    });

    await waitFor(() => {
      expect(triggerAppUpdate).toHaveBeenCalledTimes(1);
    });
  });
});
