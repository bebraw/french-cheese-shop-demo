import { expect, test } from "@playwright/test";

test("renders the cheese demo home page", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: "French Cheese Shop" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Baseline/ })).toBeVisible();
  await expect(page.getByRole("searchbox", { name: "Customer request" })).toBeVisible();
  await expect(page.getByRole("searchbox", { name: "Customer request" })).toHaveValue("I want something like Brie, but stronger.");
  await expect(page.locator("#search-status")).toHaveText("5 results");
});

test("serves the health endpoint", async ({ request }) => {
  const response = await request.get("/api/health");

  expect(response.ok()).toBe(true);
  await expect(response.json()).resolves.toEqual({
    ok: true,
    name: "french-cheese-shop-demo-worker",
    routes: ["/", "/api/search", "/api/health"],
  });
});

test("shows baseline results for a vague request", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("searchbox", { name: "Customer request" }).fill("I want something like Brie but stronger");

  await expect(page.locator("#search-status")).toHaveText("5 results");
  await expect(page.getByRole("heading", { level: 3, name: "Brie de Meaux" })).toBeVisible();
  await expect(page).toHaveURL(
    /[\?&]q=I\+want\+something\+like\+Brie\+but\+stronger|[\?&]q=I%20want%20something%20like%20Brie%20but%20stronger/,
  );
  await expect(page.getByRole("button", { name: "More" }).first()).toBeVisible();
});

test("switching to challenge 2 uses audience data to change the top result", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("searchbox", { name: "Customer request" }).fill("I want something like Brie but stronger");
  await page.getByRole("button", { name: /Challenge 2/ }).click();
  await page.getByRole("button", { name: "With cider" }).click();
  await page.getByRole("button", { name: "Washed rind" }).click();
  await page.getByRole("button", { name: "In stock" }).click();

  await expect(page.locator("#search-status")).toHaveText("5 results");
  await expect(page.getByRole("heading", { level: 3, name: "Livarot" })).toBeVisible();
  await expect(page.locator("#scenario-insights")).toContainText("cider");
  await expect(page.locator("#audience-summary-chips")).toContainText("With cider");
});

test("signals in play stays synced and cumulative through challenges", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("searchbox", { name: "Customer request" }).fill("I want something like Brie but stronger");
  await page.getByRole("button", { name: /Challenge 1/ }).click();
  await page.getByRole("button", { name: "Keep it creamy" }).click();
  await page.getByRole("button", { name: "Cow's milk" }).click();

  await expect(page.locator("#scenario-insights")).toContainText("Explicit textures: creamy.");
  await expect(page.locator("#scenario-insights")).toContainText("Explicit milk types: cow.");

  await page.getByRole("button", { name: /Challenge 2/ }).click();
  await page.getByRole("button", { name: "With cider" }).click();

  await expect(page.locator("#scenario-insights")).toContainText("Explicit textures: creamy.");
  await expect(page.locator("#scenario-insights")).toContainText("Explicit milk types: cow.");
  await expect(page.locator("#scenario-insights")).toContainText("Context data: cider.");
  await expect(page.locator("#audience-summary-chips")).toContainText("Keep it creamy");
  await expect(page.locator("#audience-summary-chips")).toContainText("Cow's milk");
  await expect(page.locator("#audience-summary-chips")).toContainText("With cider");
});

test("challenge copy keeps hidden needs, data, and evaluation distinct", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: /Challenge 1/ }).click();
  await expect(page.locator("#insights-label")).toHaveText("Explicit requirements");
  await expect(page.locator("#scenario-description")).toContainText("customer really means");
  await expect(page.getByRole("button", { name: "Oozy center" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Washed rind" })).toHaveCount(0);

  await page.getByRole("button", { name: /Challenge 2/ }).click();
  await expect(page.locator("#insights-label")).toHaveText("Extra data in play");
  await expect(page.locator("#scenario-description")).toContainText("facts and constraints");
  await expect(page.getByRole("button", { name: "Washed rind" })).toBeVisible();
  await expect(page.getByRole("button", { name: "In stock" })).toBeVisible();

  await page.getByRole("button", { name: /Challenge 3/ }).click();
  await expect(page.locator("#insights-label")).toHaveText("Evaluation checks");
  await expect(page.locator("#scenario-description")).toContainText("already gathered");
  await expect(page.getByRole("button", { name: "In stock" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Explain why" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Backup option" })).toBeVisible();
});

test("expands a compact result row on demand", async ({ page }) => {
  await page.goto("/");

  const firstResult = page.locator("#search-results li").first();

  await expect(firstResult).toContainText("Brie de Meaux");
  await expect(firstResult).toContainText("More");

  await page.getByRole("button", { name: "More" }).first().click();
  await expect(firstResult).toContainText("Hide");
  await expect(firstResult).toContainText("Surface match only.");
});
