import { expect, test } from "@playwright/test";
import { createNote } from "../lib/db";
import { themeOptions } from "../lib/themes";

test("theme selection enters its home from a document; ambience alone does not navigate", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  expect((await page.request.post("/api/auth/register", { data: { name: "即刻入境", email: `theme-entry-${testInfo.project.name}-${Date.now()}@example.com`, password: "12345678" } })).ok()).toBeTruthy();
  await page.request.post("/api/onboarding");
  const workspace = await (await page.request.get("/api/workspace")).json();
  const chapter = workspace.lessons[0];
  const note = await createNote({ userId: workspace.user.id, courseId: chapter.courseId, lessonId: chapter.id, title: "切换主题保留的笔记", sourceType: "text", sourceText: "导航测试", contentMarkdown: "### 第1页｜继续学习\n切换主题不修改笔记。", summary: "阅读入口", flashcards: [], mindMap: [] });
  await page.goto("/");
  for (const theme of themeOptions) {
    await page.locator(".room-resume, .world-resume, .home-continue-card").click();
    await expect(page.locator(".note-reader")).toContainText(note.title);
    await page.getByRole("button", { name: "空间主题", exact: true }).click();
    const picker = page.getByRole("dialog", { name: "空间主题" });
    const ambienceSaved = page.waitForResponse(response => response.url().includes("/api/preferences") && response.request().method() === "PUT");
    await picker.getByRole("button", { name: "标准", exact: true }).click();
    expect((await ambienceSaved).ok()).toBeTruthy();
    await expect(picker).toBeVisible();
    await expect(page.locator(".note-reader")).toBeVisible();
    const saved = page.waitForResponse(response => response.url().includes("/api/preferences") && response.request().method() === "PUT");
    await picker.locator(`.theme-card-${theme.id}`).click();
    await expect(picker).toBeHidden();
    await expect(page.locator(".home-dashboard")).toBeVisible();
    await expect(page.locator(".app-shell")).toHaveAttribute("data-theme", theme.id);
    await expect(page.locator(".note-reader")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "主页", exact: true })).toHaveClass(/active/);
    expect((await saved).ok()).toBeTruthy();
  }
  await page.reload();
  await expect(page.locator(".home-dashboard")).toBeVisible();
  await expect(page.locator(".app-shell")).toHaveAttribute("data-theme", themeOptions.at(-1)!.id);
  const after = await (await page.request.get("/api/workspace")).json();
  expect(after.notes.find((item: {id: string}) => item.id === note.id)?.contentMarkdown).toBe(note.contentMarkdown);
});

test("opens the home before saving finishes and exposes a save failure", async ({ page }, testInfo) => {
  expect((await page.request.post("/api/auth/register", { data: { name: "主题保存测试", email: `theme-save-${testInfo.project.name}-${Date.now()}@example.com`, password: "12345678" } })).ok()).toBeTruthy();
  await page.request.post("/api/onboarding");
  await page.goto("/");
  const originalTheme = await page.locator(".app-shell").getAttribute("data-theme");
  await page.getByRole("button", { name: "课程", exact: true }).click();
  await page.getByRole("button", { name: "空间主题", exact: true }).click();
  let finishSave!: () => void;
  const pending = new Promise<void>(resolve => { finishSave = resolve; });
  await page.route("**/api/preferences", async route => {
    await pending;
    await route.fulfill({ status: 500, json: { error: "Test failure" } });
  });
  const picker = page.getByRole("dialog", { name: "空间主题" });
  await picker.locator(".theme-card-poetic-realm").click();
  await expect(picker).toBeHidden();
  await expect(page.locator(".poem-home")).toBeVisible();
  finishSave();
  await expect(picker).toBeVisible();
  await expect(picker.getByRole("status")).toContainText("主题没有保存成功");
  await expect(page.locator(".app-shell")).toHaveAttribute("data-theme", originalTheme!);
  await page.unroute("**/api/preferences");
  const saved = page.waitForResponse(response => response.url().includes("/api/preferences") && response.request().method() === "PUT");
  await picker.locator(".theme-card-poetic-realm").click();
  expect((await saved).ok()).toBeTruthy();
  await expect(picker).toBeHidden();
  await expect(page.locator(".poem-home")).toBeVisible();
});
