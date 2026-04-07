import { test, expect, type Page } from "@playwright/test";
import { gotoApp, login } from "./utils/app";
import {
  createPetViaApiAndOpenProfile,
  openCreatePetPage,
  selectPetType,
  setBirthdayPrecisionUnknown,
} from "./utils/pets";

const TEST_USER = {
  email: "user1@catarchy.space",
  password: "password",
};

async function emulateOffline(page: Page) {
  await page.context().setOffline(true);
  await page.evaluate(() => {
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      get: () => false,
    });
    window.dispatchEvent(new Event("offline"));
  });
}

async function emulateOnline(page: Page) {
  await page.context().setOffline(false);
  await page.evaluate(() => {
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      get: () => true,
    });
    window.dispatchEvent(new Event("online"));
  });
}

test.describe("Offline Mode", () => {
  test.describe.configure({ mode: "serial" });

  test("queues pet creation offline and syncs it after reconnect", async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    await openCreatePetPage(page);

    const petName = `Offline Create Pet ${String(Date.now())}`;

    await emulateOffline(page);

    await page.locator("input#name").fill(petName);
    await selectPetType(page, "Cat");
    await setBirthdayPrecisionUnknown(page);
    await page.locator('form button[type="submit"]').click();

    await expect(page).toHaveURL(/^https?:\/\/[^/]+\/?$/, { timeout: 10000 });

    await emulateOnline(page);
    await page.reload({ waitUntil: "domcontentloaded" });
    await gotoApp(page, "/");
    const petLink = page.getByRole("link", { name: petName, exact: true }).first();
    await expect(petLink).toBeVisible({ timeout: 10000 });
    await expect.poll(async () => await petLink.getAttribute("href")).toMatch(/\/pets\/\d+$/);
    await expect(page.getByText(/syncing changes/i)).toHaveCount(0, { timeout: 15000 });
  });

  test("queues pet edits offline and persists them after reconnect", async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);

    const originalName = `Offline Edit Pet ${String(Date.now())}`;
    const updatedName = `${originalName} Updated`;
    const updatedDescription = `Offline updated description ${String(Date.now())}`;

    const { petId } = await createPetViaApiAndOpenProfile(page, originalName);

    await gotoApp(page, `/pets/${String(petId)}?edit=general`);
    await expect(page.getByRole("tab", { name: "General" })).toHaveAttribute(
      "data-state",
      "active",
    );

    await emulateOffline(page);

    await page.getByLabel("Name").fill(updatedName);
    await page.getByLabel("Description").fill(updatedDescription);
    await page.getByRole("button", { name: "Update Pet", exact: true }).click();

    await expect(page.getByRole("heading", { name: updatedName, level: 1 })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText(updatedDescription, { exact: true })).toBeVisible();
    const updateReplay = page.waitForResponse((response) => {
      return (
        response.request().method() === "PUT" &&
        new RegExp(`/api/pets/${String(petId)}$`).test(response.url()) &&
        response.ok()
      );
    });

    await emulateOnline(page);
    await updateReplay;

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: updatedName, level: 1 })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText(updatedDescription, { exact: true })).toBeVisible();
  });

  test("queues pet deletion offline and keeps it deleted after reconnect", async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);

    const petName = `Offline Delete Pet ${String(Date.now())}`;
    const { petId } = await createPetViaApiAndOpenProfile(page, petName);

    await gotoApp(page, `/pets/${String(petId)}?edit=status`);
    await expect(page.getByRole("tab", { name: "Status" })).toHaveAttribute("data-state", "active");

    await emulateOffline(page);

    await page.getByRole("button", { name: "Remove pet", exact: true }).click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await page.getByRole("button", { name: "Confirm remove", exact: true }).click();

    await expect(page).toHaveURL(/^https?:\/\/[^/]+\/?$/, { timeout: 10000 });
    await expect(page.getByRole("link", { name: petName, exact: true })).toHaveCount(0);

    const deleteReplay = page.waitForResponse((response) => {
      return (
        response.request().method() === "DELETE" &&
        new RegExp(`/api/pets/${String(petId)}$`).test(response.url()) &&
        response.ok()
      );
    });

    await emulateOnline(page);
    await deleteReplay;

    await gotoApp(page, "/");
    await expect(page.getByRole("link", { name: petName, exact: true })).toHaveCount(0);
  });
});
