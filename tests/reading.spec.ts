import { expect, test, type Page } from "@playwright/test";

/**
 * Skips the first-run walkthrough by pre-seeding the flag before the app boots.
 * `addInitScript` runs before any page script, so React never sees the
 * unonboarded state and no flash occurs.
 */
async function skipOnboarding(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("scripture-daily-onboarding-complete", "true");
  });
}

/**
 * Serves scripture from a stub instead of the live provider.
 *
 * Without this, every test that opens the reader makes real requests to the
 * upstream Bible service. Run four workers in parallel against a cold cache and
 * they contend badly enough to time out — a flake caused entirely by a third
 * party's latency, which says nothing about whether our code works.
 */
async function stubScripture(page: Page) {
  await page.route("**/api/bible**", async (route) => {
    const url = new URL(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        translation: url.searchParams.get("translation"),
        bookId: Number(url.searchParams.get("book")),
        chapter: Number(url.searchParams.get("chapter")),
        verses: [
          { verse: 1, text: "In the beginning God created the heavens and the earth." },
          { verse: 2, text: "And the earth was without form, and void." },
        ],
      }),
    });
  });
}

test.describe("Today", () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page);
    await stubScripture(page);
    await page.goto("/");
  });

  test("shows ten chapters for today", async ({ page }) => {
    const readings = page.getByRole("checkbox");
    await expect(readings).toHaveCount(10);
  });

  test("marking a chapter updates the count and survives a reload", async ({ page }) => {
    const counter = page.getByText(/^\d+\/10$/).first();
    await expect(counter).toHaveText("0/10");

    await page.getByRole("checkbox").first().click();
    await expect(counter).toHaveText("1/10");

    // Progress is written to localStorage synchronously, so it must persist
    // with no account and no network.
    await page.reload();
    await expect(page.getByText(/^\d+\/10$/).first()).toHaveText("1/10");
    await expect(page.getByRole("checkbox").first()).toHaveAttribute("aria-checked", "true");
  });

  test("unmarking a chapter reverts the count", async ({ page }) => {
    const counter = page.getByText(/^\d+\/10$/).first();
    const first = page.getByRole("checkbox").first();

    await first.click();
    await expect(counter).toHaveText("1/10");

    await first.click();
    await expect(counter).toHaveText("0/10");
  });

  test("completing all ten announces the day is done", async ({ page }) => {
    const checkboxes = page.getByRole("checkbox");
    for (let index = 0; index < 10; index++) {
      await checkboxes.nth(index).click();
    }
    await expect(page.getByRole("heading", { name: "Today is complete" })).toBeVisible();
  });

  test("the hero offers the next unread chapter", async ({ page }) => {
    await expect(page.getByText("Start with")).toBeVisible();

    // Opening from the hero should land on that same chapter in the reader.
    const reference = await page
      .getByText("Start with")
      .locator("xpath=following-sibling::*[1]")
      .textContent();

    await page.getByText("Start with").click();
    await expect(page.getByRole("button", { name: "Close reader" })).toBeVisible();
    await expect(page.getByText(reference!.trim(), { exact: true }).first()).toBeVisible();
  });
});

test.describe("Reader", () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page);
    await stubScripture(page);
    await page.goto("/");
  });

  test("navigates between chapters and guards the daily credit", async ({ page }) => {
    await page.getByText("Start with").click();
    await expect(page.getByRole("button", { name: "Close reader" })).toBeVisible();

    // On today's chapter the primary action marks it read.
    await expect(page.getByRole("button", { name: /Mark as read/ })).toBeVisible();

    await page.getByRole("button", { name: /^Next chapter/ }).click();

    // Browsing elsewhere must not offer to credit today's reading.
    await expect(page.getByRole("button", { name: /Mark as read/ })).toBeHidden();
    await expect(
      page.getByRole("button", { name: "Back to today's chapter" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Back to today's chapter" }).click();
    await expect(page.getByRole("button", { name: /Mark as read/ })).toBeVisible();
  });
});

test.describe("Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page);
    await page.goto("/");
  });

  test("moves between the main sections", async ({ page }) => {
    const nav = page.getByRole("navigation", { name: "Main" });

    await nav.getByRole("link", { name: "Progress" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Progress" })).toBeVisible();

    await nav.getByRole("link", { name: "History" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "History" })).toBeVisible();

    await nav.getByRole("link", { name: "Settings" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
  });

  test("a deep link renders directly", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
  });

  test("an unknown route shows the not-found page", async ({ page }) => {
    await page.goto("/does-not-exist");
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  });
});

test.describe("Onboarding", () => {
  test("a first-time visitor is walked through and can start reading", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Ten chapters a day" })).toBeVisible();

    // Step through every panel rather than a fixed count, so adding or
    // removing a step does not silently break this test.
    const steps = page.getByRole("tab");
    const count = await steps.count();
    for (let index = 0; index < count - 1; index++) {
      await page.getByRole("button", { name: "Continue" }).click();
    }

    await page.getByRole("button", { name: "Start reading" }).click();
    await expect(page.getByRole("checkbox")).toHaveCount(10);
  });

  test("is not shown again once completed", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Skip" }).click();
    await expect(page.getByRole("checkbox")).toHaveCount(10);

    await page.reload();
    await expect(page.getByRole("checkbox")).toHaveCount(10);
  });
});

test.describe("Auth", () => {
  test("renders the sign-in form", async ({ page }) => {
    await page.goto("/auth");

    // Regression guard: this page previously referenced two undefined icon
    // components and rendered as a blank screen in production.
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
  });

  test("validates the email before submitting", async ({ page }) => {
    await page.goto("/auth");

    await page.getByLabel("Email").fill("not-an-email");
    await page.getByLabel("Password", { exact: true }).fill("password123");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByRole("alert")).toContainText("valid email");
  });

  test("switches to sign-up", async ({ page }) => {
    await page.goto("/auth");
    await page.getByRole("button", { name: "Create an account" }).click();

    await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
    await expect(page.getByLabel("Display name")).toBeVisible();
  });
});

test.describe("Community", () => {
  test("prompts a signed-out visitor to sign in", async ({ page }) => {
    await skipOnboarding(page);
    await page.goto("/community");

    await expect(page.getByText("An account is needed")).toBeVisible();
  });
});
