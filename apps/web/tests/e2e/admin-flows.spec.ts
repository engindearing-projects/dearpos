import { test, expect } from "@playwright/test";
import { clearSession, loginAs, ringUpDripCoffee } from "./helpers";

const SLUG = "roast-house";

// Most flows below mutate state. Use a unique suffix per run so reruns
// against the same dev DB don't trip the (businessId, name) unique
// constraints (especially staff). Tests are designed to be append-only —
// they don't clean up after themselves.
const RUN_TAG = `${process.pid}_${Date.now().toString(36)}`;

test.describe("modifier group create", () => {
  test("create + edit + delete cycle", async ({ page }) => {
    const groupName = `Smoke Group ${RUN_TAG}`;

    await page.goto(`/admin/${SLUG}/modifier-groups/new`);
    await page.getByLabel("Name").fill(groupName);
    // First modifier row already exists; fill it in.
    await page.getByPlaceholder("Oat milk").fill("Test option");
    await page.getByRole("button", { name: "Create group" }).click();

    await page.waitForURL(`**/admin/${SLUG}/modifier-groups`);
    await expect(page.getByText(groupName)).toBeVisible();

    // Drill in and rename
    await page.getByRole("link", { name: groupName }).click();
    await page.getByLabel("Name").fill(`${groupName} edited`);
    await page.getByRole("button", { name: "Save changes" }).click();
    await page.waitForURL(`**/admin/${SLUG}/modifier-groups`);
    await expect(page.getByText(`${groupName} edited`)).toBeVisible();

    // Delete (no items are attached)
    await page.getByRole("link", { name: `${groupName} edited` }).click();
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Delete group" }).click();
    await page.waitForURL(`**/admin/${SLUG}/modifier-groups`);
    await expect(page.getByText(`${groupName} edited`)).not.toBeVisible();
  });
});

test.describe("item create", () => {
  test("creates and renders on the POS catalog", async ({ page }) => {
    const itemName = `Smoke Latte ${RUN_TAG}`;

    await page.goto(`/admin/${SLUG}/items/new`);
    await page.getByLabel("Name").fill(itemName);
    await page.getByLabel("Category").fill("Smoke Tests");
    await page.getByLabel("Price").fill("4.50");
    await page.getByRole("button", { name: "Create item" }).click();

    await page.waitForURL(`**/admin/${SLUG}/items`);
    await expect(page.getByRole("link", { name: itemName })).toBeVisible();

    await clearSession(page, SLUG);
    await loginAs(page, SLUG);
    // Item appears in its category
    await page.getByRole("button", { name: "Smoke Tests" }).click();
    await expect(page.getByRole("button", { name: new RegExp(itemName) })).toBeVisible();
  });
});

test.describe("staff create + login", () => {
  test("new staff can sign in with their PIN", async ({ page }) => {
    const staffName = `Smoke ${RUN_TAG}`;
    const pin = "5678";

    await page.goto(`/admin/${SLUG}/staff/new`);
    await page.getByLabel("Name").fill(staffName);
    await page.getByLabel("PIN").fill(pin);
    await page.getByRole("button", { name: "Create staff" }).click();

    await page.waitForURL(`**/admin/${SLUG}/staff`);
    await expect(page.getByRole("link", { name: staffName })).toBeVisible();

    await clearSession(page, SLUG);
    await loginAs(page, SLUG, staffName, pin);
    // Header shows their name
    await expect(page.getByText(staffName).first()).toBeVisible();
  });
});

test.describe("refund a cash sale", () => {
  test("paid order → full refund → status flips to refunded", async ({
    page,
  }) => {
    await clearSession(page, SLUG);
    await loginAs(page, SLUG);
    await ringUpDripCoffee(page);
    await page.getByRole("button", { name: /Cash · \$/ }).click();
    await page.waitForURL(/\/receipt\//);

    // Trigger refund modal (Full + Refund button)
    await page.getByRole("button", { name: "Refund" }).click();
    await page.getByRole("button", { name: /^Refund$/ }).last().click();

    // After refund, the modal closes and the receipt shows the Refunded badge
    // (the dl row also says "Refunded" — pin to the status pill).
    await expect(page.locator("header").getByText("Refunded")).toBeVisible();
    // Refund button is gone now (nothing left to refund)
    await expect(
      page.getByRole("button", { name: "Refund" }),
    ).toHaveCount(0);
  });
});
