import { describe, it, expect, vi, beforeEach } from "vite-plus/test";

// Mock the modules
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

const mockClear = vi.fn();
const mockRemoveClient = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/query-cache", () => ({
  clearOfflineCache: vi.fn(async () => {
    mockClear();
    await mockRemoveClient();
  }),
}));

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "./AuthContext";
import { useAuth } from "@/hooks/use-auth";
import { clearOfflineCache } from "@/lib/query-cache";
import { deleteUsersMe } from "@/api/generated/user-profile/user-profile";

function LogoutButton() {
  const { logout } = useAuth();
  return <button onClick={() => void logout()}>Logout</button>;
}

function DeleteAccountButton() {
  const { deleteAccount } = useAuth();
  return <button onClick={() => void deleteAccount("password")}>Delete</button>;
}

function renderWithProviders() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <AuthProvider
          initialUser={{ id: 1, name: "Test", email: "test@test.com" } as never}
          initialLoading={false}
          skipInitialLoad
        >
          <LogoutButton />
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe("Auth cache clear on logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls clearOfflineCache when logging out", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    await user.click(screen.getByText("Logout"));

    await waitFor(() => {
      expect(clearOfflineCache).toHaveBeenCalledOnce();
    });
  });

  it("calls clearOfflineCache when deleting an account", async () => {
    const user = userEvent.setup();
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <MemoryRouter>
        <QueryClientProvider client={qc}>
          <AuthProvider
            initialUser={{ id: 1, name: "Test", email: "test@test.com" } as never}
            initialLoading={false}
            skipInitialLoad
          >
            <DeleteAccountButton />
          </AuthProvider>
        </QueryClientProvider>
      </MemoryRouter>,
    );

    await user.click(screen.getByText("Delete"));

    await waitFor(() => {
      expect(deleteUsersMe).toHaveBeenCalledOnce();
      expect(clearOfflineCache).toHaveBeenCalledOnce();
    });
  });
});
