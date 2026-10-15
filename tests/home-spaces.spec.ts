import { expect, test } from "@playwright/test";
import { createNote } from "../lib/db";
import { poeticScenes } from "../lib/themes";
import { poeticScenery } from "../lib/poetic-scenery";

test("poems switch by clicking the ink, remain frameless and keep the flow timer", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const browserErrors: string[] = [];
  page.on("pageerror", error => browserErrors.push(error.message));
  page.on("console", message => { if (message.type() === "error") browserErrors.push(message.text()); });
  const registered = await page.request.post("/api/auth/register", { data: { name: "诗页点击", email: `poem-click-${testInfo.project.name}-${Date.now()}@example.com`, password: "12345678" } });
  expect(registered.ok()).toBeTruthy();
  await page.request.post("/api/onboarding");
  await page.request.put("/api/preferences", { data: { theme: "poetic-realm" } });
  await page.clock.install();
  await page.goto("/");
  const shell = page.locator(".app-shell");
  const poem = page.getByRole("button", { name: "换一句诗", exact: true });
  await expect(poem).toBeVisible();
  expect(poeticScenes.length).toBeGreaterThanOrEqual(30);
  await expect(page.getByRole("button", { name: /[前后上下]一句诗/ })).toHaveCount(0);
  const style = await poem.evaluate(element => { const s = getComputedStyle(element); return { background: s.backgroundColor, border: s.borderTopWidth, width: element.clientWidth }; });
  expect(style.background).toBe("rgba(0, 0, 0, 0)");
  expect(style.border).toBe("0px");
  expect(style.width).toBeGreaterThan(150);
  await page.getByRole("button", { name: "留住此境" }).click();
  for (let index = 1; index <= poeticScenes.length; index++) {
    await poem.click();
    const scene = poeticScenes[index % poeticScenes.length];
    await expect(shell).toHaveAttribute("data-poem", scene.id);
    await expect(shell).toHaveAttribute("data-poetic-motif", scene.motif);
    await expect(page.locator('.poetry-verse[aria-hidden="false"]')).toContainText(scene.verse[0]);
    const art = page.locator(".scenery-poetry .poetic-landscape-svg");
    const scenery = poeticScenery[scene.id];
    await expect(art).toHaveAttribute("data-scenery-poem", scene.id);
    await expect(art).toHaveAttribute("data-light", scenery.light);
    await expect(art).toHaveAttribute("data-terrain", scenery.terrain);
    expect(await art.locator("[data-poetic-detail].present").evaluateAll(elements => elements.map(element => element.getAttribute("data-poetic-detail")).sort())).toEqual([...scenery.details].sort());
  }
  await page.clock.fastForward(200_000);
  await expect(shell).toHaveAttribute("data-poem", "longing");
  await page.getByRole("button", { name: "继续流转" }).click();
  await page.clock.fastForward(90_000);
  await poem.click();
  await expect(shell).toHaveAttribute("data-poem", "devotion");
  await page.clock.fastForward(10_000);
  await expect(shell).toHaveAttribute("data-poem", "devotion");
  await page.clock.fastForward(87_000);
  await expect(shell).toHaveAttribute("data-poem", "journey");
  await page.getByRole("button", { name: "留住此境" }).click();
  await page.getByRole("button", { name: "课程", exact: true }).click();
  const marginPoem = page.getByRole("button", { name: "换一句诗", exact: true });
  await expect(page.locator(".course-margin-poem")).toHaveCount(1);
  await expect(page.locator(".course-world-art .poetic-landscape-svg")).toHaveAttribute("data-scenery-poem", "journey");
  // Existing small-screen design hides the decorative margin; desktop allows switching there too.
  if (testInfo.project.name === "desktop") {
    await marginPoem.click();
    await expect(shell).toHaveAttribute("data-poem", "courage");
    await expect(page.locator(".course-world-art .poetic-landscape-svg")).toHaveAttribute("data-terrain", "sea");
  }
  await page.reload();
  await expect(shell).toHaveAttribute("data-poem", testInfo.project.name === "desktop" ? "courage" : "journey");
  await expect(page.getByRole("button", { name: "继续流转" })).toHaveAttribute("aria-pressed", "true");
  expect(browserErrors).toEqual([]);
});

test("study, forest and atlas have spatial homes with working courses and reading indexes", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  expect((await page.request.post("/api/auth/register", { data: { name: "三境读者", email: `three-homes-${testInfo.project.name}-${Date.now()}@example.com`, password: "12345678" } })).ok()).toBeTruthy();
  await page.request.post("/api/onboarding");
  const workspace = await (await page.request.get("/api/workspace")).json();
  const chapter = workspace.lessons[0];
  const note = await createNote({ userId: workspace.user.id, courseId: chapter.courseId, lessonId: chapter.id, title: "林间与星空之间", sourceType: "text", sourceText: "主页导航", contentMarkdown: "### 第1页｜学习坐标\n三境检索唯一词", summary: "保留同样的阅读入口", flashcards: [], mindMap: [] });
  const expectedTitles = workspace.courses.filter((item: {term: string})=>item.term===workspace.courses[0].term).map((item: {title: string;code: string})=>item.title.startsWith(item.code)?item.title.slice(item.code.length).trim():item.title);
  for (const [theme, kind] of [["warm-study","study"],["mist-forest","forest"],["midnight-atlas","atlas"]]) {
    await page.request.put("/api/preferences", { data: { theme } });
    await page.goto("/");
    await expect(page.locator(`.${kind}-home .scenery-${kind}`)).toBeVisible();
    await expect(page.locator(".home-hero")).toHaveCount(0);
    await expect(page.locator(".room-course h3")).toHaveText(expectedTitles);
    expect(await page.locator(".room-course").first().evaluate(element => getComputedStyle(element).flexDirection)).toBe(kind === "atlas" && testInfo.project.name === "desktop" ? "column" : "row");
    expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
    await page.screenshot({path:`test-results/home-space-${kind}-${testInfo.project.name}.png`});
    await page.getByLabel("搜索全部笔记").fill("三境检索唯一词");
    await expect(page.locator(".room-course.course-search-match")).toHaveCount(1);
    await page.getByRole("button", { name: "清除搜索" }).click();
    await page.getByRole("button", { name: /^最近笔记/ }).click();
    await expect(page.getByRole("dialog", { name: "最近笔记索引" })).toContainText(note.title);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: /^最近笔记/ })).toBeFocused();
    await page.getByRole("button", { name: /^加星索引/ }).click();
    await expect(page.getByRole("dialog", { name: "加星页面索引" })).toBeVisible();
    await page.getByRole("button", { name: "关闭阅读索引" }).click();
    await page.locator(".room-course").first().click();
    await expect(page.locator(".course-hero")).toBeVisible();
    await page.getByRole("button", { name: "主页", exact: true }).click();
    await page.getByRole("button", { name: `继续阅读：${note.title}`, exact: true }).click();
    await expect(page.locator(".note-reader")).toContainText(note.title);
    await expect(page.locator(".room-scenery")).toHaveCount(0);
    await page.getByRole("button", { name: "主页", exact: true }).click();
  }
});
