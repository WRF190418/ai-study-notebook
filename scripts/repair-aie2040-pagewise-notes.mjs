import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const dbPath = path.join(process.cwd(), "data", "app-db.json");
const reportPath = path.join(process.cwd(), "data", "aie2040-review", "import-report.json");
const backupDir = path.join(process.cwd(), "data", "backups");
const appendixMarker = "<!-- courseware-appendix -->";

const specs = {
  introduction: {
    summary: "AIE2040 Lecture 1 逐页整理：按37页讲解统计机器学习导论，正文保留必要原图与读图提示，附录保留完整逐页课件核对。"
  },
  examples: {
    summary: "AIE2040 Lecture 1 补充逐页整理：按102页讲解寿命、收入、吸烟与雾霾案例，正文保留必要原图与读图提示，附录保留完整逐页课件核对。"
  },
  distributions: {
    summary: "AIE2040 Lecture 2 逐页整理：按22页讲解概率分布、误差规格、参数与似然，正文保留必要原图与读图提示，附录保留完整逐页课件核对。"
  },
  ai: {
    summary: "AIE2040 AI专题逐页整理：按77页讲解AI中的概率、分布、推断和概率模型，正文保留必要原图与读图提示，附录保留完整逐页课件核对。"
  }
};

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function count(pattern, text) {
  return (text.match(pattern) || []).length;
}

function coverageSection(noteTitle, pages, inlineFigures) {
  return `## 逐页覆盖核对

本笔记已按当前课件整理规则覆盖 ${pages} 页：正文从第1页到第${pages}页连续建立独立小节，未把多页合并成概览；正文选取 ${inlineFigures} 张必要原图，均紧邻对应页讲解，并配有“读图提示”；完整逐页原图与提取文字保留在下方课件核对附录中。${noteTitle.includes("AI专题") ? "AI专题原文件名含方括号，正文图片 alt 已转为安全文本，避免 Markdown 图片语法失效。" : ""}
`;
}

function repairMarkdown(markdown, noteTitle, pages, inlineFigures) {
  let next = markdown.replaceAll(
    "probability-statistics-ai-lecture [Repaired].pdf",
    "probability-statistics-ai-lecture Repaired.pdf"
  );

  const markerIndex = next.indexOf(appendixMarker);
  if (markerIndex < 0) {
    throw new Error(`${noteTitle}: appendix marker missing`);
  }

  let main = next.slice(0, markerIndex).trimEnd();
  const appendix = next.slice(markerIndex).trimStart();
  const coverage = coverageSection(noteTitle, pages, inlineFigures);

  if (/^## 逐页覆盖核对/m.test(main)) {
    main = main.replace(/^## 逐页覆盖核对\n\n[\s\S]*$/m, coverage.trimEnd());
  } else {
    main = `${main}\n\n${coverage.trimEnd()}`;
  }

  return `${main}\n\n${appendix}`;
}

function validateNote(db, note, item) {
  const [main, appendix] = note.contentMarkdown.split(appendixMarker);
  if (!appendix) throw new Error(`${item.key}: appendix missing`);

  const headings = [...main.matchAll(/^### 第([0-9]+)页｜/gm)].map((match) => Number(match[1]));
  if (headings.length !== item.pages || !headings.every((page, index) => page === index + 1)) {
    throw new Error(`${item.key}: page headings invalid`);
  }

  const appendixPages = count(/^### 第 [0-9]+ 页/gm, appendix);
  if (appendixPages !== item.pages) {
    throw new Error(`${item.key}: appendix page count ${appendixPages} != ${item.pages}`);
  }

  const inlineImages = count(/!\[[^\]\n]*\]\(\/api\/media\/[A-Za-z0-9_-]+\)/g, main);
  const hints = count(/读图提示：/g, main);
  if (inlineImages !== item.inlineFigures) {
    throw new Error(`${item.key}: inline image count ${inlineImages} != ${item.inlineFigures}`);
  }
  if (hints !== item.inlineFigures) {
    throw new Error(`${item.key}: reading hint count ${hints} != ${item.inlineFigures}`);
  }
  if (/courseware:|\{\{page:|[A-Z]:\\/.test(note.contentMarkdown)) {
    throw new Error(`${item.key}: unresolved or local reference remains`);
  }
  if (/!\[[^\]\n]*\[[^\]\n]*\]\(\/api\/media\//.test(note.contentMarkdown)) {
    throw new Error(`${item.key}: unsafe square bracket remains inside image alt`);
  }

  const mediaIds = new Set(db.mediaAssets.map((asset) => asset.id));
  const refs = [...note.contentMarkdown.matchAll(/\/api\/media\/([A-Za-z0-9_-]+)/g)].map((match) => match[1]);
  const missing = refs.filter((id) => !mediaIds.has(id));
  if (missing.length) {
    throw new Error(`${item.key}: missing media refs ${missing.join(", ")}`);
  }

  const assets = db.mediaAssets.filter((asset) => asset.noteId === note.id);
  if (assets.length !== item.assets) {
    throw new Error(`${item.key}: media asset count ${assets.length} != ${item.assets}`);
  }

  return {
    key: item.key,
    pages: item.pages,
    inlineFigures: inlineImages,
    hints,
    assets: assets.length,
    contentChars: note.contentMarkdown.length,
    contentHash: hash(note.contentMarkdown),
    appendixHash: hash(note.contentMarkdown.slice(note.contentMarkdown.indexOf(appendixMarker)))
  };
}

const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));

fs.mkdirSync(backupDir, { recursive: true });
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const dbBackup = path.join(backupDir, `before-repair-aie2040-pagewise-${timestamp}-app-db.json`);
const reportBackup = path.join(backupDir, `before-repair-aie2040-pagewise-${timestamp}-import-report.json`);
fs.writeFileSync(dbBackup, JSON.stringify(db, null, 2), "utf8");
fs.writeFileSync(reportBackup, JSON.stringify(report, null, 2), "utf8");

const summaries = [];
for (const item of report.notes) {
  const note = db.notes.find((entry) => entry.id === item.noteId);
  if (!note) throw new Error(`${item.key}: note not found`);
  note.contentMarkdown = repairMarkdown(note.contentMarkdown, note.title, item.pages, item.inlineFigures);
  note.summary = specs[item.key]?.summary || note.summary;
  note.updatedAt = new Date().toISOString();
  summaries.push(validateNote(db, note, item));
}

report.notes = report.notes.map((item) => {
  const summary = summaries.find((entry) => entry.key === item.key);
  return {
    ...item,
    contentChars: summary.contentChars,
    contentHash: summary.contentHash,
    appendixHash: summary.appendixHash
  };
});
report.repairedAt = new Date().toISOString();
report.repairNote = "AIE2040 pagewise notes updated to current image placement requirements: safe Markdown image alt text, page coverage audit sections, inline figure/read-hint parity.";

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), "utf8");
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

console.log(
  JSON.stringify(
    {
      repaired: true,
      dbBackup,
      reportBackup,
      notes: summaries
    },
    null,
    2
  )
);
