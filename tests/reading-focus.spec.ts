import { expect, test } from "@playwright/test";
import { createCourseWithStarterLesson, createNote } from "../lib/db";

test("remembers the last page and provides a focused reading mode", async ({ page }, testInfo) => {
  const email = `reading-focus-${testInfo.project.name}-${Date.now()}@example.com`;
  const register = await page.request.post("/api/auth/register", {
    data: { name: "专注阅读测试", email, password: "12345678" }
  });
  expect(register.ok()).toBeTruthy();

  const initial = await (await page.request.get("/api/workspace")).json();
  const { course, lesson } = await createCourseWithStarterLesson(initial.user.id, {
    title: "阅读进度测试课程",
    code: "READ-TEST",
    term: "2026年秋季学期",
    description: "验证继续阅读和专注模式。",
    lessonTitle: "连续阅读章节",
    lessonSubtitle: "Reading continuity"
  });
  const filler = "这一段用于撑开页面阅读距离，让不同课件页拥有清晰的滚动区间。".repeat(75);
  const note = await createNote({
    userId: initial.user.id,
    courseId: course.id,
    lessonId: lesson.id,
    title: "三页连续阅读笔记",
    sourceType: "text",
    sourceText: "测试材料",
    contentMarkdown: [
      "# 三页连续阅读笔记",
      "",
      "### 第1页｜起点",
      filler,
      "### 第2页｜中段",
      filler,
      "### 第3页｜重点结论",
      filler
    ].join("\n\n"),
    summary: "用于测试阅读位置保存。",
    flashcards: [],
    mindMap: []
  });

  await page.goto("/");
  const guide = page.getByRole("dialog", { name: "新手指导" });
  const guideAppeared = await guide.waitFor({ state: "visible", timeout: 5000 }).then(() => true, () => false);
  if (guideAppeared) await guide.getByRole("button", { name: "退出教程", exact: true }).click();
  await page.getByRole("button", { name: "课程", exact: true }).click();
  await page.getByLabel("选择课程").selectOption(course.id);
  await expect(page.getByRole("button", { name: "专注阅读" })).toHaveCount(0);
  await page.getByRole("button", { name: /连续阅读章节/ }).click();

  const focusButton = page.getByRole("button", { name: "专注阅读" });
  await expect(focusButton).toBeVisible();
  await expect(focusButton).toHaveClass(/sidebar-focus-button/);
  await expect(focusButton).toBeInViewport();
  await focusButton.click();
  const focusToolbar = page.getByRole("toolbar", { name: "专注阅读工具栏" });
  await expect(focusToolbar).toBeVisible();
  expect((await focusToolbar.boundingBox())?.width).toBeLessThan(190);
  await expect(page.locator(".sidebar")).toBeHidden();
  await expect(page.locator(".topbar")).toBeHidden();
  await expect(page.locator(".organizer")).toBeHidden();
  await focusToolbar.hover();
  await expect.poll(async () => (await focusToolbar.boundingBox())?.width ?? 0).toBeGreaterThan(700);
  await page.getByRole("button", { name: "切换为深色阅读" }).click();
  await expect(page.locator(".app-shell")).toHaveClass(/focus-dark/);
  await expect(page.getByRole("button", { name: "切换为浅色阅读" })).toBeVisible();
  await page.mouse.move(20, 400);
  await expect.poll(async () => (await focusToolbar.boundingBox())?.width ?? 999).toBeLessThan(190);
  expect((await focusToolbar.boundingBox())?.height).toBeLessThan(34);
  await page.screenshot({ path: `test-results/focus-reading-dark-${testInfo.project.name}.png`, fullPage: false });

  await page.keyboard.press("Escape");
  await expect(page.getByRole("toolbar", { name: "专注阅读工具栏" })).toBeHidden();
  await expect(page.locator(".sidebar")).toBeVisible();

  await page.locator('[data-scroll-region="notes"]').evaluate((element) => element.scrollTo({ top: 900 }));
  await expect(focusButton).toBeInViewport();

  await focusButton.click();
  await expect(page.locator(".app-shell")).toHaveClass(/focus-dark/);
  const thirdPage = page.getByRole("heading", { name: /第3页.*重点结论/ });
  const progressSaved = page.waitForResponse(
    (response) =>
      response.url().includes("/api/reading-progress") &&
      response.request().method() === "PUT" &&
      response.request().postData()?.includes('"pageNumber":3') === true
  );
  await thirdPage.evaluate((element) => {
    const scrollRegion = element.closest('[data-scroll-region="notes"]') as HTMLElement;
    const distance = element.getBoundingClientRect().top - scrollRegion.getBoundingClientRect().top - 120;
    scrollRegion.scrollTop += distance;
  });
  await focusToolbar.hover();
  await expect.poll(async () => (await focusToolbar.boundingBox())?.width ?? 0).toBeGreaterThan(700);
  await expect(page.getByText("正在阅读第 3 页")).toBeVisible();
  await page.screenshot({ path: `test-results/focus-reading-${testInfo.project.name}.png`, fullPage: false });

  await page.getByRole("button", { name: "返回章节" }).click();
  expect((await progressSaved).ok()).toBeTruthy();
  await page.getByRole("button", { name: /连续阅读章节/ }).click();
  const continueReading = page.getByRole("button", { name: /上次阅读位置.*第 3 页.*重点结论.*继续阅读/ });
  await expect(continueReading).toBeVisible();
  await continueReading.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `test-results/continue-reading-${testInfo.project.name}.png`, fullPage: false });
  await continueReading.click();
  await expect(thirdPage).toBeInViewport();

  const persisted = await (await page.request.get("/api/workspace")).json();
  expect(persisted.readingProgress).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ noteId: note.id, pageKey: "page-3-1", pageNumber: 3 })
    ])
  );
});
