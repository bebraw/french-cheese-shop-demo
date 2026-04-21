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

  await expect(page.getByRole("button", { name: /World Context/ })).toBeVisible();
  await page.getByRole("button", { name: /World Context/ }).click();
  await expect(page.getByRole("button", { name: "Winter holiday" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Holiday rush" })).toBeVisible();

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
  await expect(page.locator("#scenario-description")).toContainText("visibly prove");
  await expect(page.getByRole("button", { name: "In stock" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Show why it fits" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark a backup" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Two finalists" })).toBeVisible();
});

test("season visibly changes challenge 2 recommendations", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: /World Context/ }).click();
  await page.getByRole("searchbox", { name: "Customer request" }).fill("I want something like Brie but stronger");
  await page.getByRole("button", { name: /Challenge 2/ }).click();
  await page.getByRole("button", { name: "With cider" }).click();
  await page.getByRole("button", { name: "Summer picnic" }).click();

  await expect(page.locator("#search-results > li h3").first()).toHaveText("Camembert de Normandie");
  await expect(page.locator("#scenario-insights")).toContainText("Simulation context: summer season.");
  await expect(page.locator("#scenario-insights")).toContainText("Seasonal leaders:");
  await expect(page.locator("#scenario-insights")).toContainText("Camembert de Normandie");
  await expect(page.locator("#context-summary-chips")).toContainText("Summer picnic");

  const firstResult = page.locator("#search-results > li").first();
  await firstResult.getByRole("button", { name: "More" }).click();
  await expect(firstResult).toContainText("Seasonal fit: summer picnic");

  await page.getByRole("button", { name: "Winter holiday" }).click();

  await expect(page.locator("#search-results > li h3").first()).toHaveText("Livarot");
  await expect(page.locator("#scenario-insights")).toContainText("Simulation context: winter season.");
  await expect(page.locator("#scenario-insights")).toContainText("Seasonal leaders:");
  await expect(page.locator("#scenario-insights")).toContainText("Livarot");
  await expect(page.locator("#context-summary-chips")).toContainText("Winter holiday");
});

test("shop demand still changes visible stock within world context", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: /World Context/ }).click();
  await page.getByRole("searchbox", { name: "Customer request" }).fill("I want something like Brie but stronger");
  await page.getByRole("button", { name: /Challenge 2/ }).click();
  await page.getByRole("button", { name: "With cider" }).click();
  await page.getByRole("button", { name: "Winter holiday" }).click();
  await page.getByRole("button", { name: "Holiday rush" }).click();

  await expect(page.locator("#scenario-insights")).toContainText("Simulation context: winter season and holiday-rush demand.");
  await expect(page.locator("#context-summary-chips")).toContainText("Winter holiday");
  await expect(page.locator("#context-summary-chips")).toContainText("Holiday rush");

  const livarotResult = page.locator("#search-results li").filter({
    has: page.getByRole("heading", { level: 3, name: "Livarot" }),
  });
  await livarotResult.getByRole("button", { name: "More" }).click();
  await expect(livarotResult).toContainText("sold out");
  await expect(livarotResult).toContainText("Simulation stock: sold out");
});

test("world context can be set in baseline and carries into later challenges", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: /World Context/ }).click();
  await page.getByRole("button", { name: "Winter holiday" }).click();
  await page.getByRole("button", { name: "Holiday rush" }).click();

  await expect(page.locator("#context-summary-chips")).toContainText("Winter holiday");
  await expect(page.locator("#context-summary-chips")).toContainText("Holiday rush");
  await expect(page.locator("#scenario-insights")).toContainText("Simulation context: winter season and holiday-rush demand.");

  await page.getByRole("button", { name: /Challenge 2/ }).click();
  await expect(page.locator("#context-summary-chips")).toContainText("Winter holiday");
  await expect(page.locator("#context-summary-chips")).toContainText("Holiday rush");
});

test("an expanded result stays open across evaluation updates", async ({ page }) => {
  await page.goto("/");

  const persistentResultNames = await page.evaluate(async () => {
    const makeRequest = async (audience = "") => {
      const response = await fetch(
        "/api/search?q=" +
          encodeURIComponent("I want something like Brie but stronger") +
          "&scenario=" +
          encodeURIComponent("challenge-3") +
          "&audience=" +
          encodeURIComponent(audience),
      );
      return response.json();
    };

    const [baselinePayload, updatedPayload] = await Promise.all([makeRequest(), makeRequest("explain why it fits")]);

    return baselinePayload.results
      .map((result: { name: string }) => result.name)
      .filter((name: string) => updatedPayload.results.some((result: { name: string }) => result.name === name));
  });
  const resultName = persistentResultNames[0];

  await page.getByRole("searchbox", { name: "Customer request" }).fill("I want something like Brie but stronger");
  await page.getByRole("button", { name: /Challenge 3/ }).click();

  await expect(page.getByRole("heading", { level: 3, name: resultName })).toBeVisible();

  const persistentResult = page.locator("#search-results li").filter({ has: page.getByRole("heading", { level: 3, name: resultName }) });
  const firstToggle = persistentResult.getByRole("button", { name: "More" });

  await firstToggle.click();
  await expect(persistentResult.getByRole("button", { name: "Hide" })).toBeVisible();

  await page.getByRole("button", { name: "Show why it fits" }).click();

  await expect(page.locator("#search-status")).toHaveText("4 results");
  await expect(page.getByRole("heading", { level: 3, name: resultName })).toBeVisible();
  await expect(persistentResult.getByRole("button", { name: "Hide" })).toBeVisible();
});

test("challenge 3 options visibly change the results", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("searchbox", { name: "Customer request" }).fill("I want something like Brie but stronger");
  await page.getByRole("button", { name: /Challenge 3/ }).click();
  await page.getByRole("button", { name: "Mark a backup" }).click();
  await page.getByRole("button", { name: "Two finalists" }).click();
  await page.getByRole("button", { name: "Show why it fits" }).click();

  await expect(page.locator("#search-status")).toHaveText("2 results");
  await expect(page.locator("#search-results > li")).toHaveCount(2);
  await expect(page.locator("#search-results > li").first()).toContainText("Top pick");
  await expect(page.locator("#search-results > li").nth(1)).toContainText("Backup choice");
  await expect(page.locator("#scenario-insights")).toContainText("Showing two finalists");

  const topResult = page.locator("#search-results > li").first();
  await topResult.getByRole("button", { name: "More" }).click();
  await expect(topResult).toContainText("Why it fits:");
  await expect(topResult).toContainText("Backup choice is visible");
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
