import { expect, test } from "@playwright/test";
import { createCourseWithStarterLesson, createNote } from "../lib/db";

test("searches page content globally and persists beautiful page stars", async ({ page }, testInfo) => {
  const email = `stars-search-${testInfo.project.name}-${Date.now()}@example.com`;
  const register = await page.request.post("/api/auth/register", {
    data: { name: "检索测试学生", email, password: "12345678" }
  });
  expect(register.ok()).toBeTruthy();

  const initial = await (await page.request.get("/api/workspace")).json();
  const userId = initial.user.id as string;
  const { course, lesson } = await createCourseWithStarterLesson(userId, {
    title: "物理学测试课程",
    code: "PHY-SEARCH",
    term: "2026年秋季学期",
    description: "用于验证跨课程全文搜索与页星标。",
    lessonTitle: "向量与空间几何",
    lessonSubtitle: "Vector Geometry"
  });
  const filler = "这一段用于拉开阅读距离，并说明向量、方向和空间关系。".repeat(90);
  const note = await createNote({
    userId,
    courseId: course.id,
    lessonId: lesson.id,
    title: "向量积考试复习",
    sourceType: "text",
    sourceText: "测试材料",
    contentMarkdown: [
      "# 向量积考试复习",
      "",
      "## 逐页讲解",
      "",
      "### 第1页｜向量基础",
      "",
      filler,
      "",
      "### 第7页｜标量三重积与体积",
      "",
      "独特检索词：平行六面体体积。标量三重积可以判断三个向量是否共面。",
      "",
      filler
    ].join("\n"),
    summary: "向量积和标量三重积复习。",
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

  const search = page.getByLabel("搜索全部笔记");
  await search.fill("平行六面体体积");
  const results = page.getByRole("region", { name: "笔记搜索结果" });
  await expect(results).toBeVisible();
  await expect(results).toContainText("PHY-SEARCH");
  await expect(results).toContainText("向量与空间几何");
  await expect(results).toContainText("向量积考试复习");
  await expect(results).toContainText("第7页");
  await expect(results.locator("mark")).toContainText("平行六面体体积");
  await page.screenshot({ path: `test-results/search-results-${testInfo.project.name}.png`, fullPage: false });

  await results.getByRole("button", { name: /第7页/ }).click();
  const pageHeading = page.getByRole("heading", { name: /第7页.*标量三重积与体积/ });
  await expect(pageHeading).toBeVisible();

  await page.goBack();
  await expect(search).toHaveValue("平行六面体体积");
  await expect(results).toBeVisible();
  await results.getByRole("button", { name: /第7页/ }).click();
  await expect(pageHeading).toBeVisible();

  await page.getByRole("button", { name: "加入加星列表：第7页" }).click();
  const starPanel = page.getByRole("region", { name: `${note.title}的加星页面` });
  await expect(starPanel).toContainText("1 个复习重点");
  await expect(starPanel).toContainText("标量三重积与体积");

  await expect(page.getByRole("button", { name: "返回加星列表" })).toBeVisible();
  await page.getByRole("button", { name: "返回加星列表" }).click();
  await expect(starPanel).toBeInViewport();
  await starPanel.locator(".starred-page-link").click();
  await expect(page.getByRole("button", { name: "返回加星列表" })).toBeVisible();
  await page.goBack();
  await expect(starPanel).toBeInViewport();
  await page.screenshot({ path: `test-results/stars-search-${testInfo.project.name}.png`, fullPage: false });

  const persisted = await (await page.request.get("/api/workspace")).json();
  expect(persisted.noteStars).toEqual(
    expect.arrayContaining([expect.objectContaining({ noteId: note.id, pageKey: "page-7-1", pageNumber: 7 })])
  );

  await page.reload();
  await page.getByLabel("搜索全部笔记").fill("平行六面体体积");
  await page.getByRole("region", { name: "笔记搜索结果" }).getByRole("button", { name: /第7页/ }).click();
  await expect(page.getByRole("region", { name: `${note.title}的加星页面` })).toContainText("1 个复习重点");
  await expect(
    page.getByRole("region", { name: `${note.title}的加星页面` }).getByRole("button", { name: "取消加星：第7页" })
  ).toBeVisible();
});
