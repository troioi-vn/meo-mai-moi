const BLOCKING_DIALOG_OVERLAY_SELECTOR = [
  '[data-slot="dialog-overlay"]',
  '[data-slot="alert-dialog-overlay"]',
].join(", ");

export function hasBlockingDialogOpen() {
  if (typeof document === "undefined") {
    return false;
  }

  return document.querySelector(BLOCKING_DIALOG_OVERLAY_SELECTOR) !== null;
}

export function waitForBlockingDialogsToClose(onClear: () => void) {
  if (typeof document === "undefined" || typeof MutationObserver === "undefined") {
    onClear();
    return () => {};
  }

  if (!hasBlockingDialogOpen()) {
    onClear();
    return () => {};
  }

  const observer = new MutationObserver(() => {
    if (hasBlockingDialogOpen()) {
      return;
    }

    observer.disconnect();
    onClear();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["data-state"],
  });

  return () => {
    observer.disconnect();
  };
}
