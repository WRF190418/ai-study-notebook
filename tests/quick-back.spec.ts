import { expect, test } from "@playwright/test";
import { createCourseWithStarterLesson, createNote } from "../lib/db";

test("shows the course back button only for a quick upward scroll", async ({ page }, testInfo) => {
  const email = `quick-back-${testInfo.project.name}-${Date.now()}@example.com`;
  const register = await page.request.post("/api/auth/register", {
    data: { name: "滚动测试学生", email, password: "12345678" }
  });
  expect(register.ok()).toBeTruthy();

  const initial = await (await page.request.get("/api/workspace")).json();
  const { course, lesson } = await createCourseWithStarterLesson(initial.user.id, {
    title: "快速返回测试课程",
    code: "BACK-TEST",
    term: "2026年秋季学期",
    description: "验证阅读区快速上滑交互。",
    lessonTitle: "长篇笔记章节",
    lessonSubtitle: "Scroll behavior"
  });
  await createNote({
    userId: initial.user.id,
    courseId: course.id,
    lessonId: lesson.id,
    title: "滚动行为测试笔记",
    sourceType: "text",
    sourceText: "测试材料",
    contentMarkdown: `# 滚动行为测试\n\n${"用于形成长篇阅读区的正文内容。".repeat(1200)}`,
    summary: "一篇用于测试快速上滑的长笔记。",
    flashcards: [],
    mindMap: []
  });

  await page.goto("/");
  const guide = page.getByRole("dialog", { name: "新手指导" });
  const guideAppeared = await guide.waitFor({ state: "visible", timeout: 5000 }).then(() => true, () => false);
  if (guideAppeared) {
    await guide.getByRole("button", { name: "跳过" }).click();
    await expect(guide).toBeHidden();
  }

  await page.getByRole("button", { name: "课程", exact: true }).click();
  await page.getByLabel("选择课程").selectOption(course.id);
  await page.getByRole("button", { name: /长篇笔记章节/ }).click();
  const scrollRegion = page.locator('[data-scroll-region="notes"]');
  const quickBack = page.getByRole("button", { name: "快速返回课程章节" });

  await scrollRegion.evaluate((element) => element.scrollTo({ top: 1700 }));
  await expect(quickBack).toBeHidden();

  for (let index = 0; index < 4; index += 1) {
    await scrollRegion.evaluate((element) => element.scrollBy({ top: -8 }));
    await page.waitForTimeout(120);
  }
  await expect(quickBack).toBeHidden();

  await scrollRegion.evaluate((element) => element.scrollBy({ top: -80 }));
  await expect(quickBack).toBeVisible();
  await page.screenshot({ path: `test-results/quick-back-${testInfo.project.name}.png`, fullPage: false });

  await scrollRegion.evaluate((element) => element.scrollBy({ top: 12 }));
  await expect(quickBack).toBeHidden();
});
