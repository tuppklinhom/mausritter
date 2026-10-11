import { expect, test, type Page } from "@playwright/test";

async function takeSeat(page: Page, name: string) {
  await expect(page.getByRole("heading", { name: /Joining table/ })).toBeVisible();
  await page.getByRole("textbox").fill(name);
  await page.getByRole("button", { name: "Take a seat" }).click();
  await expect(page.getByText("Laying the table…")).toBeHidden();
}

test("GM builds a hexcrawl; players see only what's revealed; the party travels", async ({ browser }) => {
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

  // GM generates the map and puts it on stage
  await gm.getByRole("button", { name: "Map", exact: true }).click();
  await gm.getByRole("button", { name: /Generate map/ }).click();
  await expect(gm.locator("aside svg[aria-label='Hex map'] polygon").first()).toBeVisible();
  await gm.getByRole("button", { name: "Show map on stage" }).click();
  await expect(player.locator("svg[aria-label='Hex map']")).toBeVisible();

  // Players' copy of the map holds only the revealed centre hex
  const revealed = async () => (await player.evaluate(() => document.querySelectorAll("svg[aria-label='Hex map'] g[opacity='1']").length));
  expect(await revealed()).toBe(1);

  // GM names the hex east of centre, then the party travels there
  const hexAt = (page: Page, i: number) => page.locator("aside svg[aria-label='Hex map'] > g").nth(i);
  await hexAt(gm, 13).click(); // row 2, col 3
  await gm.getByPlaceholder(/Countryside|Forest|River|Human town|Mouse settlement/).fill("Owl Hill");
  await gm.getByPlaceholder(/Countryside|Forest|River|Human town|Mouse settlement/).press("Enter");
  await gm.getByRole("button", { name: /Travel here/ }).click();

  await expect(player.getByText("Discovered: Owl Hill").first()).toBeVisible();
  await expect.poll(revealed).toBe(2);
  await expect(player.getByText(/Afternoon watch|Evening watch/).first()).toBeVisible();

  await player.waitForTimeout(1500);
  await player.screenshot({ path: "test-results/map-player.png" });
  await gm.screenshot({ path: "test-results/map-gm.png" });
  expect(errors).toEqual([]);
});
