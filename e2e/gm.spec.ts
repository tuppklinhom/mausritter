import { expect, test, type Page } from "@playwright/test";

async function takeSeat(page: Page, name: string) {
  await expect(page.getByRole("heading", { name: /Joining table/ })).toBeVisible();
  await page.getByRole("textbox").fill(name);
  await page.getByRole("button", { name: "Take a seat" }).click();
  await expect(page.getByText("Laying the table…")).toBeHidden();
}

test("GM directs a scene: backdrop, title, NPC dialogue, time and light", async ({ browser }) => {
  const gm = await (await browser.newContext()).newPage();
  const player = await (await browser.newContext()).newPage();
  const errors: string[] = [];
  for (const p of [gm, player]) p.on("pageerror", (e) => errors.push(e.message));

  await gm.goto("/");
  await gm.getByRole("button", { name: "Start a new table (GM)" }).click();
  await takeSeat(gm, "Gamemaster");
  await player.goto(gm.url());
  await takeSeat(player, "Pip");

  // Player makes a mouse and lights their torches
  await player.getByRole("button", { name: /Roll a mouse/ }).click();
  await player.getByRole("button", { name: /Begin the adventure/ }).click();
  await player.locator("aside").getByText("Torches", { exact: true }).click();
  await player.getByRole("button", { name: /Light it/ }).click();

  // GM prepares a scene with an NPC
  await expect(gm.getByRole("button", { name: "Direct" })).toBeVisible();
  await gm.getByRole("button", { name: "+ New scene" }).click();
  await gm.getByPlaceholder("The Rotting Granary").fill("The Rotting Granary");
  await gm.getByPlaceholder("Something skitters in the dark").fill("Something skitters in the dark");
  await gm.getByTitle("Deep forest").click();
  await gm.getByRole("button", { name: "+ Mouse" }).click();
  await gm.getByPlaceholder("Old Wick, the miller").fill("Old Wick");
  await gm.getByRole("dialog").getByRole("textbox").last().fill("The rats hide behind the third sack.");
  await gm.getByRole("button", { name: "Save scene" }).click();

  // Players can't see the GM's notes anywhere
  await gm.getByRole("button", { name: "▶ Show" }).click();
  await expect(player.getByText("The Rotting Granary").first()).toBeVisible();
  await expect(player.locator("img[src='/scenes/forest.webp']")).toHaveCount(1);
  expect(await player.content()).not.toContain("third sack");
  await player.waitForTimeout(800);
  await player.screenshot({ path: "test-results/gm-scene-title.png" });

  // Old Wick speaks
  await gm.getByRole("button", { name: "Old Wick" }).click();
  await gm.getByPlaceholder(/What does Old Wick say/).fill("Mind the cat, little ones.");
  await gm.getByPlaceholder(/What does Old Wick say/).press("Enter");
  await expect(player.getByText("Mind the cat, little ones.", { exact: true })).toBeVisible();

  // An hour passes: torches mark usage, the encounter die rolls twice
  await gm.getByRole("button", { name: "+1 hour" }).click();
  await expect(player.getByText(/Turn 7\/36/)).toBeVisible();
  await expect(player.getByText(/Torches burn down \(1 usage\)/).first()).toBeVisible({ timeout: 10_000 });
  await expect(player.getByText(/^(Encounter!|An omen…|All quiet)$/)).toBeVisible({ timeout: 12_000 });

  await player.waitForTimeout(500);
  await player.screenshot({ path: "test-results/gm-player-view.png" });
  await gm.screenshot({ path: "test-results/gm-console.png" });

  // Ambience can't be heard headless, but switching it must not throw.
  await gm.locator("select").first().selectOption("storm");
  await gm.waitForTimeout(500);
  expect(errors).toEqual([]);
});
