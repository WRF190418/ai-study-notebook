import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { chromium, request, expect } from "@playwright/test";
import { SignJWT } from "jose";
import nextEnv from "@next/env";
import sharp from "sharp";

nextEnv.loadEnvConfig(process.cwd());
const dir = path.resolve("data/phy1000-review/qa-pagewise");
await fs.mkdir(dir, { recursive: true });
const db = JSON.parse(await fs.readFile("data/app-db.json", "utf8"));
const audit = JSON.parse(await fs.readFile("data/phy1000-review/pagewise-report.json", "utf8"));
const mapping = JSON.parse(await fs.readFile("data/phy1000-review/import.json", "utf8"));
const ids = new Set(audit.notes.map((note) => note.noteId));
const hash = (value) => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const protectedData = (value) => ({ ...value, notes: value.notes.filter((note) => !ids.has(note.id)) });
const verificationProtectedHash = hash(protectedData(db));
const changedSinceImport = verificationProtectedHash !== audit.protectedHash;
if (changedSinceImport) console.log("Non-target records changed since import; verifying current snapshot without overwriting it");
for (const entry of audit.notes) {
  const note = db.notes.find((item) => item.id === entry.noteId);
  const { contentMarkdown, summary, updatedAt, ...immutable } = note;
  assert(hash(immutable) === entry.immutableHash, "Immutable fields changed");
  assert(hash(contentMarkdown) === entry.contentHash, "Content changed since rewrite");
  assert(hash(contentMarkdown.slice(contentMarkdown.indexOf("\n<!-- courseware-appendix -->\n"))) === entry.appendixHash, "Appendix changed");
}
const assets = db.mediaAssets.filter((asset) => ids.has(asset.noteId));
const tokenFor = (userId) => new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject(userId).setIssuedAt().setExpirationTime("30m").sign(new TextEncoder().encode(process.env.AUTH_SECRET ?? "dev-secret-change-me-for-production"));
const cookie = { name: "study_session", value: await tokenFor(mapping.userId), domain: "localhost", path: "/", httpOnly: true, secure: false, expires: -1, sameSite: "Lax" };
const api = await request.newContext({ baseURL: "http://localhost:3000", storageState: { cookies: [cookie], origins: [] } });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await context.addCookies([cookie]);
let aiRequests = 0;
await context.route("**/api/**", async (route) => {
  if (route.request().url().includes("/api/ai/")) { aiRequests += 1; await route.abort(); }
  else if (route.request().method() !== "GET") await route.abort();
  else await route.continue();
});
const page = await context.newPage();
page.setDefaultTimeout(60000);
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const results = [];
try {
  console.log("Checking all 361 original images and access controls");
  for (let index = 0; index < assets.length; index += 1) {
    const asset = assets[index];
    const response = await api.get(`/api/media/${asset.id}`, { timeout: 60000 });
    assert(response.status() === 200, `Media not accessible at index ${index}`);
    assert(response.headers()["content-type"].includes("image/webp"), "Wrong media type");
    const metadata = await sharp(await response.body()).metadata();
    assert(metadata.width === asset.width && metadata.height === asset.height, "Image dimensions mismatch");
    await response.dispose();
    if ((index + 1) % 50 === 0) console.log(`Images verified: ${index + 1}/${assets.length}`);
  }
  const anonymous = await request.newContext({ baseURL: "http://localhost:3000" });
  const denied = await anonymous.get(`/api/media/${assets[0].id}`);
  assert(denied.status() === 401, "Anonymous image accessible");
  await denied.dispose();
  await anonymous.dispose();
  const other = db.users.find((user) => user.id !== mapping.userId);
  if (other) {
    const foreign = await request.newContext({ baseURL: "http://localhost:3000", storageState: { cookies: [{ ...cookie, value: await tokenFor(other.id) }], origins: [] } });
    const deniedOther = await foreign.get(`/api/media/${assets[0].id}`);
    assert(deniedOther.status() === 404, "Cross-account image accessible");
    await deniedOther.dispose();
    await foreign.dispose();
  }
  await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.getByLabel("选择课程").selectOption(mapping.courseId);
  await page.locator('.lesson-card').first().waitFor();
  const collapse = page.getByTitle("收起 AI 整理台");
  if (await collapse.count()) await collapse.click();
  assert(await page.locator(".lesson-card").count() === 8, "Incorrect chapter count");
  await page.screenshot({ path: path.join(dir, "course-home.png") });
  const keyPages = [59, 26, 19, 30, 36, 25, 36, 58];
  for (let index = 0; index < audit.notes.length; index += 1) {
    const entry = audit.notes[index];
    await page.locator(".lesson-card").nth(index).click();
    const reader = page.locator(".note-reader");
    await reader.waitFor();
    const body = reader.locator("article.markdown").first();
    assert(await body.locator("h3").filter({ hasText: /^第\d+页｜/ }).count() === entry.pages, `${entry.key}: rendered page coverage mismatch`);
    const appendix = reader.locator("details.courseware-appendix");
    assert(await appendix.count() === 1 && (await appendix.getAttribute("open")) === null, "Appendix must be collapsed");
    assert((await appendix.locator("summary").innerText()).includes(`${entry.pages} 页`), "Wrong appendix page count");
    assert(await reader.locator(".katex-error").count() === 0, `${entry.key}: KaTeX error`);
    assert(await page.locator(".flashcard .katex-error").count() === 0, "Flashcard formula error");
    assert(!/\{\{page:|courseware:/.test(await body.innerText()), "Placeholder rendered");
    const heading = body.getByRole("heading", { level: 3 }).filter({ hasText: new RegExp(`^第${keyPages[index]}页｜`) });
    await heading.scrollIntoViewIfNeeded();
    const figure = heading.locator("xpath=following-sibling::p[.//img][1]").locator(".note-image-button");
    assert(await figure.count() > 0, "Expected explanatory figure missing");
    await figure.scrollIntoViewIfNeeded();
    await figure.locator("img").evaluate((img) => { img.loading = "eager"; });
    await expect.poll(() => figure.locator("img").evaluate((img) => img.complete && img.naturalWidth > 0), { timeout: 60000 }).toBe(true);
    await figure.scrollIntoViewIfNeeded();
    const dimensions = await figure.locator("img").evaluate((img) => ({ naturalW: img.naturalWidth, naturalH: img.naturalHeight, w: img.getBoundingClientRect().width, h: img.getBoundingClientRect().height }));
    assert(Math.abs(dimensions.w / dimensions.h - dimensions.naturalW / dimensions.naturalH) < 0.02, "Distorted figure");
    await heading.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(dir, `${entry.key}-page-${keyPages[index]}.png`) });
    await figure.click();
    const dialog = page.getByRole("dialog", { name: "图片预览" });
    await dialog.waitFor();
    await expect.poll(() => dialog.locator("img").evaluate((img) => img.complete && img.naturalWidth > 0), { timeout: 60000 }).toBe(true);
    if (index === 0 || index === 7) await page.screenshot({ path: path.join(dir, `${entry.key}-zoom.png`) });
    await page.getByRole("button", { name: "关闭图片预览" }).click();
    await appendix.locator("summary").click();
    assert(await appendix.locator("h3").filter({ hasText: /^第 \d+ 页/ }).count() === entry.pages, "Rendered source appendix incomplete");
    await appendix.locator("summary").click();
    const overflow = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, view: innerWidth }));
    assert(overflow.page <= overflow.view + 2, `${entry.key}: page horizontal overflow`);
    results.push({ key: entry.key, pages: entry.pages, inlineFigures: entry.inlineFigures, formulasRendered: await reader.locator(".katex").count(), naturalSize: [dimensions.naturalW, dimensions.naturalH], overflow: false });
    console.log(`${entry.key}: page coverage, formulas, figure zoom and appendix passed`);
    await page.getByRole("button", { name: "返回课程章节" }).click();
  }
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.locator(".lesson-card").first().click();
  await page.locator(".note-reader").scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(dir, "wide-desktop.png") });
  assert(errors.length === 0, `Browser errors: ${errors.slice(0, 2).join("; ")}`);
  assert(aiRequests === 0, "Unexpected AI request");
  const current = JSON.parse(await fs.readFile("data/app-db.json", "utf8"));
  assert(hash(protectedData(current)) === verificationProtectedHash, "Non-target records changed during verification; rerun against latest snapshot");
  const result = { verifiedAt: new Date().toISOString(), imagesChecked: assets.length, pagesChecked: results.reduce((n, item) => n + item.pages, 0), aiRequests, browserErrors: errors, accountIsolation: true, protectedRecordsUnchangedDuringVerification: true, concurrentUpdatesSinceImport: changedSinceImport, verificationProtectedHash, notes: results };
  await fs.writeFile(path.join(dir, "results.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ passed: true, images: assets.length, pages: result.pagesChecked, aiRequests, browserErrors: errors.length }));
} catch (error) {
  await page.screenshot({ path: path.join(dir, "failure.png") }).catch(() => {});
  console.error(String(error.message).split("\n")[0]);
  process.exitCode = 1;
} finally {
  await browser.close();
  await api.dispose();
}
