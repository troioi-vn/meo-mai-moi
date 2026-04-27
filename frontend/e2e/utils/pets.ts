import { expect, type Page } from "@playwright/test";
import { gotoApp, login } from "./app";

const TEST_USER = {
  email: "user1@catarchy.space",
  password: "password",
};

async function clearPersistedAppState(page: Page) {
  await page.evaluate(async () => {
    localStorage.removeItem("meo_mai_moi_pet_prefs");

    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.allSettled(registrations.map((registration) => registration.unregister()));
    }

    if ("caches" in window) {
      const cacheKeys = await caches.keys();
      await Promise.allSettled(cacheKeys.map((key) => caches.delete(key)));
    }

    const deleteDatabase = (name: string) =>
      new Promise<void>((resolve) => {
        const request = indexedDB.deleteDatabase(name);
        request.onsuccess = () => {
          resolve();
        };
        request.onerror = () => {
          resolve();
        };
        request.onblocked = () => {
          resolve();
        };
      });

    const indexedDbWithDatabases = indexedDB as IDBFactory & {
      databases?: () => Promise<{ name?: string }[]>;
    };

    if (typeof indexedDbWithDatabases.databases === "function") {
      const databases = await indexedDbWithDatabases.databases();
      const databaseNames = databases
        .map((database) => database.name)
        .filter((name): name is string => Boolean(name));

      await Promise.allSettled(databaseNames.map((name) => deleteDatabase(name)));
      return;
    }

    await deleteDatabase("keyval-store");
  });
}

async function waitForCreatePetPageState(
  page: Page,
): Promise<"form" | "login" | "guest" | "unknown"> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (
      await page
        .locator("input#name")
        .isVisible()
        .catch(() => false)
    ) {
      return "form";
    }

    if (
      await page
        .getByRole("heading", { name: /login/i })
        .isVisible()
        .catch(() => false)
    ) {
      return "login";
    }

    if (
      await page
        .getByRole("link", { name: "Login", exact: true })
        .isVisible()
        .catch(() => false)
    ) {
      return "guest";
    }

    await page.waitForTimeout(250);
  }

  return "unknown";
}

export async function selectPetType(page: Page, petType: "Cat" | "Dog") {
  await page.getByRole("combobox").first().click();
  await expect(page.getByRole("option").first()).toBeVisible();
  const optionIndex = petType === "Cat" ? 0 : 1;
  await page.getByRole("option").nth(optionIndex).click();
}

export async function setBirthdayPrecisionUnknown(page: Page) {
  await page.getByRole("combobox", { name: /birthday precision/i }).click();
  await page.getByRole("option", { name: /unknown/i }).click();
}

export async function ensureCitySelected(page: Page) {
  const cityCombobox = page.getByRole("combobox").filter({ hasText: "Select city" }).first();
  if (!(await cityCombobox.isVisible().catch(() => false))) {
    return;
  }

  await cityCombobox.click();
  const citySearchInput = page
    .locator('[data-slot="command-input"], input[placeholder*="Search cities"]')
    .first();
  await expect(citySearchInput).toBeVisible({ timeout: 10000 });

  const preferredCityName = "Hanoi";
  await citySearchInput.fill(preferredCityName);

  const existingCityOption = page.getByRole("option", { name: preferredCityName, exact: true });
  if (
    await existingCityOption
      .first()
      .isVisible()
      .catch(() => false)
  ) {
    await existingCityOption.first().click();
    await expect
      .poll(async () => await page.locator(`input.sr-only[value="${preferredCityName}"]`).count())
      .toBe(1);
    return;
  }

  const cityName = `E2E City ${String(Date.now())}`;
  await citySearchInput.fill(cityName);
  await page.getByRole("button", { name: `Create: "${cityName}"`, exact: true }).click();

  await expect
    .poll(async () => await page.locator(`input.sr-only[value="${cityName}"]`).count())
    .toBe(1);
}

export async function openCreatePetPage(page: Page) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await clearPersistedAppState(page);
    await gotoApp(page, "/pets/create");
    const state = await waitForCreatePetPageState(page);

    if (state === "form") {
      return;
    }

    await login(page, TEST_USER.email, TEST_USER.password);
  }

  throw new Error("Failed to open create pet form");
}

export async function createPetAndGetProfilePath(page: Page, petName: string) {
  await openCreatePetPage(page);
  await page.locator("input#name").fill(petName);
  await selectPetType(page, "Cat");
  await setBirthdayPrecisionUnknown(page);
  await ensureCitySelected(page);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const createPetResponse = page.waitForResponse(
      (response) => response.request().method() === "POST" && response.url().endsWith("/api/pets"),
    );
    await page.locator('form button[type="submit"]').click();

    const response = await createPetResponse;
    if (response.ok()) {
      break;
    }

    if (response.status() !== 429 || attempt === 2) {
      throw new Error(`Failed to create pet from UI helper: ${String(response.status())}`);
    }

    await page.waitForTimeout(2000 * (attempt + 1));
  }

  await expect(page).toHaveURL(/^https?:\/\/[^/]+\/?$/, { timeout: 10000 });

  const petLink = page.getByRole("link", { name: petName, exact: true }).first();
  await expect(petLink).toBeVisible({ timeout: 10000 });

  const href = await petLink.getAttribute("href");
  if (!href) {
    throw new Error(`Could not find profile link for pet ${petName}`);
  }

  return href;
}

export async function createPetViaApiAndOpenProfile(
  page: Page,
  petName: string,
  options?: { petTypeName?: "Cat" | "Dog" },
) {
  const requestedPetTypeName = options?.petTypeName ?? "Cat";

  const petId = await page.evaluate<
    number | null,
    { requestedPetName: string; requestedPetTypeName: string }
  >(
    async ({ requestedPetName, requestedPetTypeName }) => {
      const xsrfCookie = document.cookie
        .split("; ")
        .find((cookie) => cookie.startsWith("XSRF-TOKEN="))
        ?.split("=")[1];

      const petTypesResponse = await fetch("/api/pet-types", {
        credentials: "include",
        headers: { Accept: "application/json" },
      });

      if (!petTypesResponse.ok) {
        throw new Error(`Failed to load pet types: ${String(petTypesResponse.status)}`);
      }

      const petTypesPayload = (await petTypesResponse.json()) as
        | { data?: { id?: number; name?: string }[] }
        | { id?: number; name?: string }[];
      const petTypes = Array.isArray(petTypesPayload)
        ? petTypesPayload
        : (petTypesPayload.data ?? []);
      const selectedPetType = petTypes.find((type) => type.name === requestedPetTypeName);

      if (!selectedPetType?.id) {
        throw new Error(`Could not find ${requestedPetTypeName} pet type for E2E setup`);
      }

      let createResponse: Response | null = null;
      let createPayload:
        | { data?: { id?: number }; message?: string }
        | { id?: number; message?: string }
        | null = null;

      for (let attempt = 0; attempt < 6; attempt += 1) {
        createResponse = await fetch("/api/pets", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-Requested-With": "XMLHttpRequest",
            ...(xsrfCookie ? { "X-XSRF-TOKEN": decodeURIComponent(xsrfCookie) } : {}),
          },
          body: JSON.stringify({
            name: requestedPetName,
            sex: "not_specified",
            country: "VN",
            state: null,
            city_id: null,
            address: null,
            description: "",
            pet_type_id: selectedPetType.id,
            birthday_precision: "unknown",
            category_ids: [],
          }),
        });

        createPayload = (await createResponse.json()) as
          | { data?: { id?: number }; message?: string }
          | { id?: number; message?: string };

        if (createResponse.ok) {
          break;
        }

        if (createResponse.status !== 429 || attempt === 5) {
          throw new Error(
            `Failed to create E2E setup pet: ${String(createResponse.status)} ${
              "message" in createPayload
                ? (createPayload.message ?? "Unknown error")
                : "Unknown error"
            }`,
          );
        }

        await new Promise((resolve) => window.setTimeout(resolve, 2000 * (attempt + 1)));
      }

      if (!createResponse || !createResponse.ok || !createPayload) {
        throw new Error("Failed to create E2E setup pet: Unknown error");
      }

      if (
        "data" in createPayload &&
        createPayload.data &&
        typeof createPayload.data.id === "number"
      ) {
        return createPayload.data.id;
      }

      if ("id" in createPayload && typeof createPayload.id === "number") {
        return createPayload.id;
      }

      return null;
    },
    { requestedPetName: petName, requestedPetTypeName },
  );

  if (!petId) {
    throw new Error("E2E setup pet response did not include a pet id");
  }

  await gotoApp(page, `/pets/${String(petId)}`);
  await expect(page.getByRole("heading", { name: petName, level: 1 })).toBeVisible({
    timeout: 10000,
  });

  return { petId, petName };
}

export function createTinyPngBuffer() {
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
    0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0x00, 0x00, 0x00,
    0x01, 0x00, 0x01, 0x5c, 0xc2, 0x5d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
    0x42, 0x60, 0x82,
  ]);
}
