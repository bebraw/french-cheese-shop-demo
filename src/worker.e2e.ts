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
  await page.locator("[data-scenario]").filter({ hasText: label }).click();
  await expect(page.locator("#scenario-title")).toHaveText(title);
}

async function claimLecturer(page: import("@playwright/test").Page): Promise<void> {
  const claimButton = page.getByRole("button", { name: "Claim lecturer controls" });

  if (await claimButton.isVisible()) {
    await claimButton.click();
  }

  await expect(page.locator("#room-lecturer-status")).toContainText(
    "This device controls the shared search query, world context, and challenge changes",
  );
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function audienceVoteButton(page: import("@playwright/test").Page, buttonLabel: string) {
  return page.getByRole("button", { name: new RegExp("^" + escapeRegex(buttonLabel) + " · \\d+ votes?$") });
}

async function chooseAudienceOption(page: import("@playwright/test").Page, buttonLabel: string, summaryText = buttonLabel): Promise<void> {
  await audienceVoteButton(page, buttonLabel).click();
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
  await expect(page.getByRole("button", { name: /Challenge 1/ })).toHaveCount(0);
  await expect(page.locator("#scenario-next-button")).toBeHidden();
  await expect(page.locator("#room-panel-toggle")).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#room-id-input")).toHaveValue(new RegExp("e2e-home$"));
  await expect(page.getByRole("button", { name: "Join room" })).toBeHidden();
  await page.locator("#room-id-input").fill(roomRunId + "-e2e-home-other");
  await expect(page.getByRole("button", { name: "Join room" })).toBeVisible();
  await expect(page.getByRole("searchbox", { name: "Customer request" })).toBeVisible();
  await expect(page.getByRole("searchbox", { name: "Customer request" })).toHaveValue("I want something like Brie, but stronger.");
  await expect(page.locator("#teaching-focus-panel")).toBeHidden();
  await expect(page.locator("#search-status")).toHaveText("5 results");
});

test("phone layout keeps the first search result visible", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(roomUrl("e2e-phone-home"));

  await expect(page.locator("#room-panel-toggle")).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#room-panel-body")).toBeHidden();
  await expect(page.locator("#teaching-focus-panel")).toBeHidden();
  await expect(page.locator("#teaching-outcome")).toHaveText("Interpret vague requests");
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

test("lecturer reveals challenges one step at a time", async ({ browser }) => {
  const roomId = "e2e-reveal-challenges";
  const context = await browser.newContext();
  const lecturerPage = await context.newPage();
  const participantPage = await context.newPage();

  await lecturerPage.goto(roomUrl(roomId));
  await participantPage.goto(roomUrl(roomId));

  await expect(participantPage.getByRole("button", { name: /Challenge 1/ })).toHaveCount(0);

  await claimLecturer(lecturerPage);
  await expect(lecturerPage.locator("#scenario-next-button")).toHaveText("Next: Challenge 1");

  await lecturerPage.locator("#scenario-next-button").click();

  await expect(lecturerPage.locator("#scenario-title")).toHaveText("Challenge 1: Hidden Needs");
  await expect(participantPage.locator("#scenario-title")).toHaveText("Challenge 1: Hidden Needs");
  await expect(participantPage.getByRole("button", { name: /Challenge 1/ })).toBeVisible();
  await expect(participantPage.getByRole("button", { name: /Challenge 2/ })).toHaveCount(0);

  await lecturerPage.locator("#scenario-next-button").click();

  await expect(participantPage.locator("#scenario-title")).toHaveText("Challenge 2: Data Requirements");
  await expect(participantPage.getByRole("button", { name: /Challenge 2/ })).toBeVisible();
  await expect(participantPage.getByRole("button", { name: /Challenge 3/ })).toHaveCount(0);

  await context.close();
});

test("lecturer can release room controls", async ({ browser }) => {
  const roomId = "e2e-release-room";
  const context = await browser.newContext();
  const lecturerPage = await context.newPage();
  const participantPage = await context.newPage();

  await lecturerPage.goto(roomUrl(roomId));
  await participantPage.goto(roomUrl(roomId));

  await claimLecturer(lecturerPage);
  await expect(participantPage.getByRole("button", { name: "Claim lecturer controls" })).toHaveCount(0);

  await lecturerPage.getByRole("button", { name: "Release room" }).click();

  await expect(lecturerPage.locator("#room-lecturer-status")).toContainText("stay unlocked");
  await expect(participantPage.getByRole("button", { name: "Claim lecturer controls" })).toBeVisible();

  await context.close();
});

test("lecturer focus mode reduces visual noise for the five-minute flow", async ({ browser }) => {
  const roomId = "e2e-focus-mode";
  const context = await browser.newContext();
  const lecturerPage = await context.newPage();
  const participantPage = await context.newPage();

  await lecturerPage.goto(roomUrl(roomId));
  await participantPage.goto(roomUrl(roomId));

  await claimLecturer(lecturerPage);
  await lecturerPage.getByRole("button", { name: "Focus mode" }).click();

  await expect(lecturerPage.getByRole("button", { name: "Focus mode" })).toHaveAttribute("aria-pressed", "true");
  await expect(lecturerPage.locator("#room-lecturer-status")).toContainText("all challenges remain available");
  await expect(lecturerPage).toHaveURL(/[\?&]simple=1/);
  await expect(lecturerPage.getByRole("button", { name: /Context/ })).toBeHidden();
  await expect(lecturerPage.getByRole("button", { name: /Challenge 2/ })).toBeVisible();
  await expect(lecturerPage.getByRole("button", { name: /Challenge 3/ })).toBeVisible();
  await expect(participantPage.getByRole("button", { name: /Context/ })).toBeHidden();

  await lecturerPage.locator("#scenario-next-button").click();

  await expect(lecturerPage.locator("#scenario-title")).toHaveText("Challenge 1: Hidden Needs");
  await expect(lecturerPage.locator("#scenario-next-button")).toHaveText("Next: Challenge 2");
  await expect(lecturerPage.locator("#audience-summary-empty")).toHaveText(
    "No hidden need selected yet. Results still use the baseline ranking.",
  );
  await expect(lecturerPage.locator("#audience-custom-field")).toBeVisible();
  await expect(participantPage.locator("#audience-custom-field")).toBeVisible();
  await expect(audienceVoteButton(lecturerPage, "Keep it creamy")).toBeVisible();
  await expect(audienceVoteButton(lecturerPage, "Oozy center")).toBeVisible();
  await expect(audienceVoteButton(lecturerPage, "Cow's milk")).toBeVisible();
  await expect(audienceVoteButton(lecturerPage, "Goat's milk")).toBeVisible();
  await expect(audienceVoteButton(lecturerPage, "Sheep's milk")).toBeVisible();
  await expect(audienceVoteButton(lecturerPage, "Mixed milk ok")).toBeVisible();
  await expect(audienceVoteButton(lecturerPage, "Much stronger")).toBeVisible();
  await expect(audienceVoteButton(participantPage, "Sheep's milk")).toBeVisible();
  await expect(audienceVoteButton(participantPage, "Mixed milk ok")).toBeVisible();
  await expect(audienceVoteButton(participantPage, "Much stronger")).toBeVisible();

  await lecturerPage.locator("#scenario-next-button").click();
  await expect(lecturerPage.locator("#scenario-title")).toHaveText("Challenge 2: Data Requirements");
  await expect(lecturerPage.locator("#scenario-next-button")).toHaveText("Next: Challenge 3");
  await expect(audienceVoteButton(lecturerPage, "Pairing: Burgundy")).toBeVisible();
  await expect(audienceVoteButton(participantPage, "Pairing: Burgundy")).toBeVisible();
  await expect(audienceVoteButton(lecturerPage, "Price cap: under EUR 12")).toBeVisible();
  await expect(audienceVoteButton(participantPage, "Price cap: under EUR 12")).toBeVisible();

  await lecturerPage.locator("#scenario-next-button").click();
  await expect(lecturerPage.locator("#scenario-title")).toHaveText("Challenge 3: Evaluation");
  await expect(audienceVoteButton(lecturerPage, "Show why it fits")).toBeVisible();
  await expect(audienceVoteButton(participantPage, "Show why it fits")).toBeVisible();

  await context.close();
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
  await expect(page.locator("#teaching-focus-panel")).toBeVisible();
  await page.getByRole("searchbox", { name: "Customer request" }).fill("I want something like Brie but stronger");

  await expect(page.locator("#search-status")).toHaveText("5 results");
  await expect(page.locator("#change-strip-items")).toContainText("Before: vague request only");
  await expect(page.locator("#change-strip-items")).toContainText("After: no extra requirements yet");
  await expect(page.locator("#change-strip-items")).toContainText("Current lead");
  await expect(page.locator("#scenario-insights")).toContainText("Deliberate failure");
  await expect(page.getByRole("heading", { level: 3, name: "Brie de Meaux" })).toBeVisible();
  await expect(page).toHaveURL(new RegExp("[?&]room=" + roomRunId + "-e2e-baseline"));
  await expect(page.getByRole("button", { name: "More" }).first()).toBeVisible();

  await page.getByRole("searchbox", { name: "Customer request" }).fill("");

  await expect(page.locator("#search-status")).toHaveText("");
  await expect(page.locator("#change-strip-items")).toBeEmpty();
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
  await chooseAudienceOption(page, "Pairing: cider");
  await chooseAudienceOption(page, "Catalog style: washed rind");
  await chooseAudienceOption(page, "Availability: in stock");

  await expect(page.locator("#search-status")).toHaveText("5 results");
  await expect(page.getByRole("heading", { level: 3, name: "Livarot" })).toBeVisible();
  await expect(page.locator("#scenario-insights")).toContainText("cider");
  await expect(page.locator("#audience-summary-chips")).toContainText("Room chose: Pairing data: Pairing: cider");
  await expect(page.locator("#requirements-learned")).toContainText("Operational constraints");
  await expect(page.locator("#requirements-learned")).toContainText("Pairing: cider");
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
  await chooseAudienceOption(page, "Pairing: cider");

  await expect(page.locator("#scenario-insights")).toContainText("Explicit textures: creamy.");
  await expect(page.locator("#scenario-insights")).toContainText("Explicit milk types: cow.");
  await expect(page.locator("#audience-summary-chips")).toContainText("Keep it creamy");
  await expect(page.locator("#audience-summary-chips")).toContainText("Cow's milk");
  await expect(page.locator("#audience-summary-chips")).toContainText("Pairing: cider");
});

test("audience votes show counts and lecturer override wins one option group", async ({ browser }) => {
  const roomId = "e2e-vote-override";
  const context = await browser.newContext();
  const lecturerPage = await context.newPage();
  const participantPage = await context.newPage();
  const secondParticipantPage = await context.newPage();

  await lecturerPage.goto(roomUrl(roomId));
  await participantPage.goto(roomUrl(roomId));
  await secondParticipantPage.goto(roomUrl(roomId));

  await claimLecturer(lecturerPage);
  await expect(participantPage.locator("#room-panel-summary")).toBeHidden();
  await switchScenario(lecturerPage, /Challenge 1/, "Challenge 1: Hidden Needs");

  await audienceVoteButton(participantPage, "Cow's milk").click();
  await audienceVoteButton(secondParticipantPage, "Cow's milk").click();

  await expect(lecturerPage.locator("#audience-summary-chips")).toContainText("Cow's milk");
  await expect(lecturerPage.locator("#audience-summary-chips")).toContainText("2 votes");
  await expect(audienceVoteButton(participantPage, "Cow's milk")).toContainText("2 votes");

  await audienceVoteButton(lecturerPage, "Goat's milk").click();

  await expect(lecturerPage.locator("#audience-summary-chips")).toContainText("Goat's milk");
  await expect(lecturerPage.locator("#audience-summary-chips")).toContainText("lecturer override");
  await expect(lecturerPage.getByRole("button", { name: /Goat's milk · 0 votes · Lecturer choice/ })).toBeVisible();
  await expect(participantPage.locator("#audience-summary-chips")).toContainText("Goat's milk");
  await expect(participantPage.locator("#scenario-insights")).toContainText("Explicit milk types: goat.");

  await lecturerPage.getByRole("button", { name: "Clear challenge votes" }).click();
  await expect(lecturerPage.locator("#audience-summary-empty")).toHaveText(
    "No hidden need selected yet. Results still use the baseline ranking.",
  );
  await expect(participantPage.locator("#audience-summary-empty")).toHaveText(
    "No hidden need selected yet. Results still use the baseline ranking.",
  );
  await expect(audienceVoteButton(participantPage, "Cow's milk")).toHaveAttribute("aria-pressed", "false");

  await context.close();
});

test("lecturer can completely reset a shared room", async ({ browser }) => {
  const roomId = "e2e-reset-room";
  const context = await browser.newContext();
  const lecturerPage = await context.newPage();
  const participantPage = await context.newPage();

  await lecturerPage.goto(roomUrl(roomId));
  await participantPage.goto(roomUrl(roomId));

  await claimLecturer(lecturerPage);
  await lecturerPage.getByRole("searchbox", { name: "Customer request" }).fill("Custom demo query");
  await switchScenario(lecturerPage, /Challenge 1/, "Challenge 1: Hidden Needs");
  await audienceVoteButton(participantPage, "Cow's milk").click();

  await expect(lecturerPage.locator("#audience-summary-chips")).toContainText("Cow's milk");
  await expect(lecturerPage.getByRole("searchbox", { name: "Customer request" })).toHaveValue("Custom demo query");

  lecturerPage.once("dialog", async (dialog) => {
    await dialog.accept();
  });
  await lecturerPage.getByRole("button", { name: "Reset room" }).click();

  await expect(lecturerPage.locator("#scenario-title")).toHaveText("Baseline");
  await expect(lecturerPage.getByRole("searchbox", { name: "Customer request" })).toHaveValue("I want something like Brie, but stronger.");
  await expect(lecturerPage.locator("#room-lecturer-status")).toContainText("This device controls");
  await expect(lecturerPage.locator("#room-ready-status")).toContainText("baseline loaded");
  await expect(lecturerPage.locator("#teaching-focus-panel")).toBeVisible();
  await expect(participantPage.locator("#scenario-title")).toHaveText("Baseline");
  await expect(participantPage.getByRole("button", { name: /Challenge 1/ })).toHaveCount(0);

  await lecturerPage.locator("#scenario-next-button").click();
  await expect(participantPage.locator("#scenario-title")).toHaveText("Challenge 1: Hidden Needs");
  await expect(audienceVoteButton(participantPage, "Cow's milk")).toBeVisible();

  await context.close();
});

test("challenge copy keeps hidden needs, data, and evaluation distinct", async ({ page }) => {
  await page.goto(roomUrl("e2e-copy"));

  await expect(page.locator("#teaching-focus-panel")).toBeHidden();
  await expect(page.locator("#teaching-outcome")).toHaveText("Interpret vague requests");
  await expect(page.locator("#teaching-question")).toContainText("like Brie");

  await expect(page.getByRole("button", { name: /Context/ })).toBeVisible();
  await page.getByRole("button", { name: /Context/ }).click();
  await expect(page.getByRole("button", { name: "Winter holiday" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Holiday rush" })).toBeVisible();

  await claimLecturer(page);
  await expect(page.locator("#teaching-focus-panel")).toBeVisible();
  await page.locator("[data-scenario='challenge-1']").click();
  await expect(page.locator("#insights-label")).toHaveText("Explicit requirements");
  await expect(page.locator("#audience-prompt")).toHaveText("Now: choose the hidden need that should become explicit.");
  await expect(page.locator("#scenario-description")).toContainText("customer really means");
  await expect(page.locator("#teaching-outcome")).toHaveText("Interpret vague requests");
  await expect(page.locator("#teaching-notice")).toContainText("meaning became explicit");
  await expect(page.locator("#teaching-stop-here")).toContainText("Stop here if time is short");
  await expect(audienceVoteButton(page, "Oozy center")).toBeVisible();
  await expect(audienceVoteButton(page, "Catalog style: washed rind")).toHaveCount(0);

  await page.locator("[data-scenario='challenge-2']").click();
  await expect(page.locator("#insights-label")).toHaveText("Extra data in play");
  await expect(page.locator("#audience-prompt")).toHaveText("Now: choose the data or operating constraint the system should use.");
  await expect(page.locator("#scenario-description")).toContainText("facts and constraints");
  await expect(page.locator("#teaching-outcome")).toHaveText("Specify domain and operational context");
  await expect(page.locator("#teaching-focus-copy")).toContainText("domain and shop context");
  await expect(page.locator("#teaching-pause")).toContainText("missing fact");
  await expect(page.locator("#teaching-timebox")).toContainText("45 sec vote");
  await expect(page.locator("#teaching-stop-here")).toContainText("user meaning and operating context");
  await expect(audienceVoteButton(page, "Catalog style: washed rind")).toBeVisible();
  await expect(audienceVoteButton(page, "Availability: in stock")).toBeVisible();

  await page.locator("[data-scenario='challenge-3']").click();
  await expect(page.locator("#insights-label")).toHaveText("Evaluation checks");
  await expect(page.locator("#audience-prompt")).toHaveText("Now: choose what the results should visibly prove.");
  await expect(page.locator("#scenario-description")).toContainText("visibly prove");
  await expect(page.locator("#teaching-outcome")).toHaveText("Evaluate ambiguity");
  await expect(page.locator("#teaching-question")).toContainText("good answer visibly prove");
  await expect(page.locator("#teaching-pause")).toContainText("ready to use");
  await expect(page.locator("#teaching-timebox")).toContainText("Optional 60 sec coda");
  await expect(audienceVoteButton(page, "Availability: in stock")).toHaveCount(0);
  await expect(audienceVoteButton(page, "Show why it fits")).toBeVisible();
  await expect(audienceVoteButton(page, "Show trade-offs")).toBeVisible();
  await expect(audienceVoteButton(page, "Two finalists")).toBeVisible();
});

test("context drawer enables the optional llm contrast mode", async ({ page }) => {
  await page.goto(roomUrl("e2e-llm"));

  await claimLecturer(page);
  await page.getByRole("searchbox", { name: "Customer request" }).fill("I want something like Brie but stronger");
  await switchScenario(page, /Challenge 2/, "Challenge 2: Data Requirements");
  await chooseAudienceOption(page, "Pairing: cider");
  await chooseAudienceOption(page, "Catalog style: washed rind");
  await chooseAudienceOption(page, "Availability: in stock");

  const topBefore = await page.locator("#search-results > li h3").first().textContent();

  await page.getByRole("button", { name: /Context/ }).click();
  await expect(page.getByRole("button", { name: "Deterministic rules" })).toBeVisible();
  await expect(page.getByRole("button", { name: "LLM-style ranking" })).toBeVisible();
  await page.getByRole("button", { name: "LLM-style ranking" }).click();

  await expect(page.getByRole("button", { name: "LLM-style ranking" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#scenario-insights")).toContainText("Ranking mode: local LLM-style contrast.");
  await expect(page).toHaveURL(new RegExp("[?&]room=" + roomRunId + "-e2e-llm"));
  await expect(page.locator("#search-results > li h3").first()).not.toHaveText(topBefore || "");
});

test("season visibly changes challenge 2 recommendations", async ({ page }) => {
  await page.goto(roomUrl("e2e-season"));

  await page.getByRole("button", { name: /Context/ }).click();
  await claimLecturer(page);
  await page.getByRole("searchbox", { name: "Customer request" }).fill("I want something like Brie but stronger");
  await switchScenario(page, /Challenge 2/, "Challenge 2: Data Requirements");
  await chooseAudienceOption(page, "Pairing: cider");
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
  await chooseAudienceOption(page, "Pairing: cider");
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
  await claimLecturer(page);
  await chooseContextOption(page, "Winter holiday");
  await chooseContextOption(page, "Holiday rush");

  await expect(page.locator("#context-summary-chips")).toContainText("Winter holiday");
  await expect(page.locator("#context-summary-chips")).toContainText("Holiday rush");
  await expect(page.locator("#scenario-insights")).toContainText("Simulation context: winter season and holiday-rush demand.");

  await switchScenario(page, /Challenge 2/, "Challenge 2: Data Requirements");
  await expect(page.locator("#context-summary-chips")).toContainText("Winter holiday");
  await expect(page.locator("#context-summary-chips")).toContainText("Holiday rush");
});

test("context drawer can reopen from the query state", async ({ page, request }) => {
  const roomId = roomRunId + "-e2e-context-open";
  const presenterToken = "lecturer-" + roomRunId + "-context-open";

  await request.post("/api/session?room=" + roomId, {
    data: { type: "claim-presenter" },
    headers: { "x-demo-presenter-token": presenterToken },
  });

  await request.post("/api/session?room=" + roomId, {
    data: { type: "set-season", season: "winter" },
    headers: { "x-demo-presenter-token": presenterToken },
  });
  await request.post("/api/session?room=" + roomId, {
    data: { type: "set-backend", backend: "llm" },
  });

  await page.goto("/?room=" + roomId + "&context=open");

  await expect(page.getByRole("button", { name: "Winter holiday" })).toBeVisible();
  await expect(page.locator("#context-summary-chips")).toContainText("Winter holiday");
  await expect(page.getByRole("button", { name: "LLM-style ranking" })).toHaveAttribute("aria-pressed", "true");
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

  await audienceVoteButton(page, "Show why it fits").click();

  await expect(page.locator("#search-status")).toHaveText("4 results");
  await expect(page.getByRole("heading", { level: 3, name: resultName })).toBeVisible();
  await expect(persistentResult.getByRole("button", { name: "Hide" })).toBeVisible();
});

test("challenge 3 options visibly change the results", async ({ page }) => {
  await page.goto(roomUrl("e2e-challenge-3"));

  await claimLecturer(page);
  await page.getByRole("searchbox", { name: "Customer request" }).fill("I want something like Brie but stronger");
  await switchScenario(page, /Challenge 3/, "Challenge 3: Evaluation");
  await chooseAudienceOption(page, "Show trade-offs");
  await chooseAudienceOption(page, "Two finalists");
  await chooseAudienceOption(page, "Show why it fits");

  await expect(page.locator("#search-status")).toHaveText("2 results");
  await expect(page.locator("#search-results > li")).toHaveCount(2);
  await expect(page.locator("#search-results > li").first()).toContainText("Top pick");
  await expect(page.locator("#scenario-insights")).toContainText("Showing two finalists");

  const topResult = page.locator("#search-results > li").first();
  await topResult.getByRole("button", { name: "More" }).click({ force: true });
  await expect(topResult).toContainText("Why it fits:");
  await expect(topResult).toContainText("Trade-off");
  await expect(topResult).toContainText("Gains:");
  await expect(topResult).toContainText("Gives up:");
  await expect(topResult).toContainText("Trade-off is visible");
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
  await expect(pageA.locator("#teaching-focus-panel")).toBeVisible();
  await expect(pageB.locator("#teaching-focus-panel")).toBeHidden();
  await switchScenario(pageA, /Challenge 2/, "Challenge 2: Data Requirements");
  await chooseAudienceOption(pageA, "Pairing: cider");

  await expect(pageB.locator("#scenario-title")).toHaveText("Challenge 2: Data Requirements");
  await expect(pageB.locator("#audience-summary-chips")).toContainText("Pairing: cider");

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

  await expect(participantPage.getByRole("button", { name: /Challenge 3/ })).toHaveCount(0);
  await expect(participantPage.locator("#scenario-title")).toHaveText("Challenge 2: Data Requirements");
  await expect(participantPage.locator("#room-lecturer-controls-panel")).toBeHidden();
  await expect(participantPage.getByRole("button", { name: "Claim lecturer controls" })).toBeHidden();
  await expect(participantPage.getByRole("button", { name: "Focus mode" })).toBeHidden();
  await expect(participantPage.getByRole("button", { name: "Copy private lecturer link" })).toBeHidden();
  await expect(participantPage.getByRole("button", { name: "Reset room" })).toBeHidden();
  await expect(participantPage.getByRole("button", { name: "Join room" })).toBeHidden();

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

test("participants cannot change world context after the lecturer claims it", async ({ browser }) => {
  const roomId = "e2e-lecturer-context-lock";
  const context = await browser.newContext();
  const lecturerPage = await context.newPage();
  const participantPage = await context.newPage();

  await lecturerPage.goto(roomUrl(roomId));
  await participantPage.goto(roomUrl(roomId));

  await lecturerPage.getByRole("button", { name: /Context/ }).click();
  await participantPage.getByRole("button", { name: /Context/ }).click();

  await claimLecturer(lecturerPage);
  await chooseContextOption(lecturerPage, "Winter holiday");

  await expect(participantPage.locator("#context-summary-chips")).toContainText("Winter holiday");
  const participantSeasonButton = participantPage.getByRole("button", { name: "Summer picnic" });
  await expect(participantSeasonButton).toHaveAttribute("aria-disabled", "true");
  await participantSeasonButton.click({ force: true });

  await expect(participantPage.locator("#context-summary-chips")).toContainText("Winter holiday");
  await expect(participantPage.locator("#context-summary-chips")).not.toContainText("Summer picnic");
  await expect(participantPage.locator("#search-status")).toContainText("Only the lecturer can change the shared world context.");

  await context.close();
});
