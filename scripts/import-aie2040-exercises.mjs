// Manually authored notes only. No AI calls; default is read-only validation.
// Run prepare-aie2040-exercises.mjs for source inspection, author chapterN-authored.md
// under data/aie2040-exercises, then run this script [--apply] to add five notes.
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { nanoid } from "nanoid";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import katex from "katex";
import { exerciseSpecs } from "./prepare-aie2040-exercises.mjs";

export const root = path.resolve("data/aie2040-exercises");
export const marker = "\n<!-- courseware-appendix -->\n";
export const digest = value => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
export const titleFor = spec => `Chapter ${spec.chapter}｜六套练习汇编与逐题讲解`;
const assert = (value, message) => { if (!value) throw new Error(message); };

export function protectedView(db, noteIds) {
  return {
    ...db,
    notes: db.notes.filter(note => !noteIds.has(note.id)),
    mediaAssets: db.mediaAssets.filter(asset => !noteIds.has(asset.noteId))
  };
}

export function validateNote(spec, markdown, assets, noteId, userId) {
  const [main, appendix = ""] = markdown.split(marker);
  const expected = [...spec.questions, ...spec.answers, ...spec.context].sort((a, b) => a - b);
  const pages = [...main.matchAll(/^### 第(\d+)页｜/gm)].map(match => Number(match[1]));
  const appendixPages = [...appendix.matchAll(/^### 第 (\d+) 页$/gm)].map(match => Number(match[1]));
  assert(JSON.stringify(pages) === JSON.stringify(expected), `Chapter ${spec.chapter}: body page order/coverage`);
  assert(JSON.stringify(appendixPages) === JSON.stringify(expected), `Chapter ${spec.chapter}: appendix page coverage`);
  const sections = main.split(/(?=^### 第\d+页｜)/m);
  for (const [index, number] of spec.questions.entries()) {
    const section = sections.find(text => text.startsWith(`### 第${number}页｜`));
    const questions = [...section.matchAll(/^(\d+)\. /gm)].map(match => Number(match[1]));
    assert(questions.length === spec.counts[index] && questions.every((n, i) => n === i + 1), `Chapter ${spec.chapter} set ${index + 1}: question coverage`);
  }
  assert((main.match(/读图提示：/g) || []).length === expected.length, "Missing figure hints");
  assert(!/\{\{|courseware:|[A-Z]:\\/.test(markdown), "Unresolved placeholder or local path");
  const imageIds = [...markdown.matchAll(/!\[[^\]\n]*\]\(\/api\/media\/([A-Za-z0-9_-]+)\)/g)].map(match => match[1]);
  assert(imageIds.length === 2 * expected.length, "Body/appendix image coverage");
  for (const number of expected) {
    const asset = assets.find(item => item.slideNumber === number);
    assert(asset && asset.noteId === noteId && asset.userId === userId, "Missing or foreign media");
    const section = sections.find(text => text.startsWith(`### 第${number}页｜`));
    assert(section.includes(`/api/media/${asset.id}`), `Wrong body image page ${number}`);
    const entry = appendix.split(`### 第 ${number} 页\n`)[1]?.split("\n### 第 ")[0];
    assert(entry?.includes(`/api/media/${asset.id}`), `Wrong appendix image page ${number}`);
  }
  const vocabulary = main.split("## 英语术语分类总表\n")[1];
  assert(vocabulary && !vocabulary.includes("\n## "), "Vocabulary must be last body section");
  const vocabularyTerms = (vocabulary.match(/^\| /gm) || []).length - 2;
  assert(vocabularyTerms >= 10, "Missing categorized vocabulary");
  const tree = unified().use(remarkParse).use(remarkGfm).use(remarkMath).parse(main);
  let formulas = 0;
  const visit = node => {
    if (node.type === "math" || node.type === "inlineMath") {
      katex.renderToString(node.value, { displayMode: node.type === "math", throwOnError: true, strict: false });
      formulas++;
    }
    for (const child of node.children || []) visit(child);
  };
  visit(tree);
  // A malformed display block can swallow later headings even if its LaTeX renders.
  assert(tree.children.filter(node => node.type === "heading" && node.depth === 3).length === expected.length, "Markdown swallowed page headings");
  return { pages: expected, sets: 6, questions: spec.counts.reduce((sum, count) => sum + count, 0), formulas, vocabularyTerms, contentHash: digest(markdown) };
}

async function run() {
  const apply = process.argv.includes("--apply");
  const dbPath = path.resolve("data/app-db.json");
  const raw = await fs.readFile(dbPath, "utf8");
  const baseline = JSON.parse(raw);
  const source = baseline.notes.find(note => note.id === exerciseSpecs[0].noteId);
  assert(source, "Original Chapter 1 note not found");
  const { userId, courseId } = source;
  assert(baseline.courses.some(course => course.id === courseId && course.userId === userId && course.code === "AIE2040"), "Course/account mismatch");
  const existing = exerciseSpecs.map(spec => baseline.notes.find(note => note.userId === userId && note.courseId === courseId && note.title === titleFor(spec)));
  if (existing.some(Boolean)) {
    assert(existing.every(Boolean), "Partial previous import: review before applying");
    const previous = JSON.parse(await fs.readFile(path.join(root, "import-report.json"), "utf8"));
    for (const [index, spec] of exerciseSpecs.entries()) {
      const item = previous.notes.find(note => note.chapter === spec.chapter);
      assert(item?.noteId === existing[index].id && digest(existing[index].contentMarkdown) === item.contentHash, "Existing import changed: do not overwrite");
    }
    console.log(JSON.stringify({ applied: false, alreadyImported: true, sets: 30, questions: 109 }));
    return;
  }

  const next = structuredClone(baseline);
  const notes = [];
  const copies = [];
  const now = new Date().toISOString();
  for (const spec of exerciseSpecs) {
    const original = next.notes.find(note => note.id === spec.noteId);
    assert(original?.userId === userId && original.courseId === courseId && original.lessonId, "Source linkage mismatch");
    const materials = JSON.parse(await fs.readFile(`data/aie2040-chapters/chapter${spec.chapter}/materials.json`, "utf8"));
    const id = nanoid();
    const pages = [...spec.questions, ...spec.answers, ...spec.context].sort((a, b) => a - b);
    const assets = [];
    for (const number of pages) {
      const originalAsset = baseline.mediaAssets.find(asset => asset.noteId === original.id && asset.userId === userId && asset.sourceFile === materials.sourceFile && asset.slideNumber === number);
      assert(originalAsset, `Missing original Chapter ${spec.chapter} page ${number}`);
      assert(/^[A-Za-z0-9_-]+\.webp$/.test(originalAsset.storageName), "Unsafe storage name");
      const assetId = nanoid();
      const asset = { ...originalAsset, id: assetId, noteId: id, storageName: `${assetId}.webp`, createdAt: now };
      assets.push(asset);
      next.mediaAssets.push(asset);
      const from = path.resolve("data/media", originalAsset.storageName);
      await fs.access(from);
      copies.push({ from, to: path.resolve("data/media", asset.storageName) });
    }
    const authored = await fs.readFile(path.join(root, `chapter${spec.chapter}-authored.md`), "utf8");
    let markdown = authored.trim().replace(/\{\{image:(\d+)\}\}/g, (_match, n) => {
      const asset = assets.find(item => item.slideNumber === Number(n));
      assert(asset, `Unknown placeholder page ${n}`);
      return `![${materials.sourceFile}，第${n}页完整原页](/api/media/${asset.id})\n\n*${materials.sourceFile}，第${n}页；用于对照本节题干、条件或官方解答。*`;
    });
    markdown += `${marker}\n## 本篇所选练习与答案原页附录\n\n本篇按请求只选练习题、官方答案及被题目引用的必要条件，不声称覆盖整份 PDF。全部原页已在原整章笔记中保留；此处保留本篇所选原页。OCR 仅供检索，以原图为准。\n\n`;
    markdown += pages.map(number => {
      const asset = assets.find(item => item.slideNumber === number);
      const text = materials.pages.find(page => page.number === number)?.text || "（该页OCR未识别到文字，请核对原图。）";
      return `### 第 ${number} 页\n\n![${materials.sourceFile}，第${number}页完整原页](/api/media/${asset.id})\n\n<details><summary>原页OCR检索文本（可能含识别错误）</summary>\n\n\`\`\`text\n${text.replaceAll("```", "'''")}\n\`\`\`\n\n</details>`;
    }).join("\n\n");
    const validation = validateNote(spec, markdown, assets, id, userId);
    const note = {
      id, userId, courseId, lessonId: original.lessonId, title: titleFor(spec), sourceType: "file",
      sourceText: `来源：${materials.sourceFile}；六套练习${spec.questions.join("、")}页；官方答案${spec.answers.join("、")}页。\n\n` + pages.map(number => `第${number}页\n${materials.pages.find(page => page.number === number)?.text || ""}`).join("\n\n"),
      contentMarkdown: markdown,
      summary: `六套练习，共${validation.questions}道编号题；完整中文题干、切入点、逐题推理、官方答案和${pages.length}页原课件入口；末尾附分类英语术语。`,
      flashcards: [], mindMap: [], createdAt: now, updatedAt: now
    };
    next.notes.unshift(note);
    notes.push({ chapter: spec.chapter, noteId: id, lessonId: original.lessonId, sourceNoteId: original.id, title: note.title, sourceFile: materials.sourceFile, ...validation });
  }
  const ids = new Set(notes.map(note => note.noteId));
  const protectedHash = digest(baseline);
  assert(digest(protectedView(next, ids)) === protectedHash, "Non-target records changed");
  const report = { applied: apply, importedAt: now, userId, courseId, sets: 30, questions: 109, originalPages: copies.length, protectedHash, notes };
  if (!apply) {
    console.log(JSON.stringify({ ...report, userId: undefined, courseId: undefined }, null, 2));
    return;
  }
  const backupDir = path.resolve("data/backups", `aie2040-exercises-${now.replace(/[:.]/g, "-")}`);
  await fs.mkdir(backupDir, { recursive: true });
  await fs.writeFile(path.join(backupDir, "app-db.json"), raw, { flag: "wx" });
  const created = [];
  let committed = false;
  const temp = `${dbPath}.${nanoid()}.tmp`;
  try {
    for (const copy of copies) {
      await fs.copyFile(copy.from, copy.to, fs.constants.COPYFILE_EXCL);
      created.push(copy.to);
    }
    await fs.writeFile(temp, JSON.stringify(next, null, 2), { flag: "wx" });
    assert((await fs.readFile(dbPath, "utf8")) === raw, "Database changed during preparation; retry against latest state");
    await fs.rename(temp, dbPath);
    committed = true;
    report.backupDir = backupDir;
    await fs.writeFile(path.join(root, "import-report.json"), JSON.stringify(report, null, 2));
    for (const item of notes) await fs.writeFile(path.join(root, `chapter${item.chapter}-final.md`), next.notes.find(note => note.id === item.noteId).contentMarkdown);
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    // Once the DB is committed, its referenced assets must never be removed.
    if (!committed) for (const file of created) await fs.unlink(file).catch(() => undefined);
    await fs.unlink(temp).catch(() => undefined);
    throw error;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) await run();
