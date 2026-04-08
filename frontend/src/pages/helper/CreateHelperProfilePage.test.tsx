import { screen, waitFor } from "@testing-library/react";
import { describe, it, expect } from "vite-plus/test";
import { http, HttpResponse } from "msw";
import { server } from "@/testing/mocks/server";
import { renderWithRouter } from "@/testing";
import CreateHelperProfilePage from "./CreateHelperProfilePage";

describe("CreateHelperProfilePage", () => {
  it("renders the current create flow with breadcrumbs and photo upload input", async () => {
    server.use(
      http.get("http://localhost:3000/api/pet-types", () => {
        return HttpResponse.json({
          data: [
            {
              id: 1,
              name: "Cat",
              slug: "cat",
              description: "",
              is_active: true,
              is_system: true,
              display_order: 1,
              placement_requests_allowed: true,
            },
          ],
        });
      }),
    );

    renderWithRouter(<CreateHelperProfilePage />, {
      initialEntries: ["/helper/create"],
      initialAuthState: { isAuthenticated: true, isLoading: false },
    });

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Create Helper Profile", level: 1 }),
      ).toBeInTheDocument();
    });

    expect(screen.getByRole("link", { name: "My Profiles" })).toHaveAttribute("href", "/helper");
    expect(screen.getByRole("button", { name: "Create Helper Profile" })).toBeInTheDocument();
    expect(screen.getByLabelText(/upload photos/i)).toHaveAttribute("accept", "image/*");
  });
});
