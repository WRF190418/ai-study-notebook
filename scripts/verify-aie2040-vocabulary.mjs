import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { chromium, expect } from "@playwright/test";
import { SignJWT } from "jose";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());
const baseURL = process.env.QA_BASE_URL || "http://localhost:3000";
const root = path.resolve("data/aie2040-vocabulary");
const qaDir = path.join(root, "qa");
await fs.mkdir(qaDir, { recursive: true });
const report = JSON.parse(await fs.readFile(path.join(root, "report.json"), "utf8"));
const db = JSON.parse(await fs.readFile("data/app-db.json", "utf8"));
const assert = (value, message) => { if (!value) throw new Error(message); };

assert(report.noteCount === 12 && report.notes.length === 12, "Expected all 12 AIE2040 notes in the report");
for (const item of report.notes) {
  const note = db.notes.find((entry) => entry.id === item.noteId);
  assert(note, `${item.lessonTitle}: note missing`);
  assert(crypto.createHash("sha256").update(note.contentMarkdown).digest("hex") === item.contentHash, `${item.lessonTitle}: content hash`);
  const [main, appendix = ""] = note.contentMarkdown.split("\n<!-- courseware-appendix -->\n");
  assert(appendix.length > 0, `${item.lessonTitle}: appendix missing`);
  assert((main.match(/^## 英语术语分类总表$/gm) || []).length === 1, `${item.lessonTitle}: vocabulary heading`);
  const section = main.split(/^## 英语术语分类总表$/m)[1] || "";
  const terms = Math.max(0, (section.match(/^\| .+ \|$/gm) || []).length - 2);
  assert(terms === item.vocabularyTerms, `${item.lessonTitle}: vocabulary term count`);
  assert([...main.matchAll(/^## (.+)$/gm)].at(-1)?.[1] === "英语术语分类总表", `${item.lessonTitle}: vocabulary placement`);
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
  const courses = page.locator('[data-tutorial="courses"]');
  if (await courses.count()) await courses.click();
  await page.getByLabel("选择课程").selectOption(report.courseId);
  const collapse = page.getByTitle("收起 AI 整理台");
  if (await collapse.isVisible().catch(() => false)) await collapse.click();
  await expect(page.locator(".lesson-card")).toHaveCount(12);
  for (const item of report.notes) {
    await page.locator(".lesson-card").filter({ hasText: item.lessonTitle }).click();
    const reader = page.locator(".note-reader");
    await reader.waitFor();
    const main = reader.locator("article.markdown").first();
    const heading = main.getByRole("heading", { level: 2, name: "英语术语分类总表", exact: true });
    await expect(heading).toHaveCount(1);
    const table = heading.locator("xpath=following::table[1]");
    await expect(table.locator("thead th")).toHaveCount(4);
    await expect(table.locator("tbody tr")).toHaveCount(item.vocabularyTerms);
    assert((await table.locator("tbody tr").evaluateAll((rows) => rows.map((row) => row.cells.length))).every((count) => count === 4), `${item.lessonTitle}: table columns`);
    await heading.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(qaDir, `${String(item.order).padStart(2, "0")}-vocabulary.png`), animations: "disabled" });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), `${item.lessonTitle}: horizontal overflow`);
    browserResults.push({ order: item.order, lessonTitle: item.lessonTitle, vocabularyTerms: item.vocabularyTerms, columns: 4 });
    await page.getByRole("button", { name: "返回课程章节", exact: true }).first().click();
  }
  assert(aiRequests === 0, "Unexpected AI request");
  assert(browserErrors.length === 0, `Browser errors: ${browserErrors.join("; ")}`);
  const result = {
    passed: true,
    verifiedAt: new Date().toISOString(),
    noteCount: report.noteCount,
    totalVocabularyTerms: report.totalVocabularyTerms,
    aiRequests,
    browserErrors,
    notes: browserResults,
  };
  await fs.writeFile(path.join(qaDir, "results.json"), JSON.stringify(result, null, 2), "utf8");
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  await page.screenshot({ path: path.join(qaDir, "failure.png"), animations: "disabled" }).catch(() => undefined);
  throw error;
} finally {
  await browser.close();
}
