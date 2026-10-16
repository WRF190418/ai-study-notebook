import { expect, test } from "@playwright/test";
import { createNote } from "../lib/db";
import { tutorialKey, tutorialVersion } from "../lib/tutorial";
test.use({ actionTimeout: 15_000 });
async function setup(page: import("@playwright/test").Page, stepId = "framework") {
  await page.request.post("/api/auth/register", { data: { name: "自动带看安全", email: `auto-safe-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`, password: "12345678" } });
  await page.request.post("/api/onboarding");
  const w = await (await page.request.get("/api/workspace")).json();
  await page.addInitScript(({ key, stepId, version }) => localStorage.setItem(key, JSON.stringify({ version, stepId, status: "paused", introSeen: true, completedChapters: [] })), { key: tutorialKey(w.user.id), stepId, version: tutorialVersion });
  return w;
}
test("exit during native source dialog restores personal note and stars", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop");
  const w = await setup(page), lesson = w.lessons[0];
  const note = await createNote({ userId: w.user.id, courseId: lesson.courseId, lessonId: lesson.id, title: "正式笔记不能被教程修改", sourceType: "text", sourceText: "真实资料", contentMarkdown: "# 正式笔记\n\n### 第1页｜自己的重点\n\n这段内容不被教程替换。", summary: "个人资料", flashcards: [], mindMap: [] });
  await page.request.put("/api/stars", { data: { noteId: note.id, pageKey: "page-1-1", pageNumber: 1, note: "正式备注必须保留" } });
  const before = await (await page.request.get("/api/workspace")).json();
  await page.goto("/"); await page.locator(".room-resume, .world-resume, .home-continue-card").click();
  await page.getByRole("button", { name: "新手指导", exact: true }).click();
  await page.getByRole("button", { name: "接着上次看", exact: true }).click();
  await page.getByRole("combobox", { name: "教程播放速度" }).selectOption("2");
  await expect(page.locator("dialog[open] .tutorial-layer")).toHaveCount(1, { timeout: 30000 });
  await page.getByRole("button", { name: "退出教程", exact: true }).click();
  await expect(page.locator("dialog[open], .tutorial-layer")).toHaveCount(0);
  await expect(page.locator(".note-reader")).toContainText(note.title);
  await expect(page.locator(".starred-pages-panel")).toContainText("正式备注必须保留");
  const after = await (await page.request.get("/api/workspace")).json();
  for (const key of ["courses", "lessons", "notes", "noteStars", "preferences"]) expect(after[key]).toEqual(before[key]);
});
test("practice AI submissions stay disabled and unavailable storage is non-fatal", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop"); await setup(page, "codex");
  const calls: string[] = []; page.on("request", r => { if (r.url().includes("/api/ai/")) calls.push(r.url()); });
  await page.goto("/"); await page.getByRole("button", { name: "新手指导", exact: true }).click();
  await page.getByRole("button", { name: "接着上次看", exact: true }).click();
  await page.getByRole("button", { name: "暂停演示", exact: true }).click();
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw Error("storage denied"); }; });
  await expect(page.locator('[data-tutorial="organize-submit"]')).toBeDisabled(); await expect(page.locator('[data-tutorial="command-submit"]')).toBeDisabled();
  await page.locator(".organizer form").evaluateAll(forms => forms.forEach(f => (f as HTMLFormElement).requestSubmit()));
  await expect(page.locator(".command-message")).toContainText("教学练习区不执行 AI 命令");
  await expect(page.locator(".organizer .error-box")).toContainText("教学练习区不调用 AI");
  await page.getByRole("button", { name: "重播本段", exact: true }).click();
  await expect(page.locator(".tutorial-bubble")).toContainText("本地进度暂时无法保存");
  await page.getByRole("button", { name: "退出教程", exact: true }).click(); expect(calls).toEqual([]);
});
