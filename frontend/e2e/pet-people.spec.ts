import { test, expect, type Locator, type Page } from "@playwright/test";
import { gotoApp, login, logout, submitLoginForm } from "./utils/app";
import { createPetViaApiAndOpenProfile } from "./utils/pets";

const TEST_USER = {
  email: "user1@catarchy.space",
  password: "password",
};

const INVITEE_USER = {
  email: "invitee@catarchy.space",
  password: "password",
  name: "Trusted Friend",
};

function sectionByTitle(page: Page, title: string, actionText: string) {
  return page
    .getByText(title, { exact: true })
    .locator(`xpath=ancestor::div[.//button[normalize-space()='${actionText}']][1]`);
}

function pendingInvitationSection(peopleSection: Locator) {
  return peopleSection
    .locator("h3")
    .filter({ hasText: "Pending" })
    .locator("xpath=following-sibling::div[1]");
}

test.describe("Pet People", () => {
  test.describe.configure({ mode: "serial" });

  test("allows creating and revoking an invitation link", async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);

    const petName = `People Pet ${String(Date.now())}`;
    await createPetViaApiAndOpenProfile(page, petName);

    const peopleSection = sectionByTitle(page, "People", "Add Person");
    await expect(peopleSection).toBeVisible({ timeout: 10000 });

    await peopleSection.getByRole("button", { name: "Add Person", exact: true }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Add Person", { exact: true })).toBeVisible({ timeout: 10000 });

    await dialog.getByRole("combobox").click();
    await page.getByRole("option", { name: "Editor", exact: true }).click();

    const createInvitationResponse = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        /\/api\/pets\/\d+\/relationship-invitations$/.test(response.url()),
    );
    await dialog.getByRole("button", { name: "Create invitation", exact: true }).click();
    expect((await createInvitationResponse).ok()).toBeTruthy();

    await expect(page.getByText("Invitation created")).toBeVisible({ timeout: 10000 });
    const invitationLink = dialog.locator("input[readonly]").first();
    await expect(invitationLink).toBeVisible({ timeout: 10000 });
    await expect(invitationLink).toHaveValue(/\/pets\/invite\//);

    await dialog.locator('[data-slot="dialog-footer"] button').click();
    await expect(dialog).not.toBeVisible({ timeout: 10000 });

    const pendingSection = pendingInvitationSection(peopleSection);
    await expect(pendingSection).toBeVisible({ timeout: 10000 });
    await expect(pendingSection.getByText("Editor", { exact: true })).toBeVisible({
      timeout: 10000,
    });

    const invitationRow = pendingSection
      .locator("div.flex.items-center.justify-between.py-2")
      .first();
    await expect(invitationRow).toBeVisible({ timeout: 10000 });

    const revokeInvitationResponse = page.waitForResponse(
      (response) =>
        response.request().method() === "DELETE" &&
        /\/api\/pets\/\d+\/relationship-invitations\/\d+$/.test(response.url()),
    );
    await invitationRow.getByRole("button").nth(1).click();
    expect((await revokeInvitationResponse).ok()).toBeTruthy();

    await expect(page.getByText("Invitation revoked")).toBeVisible({ timeout: 10000 });
    await expect(pendingSection).toHaveCount(0);
  });

  test("allows accepting an invitation after login redirect", async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);

    const petName = `Invitation Pet ${String(Date.now())}`;
    await createPetViaApiAndOpenProfile(page, petName);

    const peopleSection = sectionByTitle(page, "People", "Add Person");
    await expect(peopleSection).toBeVisible({ timeout: 10000 });
    await peopleSection.getByRole("button", { name: "Add Person", exact: true }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Add Person", { exact: true })).toBeVisible({ timeout: 10000 });

    await dialog.getByRole("combobox").click();
    await page.getByRole("option", { name: "Viewer", exact: true }).click();
    await dialog.getByRole("button", { name: "Create invitation", exact: true }).click();

    const invitationLink = dialog.locator("input[readonly]").first();
    await expect(invitationLink).toBeVisible({ timeout: 10000 });
    const invitationUrl = await invitationLink.inputValue();

    if (!invitationUrl) {
      throw new Error("Invitation dialog did not expose a usable invitation URL");
    }

    await dialog.locator('[data-slot="dialog-footer"] button').click();
    await expect(dialog).not.toBeVisible({ timeout: 10000 });

    await logout(page);

    await gotoApp(page, new URL(invitationUrl).pathname);
    await expect(page).toHaveURL(/\/login\?redirect=/, { timeout: 10000 });

    await submitLoginForm(page, INVITEE_USER.email, INVITEE_USER.password);
    await expect(page).toHaveURL(/\/pets\/invite\//, { timeout: 10000 });
    await expect(page.getByText(petName, { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Viewer", { exact: true })).toBeVisible({ timeout: 10000 });

    const acceptInvitationResponse = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        /\/api\/relationship-invitations\/[^/]+\/accept$/.test(response.url()),
    );
    await page.getByRole("button", { name: "Accept", exact: true }).click();
    expect((await acceptInvitationResponse).ok()).toBeTruthy();

    await expect(page).toHaveURL(/\/pets\/\d+$/, { timeout: 10000 });
    await expect(page.getByRole("heading", { name: petName, level: 1 })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("You have viewer access to this pet", { exact: true })).toBeVisible(
      {
        timeout: 10000,
      },
    );
  });
});
