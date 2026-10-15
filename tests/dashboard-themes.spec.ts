import { expect, test } from "@playwright/test";
import { createNote } from "../lib/db";

test("lands on the learning dashboard and persists immersive themes", async ({ page }, testInfo) => {
  const email = `dashboard-theme-${testInfo.project.name}-${Date.now()}@example.com`;
  const register = await page.request.post("/api/auth/register", {
    data: { name: "主题测试学生", email, password: "12345678" }
  });
  expect(register.ok()).toBeTruthy();

  await page.goto("/");
  const guide = page.getByRole("dialog", { name: "新手指导" });
  const guideAppeared = await guide.waitFor({ state: "visible", timeout: 5000 }).then(() => true, () => false);
  if (guideAppeared) {
    await guide.getByRole("button", { name: "跳过" }).click();
    await expect(guide).toBeHidden();
  }

  await expect(page.locator(".home-dashboard")).toBeVisible();
  await expect(page.getByRole("heading", { name: /主题测试学生/ })).toBeVisible();
  await expect(page.locator(".organizer")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "主页" })).toHaveClass(/active/);

  await page.getByRole("button", { name: /空间主题/ }).click();
  const picker = page.getByRole("dialog", { name: "空间主题" });
  await expect(picker).toBeVisible();
  const save = page.waitForResponse((response) => response.url().includes("/api/preferences") && response.request().method() === "PUT");
  await picker.getByRole("button", { name: /^极夜星图/ }).click();
  expect((await save).ok()).toBeTruthy();
  await expect(page.locator('.app-shell[data-theme="midnight-atlas"]')).toBeVisible();
  await expect(picker).toBeHidden();

  await page.reload();
  await expect(page.locator('.app-shell[data-theme="midnight-atlas"]')).toBeVisible();
  await expect(page.locator(".home-dashboard")).toBeVisible();
  await page.locator(".home-course-card").first().click();
  await expect(page.locator(".course-hero")).toBeVisible();
  await expect(page.locator(".organizer")).toBeVisible();
  await page.getByRole("button", { name: "主页" }).click();
  await expect(page.locator(".home-dashboard")).toBeVisible();
});

test("lets poetry flow, hold and resume, and saves the original magic theme", async ({ page }, testInfo) => {
  const registered = await page.request.post("/api/auth/register", {
    data: { name: "诗境阅读者", email: `poetic-${testInfo.project.name}-${Date.now()}@example.com`, password: "12345678" }
  });
  expect(registered.ok()).toBeTruthy();
  const workspace = await (await page.request.get("/api/workspace")).json();
  const note = await createNote({ userId: workspace.user.id, courseId: workspace.courses[0].id, lessonId: workspace.lessons[0].id, title: "诗境检索测试", sourceType: "text", sourceText: "原始测试", contentMarkdown: "### 第1页｜光的旅行\n空间检索唯一词", summary: "测试", flashcards: [], mindMap: [] });
  await page.request.post("/api/onboarding");
  expect((await page.request.put("/api/preferences", { data: { theme: "poetic-realm", ambience: "immersive" } })).ok()).toBeTruthy();
  await page.clock.install();
  await page.goto("/");
  const shell = page.locator(".app-shell");
  await expect(shell).toHaveAttribute("data-theme", "poetic-realm");
  await expect(page.locator(".poem-home .scenery-poetry")).toBeVisible();
  await expect(page.locator(".poem-manuscript").first()).toBeVisible();
  await expect(page.locator(".home-hero")).toHaveCount(0);
  await expect(page.locator('.poetry-verse[aria-hidden="false"]')).toContainText("此物最相思");

  await page.getByRole("button", { name: "留住此境" }).click();
  await page.clock.fastForward(100_000);
  await expect(shell).toHaveAttribute("data-poem", "longing");
  await page.getByRole("button", { name: "继续流转" }).click();
  await page.clock.fastForward(97_000);
  await expect(shell).toHaveAttribute("data-poem", "devotion");
  await page.clock.fastForward(97_000);
  await expect(shell).toHaveAttribute("data-poem", "journey");
  await page.getByRole("button", { name: "留住此境" }).click();
  await page.reload();
  await expect(shell).toHaveAttribute("data-poem", "journey");
  await expect(page.getByRole("button", { name: "继续流转" })).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: /空间主题/ }).click();
  const picker = page.getByRole("dialog", { name: "空间主题" });
  const saved = page.waitForResponse((response) => response.url().includes("/api/preferences") && response.request().method() === "PUT");
  await picker.getByRole("button", { name: /^秘法藏书院/ }).click();
  expect((await saved).ok()).toBeTruthy();
  await expect(picker).toBeHidden();
  await page.reload();
  await expect(shell).toHaveAttribute("data-theme", "arcane-library");
  await expect(page.locator(".poetry-passage")).toHaveCount(0);
  await expect(page.locator(".archive-home .scenery-archive")).toBeVisible();
  await expect(page.locator(".archive-book").first()).toBeVisible();
  await page.getByLabel("搜索全部笔记").fill("空间检索唯一词");
  await expect(page.locator(".archive-book.course-search-match")).toHaveCount(1);
  await page.getByRole("button", { name: "清除搜索" }).click();
  await expect(page.locator(".world-home")).toHaveAttribute("data-searching", "false");
  await page.getByRole("button", { name: /^最近笔记/ }).click();
  await expect(page.getByRole("region", { name: "最近笔记索引" })).toContainText(note.title);
  await page.getByRole("button", { name: "关闭阅读索引" }).click();
  await page.getByRole("button", { name: /^加星索引/ }).click();
  await expect(page.getByRole("region", { name: "加星页面索引" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("region", { name: "加星页面索引" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^加星索引/ })).toBeFocused();
  await page.locator(".home-course-card").first().click();
  await expect(page.locator(".course-world-art .landscape-arcane-library")).toBeVisible();
});
