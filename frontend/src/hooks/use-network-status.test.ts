import { describe, it, expect, vi, beforeEach } from "vite-plus/test";
import { renderHook } from "@testing-library/react";

describe("useNetworkStatus", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns true when online", async () => {
    const { onlineManager } = await import("@tanstack/react-query");
    vi.spyOn(onlineManager, "isOnline").mockReturnValue(true);

    const { useNetworkStatus } = await import("./use-network-status");
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current).toBe(true);
  });

  it("returns false when offline", async () => {
    const { onlineManager } = await import("@tanstack/react-query");
    vi.spyOn(onlineManager, "isOnline").mockReturnValue(false);

    const { useNetworkStatus } = await import("./use-network-status");
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current).toBe(false);
  });
});
