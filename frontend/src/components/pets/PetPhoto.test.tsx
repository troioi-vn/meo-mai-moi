import { render, screen, waitFor } from "@/testing";
import { describe, it, expect, vi, beforeEach } from "vite-plus/test";
import userEvent from "@testing-library/user-event";
import { PetPhoto } from "./PetPhoto";
import { mockPet } from "@/testing/mocks/data/pets";

const { mockApiDelete } = vi.hoisted(() => ({
  mockApiDelete: vi.fn(),
}));

// Mock the API (still needed for delete which uses api.delete directly)
vi.mock("@/api/axios", () => ({
  api: {
    delete: mockApiDelete,
  },
  setUnauthorizedHandler: vi.fn(),
}));

// Mock the pets API
vi.mock("@/api/generated/pets/pets", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/generated/pets/pets")>();

  return {
    ...actual,
    getGetPetsIdQueryKey: (id: number) => [`/pets/${id}`],
  };
});

// Mock the pet-photos API
vi.mock("@/api/generated/pet-photos/pet-photos", () => ({
  postPetsPetPhotos: vi.fn(),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { postPetsPetPhotos } from "@/api/generated/pet-photos/pet-photos";
import type { Pet as GeneratedPet } from "@/api/generated/model";

describe("PetPhoto", () => {
  const mockOnPhotoUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders pet photo", () => {
    render(<PetPhoto pet={mockPet} onPhotoUpdate={mockOnPhotoUpdate} />);

    const img = screen.getByRole("img", { name: mockPet.name });
    expect(img).toHaveAttribute("src", mockPet.photo_url);
  });

  it("shows upload controls when enabled", () => {
    render(<PetPhoto pet={mockPet} onPhotoUpdate={mockOnPhotoUpdate} showUploadControls={true} />);

    expect(screen.getByRole("button", { name: /upload/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });

  it("hides upload controls when disabled", () => {
    render(<PetPhoto pet={mockPet} onPhotoUpdate={mockOnPhotoUpdate} showUploadControls={false} />);

    expect(screen.queryByRole("button", { name: /upload/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /remove/i })).not.toBeInTheDocument();
  });

  it("hides remove button when pet has no photo", () => {
    const petWithoutPhoto = { ...mockPet, photo_url: undefined };

    render(
      <PetPhoto
        pet={petWithoutPhoto}
        onPhotoUpdate={mockOnPhotoUpdate}
        showUploadControls={true}
      />,
    );

    expect(screen.getByRole("button", { name: /upload/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /remove/i })).not.toBeInTheDocument();
  });

  it("uploads photo successfully", async () => {
    const user = userEvent.setup();
    const mockResponse = {
      ...mockPet,
      photo_url: "http://example.com/new-photo.jpg",
    } as GeneratedPet;
    vi.mocked(postPetsPetPhotos).mockResolvedValue(mockResponse);

    render(<PetPhoto pet={mockPet} onPhotoUpdate={mockOnPhotoUpdate} showUploadControls={true} />);

    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
    const fileInput = screen.getByRole("button", { name: /upload/i });

    await user.click(fileInput);

    // Find the hidden file input and upload file
    const hiddenInput = document.querySelector('input[type="file"]');
    if (!(hiddenInput instanceof HTMLInputElement)) throw new Error("Hidden input not found");
    await user.upload(hiddenInput, file);

    await waitFor(() => {
      expect(postPetsPetPhotos).toHaveBeenCalledWith(mockPet.id, { photo: file });
    });

    expect(mockOnPhotoUpdate).toHaveBeenCalledWith(mockResponse);
  });

  it("deletes photo successfully", async () => {
    const user = userEvent.setup();
    mockApiDelete.mockResolvedValue({});

    render(<PetPhoto pet={mockPet} onPhotoUpdate={mockOnPhotoUpdate} showUploadControls={true} />);

    const removeButton = screen.getByRole("button", { name: /delete/i });
    await user.click(removeButton);

    await waitFor(() => {
      expect(mockApiDelete).toHaveBeenCalledWith(`/pets/${mockPet.id}/photos/current`);
    });

    expect(mockOnPhotoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        photo_url: undefined,
        photos: [],
      }),
    );
  });

  it("handles upload error", async () => {
    const user = userEvent.setup();
    vi.mocked(postPetsPetPhotos).mockRejectedValue(new Error("Upload failed"));

    render(<PetPhoto pet={mockPet} onPhotoUpdate={mockOnPhotoUpdate} showUploadControls={true} />);

    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
    const fileInput = screen.getByRole("button", { name: /upload/i });

    await user.click(fileInput);

    const hiddenInput = document.querySelector('input[type="file"]');
    if (!(hiddenInput instanceof HTMLInputElement)) throw new Error("Hidden input not found");
    await user.upload(hiddenInput, file);

    await waitFor(() => {
      expect(postPetsPetPhotos).toHaveBeenCalled();
    });

    // onPhotoUpdate should not be called on error
    expect(mockOnPhotoUpdate).not.toHaveBeenCalled();
  });

  it("validates file type", async () => {
    const user = userEvent.setup();

    render(<PetPhoto pet={mockPet} onPhotoUpdate={mockOnPhotoUpdate} showUploadControls={true} />);

    const file = new File(["test"], "test.txt", { type: "text/plain" });
    const fileInput = screen.getByRole("button", { name: /upload/i });

    await user.click(fileInput);

    const hiddenInput = document.querySelector('input[type="file"]');
    if (!(hiddenInput instanceof HTMLInputElement)) throw new Error("Hidden input not found");
    await user.upload(hiddenInput, file);

    // API should not be called for invalid file type
    expect(postPetsPetPhotos).not.toHaveBeenCalled();
    expect(mockOnPhotoUpdate).not.toHaveBeenCalled();
  });

  it("validates file size", async () => {
    const user = userEvent.setup();

    render(<PetPhoto pet={mockPet} onPhotoUpdate={mockOnPhotoUpdate} showUploadControls={true} />);

    // Create a file larger than 10MB
    const largeFile = new File(["x".repeat(11 * 1024 * 1024)], "large.jpg", { type: "image/jpeg" });
    const fileInput = screen.getByRole("button", { name: /upload/i });

    await user.click(fileInput);

    const hiddenInput = document.querySelector('input[type="file"]');
    if (!(hiddenInput instanceof HTMLInputElement)) throw new Error("Hidden input not found");
    await user.upload(hiddenInput, largeFile);

    // API should not be called for oversized file
    expect(postPetsPetPhotos).not.toHaveBeenCalled();
    expect(mockOnPhotoUpdate).not.toHaveBeenCalled();
  });
});
