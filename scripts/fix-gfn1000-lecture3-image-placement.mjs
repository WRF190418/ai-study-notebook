import fs from "node:fs";
import path from "node:path";

const dbPath = path.join(process.cwd(), "data", "app-db.json");
const backupDir = path.join(process.cwd(), "data", "backups");
const noteId = "020NwRIyYm8ljDYj4-3In";
const appendixMarker = "<!-- courseware-appendix -->";

const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
const note = db.notes.find((item) => item.id === noteId);

if (!note) {
  throw new Error(`Note not found: ${noteId}`);
}

const assetsByPage = new Map(
  db.mediaAssets
    .filter((asset) => asset.noteId === noteId && Number.isInteger(asset.slideNumber))
    .map((asset) => [asset.slideNumber, asset])
);

for (let page = 1; page <= 54; page += 1) {
  if (!assetsByPage.has(page)) {
    throw new Error(`Missing media asset for Lecture 3 page ${page}`);
  }
}

const imagePlan = new Map([
  [1, ["课程封面与指定文本", "确认本讲标题、课程来源、讲者和 Text 3a/3b；它说明本页是 Lecture 3 的总入口。"]],
  [3, ["科学方法循环图", "沿箭头读出 observe、form hypothesis、experiment、test hypothesis 的循环；No 会回到假设，Yes 表示暂时通过检验。"]],
  [4, ["范式转移定义与1687节点", "把定义文字和下方 Newton 时间节点一起看；本讲所谓转移指概念和实验实践同时改变。"]],
  [7, ["低文字提取页的完整原页", "本页文本提取为空，需以原页判断是否只有过渡或是否有不可提取的视觉信息。"]],
  [8, ["Newton 成就时间线", "按 mechanics、optics、mathematics 三栏读，注意 Principia、Opticks 与人生年龄位置。"]],
  [14, ["巨人问题的历史分期图", "从 Middle Ages 到 Renaissance 再到 Modern Science 读出本讲历史跨度，Aristotle 是旧框架的起点。"]],
  [15, ["从 Philoponus 到 Kepler 的人物链", "沿时间顺序看各人物分别改变哪一类自然解释，最后汇入 Newton。"]],
  [16, ["中世纪量化研究结构图", "重点看 quantitative investigation 下的 motion、quantity/intensity 和 diagram representation，它连接 Text 2。"]],
  [17, ["Renaissance 的数学语言与实验", "这页把中世纪量化推进到 Renaissance，读图时抓住 mathematic language 和 experiment 两个新增关键词。"]],
  [19, ["Ptolemy 地心模型与 Copernicus 日心模型对照", "对照两张宇宙模型，特别看 deferent、epicycle 与 heliocentrism 的替代关系。"]],
  [20, ["Copernicus 对 Aristotle 宇宙论的冲击", "叉号标出被日心说挑战的项目：geocentric universe 和 earth stationary。"]],
  [21, ["Tycho 的超新星与 geo-heliocentric system", "把左侧观测记录和右侧体系图一起读：Tycho 不是完全日心说，但已削弱天界不变。"]],
  [22, ["Tycho 观测对旧宇宙论的反驳", "右侧叉号说明哪些 Aristotle 假设被 Tycho 的观测继续动摇。"]],
  [24, ["Kepler 重视8角分误差的原页", "这页核心是数据精度迫使模型改变；读图时注意 8' 与 reject perfect circle 的关系。"]],
  [25, ["Kepler 第一定律椭圆图", "看太阳在焦点而非中心；major/minor axis 帮助理解椭圆不是完美圆。"]],
  [26, ["Kepler 第二定律等面积图", "比较 A1=A2 和不同弧长，理解 equal areas in equal times 导致非匀速。"]],
  [27, ["Kepler 第三定律比例图", "把 semi-major axis a 与周期 T 对应起来，读出 $T^2 \\propto a^3$ 的跨行星关系。"]],
  [28, ["Newton 前夜总结表", "按 Tycho、Kepler、Galileo 三块看旧宇宙论被逐项打叉的过程。"]],
  [30, ["Galileo 望远镜观测图", "月球山脉、木星卫星和太阳黑子分别反驳完美天界、地心中心和天界不变。"]],
  [31, ["Galileo 全面反驳 Aristotle 的对照页", "叉号不是零散事实，而是旧 cosmology 各假设被观测逐项冲击。"]],
  [35, ["落体思想实验题图", "看 cannonball、musket ball 和 rope 的组合，用图理解重轻物相连导致的 Aristotle 式矛盾。"]],
  [37, ["斜面实验与 why/how 对照", "左侧是用斜面放慢下落以测量速度-时间关系，右侧区分解释原因和描述运动方式。"]],
  [38, ["惯性运动示意图", "沿速度箭头看无阻力条件下的匀速直线运动，它通向 Newton 第一定律。"]],
  [39, ["再次回到巨人链并追问是否正确", "这张链条图用于复盘：前人提供问题和方法，但每个人也可能被后人修正。"]],
  [40, ["Hooke 与 Newton 通信和引力发现", "把 inertia、centripetal attraction 与 Hooke's Law 放在同一图中，理解 Newton 前的概念刺激。"]],
  [41, ["Hooke、Halley、Wren 与 Text 3a 问题页", "三位人物图不是装饰，提示 Newton 的问题来自学术网络和共同讨论。"]],
  [43, ["Halley 彗星预测页", "时间点 1705、1758、1986、2061 展示 Newton 方法的预测能力和数学理性的威信。"]],
  [44, ["Newton 的定义-公理-证明结构", "按 Definitions、Axioms、Prove Results 三层读，理解 Newton 贡献是系统化科学论证。"]],
  [45, ["Needham 对 modern science 的综合图", "从 experiments 与 mathematisation 两条箭头读出 modern science 的组合定义。"]],
  [46, ["范式转移的收束图", "把第4页定义与本页 experiments/mathematisation 合在一起，形成全讲闭环。"]],
  [48, ["Reflective Journal 总要求", "保留截止时间、字数和 Blackboard 模板要求；这是课件作业记录，不是当前新命令。"]],
  [49, ["Reflective Journal Topic 1 原题", "题图保留中英文原题和至少两篇文本的要求，避免复述时遗漏约束。"]],
  [50, ["Reflective Journal Topic 2 原题", "题图保留假设孩子阅读前三篇文本的情境和 reading order/reason 要求。"]],
  [51, ["Reflective Journal Topic 3 原题", "题图保留选择两位学者、两个关键词以及联系文本和生活反思的完整要求。"]],
  [52, ["Reflective Journal Topic 4 原题", "题图保留为何在科学发展史课程中讨论 Plato 和 Aristotle 的完整问法。"]],
  [53, ["Reflective Journal Topic 5 原题", "题图保留 Aristotle 直觉性与错误结论的矛盾，以及至少联系两篇文本的要求。"]],
  [54, ["Reflective Journal Topic 6 原题", "题图保留 higher education 目的这一反思题和至少两篇文本的要求。"]]
]);

const [main, appendixRest] = note.contentMarkdown.split(appendixMarker);
if (!appendixRest) {
  throw new Error("Appendix marker not found.");
}

const mediaLink = (page) => {
  const asset = assetsByPage.get(page);
  return `/api/media/${asset.id}`;
};

function stripInlineImages(sectionBody) {
  return sectionBody
    .replace(/^\s*!\[[^\]\n]*\]\((?:courseware:|\/api\/media\/)[^)]+\)\s*$/gm, "")
    .replace(/^\s*读图提示：.*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();
}

const rewrittenMain = main.replace(
  /^### 第([0-9]+)页｜([^\n]+)\n\n([\s\S]*?)(?=^### 第[0-9]+页｜|^## |(?![\s\S]))/gm,
  (full, pageText, title, body) => {
    const page = Number(pageText);
    let nextBody = stripInlineImages(body);
    const planned = imagePlan.get(page);
    if (planned) {
      const [purpose, hint] = planned;
      nextBody += `\n\n![Lecture_3 .pdf，第${page}页：${purpose}](${mediaLink(page)})\n\n读图提示：${hint}`;
    }
    return `### 第${page}页｜${title}\n\n${nextBody}\n\n`;
  }
);

const coverage = `## 逐页覆盖核对

正文已经为第1-54页分别建立独立小节。第7页 PDF 文本提取为空，已明确标注并插入完整原页图；第37页“velocity 与 time 成正比”与提取句“Falling objects have constant speed”存在表述张力，正文已保留并说明需要以原页和课堂语境核对。本次按图片写入规则补齐正文必要插图：流程/循环图、时间线、模型对照图、轨道/几何图、实验与思想实验图、综合结构图和 Reflective Journal 题目页均已紧邻对应小节插入，并为每张正文图补充读图提示。所有完整原页图和提取文字仍保存在下面的逐页课件核对附录中，方便放大检查公式、图像和多栏排版。
`;

const mainWithCoverage = rewrittenMain.replace(/## 逐页覆盖核对\n\n[\s\S]*$/m, coverage);
let nextContent = `${mainWithCoverage.trim()}\n\n${appendixMarker}${appendixRest}`;

nextContent = nextContent.replace(/\]\(courseware:([A-Za-z0-9_-]+)\)/g, (match, assetId) => {
  if (!db.mediaAssets.some((asset) => asset.id === assetId)) {
    throw new Error(`Unknown media asset ${assetId}`);
  }
  return `](/api/media/${assetId})`;
});

const mainOnly = nextContent.split(appendixMarker)[0];
const mainSections = (mainOnly.match(/^### 第[0-9]+页｜/gm) || []).length;
const mainImages = (mainOnly.match(/!\[[^\]\n]*\]\(\/api\/media\//g) || []).length;
const hints = (mainOnly.match(/读图提示：/g) || []).length;
const unresolved = (nextContent.match(/courseware:|\{\{page:/g) || []).length;
const missingMediaRefs = [...nextContent.matchAll(/\]\(\/api\/media\/([^)]+)\)/g)]
  .map((match) => match[1])
  .filter((assetId) => !db.mediaAssets.some((asset) => asset.id === assetId));

if (mainSections !== 54) {
  throw new Error(`Expected 54 sections, got ${mainSections}`);
}
if (mainImages !== imagePlan.size) {
  throw new Error(`Expected ${imagePlan.size} main images, got ${mainImages}`);
}
if (hints !== imagePlan.size) {
  throw new Error(`Expected ${imagePlan.size} image hints, got ${hints}`);
}
if (unresolved !== 0) {
  throw new Error(`Found ${unresolved} unresolved image placeholders`);
}
if (missingMediaRefs.length > 0) {
  throw new Error(`Missing media refs: ${missingMediaRefs.join(", ")}`);
}

fs.mkdirSync(backupDir, { recursive: true });
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupPath = path.join(backupDir, `before-fix-gfn1000-lecture3-images-${timestamp}.json`);
fs.writeFileSync(backupPath, JSON.stringify(note, null, 2), "utf8");

note.contentMarkdown = nextContent;
note.summary =
  "GFN1000 Lecture 3 逐页整理：已按图片规则补齐流程图、时间线、模型对照图、轨道/实验图、综合结构图和作业题页原图，并为正文插图添加读图提示。";
note.updatedAt = new Date().toISOString();

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), "utf8");

console.log(
  JSON.stringify(
    {
      noteId,
      mainSections,
      mainImages,
      hints,
      unresolved,
      backupPath
    },
    null,
    2
  )
);
