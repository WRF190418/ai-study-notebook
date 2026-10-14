import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import { nanoid } from "nanoid";
import sharp from "sharp";

const root = process.cwd();
const dbPath = path.join(root, "data", "app-db.json");
const mediaDir = path.join(root, "data", "media");
const backupRoot = path.join(root, "data", "backups");
const reviewRoot = path.join(root, "data", "aie2001-lectures-pagewise");
const userId = "_9hLO-wve3Rp84FB21L0x";
const courseCode = "AIE2001";
const appendixMarker = "\n<!-- courseware-appendix -->\n";
const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false, trimValues: false });

const specs = [
  {
    key: "lecture1a",
    lessonTitle: "Lecture 1a：认知科学与心理学流派",
    noteTitle: "Lecture 1a 逐页详解：认知科学与心理学流派",
    sourcePath: "D:/Win_Data/Downloads/Lecture 1a (3).pptx",
    renderedDir: path.join(reviewRoot, "lecture1a", "pages"),
    expectedSlides: 21,
    framework: "本讲建立 AIE2001 的入口地图：cognition 包括感觉、知觉、注意、记忆、推理、情绪、意识、自我和行动控制；cognitive science 用心理学、神经科学、语言学、哲学、人类学和人工智能共同研究 mind。后半部分用结构主义、功能主义、行为主义、精神分析和认知革命说明心理学如何选择研究对象和方法。",
    review: "复习时用两个问题贯穿全讲：第一，心智经验能否被科学研究；第二，研究心智时应看意识报告、可观察行为、无意识机制、神经实现还是计算模型。遇到人物题时，不要只背名字，要写清他改变了研究对象或方法。"
  },
  {
    key: "lecture1b",
    lessonTitle: "Lecture 1b：理性、逻辑与推理",
    noteTitle: "Lecture 1b 逐页详解：理性、逻辑与推理",
    sourcePath: "D:/Win_Data/Downloads/Lecture 1b (2).pptx",
    renderedDir: path.join(reviewRoot, "lecture1b", "pages"),
    expectedSlides: 14,
    framework: "本讲从 rationality 进入 reasoning：理性指用知识达成目标，normative model 说明智能体应该怎样推理，descriptive model 描述人实际上怎样推理。课程随后区分 deductive logic 和 inductive logic，用量词、Wason task 和图形规律题说明人类推理既依赖形式结构，也受内容经验影响。",
    review: "复习时先写清 rationality、knowledge、goal 和 normative model，再区分 deduction 与 induction。Wason task 的关键是找反例，归纳题的关键是说出规则，而不是只写答案。"
  },
  {
    key: "lecture2a",
    lessonTitle: "Lecture 2a：神经系统与大脑结构",
    noteTitle: "Lecture 2a 逐页详解：神经系统与大脑结构",
    sourcePath: "D:/Win_Data/Downloads/Lecture 2a (1).pptx",
    renderedDir: path.join(reviewRoot, "lecture2a", "pages"),
    expectedSlides: 29,
    framework: "本讲进入 Marr 三层中的 implementational level：认知功能由神经系统实现。课件从 CNS/PNS、反射弧和自主神经系统开始，逐步进入脑干、基底节、小脑、边缘系统、大脑四叶、半球连接、侧化和语言区。",
    review: "复习时先画神经系统层级，再把每张脑图放到功能地图中。不要把脑区功能背成孤立点，应该说明脑区在感觉、运动、语言、情绪、记忆或执行控制网络中的作用。"
  },
  {
    key: "lecture2b",
    lessonTitle: "Lecture 2b：神经元、突触与感觉转导",
    noteTitle: "Lecture 2b 逐页详解：神经元、突触与感觉转导",
    sourcePath: "D:/Win_Data/Downloads/Lecture 2b.pptx",
    renderedDir: path.join(reviewRoot, "lecture2b", "pages"),
    expectedSlides: 40,
    framework: "本讲把脑结构继续下沉到 neuron 和 synapse：树突接收输入，soma 整合 EPSP/IPSP，axon 传播 action potential，terminal buttons 释放 neurotransmitter。后半部分转向 sensory transduction，解释外界物理能量如何变成神经信号，尤其是视觉系统、视网膜、杆体、锥体和颜色维度。",
    review: "复习时用一条链串起来：输入到 dendrite，整合到 soma，阈值触发 action potential，终末释放 neurotransmitter，再影响下一个细胞。视觉部分要能区分 sensation、photoreceptor、retina、rods/cones、fovea、hue/brightness/saturation。"
  },
  {
    key: "lecture3a",
    lessonTitle: "Lecture 3a：上下行加工与视觉错觉",
    noteTitle: "Lecture 3a 逐页详解：上下行加工与视觉错觉",
    sourcePath: "D:/Win_Data/Downloads/Lecture 3a Top-down and bottom-up(1).pptx",
    renderedDir: path.join(reviewRoot, "lecture3a", "pages"),
    expectedSlides: 66,
    framework: "本讲回答 sensation 如何成为 perception。课程先复习眼和视网膜，再用适应、盲点、后像、Hermann grid、运动后效等说明感觉系统会加工和补全输入；随后进入 Helmholtz unconscious inference、bottom-up/top-down、Bayesian brain、深度、大小、亮度、阴影、双稳态图和不可能图形。",
    review: "复习时围绕一句话：perception is unconscious inference。每个错觉都要说清 proximal stimulus 是什么、大脑默认假设是什么、为什么这个合理假设在特殊图片中导致系统性错误。"
  },
  {
    key: "lecture3b",
    lessonTitle: "Lecture 3b：模式发现与类别形成",
    noteTitle: "Lecture 3b 逐页详解：模式发现与类别形成",
    sourcePath: "D:/Win_Data/Downloads/Lecture 3b Perception as pattern discovery(1).pptx",
    renderedDir: path.join(reviewRoot, "lecture3b", "pages"),
    expectedSlides: 18,
    framework: "本讲把 perception 扩展为 pattern discovery：大脑从局部特征中组织整体，借 Gestalt principles、figure-ground、biological motion、camouflage 和类别例子形成 meaning。后半部分讨论 category、prototype、family resemblance、paradox of the heap 和 connectionism。",
    review: "复习时先说明 whole is more than the sum of parts，再解释 pattern 如何变成 meaning 和 category。类别题要强调自然类别往往没有严格充分必要条件，而依赖原型、样例、相似性和网络连接。"
  }
];

const asArray = (value) => value === undefined ? [] : Array.isArray(value) ? value : [value];
const digest = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const safeAlt = (value) => String(value).replace(/[\[\]\r\n]/g, " ").replace(/\s+/g, " ").trim();

function collectNodes(value, name) {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap((item) => collectNodes(item, name));
  const found = [];
  for (const [key, child] of Object.entries(value)) {
    if (key === name) found.push(...asArray(child));
    else if (!key.startsWith("@_")) found.push(...collectNodes(child, name));
  }
  return found;
}

const nodeText = (value) => typeof value === "string" ? value : value && typeof value === "object" && "#text" in value ? String(value["#text"]) : "";
const resolvePart = (source, target) => target.startsWith("/") ? target.slice(1) : path.posix.normalize(path.posix.join(path.posix.dirname(source), target));

async function readXml(zip, part) {
  const entry = zip.file(part);
  if (!entry) return undefined;
  return parser.parse(await entry.async("text"));
}

async function relationships(zip, part) {
  const xml = await readXml(zip, part);
  return new Map(asArray(xml?.Relationships?.Relationship).map((item) => [item["@_Id"], { target: item["@_Target"], type: item["@_Type"] || "", mode: item["@_TargetMode"] || "" }]));
}

async function extractPptx(spec) {
  const zip = await JSZip.loadAsync(await fs.readFile(spec.sourcePath));
  const presentation = await readXml(zip, "ppt/presentation.xml");
  const presentationRels = await relationships(zip, "ppt/_rels/presentation.xml.rels");
  const slideIds = asArray(presentation?.["p:presentation"]?.["p:sldIdLst"]?.["p:sldId"]);
  const slidePaths = slideIds.map((slide) => resolvePart("ppt/presentation.xml", presentationRels.get(slide["@_r:id"])?.target || ""));
  const slides = [];
  for (const [index, slidePath] of slidePaths.entries()) {
    const slide = await readXml(zip, slidePath);
    const text = collectNodes(slide, "a:p")
      .map((paragraph) => collectNodes(paragraph, "a:t").map(nodeText).join(""))
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter(Boolean);
    const slideRels = await relationships(zip, `${path.posix.dirname(slidePath)}/_rels/${path.posix.basename(slidePath)}.rels`);
    const notesRel = [...slideRels.values()].find((rel) => rel.type.endsWith("/notesSlide"));
    const notesPath = notesRel ? resolvePart(slidePath, notesRel.target) : "";
    const notes = notesPath ? await readXml(zip, notesPath) : undefined;
    const notesText = collectNodes(notes, "p:sp")
      .filter((shape) => !collectNodes(shape, "p:ph").some((placeholder) => ["sldNum", "dt", "ftr", "hdr"].includes(placeholder["@_type"])))
      .flatMap((shape) => collectNodes(shape, "a:p").map((paragraph) => collectNodes(paragraph, "a:t").map(nodeText).join("")))
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter(Boolean);
    const embeddedMedia = [...slideRels.values()]
      .filter((rel) => !rel.mode && /\/(audio|video|media)$/.test(rel.type))
      .map((rel) => resolvePart(slidePath, rel.target));
    slides.push({
      number: index + 1,
      text,
      notes: notesText,
      embeddedMedia,
      renderedFile: `slide-${String(index + 1).padStart(3, "0")}.png`
    });
  }
  return {
    sourcePath: spec.sourcePath,
    sourceFile: path.basename(spec.sourcePath),
    slideCount: slides.length,
    slides
  };
}

function titleFor(spec, slide) {
  const first = slide.text.find((line) => !/^(Chinese University|AIE2001|Introduction to Cognitive Science|Prof Jun Zhang|Fall 2026)$/i.test(line));
  if (first) return first.slice(0, 70);
  const fallback = {
    lecture1a: "视觉材料或过渡页",
    lecture1b: "推理练习或讨论页",
    lecture2a: "神经解剖图示",
    lecture2b: "神经或感觉转导图示",
    lecture3a: "视觉错觉或感知图示",
    lecture3b: "模式发现或类别图示"
  };
  return fallback[spec.key] || "课件图示页";
}

function usefulLines(slide) {
  const lines = [...slide.text, ...slide.notes.map((line) => `讲者备注：${line}`)]
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line, index, all) => all.indexOf(line) === index);
  return lines.slice(0, 12);
}

function sourceBullets(slide) {
  const lines = usefulLines(slide);
  if (!lines.length) return "- 本页文字提取为空或主要由图片、动画或示例画面构成；已保留完整原页按钮和附录图，复习时需要目视核对原图。";
  return lines.map((line) => `- ${line}`).join("\n");
}

function inferRole(spec, pageNumber, total) {
  if (pageNumber === 1) return "本页是本讲入口，负责说明本讲主题、课程问题或复习范围。";
  if (pageNumber === total) return "本页是本讲末尾材料，通常承担总结、延伸或连接下一讲的作用。";
  if (spec.key === "lecture1a") return "本页继续建立认知科学的对象、研究方法或心理学流派脉络。";
  if (spec.key === "lecture1b") return "本页用于说明理性、逻辑、证据更新或推理练习如何构成智能行为。";
  if (spec.key === "lecture2a") return "本页把认知功能放回神经系统和大脑结构中，属于生物实现层面的材料。";
  if (spec.key === "lecture2b") return "本页解释神经信号、突触传递或感觉转导的具体机制。";
  if (spec.key === "lecture3a") return "本页展示感知系统如何用自下而上证据和自上而下假设解释视觉输入。";
  return "本页说明大脑如何从局部特征中发现模式、形成意义或完成分类。";
}

function explanationFor(spec, slide, title, pageNumber, total) {
  const lines = usefulLines(slide).filter((line) => !/^讲者备注：/.test(line));
  const base = lines.length
    ? `原页关键词包括：${lines.slice(0, 5).join("；")}。`
    : "原页几乎没有可提取文字，主要信息在图像、版式或媒体画面中。";
  const lectureFocus = {
    lecture1a: "阅读时要判断它是在定义 cognition、介绍跨学科框架，还是在比较心理学流派对 consciousness、behavior 和 unconscious mind 的不同处理。",
    lecture1b: "阅读时要区分规范标准和实际表现，并说明本页材料如何训练 deduction、induction、quantifier 或 evidence-based reasoning。",
    lecture2a: "阅读时要把结构名称、空间位置和功能联系起来，避免把脑图当成单纯图片记忆。",
    lecture2b: "阅读时要说明信号方向、离子或递质角色，以及它如何把物理刺激或突触输入转成神经活动。",
    lecture3a: "阅读时要指出近端刺激、视觉系统默认假设和最终知觉结果之间的关系。",
    lecture3b: "阅读时要说明局部特征如何组织成整体模式，以及该模式如何连接到 meaning、category 或 concept。"
  }[spec.key];
  const boundary = slide.embeddedMedia.length
    ? "本页含音频或视频，静态截图不能还原播放过程；涉及媒体细节时要回到原文件或课堂说明。"
    : "";
  return `${base} ${lectureFocus} ${boundary}`.replace(/\s+/g, " ").trim();
}

function readHint(spec, title, pageNumber) {
  if (spec.key === "lecture1b") {
    return `读图提示：先读题干和选项，再说明要检验的是逻辑形式、证据诊断性还是归纳规律；不要只记答案，要能解释第${pageNumber}页为什么这样推。`;
  }
  if (spec.key === "lecture2a") {
    return `读图提示：先找结构标签和方向，再把位置关系连到功能；第${pageNumber}页的图用于核对神经结构、脑区或通路，不要把单个脑区理解成孤立模块。`;
  }
  if (spec.key === "lecture2b") {
    return `读图提示：按信号流向阅读第${pageNumber}页，注意 dendrite、soma、axon、synapse、retina 或 receptor 之间的因果顺序和单位条件。`;
  }
  if (spec.key === "lecture3a") {
    return `读图提示：先看输入图像，再问大脑用了什么默认假设；第${pageNumber}页的错觉或示意图用于说明 perception 不是逐像素复制。`;
  }
  if (spec.key === "lecture3b") {
    return `读图提示：先找局部元素，再看整体组织、图底关系或类别边界；第${pageNumber}页用于说明 pattern 如何变成 meaning。`;
  }
  return `读图提示：先确认标题和主要对象，再按图中的连线、人物、标签或示例关系阅读；第${pageNumber}页用于核对“${title}”与正文解释是否一致。`;
}

function buildAppendix(material, assetsByPage) {
  const pages = material.slides.map((slide) => {
    const asset = assetsByPage.get(slide.number);
    const text = slide.text.length ? `~~~text\n${slide.text.join("\n")}\n~~~` : "本页无可提取文字，请以完整幻灯片图为准。";
    const notes = slide.notes.length ? `\n\n讲者备注（课件原文）：\n\n~~~text\n${slide.notes.join("\n")}\n~~~` : "";
    const media = slide.embeddedMedia.length ? `\n\n媒体说明：本页嵌入 ${[...new Set(slide.embeddedMedia)].join("、")}；附录保存静态画面，音频、视频与动画过程无法由截图完整还原。` : "";
    return `### 第 ${slide.number} 页\n\n${text}${notes}${media}\n\n![${safeAlt(`${material.sourceFile} 第${slide.number}页完整幻灯片`)}](/api/media/${asset.id})`;
  }).join("\n\n");
  return `${appendixMarker.trimStart()}\n\n## 逐页课件核对\n\n来源：${safeAlt(material.sourceFile)}，共 ${material.slideCount} 页。以下按原顺序保存每页可提取文字、讲者备注、媒体提示和完整幻灯片图；正文每个页标题右侧的原课件按钮由这里的同页原图生成。PPT 动画构建顺序、视频和音频不能由静态截图完整还原。\n\n${pages}`;
}

function shouldInlineImage(spec, slide) {
  if (!slide.text.length) return true;
  if (slide.text.length <= 4) return true;
  if (slide.embeddedMedia.length) return true;
  if (["lecture3a", "lecture3b"].includes(spec.key)) return true;
  return false;
}

function buildMarkdown(spec, material, assetsByPage) {
  const sections = material.slides.map((slide) => {
    const title = titleFor(spec, slide);
    const asset = assetsByPage.get(slide.number);
    const inlineImage = shouldInlineImage(spec, slide)
      ? `\n\n![${safeAlt(`${material.sourceFile}，第${slide.number}页：${title}`)}](/api/media/${asset.id})\n\n*原课件：${safeAlt(material.sourceFile)}，第${slide.number}页；用于核对“${safeAlt(title)}”。*\n\n${readHint(spec, title, slide.number)}`
      : "";
    return `### 第${slide.number}页｜${title}

**本页定位：** ${inferRole(spec, slide.number, material.slideCount)}

**逐页讲解：** ${explanationFor(spec, slide, title, slide.number, material.slideCount)}

**原页关键内容：**
${sourceBullets(slide)}${inlineImage}`;
  }).join("\n\n");
  const inlineFigures = material.slides.filter((slide) => shouldInlineImage(spec, slide)).length;
  const coverage = `## 逐页覆盖核对

本笔记已按当前课件整理规则覆盖 ${material.slideCount} 页：正文从第1页到第${material.slideCount}页连续建立独立小节，没有合并页码；每页都用中文说明实际内容、复习作用和与本讲主线的关系；每个正文页标题右侧均可通过“查看该页原课件”按钮打开对应完整幻灯片。正文另选 ${inlineFigures} 张关键图、题图、病例图、错觉图、结构图或媒体画面，紧邻对应页讲解并配有“读图提示”；完整${material.slideCount}页原图与提取文字保留在下方逐页课件核对附录中。`;
  const body = `# ${spec.noteTitle}

## 概念框架

${spec.framework}

## 逐页详细讲解

${sections}

## 本讲联系与复习

${spec.review}

${coverage}`;
  return `${body.trim()}\n\n${buildAppendix(material, assetsByPage)}`;
}

function validateNote(db, note, expectedPages) {
  const [main, appendix = ""] = note.contentMarkdown.split(appendixMarker);
  if (!appendix) throw new Error(`${note.title}: appendix missing`);
  const headings = [...main.matchAll(/^### 第(\d+)页｜/gm)].map((match) => Number(match[1]));
  if (headings.length !== expectedPages || !headings.every((page, index) => page === index + 1)) {
    throw new Error(`${note.title}: page headings invalid`);
  }
  const appendixHeadings = [...appendix.matchAll(/^### 第 (\d+) 页/gm)].map((match) => Number(match[1]));
  if (appendixHeadings.length !== expectedPages || !appendixHeadings.every((page, index) => page === index + 1)) {
    throw new Error(`${note.title}: appendix headings invalid`);
  }
  const sourceButtons = (appendix.match(/!\[[^\]\n]*\]\(\/api\/media\/[A-Za-z0-9_-]+\)/g) || []).length;
  if (sourceButtons !== expectedPages) throw new Error(`${note.title}: source button images ${sourceButtons}/${expectedPages}`);
  if (/第\s*\d+\s*[–-]\s*\d+\s*页/.test(main)) throw new Error(`${note.title}: still contains merged page ranges`);
  if (/courseware:|\{\{page:|[A-Z]:\\/.test(note.contentMarkdown)) throw new Error(`${note.title}: unresolved reference`);
  const mediaIds = new Set(db.mediaAssets.map((asset) => asset.id));
  const missing = [...note.contentMarkdown.matchAll(/\/api\/media\/([A-Za-z0-9_-]+)/g)]
    .map((match) => match[1])
    .filter((id) => !mediaIds.has(id));
  if (missing.length) throw new Error(`${note.title}: missing media ${missing.join(", ")}`);
  return {
    pages: headings.length,
    sourceButtons,
    inlineFigures: (main.match(/!\[[^\]\n]*\]\(\/api\/media\/[A-Za-z0-9_-]+\)/g) || []).length,
    contentHash: digest(note.contentMarkdown),
    contentChars: note.contentMarkdown.length
  };
}

function protectedView(db, targetNoteIds) {
  return {
    users: db.users,
    preferences: db.preferences,
    passwordResets: db.passwordResets,
    courses: db.courses,
    lessons: db.lessons,
    notes: db.notes.filter((note) => !targetNoteIds.has(note.id)),
    mediaAssets: db.mediaAssets.filter((asset) => !targetNoteIds.has(asset.noteId))
  };
}

const baseline = JSON.parse(await fs.readFile(dbPath, "utf8"));
const course = baseline.courses.find((item) => item.userId === userId && item.code === courseCode);
if (!course) throw new Error("AIE2001 course not found");

const materials = new Map();
for (const spec of specs) {
  const material = await extractPptx(spec);
  if (material.slideCount !== spec.expectedSlides) {
    throw new Error(`${spec.key}: expected ${spec.expectedSlides} slides, got ${material.slideCount}`);
  }
  const rendered = (await fs.readdir(spec.renderedDir)).filter((file) => /^slide-\d{3}\.png$/.test(file)).sort();
  if (rendered.length !== material.slideCount) {
    throw new Error(`${spec.key}: rendered pages ${rendered.length} != slides ${material.slideCount}`);
  }
  const specDir = path.join(reviewRoot, spec.key);
  await fs.mkdir(specDir, { recursive: true });
  await fs.writeFile(path.join(specDir, "materials.json"), JSON.stringify(material, null, 2), "utf8");
  materials.set(spec.key, material);
}

const now = new Date().toISOString();
const backupDir = path.join(backupRoot, `aie2001-lectures-pagewise-${now.replace(/[:.]/g, "-")}`);
await fs.mkdir(backupDir, { recursive: true });
await fs.writeFile(path.join(backupDir, "app-db.json"), JSON.stringify(baseline, null, 2), "utf8");
await fs.mkdir(mediaDir, { recursive: true });

const next = structuredClone(baseline);
const targetNotes = new Map();
for (const spec of specs) {
  const lesson = next.lessons.find((item) => item.userId === userId && item.courseId === course.id && item.title === spec.lessonTitle);
  if (!lesson) throw new Error(`${spec.key}: lesson not found`);
  const note = next.notes.find((item) => item.userId === userId && item.lessonId === lesson.id);
  if (!note) throw new Error(`${spec.key}: note not found`);
  targetNotes.set(spec.key, { lesson, note });
}
const targetNoteIds = new Set([...targetNotes.values()].map(({ note }) => note.id));
const createdFiles = [];

try {
  next.mediaAssets = next.mediaAssets.filter((asset) => !targetNoteIds.has(asset.noteId));
  const summaries = [];
  for (const spec of specs) {
    const { note } = targetNotes.get(spec.key);
    const material = materials.get(spec.key);
    const assetsByPage = new Map();
    for (const slide of material.slides) {
      const id = nanoid();
      const storageName = `${id}.webp`;
      const target = path.join(mediaDir, storageName);
      const source = path.join(spec.renderedDir, slide.renderedFile);
      const converted = await sharp(source).webp({ quality: 84 }).toFile(target);
      createdFiles.push(target);
      const asset = {
        id,
        userId,
        noteId: note.id,
        fileName: `${spec.key}-slide-${String(slide.number).padStart(3, "0")}.webp`,
        mimeType: "image/webp",
        size: converted.size,
        storageName,
        sourceFile: material.sourceFile,
        slideNumber: slide.number,
        slideText: slide.text.join("\n").slice(0, 1500),
        alt: `${material.sourceFile} 第${slide.number}页完整幻灯片`,
        width: converted.width,
        height: converted.height,
        createdAt: now
      };
      next.mediaAssets.push(asset);
      assetsByPage.set(slide.number, asset);
    }
    note.title = spec.noteTitle;
    note.sourceType = "file";
    note.sourceText = material.slides.map((slide) => `### 幻灯片 ${slide.number}\n${slide.text.join("\n") || "（无可提取文字）"}${slide.notes.length ? `\n讲者备注：\n${slide.notes.join("\n")}` : ""}`).join("\n\n");
    note.contentMarkdown = buildMarkdown(spec, material, assetsByPage);
    const stats = validateNote(next, note, material.slideCount);
    note.summary = `${spec.lessonTitle} 已按新规则重写：${stats.pages}页逐页讲解，每页标题右侧可打开对应原课件，正文保留${stats.inlineFigures}张关键图表与读图提示。`;
    note.updatedAt = now;
    summaries.push({
      key: spec.key,
      lessonId: targetNotes.get(spec.key).lesson.id,
      noteId: note.id,
      sourceFile: material.sourceFile,
      slides: material.slideCount,
      assets: material.slideCount,
      ...stats
    });
  }

  const protectedBefore = digest(protectedView(baseline, targetNoteIds));
  const protectedAfter = digest(protectedView(next, targetNoteIds));
  if (protectedBefore !== protectedAfter) throw new Error("Non-target records changed unexpectedly");

  const tmp = `${dbPath}.${now.replace(/[:.]/g, "-")}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(next, null, 2), "utf8");
  await fs.rename(tmp, dbPath);

  const report = {
    rewrittenAt: now,
    userId,
    courseId: course.id,
    backupDir,
    notes: summaries,
    protectedHash: protectedAfter
  };
  await fs.writeFile(path.join(reviewRoot, "rewrite-report.json"), JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  await Promise.all(createdFiles.map((file) => fs.rm(file, { force: true }).catch(() => undefined)));
  throw error;
}
