import { expect, test, type Page } from "@playwright/test";
import { tutorialChapters, tutorialKey, tutorialSteps } from "../lib/tutorial";
import { themeOptions } from "../lib/themes";
test.use({ actionTimeout: 15_000 });
export async function register(page: Page) {
  expect((await page.request.post("/api/auth/register", { data: { name: "自动带看测试", email: `auto-tutorial-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`, password: "12345678" } })).ok()).toBeTruthy();
  return (await page.request.get("/api/workspace")).json();
}
async function advanceClock(page: Page, id: string) {
  for (let i = 0; i < 30; i++) {
    if (!await page.locator(".tutorial-layer").count()) {
      if (await page.locator(".tutorial-complete-mark").count()) return;
      // A native dialog may have just closed; allow the portal-position timer to reattach.
      await page.clock.runFor(200); await page.waitForTimeout(15); continue;
    }
    if (await page.locator(".tutorial-layer").getAttribute("data-step") !== id) return;
    await page.clock.runFor(500); await page.waitForTimeout(15);
    if (!await page.locator(".tutorial-layer").count()) continue;
    if (await page.locator(".tutorial-layer").getAttribute("data-paused") === "true") throw new Error(`Unexpected pause at ${id}: ${await page.locator('.tutorial-bubble').innerText()}`);
  }
  throw new Error(`Automatic step stalled: ${id}`);
}
for (const theme of themeOptions) test(`automatic cinematic journey covers every feature safely in ${theme.id}`, async ({ page }, info) => {
  test.skip(info.project.name !== "desktop"); test.setTimeout(480_000);
  await page.setViewportSize({ width: 1440, height: 960 });
  const initial = await register(page);
  await page.request.put("/api/preferences", { data: { theme: theme.id, ambience: "immersive" } });
  const before = await (await page.request.get("/api/workspace")).json();
  await page.clock.install();
  await page.addInitScript(({ id }) => localStorage.setItem(`study-poetic-flow:${id}`, JSON.stringify({ index: 3, held: true })), { id: initial.user.id });
  const errors: string[] = [], forbidden: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("request", r => { if (/\/api\/(ai\/|ocr\/|stars|reading-progress|preferences|notes\/tutorial-)/.test(r.url())) forbidden.push(r.url()); });
  await page.goto("/");
  await expect(page.locator(".tutorial-cosmos")).toBeVisible();
  // Freeze only after hydration: Next's client bootstrap also schedules timers.
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  await expect(page.locator(".tutorial-intro-scene")).toHaveCount(0);
  expect(await page.locator(".tutorial-lettering>span").count()).toBeGreaterThan(20);
  await page.screenshot({ path: `test-results/auto-intro-${theme.id}.png`, animations: "disabled" });
  // No menu, chapter selection or manual notebook interaction: entry is automatic.
  await page.clock.runFor(5800); await expect(page.locator(".tutorial-intro")).toHaveAttribute("data-act", "1");
  await page.clock.runFor(5800); await expect(page.locator(".tutorial-intro")).toHaveAttribute("data-act", "2");
  await page.clock.runFor(5800); await expect(page.locator(".tutorial-layer")).toHaveAttribute("data-step", "course");
  await page.getByRole("combobox", { name: "教程播放速度" }).selectOption("2");
  for (const item of tutorialSteps) {
    await expect(page.locator(".tutorial-layer")).toHaveAttribute("data-step", item.id);
    if (item.id === "source-close" || item.id === "zoom-close") await expect(page.locator("dialog[open] .tutorial-layer")).toHaveCount(1);
    if (["framework", "memo", "focus-dark", "codex", "poem"].includes(item.id)) await page.screenshot({ path: `test-results/auto-${item.id}-${theme.id}.png`, animations: "disabled" });
    if (item.id === "ocr-copy") { await expect(page.locator(".ocr-selection-bar")).toContainText("Learn 42, understand!"); await expect(page.locator(".tutorial-safe-note")).toBeVisible(); }
    await test.step(item.id, () => advanceClock(page, item.id));
  }
  await expect(page.getByRole("dialog", { name: "新手指导", exact: true })).toContainText("现在，开始自己的学习");
  const progress = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), tutorialKey(before.user.id));
  expect(progress.status).toBe("completed"); expect(progress.completedChapters).toHaveLength(tutorialChapters.length);
  await page.getByRole("button", { name: "回到我的笔记本", exact: true }).click();
  const after = await (await page.request.get("/api/workspace")).json();
  for (const key of ["courses", "lessons", "notes", "noteStars", "readingProgress", "preferences"]) expect(after[key]).toEqual(before[key]);
  expect(await page.evaluate(id => JSON.parse(localStorage.getItem(`study-poetic-flow:${id}`)!), before.user.id)).toEqual({ index: 3, held: true });
  expect(forbidden).toEqual([]); expect(errors).toEqual([]);
});

test("pause, speed, replay, exit and resume stay available", async ({ page }, info) => {
  const w = await register(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "暂停介绍", exact: true }).click();
  await expect(page.locator(".tutorial-intro")).toHaveAttribute("data-paused", "true");
  await page.getByRole("button", { name: "跳过介绍", exact: true }).click();
  await page.getByRole("button", { name: "暂停演示", exact: true }).click();
  await expect(page.locator(".tutorial-layer")).toHaveAttribute("data-paused", "true");
  const id = await page.locator(".tutorial-layer").getAttribute("data-step");
  await page.waitForTimeout(1800); await expect(page.locator(".tutorial-layer")).toHaveAttribute("data-step", id!);
  await page.getByRole("combobox", { name: "教程播放速度" }).selectOption("2");
  await page.getByRole("button", { name: "退出教程", exact: true }).click();
  await expect.poll(async () => (await (await page.request.get("/api/workspace")).json()).user.onboardingCompletedAt).toBeTruthy();
  await page.getByRole("button", { name: "新手指导", exact: true }).click();
  await expect(page.locator(".tutorial-cosmos")).toBeVisible();
  await page.getByRole("button", { name: "接着上次看", exact: true }).click();
  await expect(page.locator(".tutorial-layer")).toHaveAttribute("data-step", "course");
  await page.getByRole("button", { name: "重播本段", exact: true }).click();
  await expect(page.locator(".tutorial-layer")).toHaveAttribute("data-step", "course");
  await page.getByRole("button", { name: "退出教程", exact: true }).click();
  expect((await page.evaluate(k => JSON.parse(localStorage.getItem(k)!), tutorialKey(w.user.id))).status).toBe("paused");
});

test("hidden pages pause playback and skipped sections do not count as watched", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop");
  const w = await register(page);
  await page.goto("/");
  await page.getByRole("button", { name: "跳过介绍", exact: true }).click();
  await expect(page.locator(".tutorial-layer")).toHaveAttribute("data-step", "course");
  await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, get: () => true }); document.dispatchEvent(new Event("visibilitychange")); });
  await expect(page.locator(".tutorial-layer")).toHaveAttribute("data-paused", "true");
  await page.waitForTimeout(6500);
  await expect(page.locator(".tutorial-layer")).toHaveAttribute("data-step", "course");
  await page.evaluate(() => { delete (document as unknown as Record<string, unknown>).hidden; document.dispatchEvent(new Event("visibilitychange")); });
  await page.getByRole("button", { name: "暂停演示", exact: true }).click();
  for (let i = 0; i < tutorialChapters.length; i++) {
    await expect(page.locator(".tutorial-hud-progress")).toContainText(`${String(i + 1).padStart(2, "0")} / ${tutorialChapters.length}`);
    await page.getByRole("button", { name: "跳过本段", exact: true }).click();
  }
  await expect(page.getByRole("dialog", { name: "新手指导", exact: true })).toContainText("尚未标记为完整看完");
  const progress = await page.evaluate(k => JSON.parse(localStorage.getItem(k)!), tutorialKey(w.user.id));
  expect(progress.status).toBe("paused"); expect(progress.completedChapters).toEqual([]); expect(progress.stepId).toBe("course");
  await page.getByRole("button", { name: "回到我的笔记本", exact: true }).click();
});
