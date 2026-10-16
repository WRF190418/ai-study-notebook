import { expect, test } from "@playwright/test";
import { createNote } from "../lib/db";
import { tutorialKey, tutorialSteps } from "../lib/tutorial";

test.use({ actionTimeout: 15_000 });
async function setup(page: import("@playwright/test").Page) {
  expect((await page.request.post("/api/auth/register", { data: { name: "安全与恢复", email: `tutorial-safe-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`, password: "12345678" } })).ok()).toBeTruthy();
  await page.request.post("/api/onboarding");
  return (await page.request.get("/api/workspace")).json();
}

test("leaving from a native original-page dialog restores personal notes and stars", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop");
  const w = await setup(page), lesson = w.lessons[0];
  const note = await createNote({ userId: w.user.id, courseId: lesson.courseId, lessonId: lesson.id, title: "正式笔记不能被教程修改", sourceType: "text", sourceText: "真实资料测试", contentMarkdown: "# 正式笔记\n\n### 第1页｜保留自己的重点\n\n这段正式内容不会因为新手教程而被替换。", summary: "个人资料", flashcards: [], mindMap: [] });
  expect((await page.request.put("/api/stars", { data: { noteId: note.id, pageKey: "page-1-1", pageNumber: 1, note: "正式备注必须保留" } })).ok()).toBeTruthy();
  const original = await (await page.request.get("/api/workspace")).json();
  await page.goto("/");
  await page.locator(".room-resume, .world-resume, .home-continue-card").click();
  await expect(page.locator(".note-reader")).toContainText(note.title);
  await page.getByRole("button", { name: "新手指导", exact: true }).click();
  await page.getByRole("dialog", { name: "新手指导", exact: true }).getByRole("button", { name: /理解与原页对照/ }).click();
  const bubble = page.getByRole("complementary", { name: "手把手操作指引" });
  await bubble.getByRole("button", { name: "明白了，继续", exact: true }).click();
  await bubble.getByRole("button", { name: "明白了，继续", exact: true }).click();
  await page.getByRole("button", { name: "查看第1页原课件", exact: true }).click();
  await expect(page.locator("dialog[open] .tutorial-layer")).toHaveCount(1);
  await page.getByRole("button", { name: "退出教程", exact: true }).click();
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await expect(page.locator(".tutorial-layer")).toHaveCount(0);
  await expect(page.locator(".note-reader")).toContainText(note.title);
  await expect(page.locator(".starred-pages-panel")).toContainText("正式备注必须保留");
  const after = await (await page.request.get("/api/workspace")).json();
  for (const key of ["courses", "lessons", "notes", "noteStars", "preferences"]) expect(after[key]).toEqual(original[key]);
});

test("AI forms cannot submit in practice, unavailable targets recover, and storage denial is non-fatal", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop");
  await setup(page);
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new Error("Storage blocked for test"); }; });
  const requests: string[] = [];
  page.on("request", r => { if (r.url().includes("/api/ai/")) requests.push(r.url()); });
  await page.goto("/");
  await page.getByRole("button", { name: "新手指导", exact: true }).click();
  await page.getByRole("dialog", { name: "新手指导", exact: true }).getByRole("button", { name: /让 AI 帮你整理/ }).click();
  await expect(page.locator(".tutorial-bubble")).toContainText("本地进度暂时无法保存");
  await expect(page.locator('[data-tutorial="organize-submit"]')).toBeDisabled();
  await expect(page.locator('[data-tutorial="command-submit"]')).toBeDisabled();
  await page.locator(".organizer form").evaluateAll(forms => forms.forEach(form => (form as HTMLFormElement).requestSubmit()));
  await expect(page.locator(".command-message")).toContainText("教学练习区不执行 AI 命令");
  await expect(page.locator(".organizer .error-box")).toContainText("教学练习区不调用 AI");
  await page.getByRole("button", { name: "退出教程", exact: true }).click();
  expect(requests).toEqual([]);
  await page.getByRole("button", { name: "新手指导", exact: true }).click();
  await page.getByRole("dialog", { name: "新手指导", exact: true }).getByRole("button", { name: /留下自己的重点/ }).click();
  await page.locator('[data-tutorial="home"]').click();
  await expect(page.locator(".tutorial-missing")).toBeVisible();
  await expect(page.locator(".tutorial-layer")).toHaveAttribute("data-step", "star");
  await page.getByRole("button", { name: "重来本节", exact: true }).click();
  await expect(page.locator(".tutorial-missing")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "加入加星列表：第2页", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "退出教程", exact: true }).click();
});

test("finishing only the last chapter never claims the entire tutorial is complete", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop");
  const initial = await setup(page);
  await page.goto("/");
  await page.getByRole("button", { name: "新手指导", exact: true }).click();
  const menu = page.getByRole("dialog", { name: "新手指导", exact: true });
  await menu.getByRole("button", { name: /熟悉你的学习空间/ }).click();
  for (const item of tutorialSteps.filter(s => s.chapter === "space")) {
    await expect(page.locator(".tutorial-layer")).toHaveAttribute("data-step", item.id);
    const target = page.locator(item.target).first();
    if (item.kind === "change") await target.selectOption(item.value ?? "tutorial-course-other");
    else if (item.kind === "click") await target.click();
    else await page.getByRole("complementary", { name: "手把手操作指引" }).getByRole("button", { name: item.button ?? "明白了，继续", exact: true }).click();
  }
  await expect(menu).toContainText("还有 10 节未完成");
  const progress = await page.evaluate(k => JSON.parse(localStorage.getItem(k)!), tutorialKey(initial.user.id));
  expect(progress.status).toBe("paused"); expect(progress.completedChapters).toEqual(["space"]);
  await menu.getByRole("button", { name: "继续本节", exact: true }).click();
  await expect(page.locator(".tutorial-layer")).toHaveAttribute("data-step", "course");
  await page.getByRole("button", { name: "退出教程", exact: true }).click();
});
