import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { chromium, request, expect } from "@playwright/test";
import { SignJWT } from "jose";
import nextEnv from "@next/env";
import sharp from "sharp";

nextEnv.loadEnvConfig(process.cwd());
const baseURL = process.env.QA_BASE_URL || "http://localhost:3000";
const root = path.resolve("data/aie2040-chapters");
const qaDir = path.join(root, "qa");
await fs.mkdir(qaDir, { recursive: true });
const report = JSON.parse(await fs.readFile(path.join(root, "import-report.json"), "utf8"));
const db = JSON.parse(await fs.readFile("data/app-db.json", "utf8"));
const assert = (value, message) => { if (!value) throw new Error(message); };
const digest = (value) => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
const noteIds = new Set(report.notes.map((item) => item.noteId));
const lessonIds = new Set(report.notes.map((item) => item.lessonId));
const targetTitles = new Set(db.lessons.filter((item) => lessonIds.has(item.id)).map((item) => item.title));

function protectedView(value) {
  return {
    users: value.users,
    preferences: value.preferences,
    passwordResets: value.passwordResets,
    courses: value.courses.filter((item) => item.id !== report.courseId),
    lessons: value.lessons.filter((item) => item.courseId !== report.courseId),
    notes: value.notes.filter((item) => !noteIds.has(item.id)),
    media: value.mediaAssets.filter((item) => !noteIds.has(item.noteId))
  };
}

assert(digest(protectedView(db)) === report.protectedHash, "Protected records changed");
const storedLessons = db.lessons.filter((item) => item.courseId === report.courseId);
assert(storedLessons.slice(3, 8).every((item, index) => item.id === report.notes[index].lessonId), "Stored chapter order is incorrect");
const lessons = [...storedLessons].sort((a, b) => a.order - b.order);
assert(lessons.slice(3, 8).every((item, index) => item.id === report.notes[index].lessonId), "Chapter order field is incorrect");
const assets = db.mediaAssets.filter((item) => noteIds.has(item.noteId));
assert(assets.length === 712, `Expected 712 media assets, found ${assets.length}`);
for (const item of report.notes) {
  const note = db.notes.find((entry) => entry.id === item.noteId);
  assert(note && note.lessonId === item.lessonId, `${item.key}: note linkage`);
  assert(crypto.createHash("sha256").update(note.contentMarkdown).digest("hex") === item.contentHash, `${item.key}: content hash`);
  const [main, appendix = ""] = note.contentMarkdown.split("\n<!-- courseware-appendix -->\n");
  const headings = [...main.matchAll(/^### 第(\d+)页｜/gm)].map((match) => Number(match[1]));
  const appendixHeadings = [...appendix.matchAll(/^### 第 (\d+) 页/gm)].map((match) => Number(match[1]));
  assert(headings.length === item.pages && headings.every((number, index) => number === index + 1), `${item.key}: body coverage`);
  assert(appendixHeadings.length === item.pages && appendixHeadings.every((number, index) => number === index + 1), `${item.key}: appendix coverage`);
  assert(!/courseware:|\{\{page:|[A-Z]:\\/.test(note.contentMarkdown), `${item.key}: unresolved reference`);
  const refs = [...note.contentMarkdown.matchAll(/\/api\/media\/([A-Za-z0-9_-]+)/g)].map((match) => match[1]);
  assert(refs.every((id) => assets.some((asset) => asset.id === id && asset.noteId === item.noteId)), `${item.key}: foreign media reference`);
}

const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret-change-me-for-production");
const tokenFor = (id, duration = "30m") => new SignJWT({})
  .setProtectedHeader({ alg: "HS256" }).setSubject(id).setIssuedAt().setExpirationTime(duration).sign(secret);
const cookie = {
  name: "study_session", value: await tokenFor(report.userId), domain: "localhost", path: "/",
  httpOnly: true, secure: false, expires: -1, sameSite: "Lax"
};
const api = await request.newContext({ baseURL, storageState: { cookies: [cookie], origins: [] } });
let mediaCursor = 0;
const mediaToCheck = process.env.QA_SKIP_MEDIA === "1" ? [] : assets;
await Promise.all(Array.from({ length: 12 }, async () => {
  while (true) {
    const index = mediaCursor++;
    if (index >= mediaToCheck.length) return;
    const asset = mediaToCheck[index];
    const response = await api.get(`/api/media/${asset.id}`, { timeout: 60000 });
    assert(response.status() === 200, `Media ${index + 1} status ${response.status()}`);
    assert((response.headers()["content-type"] || "").includes("image/webp"), `Media ${index + 1} type`);
    const metadata = await sharp(await response.body()).metadata();
    assert(metadata.width === asset.width && metadata.height === asset.height, `Media ${index + 1} dimensions`);
    await response.dispose();
  }
}));
const anonymous = await request.newContext({ baseURL });
assert((await anonymous.get(`/api/media/${assets[0].id}`)).status() === 401, "Anonymous media access");
await anonymous.dispose();
const other = db.users.find((item) => item.id !== report.userId);
if (other) {
  const foreign = await request.newContext({
    baseURL,
    storageState: { cookies: [{ ...cookie, value: await tokenFor(other.id, "5m") }], origins: [] }
  });
  assert((await foreign.get(`/api/media/${assets[0].id}`)).status() === 404, "Cross-account media access");
  await foreign.dispose();
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
await context.addCookies([cookie]);
let aiRequests = 0;
const browserErrors = [];
await context.route("**/api/**", async (route) => {
  const req = route.request();
  if (req.url().includes("/api/ai/")) {
    aiRequests += 1;
    await route.abort();
  } else if (req.method() !== "GET") {
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
  await expect(page.locator(".lesson-card").filter({ hasText: "Chapter 1：概率" })).toHaveCount(1);
  const cardTitles = await page.locator(".lesson-card h3").allTextContents();
  assert(cardTitles.slice(3, 8).every((title, index) => title === lessons[index + 3].title), "Rendered chapter order is incorrect");
  await page.screenshot({ path: path.join(qaDir, "course-directory.png"), animations: "disabled" });

  for (const item of report.notes) {
    const lesson = db.lessons.find((entry) => entry.id === item.lessonId);
    await page.locator(".lesson-card").filter({ hasText: lesson.title }).click();
    const reader = page.locator(".note-reader");
    await reader.waitFor();
    const main = reader.locator("article.markdown").first();
    await expect(main.locator(".note-page-heading")).toHaveCount(item.pages);
    await expect(main.locator(".page-source-button")).toHaveCount(item.pages);
    await expect(main.locator(".katex-error")).toHaveCount(0);
    const appendix = reader.locator("details.courseware-appendix");
    await expect(appendix).toHaveCount(1);
    const samples = [1, Math.ceil(item.pages / 2), item.pages];
    for (const number of samples) {
      const heading = main.getByRole("heading", { level: 3 }).filter({ hasText: new RegExp(`^第${number}页｜`) });
      const button = heading.locator(".page-source-button");
      await expect(button).toHaveAttribute("aria-label", `查看第${number}页原课件`);
      await button.evaluate((element) => element.click());
      const dialog = page.getByRole("dialog", { name: `第${number}页原课件`, exact: true });
      const asset = assets.find((entry) => entry.noteId === item.noteId && entry.slideNumber === number);
      await expect(dialog.locator("img")).toHaveAttribute("src", `/api/media/${asset.id}`);
      await page.getByRole("button", { name: "关闭原课件预览", exact: true }).click();
    }
    const inline = main.locator(".note-image-button img");
    assert(await inline.count() === item.inlineFigures, `${item.key}: inline image count`);
    for (const index of [0]) {
      const image = inline.nth(index);
      await image.scrollIntoViewIfNeeded();
      await image.evaluate((element) => { element.loading = "eager"; });
      await expect.poll(() => image.evaluate((element) => element.complete && element.naturalWidth > 0), { timeout: 60000 }).toBe(true);
      const ratioError = await image.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return Math.abs(rect.width / rect.height - element.naturalWidth / element.naturalHeight);
      });
      assert(ratioError < 0.03, `${item.key}: distorted inline image`);
    }
    const middleHeading = main.getByRole("heading", { level: 3 }).filter({ hasText: new RegExp(`^第${samples[1]}页｜`) });
    await middleHeading.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(qaDir, `${item.key}-middle.png`), animations: "disabled" });
    await appendix.locator("summary").click();
    await expect(appendix.locator("h3")).toHaveCount(item.pages);
    await appendix.locator("summary").click();
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), `${item.key}: horizontal overflow`);
    browserResults.push({ key: item.key, pages: item.pages, sourceButtons: item.pages, sampledMappings: samples, inlineFigures: item.inlineFigures, katexErrors: 0 });
    await page.getByRole("button", { name: "返回课程章节", exact: true }).first().click();
  }
  assert(aiRequests === 0, "Unexpected AI request");
  assert(browserErrors.length === 0, `Browser errors: ${browserErrors.join("; ")}`);
  const result = {
    passed: true, verifiedAt: new Date().toISOString(), pages: 712, mediaAssets: 712,
    sourceButtons: 712, inlineFigures: report.totalInlineFigures, accountIsolation: true,
    nonTargetRecordsUnchanged: true, aiRequests, browserErrors, notes: browserResults
  };
  await fs.writeFile(path.join(qaDir, "results.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  await page.screenshot({ path: path.join(qaDir, "failure.png"), animations: "disabled" }).catch(() => undefined);
  throw error;
} finally {
  await browser.close();
  await api.dispose();
}
