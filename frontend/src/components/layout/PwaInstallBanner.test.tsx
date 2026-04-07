import { describe, it, expect, vi } from "vite-plus/test";
import { screen, fireEvent } from "@testing-library/react";
import { render } from "@/testing";
import { PwaInstallBanner } from "./PwaInstallBanner";

describe("PwaInstallBanner", () => {
  it("renders the banner with install and dismiss buttons", () => {
    const onInstall = vi.fn().mockResolvedValue(undefined);
    const onDismiss = vi.fn();

    render(<PwaInstallBanner onInstall={onInstall} onDismiss={onDismiss} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(document.querySelectorAll('button[type="button"]').length).toBeGreaterThanOrEqual(3);
    expect(document.querySelector('button[data-variant="outline"]')).toBeInTheDocument();
    expect(document.querySelector('button[data-variant="default"]')).toBeInTheDocument();
  });

  it("calls onInstall when install button is clicked", () => {
    const onInstall = vi.fn().mockResolvedValue(undefined);
    const onDismiss = vi.fn();

    render(<PwaInstallBanner onInstall={onInstall} onDismiss={onDismiss} />);

    // Find the Install button (not the "Not now" button)
    const installButtons = screen.getAllByRole("button");
    const installBtn = installButtons.find(
      (btn) => btn.textContent === "Install" && btn.getAttribute("data-variant") === "default",
    );
    expect(installBtn).toBeDefined();
    fireEvent.click(installBtn!);
    expect(onInstall).toHaveBeenCalledTimes(1);
  });

  it("calls onDismiss when not now button is clicked", () => {
    const onInstall = vi.fn().mockResolvedValue(undefined);
    const onDismiss = vi.fn();

    render(<PwaInstallBanner onInstall={onInstall} onDismiss={onDismiss} />);

    const dismissBtn = document.querySelector('button[data-variant="outline"]');
    expect(dismissBtn).toBeInTheDocument();
    fireEvent.click(dismissBtn!);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
