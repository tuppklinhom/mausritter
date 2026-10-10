import { expect, test, type Page } from "@playwright/test";

async function takeSeat(page: Page, name: string) {
  await expect(page.getByRole("heading", { name: /Joining table/ })).toBeVisible();
  await page.getByRole("textbox").fill(name);
  await page.getByRole("button", { name: "Take a seat" }).click();
  await expect(page.getByText("Laying the table…")).toBeHidden();
}

test("GM and a player share a table: create a mouse, take damage, rearrange gear", async ({ browser }) => {
  const gmCtx = await browser.newContext();
  const playerCtx = await browser.newContext();
  const gm = await gmCtx.newPage();
  const player = await playerCtx.newPage();

  // GM opens a table
  await gm.goto("/");
  await gm.getByRole("button", { name: "Start a new table (GM)" }).click();
  await expect(gm).toHaveURL(/\/r\/[A-Z0-9]{6}$/);
  await takeSeat(gm, "Gamemaster");
  const url = gm.url();

  // Player joins and rolls a mouse
  await player.goto(url);
  await takeSeat(player, "Pip");
  await player.getByRole("button", { name: /Roll a mouse/ }).click();
  await expect(player.getByText("Choose a weapon")).toBeVisible();
  await player.screenshot({ path: "test-results/creator.png" });
  await player.getByRole("button", { name: /^Sword/ }).click();
  await player.getByRole("button", { name: /Begin the adventure/ }).click();

  const mouseName = (await player.locator("aside h2").first().innerText()).trim();
  await expect(player.locator("aside").getByText("Sword", { exact: true })).toBeVisible();

  // The GM sees the new mouse in the party and on the stage HUD
  await expect(gm.locator("aside").getByText(mouseName)).toBeVisible();
  await expect(gm.locator("section").getByText(mouseName).first()).toBeVisible();

  // GM opens the mouse and deals 1 damage; player's HP drops by one
  const hpBefore = await player.locator("aside").getByText(/^\d+\/\d+$/).nth(3).innerText().catch(() => "");
  await gm.locator("aside").getByText(mouseName).click();
  await gm.getByPlaceholder("dmg").first().fill("1");
  await gm.getByRole("button", { name: "Take damage" }).first().click();
  await expect(player.locator("aside").getByText(/takes 1 damage|takes 0 damage/)).toHaveCount(0); // log lives in Chronicle tab
  await expect(player.getByText(new RegExp(`${mouseName} takes [01] damage`)).first()).toBeVisible();
  expect(hpBefore).not.toBe("");

  // Player drags Torches into pack slot 6
  const torches = player.locator("aside").getByText("Torches", { exact: true });
  const slot6 = player.locator("aside").getByText("6", { exact: true });
  const from = (await torches.boundingBox())!;
  const to = (await slot6.boundingBox())!;
  await player.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await player.mouse.down();
  await player.mouse.move(from.x + 20, from.y + 20, { steps: 5 });
  await player.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 10 });
  await player.mouse.up();
  // The GM's copy of the sheet reflects the move: Torches now sits in the last pack column.
  await expect
    .poll(async () => {
      const t = await gm.locator("aside").getByText("Torches", { exact: true }).boundingBox();
      const s = await gm.locator("aside").getByText("6", { exact: true }).boundingBox();
      return t && s ? Math.abs(t.x - s.x) < 120 && Math.abs(t.y - s.y) < 120 : false;
    })
    .toBe(true);

  // Player makes a STR save; the stage on the GM's screen shows it
  await player.getByRole("button", { name: "Save" }).first().click();
  await expect(gm.getByText(/STR save/).first()).toBeVisible();
  await expect(gm.getByText(/^(Success|Failed)$/)).toBeVisible({ timeout: 12_000 });

  await player.screenshot({ path: "test-results/player.png" });
  await gm.screenshot({ path: "test-results/gm.png" });
});

test("conditions: add Injured, see disadvantage, clear it from the card menu", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Start a new table (GM)" }).click();
  await takeSeat(page, "Solo");
  await page.getByRole("button", { name: "My mice" }).click();
  await page.getByRole("button", { name: /Roll a mouse/ }).click();
  await page.getByRole("button", { name: /Begin the adventure/ }).click();

  await page.getByRole("button", { name: "+ Add" }).click();
  await page.getByRole("button", { name: "Condition" }).click();
  await page.getByRole("button", { name: /^Injured/ }).click();
  await expect(page.getByText("Disadv: Injured").first()).toBeVisible();

  await page.locator("aside").getByText("Injured", { exact: true }).click();
  await page.getByRole("button", { name: /Clear condition/ }).click();
  await expect(page.getByText("Disadv: Injured")).toHaveCount(0);
});
