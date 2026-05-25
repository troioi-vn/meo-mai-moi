import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vite-plus/test";
import { toast } from "sonner";
import type { ReactNode } from "react";

vi.mock("@/api/axios", () => ({
  setVersionMismatchHandler: vi.fn(),
}));

vi.mock("@/pwa", () => ({
  triggerAppUpdate: vi.fn(),
}));

import { useVersionCheck } from "./use-version-check";
import { setVersionMismatchHandler } from "@/api/axios";
import { triggerAppUpdate } from "@/pwa";
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

describe("useVersionCheck", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers and unregisters the mismatch handler", () => {
    const { unmount } = renderHook(
      () => {
        useVersionCheck();
      },
      { wrapper: TestWrapper },
    );

    expect(setVersionMismatchHandler).toHaveBeenCalledWith(expect.any(Function));

    unmount();

    expect(setVersionMismatchHandler).toHaveBeenCalledWith(null);
  });

  it("silently triggers the app update when version mismatch fires and reload is safe", async () => {
    renderHook(
      () => {
        useVersionCheck();
      },
      { wrapper: TestWrapper },
    );

    const handler = vi.mocked(setVersionMismatchHandler).mock.calls[0]?.[0];
    expect(handler).toBeTypeOf("function");
    if (typeof handler !== "function") throw new Error("Version mismatch handler not registered");

    act(() => {
      handler();
    });

    await vi.waitFor(() => {
      expect(triggerAppUpdate).toHaveBeenCalledTimes(1);
    });

    expect(toast).not.toHaveBeenCalled();
  });

  it("waits until dialogs close before silently applying the pending update", async () => {
    renderHook(
      () => {
        useVersionCheck();
      },
      { wrapper: TestWrapper },
    );

    const handler = vi.mocked(setVersionMismatchHandler).mock.calls[0]?.[0];
    expect(handler).toBeTypeOf("function");
    if (typeof handler !== "function") throw new Error("Version mismatch handler not registered");

    const overlay = appendBlockingDialogOverlay();

    act(() => {
      handler();
    });

    expect(triggerAppUpdate).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();

    act(() => {
      overlay.remove();
    });

    await vi.waitFor(() => {
      expect(triggerAppUpdate).toHaveBeenCalledTimes(1);
    });
  });
});
