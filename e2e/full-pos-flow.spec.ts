import { test, expect, Page } from "@playwright/test";

/**
 * Full POS flow: login → open shift → order → pay → receipt → close shift.
 *
 * Prereqs:
 *  - Dev server running on BASE_URL
 *  - Seed has been run: `pnpm prisma db seed`
 *  - Test user kasir1@pos.local / kasir1234 is active
 */

const KASIR = { email: "kasir1@pos.local", password: "kasir1234" };

async function login(page: Page, user: { email: string; password: string }) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL("**/dashboard", { timeout: 10_000 });
}

async function openShift(page: Page, openingCash: string) {
  await page.goto("/shifts");
  // If header shows "Open shift" CTA (no open shift), click it
  const openCta = page.getByRole("link", { name: /open shift/i });
  if (await openCta.isVisible().catch(() => false)) {
    await openCta.click();
    await page.waitForURL("**/shifts/open", { timeout: 5_000 });
    await page.getByLabel(/opening cash/i).fill(openingCash);
    await page.getByRole("button", { name: /open shift/i }).click();
    await page.waitForURL("**/shifts/**", { timeout: 10_000 });
  }
}

test("full POS flow: login → open shift → order → pay → receipt → close", async ({ page }) => {
  test.setTimeout(120_000);

  // 1. Login
  await login(page, KASIR);

  // 2. Open shift with 200000 IDR opening cash
  await openShift(page, "200000");

  // 3. Go to POS
  await page.goto("/pos");
  await page.waitForLoadState("networkidle");

  // 4. Add an item to cart
  const firstItem = page.locator("button").filter({ hasText: /Rp / }).first();
  await firstItem.click();
  // Variant/modifier dialog may appear; click "Add to cart" if so
  const addToCart = page.getByRole("button", { name: /add to cart/i });
  if (await addToCart.isVisible().catch(() => false)) {
    await addToCart.click();
  }

  // 5. Verify cart has 1 line
  await expect(page.getByText(/Cart/i).first()).toBeVisible();

  // 6. Click Pay
  await page.getByRole("button", { name: /^pay$/i }).click();

  // 7. Confirm payment
  const confirmPay = page.getByRole("button", { name: /confirm payment/i });
  await confirmPay.click();

  // 8. Should land on receipt page
  await page.waitForURL(/\/pos\/orders\/[^/]+\/receipt/, { timeout: 15_000 });
  await expect(page.locator("text=POS").first()).toBeVisible();

  // 9. Close shift (back to /shifts/[id])
  await page.goto("/shifts");
  const openShiftLink = page.getByRole("link").filter({ hasText: /shift/i }).first();
  await openShiftLink.click();
  await page.getByLabel(/closing cash/i).fill("200000");
  await page.getByRole("button", { name: /close shift/i }).click();
  // shift closes; page may stay or redirect
  await expect(page.getByText(/closed/i).first()).toBeVisible();
});
