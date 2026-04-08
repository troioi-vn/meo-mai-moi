import { screen, waitFor } from "@testing-library/react";
import { renderWithRouter, testQueryClient } from "@/testing";
import HelperProfilePage from "./HelperProfilePage";
import { mockHelperProfile } from "@/testing/mocks/data/helper-profiles";

describe("HelperProfilePage", () => {
  beforeEach(() => {
    testQueryClient.clear();
  });

  it("renders helper profiles with location and edit button", async () => {
    testQueryClient.setQueryData(["/helper-profiles"], [mockHelperProfile]);

    renderWithRouter(<HelperProfilePage />);

    await waitFor(() => {
      expect(screen.getByText("Helper Profiles")).toBeInTheDocument();
    });
    // Location should show city, state, and country
    expect(
      screen.getByText(
        `${mockHelperProfile.city}, ${mockHelperProfile.state}, ${mockHelperProfile.country}`,
      ),
    ).toBeInTheDocument();
    // Request type badges should be visible (based on mock data: foster_free, permanent)
    expect(screen.getByText("Foster (Free)")).toBeInTheDocument();
    expect(screen.getByText("Permanent")).toBeInTheDocument();
    // Profile card should be a clickable link
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      `/helper/${String(mockHelperProfile.id)}`,
    );
  });

  it("shows the empty state and routes create CTA to /helper/create", async () => {
    testQueryClient.setQueryData(["/helper-profiles"], []);

    const { user } = renderWithRouter(<HelperProfilePage />, {
      initialEntries: ["/helper"],
      routes: [{ path: "/helper/create", element: <div>Create Helper Profile Page</div> }],
      initialAuthState: { isAuthenticated: true, isLoading: false },
    });

    await waitFor(() => {
      expect(screen.getByText("No helper profiles yet")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Create Your First Profile" }));

    expect(screen.getByText("Create Helper Profile Page")).toBeInTheDocument();
  });
});
