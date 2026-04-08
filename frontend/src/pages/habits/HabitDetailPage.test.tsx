import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi } from "vite-plus/test";
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

const mockHabit = {
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
  useGetHabitsHabitHeatmap: () => ({
    data: [
      {
        date: "2026-04-08",
        entry_count: 1,
        average_value: 10,
        normalized_intensity: 1,
      },
    ],
    isLoading: false,
  }),
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
  beforeEach(() => {
    vi.clearAllMocks();
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
