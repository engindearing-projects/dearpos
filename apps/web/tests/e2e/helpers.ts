import { expect, type Page } from "@playwright/test";

// Seeded PIN for every dev staff member (see packages/db/src/seed.ts).
export const DEV_PIN = "1234";

export async function loginAs(
  page: Page,
  slug: string,
  staffName = "Maya",
  pin = DEV_PIN,
) {
  await page.goto(`/pos/${slug}/login`);
  await page.getByRole("button", { name: staffName }).click();
  for (const ch of pin) {
    await page.getByRole("button", { name: ch }).click();
  }
  // After 4+ digits the form auto-submits and the action redirects to the POS.
  await page.waitForURL((url) => url.pathname === `/pos/${slug}`, {
    timeout: 10_000,
  });
  // First time on a shift the Starting cash modal auto-opens and intercepts
  // clicks. Dismiss it so subsequent test actions can proceed.
  const skip = page.getByRole("button", { name: "Skip" });
  if (await skip.isVisible().catch(() => false)) {
    await skip.click();
  }
}

export async function ringUpDripCoffee(page: Page) {
  await page.getByRole("button", { name: /Brewed/ }).click();
  await page.getByRole("button", { name: /Drip Coffee/ }).first().click();
  // Drip has variants → configurator opens. Confirm with default 12oz.
  const addButton = page.getByRole("button", { name: /Add to order/ });
  if (await addButton.isVisible().catch(() => false)) {
    await addButton.click();
  }
  await expect(page.getByText(/Drip Coffee/).first()).toBeVisible();
}

export async function clearSession(page: Page, slug: string) {
  await page.context().clearCookies({ name: `dearpos_sess_${slug}` });
}
