import { test, expect } from "@playwright/test";
import { clearSession, DEV_PIN, loginAs, ringUpDripCoffee } from "./helpers";

const SLUG = "roast-house";

test.describe("public", () => {
  test("home page", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "DearPOS" }),
    ).toBeVisible();
  });

  test("admin index lists seeded businesses", async ({ page }) => {
    await page.goto("/admin");
    await expect(
      page.getByRole("link", { name: /Roast House Coffee/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Jewel of the North/ }),
    ).toBeVisible();
  });
});

test.describe("admin tabs render", () => {
  for (const path of [
    "",
    "/orders",
    "/items",
    "/modifier-groups",
    "/staff",
    "/z-report",
    "/branding",
  ]) {
    test(`/admin/${SLUG}${path}`, async ({ page }) => {
      const res = await page.goto(`/admin/${SLUG}${path}`);
      expect(res?.status(), `${path} should be 200`).toBe(200);
    });
  }
});

test.describe("POS auth gate", () => {
  test("anonymous /pos/[slug] redirects to login", async ({ page }) => {
    await clearSession(page, SLUG);
    await page.goto(`/pos/${SLUG}`);
    await page.waitForURL(`**/pos/${SLUG}/login`);
    await expect(
      page.getByRole("heading", { name: /Roast House Coffee/ }),
    ).toBeVisible();
  });

  test("wrong PIN keeps the form open with an error", async ({ page }) => {
    await clearSession(page, SLUG);
    await page.goto(`/pos/${SLUG}/login`);
    await page.getByRole("button", { name: "Maya" }).click();
    for (const ch of "9999") {
      await page.getByRole("button", { name: ch }).click();
    }
    await expect(page.getByText(/Wrong PIN/)).toBeVisible();
  });
});

test.describe("ring up + receipt", () => {
  test("cash sale ends on the receipt", async ({ page }) => {
    await clearSession(page, SLUG);
    await loginAs(page, SLUG, "Maya", DEV_PIN);
    await ringUpDripCoffee(page);
    // The cart shows a Cash button with the total
    const cash = page.getByRole("button", { name: /Cash · \$/ });
    await expect(cash).toBeEnabled();
    await cash.click();
    await page.waitForURL(/\/receipt\//, { timeout: 10_000 });
    await expect(page.getByText(/Drip Coffee/).first()).toBeVisible();
    await expect(page.getByText(/Served by Maya/)).toBeVisible();
    // Print + New order are present (chrome buttons that don't print in tests)
    await expect(page.getByRole("button", { name: "Print" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "New order" }),
    ).toBeVisible();
  });
});

test.describe("discount on cart", () => {
  test("10% discount renders a discount line", async ({ page }) => {
    await clearSession(page, SLUG);
    await loginAs(page, SLUG, "Maya", DEV_PIN);
    await ringUpDripCoffee(page);

    await page.getByRole("button", { name: /Add discount/ }).click();
    await page.getByRole("button", { name: /^10%$/ }).click();
    await page.getByRole("button", { name: "Apply" }).click();

    // The pill in the cart footer flips to "Discount · 10%"
    await expect(
      page.getByRole("button", { name: "Discount · 10%" }),
    ).toBeVisible();
    // Cash button label updates with the new total
    await expect(page.getByRole("button", { name: /Cash · \$/ })).toBeVisible();
  });
});

test.describe("Z-report renders today", () => {
  test("Z-report header shows the business day", async ({ page }) => {
    await page.goto(`/admin/${SLUG}/z-report`);
    await expect(
      page.getByRole("heading", { name: /Z-report/ }),
    ).toBeVisible();
  });
});
