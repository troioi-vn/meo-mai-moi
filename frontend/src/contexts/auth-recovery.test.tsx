import { describe, it, expect, vi, beforeEach } from "vite-plus/test";

vi.mock("@/api/axios", () => ({
  api: { get: vi.fn() },
  authApi: { post: vi.fn().mockResolvedValue({}) },
  csrf: vi.fn().mockResolvedValue(undefined),
  setUnauthorizedHandler: vi.fn(),
  SKIP_UNAUTHORIZED_REDIRECT_HEADER: "X-Skip-Unauthorized-Redirect",
}));

vi.mock("@/api/generated/user-profile/user-profile", () => ({
  putUsersMePassword: vi.fn(),
  deleteUsersMe: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/query-cache", () => ({
  clearOfflineCache: vi.fn().mockResolvedValue(undefined),
}));

import { render, screen, waitFor } from "@testing-library/react";
import { AuthProvider } from "./AuthContext";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/api/axios";

function AuthStatus() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div>loading</div>;
  }

  return <div>{user ? `user:${user.email}` : "guest"}</div>;
}

describe("AuthProvider recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retries auth bootstrap after a transient startup 401", async () => {
    const apiGet = vi.spyOn(api, "get");

    apiGet
      .mockRejectedValueOnce({ isAxiosError: true, response: { status: 401 } })
      .mockRejectedValueOnce({ isAxiosError: true, response: { status: 401 } })
      .mockResolvedValueOnce({ id: 1, email: "rescue@example.com" });

    render(
      <AuthProvider>
        <AuthStatus />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("guest")).toBeInTheDocument();
    });

    await waitFor(
      () => {
        expect(screen.getByText("user:rescue@example.com")).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    expect(apiGet).toHaveBeenCalledTimes(3);
  });
});
