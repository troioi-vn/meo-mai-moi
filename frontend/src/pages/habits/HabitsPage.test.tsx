import { renderWithRouter, screen, waitFor } from "@/testing";
import { describe, it, expect, beforeEach, vi } from "vite-plus/test";
import HabitsPage from "./HabitsPage";
import { format } from "date-fns";

const todayKey = format(new Date(), "yyyy-MM-dd");
const habitsDayApi = vi.hoisted(() => ({
  getHabitDayEntries: vi.fn(),
  putHabitDayEntries: vi.fn(),
}));

const defaultMockHabit = {
  id: 1,
  name: "Yoga / Activities",
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
};
const mockHabit = { ...defaultMockHabit };

const mockHeatmapByHabitId: Record<number, unknown[]> = {
  1: [
    {
      date: todayKey,
      entry_count: 1,
      average_value: 10,
      normalized_intensity: 1,
    },
  ],
};

vi.mock("@/api/habits-day", () => ({
  getHabitDayEntries: habitsDayApi.getHabitDayEntries,
  putHabitDayEntries: habitsDayApi.putHabitDayEntries,
}));

vi.mock("@/api/generated/habits/habits", () => ({
  getGetHabitsQueryKey: () => ["/habits"],
  getGetHabitsHabitHeatmapQueryKey: (habitId: number, params?: unknown) => [
    `/habits/${String(habitId)}/heatmap`,
    params,
  ],
  getGetHabitsHabitHeatmapQueryOptions: (habitId: number) => ({
    queryKey: [`/habits/${String(habitId)}/heatmap`],
    queryFn: async () => mockHeatmapByHabitId[habitId] ?? [],
  }),
  useGetHabits: () => ({
    data: [mockHabit],
    isLoading: false,
  }),
  usePostHabits: () => ({
    mutateAsync: vi.fn(),
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

describe("HabitsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(mockHabit, defaultMockHabit, {
      pets: [{ id: 101, name: "Tets" }],
    });
    habitsDayApi.getHabitDayEntries.mockResolvedValue({
      habit: mockHabit,
      date: todayKey,
      entries: [{ pet_id: 101, pet_name: "Tets", value_int: 10, is_current_pet: true }],
    });
    habitsDayApi.putHabitDayEntries.mockResolvedValue({
      habit: mockHabit,
      date: todayKey,
      entries: [{ pet_id: 101, value_int: 10 }],
    });
  });

  it("renders the recent activity board and keeps the habit name as a detail link", async () => {
    renderWithRouter(<HabitsPage />, {
      route: "/habits",
    });

    expect(screen.getByRole("heading", { name: "Habits", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Active habits", level: 2 })).toBeInTheDocument();

    const habitLink = await screen.findByRole("link", { name: "Yoga / Activities" });
    expect(habitLink).toHaveAttribute("href", "/habits/1");

    expect(await screen.findByText("10")).toBeInTheDocument();
  });

  it("opens the tracking modal when a recent day cell is clicked", async () => {
    const { user } = renderWithRouter(<HabitsPage />, {
      route: "/habits",
    });

    await user.click(await screen.findByRole("button", { name: todayKey }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(await screen.findByText("Tets")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save day" }));

    await waitFor(() => {
      expect(habitsDayApi.putHabitDayEntries).toHaveBeenCalledWith(1, todayKey, {
        entries: [{ pet_id: 101, value_int: 10 }],
      });
    });
  });

  it("disables recent day tracking when a habit has no current pets", async () => {
    Object.assign(mockHabit, {
      pet_count: 0,
      pets: [],
    });

    const { user } = renderWithRouter(<HabitsPage />, {
      route: "/habits",
    });

    const todayButton = await screen.findByRole("button", { name: todayKey });

    expect(todayButton).toBeDisabled();
    await user.click(todayButton);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(habitsDayApi.getHabitDayEntries).not.toHaveBeenCalled();
  });
});
