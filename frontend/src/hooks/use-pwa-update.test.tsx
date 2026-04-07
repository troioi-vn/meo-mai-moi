import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vite-plus/test";

// Mock PWA functions (hoisted before importing the hook so the hook sees the mock)
vi.mock("@/pwa", () => ({
  setNeedsRefreshCallback: vi.fn(),
  triggerAppUpdate: vi.fn(),
}));

import { usePwaUpdate } from "./use-pwa-update";
import { toast } from "sonner";
import { setNeedsRefreshCallback, triggerAppUpdate } from "@/pwa";
import type { Action } from "sonner";

const createToastClickEvent = () =>
  new MouseEvent("click") as unknown as React.MouseEvent<HTMLButtonElement>;

describe("usePwaUpdate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers and unregisters callback", () => {
    const { unmount } = renderHook(() => usePwaUpdate());

    expect(setNeedsRefreshCallback).toHaveBeenCalledWith(expect.any(Function));

    unmount();

    expect(setNeedsRefreshCallback).toHaveBeenCalledWith(null);
  });

  it("shows toast when callback fires and handles update action", async () => {
    const { result } = renderHook(() => usePwaUpdate());

    // Get the callback that was registered
    const callback = vi.mocked(setNeedsRefreshCallback).mock.calls[0]?.[0];
    expect(callback).toBeTypeOf("function");
    if (typeof callback !== "function") throw new Error("Refresh callback not registered");

    // Simulate SW detecting update
    act(() => {
      callback();
    });

    // Wait for toast to be called (i18n resolves keys to English strings in test env)
    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith("New version available!", {
        description: "Click Update to get the latest features.",
        duration: Infinity,
        action: {
          label: "Update",
          onClick: expect.any(Function),
        },
        cancel: {
          label: "Later",
          onClick: expect.any(Function),
        },
      });
    });

    // Get the toast options
    const toastCall = vi.mocked(toast).mock.calls[0];
    expect(toastCall).toBeDefined();
    if (!toastCall) throw new Error("Toast was not called");
    const options = toastCall[1];
    expect(options).toBeDefined();
    if (!options || typeof options !== "object") throw new Error("Toast options missing");
    const action = options.action as Action | undefined;
    const cancel = options.cancel as Action | undefined;
    if (!action?.onClick || !cancel?.onClick) throw new Error("Toast actions missing");

    // Simulate clicking Update
    act(() => {
      action.onClick(createToastClickEvent());
    });

    expect(triggerAppUpdate).toHaveBeenCalled();

    // Simulate clicking Later
    act(() => {
      cancel.onClick(createToastClickEvent());
    });

    expect(result.current.updateAvailable).toBe(false);
  });
});
