import { expect, test, type Page } from "@playwright/test";
import { tutorialChapters, tutorialKey, tutorialSteps, type TutorialStep } from "../lib/tutorial";
import { themeOptions } from "../lib/themes";
test.use({ actionTimeout: 15_000 });

async function register(page: Page) {
  expect((await page.request.post("/api/auth/register", { data: { name: "交互教程测试", email: `tutorial-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`, password: "12345678" } })).ok()).toBeTruthy();
  return (await page.request.get("/api/workspace")).json();
}
async function step(page: Page, id: string) { await expect(page.locator(".tutorial-layer")).toHaveAttribute("data-step", id); }
async function runAction(page: Page, item: TutorialStep) {
  await step(page, item.id);
  const guide = page.getByRole("complementary", { name: "手把手操作指引" });
  const target = page.locator(item.target).first();
  if (item.kind === "confirm" || item.kind === "activate" && await target.evaluate(el => el.tagName !== "BUTTON")) {
    await guide.getByRole("button", { name: item.button ?? "明白了，继续", exact: true }).click();
  } else if (item.kind === "click" || item.kind === "activate") await target.click();
  else if (item.kind === "input") await target.fill(item.value ?? (item.id === "command" ? "把这篇笔记改为考试复习侧重点" : "按课件逐页讲解，保留对应原图"));
  else if (item.kind === "change") await target.selectOption(item.value ?? "tutorial-course-other");
  else if (item.event === "memo-closed") { await target.locator("textarea").fill("二刷时自己画一次知识地图"); await target.getByRole("button", { name: "保存备注", exact: true }).click(); }
  else if (item.event === "source-closed" || item.event === "image-closed") {
    await expect(page.locator("dialog[open] .tutorial-layer")).toHaveCount(1);
    await expect(page.getByRole("button", { name: "退出教程", exact: true })).toBeInViewport();
    await page.screenshot({ path: `test-results/tutorial-dialog-${item.event}-${await page.locator('.app-shell').getAttribute('data-theme')}.png` });
    await target.click();
  }
  else if (item.event === "search-back") await guide.getByRole("button", { name: "返回搜索结果", exact: true }).click();
  else if (item.event === "focus-tools") await target.hover();
  else if (item.event === "focus-exit") await target.click();
  else if (item.event === "ocr-ready") await target.click();
  else if (item.event === "ocr-selected") {
    const words = target.locator(".ocr-word");
    const a = await words.nth(0).boundingBox(), b = await words.nth(2).boundingBox();
    expect(a).toBeTruthy(); expect(b).toBeTruthy();
    await page.mouse.move(a!.x + 1, a!.y + a!.height / 2); await page.mouse.down();
    await page.mouse.move(b!.x + b!.width - 1, b!.y + b!.height / 2, { steps: 12 }); await page.mouse.up();
    await expect(page.locator(".ocr-selection-bar")).toContainText("42,");
  } else if (item.event === "ocr-copied") await target.click();
}

for (const theme of themeOptions) test(`interactive tutorial runs every feature safely in ${theme.id}`, async ({ page, context }, info) => {
  test.skip(info.project.name !== "desktop", "Desktop-first guided interaction; responsive entrance is tested separately.");
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1440, height: 960 });
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const registered = await register(page);
  expect((await page.request.put("/api/preferences", { data: { theme: theme.id, ambience: "immersive" } })).ok()).toBeTruthy();
  const before = await (await page.request.get("/api/workspace")).json();
  await page.addInitScript(({ id }) => localStorage.setItem(`study-poetic-flow:${id}`, JSON.stringify({ index: 3, held: true })), { id: registered.user.id });
  const errors: string[] = [], forbidden: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("request", r => { if (/\/api\/(ai\/|ocr\/|stars|reading-progress|preferences|notes\/tutorial-)/.test(r.url())) forbidden.push(r.url()); });
  await page.goto("/");
  await expect(page.getByRole("dialog", { name: "新手指导", exact: true })).toContainText("AI");
  await expect(page.locator(".tutorial-intro-copy")).toHaveCSS("opacity", "1");
  await page.screenshot({ path: `test-results/tutorial-intro-${theme.id}.png` });
  await page.getByRole("button", { name: "跳过介绍", exact: true }).click();
  for (const item of tutorialSteps) {
    await test.step(item.id, () => runAction(page, item));
    if (item.id === "framework" || item.id === "memo" || item.id === "focus-dark" || item.id === "codex" || item.id === "poem") await page.screenshot({ path: `test-results/tutorial-${item.id}-${theme.id}.png` });
  }
  await expect(page.getByRole("dialog", { name: "新手指导", exact: true })).toContainText("现在，开始自己的学习");
  const progress = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), tutorialKey(before.user.id));
  expect(progress.status).toBe("completed");
  expect(progress.completedChapters).toHaveLength(tutorialChapters.length);
  await page.getByRole("button", { name: "回到我的笔记本", exact: true }).click();
  const after = await (await page.request.get("/api/workspace")).json();
  for (const key of ["courses", "lessons", "notes", "noteStars", "readingProgress", "preferences"]) expect(after[key]).toEqual(before[key]);
  expect(await page.evaluate(id => JSON.parse(localStorage.getItem(`study-poetic-flow:${id}`)!), before.user.id)).toEqual({ index: 3, held: true });
  expect(forbidden).toEqual([]); expect(errors).toEqual([]);
  await page.reload(); await expect(page.locator(".tutorial-modal")).toHaveCount(0);
});

test("exit, restart, resume, reduced-motion intro and chapter navigation are available", async ({ page }, info) => {
  const initial = await register(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".tutorial-intro")).toBeVisible();
  await page.getByRole("button", { name: "介绍第 3 幕" }).click();
  await expect(page.locator(".tutorial-intro h1")).toContainText("重点，由你留下");
  await page.getByRole("button", { name: "退出教程", exact: true }).click();
  await expect(page.locator(".tutorial-modal")).toHaveCount(0);
  await expect.poll(async () => (await (await page.request.get("/api/workspace")).json()).user.onboardingCompletedAt).toBeTruthy();
  await page.getByRole("button", { name: "新手指导", exact: true }).click();
  const menu = page.getByRole("dialog", { name: "新手指导", exact: true });
  await expect(menu.getByRole("navigation", { name: "新手指导目录" }).getByRole("button")).toHaveCount(tutorialChapters.length);
  await menu.getByRole("button", { name: /留下自己的重点/ }).click();
  await step(page, "star");
  await page.getByRole("button", { name: "退出教程", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "新手指导", exact: true }).click();
  await expect(menu).toContainText("留下自己的重点");
  await menu.getByRole("button", { name: "继续本节", exact: true }).click();
  await step(page, "star");
  await expect(page.getByRole("button", { name: "退出教程", exact: true })).toBeInViewport();
  await page.getByRole("button", { name: "重来本节", exact: true }).click();
  await step(page, "star");
  await page.getByRole("button", { name: "退出教程", exact: true }).click();
  const p = await page.evaluate(k => JSON.parse(localStorage.getItem(k)!), tutorialKey(initial.user.id));
  expect(p.status).toBe("paused");
  await page.screenshot({ path: `test-results/tutorial-menu-${info.project.name}.png` });
});
