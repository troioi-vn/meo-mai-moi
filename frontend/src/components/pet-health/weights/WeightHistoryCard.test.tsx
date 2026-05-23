import { render, screen, waitFor, userEvent } from "@/testing";
import { describe, it, expect, beforeEach, vi } from "vite-plus/test";
import { WeightHistoryCard } from "./WeightHistoryCard";
import { server } from "@/testing/mocks/server";
import { http, HttpResponse } from "msw";
import type { WeightHistory } from "@/api/generated/model";

// Mock ResizeObserver for recharts
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverMock;

const weightChartSpy = vi.fn<(weights: WeightHistory[]) => void>();

vi.mock("./WeightChart", () => ({
  WeightChart: ({ weights }: { weights: WeightHistory[] }) => {
    weightChartSpy(weights);
    return weights.length === 0 ? (
      <div>No weight records yet.</div>
    ) : (
      <div data-testid="weight-chart" />
    );
  },
}));

const mockWeights = [
  {
    id: 1,
    pet_id: 1,
    weight_kg: 5.0,
    record_date: "2024-01-15",
    created_at: "2024-01-15T00:00:00Z",
    updated_at: "2024-01-15T00:00:00Z",
  },
  {
    id: 2,
    pet_id: 1,
    weight_kg: 5.5,
    record_date: "2024-03-15",
    created_at: "2024-03-15T00:00:00Z",
    updated_at: "2024-03-15T00:00:00Z",
  },
];

function dateDaysAgo(daysAgo: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);

  return date.toISOString().slice(0, 10);
}

describe("WeightHistoryCard", () => {
  beforeEach(() => {
    localStorage.clear();
    weightChartSpy.mockClear();
    server.use(
      http.get("http://localhost:3000/api/pets/:petId/weights", () => {
        return HttpResponse.json({
          data: { data: mockWeights, links: {}, meta: {} },
        });
      }),
    );
  });

  it("renders loading state initially", () => {
    render(<WeightHistoryCard petId={1} canEdit={true} />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders weight history title", async () => {
    render(<WeightHistoryCard petId={1} canEdit={true} />);
    await waitFor(() => {
      expect(screen.getByText("Weight History")).toBeInTheDocument();
    });
  });

  it("shows add button when canEdit is true", async () => {
    render(<WeightHistoryCard petId={1} canEdit={true} />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /add new weight entry/i })).toBeInTheDocument();
    });
  });

  it("hides add button when canEdit is false", async () => {
    render(<WeightHistoryCard petId={1} canEdit={false} />);
    await waitFor(() => {
      expect(screen.getByText("Weight History")).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /add new weight entry/i })).not.toBeInTheDocument();
  });

  it("shows form when add button is clicked", async () => {
    const user = userEvent.setup();
    render(<WeightHistoryCard petId={1} canEdit={true} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /add new weight entry/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /add new weight entry/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    });
  });

  it("shows empty state when no weights", async () => {
    server.use(
      http.get("http://localhost:3000/api/pets/:petId/weights", () => {
        return HttpResponse.json({
          data: { data: [], links: {}, meta: {} },
        });
      }),
    );

    render(<WeightHistoryCard petId={1} canEdit={true} />);
    await waitFor(() => {
      expect(screen.getByText("No weight records yet.")).toBeInTheDocument();
    });
  });

  it("renders the range selector and defaults to ALL", async () => {
    render(<WeightHistoryCard petId={1} canEdit={true} />);

    expect(await screen.findByRole("tablist", { name: "Range" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "ALL" })).toHaveAttribute("aria-selected", "true");
    expect(weightChartSpy).toHaveBeenLastCalledWith([
      expect.objectContaining({ id: 1, record_date: "2024-01-15" }),
      expect.objectContaining({ id: 2, record_date: "2024-03-15" }),
    ]);
  });

  it("filters chart data by selected range and persists the selection", async () => {
    const user = userEvent.setup();
    const recentDate = dateDaysAgo(30);
    const olderDate = dateDaysAgo(100);
    const oldDate = dateDaysAgo(400);

    server.use(
      http.get("http://localhost:3000/api/pets/:petId/weights", () => {
        return HttpResponse.json({
          data: {
            data: [
              {
                id: 1,
                pet_id: 1,
                weight_kg: 4.8,
                record_date: recentDate,
                created_at: `${recentDate}T00:00:00Z`,
                updated_at: `${recentDate}T00:00:00Z`,
              },
              {
                id: 2,
                pet_id: 1,
                weight_kg: 4.9,
                record_date: olderDate,
                created_at: `${olderDate}T00:00:00Z`,
                updated_at: `${olderDate}T00:00:00Z`,
              },
              {
                id: 3,
                pet_id: 1,
                weight_kg: 5.1,
                record_date: oldDate,
                created_at: `${oldDate}T00:00:00Z`,
                updated_at: `${oldDate}T00:00:00Z`,
              },
            ],
            links: {},
            meta: {},
          },
        });
      }),
    );

    render(<WeightHistoryCard petId={1} canEdit={true} />);
    await screen.findByTestId("weight-chart");

    await user.click(screen.getByRole("tab", { name: "3M" }));

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "3M" })).toHaveAttribute("aria-selected", "true");
    });

    expect(localStorage.getItem("pet-weight-history-range")).toBe("3m");
    expect(weightChartSpy).toHaveBeenLastCalledWith([
      expect.objectContaining({ id: 1, record_date: recentDate }),
    ]);
  });

  it("uses the stored range on initial render", async () => {
    localStorage.setItem("pet-weight-history-range", "1m");
    const recentDate = dateDaysAgo(10);
    const alsoRecentDate = dateDaysAgo(25);

    server.use(
      http.get("http://localhost:3000/api/pets/:petId/weights", () => {
        return HttpResponse.json({
          data: {
            data: [
              {
                id: 1,
                pet_id: 1,
                weight_kg: 4.8,
                record_date: alsoRecentDate,
                created_at: `${alsoRecentDate}T00:00:00Z`,
                updated_at: `${alsoRecentDate}T00:00:00Z`,
              },
              {
                id: 2,
                pet_id: 1,
                weight_kg: 4.9,
                record_date: recentDate,
                created_at: `${recentDate}T00:00:00Z`,
                updated_at: `${recentDate}T00:00:00Z`,
              },
            ],
            links: {},
            meta: {},
          },
        });
      }),
    );

    render(<WeightHistoryCard petId={1} canEdit={true} />);

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "1M" })).toHaveAttribute("aria-selected", "true");
    });

    expect(weightChartSpy).toHaveBeenLastCalledWith([
      expect.objectContaining({ id: 1, record_date: alsoRecentDate }),
      expect.objectContaining({ id: 2, record_date: recentDate }),
    ]);
  });
});
