import { expect, test } from "@playwright/test";
import { createCourseWithStarterLesson, createLesson, createNote } from "../lib/db";

test("narrows search by course, chapter and note, with a current-chapter shortcut", async ({ page }, testInfo) => {
  const register = await page.request.post("/api/auth/register", {
    data: { name: "章节检索学生", email: `chapter-search-${testInfo.project.name}-${Date.now()}@example.com`, password: "12345678" }
  });
  expect(register.ok()).toBeTruthy();
  const { user } = await (await page.request.get("/api/workspace")).json();
  const first = await createCourseWithStarterLesson(user.id, {
    title: "概率课程", code: "PROB-SEARCH", term: "2026年秋季学期", description: "章节检索测试", lessonTitle: "第一章 概率基础"
  });
  const secondLesson = await createLesson(user.id, first.course.id, { title: "第二章 随机变量" });
  const second = await createCourseWithStarterLesson(user.id, {
    title: "代数课程", code: "ALG-SEARCH", term: "2026年秋季学期", description: "跨课程隔离测试", lessonTitle: "第一章 向量"
  });
  const keyword = "章节定位测试词";
  const specifications = [
    { courseId: first.course.id, lessonId: first.lesson.id, title: "概率基础笔记", text: keyword },
    { courseId: first.course.id, lessonId: first.lesson.id, title: "概率练习笔记", text: keyword },
    { courseId: first.course.id, lessonId: secondLesson.id, title: "随机变量笔记", text: keyword },
    { courseId: first.course.id, lessonId: secondLesson.id, title: "不含关键词的笔记", text: "这里只讨论分布函数。" },
    { courseId: second.course.id, lessonId: second.lesson.id, title: "向量笔记", text: keyword }
  ];
  const notes = [];
  for (const item of specifications) {
    notes.push(await createNote({
      userId: user.id, courseId: item.courseId, lessonId: item.lessonId, title: item.title,
      sourceType: "text", sourceText: item.text, contentMarkdown: `### 第1页｜${item.title}\n\n${item.text}`,
      summary: item.title, flashcards: [], mindMap: []
    }));
  }

  await page.goto("/");
  const guide = page.getByRole("dialog", { name: "新手指导" });
  await expect(guide).toBeVisible();
  await guide.getByRole("button", { name: "退出教程", exact: true }).click();
  await expect(guide).toBeHidden();
  const search = page.getByLabel("搜索全部笔记");
  const results = page.getByRole("region", { name: "笔记搜索结果" });
  const courseFilter = results.getByLabel("筛选课程");
  const chapterFilter = results.getByLabel("筛选章节");
  const noteFilter = results.getByLabel("筛选笔记");
  const cards = results.locator(".search-result-card");
  await search.fill(keyword);
  await expect(cards).toHaveCount(4);
  await expect(chapterFilter).toBeDisabled();
  await expect(noteFilter).toBeDisabled();

  await courseFilter.selectOption(first.course.id);
  await expect(cards).toHaveCount(3);
  await expect(chapterFilter.locator("option")).toHaveCount(3);
  await chapterFilter.selectOption(first.lesson.id);
  await expect(cards).toHaveCount(2);
  await expect(noteFilter.locator("option")).toHaveCount(3);
  await noteFilter.selectOption(notes[0].id);
  await expect(cards).toHaveCount(1);
  await expect(results).toContainText("1 条结果");
  await search.press("Enter");
  await expect(page.getByRole("heading", { name: /^第1页｜概率基础笔记/ })).toBeVisible();
  await page.goBack();
  await expect(results).toBeVisible();
  await expect(courseFilter).toHaveValue(first.course.id);
  await expect(chapterFilter).toHaveValue(first.lesson.id);
  await expect(noteFilter).toHaveValue(notes[0].id);

  await chapterFilter.selectOption(secondLesson.id);
  await expect(noteFilter).toHaveValue("");
  await expect(cards).toHaveCount(1);
  // The picker includes notes without a hit, allowing an explicit zero-result search.
  await noteFilter.selectOption(notes[3].id);
  await expect(cards).toHaveCount(0);
  await expect(results).toContainText("没有找到相关内容");
  await courseFilter.selectOption(second.course.id);
  await expect(chapterFilter).toHaveValue("");
  await expect(noteFilter).toHaveValue("");
  await expect(noteFilter.locator(`option[value="${notes[0].id}"]`)).toHaveCount(0);
  await expect(cards).toHaveCount(1);
  await courseFilter.selectOption("");
  await expect(chapterFilter).toBeDisabled();
  await expect(noteFilter).toBeDisabled();
  await expect(cards).toHaveCount(4);

  await courseFilter.selectOption(first.course.id);
  await noteFilter.selectOption(notes[0].id);
  await cards.click();
  await page.getByRole("button", { name: "清除搜索" }).click();
  const currentChapter = page.getByRole("button", { name: "在本章内搜索", exact: true });
  await currentChapter.click();
  await expect(currentChapter).toHaveAttribute("aria-pressed", "true");
  await expect(search).toBeFocused();
  await search.fill(keyword);
  await expect(cards).toHaveCount(2);
  await expect(courseFilter).toHaveValue(first.course.id);
  await expect(chapterFilter).toHaveValue(first.lesson.id);
  await expect(noteFilter).toHaveValue("");
  await currentChapter.click();
  await expect(currentChapter).toHaveAttribute("aria-pressed", "false");
  await expect(cards).toHaveCount(4);
  await currentChapter.click();
  await noteFilter.selectOption(notes[1].id);
  await expect(cards).toHaveCount(1);
  await currentChapter.click();
  await expect(noteFilter).toHaveValue("");
  await expect(cards).toHaveCount(2);
  await page.screenshot({ path: `test-results/search-chapter-filter-${testInfo.project.name}.png` });
});

test("searches page content globally and persists beautiful page stars", async ({ page }, testInfo) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
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
      "## 第7页｜标量三重积与体积",
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
    await guide.getByRole("button", { name: "退出教程", exact: true }).click();
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

  await expect(page.getByRole("button", { name: "添加页备注：第7页" })).toHaveCount(0);
  await page.getByRole("button", { name: "加入加星列表：第7页" }).click();
  const starPanel = page.getByRole("region", { name: `${note.title}的加星页面` });
  await expect(starPanel).toContainText("1 个复习重点");
  await expect(starPanel).toContainText("标量三重积与体积");
  await expect(page.getByRole("button", { name: "添加页备注：第7页" })).toBeVisible();
  const noteEditor = page.getByRole("dialog", { name: "第7页备注编辑器" });
  await expect(noteEditor).toBeVisible();
  await noteEditor.getByLabel("第7页备注内容").fill("考试重点：注意向量顺序与体积的绝对值。");
  // A parent reader update must not remount the heading and discard the draft.
  await page.getByRole("button", { name: /^专注阅读/ }).click();
  await expect(noteEditor.getByLabel("第7页备注内容")).toHaveValue("考试重点：注意向量顺序与体积的绝对值。");
  await page.getByRole("toolbar", { name: "专注阅读工具栏" }).hover();
  await page.getByRole("button", { name: "退出专注阅读", exact: true }).click();
  await expect(noteEditor.getByLabel("第7页备注内容")).toHaveValue("考试重点：注意向量顺序与体积的绝对值。");
  await page.screenshot({ path: `test-results/page-note-editor-${testInfo.project.name}.png`, fullPage: false });
  const noteSaveResponse = page.waitForResponse(
    (response) => response.url().includes("/api/stars") && response.request().method() === "PUT"
  );
  await noteEditor.getByRole("button", { name: "保存备注" }).click();
  expect((await noteSaveResponse).ok()).toBeTruthy();
  await expect(starPanel).toContainText("备注：考试重点：注意向量顺序与体积的绝对值。");

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
    expect.arrayContaining([
      expect.objectContaining({
        noteId: note.id,
        pageKey: "page-7-1",
        pageNumber: 7,
        note: "考试重点：注意向量顺序与体积的绝对值。"
      })
    ])
  );

  await page.reload();
  await page.getByLabel("搜索全部笔记").fill("平行六面体体积");
  await page.getByRole("region", { name: "笔记搜索结果" }).getByRole("button", { name: /第7页/ }).click();
  await expect(page.getByRole("region", { name: `${note.title}的加星页面` })).toContainText("1 个复习重点");
  await expect(
    page.getByRole("region", { name: `${note.title}的加星页面` }).getByRole("button", { name: "取消加星：第7页" })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "编辑页备注：第7页" })).toBeVisible();
  expect(consoleErrors.filter((message) => message.includes("same key"))).toEqual([]);
});
