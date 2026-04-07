import { describe, it, expect, beforeEach, vi } from "vite-plus/test";
import { screen, waitFor } from "@testing-library/react";
import { renderWithRouter, userEvent } from "@/testing";
import { CitySelect } from "./CitySelect";
import { getCities, postCities } from "@/api/generated/cities/cities";

vi.mock("@/api/generated/cities/cities", () => ({
  getCities: vi.fn(),
  postCities: vi.fn(),
}));

describe("CitySelect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCities).mockResolvedValue([
      { id: 1, name: "Hanoi", country: "VN" },
      { id: 2, name: "Haiphong", country: "VN" },
    ]);
    vi.mocked(postCities).mockResolvedValue({ id: 3, name: "Hue", country: "VN" });
  });

  it("filters cities by name and does not show empty/create states for partial matches", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    renderWithRouter(<CitySelect country="VN" value={null} onChange={onChange} />);

    await waitFor(() => {
      expect(getCities).toHaveBeenCalled();
    });

    await user.click(screen.getByRole("combobox"));
    await user.type(screen.getByPlaceholderText("Search cities..."), "han");

    await waitFor(() => {
      expect(screen.getByText("Hanoi")).toBeInTheDocument();
    });

    expect(screen.queryByText("No cities found.")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Create:/i })).not.toBeInTheDocument();
  });
});
