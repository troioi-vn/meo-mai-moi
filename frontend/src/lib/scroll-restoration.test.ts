import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { consumeListScrollPosition, saveListScrollPosition } from "./scroll-restoration";

describe("scroll-restoration", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("saves and consumes scroll for supported list paths", () => {
    vi.spyOn(window, "scrollY", "get").mockReturnValue(420);

    saveListScrollPosition("/");

    expect(consumeListScrollPosition("/")).toBe(420);
    expect(consumeListScrollPosition("/")).toBeNull();
  });

  it("ignores unsupported paths", () => {
    vi.spyOn(window, "scrollY", "get").mockReturnValue(123);

    saveListScrollPosition("/pets/1");

    expect(consumeListScrollPosition("/pets/1")).toBeNull();
    expect(consumeListScrollPosition("/")).toBeNull();
  });
});
