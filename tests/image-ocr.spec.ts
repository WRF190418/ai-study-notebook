import { expect, test } from "@playwright/test";
import sharp from "sharp";
import { createCourseWithStarterLesson, createNote } from "../lib/db";

test("recognizes image English and lets the reader select and copy it", async ({ page }, testInfo) => {
  const email = `image-ocr-${testInfo.project.name}-${Date.now()}@example.com`;
  const register = await page.request.post("/api/auth/register", {
    data: { name: "图片文字测试", email, password: "12345678" }
  });
  expect(register.ok()).toBeTruthy();

  const initial = await (await page.request.get("/api/workspace")).json();
  const { course, lesson } = await createCourseWithStarterLesson(initial.user.id, {
    title: "英文图片识别测试",
    code: "OCR-TEST",
    term: "2026年秋季学期",
    description: "验证图片英文选择与复制。",
    lessonTitle: "英文课件图片",
    lessonSubtitle: "Selectable image text"
  });
  const note = await createNote({
    userId: initial.user.id,
    courseId: course.id,
    lessonId: lesson.id,
    title: "图片英文笔记",
    sourceType: "text",
    sourceText: "测试材料",
    contentMarkdown: "# 图片英文笔记\n\n### 第1页｜英文图示\n\n识别下面图片中的英文。",
    summary: "验证图片 OCR 文字层。",
    flashcards: [],
    mindMap: []
  });

  const svg = Buffer.from(`
    <svg width="720" height="260" xmlns="http://www.w3.org/2000/svg">
      <rect width="720" height="260" fill="white"/>
      <text x="58" y="112" font-family="Arial" font-size="52" font-weight="700" fill="black">Vector Product</text>
      <text x="60" y="180" font-family="Arial" font-size="34" fill="black">Direction and Magnitude</text>
      <text x="60" y="230" font-family="Arial" font-size="30" fill="black">F = 12.5 N; angle: 30°.</text>
    </svg>
  `);
  const image = await sharp(svg).png().toBuffer();
  const upload = await page.request.post(`/api/notes/${note.id}/images`, {
    multipart: {
      placement: "end",
      alt: "Vector Product slide",
      image: { name: "vector-product.png", mimeType: "image/png", buffer: image }
    }
  });
  expect(upload.ok()).toBeTruthy();

  const actualOcr = await page.request.post("/api/ocr/english", {
    multipart: { image: { name: "vector-product.png", mimeType: "image/png", buffer: image } }
  });
  expect(actualOcr.ok()).toBeTruthy();
  const actualLayout = (await actualOcr.json()).layout;
  expect(actualLayout.words.some((word: { text: string }) => /vector/i.test(word.text))).toBeTruthy();
  expect(actualLayout.words.some((word: { text: string }) => /12\.5/.test(word.text))).toBeTruthy();

  await page.route("**/api/ocr/english", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        layout: {
          width: 720,
          height: 260,
          words: [
            { text: "Vector", confidence: 96, bbox: { x0: 58, y0: 64, x1: 218, y1: 114 } },
            { text: "Product", confidence: 96, bbox: { x0: 232, y0: 64, x1: 420, y1: 114 } },
            { text: "12.5", confidence: 94, bbox: { x0: 60, y0: 146, x1: 130, y1: 182 } },
            { text: "N;", confidence: 94, bbox: { x0: 142, y0: 146, x1: 180, y1: 182 } },
            { text: "(30°).", confidence: 91, bbox: { x0: 192, y0: 146, x1: 274, y1: 182 } }
          ]
        }
      })
    });
  });

  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  const guide = page.getByRole("dialog", { name: "新手指导" });
  const guideAppeared = await guide.waitFor({ state: "visible", timeout: 5000 }).then(() => true, () => false);
  if (guideAppeared) await guide.getByRole("button", { name: "跳过" }).click();
  await page.getByRole("button", { name: "课程", exact: true }).click();
  await page.getByLabel("选择课程").selectOption(course.id);
  await page.getByRole("button", { name: /英文课件图片/ }).click();

  await page.getByRole("button", { name: /识别并选择英文：Vector Product slide/ }).click();
  const ocrLayer = page.getByLabel("可选择的图片英文文字");
  await expect(ocrLayer).toBeVisible();
  await expect(ocrLayer.locator(".ocr-word")).toHaveCount(5);

  await ocrLayer.locator(".ocr-word").evaluateAll((words) => {
    const selection = window.getSelection();
    const range = document.createRange();
    range.setStart(words[0].firstChild!, 0);
    range.setEnd(words[4].firstChild!, words[4].firstChild!.textContent!.length);
    selection?.removeAllRanges();
    selection?.addRange(range);
    words[0].parentElement?.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  });
  await expect(page.getByText(/已选择：Vector Product 12\.5 N; \(30°\)\./)).toBeVisible();
  await page.getByRole("button", { name: "复制" }).click();
  await expect(page.getByRole("button", { name: "已复制" })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("Vector Product 12.5 N; (30°).");
  await page.screenshot({ path: `test-results/image-ocr-selection-${testInfo.project.name}.png`, fullPage: false });
});
