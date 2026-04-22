import { expect, test } from "@playwright/test";

const roomRunId = Date.now().toString(36);

function roomUrl(roomId: string, params?: URLSearchParams): string {
  const url = new URL("http://example.test/");
  url.searchParams.set("room", roomRunId + "-" + roomId);

  if (params) {
    for (const [key, value] of params.entries()) {
      url.searchParams.set(key, value);
    }
  }

  return url.pathname + url.search;
}

async function switchScenario(page: import("@playwright/test").Page, label: RegExp, title: string): Promise<void> {
  await page.getByRole("button", { name: label }).click();
  await expect(page.locator("#scenario-title")).toHaveText(title);
}

async function claimLecturer(page: import("@playwright/test").Page): Promise<void> {
  const claimButton = page.getByRole("button", { name: "Claim lecturer controls" });

  if (await claimButton.isVisible()) {
    await claimButton.click();
  }

  await expect(page.locator("#room-lecturer-status")).toContainText("This device controls the shared search query and challenge changes");
}

async function chooseAudienceOption(page: import("@playwright/test").Page, buttonLabel: string, summaryText = buttonLabel): Promise<void> {
  await page.getByRole("button", { name: buttonLabel }).click();
  await expect(page.locator("#audience-summary-chips")).toContainText(summaryText);
}

async function chooseContextOption(page: import("@playwright/test").Page, buttonLabel: string): Promise<void> {
  await page.getByRole("button", { name: buttonLabel }).click();
  await expect(page.locator("#context-summary-chips")).toContainText(buttonLabel);
}

test("renders the cheese demo home page", async ({ page }) => {
  await page.goto(roomUrl("e2e-home"));

  await expect(page.getByRole("heading", { level: 1, name: "French Cheese Shop" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Baseline/ })).toBeVisible();
  await expect(page.locator("#room-panel-toggle")).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#room-id-input")).toHaveValue(new RegExp("e2e-home$"));
  await expect(page.getByRole("searchbox", { name: "Customer request" })).toBeVisible();
  await expect(page.getByRole("searchbox", { name: "Customer request" })).toHaveValue("I want something like Brie, but stronger.");
  await expect(page.locator("#search-status")).toHaveText("5 results");
});

test("phone layout keeps the first search result visible", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(roomUrl("e2e-phone-home"));

  await expect(page.locator("#room-panel-toggle")).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#room-panel-body")).toBeHidden();
  await expect(page.locator("#search-status")).toHaveText("5 results");
  await expect(page.locator("#search-results > li").first()).toBeInViewport();
  await expect(page.getByRole("heading", { level: 3, name: "Brie de Meaux" })).toBeVisible();
});

test("shared room section can be folded and reopened", async ({ page }) => {
  await page.goto(roomUrl("e2e-room-panel"));

  await expect(page.locator("#room-id-input")).toBeVisible();

  await page.locator("#room-panel-toggle").click();

  await expect(page.locator("#room-panel-toggle")).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#room-panel-body")).toBeHidden();

  await page.locator("#room-panel-toggle").click();

  await expect(page.locator("#room-panel-toggle")).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#room-id-input")).toBeVisible();
});

test("serves the health endpoint", async ({ request }) => {
  const response = await request.get("/api/health");

  expect(response.ok()).toBe(true);
  await expect(response.json()).resolves.toEqual({
    ok: true,
    name: "french-cheese-shop-demo-worker",
    routes: ["/", "/api/search", "/api/session", "/api/session/live", "/api/health"],
  });
});

test("shows baseline results for a vague request", async ({ page }) => {
  await page.goto(roomUrl("e2e-baseline"));

  await claimLecturer(page);
  await page.getByRole("searchbox", { name: "Customer request" }).fill("I want something like Brie but stronger");

  await expect(page.locator("#search-status")).toHaveText("5 results");
  await expect(page.getByRole("heading", { level: 3, name: "Brie de Meaux" })).toBeVisible();
  await expect(page).toHaveURL(new RegExp("[?&]room=" + roomRunId + "-e2e-baseline"));
  await expect(page.getByRole("button", { name: "More" }).first()).toBeVisible();
});

test("context drawer stays closed by default and syncs its open state to the query", async ({ page }) => {
  await page.goto(roomUrl("e2e-context-default"));

  await expect(page.getByRole("button", { name: "Winter holiday" })).toBeHidden();
  await expect(page).not.toHaveURL(/[\?&]context=open/);

  await page.getByRole("button", { name: /Context/ }).click();

  await expect(page.getByRole("button", { name: "Winter holiday" })).toBeVisible();
  await expect(page).toHaveURL(/[\?&]context=open/);

  await page.getByRole("button", { name: /Context/ }).click();

  await expect(page.getByRole("button", { name: "Winter holiday" })).toBeHidden();
  await expect(page).not.toHaveURL(/[\?&]context=open/);
});

test("a stronger follow-up to livarot does not keep livarot on top", async ({ page }) => {
  await page.goto(roomUrl("e2e-livarot"));

  await claimLecturer(page);
  await page.getByRole("searchbox", { name: "Customer request" }).fill("I want something like Livarot, but stronger.");

  await expect(page.locator("#search-status")).toHaveText("5 results");
  await expect(page.locator("#search-results > li h3").first()).not.toHaveText("Livarot");
});

test("switching to challenge 2 uses audience data to change the top result", async ({ page }) => {
  await page.goto(roomUrl("e2e-challenge-2"));

  await claimLecturer(page);
  await page.getByRole("searchbox", { name: "Customer request" }).fill("I want something like Brie but stronger");
  await switchScenario(page, /Challenge 2/, "Challenge 2: Data Requirements");
  await chooseAudienceOption(page, "With cider");
  await chooseAudienceOption(page, "Washed rind");
  await chooseAudienceOption(page, "In stock");

  await expect(page.locator("#search-status")).toHaveText("5 results");
  await expect(page.getByRole("heading", { level: 3, name: "Livarot" })).toBeVisible();
  await expect(page.locator("#scenario-insights")).toContainText("cider");
  await expect(page.locator("#audience-summary-chips")).toContainText("With cider");
});

test("signals in play stays synced and cumulative through challenges", async ({ page }) => {
  await page.goto(roomUrl("e2e-signals"));

  await claimLecturer(page);
  await page.getByRole("searchbox", { name: "Customer request" }).fill("I want something like Brie but stronger");
  await switchScenario(page, /Challenge 1/, "Challenge 1: Hidden Needs");
  await chooseAudienceOption(page, "Keep it creamy");
  await chooseAudienceOption(page, "Cow's milk");

  await expect(page.locator("#scenario-insights")).toContainText("Explicit textures: creamy.");
  await expect(page.locator("#scenario-insights")).toContainText("Explicit milk types: cow.");

  await switchScenario(page, /Challenge 2/, "Challenge 2: Data Requirements");
  await chooseAudienceOption(page, "With cider");

  await expect(page.locator("#scenario-insights")).toContainText("Explicit textures: creamy.");
  await expect(page.locator("#scenario-insights")).toContainText("Explicit milk types: cow.");
  await expect(page.locator("#audience-summary-chips")).toContainText("Keep it creamy");
  await expect(page.locator("#audience-summary-chips")).toContainText("Cow's milk");
  await expect(page.locator("#audience-summary-chips")).toContainText("With cider");
});

test("challenge copy keeps hidden needs, data, and evaluation distinct", async ({ page }) => {
  await page.goto(roomUrl("e2e-copy"));

  await expect(page.getByRole("button", { name: /Context/ })).toBeVisible();
  await page.getByRole("button", { name: /Context/ }).click();
  await expect(page.getByRole("button", { name: "Winter holiday" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Holiday rush" })).toBeVisible();

  await claimLecturer(page);
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

test("context drawer enables the optional llm contrast mode", async ({ page }) => {
  await page.goto(roomUrl("e2e-llm"));

  await claimLecturer(page);
  await page.getByRole("searchbox", { name: "Customer request" }).fill("I want something like Brie but stronger");
  await switchScenario(page, /Challenge 2/, "Challenge 2: Data Requirements");
  await chooseAudienceOption(page, "With cider");
  await chooseAudienceOption(page, "Washed rind");
  await chooseAudienceOption(page, "In stock");

  const topBefore = await page.locator("#search-results > li h3").first().textContent();

  await page.getByRole("button", { name: /Context/ }).click();
  await expect(page.getByRole("button", { name: "Deterministic rules" })).toBeVisible();
  await expect(page.getByRole("button", { name: "LLM backend" })).toBeVisible();
  await page.getByRole("button", { name: "LLM backend" }).click();

  await expect(page.getByRole("button", { name: "LLM backend" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#scenario-insights")).toContainText("Backend mode: local LLM-style contrast.");
  await expect(page).toHaveURL(new RegExp("[?&]room=" + roomRunId + "-e2e-llm"));
  await expect(page.locator("#search-results > li h3").first()).not.toHaveText(topBefore || "");
});

test("season visibly changes challenge 2 recommendations", async ({ page }) => {
  await page.goto(roomUrl("e2e-season"));

  await page.getByRole("button", { name: /Context/ }).click();
  await claimLecturer(page);
  await page.getByRole("searchbox", { name: "Customer request" }).fill("I want something like Brie but stronger");
  await switchScenario(page, /Challenge 2/, "Challenge 2: Data Requirements");
  await chooseAudienceOption(page, "With cider");
  await chooseContextOption(page, "Summer picnic");

  await expect(page.locator("#search-results > li h3").first()).toHaveText("Camembert de Normandie");
  await expect(page.locator("#scenario-insights")).toContainText("Simulation context: summer season.");
  await expect(page.locator("#scenario-insights")).toContainText("Seasonal leaders:");
  await expect(page.locator("#scenario-insights")).toContainText("Camembert de Normandie");
  await expect(page.locator("#context-summary-chips")).toContainText("Summer picnic");

  const firstResult = page.locator("#search-results > li").first();
  await firstResult.getByRole("button", { name: "More" }).click({ force: true });
  await expect(firstResult).toContainText("Seasonal fit: summer picnic");

  await chooseContextOption(page, "Winter holiday");

  await expect(page.locator("#search-results > li h3").first()).toHaveText("Livarot");
  await expect(page.locator("#scenario-insights")).toContainText("Simulation context: winter season.");
  await expect(page.locator("#scenario-insights")).toContainText("Seasonal leaders:");
  await expect(page.locator("#scenario-insights")).toContainText("Livarot");
  await expect(page.locator("#context-summary-chips")).toContainText("Winter holiday");
});

test("shop demand still changes visible stock within world context", async ({ page }) => {
  await page.goto(roomUrl("e2e-stock"));

  await page.getByRole("button", { name: /Context/ }).click();
  await claimLecturer(page);
  await page.getByRole("searchbox", { name: "Customer request" }).fill("I want something like Brie but stronger");
  await switchScenario(page, /Challenge 2/, "Challenge 2: Data Requirements");
  await chooseAudienceOption(page, "With cider");
  await chooseContextOption(page, "Winter holiday");
  await chooseContextOption(page, "Holiday rush");

  await expect(page.locator("#scenario-insights")).toContainText("Simulation context: winter season and holiday-rush demand.");
  await expect(page.locator("#context-summary-chips")).toContainText("Winter holiday");
  await expect(page.locator("#context-summary-chips")).toContainText("Holiday rush");

  const livarotResult = page.locator("#search-results li").filter({
    has: page.getByRole("heading", { level: 3, name: "Livarot" }),
  });
  await livarotResult.getByRole("button", { name: "More" }).click({ force: true });
  await expect(livarotResult).toContainText("sold out");
  await expect(livarotResult).toContainText("Simulation stock: sold out");
});

test("world context can be set in baseline and carries into later challenges", async ({ page }) => {
  await page.goto(roomUrl("e2e-world-context"));

  await page.getByRole("button", { name: /Context/ }).click();
  await chooseContextOption(page, "Winter holiday");
  await chooseContextOption(page, "Holiday rush");

  await expect(page.locator("#context-summary-chips")).toContainText("Winter holiday");
  await expect(page.locator("#context-summary-chips")).toContainText("Holiday rush");
  await expect(page.locator("#scenario-insights")).toContainText("Simulation context: winter season and holiday-rush demand.");

  await claimLecturer(page);
  await switchScenario(page, /Challenge 2/, "Challenge 2: Data Requirements");
  await expect(page.locator("#context-summary-chips")).toContainText("Winter holiday");
  await expect(page.locator("#context-summary-chips")).toContainText("Holiday rush");
});

test("context drawer can reopen from the query state", async ({ page, request }) => {
  const roomId = roomRunId + "-e2e-context-open";

  await request.post("/api/session?room=" + roomId, {
    data: { type: "set-season", season: "winter" },
  });
  await request.post("/api/session?room=" + roomId, {
    data: { type: "set-backend", backend: "llm" },
  });

  await page.goto("/?room=" + roomId + "&context=open");

  await expect(page.getByRole("button", { name: "Winter holiday" })).toBeVisible();
  await expect(page.locator("#context-summary-chips")).toContainText("Winter holiday");
  await expect(page.getByRole("button", { name: "LLM backend" })).toHaveAttribute("aria-pressed", "true");
});

test("an expanded result stays open across evaluation updates", async ({ page }) => {
  await page.goto(roomUrl("e2e-expanded"));

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

  await claimLecturer(page);
  await page.getByRole("searchbox", { name: "Customer request" }).fill("I want something like Brie but stronger");
  await page.getByRole("button", { name: /Challenge 3/ }).click();

  await expect(page.locator("#search-status")).toHaveText("4 results");
  await page.locator("#room-panel-toggle").click();
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
  await page.goto(roomUrl("e2e-challenge-3"));

  await claimLecturer(page);
  await page.getByRole("searchbox", { name: "Customer request" }).fill("I want something like Brie but stronger");
  await switchScenario(page, /Challenge 3/, "Challenge 3: Evaluation");
  await chooseAudienceOption(page, "Mark a backup");
  await chooseAudienceOption(page, "Two finalists");
  await chooseAudienceOption(page, "Show why it fits");

  await expect(page.locator("#search-status")).toHaveText("2 results");
  await expect(page.locator("#search-results > li")).toHaveCount(2);
  await expect(page.locator("#search-results > li").first()).toContainText("Top pick");
  await expect(page.locator("#search-results > li").nth(1)).toContainText("Backup choice");
  await expect(page.locator("#scenario-insights")).toContainText("Showing two finalists");

  const topResult = page.locator("#search-results > li").first();
  await topResult.getByRole("button", { name: "More" }).click({ force: true });
  await expect(topResult).toContainText("Why it fits:");
  await expect(topResult).toContainText("Backup choice is visible");
});

test("show why it fits explains challenge 3 results without reordering them", async ({ page }) => {
  await page.goto(roomUrl("e2e-why"));

  await claimLecturer(page);
  await page.getByRole("searchbox", { name: "Customer request" }).fill("I want something like Brie but stronger");
  await switchScenario(page, /Challenge 3/, "Challenge 3: Evaluation");
  await expect(page.locator("#search-status")).toHaveText("4 results");

  const namesBefore = await page.locator("#search-results > li h3").allTextContents();

  await chooseAudienceOption(page, "Show why it fits");

  await expect(page.locator("#search-status")).toHaveText("4 results");
  await expect(page.locator("#search-results > li h3")).toHaveText(namesBefore);
  await expect(page.locator("#scenario-insights")).toContainText("explain the current ranking instead of changing it");

  const topResult = page.locator("#search-results > li").first();
  await topResult.getByRole("button", { name: "More" }).click({ force: true });
  await expect(topResult).toContainText("This explanation follows the same ranking signals already in play");
});

test("expands a compact result row on demand", async ({ page }) => {
  await page.goto(roomUrl("e2e-expand"));

  const firstResult = page.locator("#search-results li").first();

  await expect(firstResult).toContainText("Brie de Meaux");
  await expect(firstResult).toContainText("More");

  await page.getByRole("button", { name: "More" }).first().click();
  await expect(firstResult).toContainText("Hide");
  await expect(firstResult).toContainText("Surface match only.");
});

test("two pages in the same room stay synchronized", async ({ browser }) => {
  const roomId = "e2e-multiplayer-sync";
  const context = await browser.newContext();
  const pageA = await context.newPage();
  const pageB = await context.newPage();

  await pageA.goto(roomUrl(roomId));
  await pageB.goto(roomUrl(roomId));

  await expect(pageA.locator("#room-participant-count")).toHaveText("2 participants");
  await expect(pageB.locator("#room-participant-count")).toHaveText("2 participants");

  await claimLecturer(pageA);
  await switchScenario(pageA, /Challenge 2/, "Challenge 2: Data Requirements");
  await chooseAudienceOption(pageA, "With cider");

  await expect(pageB.locator("#scenario-title")).toHaveText("Challenge 2: Data Requirements");
  await expect(pageB.locator("#audience-summary-chips")).toContainText("With cider");

  await pageA.getByRole("searchbox", { name: "Customer request" }).fill("I want something like Brie but stronger");
  await expect(pageB.getByRole("searchbox", { name: "Customer request" })).toHaveValue("I want something like Brie but stronger");

  await context.close();
});

test("participants cannot change the active challenge after the lecturer claims it", async ({ browser }) => {
  const roomId = "e2e-lecturer-lock";
  const context = await browser.newContext();
  const lecturerPage = await context.newPage();
  const participantPage = await context.newPage();

  await lecturerPage.goto(roomUrl(roomId));
  await participantPage.goto(roomUrl(roomId));

  await claimLecturer(lecturerPage);
  await switchScenario(lecturerPage, /Challenge 2/, "Challenge 2: Data Requirements");

  await expect(participantPage.getByRole("button", { name: /Challenge 3/ })).toHaveAttribute("aria-disabled", "true");
  await expect(participantPage.locator("#scenario-title")).toHaveText("Challenge 2: Data Requirements");
  await expect(participantPage.locator("#room-lecturer-status")).toContainText(
    "The shared search query and challenge changes are locked to the lecturer device for this room.",
  );

  await context.close();
});

test("participants cannot change the shared query after the lecturer claims it", async ({ browser }) => {
  const roomId = "e2e-lecturer-query-lock";
  const context = await browser.newContext();
  const lecturerPage = await context.newPage();
  const participantPage = await context.newPage();

  await lecturerPage.goto(roomUrl(roomId));
  await participantPage.goto(roomUrl(roomId));

  await claimLecturer(lecturerPage);
  await lecturerPage.getByRole("searchbox", { name: "Customer request" }).fill("I want something like Livarot, but stronger.");

  await expect(participantPage.getByRole("searchbox", { name: "Customer request" })).toHaveValue(
    "I want something like Livarot, but stronger.",
  );
  await expect(participantPage.getByRole("searchbox", { name: "Customer request" })).not.toBeEditable();

  await context.close();
});
