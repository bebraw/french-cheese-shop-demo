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

test("expands a compact result row on demand", async ({ page }) => {
  await page.goto("/");

  const firstResult = page.locator("#search-results li").first();

  await expect(firstResult).toContainText("Brie de Meaux");
  await expect(firstResult).toContainText("Hide");

  await page.getByRole("button", { name: "Hide" }).first().click();
  await expect(firstResult).toContainText("More");

  await page.getByRole("button", { name: "More" }).first().click();
  await expect(firstResult).toContainText("Hide");
  await expect(firstResult).toContainText("Surface match only.");
});
