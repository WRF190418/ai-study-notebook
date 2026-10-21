import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { chromium, expect } from "@playwright/test";
import { SignJWT } from "jose";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());
const baseURL = process.env.QA_BASE_URL || "http://localhost:3000";
const root = path.resolve("data/all-notes-vocabulary");
const qaDir = path.join(root, "qa");
await fs.mkdir(qaDir, { recursive: true });
const report = JSON.parse(await fs.readFile(path.join(root, "report.json"), "utf8"));
const db = JSON.parse(await fs.readFile("data/app-db.json", "utf8"));
const assert = (value, message) => { if (!value) throw new Error(message); };

assert(report.courseCount === 6 && report.noteCount === 48 && report.notes.length === 48, "Expected all 6 courses and 48 notes");
for (const item of report.notes) {
  const note = db.notes.find((entry) => entry.id === item.noteId);
  assert(note, `${item.courseCode} ${item.lessonTitle}: note missing`);
  assert(crypto.createHash("sha256").update(note.contentMarkdown).digest("hex") === item.contentHash, `${item.courseCode} ${item.lessonTitle}: content hash`);
  const main = note.contentMarkdown.split("\n<!-- courseware-appendix -->\n")[0];
  assert((main.match(/^## 英语术语分类总表$/gm) || []).length === 1, `${item.courseCode} ${item.lessonTitle}: vocabulary heading`);
  const section = main.split(/^## 英语术语分类总表$/m)[1] || "";
  const terms = Math.max(0, (section.match(/^\| .+ \|$/gm) || []).length - 2);
  assert(terms === item.vocabularyTerms, `${item.courseCode} ${item.lessonTitle}: vocabulary count`);
  assert([...main.matchAll(/^## (.+)$/gm)].at(-1)?.[1] === "英语术语分类总表", `${item.courseCode} ${item.lessonTitle}: vocabulary placement`);
}

const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret-change-me-for-production");
const token = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject(report.userId).setIssuedAt().setExpirationTime("30m").sign(secret);
const cookie = { name: "study_session", value: token, domain: "localhost", path: "/", httpOnly: true, secure: false, expires: -1, sameSite: "Lax" };
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
await context.addCookies([cookie]);
let aiRequests = 0;
const browserErrors = [];
await context.route("**/api/**", async (route) => {
  const request = route.request();
  if (request.url().includes("/api/ai/")) {
    aiRequests += 1;
    await route.abort();
  } else if (request.method() !== "GET") {
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  } else {
    await route.continue();
  }
});
const page = await context.newPage();
page.setDefaultTimeout(60000);
page.on("pageerror", (error) => browserErrors.push(error.message));
const browserResults = [];
try {
  await page.goto(baseURL, { waitUntil: "domcontentloaded", timeout: 120000 });
  const cover = page.getByRole("dialog", { name: "银河系搭车客指南封面" });
  if (await cover.isVisible().catch(() => false)) await cover.getByRole("button", { name: "打开随身指南", exact: true }).click();
  const coursesNav = page.locator('[data-tutorial="courses"]');
  if (await coursesNav.count()) await coursesNav.click();
  const collapse = page.getByTitle("收起 AI 整理台");
  if (await collapse.isVisible().catch(() => false)) await collapse.click();
  for (const course of report.courses) {
    await page.getByLabel("选择课程").selectOption(course.courseId);
    const items = report.notes.filter((item) => item.courseId === course.courseId).sort((a, b) => a.lessonOrder - b.lessonOrder);
    await expect(page.locator(".lesson-card")).toHaveCount(items.length);
    for (const [index, item] of items.entries()) {
      await page.locator(".lesson-card").filter({ hasText: item.lessonTitle }).click();
      const reader = page.locator(".note-reader");
      await reader.waitFor();
      const main = reader.locator("article.markdown").first();
      const heading = main.getByRole("heading", { level: 2, name: "英语术语分类总表", exact: true });
      await expect(heading).toHaveCount(1);
      const table = heading.locator("xpath=following::table[1]");
      await expect(table.locator("thead th")).toHaveCount(4);
      await expect(table.locator("tbody tr")).toHaveCount(item.vocabularyTerms);
      assert((await table.locator("tbody tr").evaluateAll((rows) => rows.map((row) => row.cells.length))).every((count) => count === 4), `${item.courseCode} ${item.lessonTitle}: table columns`);
      await heading.scrollIntoViewIfNeeded();
      if (index === 0 || index === items.length - 1) {
        await page.screenshot({ path: path.join(qaDir, `${item.courseCode}-${String(item.lessonOrder).padStart(2, "0")}.png`), animations: "disabled" });
      }
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), `${item.courseCode} ${item.lessonTitle}: horizontal overflow`);
      browserResults.push({ courseCode: item.courseCode, lessonTitle: item.lessonTitle, vocabularyTerms: item.vocabularyTerms, columns: 4 });
      await page.getByRole("button", { name: "返回课程章节", exact: true }).first().click();
    }
  }
  assert(aiRequests === 0, "Unexpected AI request");
  assert(browserErrors.length === 0, `Browser errors: ${browserErrors.join("; ")}`);
  const result = { passed: true, verifiedAt: new Date().toISOString(), courseCount: 6, noteCount: 48, totalVocabularyTerms: report.totalVocabularyTerms, aiRequests, browserErrors, notes: browserResults };
  await fs.writeFile(path.join(qaDir, "results.json"), JSON.stringify(result, null, 2), "utf8");
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  await page.screenshot({ path: path.join(qaDir, "failure.png"), animations: "disabled" }).catch(() => undefined);
  throw error;
} finally {
  await browser.close();
}
