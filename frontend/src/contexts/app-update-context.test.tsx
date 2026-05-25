import { act, render, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vite-plus/test";
import type { ReactNode } from "react";

vi.mock("@/pwa", () => ({
  triggerAppUpdate: vi.fn(),
}));

import { AppUpdateProvider } from "@/contexts/app-update-context";
import { useDirtyFormState, useSilentAppUpdate } from "@/hooks/use-app-update";
import { triggerAppUpdate } from "@/pwa";

function TestWrapper({ children }: { children: ReactNode }) {
  return <AppUpdateProvider>{children}</AppUpdateProvider>;
}

function DirtyFormProbe({ isDirty }: { isDirty: boolean }) {
  useDirtyFormState(isDirty);
  return null;
}

describe("AppUpdateProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("applies a pending update immediately when the app is safe to reload", async () => {
    const { result } = renderHook(() => useSilentAppUpdate(), { wrapper: TestWrapper });

    act(() => {
      result.current.requestSilentAppUpdate();
    });

    await waitFor(() => {
      expect(triggerAppUpdate).toHaveBeenCalledTimes(1);
    });
  });

  it("keeps a pending update blocked while any registered form is dirty, then retries automatically", async () => {
    const { result, rerender } = renderHook(
      ({ isDirty }) => {
        useDirtyFormState(isDirty);
        return useSilentAppUpdate();
      },
      {
        initialProps: { isDirty: true },
        wrapper: TestWrapper,
      },
    );

    act(() => {
      result.current.requestSilentAppUpdate();
    });

    expect(triggerAppUpdate).not.toHaveBeenCalled();

    rerender({ isDirty: false });

    await waitFor(() => {
      expect(triggerAppUpdate).toHaveBeenCalledTimes(1);
    });
  });

  it("retries a pending update after the last dirty form unmounts", async () => {
    let requestSilentAppUpdate: (() => void) | null = null;

    function Controller() {
      requestSilentAppUpdate = useSilentAppUpdate().requestSilentAppUpdate;
      return null;
    }

    function Harness({ showDirtyForm }: { showDirtyForm: boolean }) {
      return (
        <AppUpdateProvider>
          <Controller />
          {showDirtyForm ? <DirtyFormProbe isDirty={true} /> : null}
        </AppUpdateProvider>
      );
    }

    const { rerender } = render(<Harness showDirtyForm={true} />);

    act(() => {
      requestSilentAppUpdate?.();
    });

    expect(triggerAppUpdate).not.toHaveBeenCalled();

    rerender(<Harness showDirtyForm={false} />);

    await waitFor(() => {
      expect(triggerAppUpdate).toHaveBeenCalledTimes(1);
    });
  });

  it("waits for blocking dialogs to close before applying a pending update", async () => {
    const overlay = document.createElement("div");
    overlay.setAttribute("data-slot", "dialog-overlay");
    document.body.appendChild(overlay);

    const { result } = renderHook(() => useSilentAppUpdate(), { wrapper: TestWrapper });

    act(() => {
      result.current.requestSilentAppUpdate();
    });

    expect(triggerAppUpdate).not.toHaveBeenCalled();

    act(() => {
      overlay.remove();
    });

    await waitFor(() => {
      expect(triggerAppUpdate).toHaveBeenCalledTimes(1);
    });
  });
});
