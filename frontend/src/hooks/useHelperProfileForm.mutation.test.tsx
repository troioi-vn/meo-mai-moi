import type React from "react";
import { MemoryRouter } from "react-router-dom";
import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vite-plus/test";
import { http, HttpResponse } from "msw";
import { AllTheProviders, testQueryClient } from "@/testing";
import { server } from "@/testing/mocks/server";
import useHelperProfileForm, { type HelperProfileForm } from "./useHelperProfileForm";
import { getGetHelperProfilesIdQueryKey } from "@/api/generated/helper-profiles/helper-profiles";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    message: vi.fn(),
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>
    <AllTheProviders>{children}</AllTheProviders>
  </MemoryRouter>
);

const initialFormData: HelperProfileForm = {
  country: "VN",
  address: "123 Street",
  city: "Bien Hoa",
  city_ids: [1],
  cities_selected: [],
  state: "Dong Nai",
  phone_number: "+84912345678",
  contact_details: [{ type: "telegram", value: "helper_contact" }],
  experience: "5 years",
  offer: "",
  has_pets: true,
  has_children: false,
  request_types: ["foster_free"],
  status: "private",
  photos: [],
  pet_type_ids: [1],
};

describe("useHelperProfileForm mutations", () => {
  beforeEach(() => {
    testQueryClient.clear();
    server.resetHandlers();
    vi.clearAllMocks();
  });

  it("updates the exact helper profile cache entry after a successful edit", async () => {
    const profileId = 1;
    const updatedProfile = {
      id: profileId,
      ...initialFormData,
      photos: [
        {
          id: 10,
          url: "http://example.com/photo10.jpg",
          thumb_url: "http://example.com/thumb10.jpg",
        },
      ],
    };
    const setQueryDataSpy = vi.spyOn(testQueryClient, "setQueryData");

    server.use(
      http.put(`http://localhost:3000/api/helper-profiles/${String(profileId)}`, () => {
        return HttpResponse.json({ data: updatedProfile });
      }),
    );

    const { result } = renderHook(() => useHelperProfileForm(profileId, initialFormData), {
      wrapper,
    });

    await act(async () => {
      const submitEvent = {
        preventDefault() {},
      } as unknown as React.SubmitEvent<HTMLFormElement>;

      result.current.handleSubmit(submitEvent);
    });

    await waitFor(() => {
      expect(setQueryDataSpy).toHaveBeenCalledWith(
        getGetHelperProfilesIdQueryKey(profileId),
        updatedProfile,
      );
    });
  });
});
