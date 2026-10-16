import { expect, test } from "@playwright/test";
import { createCourseWithStarterLesson, createNote } from "../lib/db";

function textContrast(element: Element) {
  const style = getComputedStyle(element);
  const luminance = (colour: string) => {
    const [r, g, b] = colour.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(n => n / 255).map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4);
    return .2126 * r + .7152 * g + .0722 * b;
  };
  const a = luminance(style.color), b = luminance(style.backgroundColor);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}

test("the personal galactic guide has a working index, safe scenery and a quiet reader", async ({ page }, info) => {
  test.setTimeout(120_000);
  page.setDefaultTimeout(15_000);
  if (info.project.name === "desktop") await page.setViewportSize({ width: 1600, height: 1000 });
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  expect((await page.request.post("/api/auth/register", { data: { name: "指南旅行者", email: `guide-${info.project.name}-${Date.now()}@example.com`, password: "12345678" } })).ok()).toBeTruthy();
  await page.request.post("/api/onboarding");
  const initial = await (await page.request.get("/api/workspace")).json(), chapter = initial.lessons[0];
  for (const [code, title] of [["PHY1000", "力学"], ["AIE2001", "认知科学导论"], ["AIE2040", "概率统计与机器学习"], ["AIE1903", "多模态智能体与自主系统"], ["GEB3302", "Quantum Mysteries（量子之谜）"]]) {
    await createCourseWithStarterLesson(initial.user.id, { code, title: `${code} ${title}`, term: initial.courses[0].term, description: "指南界面验证课程", lessonTitle: "第一章", lessonSubtitle: "Chapter 1" });
  }
  const note = await createNote({ userId: initial.user.id, courseId: chapter.courseId, lessonId: chapter.id, title: "旅行途中留下的一页", sourceType: "text", sourceText: "搭车阅读核对", contentMarkdown: "# 私人的知识\n\n### 第1页｜继续阅读\n\n搭车阅读核对：正文仍然清晰，公式 $E=mc^2$ 保持原样。\n\n### 第2页｜问题与理解\n\n先理解问题，再核对解释。", summary: "旅途记录", flashcards: [], mindMap: [] });
  await page.request.put("/api/stars", { data: { noteId: note.id, pageKey: "page-2-1", pageNumber: 2, note: "自己的备注，不被主题替换" } });
  expect((await page.request.put("/api/reading-progress", { data: { noteId: note.id, pageKey: "page-2-1", pageNumber: 2 } })).ok()).toBeTruthy();
  await page.goto("/");
  await page.getByRole("button", { name: "空间主题", exact: true }).click();
  await expect(page.locator(".theme-card-galactic-guide .guide-scenery-preview")).toBeVisible();
  const saved = page.waitForResponse(r => r.url().endsWith("/api/preferences") && r.request().method() === "PUT");
  await page.locator(".theme-card-galactic-guide").click(); expect((await saved).ok()).toBeTruthy();
  await expect(page.locator(".galactic-home")).toBeVisible();
  await expect(page.getByRole("heading", { name: "DON’T PANIC." })).toBeVisible();
  await expect(page.locator(".guide-course")).toHaveCount(initial.courses.length + 5);
  await expect(page.locator(".guide-location-slip strong")).toHaveText("第 2 页");
  const before = await (await page.request.get("/api/workspace")).json();
  const writes: string[] = []; page.on("request", r => { if (r.method() !== "GET" && r.url().includes("/api/")) writes.push(r.url()); });
  for (let i = 1; i <= 3; i++) {
    await page.getByRole("button", { name: "触发一次不大可能事件" }).click();
    await expect(page.locator(".guide-space-window .guide-scenery")).toHaveAttribute("data-event", String(i));
    if (i === 1) await page.screenshot({ path: `test-results/galactic-event-${info.project.name}.png`, animations: "disabled" });
  }
  expect(writes).toEqual([]);
  await expect(page.locator(".guide-incident")).toContainText("正常航行");
  await page.screenshot({ path: `test-results/galactic-home-${info.project.name}.png`, fullPage: true, animations: "disabled" });
  const overlap = await page.evaluate(() => {
    const a = document.querySelector(".guide-arrival")!.getBoundingClientRect(), b = document.querySelector(".search-area")!.getBoundingClientRect();
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  }); expect(overlap).toBe(false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await page.locator(".guide-space-window .guide-planet").evaluate(el => getComputedStyle(el).animationName)).toBe("none");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.locator(".guide-resume").click();
  await expect(page.getByRole("heading", { name: /第2页.*问题与理解/ })).toBeInViewport();
  await page.getByRole("button", { name: "主页", exact: true }).click();
  await page.getByRole("button", { name: /加星索引/ }).click();
  await expect(page.getByRole("dialog", { name: "加星页面索引" })).toContainText("自己的备注，不被主题替换");
  await page.keyboard.press("Escape"); await expect(page.locator(".world-index-drawer")).toHaveCount(0);
  await expect(page.locator('[data-tutorial="home-stars"]')).toBeFocused();
  await page.getByRole("button", { name: /最近笔记/ }).click();
  await page.locator('[data-tutorial="home-note-item"]').click();
  await expect(page.locator(".note-reader")).toContainText(note.title);
  await expect(page.locator(".guide-scenery")).toHaveCount(0);
  await expect(page.locator(".note-reader .katex")).toHaveCount(1);
  await page.screenshot({ path: `test-results/galactic-reader-${info.project.name}.png`, animations: "disabled" });
  if (info.project.name === "desktop") {
    await page.locator(".sidebar-focus-button").click();
    const light = await page.locator(".note-reader").evaluate(el => getComputedStyle(el).backgroundColor);
    await page.locator(".focus-reader-toolbar").hover();
    await page.locator(".focus-theme-toggle").click();
    const dark = await page.locator(".note-reader").evaluate(el => getComputedStyle(el).backgroundColor); expect(dark).not.toBe(light);
    await expect.poll(() => page.locator(".page-note-button").evaluate(textContrast)).toBeGreaterThan(4.5);
    await page.getByRole("button", { name: "编辑页备注：第2页", exact: true }).click();
    const memo = page.getByLabel("第2页备注内容", { exact: true });
    await expect(memo).toHaveValue("自己的备注，不被主题替换");
    expect(await memo.evaluate(textContrast)).toBeGreaterThan(4.5);
    await page.locator(".page-note-cancel").click();
    await page.locator(".focus-reader-toolbar").hover(); await page.getByLabel("退出专注阅读", { exact: true }).click();
  }
  await page.getByRole("button", { name: "返回课程章节", exact: true }).last().click();
  const directory = page.locator(".course-space-galactic-guide"); await expect(directory).toBeVisible();
  await expect(directory.locator(".course-invitation")).toHaveText("本分册按课程顺序编排。宇宙未必如此。");
  await page.screenshot({ path: `test-results/galactic-course-${info.project.name}.png`, animations: "disabled" });
  await page.getByLabel("搜索全部笔记").fill("搭车阅读核对");
  await expect(page.locator(".search-results-panel")).toContainText(note.title);
  const after = await (await page.request.get("/api/workspace")).json();
  for (const key of ["courses", "lessons", "notes", "noteStars", "preferences"]) expect(after[key]).toEqual(before[key]);
  expect(errors).toEqual([]);
  await page.reload(); await expect(page.locator(".app-shell")).toHaveAttribute("data-theme", "galactic-guide");
});
