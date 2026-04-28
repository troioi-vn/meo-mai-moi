import { test, expect, type Locator, type Page } from "@playwright/test";
import { gotoApp, login } from "./utils/app";
import { createPetViaApiAndOpenProfile } from "./utils/pets";

const TEST_USER = {
  email: "user1@catarchy.space",
  password: "password",
};

function habitDialog(page: Page): Locator {
  return page.getByRole("dialog").last();
}

test.describe("Habits", () => {
  test.describe.configure({ mode: "serial" });

  test("allows creating, tracking, editing, archiving, restoring, and deleting a habit", async ({
    page,
  }) => {
    await login(page, TEST_USER.email, TEST_USER.password);

    const timestamp = Date.now();
    const petName = `Habit Pet ${String(timestamp)}`;
    const habitName = `Daily Play ${String(timestamp)}`;
    const updatedHabitName = `${habitName} Updated`;

    await createPetViaApiAndOpenProfile(page, petName);
    await gotoApp(page, "/habits");
    await expect(page.getByRole("heading", { name: "Habits", level: 1 })).toBeVisible({
      timeout: 10000,
    });

    await page.getByRole("button", { name: "Add Habit", exact: true }).click();

    const createDialog = habitDialog(page);
    await expect(createDialog.getByText("Create habit", { exact: true })).toBeVisible();
    await createDialog.getByLabel("Habit name").fill(habitName);
    await createDialog.getByRole("button", { name: "Continue", exact: true }).click();
    await createDialog.getByText(petName, { exact: true }).click();

    const createHabitResponse = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" && response.url().endsWith("/api/habits"),
    );
    await createDialog.getByRole("button", { name: "Create habit", exact: true }).click();
    expect((await createHabitResponse).ok()).toBeTruthy();

    const habitLink = page.getByRole("link", { name: habitName, exact: true }).first();
    await expect(habitLink).toBeVisible({ timeout: 10000 });
    await habitLink.click();

    await expect(page).toHaveURL(/\/habits\/\d+$/, { timeout: 10000 });
    await expect(page.getByRole("heading", { name: habitName, level: 1 })).toBeVisible({
      timeout: 10000,
    });

    await page.getByRole("button", { name: "Track activity", exact: true }).click();

    const dayDialog = habitDialog(page);
    const daySwitch = dayDialog.getByRole("switch").first();
    await expect(daySwitch).toBeVisible({ timeout: 10000 });
    await daySwitch.click();

    const saveDayResponse = page.waitForResponse(
      (response) =>
        response.request().method() === "PUT" &&
        /\/api\/habits\/\d+\/entries\//.test(response.url()),
    );
    await dayDialog.getByRole("button", { name: "Save day", exact: true }).click();
    expect((await saveDayResponse).ok()).toBeTruthy();

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: habitName, level: 1 })).toBeVisible({
      timeout: 10000,
    });

    await page.getByRole("button", { name: "Track activity", exact: true }).click();
    const reloadedDayDialog = habitDialog(page);
    await expect(reloadedDayDialog.getByRole("switch").first()).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await reloadedDayDialog.press("Escape");
    await expect(reloadedDayDialog).toBeHidden({ timeout: 10000 });

    await page.getByRole("button", { name: "Edit", exact: true }).click();
    const editDialog = habitDialog(page);
    await editDialog.getByLabel("Habit name").fill(updatedHabitName);

    const updateHabitResponse = page.waitForResponse(
      (response) =>
        response.request().method() === "PUT" && /\/api\/habits\/\d+$/.test(response.url()),
    );
    await editDialog.getByRole("button", { name: "Save changes", exact: true }).click();
    expect((await updateHabitResponse).ok()).toBeTruthy();

    await expect(page.getByRole("heading", { name: updatedHabitName, level: 1 })).toBeVisible({
      timeout: 10000,
    });

    await page.getByRole("button", { name: "Edit", exact: true }).click();
    const archiveDialog = habitDialog(page);
    const archiveHabitResponse = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        /\/api\/habits\/\d+\/archive$/.test(response.url()),
    );
    await archiveDialog.getByRole("button", { name: "Archive", exact: true }).click();
    expect((await archiveHabitResponse).ok()).toBeTruthy();

    await expect(page.getByText("This habit is archived.", { exact: true })).toBeVisible({
      timeout: 10000,
    });

    const restoreHabitResponse = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        /\/api\/habits\/\d+\/restore$/.test(response.url()),
    );
    await page.getByRole("button", { name: "Restore", exact: true }).click();
    expect((await restoreHabitResponse).ok()).toBeTruthy();
    await expect(page.getByText("This habit is archived.", { exact: true })).toHaveCount(0);

    await page.getByRole("button", { name: "Edit", exact: true }).click();
    const deleteDialogLauncher = habitDialog(page);
    await deleteDialogLauncher.getByRole("button", { name: "Delete", exact: true }).click();

    const confirmDeleteDialog = habitDialog(page);
    await expect(confirmDeleteDialog.getByText("Delete habit?", { exact: true })).toBeVisible({
      timeout: 10000,
    });
    const deleteHabitResponse = page.waitForResponse(
      (response) =>
        response.request().method() === "DELETE" && /\/api\/habits\/\d+$/.test(response.url()),
    );
    await confirmDeleteDialog.getByRole("button", { name: "Delete", exact: true }).click();
    expect((await deleteHabitResponse).ok()).toBeTruthy();

    await expect(page).toHaveURL(/\/habits$/, { timeout: 10000 });
    await expect(page.getByRole("link", { name: updatedHabitName, exact: true })).toHaveCount(0);
  });
});
