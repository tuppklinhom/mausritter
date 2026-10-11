import { expect, test, type Locator, type Page } from "@playwright/test";

const OUT = "guide/shots";

async function shot(target: Page | Locator, name: string) {
  await target.screenshot({ path: `${OUT}/${name}.png` });
}

function section(page: Page, heading: string | RegExp) {
  return page.locator("aside section").filter({ has: page.getByRole("heading", { name: heading }) }).first();
}

async function takeSeat(page: Page, name: string) {
  await expect(page.getByRole("heading", { name: /Joining table/ })).toBeVisible();
  await page.getByRole("textbox").fill(name);
  await page.getByRole("button", { name: "Take a seat" }).click();
  await expect(page.getByText("Laying the table…")).toBeHidden();
}

/** Lets 3D dice land and stamps finish before a screenshot. */
const settle = (page: Page, ms = 4500) => page.waitForTimeout(ms);

test("capture guide screenshots", async ({ browser }) => {
  const gm = await (await browser.newContext({ viewport: { width: 1440, height: 960 } })).newPage();
  const player = await (await browser.newContext({ viewport: { width: 1440, height: 960 } })).newPage();

  // ── Joining ──────────────────────────────────────────────
  await gm.goto("/");
  await shot(gm, "home");
  await gm.getByRole("button", { name: "Start a new table (GM)" }).click();
  await expect(gm.getByRole("heading", { name: /Joining table/ })).toBeVisible();
  await shot(gm, "join");
  await takeSeat(gm, "Gamemaster");
  await player.goto(gm.url());
  await takeSeat(player, "Pip");

  // ── Mouse creation ───────────────────────────────────────
  await player.getByRole("button", { name: /Roll a mouse/ }).click();
  await expect(player.getByText("Choose a weapon")).toBeVisible();
  await settle(player, 1500);
  await shot(player.locator("aside"), "creator");
  await player.getByRole("button", { name: /^Sword/ }).click();
  await player.getByRole("button", { name: /Begin the adventure/ }).click();
  await expect(player.locator("aside").getByText("Sword", { exact: true })).toBeVisible();
  const mouseName = (await player.locator("aside h2").first().innerText()).trim();

  // Gear and a condition so the inventory shows its features
  await player.getByRole("button", { name: "+ Add" }).click();
  await settle(player, 400);
  await shot(player.getByRole("dialog"), "add-dialog");
  await player.getByRole("button", { name: /^Bow/ }).click();
  await player.getByRole("button", { name: "+ Add" }).click();
  await player.getByRole("button", { name: "Condition" }).click();
  await player.getByRole("button", { name: /^Hungry/ }).click();
  await player.locator("aside").getByText("Torches", { exact: true }).click();
  await settle(player, 400);
  await shot(player.getByRole("dialog"), "card-menu");
  await player.getByRole("button", { name: /Light it/ }).click();
  await settle(player, 2500);

  await shot(player.locator("header"), "topbar");
  await shot(section(player, "Attributes"), "sheet-attributes");
  await shot(section(player, "Fight"), "sheet-fight");
  await shot(section(player, "Inventory"), "sheet-inventory");

  // A save, with the verdict on the stage
  await player.getByRole("button", { name: "Save" }).first().click();
  await settle(player);
  await shot(player, "player-table");

  // Hireling and the lower sheet
  await player.getByRole("button", { name: "Hire" }).click();
  await settle(player, 2500);
  await section(player, /^Pips/).scrollIntoViewIfNeeded();
  await shot(section(player, /^Pips/), "sheet-lower");
  await shot(section(player, "Hirelings"), "sheet-hirelings");

  // ── GM: scenes and dialogue ──────────────────────────────
  await expect(gm.getByRole("button", { name: "Direct" })).toBeVisible();
  await gm.getByRole("button", { name: "+ New scene" }).click();
  await gm.getByPlaceholder("The Rotting Granary").fill("The Rotting Granary");
  await gm.getByPlaceholder("Something skitters in the dark").fill("Something skitters in the dark");
  await gm.getByTitle("Deep forest").click();
  await gm.getByRole("button", { name: "+ Mouse" }).click();
  await gm.getByPlaceholder("Old Wick, the miller").fill("Old Wick");
  await gm.getByRole("button", { name: "+ Creature" }).click();
  await gm.getByPlaceholder("Grey Owl").fill("Grey Owl");
  await gm.getByRole("dialog").getByTitle("owl").click();
  await gm.getByRole("dialog").getByRole("textbox").last().fill("The rats hide behind the third sack. Old Wick knows.");
  await settle(gm, 600);
  await shot(gm.getByRole("dialog"), "gm-scene-editor");
  await gm.getByRole("button", { name: "Save scene" }).click();
  await gm.getByRole("button", { name: "▶ Show" }).click();
  await settle(player, 1200);
  await shot(player.locator("section").first(), "stage-title");
  await gm.getByRole("button", { name: "Old Wick" }).click();
  await gm.getByPlaceholder(/What does Old Wick say/).fill("Mind the cat, little ones. She sleeps in the hayloft, but never deeply.");
  await gm.getByPlaceholder(/What does Old Wick say/).press("Enter");
  await gm.locator("aside").getByRole("textbox").last().fill("Factions: the Granary Rats, the Hayloft Cat.");
  await gm.getByRole("button", { name: "+1 hour" }).click();
  await settle(player, 5500);
  await shot(player.locator("section").first(), "stage-dialogue");
  await shot(gm.locator("aside"), "gm-direct");

  // ── GM: map ──────────────────────────────────────────────
  await gm.getByRole("button", { name: "Map", exact: true }).click();
  await settle(gm, 400);
  await shot(gm.locator("aside"), "gm-map-empty");
  await gm.getByRole("button", { name: /Generate map/ }).click();
  await gm.locator("aside svg[aria-label='Hex map'] > g").nth(13).click();
  const nameField = gm.getByPlaceholder(/Countryside|Forest|River|Human town|Mouse settlement/);
  await nameField.fill("Owl Hill");
  await nameField.press("Enter");
  await gm.getByRole("button", { name: "Show map on stage" }).click();
  await gm.getByRole("button", { name: /Travel here/ }).click();
  await settle(gm, 5000);
  await shot(gm.locator("aside"), "gm-map");
  await shot(player.locator("section").first(), "stage-map");

  // ── Combat ───────────────────────────────────────────────
  await gm.getByRole("button", { name: "Fight", exact: true }).click();
  await gm.getByRole("button", { name: "More Snake" }).click();
  await gm.getByRole("button", { name: "More Rat" }).click();
  await gm.getByRole("button", { name: "More Rat" }).click();
  await settle(gm, 300);
  await shot(gm.locator("aside"), "gm-fight-setup");
  await gm.getByLabel("Mice ambush").check();
  await gm.getByRole("button", { name: /Start the fight/ }).click();
  await expect(player.getByText(`Your turn: ${mouseName}`)).toBeVisible();
  await player.getByRole("button", { name: "Target Snake" }).click();
  await settle(player, 800);
  await shot(player, "player-combat");
  await player.getByRole("button", { name: /Attack Snake/ }).click();
  await settle(player, 5000);
  await player.getByRole("button", { name: "End turn →" }).click();
  await settle(gm, 800);
  await shot(gm, "gm-fight");
  await gm.getByRole("button", { name: /End the fight|Victory/ }).click();
  const confirm = gm.getByRole("button", { name: "Really end the fight?" });
  if (await confirm.isVisible()) await confirm.click();
  await settle(player, 1500);

  // ── Party and chronicle ──────────────────────────────────
  await player.getByRole("button", { name: "Party", exact: true }).click();
  await settle(player, 400);
  await shot(player.locator("aside"), "party");
  await player.getByRole("button", { name: "Chronicle", exact: true }).click();
  await settle(player, 800);
  await shot(player.locator("aside"), "chronicle");
});
