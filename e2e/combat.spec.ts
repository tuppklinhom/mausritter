import { expect, test, type Page } from "@playwright/test";

async function takeSeat(page: Page, name: string) {
  await expect(page.getByRole("heading", { name: /Joining table/ })).toBeVisible();
  await page.getByRole("textbox").fill(name);
  await page.getByRole("button", { name: "Take a seat" }).click();
  await expect(page.getByText("Laying the table…")).toBeHidden();
}

test("a fight: GM sets up a snake, the mouse targets and attacks, the snake strikes back", async ({ browser }) => {
  const gm = await (await browser.newContext()).newPage();
  const player = await (await browser.newContext()).newPage();
  const errors: string[] = [];
  for (const p of [gm, player]) p.on("pageerror", (e) => errors.push(e.message));

  await gm.goto("/");
  await gm.getByRole("button", { name: "Start a new table (GM)" }).click();
  await takeSeat(gm, "Gamemaster");
  await player.goto(gm.url());
  await takeSeat(player, "Pip");
  await player.getByRole("button", { name: /Roll a mouse/ }).click();
  await player.getByRole("button", { name: /Begin the adventure/ }).click();
  const mouseName = (await player.locator("aside h2").first().innerText()).trim();

  // GM: a snake (12hp, armour 2, so one blow can't drop it); the mice ambush it
  await gm.getByRole("button", { name: "Fight", exact: true }).click();
  await gm.getByRole("button", { name: "More Snake" }).click();
  await gm.getByLabel("Mice ambush").check();
  await gm.getByRole("button", { name: /Start the fight/ }).click();

  // Player: they act first; the foe appears on the stage and can be targeted
  await expect(player.getByText("Round 1").first()).toBeVisible();
  await expect(player.getByText(`Your turn: ${mouseName}`)).toBeVisible();
  await player.getByRole("button", { name: "Target Snake" }).click();
  await expect(player.getByRole("button", { name: /Attack Snake/ })).toBeEnabled();
  await player.waitForTimeout(400);
  await player.screenshot({ path: "test-results/combat-player-turn.png" });
  await player.getByRole("button", { name: /Attack Snake/ }).click();
  await expect(gm.getByText(/Snake takes [0-9]+ damage/).first()).toBeVisible({ timeout: 12_000 });
  await player.getByRole("button", { name: "End turn →" }).click();

  // GM: the snake bites back
  await gm.getByRole("button", { name: /d8 bite/ }).click();
  await expect(player.getByText(new RegExp(`${mouseName} takes [0-9]+ damage from Snake`)).first()).toBeVisible({ timeout: 12_000 });

  await gm.waitForTimeout(1500);
  await gm.screenshot({ path: "test-results/combat-gm.png" });

  // GM ends the fight
  await gm.getByRole("button", { name: /End the fight|Victory/ }).click();
  const confirm = gm.getByRole("button", { name: "Really end the fight?" });
  if (await confirm.isVisible()) await confirm.click();
  await expect(player.getByText("The fight is over").first()).toBeVisible();
  await expect(player.getByText("Round 1")).toHaveCount(0);
  expect(errors).toEqual([]);
});
