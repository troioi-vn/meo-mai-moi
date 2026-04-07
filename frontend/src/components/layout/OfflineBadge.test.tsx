import { describe, it, expect, vi, beforeEach } from "vite-plus/test";
import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";

// Mock use-network-status at module level
const mockUseNetworkStatus = vi.fn();
vi.mock("@/hooks/use-network-status", () => ({
  useNetworkStatus: () => mockUseNetworkStatus(),
}));
const mockUsePendingMutationsCount = vi.fn();
vi.mock("@/hooks/use-pending-mutations", () => ({
  usePendingMutationsCount: () => mockUsePendingMutationsCount(),
}));

import { OfflineBadge } from "./OfflineBadge";

function renderBadge() {
  return render(
    <I18nextProvider i18n={i18n}>
      <OfflineBadge />
    </I18nextProvider>,
  );
}

describe("OfflineBadge", () => {
  beforeEach(() => {
    mockUseNetworkStatus.mockReset();
    mockUsePendingMutationsCount.mockReset();
    mockUsePendingMutationsCount.mockReturnValue(0);
  });

  it("renders badge when offline", () => {
    mockUseNetworkStatus.mockReturnValue(false);
    const { container } = renderBadge();
    expect(container.firstChild).not.toBeNull();
    expect(screen.queryByText("Offline")).not.toBeInTheDocument();
  });

  it("renders nothing when online", () => {
    mockUseNetworkStatus.mockReturnValue(true);
    const { container } = renderBadge();
    expect(container.firstChild).toBeNull();
  });

  it("renders syncing state while online with pending mutations", () => {
    mockUseNetworkStatus.mockReturnValue(true);
    mockUsePendingMutationsCount.mockReturnValue(2);

    renderBadge();

    expect(screen.getByText(/sync/i)).toBeInTheDocument();
  });
});
