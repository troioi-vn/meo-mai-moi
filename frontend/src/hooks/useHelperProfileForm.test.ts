import { describe, it, expect } from "vite-plus/test";
import { validateHelperProfileForm, buildHelperProfileFormData } from "./useHelperProfileForm";
import type { HelperProfileForm } from "./useHelperProfileForm";

describe("useHelperProfileForm helpers", () => {
  const t = (key: string) => key;

  const baseFormData: HelperProfileForm = {
    country: "VN",
    address: "123 Street",
    city: "Hanoi",
    city_ids: [1],
    cities_selected: [],
    state: "Hanoi",
    phone_number: "+84123456789",
    contact_details: [{ type: "telegram", value: "@helper_contact" }],
    experience: "5 years",
    has_pets: true,
    has_children: false,
    request_types: ["foster_free"],
    status: "private",
    photos: [],
    pet_type_ids: [1],
  };

  describe("validateHelperProfileForm", () => {
    it("returns empty errors for valid data", () => {
      const errors = validateHelperProfileForm(baseFormData, t);
      expect(errors).toEqual({});
    });

    it("requires country", () => {
      const errors = validateHelperProfileForm({ ...baseFormData, country: "" }, t);
      expect(errors.country).toBe("validation:required");
    });

    it("requires at least one city", () => {
      const errors = validateHelperProfileForm({ ...baseFormData, city_ids: [] }, t);
      expect(errors.city).toBe("helper:form.cities_required_error");
    });

    it("requires phone number", () => {
      const errors = validateHelperProfileForm({ ...baseFormData, phone_number: "" }, t);
      expect(errors.phone_number).toBe("validation:phone.required");
    });

    it("requires phone number when input is only whitespace", () => {
      const errors = validateHelperProfileForm({ ...baseFormData, phone_number: "   " }, t);
      expect(errors.phone_number).toBe("validation:phone.required");
    });

    it("denies invalid phone number characters", () => {
      const errors = validateHelperProfileForm({ ...baseFormData, phone_number: "+84abc123" }, t);
      expect(errors.phone_number).toBe("validation:phone.invalid");
    });

    it("allows valid composed phone number format", () => {
      const validPhones = ["+84987654321", "+380501234567", "+11234567890"];
      validPhones.forEach((phone) => {
        const errors = validateHelperProfileForm({ ...baseFormData, phone_number: phone }, t);
        expect(errors.phone_number).toBeUndefined();
      });
    });

    it("validates contact details against the selected service", () => {
      const errors = validateHelperProfileForm(
        {
          ...baseFormData,
          contact_details: [{ type: "facebook", value: "https://instagram.com/not-facebook" }],
        },
        t,
      );

      expect(errors["contact_details.0.value"]).toBe("helper:form.contactErrors.facebook");
    });
  });

  describe("buildHelperProfileFormData", () => {
    it("appends basic fields", () => {
      const formData = buildHelperProfileFormData(baseFormData);
      expect(formData.get("country")).toBe("VN");
      expect(formData.get("phone_number")).toBe("+84123456789");
      expect(formData.get("status")).toBe("private");
    });

    it("trims phone number before appending", () => {
      const formData = buildHelperProfileFormData({
        ...baseFormData,
        phone_number: "  +84123456789  ",
      });
      expect(formData.get("phone_number")).toBe("+84123456789");
    });

    it("converts booleans to 1/0 strings", () => {
      const formData = buildHelperProfileFormData(baseFormData);
      expect(formData.get("has_pets")).toBe("1");
      expect(formData.get("has_children")).toBe("0");
    });

    it("appends multiple city_ids and request_types", () => {
      const formData = buildHelperProfileFormData({
        ...baseFormData,
        city_ids: [1, 2],
        request_types: ["foster_free", "permanent"],
      });
      expect(formData.getAll("city_ids[]")).toEqual(["1", "2"]);
      expect(formData.getAll("request_types[]")).toEqual(["foster_free", "permanent"]);
    });

    it("appends normalized contact details", () => {
      const formData = buildHelperProfileFormData({
        ...baseFormData,
        contact_details: [
          { type: "telegram", value: "@helper_contact" },
          { type: "other", value: " Calls after 6pm " },
        ],
      });

      expect(formData.get("contact_details[0][type]")).toBe("telegram");
      expect(formData.get("contact_details[0][value]")).toBe("helper_contact");
      expect(formData.get("contact_details[1][value]")).toBe("Calls after 6pm");
    });
  });
});
