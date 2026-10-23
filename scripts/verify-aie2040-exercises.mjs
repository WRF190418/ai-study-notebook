// Read-only QA. Blocks AI calls and browser writes (stars/progress/settings).
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";
import { chromium, expect, request } from "@playwright/test";
import { SignJWT } from "jose";
import nextEnv from "@next/env";
import { exerciseSpecs } from "./prepare-aie2040-exercises.mjs";
import { digest, protectedView, root, validateNote } from "./import-aie2040-exercises.mjs";

nextEnv.loadEnvConfig(process.cwd());
const baseURL = process.env.QA_BASE_URL || "http://127.0.0.1:3000";
const assert = (value, message) => { if (!value) throw new Error(message); };
const report = JSON.parse(await fs.readFile(path.join(root, "import-report.json"), "utf8"));
const db = JSON.parse(await fs.readFile("data/app-db.json", "utf8"));
const ids = new Set(report.notes.map(note => note.noteId));
const qaDir = path.join(root, "qa");
await fs.mkdir(qaDir, { recursive: true });
assert(report.applied && report.sets === 30 && report.questions === 109 && ids.size === 5, "Import manifest mismatch");
assert(digest(protectedView(db, ids)) === report.protectedHash, "Non-target records changed since import");
const backup = JSON.parse(await fs.readFile(path.join(report.backupDir, "app-db.json"), "utf8"));
assert(digest(backup) === report.protectedHash, "Backup mismatch");
const assets = db.mediaAssets.filter(asset => ids.has(asset.noteId));
assert(assets.length === 64, "Expected 64 source pages (30 practice, 30 answers, 4 context)");
for (const item of report.notes) {
  const spec = exerciseSpecs.find(spec => spec.chapter === item.chapter);
  const note = db.notes.find(note => note.id === item.noteId);
  const original = db.notes.find(note => note.id === item.sourceNoteId);
  assert(note.userId === report.userId && note.courseId === report.courseId && note.lessonId === original.lessonId, "Note location mismatch");
  assert(digest(note.contentMarkdown) === item.contentHash, "Imported note changed");
  validateNote(spec, note.contentMarkdown, assets.filter(asset => asset.noteId === item.noteId), item.noteId, report.userId);
}

const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret-change-me-for-production");
const tokenFor = id => new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject(id).setIssuedAt().setExpirationTime("30m").sign(secret);
const cookie = { name: "study_session", value: await tokenFor(report.userId), domain: new URL(baseURL).hostname, path: "/", httpOnly: true, secure: false, expires: -1, sameSite: "Lax" };
const api = await request.newContext({ baseURL, storageState: { cookies: [cookie], origins: [] } });
assert((await api.get("/")).status() === 200, "Home unavailable");
assert((await (await api.get("/api/health")).json()).status === "ok", "Health unavailable");
let cursor = 0;
await Promise.all(Array.from({ length: 8 }, async () => {
  while (cursor < assets.length) {
    const asset = assets[cursor++];
    const item = report.notes.find(note => note.noteId === asset.noteId);
    const response = await api.get(`/api/media/${asset.id}`, { timeout: 60000 });
    assert(response.status() === 200 && response.headers()["content-type"].includes("image/webp"), "Media unavailable");
    const buffer = await response.body();
    const metadata = await sharp(buffer).metadata();
    assert(metadata.width === asset.width && metadata.height === asset.height, "Source image dimensions changed");
    const source = await fs.readFile(`data/aie2040-chapters/chapter${item.chapter}/pages/page-${String(asset.slideNumber).padStart(3, "0")}.webp`);
    const hashBytes = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
    assert(hashBytes(buffer) === hashBytes(source), `Wrong original page: chapter${item.chapter}/${asset.slideNumber}`);
    await response.dispose();
  }
}));
const anonymous = await request.newContext({ baseURL });
assert((await anonymous.get(`/api/media/${assets[0].id}`)).status() === 401, "Anonymous media access allowed");
await anonymous.dispose();
const other = db.users.find(user => user.id !== report.userId);
if (other) {
  const foreign = await request.newContext({ baseURL, storageState: { cookies: [{ ...cookie, value: await tokenFor(other.id) }], origins: [] } });
  assert((await foreign.get(`/api/media/${assets[0].id}`)).status() === 404, "Cross-account access allowed");
  await foreign.dispose();
}
console.log("Verified 64 original images, account isolation, and unchanged original records.");

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
await context.addCookies([cookie]);
let aiRequests = 0;
const errors = [];
await context.route("**/api/**", async route => {
  if (route.request().url().includes("/api/ai/")) { aiRequests++; await route.abort(); }
  else if (route.request().method() !== "GET") await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  else await route.continue();
});
const page = await context.newPage();
page.setDefaultTimeout(30000);
page.on("pageerror", error => errors.push(error.message));
const results = [];
try {
  await page.goto(baseURL, { waitUntil: "domcontentloaded", timeout: 120000 });
  const cover = page.getByRole("dialog", { name: "银河系搭车客指南封面" });
  if (await cover.isVisible().catch(() => false)) await cover.getByRole("button", { name: "打开随身指南", exact: true }).click();
  const collapse = page.getByTitle("收起 AI 整理台");
  if (await collapse.isVisible().catch(() => false)) await collapse.click();
  for (const item of report.notes) {
    const spec = exerciseSpecs.find(spec => spec.chapter === item.chapter);
    const search = page.getByRole("textbox", { name: "搜索全部笔记", exact: true });
    await search.click();
    await search.fill("六套练习");
    await page.getByLabel("筛选课程", { exact: true }).selectOption(report.courseId);
    await page.getByLabel("筛选章节", { exact: true }).selectOption(item.lessonId);
    await page.getByLabel("筛选笔记", { exact: true }).selectOption(item.noteId);
    await expect(page.locator(".search-result-card").first()).toBeVisible();
    await page.locator(".search-result-card").first().click();
    const reader = page.locator(`#note-${item.noteId}.note-reader`);
    await reader.waitFor();
    const organizerToggle = page.getByRole("button", { name: "收起 AI 整理台", exact: true });
    if (await organizerToggle.isVisible().catch(() => false)) await organizerToggle.click();
    await expect(reader.locator(".panel-heading h2")).toHaveText(item.title);
    const main = reader.locator("article.markdown").first();
    await expect(main.locator(".note-page-heading")).toHaveCount(item.pages.length);
    await expect(main.locator(".page-source-button")).toHaveCount(item.pages.length);
    await expect(main.locator(".katex-error")).toHaveCount(0);
    await expect(main.locator(".katex")).toHaveCount(item.formulas);
    const actualPageLabels = await main.locator("h3 .page-source-button").evaluateAll(buttons => buttons.map(button => button.getAttribute("aria-label")));
    assert(actualPageLabels.every((label, index) => label === `查看第${item.pages[index]}页原课件`), "Source button order mismatch");
    const vocabulary = main.getByRole("heading", { name: "英语术语分类总表", exact: true });
    await expect(vocabulary.locator("xpath=following::table[1]").locator("tbody tr")).toHaveCount(item.vocabularyTerms);
    const images = main.locator(".note-image-button img");
    await expect(images).toHaveCount(item.pages.length);
    await images.evaluateAll(elements => elements.forEach(img => { img.loading = "eager"; }));
    await expect.poll(() => images.evaluateAll(elements => elements.every(img => img.complete && img.naturalWidth > 0)), { timeout: 60000 }).toBe(true);
    for (const number of item.pages) {
      const heading = main.getByRole("heading", { level: 3 }).filter({ hasText: new RegExp(`^第${number}页｜`) });
      await heading.locator(".page-source-button").evaluate(button => button.click());
      const dialog = page.getByRole("dialog", { name: `第${number}页原课件`, exact: true });
      const asset = assets.find(asset => asset.noteId === item.noteId && asset.slideNumber === number);
      await expect(dialog).toBeVisible();
      await expect(dialog.locator("img")).toHaveAttribute("src", `/api/media/${asset.id}`);
      await expect.poll(() => dialog.locator("img").evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
      await page.getByRole("button", { name: "关闭原课件预览", exact: true }).click();
    }
    // Exercise image zoom is independent of the page-heading source preview.
    await main.locator(".note-image-button").first().evaluate(button => button.click());
    await expect(page.getByRole("dialog", { name: "图片预览", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "关闭图片预览", exact: true }).click();
    const firstImage = images.first();
    await firstImage.scrollIntoViewIfNeeded();
    await expect.poll(() => firstImage.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
    assert(await firstImage.evaluate(img => {
      const bounds = img.getBoundingClientRect();
      return Math.abs(bounds.width / bounds.height - img.naturalWidth / img.naturalHeight) < 0.03;
    }), "Image aspect ratio distorted");
    for (const [label, number] of [["practice", spec.questions[0]], ["solution", spec.answers[0]]]) {
      await main.getByRole("heading", { level: 3 }).filter({ hasText: new RegExp(`^第${number}页｜`) }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(qaDir, `chapter${item.chapter}-${label}.png`), animations: "disabled" });
    }
    await vocabulary.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(qaDir, `chapter${item.chapter}-vocabulary.png`), animations: "disabled" });
    const appendix = reader.locator("details.courseware-appendix");
    await appendix.locator("summary").first().click();
    await expect(appendix.locator("h3")).toHaveCount(item.pages.length);
    await appendix.locator("summary").first().click();
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), "Desktop horizontal overflow");
    results.push({ chapter: item.chapter, sets: 6, questions: item.questions, sourceButtons: item.pages.length, verifiedPageMappings: item.pages, formulas: item.formulas, vocabularyTerms: item.vocabularyTerms, imageZoom: true });
    console.log(`Chapter ${item.chapter} passed: 6 sets, ${item.questions} questions, ${item.pages.length} original-page buttons.`);
  }
  assert(aiRequests === 0 && errors.length === 0, `Browser/AI errors: ${errors.join("; ")}`);
  const after = JSON.parse(await fs.readFile("data/app-db.json", "utf8"));
  assert(digest(protectedView(after, ids)) === report.protectedHash, "QA changed original records");
  const result = { passed: true, verifiedAt: new Date().toISOString(), sets: 30, questions: 109, mediaAssets: 64, sourceButtons: 64, nonTargetRecordsUnchanged: true, accountIsolation: true, aiRequests, browserErrors: errors, notes: results };
  await fs.writeFile(path.join(qaDir, "results.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  await page.screenshot({ path: path.join(qaDir, "failure.png"), animations: "disabled" }).catch(() => undefined);
  throw error;
} finally {
  await browser.close();
  await api.dispose();
}
