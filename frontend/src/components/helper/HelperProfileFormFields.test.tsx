import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vite-plus/test";
import { AllTheProviders } from "@/testing/providers";
import { HelperProfileFormFields } from "./HelperProfileFormFields";

const baseProps = {
  formData: {
    country: "VN",
    address: "123 Street",
    city_ids: [1],
    city: "Bien Hoa",
    state: "Dong Nai",
    phone_number: "+84912345678",
    contact_details: [],
    experience: "Experienced foster",
    offer: "",
    has_pets: false,
    has_children: false,
    request_types: ["foster_free"] as const,
    status: "private" as const,
  },
  errors: {},
  updateField: () => vi.fn(),
  citiesValue: [],
  onCitiesChange: vi.fn(),
};

const renderForm = (
  request_types: readonly ("foster_paid" | "foster_free" | "permanent" | "pet_sitting")[],
) =>
  render(
    <AllTheProviders>
      <HelperProfileFormFields
        {...baseProps}
        formData={{
          ...baseProps.formData,
          request_types: [...request_types],
        }}
      />
    </AllTheProviders>,
  );

describe("HelperProfileFormFields", () => {
  it("shows offer field for foster paid", () => {
    renderForm(["foster_paid"]);

    expect(screen.getByLabelText("Offer")).toBeInTheDocument();
  });

  it("shows offer field for pet sitting", () => {
    renderForm(["pet_sitting"]);

    expect(screen.getByLabelText("Offer")).toBeInTheDocument();
  });

  it("hides offer field for non-paid request types", () => {
    renderForm(["foster_free", "permanent"]);

    expect(screen.queryByLabelText("Offer")).not.toBeInTheDocument();
  });
});
