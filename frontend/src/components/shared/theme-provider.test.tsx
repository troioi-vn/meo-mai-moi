import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vite-plus/test";
import { ThemeProvider } from "./theme-provider";
import { useTheme } from "@/hooks/use-theme";

const createMatchMedia = (
  matcher: (query: string) => boolean = () => false,
  onListener?: (listener: (event: MediaQueryListEvent) => void) => void,
) =>
  ((query: string) =>
    ({
      matches: matcher(query),
      media: query,
      onchange: null,
      addListener: vi.fn((listener: (event: MediaQueryListEvent) => void) => {
        onListener?.(listener);
      }),
      removeListener: vi.fn(),
      addEventListener: vi.fn(
        (
          _type: string,
          listener: EventListenerOrEventListenerObject,
          _options?: boolean | AddEventListenerOptions,
        ) => {
          if (typeof listener === "function") {
            onListener?.(listener as (event: MediaQueryListEvent) => void);
          }
        },
      ),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }) as MediaQueryList) satisfies typeof window.matchMedia;

function ThemeControls() {
  const { setTheme } = useTheme();

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setTheme("light");
        }}
      >
        Set Light
      </button>
      <button
        type="button"
        onClick={() => {
          setTheme("dark");
        }}
      >
        Set Dark
      </button>
      <button
        type="button"
        onClick={() => {
          setTheme("system");
        }}
      >
        Set System
      </button>
    </>
  );
}

describe("ThemeProvider", () => {
  const localStorageKey = "test-theme";
  const mockChildren = <div data-testid="children">Test Children</div>;
  let systemThemeListener: ((event: MediaQueryListEvent) => void) | null = null;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("light", "dark");
    delete document.documentElement.dataset.theme;
    delete document.documentElement.dataset.themePreference;
    document.documentElement.style.colorScheme = "";
    document.body.dataset.theme = "";
    document.body.style.colorScheme = "";
    document.head.innerHTML = `
      <link rel="manifest" id="app-manifest" href="/site-light.webmanifest?v=${import.meta.env.VITE_APP_VERSION || "dev"}" />
      <meta name="theme-color" content="#ffffff" />
      <meta name="color-scheme" content="light" />
    `;

    vi.spyOn(window, "matchMedia").mockImplementation(
      createMatchMedia(
        () => false,
        (listener) => {
          systemThemeListener = listener;
        },
      ),
    );
  });

  afterEach(() => {
    systemThemeListener = null;
    vi.restoreAllMocks();
  });

  it("loads default theme if no theme is stored in localStorage", async () => {
    render(
      <ThemeProvider defaultTheme="light" storageKey={localStorageKey}>
        {mockChildren}
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement).toHaveClass("light");
    });

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.dataset.themePreference).toBe("light");
    expect(document.documentElement.style.colorScheme).toBe("light");
  });

  it("loads stored theme from localStorage", async () => {
    localStorage.setItem(localStorageKey, "dark");
    render(
      <ThemeProvider defaultTheme="light" storageKey={localStorageKey}>
        {mockChildren}
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement).toHaveClass("dark");
    });

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.dataset.themePreference).toBe("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });

  it("switches theme to light", async () => {
    render(
      <ThemeProvider defaultTheme="dark" storageKey={localStorageKey}>
        <ThemeControls />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByText("Set Light"));

    await waitFor(() => {
      expect(document.documentElement).toHaveClass("light");
    });

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.dataset.themePreference).toBe("light");
    expect(document.documentElement.style.colorScheme).toBe("light");
    expect(localStorage.getItem(localStorageKey)).toBe("light");
  });

  it("switches theme to dark", async () => {
    render(
      <ThemeProvider defaultTheme="light" storageKey={localStorageKey}>
        <ThemeControls />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByText("Set Dark"));

    await waitFor(() => {
      expect(document.documentElement).toHaveClass("dark");
    });

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.dataset.themePreference).toBe("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(localStorage.getItem(localStorageKey)).toBe("dark");
  });

  it("exposes saved theme and resolved theme for system mode", async () => {
    vi.spyOn(window, "matchMedia").mockImplementation(
      createMatchMedia(
        (query) => query === "(prefers-color-scheme: dark)",
        (listener) => {
          systemThemeListener = listener;
        },
      ),
    );

    render(
      <ThemeProvider defaultTheme="light" storageKey={localStorageKey}>
        <ThemeControls />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByText("Set System"));

    await waitFor(() => {
      expect(document.documentElement).toHaveClass("dark");
    });

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.dataset.themePreference).toBe("system");
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(localStorage.getItem(localStorageKey)).toBe("system");
  });

  it("updates manifest and meta side effects from the resolved theme", async () => {
    localStorage.setItem(localStorageKey, "dark");

    render(
      <ThemeProvider defaultTheme="light" storageKey={localStorageKey}>
        {mockChildren}
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute(
        "content",
        "#020817",
      );
    });

    expect(document.querySelector('meta[name="color-scheme"]')).toHaveAttribute("content", "dark");
    expect(document.getElementById("app-manifest")).toHaveAttribute(
      "href",
      "/site-dark.webmanifest?v=" + (import.meta.env.VITE_APP_VERSION || "dev"),
    );
    expect(document.body.dataset.theme).toBe("dark");
    expect(document.body.style.colorScheme).toBe("dark");
  });

  it("does not require a color-scheme meta tag to switch themes", async () => {
    document.querySelector('meta[name="color-scheme"]')?.remove();

    render(
      <ThemeProvider defaultTheme="light" storageKey={localStorageKey}>
        <ThemeControls />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByText("Set Dark"));

    await waitFor(() => {
      expect(document.documentElement).toHaveClass("dark");
    });

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });

  it("reacts to system theme changes while saved theme is system", async () => {
    localStorage.setItem(localStorageKey, "system");
    let prefersDark = false;

    vi.spyOn(window, "matchMedia").mockImplementation(
      createMatchMedia(
        (query) => prefersDark && query === "(prefers-color-scheme: dark)",
        (listener) => {
          systemThemeListener = listener;
        },
      ),
    );

    render(
      <ThemeProvider defaultTheme="light" storageKey={localStorageKey}>
        {mockChildren}
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe("light");
    });

    prefersDark = true;
    systemThemeListener?.({ matches: true } as MediaQueryListEvent);

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe("dark");
    });
  });

  it("reacts to theme changes from storage events", async () => {
    render(
      <ThemeProvider defaultTheme="light" storageKey={localStorageKey}>
        {mockChildren}
      </ThemeProvider>,
    );

    localStorage.setItem(localStorageKey, "dark");
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: localStorageKey,
        newValue: "dark",
      }),
    );

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe("dark");
    });
  });

  it("renders children", () => {
    render(
      <ThemeProvider defaultTheme="light" storageKey={localStorageKey}>
        {mockChildren}
      </ThemeProvider>,
    );
    expect(screen.getByTestId("children")).toBeInTheDocument();
  });
});
