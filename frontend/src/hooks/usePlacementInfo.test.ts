import { renderHook } from "@testing-library/react";
import { describe, it, expect } from "vite-plus/test";
import { usePlacementInfo } from "./usePlacementInfo";
import type { Pet, PetType, PlacementRequest } from "@/types/pet";
import type {
  HelperProfileSummary,
  PlacementRequestResponse,
  TransferRequest,
} from "@/types/placement";

describe("usePlacementInfo", () => {
  const createPetType = (overrides: Partial<PetType> = {}): PetType => ({
    id: 1,
    name: "Cat",
    slug: "cat",
    is_active: true,
    is_system: false,
    display_order: 1,
    placement_requests_allowed: true,
    created_at: "2023-01-01T00:00:00Z",
    updated_at: "2023-01-01T00:00:00Z",
    ...overrides,
  });

  const createHelperProfile = (
    userId: number,
    overrides: Partial<HelperProfileSummary> = {},
  ): HelperProfileSummary => ({
    id: 456,
    user: { id: userId },
    created_at: "2023-01-01T00:00:00Z",
    updated_at: "2023-01-01T00:00:00Z",
    ...overrides,
  });

  const createTransferRequest = (overrides: Partial<TransferRequest> = {}): TransferRequest => ({
    id: 1,
    placement_request_id: 1,
    from_user_id: 1,
    to_user_id: 2,
    status: "pending",
    created_at: "2023-01-01T00:00:00Z",
    updated_at: "2023-01-01T00:00:00Z",
    ...overrides,
  });

  const createPlacementResponse = (
    overrides: Partial<PlacementRequestResponse> = {},
  ): PlacementRequestResponse => ({
    id: 1,
    placement_request_id: 1,
    helper_profile_id: 456,
    status: "responded",
    responded_at: "2023-01-01T00:00:00Z",
    created_at: "2023-01-01T00:00:00Z",
    updated_at: "2023-01-01T00:00:00Z",
    ...overrides,
  });

  const createPlacementRequest = (overrides: Partial<PlacementRequest> = {}): PlacementRequest => ({
    id: 1,
    pet_id: 1,
    request_type: "placement",
    status: "open",
    responses: [],
    created_at: "2023-01-01T00:00:00Z",
    updated_at: "2023-01-01T00:00:00Z",
    ...overrides,
  });

  const createPet = (overrides: Partial<Pet> = {}): Pet =>
    ({
      id: 1,
      name: "Test Pet",
      country: "VN",
      description: "",
      user_id: 1,
      pet_type_id: 1,
      status: "active",
      pet_type: createPetType(overrides.pet_type),
      ...overrides,
    }) as Pet;

  describe("when pet does not support placement", () => {
    it("returns defaults", () => {
      const pet = createPet({
        pet_type: createPetType({
          id: 2,
          name: "Dog",
          slug: "dog",
          display_order: 2,
          placement_requests_allowed: false,
        }),
      });

      const { result } = renderHook(() => usePlacementInfo(pet, 123));

      expect(result.current).toEqual({
        supportsPlacement: false,
        hasActivePlacementRequest: false,
        activePlacementRequest: undefined,
        myPendingResponse: undefined,
        myAcceptedResponse: undefined,
        myPendingTransfer: undefined,
      });
    });
  });

  describe("when pet supports placement but has no placement_requests", () => {
    it("uses pet.placement_request_active for hasActivePlacementRequest", () => {
      const pet = createPet({
        placement_requests: [],
        placement_request_active: true,
      });

      const { result } = renderHook(() => usePlacementInfo(pet, 123));

      expect(result.current.supportsPlacement).toBe(true);
      expect(result.current.hasActivePlacementRequest).toBe(true);
      expect(result.current.activePlacementRequest).toBeUndefined();
      expect(result.current.myPendingResponse).toBeUndefined();
      expect(result.current.myAcceptedResponse).toBeUndefined();
      expect(result.current.myPendingTransfer).toBeUndefined();
    });

    it("returns false for hasActivePlacementRequest when placement_request_active is false", () => {
      const pet = createPet({
        placement_requests: [],
        placement_request_active: false,
      });

      const { result } = renderHook(() => usePlacementInfo(pet));

      expect(result.current.hasActivePlacementRequest).toBe(false);
    });
  });

  describe("activePlacementRequest selection", () => {
    it("ignores requests with non-visible statuses", () => {
      const pet = createPet({
        placement_requests: [
          createPlacementRequest({
            id: 1,
            status: "closed" as const,
          }),
          createPlacementRequest({
            id: 2,
            status: "cancelled" as const,
          }),
        ],
      });

      const { result } = renderHook(() => usePlacementInfo(pet));

      expect(result.current.activePlacementRequest).toBeUndefined();
      expect(result.current.hasActivePlacementRequest).toBe(false);
    });

    it("picks the first visible request (open)", () => {
      const openRequest = createPlacementRequest({
        id: 1,
        status: "open" as const,
      });
      const pet = createPet({
        placement_requests: [
          openRequest,
          createPlacementRequest({
            id: 2,
            status: "pending_transfer" as const,
          }),
        ],
      });

      const { result } = renderHook(() => usePlacementInfo(pet));

      expect(result.current.activePlacementRequest).toEqual(openRequest);
      expect(result.current.hasActivePlacementRequest).toBe(true);
    });

    it("picks the first visible request (pending_transfer)", () => {
      const pendingRequest = createPlacementRequest({
        id: 2,
        status: "pending_transfer" as const,
      });
      const pet = createPet({
        placement_requests: [
          createPlacementRequest({
            id: 1,
            status: "closed" as const,
          }),
          pendingRequest,
          createPlacementRequest({
            id: 3,
            status: "active" as const,
          }),
        ],
      });

      const { result } = renderHook(() => usePlacementInfo(pet));

      expect(result.current.activePlacementRequest).toEqual(pendingRequest);
    });

    it("picks the first visible request (active)", () => {
      const activeRequest = createPlacementRequest({
        id: 3,
        status: "active" as const,
      });
      const pet = createPet({
        placement_requests: [
          createPlacementRequest({
            id: 1,
            status: "closed" as const,
          }),
          activeRequest,
        ],
      });

      const { result } = renderHook(() => usePlacementInfo(pet));

      expect(result.current.activePlacementRequest).toEqual(activeRequest);
    });
  });

  describe("user-specific fields", () => {
    const userId = 123;

    it('finds myPendingResponse when response.status === "responded" and user matches', () => {
      const pendingResponse = createPlacementResponse({
        id: 1,
        status: "responded" as const,
        helper_profile: createHelperProfile(userId),
      });
      const pet = createPet({
        placement_requests: [
          createPlacementRequest({
            id: 1,
            status: "open" as const,
            responses: [pendingResponse],
          }),
        ],
      });

      const { result } = renderHook(() => usePlacementInfo(pet, userId));

      expect(result.current.myPendingResponse).toEqual(pendingResponse);
    });

    it("ignores responded responses from other users", () => {
      const pet = createPet({
        placement_requests: [
          createPlacementRequest({
            id: 1,
            status: "open" as const,
            responses: [
              createPlacementResponse({
                id: 1,
                status: "responded" as const,
                helper_profile: createHelperProfile(999),
              }),
            ],
          }),
        ],
      });

      const { result } = renderHook(() => usePlacementInfo(pet, userId));

      expect(result.current.myPendingResponse).toBeUndefined();
    });

    it('finds myAcceptedResponse when response.status === "accepted" and user matches', () => {
      const acceptedResponse = createPlacementResponse({
        id: 2,
        status: "accepted" as const,
        helper_profile: createHelperProfile(userId),
        transfer_request: createTransferRequest({ status: "confirmed" }),
      });
      const pet = createPet({
        placement_requests: [
          createPlacementRequest({
            id: 1,
            status: "open" as const,
            responses: [acceptedResponse],
          }),
        ],
      });

      const { result } = renderHook(() => usePlacementInfo(pet, userId));

      expect(result.current.myAcceptedResponse).toEqual(acceptedResponse);
    });

    it('sets myPendingTransfer only when accepted response has transfer_request.status === "pending"', () => {
      const pendingTransfer = createTransferRequest({ status: "pending" });
      const acceptedResponse = createPlacementResponse({
        id: 2,
        status: "accepted" as const,
        helper_profile: createHelperProfile(userId),
        transfer_request: pendingTransfer,
      });
      const pet = createPet({
        placement_requests: [
          createPlacementRequest({
            id: 1,
            status: "active" as const,
            responses: [acceptedResponse],
          }),
        ],
      });

      const { result } = renderHook(() => usePlacementInfo(pet, userId));

      expect(result.current.myPendingTransfer).toEqual(pendingTransfer);
    });

    it('does not set myPendingTransfer when transfer_request.status !== "pending"', () => {
      const acceptedResponse = createPlacementResponse({
        id: 2,
        status: "accepted" as const,
        helper_profile: createHelperProfile(userId),
        transfer_request: createTransferRequest({ status: "confirmed" }),
      });
      const pet = createPet({
        placement_requests: [
          createPlacementRequest({
            id: 1,
            status: "active" as const,
            responses: [acceptedResponse],
          }),
        ],
      });

      const { result } = renderHook(() => usePlacementInfo(pet, userId));

      expect(result.current.myPendingTransfer).toBeUndefined();
    });
  });
});
