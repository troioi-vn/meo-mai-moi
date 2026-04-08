import { test, expect, type Page } from "@playwright/test";
import { gotoApp, login, logout } from "./utils/app";

const TEST_USER = {
  email: "user1@catarchy.space",
  password: "password",
};

const SEEDED_PUBLIC_HELPER = {
  name: "Trusted Friend",
  locationParts: ["Hanoi", "Da Nang", "HN", "VN"],
};

async function waitForAppReady(page: Page) {
  await expect
    .poll(
      async () => {
        try {
          const response = await page.request.get("/");
          return response.status();
        } catch {
          return 0;
        }
      },
      { timeout: 15000 },
    )
    .toBe(200);
}

async function openCreateHelperProfilePage(page: Page) {
  await waitForAppReady(page);
  await gotoApp(page, "/helper/create");
  await expect(page).toHaveURL(/\/helper\/create/, { timeout: 10000 });
  await expect(page.getByRole("heading", { name: "Create Helper Profile", level: 1 })).toBeVisible({
    timeout: 10000,
  });
}

async function selectCountry(page: Page, countryName: string) {
  await page.getByTestId("country-select").click();

  const searchInput = page.getByPlaceholder("Search country...");
  await expect(searchInput).toBeVisible({ timeout: 10000 });
  await searchInput.fill(countryName);

  await page.getByRole("option", { name: new RegExp(countryName, "i") }).click();
}

async function selectCity(page: Page, cityName: string) {
  const cityCombobox = page.getByRole("combobox").filter({ hasText: "Select cities" }).first();
  await cityCombobox.click();

  const citySearchInput = page.getByPlaceholder("Search cities...");
  await expect(citySearchInput).toBeVisible({ timeout: 10000 });
  await citySearchInput.fill(cityName);

  await page.getByRole("option", { name: cityName, exact: true }).click();
  await expect(page.locator("input#cities")).toHaveValue(cityName);
}

async function createHelperProfile(
  page: Page,
  options?: {
    makePublic?: boolean;
    experience?: string;
    phoneDigits?: string;
    cityName?: string;
  },
) {
  const cityName = options?.cityName ?? "Hanoi";
  const experience = options?.experience ?? `E2E helper experience ${String(Date.now())}`;
  const phoneDigits = options?.phoneDigits ?? "901234567";

  await openCreateHelperProfilePage(page);
  await selectCountry(page, "Vietnam");
  await selectCity(page, cityName);

  if (options?.makePublic) {
    await page.getByRole("switch", { name: "Show this helper profile publicly" }).click();
  }

  await page.locator("input#phone_number").fill(phoneDigits);
  await page.locator("textarea#experience").fill(experience);

  const createResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" && response.url().endsWith("/api/helper-profiles"),
  );

  await page.getByRole("button", { name: "Create Helper Profile", exact: true }).click();

  const response = await createResponse;
  expect(response.ok()).toBeTruthy();

  await expect(page).toHaveURL(/\/helper\/\d+$/, { timeout: 10000 });
  const match = page.url().match(/\/helper\/(\d+)$/);
  if (!match) {
    throw new Error(`Could not determine helper profile id from URL ${page.url()}`);
  }

  return {
    id: Number(match[1]),
    cityName,
    experience,
  };
}

test.describe("Helper Profile Creation", () => {
  test.describe.configure({ mode: "serial" });

  test("shows approved public helper profiles on /helpers and allows opening /helpers/:id publicly", async ({
    page,
  }) => {
    await waitForAppReady(page);
    await gotoApp(page, "/helpers");
    const publicHelperLink = page.getByRole("link", { name: /Trusted Friend/ }).first();

    await expect(page.getByRole("heading", { name: "Helpers", level: 1 })).toBeVisible({
      timeout: 10000,
    });
    await expect(publicHelperLink).toBeVisible({ timeout: 10000 });
    for (const locationPart of SEEDED_PUBLIC_HELPER.locationParts) {
      await expect(page.getByText(locationPart, { exact: true }).first()).toBeVisible({
        timeout: 10000,
      });
    }

    await publicHelperLink.click();

    await expect(page).toHaveURL(/\/helpers\/\d+$/, { timeout: 10000 });
    await expect(
      page.getByRole("heading", { name: SEEDED_PUBLIC_HELPER.name, level: 1 }),
    ).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("Public", { exact: true })).toBeVisible({
      timeout: 10000,
    });
    for (const locationPart of SEEDED_PUBLIC_HELPER.locationParts) {
      await expect(page.getByText(locationPart, { exact: true }).first()).toBeVisible({
        timeout: 10000,
      });
    }
  });

  test("allows an authenticated user to create a helper profile", async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    const { cityName, experience } = await createHelperProfile(page);

    await expect(page.getByText("Private", { exact: true })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText(`${cityName}, VN`, { exact: true })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText(experience, { exact: true })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("Foster (Paid)", { exact: true })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("Cat", { exact: true })).toBeVisible({
      timeout: 10000,
    });
  });

  test("makes newly created public helper profiles visible immediately", async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);

    const experience = `E2E public helper ${String(Date.now())}`;
    const { id } = await createHelperProfile(page, {
      makePublic: true,
      experience,
      phoneDigits: "909876543",
    });

    await expect(page.getByText("Public", { exact: true })).toBeVisible({
      timeout: 10000,
    });
    await logout(page);

    await waitForAppReady(page);
    await gotoApp(page, "/helpers");
    await expect(page.getByText(experience, { exact: true })).toBeVisible({
      timeout: 10000,
    });

    await gotoApp(page, `/helpers/${String(id)}`);
    await expect(page).toHaveURL(new RegExp(`/helpers/${String(id)}$`), {
      timeout: 10000,
    });
    await expect(page.getByText(experience, { exact: true })).toBeVisible({
      timeout: 10000,
    });
  });

  test("does not expose private helper profiles publicly", async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);

    const experience = `E2E private helper ${String(Date.now())}`;
    const { id } = await createHelperProfile(page, {
      experience,
      phoneDigits: "909876544",
    });

    await expect(page.getByText("Private", { exact: true })).toBeVisible({
      timeout: 10000,
    });
    await logout(page);

    await waitForAppReady(page);
    await gotoApp(page, "/helpers");
    await expect(page.getByText(experience, { exact: true })).toHaveCount(0);

    const publicDetailResponse = page.waitForResponse(
      (response) =>
        response.request().method() === "GET" &&
        response.url().endsWith(`/api/helpers/${String(id)}`) &&
        response.status() === 404,
    );

    await gotoApp(page, `/helpers/${String(id)}`);
    await expect(await publicDetailResponse).toBeTruthy();
  });
});
