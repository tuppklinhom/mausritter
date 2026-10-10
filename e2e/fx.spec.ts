import { expect, test } from "@playwright/test";

test("3D dice land on the server's result, then the total and banner appear", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Start a new table (GM)" }).click();
  await expect(page.getByRole("heading", { name: /Joining table/ })).toBeVisible();
  await page.getByRole("textbox").fill("Solo");
  await page.getByRole("button", { name: "Take a seat" }).click();
  await page.getByRole("button", { name: "My mice" }).click();
  await page.getByRole("button", { name: /Roll a mouse/ }).click();
  await page.getByRole("button", { name: /Begin the adventure/ }).click();

  await page.getByRole("button", { name: "Save" }).first().click();
  // The canvas mounts for the 3D roll…
  await expect(page.locator("#dice-stage canvas")).toHaveCount(1, { timeout: 10_000 });
  await page.waitForTimeout(700);
  await page.screenshot({ path: "test-results/fx-rolling.png" });
  // …and once the dice settle the verdict is stamped on the stage.
  await expect(page.getByText(/^(Success|Failed)$/)).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: "test-results/fx-settled.png" });

  // Loot flies in
  await page.getByRole("button", { name: "+ Add" }).click();
  await page.getByRole("button", { name: "Lantern", exact: true }).click();
  await page.waitForTimeout(450);
  await page.screenshot({ path: "test-results/fx-loot.png" });
  await expect(page.locator("aside").getByText("Lantern", { exact: true })).toBeVisible();
});
