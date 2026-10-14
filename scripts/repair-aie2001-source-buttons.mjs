import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const root = process.cwd();
const dbPath = path.join(root, "data", "app-db.json");
const reportPath = path.join(root, "data", "aie2001-exam1-review", "import-report.json");
const backupRoot = path.join(root, "data", "backups");
const marker = "\n<!-- courseware-appendix -->\n";
const expectedPages = 189;

const digest = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

function count(pattern, value) {
  return (value.match(pattern) || []).length;
}

function validateContent(note) {
  const [main, appendix = ""] = note.contentMarkdown.split(marker);
  if (!appendix) throw new Error("AIE2001 appendix is missing");

  const headings = [...main.matchAll(/^### 第(\d+)页｜/gm)].map((match) => Number(match[1]));
  if (headings.length !== expectedPages || !headings.every((page, index) => page === index + 1)) {
    throw new Error(`AIE2001 page headings invalid: ${headings.length}/${expectedPages}`);
  }

  const appendixHeadings = [...appendix.matchAll(/^### 第 (\d+) 页/gm)].map((match) => Number(match[1]));
  if (appendixHeadings.length !== expectedPages || !appendixHeadings.every((page, index) => page === index + 1)) {
    throw new Error(`AIE2001 appendix headings invalid: ${appendixHeadings.length}/${expectedPages}`);
  }

  const inlineFigures = count(/!\[[^\]\n]*\]\(\/api\/media\/[A-Za-z0-9_-]+\)/g, main);
  const sourceButtons = count(/!\[[^\]\n]*\]\(\/api\/media\/[A-Za-z0-9_-]+\)/g, appendix);
  if (sourceButtons !== expectedPages) {
    throw new Error(`AIE2001 source button images invalid: ${sourceButtons}/${expectedPages}`);
  }

  if (/courseware:|\{\{page:|[A-Z]:\\/.test(note.contentMarkdown)) {
    throw new Error("AIE2001 note still contains unresolved local image references");
  }

  return { main, appendix, headings, appendixHeadings, inlineFigures, sourceButtons };
}

const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
const note = db.notes.find((item) => item.id === report.noteId && item.userId === report.userId);
if (!note) throw new Error("AIE2001 target note not found");

const before = validateContent(note);
const coverage = `## 逐页覆盖核对

本笔记已按当前课件整理规则覆盖 ${expectedPages} 页：正文从第1页到第${expectedPages}页连续建立独立小节，没有合并页码；每页都用中文说明实际内容、复习作用和与前后概念的关系；每个正文页标题右侧均可通过“查看该页原课件”按钮打开对应完整幻灯片。正文另选 ${before.inlineFigures} 张关键图表、病例图、错觉图、练习页或结构图，紧邻对应页讲解并配有“读图提示”；完整${expectedPages}页原图与提取文字保留在下方逐页课件核对附录中。`;

const nextMain = /\n## 逐页覆盖核对\n/.test(before.main)
  ? before.main.replace(/\n## 逐页覆盖核对\n[\s\S]*?(?=\n## 总复习检查\n)/, `\n${coverage}\n\n`)
  : before.main.replace(/\n## 总复习检查\n/, `\n${coverage}\n\n## 总复习检查\n`);

if (nextMain === before.main) throw new Error("AIE2001 coverage section insertion failed");

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(backupRoot, `aie2001-source-buttons-${timestamp}`);
fs.mkdirSync(backupDir, { recursive: true });
fs.writeFileSync(path.join(backupDir, "app-db.json"), JSON.stringify(db, null, 2), "utf8");

note.contentMarkdown = `${nextMain.trimEnd()}${marker}${before.appendix}`;
note.summary = `AIE2001 Exam 1 已按新规则校准：${expectedPages}页逐页讲解，每页标题右侧可打开对应原课件，正文保留${before.inlineFigures}张关键图表与读图提示，附录保留完整逐页核对。`;
note.updatedAt = new Date().toISOString();

const after = validateContent(note);
report.contentHash = digest(note.contentMarkdown);
report.sourceButtons = after.sourceButtons;
report.sourceButtonNote = "Every page heading is backed by the matching appendix source image for the page-source button.";
report.sourceButtonUpdatedAt = note.updatedAt;
report.sourceButtonBackupDir = backupDir;

const tmp = `${dbPath}.${timestamp}.tmp`;
fs.writeFileSync(tmp, JSON.stringify(db, null, 2), "utf8");
fs.renameSync(tmp, dbPath);
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

console.log(JSON.stringify({
  updated: true,
  backupDir,
  pages: after.headings.length,
  sourceButtons: after.sourceButtons,
  inlineFigures: after.inlineFigures,
  contentHash: report.contentHash
}, null, 2));
