import { expect, test } from "@playwright/test";
import { createNote } from "../lib/db";
import { themeIds } from "../lib/themes";

test("course directories have distinct structures without changing chapter data or reading", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const registered = await page.request.post("/api/auth/register", { data: { name: "课程空间读者", email: `course-space-${testInfo.project.name}-${Date.now()}@example.com`, password: "12345678" } });
  expect(registered.ok()).toBeTruthy();
  await page.request.post("/api/onboarding");
  const workspace = await (await page.request.get("/api/workspace")).json();
  const chapter = workspace.lessons[0];
  const note = await createNote({ userId: workspace.user.id, courseId: chapter.courseId, lessonId: chapter.id, title: "主题之间保持相同的笔记", sourceType: "text", sourceText: "课程空间测试", contentMarkdown: "### 第1页｜相同的知识\n不同主题保留相同的课程与笔记入口。", summary: "阅读连续性", flashcards: [], mindMap: [] });
  const expectedTitles = workspace.lessons.filter((item: { courseId: string }) => item.courseId === chapter.courseId).sort((a: { order: number },b: { order: number })=>a.order-b.order).map((item: { title: string })=>item.title);

  for (const theme of themeIds) {
    expect((await page.request.put("/api/preferences", { data: { theme } })).ok()).toBeTruthy();
    await page.goto("/");
    await page.getByRole("button", { name: "课程", exact: true }).click();
    const directory = page.locator(`.course-space[data-course-theme="${theme}"]`);
    await expect(directory).toBeVisible();
    await expect(directory.locator(".course-chapter h3")).toHaveText(expectedTitles);
    await expect(directory.locator(".course-space-stats")).toContainText("1 篇笔记");
    await expect(directory.locator(".course-chapter").first()).toContainText("1 篇笔记");
    expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
    const grid = await directory.locator(".course-chapters").evaluate(element => getComputedStyle(element).gridTemplateColumns.split(" ").length);
    expect(grid).toBe(theme === "midnight-atlas" && testInfo.project.name === "desktop" ? 2 : 1);
    await page.screenshot({ path: `test-results/course-space-${theme}-${testInfo.project.name}.png` });
    // The guide starts with the working sheet folded away to preserve the open volume.
    if (theme === "galactic-guide") await page.getByTitle("展开 AI 整理台", { exact: true }).click();
    await page.getByTitle("收起 AI 整理台", { exact: true }).click();
    await expect(page.locator(".organizer-rail")).toBeVisible();
    await page.getByTitle("展开 AI 整理台", { exact: true }).click();
    await expect(page.getByLabel("AI 命令行", { exact: true })).toBeVisible();
    await directory.locator(".course-chapter").first().click();
    await expect(page.locator(".note-reader")).toContainText(note.title);
    await expect(page.locator(".app-shell")).toHaveAttribute("data-course-space", "false");
    await expect(page.locator(".course-space")).toHaveCount(0);
    await page.getByRole("button", { name: "返回课程章节", exact: true }).click();
    await expect(directory).toBeVisible();
  }
  const after = await (await page.request.get("/api/workspace")).json();
  expect(after.notes.find((item: { id: string })=>item.id===note.id)?.contentMarkdown).toBe(note.contentMarkdown);
});
