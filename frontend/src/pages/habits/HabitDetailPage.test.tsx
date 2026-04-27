import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, afterEach, vi } from "vite-plus/test";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { AllTheProviders } from "@/testing/providers";
import HabitDetailPage from "./HabitDetailPage";

const habitsDayApi = vi.hoisted(() => ({
  getHabitDayEntries: vi.fn(),
  putHabitDayEntries: vi.fn(),
}));

const habitMutations = vi.hoisted(() => ({
  updateHabit: vi.fn(),
  archiveHabit: vi.fn(),
  restoreHabit: vi.fn(),
  deleteHabit: vi.fn(),
}));

const habitQueries = vi.hoisted(() => ({
  useGetHabitsHabitHeatmap: vi.fn(),
}));

const defaultMockHabit = {
  id: 1,
  name: "test",
  value_type: "integer_scale",
  scale_min: 1,
  scale_max: 10,
  pet_count: 1,
  share_with_coowners: false,
  reminder_enabled: false,
  reminder_time: null,
  reminder_weekdays: [],
  archived_at: null,
  pets: [{ id: 101, name: "Tets" }],
  capabilities: {
    can_edit: true,
    can_archive: true,
    can_delete: true,
  },
};
const mockHabit = { ...defaultMockHabit };

vi.mock("@/api/habits-day", () => ({
  getHabitDayEntries: habitsDayApi.getHabitDayEntries,
  putHabitDayEntries: habitsDayApi.putHabitDayEntries,
}));

vi.mock("@/api/generated/habits/habits", () => ({
  getGetHabitsQueryKey: () => ["/habits"],
  getGetHabitsHabitQueryKey: (habitId: number) => [`/habits/${String(habitId)}`],
  getGetHabitsHabitHeatmapQueryKey: (habitId: number, params?: unknown) => [
    `/habits/${String(habitId)}/heatmap`,
    params,
  ],
  useGetHabitsHabit: () => ({
    data: mockHabit,
    isLoading: false,
  }),
  useGetHabitsHabitHeatmap: habitQueries.useGetHabitsHabitHeatmap,
  usePutHabitsHabit: () => ({
    mutateAsync: habitMutations.updateHabit,
    isPending: false,
  }),
  usePostHabitsHabitArchive: () => ({
    mutateAsync: habitMutations.archiveHabit,
    isPending: false,
  }),
  usePostHabitsHabitRestore: () => ({
    mutateAsync: habitMutations.restoreHabit,
    isPending: false,
  }),
  useDeleteHabitsHabit: () => ({
    mutateAsync: habitMutations.deleteHabit,
    isPending: false,
  }),
}));

vi.mock("@/api/generated/pets/pets", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/generated/pets/pets")>();

  return {
    ...actual,
    useGetMyPetsSections: () => ({
      data: {
        owned: [{ id: 101, name: "Tets", photo_url: null }],
      },
    }),
  };
});

function LocationDisplay() {
  const location = useLocation();

  return <div data-testid="location-display">{location.pathname}</div>;
}

function renderHabitDetail(initialEntry = "/habits/1") {
  return {
    user: userEvent.setup(),
    ...render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <AllTheProviders initialAuthState={{ isAuthenticated: true, isLoading: false }}>
          <Routes>
            <Route
              path="/habits/:id"
              element={
                <>
                  <HabitDetailPage />
                  <LocationDisplay />
                </>
              }
            />
            <Route
              path="/habits/:id/edit"
              element={
                <>
                  <HabitDetailPage />
                  <LocationDisplay />
                </>
              }
            />
          </Routes>
        </AllTheProviders>
      </MemoryRouter>,
    ),
  };
}

describe("HabitDetailPage", () => {
  const originalOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth");
  const originalClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientWidth");
  const originalGetBoundingClientRect = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    "getBoundingClientRect",
  );

  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(mockHabit, defaultMockHabit, {
      pets: [{ id: 101, name: "Tets" }],
      capabilities: {
        can_edit: true,
        can_archive: true,
        can_delete: true,
      },
    });
    habitQueries.useGetHabitsHabitHeatmap.mockReturnValue({
      data: [
        {
          date: "2026-04-08",
          entry_count: 1,
          average_value: 10,
          normalized_intensity: 1,
        },
      ],
      isLoading: false,
    });
    habitsDayApi.getHabitDayEntries.mockResolvedValue({
      habit: mockHabit,
      date: "2026-04-08",
      entries: [{ pet_id: 101, pet_name: "Tets", value_int: 10, is_current_pet: true }],
    });
    habitsDayApi.putHabitDayEntries.mockResolvedValue({
      habit: mockHabit,
      date: "2026-04-08",
      entries: [{ pet_id: 101, value_int: 10 }],
    });
    habitMutations.updateHabit.mockResolvedValue(mockHabit);
    habitMutations.archiveHabit.mockResolvedValue(mockHabit);
    habitMutations.restoreHabit.mockResolvedValue(mockHabit);
    habitMutations.deleteHabit.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    if (originalOffsetWidth) {
      Object.defineProperty(HTMLElement.prototype, "offsetWidth", originalOffsetWidth);
    }
    if (originalClientWidth) {
      Object.defineProperty(HTMLElement.prototype, "clientWidth", originalClientWidth);
    }
    if (originalGetBoundingClientRect) {
      Object.defineProperty(
        HTMLElement.prototype,
        "getBoundingClientRect",
        originalGetBoundingClientRect,
      );
    }
  });

  it("renders breadcrumbs, activity help, and details content", async () => {
    const { user } = renderHabitDetail();

    expect(screen.getByRole("link", { name: "Habits" })).toHaveAttribute("href", "/habits");
    expect(screen.getByRole("heading", { name: "test", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("Activity")).toBeInTheDocument();
    expect(screen.getByText("Details")).toBeInTheDocument();
    expect(screen.getByText("Tracking type: Numeric scale (1-10)")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: /each square is one day\. click a day to view or update entries\./i,
      }),
    );

    expect(
      await screen.findByText(/each square is one day\. click a day to view or update entries\./i),
    ).toBeInTheDocument();
  });

  it("opens the day dialog from the track activity button", async () => {
    const { user } = renderHabitDetail();

    await user.click(screen.getByRole("button", { name: "Track activity" }));

    expect(await screen.findByText("Set one value per pet for this date.")).toBeInTheDocument();
    expect(habitsDayApi.getHabitDayEntries).toHaveBeenCalled();
  });

  it("disables the track activity button when the habit has no current pets", async () => {
    Object.assign(mockHabit, {
      pet_count: 0,
      pets: [],
    });

    const { user } = renderHabitDetail();
    const trackButton = screen.getByRole("button", { name: "Track activity" });

    expect(trackButton).toBeDisabled();
    await user.click(trackButton);

    expect(habitsDayApi.getHabitDayEntries).not.toHaveBeenCalled();
  });

  it("requests up to two years of heatmap data and does not render future days", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-10T12:00:00Z"));

    renderHabitDetail();

    expect(habitQueries.useGetHabitsHabitHeatmap).toHaveBeenCalledWith(
      1,
      { end_date: "2026-04-10", weeks: 104 },
      { query: { enabled: true } },
    );
    expect(screen.getByTitle("2026-04-10: No entries")).toBeInTheDocument();
    expect(screen.queryByTitle("2026-04-11: No entries")).not.toBeInTheDocument();
    expect(screen.queryByTitle("2026-04-12: No entries")).not.toBeInTheDocument();
  });

  it("uses softer neutral styling for empty days in light theme", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-10T12:00:00Z"));

    renderHabitDetail();

    const emptyDay = screen.getByTitle("2026-04-10: No entries");

    expect(emptyDay).toHaveClass("border-zinc-200");
    expect(emptyDay).toHaveClass("bg-zinc-100/80");
    expect(emptyDay).toHaveClass("dark:border-zinc-800");
    expect(emptyDay).toHaveClass("dark:bg-zinc-900/80");
  });

  it("falls back to viewport width when container measurement collapses", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-10T12:00:00Z"));

    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 1280,
    });
    Object.defineProperty(document.documentElement, "clientWidth", {
      configurable: true,
      get() {
        return 1280;
      },
    });

    Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
      configurable: true,
      get() {
        return 74;
      },
    });
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get() {
        return 74;
      },
    });
    HTMLElement.prototype.getBoundingClientRect = function () {
      return {
        width: 74,
        height: 100,
        top: 0,
        left: 0,
        right: 74,
        bottom: 100,
        x: 0,
        y: 0,
        toJSON() {
          return {};
        },
      } as DOMRect;
    };

    renderHabitDetail();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(32);
    });

    expect(screen.getByTitle("2026-04-09: No entries")).toBeInTheDocument();
  });

  it("supports the edit deep link and returns to the detail route when the dialog closes", async () => {
    const { user } = renderHabitDetail("/habits/1/edit");

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Edit habit")).toBeInTheDocument();
    expect(screen.getByTestId("location-display")).toHaveTextContent("/habits/1/edit");

    await user.click(screen.getByRole("button", { name: /close/i }));

    await waitFor(() => {
      expect(screen.getByTestId("location-display")).toHaveTextContent("/habits/1");
    });
  });
});
