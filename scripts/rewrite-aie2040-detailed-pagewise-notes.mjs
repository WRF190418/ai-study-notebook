import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const root = path.join(process.cwd(), "data", "aie2040-review");
const dbPath = path.join(process.cwd(), "data", "app-db.json");
const reportPath = path.join(root, "import-report.json");
const backupDir = path.join(process.cwd(), "data", "backups");
const appendixMarker = "<!-- courseware-appendix -->";

const specs = {
  introduction: {
    sourceFile: "1 Introduction.pdf",
    title: "Lecture 1：统计机器学习导论",
    framework:
      "这份 Lecture 1 建立 AIE2040 的入口框架：统计不是只会画图或套公式，而是把现实问题转成变量、数据、模型和不确定性。主线从“为什么要带数据”开始，经过寿命、收入、模型误差、学习范式、变量类型和 n×p 数据矩阵，最后落到数据科学所需的计算、统计和领域知识交叉。",
    review:
      "复习时先能解释 X、Y、n、p、变量类型和学习范式，再回到每个案例判断：我们在描述分布、预测结果、解释机制，还是做因果判断。任何图表都先读变量、单位、样本和模型假设。"
  },
  examples: {
    sourceFile: "1_Why Statistics_Examples.pdf",
    title: "Lecture 1 补充：为什么需要统计——四个案例",
    framework:
      "这份补充课件用四个案例回答“为什么需要统计”：寿命案例讲分布、生存条件和风险率；收入案例讲右偏、对数变换、不平等与聚类；吸烟案例讲样本代表性、相关和因果；雾霾案例讲时间序列、趋势、季节、非线性和预测。四个案例共同训练同一件事：先辨认问题类型，再选择图表、模型和诊断方式。",
    review:
      "复习案例时按“问题是什么—变量怎么定义—样本从哪里来—分布/模型假设是什么—图表说明什么—还不能说明什么”六步走。尤其区分描述、预测与因果，不把相关图、地图或时间趋势直接读成原因。"
  },
  distributions: {
    sourceFile: "2 Distributions.pdf",
    title: "Lecture 2：概率分布与模型选择",
    framework:
      "Lecture 2 把分布放到统计机器学习的中心：无监督学习关心总体分布和群体结构，监督学习还要指定条件误差分布。课件依次讨论单一分布、混合分布、参数 θ、似然、同方差/异方差、参数与非参数模型，以及概率正向问题和统计逆向问题。",
    review:
      "选择分布时不要只看曲线像不像，而要依次检查支持集、离散/连续、独立性、峰数、偏度、尾部、方差结构和生成机制。似然把“给定参数看数据”改写成“给定数据比较参数”，这是后续 MLE 和 Bayesian 方法的基础。"
  },
  ai: {
    sourceFile: "probability-statistics-ai-lecture [Repaired].pdf",
    title: "AI专题：人工智能中的概率与统计",
    framework:
      "AI 专题把概率统计整理成一条完整路线：概率公理和随机变量提供语言，常见分布表达假设，统计推断从数据估计参数，图模型/HMM/深度概率模型编码依赖，最后在分类、推荐、自动驾驶、医疗和生成式 AI 中进行带不确定性的决策。",
    review:
      "复习时每个公式都要配对三个问题：随机变量取值范围是什么、独立或条件假设是什么、参数代表什么。重点区分 PMF/PDF/CDF、独立与条件、先验/似然/后验、MLE/MAP/Full Bayes、Forward/Viterbi/Baum-Welch、生成式/判别式，以及 softmax 输出和校准概率。"
  }
};

const visualTips = {
  photo: "这类图片主要提供案例情境或材料来源。读图时先确认它服务哪个问题，不要把照片本身当作统计证据；结论仍要回到样本、变量和模型。",
  map: "地图先读地区单位、颜色图例、年份和变量定义。颜色深浅描述空间差异，但不能直接推出个人层面结论或因果机制。",
  curve: "曲线先读横轴、纵轴、单位和图例，再比较位置、斜率、面积、尾部和不同曲线之间的分离；不要把视觉距离直接等同为因果效应。",
  distribution: "分布图先判断横轴变量和纵轴是频数、比例还是密度。比较中心、离散程度、偏度、峰数和尾部；连续密度下的面积才对应概率。",
  formula: "公式先读左侧目标量，再逐个解释右侧符号、参数、条件和范围。问号或候选模型表示待检验假设，不是已经证明的结论。",
  diagram: "结构图按箭头、分区或连线读依赖关系。除非课件明确说明，否则箭头只表示流程或建模方向，不自动等于现实因果。",
  handwriting: "手写页要放大查看关键词、箭头和列表层级；模糊内容只作为待核对材料，不据此补造结论。",
  table: "表格先读行列标题和单位，再比较同一列或同一行的可比数值；表中关系只对应课件给定样本、年份和变量口径。",
  chart: "图表先读轴、分组、图例和误差口径，再比较高度、比例或趋势；柱高、排名或比例差异本身不自动说明原因。",
  scatter: "散点图中每个点代表一个观测。先看轴和单位，再看方向、曲率、离群点和条件波动；相关关系不能直接当因果关系。",
  "time-series": "时间序列先看时间轴和测量单位，再分开读长期趋势、季节周期、异常峰值、自相关和多个变量的同步变化。",
  code: "代码页按执行顺序读：参数设置、抽样或循环、计算统计量、绘图或输出。每个参数变化都要和分布位置、宽度、权重或模型假设对应起来。",
  exercise: "题目页先圈出已知量、条件事件、随机变量和所求量，再选择公式；讨论题要保留不确定性，不把题目直接写成答案。"
};

function hashText(text) {
  return createHash("sha256").update(text).digest("hex");
}

function safeAlt(text) {
  return text.replace(/[\[\]\r\n]/g, " ").replace(/\s+/g, " ").trim();
}

function parsePagewise(raw) {
  return raw.trim().split(/\r?\n/).map((line, index) => {
    const parts = line.split("\t");
    return { number: index + 1, title: parts[0] || `第${index + 1}页`, explanation: parts[1] || "", visual: parts[2] || "" };
  });
}

function usefulLines(text, limit = 7) {
  const seen = new Set();
  const lines = text
    .split(/\r?\n|•|;(?=\s)/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((line) => !/^[0-9. -]+$/.test(line))
    .filter((line) => {
      const key = line.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  return lines.slice(0, limit).map((line) => line.length > 150 ? `${line.slice(0, 147)}...` : line);
}

function pageRole(page, authored, total) {
  if (page.number === 1) return "本页是本份课件的封面或入口，作用是确认材料来源、主题和课程语境。";
  if (/过渡|入口|部分|Part|chapter|roadmap|路线|案例/.test(authored.title)) {
    return "本页主要承担结构定位作用，把前面的概念推进到下一组问题。";
  }
  if (page.number === total) return "本页位于材料末尾，作用是收束本讲或保留最后一个复习/应用点。";
  return "本页是本讲主线中的一个具体知识点，需要和前后页合起来理解。";
}

function connection(authored, all, total) {
  const prev = authored.number > 1 ? all[authored.number - 2]?.title : "";
  const next = authored.number < total ? all[authored.number]?.title : "";
  if (prev && next) return `它承接上一页“${prev}”，并为下一页“${next}”作准备。`;
  if (next) return `它为下一页“${next}”作准备。`;
  if (prev) return `它收束上一页“${prev}”之后的讨论。`;
  return "它帮助确定整份材料的阅读方向。";
}

function methodNote(visual, title) {
  if (/人口金字塔|population pyramid/i.test(title)) {
    return "人口金字塔先读纵轴年龄和左右/横向宽度，再比较底部、腰部和顶部形状；它反映年龄结构，不能只凭某一段宽窄直接推出个体寿命。";
  }
  if (/地图|map|geographic|country|countries|region|地区|国家/i.test(title)) {
    return visualTips.map;
  }
  if (/散点|scatter|GDP|Preston|correlation|相关/i.test(title)) {
    return visualTips.scatter;
  }
  if (/时间序列|time series|smog|PM2\.5|trend|season|季节/i.test(title)) {
    return visualTips["time-series"];
  }
  if (/分布|distribution|density|histogram|PMF|PDF|CDF|normal|Gaussian|log-normal|mixture|income|寿命|life span/i.test(title)) {
    return visualTips.distribution;
  }
  if (/表格|matrix|n×p|table|矩阵/i.test(title)) {
    return visualTips.table;
  }
  if (/题|question|exercise|思考|检测/i.test(title)) {
    return visualTips.exercise;
  }
  if (visual && visualTips[visual]) return visualTips[visual];
  if (["公式", "概率", "似然", "Bayes", "MLE", "MAP", "方差", "期望", "熵", "CLT", "LLN", "hazard", "risk", "P(", "Var", "E["].some((token) => title.includes(token))) {
    return "本页复习时不要只背结论，要把符号、条件、随机变量和适用范围说清楚，再说明它如何服务于建模或推断。";
  }
  if (/封面|过渡|入口|路线|Roadmap|Part/.test(title)) {
    return "本页以定位为主，复习时用它建立章节地图，明确后续内容为什么按这个顺序出现。";
  }
  return "本页复习时要能用自己的话说明：变量是什么、图表或公式解决什么问题、它不能单独支持哪些过度结论。";
}

function buildPageSection(spec, material, authored, allAuthored, assetsByPage) {
  const page = material.pages[authored.number - 1];
  const asset = assetsByPage.get(authored.number);
  const lines = usefulLines(page.text, authored.visual ? 8 : 6);
  const sourceBullets = lines.length
    ? lines.map((line) => `- ${line}`).join("\n")
    : "- 原页文字提取为空或很少；本页需要结合完整原页图进行目视核对。";
  const role = pageRole(page, authored, material.pageCount);
  const link = connection(authored, allAuthored, material.pageCount);
  const core = authored.explanation || "本页没有足够可提取文字；整理时以页面标题、上下文和原页图为准。";
  const method = methodNote(authored.visual, `${authored.title} ${page.text}`);
  const visualBlock = authored.visual
    ? `\n\n![${safeAlt(`${spec.sourceFile}，第${authored.number}页：${authored.title}`)}](/api/media/${asset.id})\n\n*原课件：${safeAlt(spec.sourceFile)}，PDF 第${authored.number}页；用于核对“${safeAlt(authored.title)}”的图表、公式、题干或视觉关系。*\n\n读图提示：${method}`
    : "";

  return `### 第${authored.number}页｜${authored.title}

**本页定位：** ${role} ${link}

**逐页讲解：** ${core} 对初学者来说，读这一页时要先抓住“本页的问题是什么”，再判断它是在定义概念、展示数据、提出模型，还是提示后续要检验的假设。不要只记页面标题，要把它放回本讲的统计学习链条中：现实问题如何变成变量，变量如何形成数据，数据如何支持模型、推断或预测。

**原页关键内容：**
${sourceBullets}

**复习注意：** ${method}${visualBlock}`;
}

function buildAppendix(spec, material, assetsByPage) {
  const pages = material.pages.map((page) => {
    const asset = assetsByPage.get(page.number);
    const extracted = page.text.trim()
      ? `~~~text\n${page.text.trim()}\n~~~`
      : "本页文字无法可靠提取或主要由图片构成；请以完整原页图为准。";
    return `### 第 ${page.number} 页\n\n${extracted}\n\n![${safeAlt(`${spec.sourceFile} 第${page.number}页完整原页`)}](/api/media/${asset.id})`;
  }).join("\n\n");
  return `${appendixMarker}\n\n## 逐页课件核对\n\n来源：${safeAlt(spec.sourceFile)}，共 ${material.pageCount} 页。以下保存每一页的提取文字与完整原页图；提取文字可能改变公式、多栏顺序或特殊符号，公式排版、图例与手写内容请以原页图为准，图片可点击放大。\n\n${pages}`;
}

function coverageSection(pages, inlineFigures) {
  return `## 逐页覆盖核对

本笔记已按当前课件整理规则覆盖 ${pages} 页：正文从第1页到第${pages}页连续建立独立小节，每页均包含“本页定位、逐页讲解、原页关键内容、复习注意”；每个正文页标题均可通过右侧原课件按钮打开对应完整原页图；正文另选 ${inlineFigures} 张必要原图，均紧邻对应页讲解并配有“读图提示”；完整逐页原图与提取文字保留在下方课件核对附录中，方便逐页复查。`;
}

function buildMarkdown(spec, material, authored, assetsByPage, inlineFigures) {
  const pageSections = authored.map((page) => buildPageSection(spec, material, page, authored, assetsByPage)).join("\n\n");
  const body = `# ${spec.title}

## 概念框架

${spec.framework}

## 逐页详细讲解

${pageSections}

## 本讲联系与复习

${spec.review}

${coverageSection(material.pageCount, inlineFigures)}`;
  return `${body.trim()}\n\n${buildAppendix(spec, material, assetsByPage)}`;
}

function validate(db, note, item) {
  const [main, appendix] = note.contentMarkdown.split(appendixMarker);
  if (!appendix) throw new Error(`${item.key}: appendix missing`);
  const headings = [...main.matchAll(/^### 第([0-9]+)页｜/gm)].map((match) => Number(match[1]));
  if (headings.length !== item.pages || !headings.every((page, index) => page === index + 1)) {
    throw new Error(`${item.key}: heading coverage invalid`);
  }
  const requiredPhrases = ["**本页定位：**", "**逐页讲解：**", "**原页关键内容：**", "**复习注意：**"];
  for (const phrase of requiredPhrases) {
    const hits = (main.match(new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
    if (hits !== item.pages) throw new Error(`${item.key}: ${phrase} count ${hits} != ${item.pages}`);
  }
  const images = (main.match(/!\[[^\]\n]*\]\(\/api\/media\/[A-Za-z0-9_-]+\)/g) || []).length;
  const hints = (main.match(/读图提示：/g) || []).length;
  const appendixPages = (appendix.match(/^### 第 [0-9]+ 页/gm) || []).length;
  const appendixImages = (appendix.match(/!\[[^\]\n]*\]\(\/api\/media\/[A-Za-z0-9_-]+\)/g) || []).length;
  if (images !== item.inlineFigures) throw new Error(`${item.key}: images ${images} != ${item.inlineFigures}`);
  if (hints !== item.inlineFigures) throw new Error(`${item.key}: hints ${hints} != ${item.inlineFigures}`);
  if (appendixPages !== item.pages) throw new Error(`${item.key}: appendix pages ${appendixPages} != ${item.pages}`);
  if (appendixImages !== item.pages) throw new Error(`${item.key}: source button images ${appendixImages} != ${item.pages}`);
  if (/courseware:|\{\{page:|[A-Z]:\\/.test(note.contentMarkdown)) throw new Error(`${item.key}: unresolved local reference`);
  const mediaIds = new Set(db.mediaAssets.map((asset) => asset.id));
  const missing = [...note.contentMarkdown.matchAll(/\/api\/media\/([A-Za-z0-9_-]+)/g)]
    .map((match) => match[1])
    .filter((id) => !mediaIds.has(id));
  if (missing.length) throw new Error(`${item.key}: missing media ${missing.join(", ")}`);
  return {
    key: item.key,
    pages: item.pages,
    sourceButtons: appendixImages,
    inlineFigures: images,
    hints,
    contentChars: note.contentMarkdown.length,
    contentHash: hashText(note.contentMarkdown),
    appendixHash: hashText(note.contentMarkdown.slice(note.contentMarkdown.indexOf(appendixMarker)))
  };
}

const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
fs.mkdirSync(backupDir, { recursive: true });
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const dbBackup = path.join(backupDir, `before-rewrite-aie2040-detailed-${timestamp}-app-db.json`);
const reportBackup = path.join(backupDir, `before-rewrite-aie2040-detailed-${timestamp}-import-report.json`);
fs.writeFileSync(dbBackup, JSON.stringify(db, null, 2), "utf8");
fs.writeFileSync(reportBackup, JSON.stringify(report, null, 2), "utf8");

const summaries = [];
for (const item of report.notes) {
  const spec = specs[item.key];
  if (!spec) throw new Error(`Missing spec ${item.key}`);
  const note = db.notes.find((entry) => entry.id === item.noteId);
  if (!note) throw new Error(`Missing note ${item.noteId}`);
  const material = JSON.parse(fs.readFileSync(path.join(root, item.key, "materials.json"), "utf8"));
  const authored = parsePagewise(fs.readFileSync(path.join(root, item.key, "pagewise.tsv"), "utf8"));
  if (material.pageCount !== item.pages || authored.length !== item.pages) {
    throw new Error(`${item.key}: page count mismatch`);
  }
  const assetsByPage = new Map(db.mediaAssets.filter((asset) => asset.noteId === note.id).map((asset) => [asset.slideNumber, asset]));
  for (let page = 1; page <= item.pages; page += 1) {
    if (!assetsByPage.has(page)) throw new Error(`${item.key}: missing asset for page ${page}`);
  }
  note.contentMarkdown = buildMarkdown(spec, material, authored, assetsByPage, item.inlineFigures);
  note.summary = `${spec.title} 已按新笔记规则重新整理：逐页详细讲解 ${item.pages} 页，每页标题可打开原课件，正文包含必要原图 ${item.inlineFigures} 张及读图提示。`;
  note.updatedAt = new Date().toISOString();
  summaries.push(validate(db, note, item));
}

report.notes = report.notes.map((item) => {
  const summary = summaries.find((entry) => entry.key === item.key);
  return { ...item, contentChars: summary.contentChars, contentHash: summary.contentHash, appendixHash: summary.appendixHash };
});
report.rewrittenDetailedAt = new Date().toISOString();
report.rewriteNote = "AIE2040 notes rebuilt with detailed per-page sections: every page has its own explanation and a heading source-image button via the appendix; required inline figures still include reading hints.";

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), "utf8");
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

console.log(JSON.stringify({ rewritten: true, dbBackup, reportBackup, notes: summaries }, null, 2));
