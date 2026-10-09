import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import ts from "typescript";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import katex from "katex";

const root = path.resolve("data/phy1000-review");
const readJson = async (file) => JSON.parse(await fs.readFile(file, "utf8"));
const mapping = await readJson(path.join(root, "import.json"));
const hash = (value) => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
const marker = "\n<!-- courseware-appendix -->\n";
const ids = new Set(mapping.notes.map((item) => item.noteId));
const protectedData = (db) => ({ ...db, notes: db.notes.filter((note) => !ids.has(note.id)) });
const immutable = ({ contentMarkdown, summary, updatedAt, ...rest }) => rest;
const assert = (condition, reason) => { if (!condition) throw new Error(reason); };
const baseline = await readJson("data/app-db.json");
const protectedHash = hash(protectedData(baseline));
const parser = unified().use(remarkParse).use(remarkMath).use(remarkGfm);
const walk = (node, fn) => { fn(node); for (const child of node.children ?? []) walk(child, fn); };
const drafts = [];

for (const entry of mapping.notes) {
  const original = baseline.notes.find((note) => note.id === entry.noteId);
  assert(original?.userId === mapping.userId && original.courseId === mapping.courseId, "Owner/course mismatch");
  assert(original.lessonId === entry.lessonId, "Lesson mismatch");
  const materials = await readJson(path.join(root, entry.key, "materials.json"));
  assert(materials.pageCount === entry.pages, "Source page count changed");
  const rawBody = await fs.readFile(path.join(root, entry.key, "pagewise.md"), "utf8");
  const sections = [...rawBody.matchAll(/^### 第(\d+)页｜(.+)\n([\s\S]*?)(?=^### 第\d+页｜|$(?![\s\S]))/gm)];
  assert(sections.length === entry.pages, `${entry.key}: missing page headings`);
  for (let index = 0; index < sections.length; index += 1) {
    const section = sections[index];
    assert(Number(section[1]) === index + 1, `${entry.key}: wrong page sequence`);
    assert(section[3].replace(/\{\{page:[^}]+\}\}/g, "").trim().length > 35, `${entry.key}: unexplained page`);
    for (const figure of section[3].matchAll(/\{\{page:(\d+)\|/g)) {
      assert(Number(figure[1]) === index + 1, `${entry.key}: misplaced figure`);
    }
  }
  const assets = baseline.mediaAssets.filter((asset) => asset.noteId === entry.noteId && asset.userId === mapping.userId);
  const byPage = new Map(assets.map((asset) => [asset.slideNumber, asset]));
  assert(assets.length === entry.pages && byPage.size === entry.pages, `${entry.key}: asset coverage mismatch`);
  for (let page = 1; page <= entry.pages; page += 1) {
    const asset = byPage.get(page);
    assert(asset?.sourceFile === entry.sourceFile, `${entry.key}: source mismatch at page ${page}`);
    await fs.access(path.join("data/media", asset.storageName));
  }
  const resolve = (markdown) => markdown.replace(/\{\{page:(\d+)\|([^}]+)\}\}/g, (_, page, caption) => {
    const asset = byPage.get(Number(page));
    assert(asset, `Missing figure ${page}`);
    return `![${caption.replace(/[\[\]\r\n]/g, " ")}](/api/media/${asset.id})\n\n*原课件：${entry.sourceFile}，PDF 第${page}页。${caption}。*`;
  });
  const oldDraft = await fs.readFile(path.join(root, entry.key, "note.md"), "utf8");
  const split = oldDraft.search(/^## 第 /m);
  assert(split > 0, `${entry.key}: thematic review boundary missing`);
  const introduction = oldDraft.slice(0, split).trim();
  // Figures are already next to the corresponding page; avoid duplicating them in thematic review.
  const mainFigurePages = new Set([...rawBody.matchAll(/\{\{page:(\d+)\|/g)].map((match) => Number(match[1])));
  const review = oldDraft.slice(split).trim().replace(/\{\{page:(\d+)\|[^}]+\}\}/g, (_, number) => {
    assert(mainFigurePages.has(Number(number)), "Review figure missing from pagewise body");
    return `原图与读图讲解见上方第${number}页小节。`;
  });
  const thematic = review.replace(/^(#{2,5}) /gm, "$1# ");
  const illustratedBody = "## 逐页详细讲解\n\n" + sections.map((section) => {
    const heading = `### 第${section[1]}页｜${section[2]}`;
    const figure = section[3].match(/\{\{page:\d+\|[^}]+\}\}/g);
    if (!figure) return `${heading}\n${section[3].trim()}`;
    const explanation = section[3].replace(/\{\{page:\d+\|[^}]+\}\}/g, "").trim();
    const stop = explanation.indexOf("。");
    const canSplit = stop > 0 && explanation.slice(stop + 1).trim().length > 30;
    const introduction = canSplit ? explanation.slice(0, stop + 1) : "";
    const reading = canSplit ? explanation.slice(stop + 1).trim() : explanation;
    return `${heading}\n${introduction}\n\n${figure.join("\n\n")}\n\n**读图提示：** ${reading}`;
  }).join("\n\n");
  const appendixStart = original.contentMarkdown.indexOf(marker);
  assert(appendixStart >= 0, `${entry.key}: appendix missing`);
  const appendix = original.contentMarkdown.slice(appendixStart);
  assert([...appendix.matchAll(/^### 第 \d+ 页/gm)].length === entry.pages, "Incomplete original appendix");
  let body = resolve(`${introduction}\n\n> 阅读顺序：先看概念框架，再按 PDF 实际页码逐页学习；每页的必要原图紧邻讲解，图后的读图提示包含本页的详细解释。后面的主题回顾用于集中复习和完整推导，不代替逐页正文。课件原页与原文全部保留在折叠核对附录。\n\n${illustratedBody}\n\n## 按主题回顾与完整推导\n\n${thematic}`);
  body = body.replace(/\*\*([^*\n]+)\*\*/gu, (full, label, offset, input) => {
    const next = input[offset + full.length] ?? "";
    return full + (/[\p{P}\p{S}]$/u.test(label) && /[\p{L}\p{N}$]/u.test(next) ? " " : "");
  });
  let formulas = 0;
  walk(parser.parse(body), (node) => {
    if (node.type === "math" || node.type === "inlineMath") {
      katex.renderToString(node.value, { throwOnError: true, displayMode: node.type === "math", strict: "ignore" });
      formulas += 1;
    }
    assert(!(node.type === "text" && node.value.includes("**")), `${entry.key}: broken bold syntax`);
  });
  const contentMarkdown = `${body}\n${appendix}`;
  assert(!/\{\{page:|courseware:/.test(contentMarkdown), "Unresolved media placeholder");
  for (const match of contentMarkdown.matchAll(/\]\(\/api\/media\/([^\s)]+)\)/g)) {
    assert(assets.some((asset) => asset.id === match[1]), "Foreign image reference");
  }
  const pagewise = resolve(rawBody);
  const inlineFigures = [...pagewise.matchAll(/!\[/g)].length;
  await fs.writeFile(path.join(root, entry.key, "pagewise-final.md"), contentMarkdown, "utf8");
  drafts.push({ entry, contentMarkdown, summary: `按原课件${entry.pages}页逐页讲解，保留重要英文术语、公式条件、例题步骤和对应原图；附概念框架、主题推导与完整原页核对附录。`, baselineHash: hash(original), immutableHash: hash(immutable(original)), appendixHash: hash(appendix), inlineFigures, formulas });
}

const report = {
  generatedAt: new Date().toISOString(), userId: mapping.userId, courseId: mapping.courseId,
  protectedHash, notes: drafts.map(({ entry, immutableHash, appendixHash, inlineFigures, formulas, contentMarkdown }) => ({ key: entry.key, noteId: entry.noteId, pages: entry.pages, inlineFigures, formulas, immutableHash, appendixHash, contentHash: hash(contentMarkdown) })),
  totals: { chapters: drafts.length, pages: drafts.reduce((n, d) => n + d.entry.pages, 0), inlineFigures: drafts.reduce((n, d) => n + d.inlineFigures, 0) }
};
if (!process.argv.includes("--apply")) {
  console.log(JSON.stringify({ dryRun: true, ...report.totals, formulas: drafts.reduce((n, d) => n + d.formulas, 0) }));
  process.exit(0);
}

const backupDir = path.resolve("data/backups", `phy1000-pagewise-${new Date().toISOString().replace(/[:.]/g, "-")}`);
await fs.mkdir(backupDir, { recursive: true });
await fs.writeFile(path.join(backupDir, "notes.json"), JSON.stringify(baseline.notes.filter((note) => ids.has(note.id)), null, 2));
await fs.writeFile(path.join(backupDir, "audit.json"), JSON.stringify(report, null, 2));
const dbModule = path.join(root, "pagewise-db.mjs");
await fs.writeFile(dbModule, ts.transpileModule(await fs.readFile("lib/db.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText);
const { mutateDb } = await import(`file:///${dbModule.replace(/\\/g, "/")}`);
await mutateDb((db) => {
  assert(hash(protectedData(db)) === protectedHash, "Protected workspace changed; refusing write");
  for (const draft of drafts) {
    const note = db.notes.find((item) => item.id === draft.entry.noteId);
    assert(hash(note) === draft.baselineHash, "Target changed concurrently; refusing write");
  }
  for (const draft of drafts) {
    const note = db.notes.find((item) => item.id === draft.entry.noteId);
    Object.assign(note, { contentMarkdown: draft.contentMarkdown, summary: draft.summary, updatedAt: new Date().toISOString() });
  }
});
const after = await readJson("data/app-db.json");
assert(hash(protectedData(after)) === protectedHash, "Unexpected non-target changes");
for (const draft of drafts) {
  const note = after.notes.find((item) => item.id === draft.entry.noteId);
  assert(hash(immutable(note)) === draft.immutableHash, "Immutable note fields changed");
  assert(hash(note.contentMarkdown.slice(note.contentMarkdown.indexOf(marker))) === draft.appendixHash, "Appendix changed");
}
report.appliedAt = new Date().toISOString();
report.backupDir = backupDir;
await fs.writeFile(path.join(root, "pagewise-report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ applied: true, ...report.totals, otherDataUnchanged: true }));
