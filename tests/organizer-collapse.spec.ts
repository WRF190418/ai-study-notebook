import { expect, test } from "@playwright/test";
import { themeIds } from "../lib/themes";

test("organizer has an explicit sticky collapse button and restores text drafts", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop");
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  expect((await page.request.post("/api/auth/register", { data: { name: "整理台折叠验收", email: `collapse-${Date.now()}@example.com`, password: "12345678" } })).ok()).toBeTruthy();
  await page.request.post("/api/onboarding");
  const forbidden: string[] = [];
  page.on("request", r => { if (/\/api\/ai\//.test(r.url())) forbidden.push(r.url()); });
  for (const theme of themeIds) {
    await page.request.put("/api/preferences", { data: { theme } });
    await page.goto("/");
    await page.getByRole("button", { name: "AI 整理", exact: true }).click();
    const panel = page.locator(".organizer:not(.organizer-rail)");
    const collapse = page.getByRole("button", { name: "收起 AI 整理台", exact: true });
    await expect(collapse).toHaveText("收起");
    await expect(collapse).toHaveAttribute("aria-expanded", "true");
    await panel.getByLabel("AI 命令行", { exact: true }).fill("暂存命令，不执行");
    await panel.getByLabel("整理要求", { exact: true }).fill("逐页解释并保留原图");
    await panel.getByLabel("原始文字", { exact: true }).fill("收起后仍然保留的材料正文。");
    await panel.evaluate(el => { el.scrollTop = el.scrollHeight; });
    const buttonBox = await collapse.boundingBox(), panelBox = await panel.boundingBox();
    expect(buttonBox!.y).toBeGreaterThanOrEqual(panelBox!.y);
    expect(buttonBox!.y + buttonBox!.height).toBeLessThanOrEqual(panelBox!.y + panelBox!.height);
    await expect(collapse).toBeInViewport();
    if (theme === "galactic-guide") await page.screenshot({ path: "test-results/guide-organizer-collapse.png", animations: "disabled" });
    await collapse.click();
    await expect(panel).toHaveCount(0);
    const expand = page.getByRole("button", { name: "展开 AI 整理台", exact: true });
    await expect(expand).toHaveAttribute("aria-expanded", "false");
    await expand.click();
    await expect(panel.getByLabel("AI 命令行", { exact: true })).toHaveValue("暂存命令，不执行");
    await expect(panel.getByLabel("整理要求", { exact: true })).toHaveValue("逐页解释并保留原图");
    await expect(panel.getByLabel("原始文字", { exact: true })).toHaveValue("收起后仍然保留的材料正文。");
    if (theme === "galactic-guide") {
      await page.setViewportSize({ width: 1024, height: 768 });
      await panel.evaluate(el => { el.scrollTop = el.scrollHeight; });
      await expect(collapse).toBeInViewport();
      await collapse.click();
      await expect(expand).toBeVisible();
    }
  }
  expect(forbidden).toEqual([]);
});
