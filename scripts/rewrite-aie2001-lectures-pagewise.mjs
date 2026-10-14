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

const page = (title, goal, teach, takeaway, visual = false) => ({ title, goal, teach, takeaway, visual });

const teachingPages = {
  lecture1a: [
    page("Weekly Plan：认知科学的入口", "先知道这门课为什么从 cognition、intelligence、reasoning 和 consciousness 开始。", "这一页是课程路线图。AIE2001 不是只讲心理学史，而是先问“心智怎样工作”：什么算智能，推理为什么重要，理性与意识、自由意志有什么关系。读者可以把它看成后面几讲的索引：Lecture 1 建立研究对象，Lecture 2 进入神经实现，Lecture 3 讨论知觉，Lecture 4 讨论记忆。", "本讲入口问题是：心智能否被科学地描述、计算和解释。"),
    page("Gardner 六边形与认知科学", "理解 cognitive science 为什么必须跨学科。", "左侧列出 cognition 的对象：感觉、知觉、注意、记忆、推理、计划、决策、情绪、意识、自我和行动控制。右侧 Gardner hexagon 把心理学、神经科学、语言学、哲学、人类学和人工智能放在同一个问题周围：mind 如何产生、表示和计算。读图时先看中心的 philosophy，再看六门学科怎样从不同方向解释同一个心智问题。", "认知科学不是单科知识，而是用多个层次共同研究 mind。", true),
    page("Wilhelm Wundt and Structuralism", "认识实验心理学的起点人物 Wundt。", "这一页只放 Wundt 的人物图，作用是开启心理学从哲学问题转为实验研究的历史线。Wundt 重要之处不在画像，而在他让意识研究进入实验室：后面 structuralism 会把意识拆成基本元素来分析。", "Wundt 代表心理学独立成实验科学的开端。", true),
    page("Psychology: The Study of Consciousness", "把 Wundt 的历史意义放回方法论。", "1879 年莱比锡实验室标志着心理学作为独立学科出现。Wundt 的学生把实验室带到欧美，G. Stanley Hall 又在 Johns Hopkins 建立美国早期心理学实验室。这里要学的是研究对象和方法的变化：心理学开始把 consciousness 当作可被系统观察和实验研究的对象。", "心理学早期核心问题是 consciousness，但它开始使用科学方法来研究。"),
    page("Structuralism：把意识拆成元素", "理解 structuralism 为什么依赖 introspection，以及它的问题在哪里。", "Titchener 继承 Wundt 路线，认为意识可以拆成类似“原子”的基本体验。analytic introspection 要求受试者仔细报告自己的意识经验，例如听到震惊消息时的感受。这个方法的价值是认真对待主观经验；问题是报告难以客观复现，不同人和不同实验室可能得到不同结果。", "结构主义的关键词是意识元素、内省和可重复性问题。"),
    page("William James and Functionalism", "认识 James 如何反对把意识切成碎片。", "这一页的人物图承接 structuralism 的争论。James 更关心意识在生活中做什么，而不是由哪些基本元素组成。他提出 stream of consciousness，强调思想和感受像连续流动的过程。", "James 代表从“意识结构”转向“意识功能”。", true),
    page("Functionalism：意识有什么用", "区分 structuralism 的 structure 与 functionalism 的 function。", "functionalism 问的是意识经验的目的和适应价值。课件用震惊消息的心理防御举例：人为什么会一开始否认现实？功能主义会问这种反应是否帮助个体短暂缓冲压力、重新组织行动。它不把意识拆成零件，而是看意识如何服务适应、决策和行为。", "功能主义把心理活动理解为适应环境的功能过程。"),
    page("Stream of consciousness 的文学图像", "用图像理解 James 所说的意识连续流。", "这一页用文字涡流和漫画表现意识流。读图时不要只看装饰，重点是感受“一个念头接着另一个念头”的连续性：意识不是静态清单，而是会被语言、情绪、记忆和外部刺激不断带动的过程。", "意识流说明心理经验具有连续、变化和联想的特点。", true),
    page("意识流先驱与文学例子", "把心理学概念连接到文学表达。", "James Joyce、William Faulkner、Virginia Woolf 等文学例子显示，意识流不仅是心理学术语，也影响了叙事方式。文学通过跳跃的语句、片段记忆和主观联想模拟人的内在经验。这里帮助读者理解 James 的观点：意识更像流动过程，而不是可整齐切割的元素表。", "文学意识流是理解 functionalism 的直观例子。", true),
    page("找图中异常：注意与知觉导入", "体会心理学研究可以从日常知觉任务进入。", "这页邮件式材料让读者找图片哪里不对。它不是单纯玩笑，而是在展示知觉和注意的特点：我们常以为自己看到了全部细节，但实际会被整体场景、期待和任务目标引导。这个例子把 Lecture 1 的意识问题连接到后面 Lecture 3 的 perception。", "日常视觉任务可以暴露注意和知觉并不等于完整记录。", true),
    page("John Watson and Behaviorism", "认识 behaviorism 为什么反对研究主观意识。", "Watson 的人物页开启另一场转向：如果内省不可靠，那心理学能否只研究可观察行为？行为主义会把研究对象从内在 consciousness 移到 overt behavior。", "Watson 代表把心理学推向可观察行为的路线。", true),
    page("Behaviorism：排除意识以追求客观性", "理解 operation definition 的作用。", "Watson 认为 consciousness 太主观，科学心理学应该研究可观察反应。operation definition 把心理状态转成固定测量程序，例如不把 hunger 定义为“想吃东西的感觉”，而定义为“禁食多少小时”。这样做牺牲了主观体验的丰富性，却提升了客观测量和复现可能。", "行为主义的优势是客观测量，代价是暂时排除主观经验。"),
    page("刺激-反应与 Skinner", "理解行为主义如何解释学习和训练。", "这一页从 nurture、stimulus-response 和 Skinner 引出操作性条件作用。行为主义认为环境强化会塑造行为：带来正结果的反应更可能重复，带来负结果的反应更可能减少。Watson 的婴儿名言表达了强环境论倾向；Skinner 则用强化和惩罚解释行为形成。", "行为主义把学习理解为环境刺激、反应和后果之间的关系。"),
    page("Skinner Box：强化如何塑造行为", "读懂 Skinner box 为什么是行为主义实验范式。", "图中老鼠、杠杆、食物投放器和电击网格构成可控环境。实验者可以精确记录老鼠按压杠杆的次数，并改变奖励或惩罚条件。读图时先找 response，再找 consequence：行为主义正是通过这种可计数关系研究学习。", "Skinner box 把“学习”变成可操作、可记录、可重复的实验。", true),
    page("Sigmund Freud and Psychoanalysis", "认识 Freud 如何重新把不可见心理带回解释。", "Freud 的人物页引出 psychoanalysis。与行为主义相反，Freud 认为许多影响行为的原因并不在意识层面，而在 unconscious mind。", "Freud 代表用无意识解释行为和人格的传统。", true),
    page("Freud：无意识心理", "理解 unconscious 与 conscious introspection 的区别。", "Freud 研究异常意识经验，认为日常思想和情绪中有大量未被意识到的动机、记忆和冲突。这些内容不能通过普通内省直接读取，却会在行为、人格和症状中表现出来。这里要注意：Freud 不是简单说“人会忘事”，而是说行为可能受不可意识化的心理力量影响。", "psychoanalysis 把无意识作为解释行为和症状的重要层次。"),
    page("Freud 的人格冰山模型", "用冰山图理解 conscious、preconscious 和 unconscious。", "冰山上方是能被意识到的内容，水面附近是可被提取的 preconscious，水下大部分是 unconscious。图中 id、ego、superego 说明人格不同力量之间可能冲突。读图时记住：冰山不是解剖图，而是把可意识程度和心理动力关系可视化。", "冰山模型强调不可见的心理内容可能影响可见行为。", true),
    page("防御机制：焦虑如何被处理", "理解 psychoanalysis 如何解释看似奇怪的反应。", "漫画列出 rationalization、reaction formation、projection、regression、displacement、denial 和 repression。读图时把它们看成处理焦虑的方式：人可能否认现实、把冲突投射到别人身上，或用合理化解释自己的行为。重点不是死背图中所有小人，而是理解防御机制如何把无意识冲突转成可观察表现。", "防御机制连接了无意识冲突和外显行为。", true),
    page("早期心理学流派总览", "把 structuralism、functionalism、Gestalt、behaviorism、psychoanalysis 放在一张图里比较。", "这一页是 Lecture 1a 的核心复习表。结构主义问意识由什么组成，功能主义问意识有什么用，格式塔反对把整体拆碎，行为主义排除意识以研究行为，精神分析强调无意识。读图时按“研究对象”和“方法”比较，而不是只背人物名。", "不同流派的分歧来自它们选择了不同研究对象和证据标准。", true),
    page("Marr 三层与当代认知科学", "把心理学史过渡到计算认知科学。", "Marr 的三层回答同一个认知任务的三个问题：computational level 问目标是什么，algorithmic level 问用什么表征和步骤实现，implementational level 问由什么神经或机器硬件承载。PDP 和 connectionism 说明当代认知科学会把心理规律、算法模型和神经实现放在一起研究。", "Marr 三层把 mind 的研究从流派争论推进到可计算解释框架。", true),
    page("Mind as computation：M3 Lab 框架", "理解本课程为什么反复连接 mind、machine 和 mathematics。", "这一页把 adaptive intelligence 看作一组核心计算算法。行为/认知层定义问题，数学层给出优化、估计和推断形式，神经科学层说明硬件如何实现。读者要把它作为后续课程的总框架：知觉、记忆、推理都可以被问成“要解决什么问题、用什么算法、由什么机制实现”。", "本课程的主线是 cognition = representation + computation。", true)
  ],
  lecture1b: [
    page("Rationality：理性的定义", "建立 rationality、knowledge、goal 和 normative model 的关系。", "理性不是“聪明的感觉”，而是用知识达成目标的能力。knowledge 被定义为 justified true belief，goal 是努力和欲望指向的对象。normative model 说明在目标和环境给定时，一个智能体应该怎样推理；它来自逻辑、哲学和数学，也用来衡量人类真实行为为什么偏离标准。", "理性研究同时需要“应该怎样推理”和“人实际怎样推理”。", true),
    page("San of the Kalahari Desert", "用狩猎场景理解理性不是课堂逻辑题的专利。", "San 人追踪猎物的图片提醒我们：理性推理也发生在生存实践里。猎人要根据足迹、天气、动物状态和地形更新判断，这涉及分类、因果推理和证据权重。", "理性是用证据达成目标的能力，而不只是会做形式逻辑。", true),
    page("持久狩猎中的分类与因果推理", "把 San 例子拆成认知能力。", "这页列出三类能力：两足行走、少毛和大脑支持持久狩猎；足迹形状和间距支持分类；根据证据诊断性调整信念支持因果推理。读者要看到，所谓 rationality 包含身体适应、分类知识和根据证据更新假设。", "实际理性常表现为分类、因果判断和证据更新的组合。"),
    page("智能顶峰的候选能力", "比较记忆、联想、因果、沟通和逻辑推理。", "这一页先把五种能力作为问题抛出：骑车记忆、蛇咬后的恐惧、理解闪电点燃森林、用暗号提醒后代、意识到死亡。读者应先判断每个例子对应哪种认知能力，再思考为什么课程会把 logic reasoning 放到最高层讨论。", "智能不是单一能力，课程接下来会突出逻辑推理的地位。", true),
    page("智能顶峰问题的课堂选择", "理解为什么 logical reasoning 被当作高级智能。", "黑板页重复上一页问题，但用选项形式逼迫读者分类：long-term memory、association、cause and effect、communication、logic reasoning。逻辑推理之所以特殊，是因为它允许个体从已有命题推出必然或高可信结论，而不是只靠经验反应。", "逻辑推理把知识组织成可检验、可传递的结论。", true),
    page("Rationality 的组成", "掌握理性行为需要哪些条件。", "这一页把 rationality 拆为一致偏好、连贯信念、处理不确定性、依据证据修正信念，以及与其他理性或非理性主体互动。它告诉读者：理性不只是“想得对”，还包括在信息不足、目标冲突和社会互动中保持可解释的决策。", "理性包括逻辑一致、证据更新和不确定条件下的决策。"),
    page("演绎逻辑与归纳逻辑", "区分 deduction 和 induction。", "deductive logic 从一般规则推出特定结论，若前提真且推理有效，结论必须真。inductive logic 从特定例子推广到一般规律，结论有强弱而非绝对必然。statement 由 subject、predicate 和 quantifier 组成，后面的量词页会说明命题范围如何改变逻辑关系。", "演绎追求必然性，归纳追求有证据支持的可能规律。", true),
    page("ALL、SOME、NONE 三类量词", "读懂量词如何改变命题含义。", "All 是 universal quantifier，Some 是 existential quantifier，None 是否定的全称结构。难点在英文表达：some are not 等于 not every is，不等于 all are not。读者做题时要先把自然语言翻译成逻辑范围，否则容易把“有些不是”和“全部不是”混淆。", "量词决定命题覆盖范围，是演绎逻辑的基础。", true),
    page("Square of Opposition", "理解命题之间何时不能同时为真。", "表格把 affirmation/denial 与 universal/particular 交叉，形成 Every A is B、No A is B、Some A is B、Not every A is B。问题问哪一对 statements opposing，即不能同时为真。读者应先定位两个命题的量词和肯否，再判断它们是否构成矛盾或反对关系。", "形式逻辑训练的是命题结构，而不是句子表面相似度。", true),
    page("Wason selection task：抽象规则", "学习如何找反例验证条件规则。", "规则是“如果一面是元音，另一面必须是偶数”。要验证它，必须翻元音卡 H? D? 这里应翻有元音的一面和奇数的一面，因为奇数背后若是元音就直接反驳规则。读者要抓住条件句的反例形式：P 且非 Q。", "验证 if P then Q 的关键是寻找 P and not Q。", true),
    page("Wason task：社会内容版本", "理解内容经验如何改善推理表现。", "啤酒和年龄版本与上一页逻辑结构相同：如果喝啤酒，则必须超过 19 岁。需要检查喝啤酒者是否未成年，也要检查未成年人是否喝啤酒。这个版本通常更容易，因为社会规则和违规检测让逻辑结构变得直观。", "人类推理会受到语境和熟悉内容的帮助。", true),
    page("归纳推理例题：数字和图形规律", "练习从例子猜测一般规则。", "这些题不像演绎逻辑那样由规则保证唯一结论，而是要求从少量例子发现最合理规律。讲者备注给出答案思路：数字题可能是相加、蛋白蛋黄数量、相邻数和为 10。做这类题要写出规则，而不只是写答案。", "归纳题的核心是提出并检验最能解释样例的规律。", true),
    page("归纳推理例题：位置、颜色和模式", "把归纳推理扩展到视觉模式。", "机器人、火车和串串题要求读者观察方向交替、颜色对应或两端形状。读图时先找不变规则，再检查每个选项是否违反规则。这里与后面 perception as pattern discovery 相连：认知系统常从视觉例子中发现规则。", "视觉归纳就是在多个样例中寻找稳定关系。", true),
    page("Rationality、consciousness 与 free will", "把理性讨论带回 Lecture 1a 的意识和自由意志。", "本页把 Freud 的 unconscious 与 free will 放在一起问：如果隐藏动机和记忆会影响思想行为，那么决策主体真的完全自由吗？理性要求基于理由行动，但人类的理由可能受无意识和情境影响。", "理性研究最终会触及意识、动机和自由意志问题。", true)
  ],
  lecture2a: [
    page("Weekly Plan：神经系统与大脑", "知道 Lecture 2a 如何从心智问题转向生物实现。", "这一讲进入 Marr 的 implementational level：认知功能需要神经系统来承载。路线从 peripheral nervous system 和 central nervous system 开始，再到 subcortical、cerebral cortex、lateralization，最后为 neuron、neurotransmitter 和 sensory transduction 铺路。", "Lecture 2a 的任务是给认知功能建立神经结构地图。"),
    page("Neuroanatomy 101：神经系统总览", "建立 CNS/PNS 和神经系统层级。", "图中把 nervous system 分成 central nervous system 和 peripheral nervous system。中枢包括 brain 和 spinal cord，负责整合与控制；外周把身体感觉和运动信息连接到中枢。右侧人体图帮助读者把抽象分类放回身体位置。", "先分清中枢和外周，再理解反射、感觉和运动通路。", true),
    page("外周神经与脊髓通路", "理解身体信息如何进出中枢。", "这页图像显示神经从身体各处连到脊髓和脑。读图时先看脊髓像主干，再看周围神经像分支：感觉输入沿传入路径进入中枢，运动命令沿传出路径回到肌肉。", "神经系统的基本方向是输入进入中枢，输出控制身体。", true),
    page("Simple sensory-motor reflex arc", "读懂反射弧为什么能自动保护身体。", "刺激作用于皮肤后，神经冲动进入脊髓，再从脊髓传到肌肉使其收缩。反射不需要先经过复杂意识决策，所以速度快，适合保护身体。读图时按 stimulus、sensory neuron、spinal cord、motor neuron、muscle 的顺序走。", "反射弧展示了神经系统最基本的输入到输出闭环。", true),
    page("反射弧的细节", "把上一页的概念放进更完整的神经通路。", "图中包含感觉受体、传入神经、脊髓中间神经元、传出神经和效应肌肉。这里要学的是“自动”不等于“没有神经计算”：脊髓局部回路已经完成了快速判断和反应分配。", "反射是低层神经回路完成的快速感觉-运动转换。", true),
    page("自主神经系统", "区分 sympathetic 和 parasympathetic 的作用方向。", "图中列出眼、唾液腺、肺、心脏、胃肠等器官如何受自主神经控制。sympathetic 系统让身体进入动员状态，parasympathetic 系统帮助恢复和消化。读图时不要背孤立器官，而要看两套系统如何对同一器官产生相反调节。", "自主神经系统维持身体状态，为认知和行动提供生理背景。", true),
    page("fight-or-flight 与 stay cool", "用身体反应理解自主神经系统。", "左侧 fight-or-flight 对应交感激活：心跳加快、呼吸增强、能量动员。右侧 stay cool 对应副交感主导：身体回到平稳、消化和恢复状态。情绪、注意和决策都受到这些身体状态影响。", "认知不是脱离身体运行，身体唤醒会改变心理状态。", true),
    page("Head, Brain, and Skull", "建立头骨、脑和脊髓的空间关系。", "这页展示脑在颅骨中的位置，以及脊髓如何从脑干向下延伸。读图时先分保护结构和功能组织：skull 保护，brain 处理信息，spinal cord 连接身体。", "理解脑结构前，先把它放回头颈的解剖位置。", true),
    page("脑干：thalamus、midbrain、pons、medulla", "认识脑干和丘脑的基本定位。", "图中标出 thalamus、midbrain、pons 和 medulla。medulla 与基本生命功能相关，pons 参与脑区通信和睡眠等功能，midbrain 与感觉运动整合有关，thalamus 常作为感觉信息通向皮层的重要中继。", "脑干和丘脑是皮层下信息中继与生命维持的重要结构。", true),
    page("后脑与小脑", "理解 cerebellum 不只是运动小脑。", "图中显示 pons、medulla、cerebellum 和 spinal cord。小脑传统上与协调运动和平衡有关，也会参与时间控制和学习。读图时看小脑位于脑后下方，它与脑干相邻，适合接收身体和运动反馈。", "小脑帮助动作协调，也为后续技能学习打基础。", true),
    page("边缘系统结构", "认识 hippocampus、amygdala 和 hypothalamus 的位置与功能线索。", "图中 hippocampus 与记忆形成相关，amygdala 与情绪和威胁评估相关，hypothalamus 连接动机、内分泌和自主调节。读者要把它们看作 emotion、memory、motivation 的连接点。", "边缘系统把记忆、情绪和身体调节联系起来。", true),
    page("大脑叶与小脑位置", "建立 frontal、parietal、temporal、occipital 四叶地图。", "彩色脑图标出 frontal lobe、parietal lobe、temporal lobe、occipital lobe 和 cerebellum。先按空间方向记：额叶在前、枕叶在后、颞叶在侧下、顶叶在上后。后面语言、视觉、躯体感觉和执行功能都要落到这张地图上。", "四叶地图是理解皮层功能定位的基础。", true),
    page("解剖方向：anterior/posterior 等", "学会读脑图的方向标记。", "脑图常用 anterior/posterior、left/right、dorsal/ventral、medial/lateral 等方向。读图时先找坐标方向，否则会把内侧、外侧、背侧、腹侧混淆。", "看脑图先读方向，再读结构名称。", true),
    page("脑中线结构与皮层下结构", "把 thalamus、hypothalamus、corpus callosum、cerebellum 放进整体图。", "矢状切面让我们看到脑的内侧结构。corpus callosum 连接左右半球，thalamus 常作中继，hypothalamus 调节内稳态，cerebellum 在后下方。读图时注意这些结构不在同一功能系统，却共同支撑认知和行为。", "内侧脑图帮助理解脑区之间的空间和连接关系。", true),
    page("大脑皮层与小脑外观", "从外观识别 cortex 和 cerebellum。", "这页将皮层沟回和小脑放在一起。皱褶增加表面积，让更多神经元参与处理；小脑也有精细折叠结构。这里的作用是提醒读者，大脑功能不是平面标签，而依赖复杂组织。", "脑的折叠结构与信息处理容量相关。", true),
    page("大脑半球与 corpus callosum", "理解左右半球如何连接。", "图中红色区域是 corpus callosum，它像桥一样连接左右 cerebral hemispheres。没有这座桥，两个半球的信息整合会受影响。后面谈 lateralization 时，要同时记住分工和连接。", "左右半球有分工，但正常认知依赖胼胝体整合。", true),
    page("视觉通路与交叉", "读懂左右视野如何投射到脑。", "图中眼睛、视交叉和视觉通路显示：每只眼接收左右视野信息，部分神经纤维在 optic chiasm 交叉，最终让左右脑处理对侧视野。读图时按光线进入眼睛到信息到达脑的路径走。", "视觉系统的关键不是左眼到左脑，而是视野信息的交叉组织。", true),
    page("Left vs Right Brain", "谨慎理解左右脑侧化。", "信息图和 MRI 图说明左右半球可能在语言、空间、情绪等方面有侧化倾向。但复习时不要把它简化为“左脑理性、右脑艺术”的流行说法；真实认知多数需要双侧网络协作。", "侧化是功能偏向，不是两个独立人格。", true),
    page("Einstein’s Brain", "理解名人脑研究的证据边界。", "这页提到 Einstein 的 corpus callosum、prefrontal groove 和 glia/neuron ratio。它适合引发问题：个体脑结构差异是否与认知能力有关？但单个名人脑不能直接证明天才机制，需要谨慎看待个案证据。", "脑结构差异可以提出假设，但不能单靠个案下结论。", true),
    page("Marian Diamond 与 Einstein 脑研究", "认识科学报道与脑研究之间的关系。", "这页引用 Berkeley 新闻和纪录片，说明 Einstein 脑研究有具体研究者和传播材料。读者应区分课堂材料、媒体报道和可检验证据：课堂上用它打开神经结构差异话题，不应无限扩写成确定结论。", "科学传播材料要回到证据强度来理解。", true),
    page("大脑体积的演化比较", "理解 large-brained mammals 的比较意义。", "不同动物脑图说明演化产生了多个大脑较大的哺乳动物。大脑大不自动等于智能高，因为还要看身体比例、神经连接、生态压力和具体任务。", "比较脑大小时必须结合结构、连接和行为需求。", true),
    page("不同动物脑的对比", "继续练习用比较视角看大脑。", "这页展示多种动物脑形态和相对大小。读图时问三个问题：这个物种需要解决什么行为问题，脑区是否特化，脑大小和身体大小如何比较。", "神经系统是适应生态问题的结果。", true),
    page("头骨与脑容量材料", "从化石或解剖材料理解脑演化证据。", "图中头骨和脑容量对比提醒我们，认知演化常通过间接证据研究。头骨可以提供脑腔大小等线索，但不能直接告诉我们语言、意识或推理水平。", "化石证据能支持演化推断，但解释要谨慎。", true),
    page("Girl with only half a Brain", "理解神经可塑性和功能代偿。", "这个病例说明儿童脑在损伤或半球切除后可能通过可塑性保留许多功能。读者要抓住重点：脑区定位重要，但功能也会随发育、训练和网络重组而改变。", "脑不是固定机器，发展中的神经系统具有显著可塑性。", true),
    page("四叶功能图", "把皮层功能定位到四个脑叶。", "图中标出 motor area、somatosensory area、auditory area、visual area 等。额叶与运动和高级控制相关，顶叶与躯体感觉和空间整合相关，颞叶与听觉和识别相关，枕叶与视觉相关。", "四叶功能图是后续语言、视觉和记忆定位的基础。", true),
    page("Two cerebral hemispheres and four lobes", "用文字总结半球、胼胝体和脑叶功能。", "这一页把前面的图整理成可背的结构：两半球由 corpus callosum 连接；每个半球有 occipital、parietal、temporal 和 frontal lobes。注意 frontal lobe 不只管运动，还涉及 speech、planning、goal-directed behavior、reasoning 和 problem solving。", "半球连接和四叶功能需要一起记。"),
    page("脑区细节标签图", "练习在复杂脑图中定位结构。", "这页有大量皮层和皮层下标签。读图时不要试图一次背完，而是先定位大类：额叶、顶叶、颞叶、枕叶、脑干、小脑，再逐步记具体结构。", "复杂脑图要从大结构到小结构分层阅读。", true),
    page("Broca 与 Wernicke 语言区", "理解语言产生和理解的皮层定位。", "左半球图标出 Broca’s area 和 Wernicke’s area。Broca 区更与 speech production 相关，Wernicke 区更与 language comprehension 相关。读图时注意它们都在左半球语言网络中，但语言任务还需要更多脑区协作。", "语言功能有关键节点，但不是单一区域独立完成。", true),
    page("Neural Basis of Memory", "把脑结构学习连接到记忆系统。", "这一页预告 Lecture 4：hippocampus 形成新关联，cortex 分布式存储记忆，basal ganglia 支持技能和习惯，learning 是突触连接效能的改变。它把 Lecture 2 的结构地图和 Lecture 4 的记忆理论连起来。", "记忆不是存放在一个点，而是多脑区和突触可塑性的结果。")
  ],
  lecture2b: [
    page("Neuron structure overview", "认识神经元的基本部件。", "图中神经元由 dendrites、soma、axon 和 terminal buttons 组成。学习顺序要按信息流走：树突接收输入，胞体整合，轴突传导动作电位，末梢影响下一个细胞。", "神经元是输入、整合、输出的细胞机器。", true),
    page("神经网络显微图", "把单个神经元放回网络背景。", "蓝色显微图展示许多神经元和突起交织。它提醒我们，大脑不是孤立细胞集合，而是大量细胞通过连接形成网络；认知功能来自这些网络活动。", "单个神经元重要，但心智依赖网络连接。", true),
    page("Neuron parts and signal direction", "再次确认 dendrite、soma、axon、terminal 的位置。", "图中把树突、细胞体、轴突和终末与肌肉连接。读图时从 dendrites 到 axon terminals 走一遍，理解为什么输入区和输出区不同。", "神经信号有方向：接收、整合、传出。", true),
    page("突触输入与神经整合", "理解兴奋和抑制如何汇入神经元。", "这页示意多个突触输入到同一个神经元。兴奋性输入提高放电可能，抑制性输入降低放电可能。胞体并不是被动接线板，而是在时间和空间上整合输入。", "神经元是否放电取决于多路输入的整合结果。", true),
    page("神经回路中的兴奋和抑制", "看懂 inhibitory 与 excitatory 连接如何塑造输出。", "红绿箭头显示不同神经元之间的兴奋和抑制关系。读图时要看一个细胞如何影响下游细胞，而不是只看形状。复杂行为可以由简单兴奋/抑制组合生成。", "神经计算常来自兴奋与抑制的平衡。", true),
    page("EPSP 与 IPSP", "区分 postsynaptic potential 和 action potential。", "EPSP 让 postsynaptic neuron 更接近阈值，IPSP 让它远离阈值。它们是 graded，不是 all-or-none；soma 会把多个 EPSP/IPSP 加总。动作电位则是超过阈值后的全或无信号。", "突触后电位是可加总的输入，动作电位是阈值触发的输出。", true),
    page("Chemical synapse diagram", "理解 neurotransmitter 如何跨过 synaptic cleft。", "图中动作电位到达末梢后，囊泡释放 neurotransmitter，递质跨过 cleft 结合受体，引发 postsynaptic change。读图时按电信号到化学信号再到电变化的顺序理解。", "突触把一个神经元的电活动转成下一个神经元的化学输入。", true),
    page("Receptor types and drug action", "理解受体形状决定递质或药物效果。", "图中显示不同分子与 receptor 的结合方式。agonist 可模拟递质，antagonist 可阻断受体。这里为后面药物、情绪和行为改变打基础。", "递质效果取决于它和受体的匹配以及受体后的细胞反应。", true),
    page("More details：生物物理和生物化学", "知道后面会进入离子和膜电位细节。", "这一页是过渡页，提示神经信号不能只用“传消息”理解，还要看 Na+、K+、离子通道、膜电位和泵。", "动作电位的细节来自膜上的离子运动。"),
    page("Axon collateral", "理解一个神经元可以影响多个目标。", "图中 axon collateral 说明轴突可以分支，联系多个下游细胞。这样一个神经元的放电能同时影响多个通路，也让神经网络产生分布式效果。", "神经信号不是单线传输，轴突分支让信息广播到多个目标。", true),
    page("Resting potential and action potential", "看懂膜电位如何被测量。", "电极和示波器图显示，静息时神经元内部约 -70 mV；刺激后电位快速上升形成 spike，即 action potential。这里的重点是神经活动可以被物理测量，而不是抽象比喻。", "动作电位是沿轴突传播的快速电压变化。", true),
    page("Neuron membrane", "理解膜、通道和离子是动作电位基础。", "膜图展示脂双层和通道蛋白。神经元膜不是普通边界，而是控制离子进出的选择性结构。不同通道开关决定 Na+、K+ 等离子如何改变膜电位。", "膜和离子通道决定神经元是否能产生电信号。", true),
    page("细胞内外离子浓度", "记住 Na+、K+ 和负电位的基本分布。", "图中强调 Na+ 外多内少，K+ 内多外少，神经元内部静息时带负电。Na+ 倾向进入，K+ 倾向外流；这些浓度梯度是动作电位的能量基础。", "动作电位靠离子浓度梯度和通道开关共同产生。", true),
    page("Na+ 与 K+ 的进入和流出倾向", "把离子分布转成因果理解。", "这页用文字总结：Na+ wants to get in，K+ wants to get out。读者要把它理解成电化学驱动力，而不是离子有意愿。神经元内部负电也会吸引正离子进入。", "离子的“想进/想出”来自浓度差和电荷差。"),
    page("Ion channel examples", "认识通道如何选择性允许离子通过。", "图中展示膜通道的开放和关闭。不同通道对不同离子有选择性，并受到电压或配体控制。学习时要把 channel 当成可调门，而不是膜上的洞。", "离子通道控制离子流，从而控制膜电位。", true),
    page("Ligand-gated 与 voltage-gated channels", "区分两类通道的触发条件。", "ligand-gated channel 多在 dendrites，递质结合后开关；voltage-gated channel 多在 axons，膜电位变化后开关。Na+ channel 在阈值附近打开，K+ channel 随后打开帮助复极。", "树突接收化学信号，轴突用电压门控通道传播动作电位。", true),
    page("Action potential 的阶段", "按 -70、-40、+55、-70 mV 读懂动作电位。", "静息约 -70 mV，去极化到阈值约 -40 mV 后 Na+ 通道打开，Na+ 内流使电位冲向峰值；随后 K+ 通道打开，K+ 外流带来复极和恢复。读图时沿电压曲线理解通道开关顺序。", "动作电位是 Na+ 内流和 K+ 外流按时序配合的结果。", true),
    page("动作电位沿轴突传播", "理解 depolarization wave 如何前进。", "图中显示局部 Na+ 进入引发相邻区域去极化，波形沿轴突从一段传到下一段；随后 K+ 外流恢复负电。传播不是电流简单滑过去，而是沿膜不断重新触发通道。", "动作电位靠相邻膜区连续触发来传播。", true),
    page("Saltatory conduction and myelin", "理解髓鞘为什么加快传导。", "分段图显示有髓轴突上动作电位可在 Ranvier nodes 间跳跃传播。髓鞘减少电流泄漏，提高传导速度。", "髓鞘让神经信号更快、更有效率。", true),
    page("All-or-none and spike train", "区分单个 spike 和放电频率。", "动作电位超过阈值后具有 all-or-none 性质：单个 spike 幅度相对固定。但神经元可以用 spike train 的频率和模式表达刺激强度。refractory period 限制了连续放电速度。", "神经元不靠单个 spike 大小编码强度，而常靠放电频率和模式。"),
    page("Na+/K+ pump", "理解泵如何维持离子梯度。", "泵图显示 Na+/K+ pump 使用能量把 Na+ 和 K+ 逆浓度梯度搬运，以恢复和维持静息条件。没有泵，动作电位消耗后的离子差会逐渐消失。", "Na+/K+ pump 是神经元长期可重复放电的维护系统。", true),
    page("Synaptic terminal overview", "把轴突末端和突触前结构看清楚。", "图中显示 axon terminal、vesicles 和 postsynaptic membrane。动作电位到达末梢后，末梢把电信号转化为递质释放。", "突触前末梢是电信号转化为化学信号的位置。", true),
    page("Synaptic cleft", "理解 cleft 是两个神经元之间的化学传递空间。", "放大的突触图标出 vesicles、neurotransmitter、synaptic cleft 和 receptors。读图时注意递质不是直接穿过细胞，而是从突触前释放到间隙，再被突触后受体识别。", "synaptic cleft 是递质扩散和受体识别发生的空间。", true),
    page("Synaptic transmission clip", "完整串联突触传递过程。", "当 action potential 到达 terminal buttons，递质释放、扩散并结合 postsynaptic receptor。key-lock 比喻说明递质必须与对应受体形状匹配。视频页不能由静态截图还原动作过程，但截图保留了步骤框架。", "突触传递把电、化学和受体选择性串成一个因果链。", true),
    page("Lock-and-key receptor model", "用钥匙锁模型理解受体特异性。", "图中不同形状分子只能匹配特定受体。这个模型解释为什么同一种递质或药物只有在有相应 receptor 的细胞上才产生效果。", "递质作用的选择性来自受体匹配。", true),
    page("Why is it amazing?", "从细胞机制回到 mind 的问题。", "课件在这里停下来问：为什么这一切令人惊奇？因为前面讲的离子、通道、突触都是物理化学过程，但它们组合起来却支持感觉、记忆、决策和意识。", "认知科学要解释物质过程如何支持心理过程。"),
    page("Neural representation of reality", "理解物理现实如何变成神经和概念现实。", "图中把 physical reality、neurophysiological reality 和 conceptual reality 串起来。外界刺激先变成神经活动，再被组织为概念和意义。读图时看三层转换，不要把感知当作外界的直接复制。", "心智经验是物理刺激经过神经和概念加工后的结果。", true),
    page("Phineas Gage", "用病例理解脑损伤和人格/决策变化。", "Gage 的铁杆穿脑事故常用于说明额叶损伤可能改变人格、冲动控制和社会决策。个案不能说明所有额叶功能，但它强烈提示脑结构与心理功能相关。", "脑损伤病例帮助我们把心理功能定位到神经系统。", true),
    page("Sensation：从转导到心智", "进入 sensory transduction 主题。", "图中从外界刺激到脑活动，提示感觉不是照相，而是能量转换：光、声、压力等物理能量要先被受体转成神经信号，才能进入心智处理。", "sensation 的核心是把物理能量转成神经信息。", true),
    page("Visual pathway diagram", "读懂视觉信息从眼到脑的路径。", "光进入眼睛，视网膜受体转导，信息经视神经和中继结构到达视觉皮层。读图时沿箭头走，区分眼球内的光学成像和神经系统中的信息传递。", "视觉不是眼睛单独完成，而是眼到脑的通路。", true),
    page("Eye anatomy", "认识角膜、晶状体、视网膜和视神经。", "眼球剖面图展示光线如何经过 cornea、lens、vitreous humor 到 retina。retina 是光敏层，optic nerve 把信息送出眼球。", "眼睛先完成光学聚焦，视网膜再进行神经转导。", true),
    page("Adaptation to light intensity", "理解明暗适应为什么改变敏感度。", "before/after 图说明眼睛和视觉系统会根据光照条件调整。暗处瞳孔和受体敏感度变化，强光下系统降低敏感度以避免饱和。", "视觉系统会调节工作范围，而不是固定记录光强。", true),
    page("视觉图像与像素化例子", "体会视觉信息需要被编码和重建。", "低分辨率头像提醒我们，视觉系统会从有限信息中恢复对象。即便输入不完整，大脑也能利用经验和模式补全。", "感知依赖输入，也依赖重建和解释。", true),
    page("视觉成像路径", "把光学成像和神经通路合在一起。", "图中显示光进入眼球后在视网膜上形成图像，再由神经路径送往脑。读图时注意成像位置和最后知觉位置不同：图像在视网膜，经验在脑中形成。", "眼睛提供输入，脑形成知觉。", true),
    page("Find your blind spot", "通过练习理解 blind spot。", "盲点练习让读者用注视和距离变化发现视盘处没有感光细胞。之所以平时感觉不到，是因为大脑会根据周围信息填补缺失。", "盲点证明知觉会补全，而不是逐点复制视网膜。", true),
    page("Rods and cones distribution", "理解杆体和锥体在视网膜上的分布差异。", "图表显示 cones 集中在 fovea，rods 在中央外侧密度更高。cones 支持细节和颜色，rods 支持弱光敏感。读图时看横轴离中央凹的角度和纵轴 receptor density。", "视网膜不同区域承担不同视觉任务。", true),
    page("Russell De Valois and color vision", "认识视觉科学中的颜色研究线索。", "这一页把 Berkeley vision scientist 放进课程个人脉络。它提醒读者，颜色视觉不是直觉事实，而是有神经科学和心理物理研究传统。", "颜色知觉需要用实验和神经机制解释。", true),
    page("Rhodopsin molecule", "理解光受体分子的角色。", "rhodopsin 是杆体中的感光分子，光照会引发分子状态变化，进而启动转导链。这里要把“看见光”落实到分子事件。", "光转导从感光分子的状态变化开始。", true),
    page("Retina anatomy", "读懂视网膜层级和 photoreceptors。", "视网膜图显示光穿过内层后到达 rods 和 cones，再由双极细胞、神经节细胞等传递信息。读图时注意光路和神经信号方向并不完全相同。", "视网膜本身已经进行初步神经处理。", true),
    page("Visible light and color dimensions", "理解 hue、brightness、saturation。", "可见光谱只是电磁波的一小段。颜色经验可以分解为 hue、brightness 和 saturation：色相对应颜色类别，亮度对应明暗，饱和度对应灰度混入多少。", "颜色是物理波长和视觉系统加工共同产生的经验。", true)
  ],
  lecture3a: [
    page("Weekly Plan：perception as unconscious inference", "知道本讲如何从视觉通路走向错觉和推断。", "这一讲回答 sensation 如何变成 perception。前半复习眼、视网膜和颜色，随后用盲点、后像、Hermann grid、motion after-effect 等说明感觉系统会适应、增强和补全输入；后半进入 Helmholtz、bottom-up/top-down、Bayesian brain 和各种视觉错觉。", "主线是：perception 不是复制输入，而是大脑基于输入和假设做推断。"),
    page("Eye anatomy review", "复习眼睛结构，为视觉错觉打基础。", "图中再次出现 cornea、lens、retina、optic nerve 等结构。读者要先确认视觉输入的物理入口：光学系统把光聚焦到视网膜，之后才有神经转导和知觉解释。", "理解视觉错觉前，先知道视觉信息从哪里进入。", true),
    page("Pixelated face：有限输入中的识别", "体会大脑如何从粗糙图像恢复对象。", "像素化头像虽然缺少细节，但我们仍能识别人脸轮廓。这说明知觉会利用先验经验和模式补全，不是等所有像素都清楚后才识别。", "视觉识别依赖输入，也依赖已有模式和期待。", true),
    page("Adaptation to light intensity", "理解视觉系统如何适应光照。", "before/after 图展示从明到暗或从暗到明时视觉敏感度会调整。这个机制让视觉系统在不同光强下保持可用范围，但也会造成短暂的不适和阈值变化。", "适应让视觉范围更宽，也说明感觉系统会主动调节。", true),
    page("Visual pathway and eye-to-brain flow", "把眼球、视网膜和脑通路连起来。", "图中视觉信息从眼睛进入，经过视网膜、视神经和脑内通路。读图时沿箭头看输入如何变成神经信号，再进入更高层解释。", "perception 建立在眼到脑的多级通路上。", true),
    page("Blind spot exercise", "通过练习发现视觉填补。", "闭右眼、左眼盯住十字并前后移动头部，是为了让目标落到视盘位置。视盘没有 photoreceptors，因此目标会消失；平时看不到盲点，是因为大脑用周围背景填补。", "盲点说明视觉经验包含大脑补全。", true),
    page("Retina anatomy review", "复习视网膜层级和 photoreceptors。", "视网膜不只是接收光的屏幕，它包含多层神经细胞。光线到达 rods 和 cones 后，信号经过双极细胞、神经节细胞等处理，再送往脑。", "视网膜已经在早期阶段加工视觉信息。", true),
    page("Rhodopsin molecule review", "把光转导落实到分子层面。", "rhodopsin 受光后改变状态，启动杆体中的转导过程。这里的重点是：视觉经验最终要从分子变化开始，经神经系统逐级放大和解释。", "从光到知觉，中间有分子、细胞和系统多个层次。", true),
    page("Russell De Valois", "理解颜色视觉研究的科学传统。", "人物页提示课程中的颜色和视觉材料来自心理物理与神经科学研究传统。读者应把它看作研究线索，而不是单纯人物记忆点。", "颜色视觉是可实验研究的神经认知问题。", true),
    page("Rods and cones distribution review", "读懂中央凹和周边视觉差异。", "图表显示 cones 在 fovea 高密度，rods 在中央外侧更多。由此解释为什么中央视野适合精细颜色任务，周边视野更适合弱光和运动敏感。", "受体分布决定不同视野位置的视觉能力。", true),
    page("Visible spectrum and color circle", "把颜色经验分成三个维度。", "可见光只是电磁波谱的一段。hue 是颜色类别，brightness 是明暗，saturation 是颜色纯度。色环帮助理解 hue 的连续变化，而不是把颜色当作离散标签。", "颜色知觉由物理波长和视觉系统编码共同决定。", true),
    page("Weird illusions：进入错觉", "把读者带入错觉作为证据。", "这一页是视觉错觉部分的入口。错觉不是大脑失败的笑话，而是研究 perception 的工具：当系统性错误出现时，我们能反推视觉系统平时用了什么规则。", "错觉揭示正常知觉机制。", true),
    page("蓝黄斜纹错觉", "观察局部线条如何影响整体方向感。", "密集斜纹让我们对方向和边界产生不稳定判断。读图时先看单条线，再看整体网格：局部方向信号被整合后，整体知觉可能偏离物理图案。", "方向知觉来自局部特征的整合，整合过程可能产生错觉。", true),
    page("色彩与形状交错错觉", "理解颜色、边界和运动感如何相互影响。", "彩色重复图案会让边界、深度或运动感变得不稳定。视觉系统试图把局部颜色和形状组织成整体表面，但重复结构会制造冲突。", "复杂图案会暴露视觉整合中的竞争。", true),
    page("Hue、Saturation、Brightness", "正式区分颜色三维。", "hue 是红、绿、蓝等色相；saturation 指灰色混入多少，决定颜色鲜艳或发灰；brightness 指明暗。读者要把色彩经验拆成维度，后面看错觉时才知道变化的是哪一类属性。", "颜色不是一个单值，而由色相、饱和度和亮度共同构成。", true),
    page("Color illusion example", "看颜色如何受背景影响。", "色块在不同背景中会显得不一样，即使物理颜色相同。视觉系统会根据周围颜色和光照假设做校正，因此颜色知觉常带有上下文依赖。", "颜色知觉会被背景和对比关系改变。", true),
    page("过渡或演示空白页", "识别过渡页也要说明作用。", "这一页主要承担课堂演示的停顿或切换作用。它没有可提取文字，但在课程结构上位于颜色和运动后效之间，提示后面开始看动态或适应类错觉。", "空白或过渡页也要保留原页入口并说明承接关系。", true),
    page("Motion after-effect", "理解运动后效来自适应。", "长时间观看同一方向运动刺激后，再看静止画面会产生反向运动感，这叫 motion after-effect，也称 waterfall illusion。它说明运动方向检测通道会适应，平衡被打破后产生错觉。", "运动后效证明运动知觉依赖可适应的神经通道。", true),
    page("Motion after-effect 示例二", "继续理解同一机制在不同图案中的表现。", "这一页重复 motion after-effect，用不同画面强化同一概念。重复页的价值在于让读者看到机制不是某一张图特有，而是运动通道适应的一般现象。", "同一机制可以在多个视觉刺激中产生类似错觉。", true),
    page("Motion after-effect 示例三", "把现象和机制连得更稳。", "继续观察运动后效时，要问：先前刺激让哪些方向选择性神经元疲劳？静止图为何被解释成反方向运动？这样读图比只记“瀑布错觉”更有用。", "复习错觉要说明神经或计算机制。", true),
    page("Motion after-effect 示例四", "总结运动后效的学习点。", "这一页仍在强化同一概念。它告诉我们 perception 有时间历史：当前知觉不仅由当前刺激决定，也受刚刚经历过的刺激影响。", "当前知觉会被先前适应状态改变。", true),
    page("Hermann Grid", "理解侧抑制如何增强局部对比。", "Hermann grid 中交叉点处会出现灰影，这是视觉系统增强局部对比时产生的副作用。读图时看白色通道和黑色方块交界，理解 lateral inhibition 如何让某些位置看起来更暗。", "Hermann grid 用错觉展示早期视觉的对比增强机制。", true),
    page("Perception is not veridical", "把前面错觉归纳成理论结论。", "这一页明确说知觉不是 veridical。适应扩展工作范围，后像显示 set-point 改变，盲点显示 fill-in，Hermann grid 显示 lateral inhibition。它把多个例子收束为同一结论：感觉层面已经在加工和编辑输入。", "视觉系统服务功能，不是被动复制物理世界。"),
    page("Feature analysis and integration", "理解 bottom-up form perception。", "图中先有 lines、edges 等 feature detectors，再由更高层 analyzer 组合，最后形成对刺激的判断。读图时按从局部特征到整体表征的方向走，这就是 bottom-up assembly 的基本思想。", "形状知觉可以由局部特征逐层整合而来。", true),
    page("Bar detector in V1", "理解 orientation-selective neurons。", "V1 中的 orientation selective neurons 对特定方向的条形刺激反应更强。这个发现说明大脑不是直接记录图像，而是把图像分解成方向、边缘等特征。", "方向选择性神经元是特征分析的神经基础之一。", true),
    page("Helmholtz Principle of Perception", "掌握 unconscious inference、bottom-up 和 top-down。", "Helmholtz 认为 perception 是 unconscious inference：知觉结果既要符合 sensory surface 信息，也要是世界中最可能的原因。bottom-up 由 proximal stimulus 驱动，top-down 受 context、expectation 和 knowledge 影响。", "知觉是输入证据和先验知识共同决定的推断。"),
    page("视知觉推断示意图", "把 Helmholtz 原理应用到具体图像。", "这一页用示意图表现同一视觉输入可能有多种解释。读图时先问近端刺激是什么，再问大脑为什么选择某个远端原因作为最可能解释。", "视觉系统总是在多个可能解释中选一个最合理解释。", true),
    page("自上而下与自下而上流程图", "理解两类信息流如何相互作用。", "bottom-up 从感觉输入上行，top-down 从知识、语境和期待下行。真正的知觉通常是二者结合：输入限制解释范围，经验帮助在歧义中选择。", "知觉不是纯输入，也不是纯想象，而是两者互动。", true),
    page("Context affects word perception", "看语境如何改变字母识别。", "同一个模糊字符在不同词语或句子背景中会被看成不同字母。读者要注意，物理刺激相同并不保证知觉相同，因为 top-down context 会改变解释。", "语境能改变我们对模糊输入的分类。", true),
    page("Sensation vs perception", "区分听到声音和理解意义。", "hi-jack/hello 的例子说明，感觉层面获得声音模式，但 perception 需要结合语境、语言知识和期待来决定它是什么意思。", "sensation 提供输入，perception 赋予解释。"),
    page("Brain as a Bayesian computation machine", "理解 Bayesian brain 假说。", "Bayesian brain 观点认为大脑把 sensory evidence 和 prior expectation 结合，估计最可能的世界状态。错觉常出现于先验在通常世界中有用，但在特殊图片里误导解释。", "贝叶斯视角把知觉看成概率推断。", true),
    page("Binocular disparity and cyclopean eye", "理解双眼视差如何支持深度知觉。", "两只眼看到的图像略有差异，大脑利用 disparity 重建深度。cyclopean eye 是把双眼信息融合成一个主观视点的概念。", "3D 视觉来自双眼信息的比较和融合。", true),
    page("3D reconstruction affects size judgement", "理解深度解释如何改变大小判断。", "当大脑把二维图像解释成三维场景时，大小判断会受深度假设影响。远处对象若视网膜大小相同，会被知觉为更大。", "大小知觉依赖深度推断，而不只依赖视网膜尺寸。", true),
    page("隧道深度错觉", "观察线性透视如何影响大小和距离。", "拱廊或隧道图利用透视线索制造深度。读图时看平行线如何汇聚、地面纹理如何变密，大脑据此推断空间距离。", "透视线索会让二维图片产生三维空间感。", true),
    page("Ames Room", "理解房间几何假设如何误导大小判断。", "Ames room 让观察者以为房间是规则矩形，但实际几何被扭曲。大脑使用“房间通常规则”的假设，因此把两个人解释成大小不同。", "Ames illusion 展示深度假设如何支配大小知觉。", true),
    page("Ames Room 几何结构", "把错觉拆成实际结构和主观解释。", "平面图或透视图显示房间真实形状与看起来不同。读者要分清 distal structure 和 perceived room：错觉来自错误几何假设，而不是眼睛分辨率不足。", "错觉常来自合理假设在特殊场景中的误用。", true),
    page("错觉答案或课堂投票页", "保留课堂判断结果并连接推理。", "讲者备注提示答案可能是 1 和 3。这类页通常用于检查学生是否受错觉影响。复习时重点不是数字，而是说明为什么某些选项被知觉系统解释成更合理。", "错觉题要解释判断依据，而不是只记答案。", true),
    page("How context affects perception", "用上下文理解知觉改变。", "这一页继续强调同一输入在不同背景中会产生不同解释。读者可把它和前面的文字语境、大小错觉、颜色对比联系起来：context 是 top-down influence 的具体来源。", "上下文是知觉推断的重要先验。", true),
    page("倾斜线与方向错觉", "观察背景方向如何改变线条判断。", "图中相同或相近方向的线会因为背景纹理显得倾斜不同。读图时先遮住背景想象，再看加入背景后的变化，体会局部方向和整体场之间的相互作用。", "方向知觉会被周围图案系统性拉偏。", true),
    page("Café Wall illusion", "理解砖块错位如何制造倾斜感。", "Café Wall illusion 中水平线因为黑白砖块错位和边缘对比而显得倾斜。读图时沿一条灰线看，它物理上接近水平，但视觉系统受邻近高对比边界影响。", "局部对比和排列会改变整体方向知觉。", true),
    page("Spiral illusion", "区分螺旋感和真实圆环。", "这类图常让同心圆看起来像螺旋。读图时跟随一条线追踪，会发现局部倾斜短线让整体产生旋转趋势。", "整体形状知觉会被局部方向线索误导。", true),
    page("Shape and Shading", "理解形状、亮度和照明的歧义。", "同一个视网膜图像可能来自不同 3D geometry、viewpoint、reflectance 和 illumination。视觉系统必须用世界假设来解释亮度和形状，因此阴影和光照会强烈影响知觉。", "明暗知觉本质上是在反推物体和光源。"),
    page("Checker shadow：A 与 B 的亮度", "理解亮度恒常性如何导致错觉。", "棋盘阴影图中 A 和 B 的物理亮度可能相同，但因为 B 被解释为处在阴影中，大脑把它知觉为更亮。读图时先看阴影和圆柱，再看方格关系。", "亮度知觉会根据照明假设进行校正。", true),
    page("阴影解释示例", "继续练习把亮度和光照分开。", "图中同样的局部灰度在不同阴影环境中会显得不同。视觉系统试图估计表面反射率，而不只是读取像素值。", "我们看到的是被解释后的表面颜色，而非原始光强。", true),
    page("Perceptual fill-in of surface brightness", "理解表面亮度填补。", "视觉系统会根据边界和周围信息填补表面亮度。读图时找边缘、渐变和区域边界，观察大脑如何把局部信息扩展成整个表面的明暗感。", "fill-in 说明视觉经验可以由边界推断出完整表面。", true),
    page("Relative depth from shading", "通过阴影判断凸起和凹陷。", "陨石坑或凹凸图的判断取决于默认光源方向。大脑通常假设光从上方来，因此相同图像旋转后会从凸起变成凹陷。", "阴影深度知觉依赖光源方向假设。", true),
    page("月球坑阴影示例", "把光源假设应用到真实纹理。", "黑白坑洞图展示阴影如何让表面看起来起伏。读图时先判断亮边和暗边，再推测光源方向。", "深度感来自阴影与光源假设的组合。", true),
    page("瓶子阴影示例", "理解 2D 亮度如何产生 3D 物体感。", "瓶子图利用高光和阴影制造立体感。即使没有触摸物体，大脑也能根据亮度梯度推断圆柱形和光源位置。", "形状知觉常由明暗梯度反推三维结构。", true),
    page("少女/老妇双稳态图", "理解 bistable perception。", "同一张图可以被看成少女或老妇。输入没有变，但解释会在两个稳定知觉之间切换。读者要体验的是知觉解释的竞争，而不是找唯一正确答案。", "双稳态图说明知觉有多个可行解释。", true),
    page("艺术图中的多重解释", "继续观察解释竞争。", "画作或人脸图会让视觉系统在不同对象解释之间切换。读图时问：哪些局部线条同时支持两个对象？", "多义图像展示局部特征如何服务不同整体解释。", true),
    page("脸/侧影双重图", "理解 figure-ground reversal。", "黑白轮廓可被看成脸或背景。关键是 figure 和 ground 的分配：一旦把黑色当主体，白色退为背景；反过来也成立。", "图底关系决定我们把哪些区域当对象。", true),
    page("Hysteresis", "理解知觉为何会粘住一种解释。", "hysteresis 指在双稳态场景中，知觉系统倾向于维持当前解释，而不是不停翻转。这样可以让世界看起来稳定，但也会让我们短时间内忽略另一种解释。", "知觉系统追求稳定，因此会保留当前解释。"),
    page("Rubin vase", "理解图底转换的经典例子。", "Rubin vase 可以看成白色花瓶，也可以看成两张黑色侧脸。物理边界相同，但归属给不同区域后，知觉对象完全不同。", "同一边界可属于不同对象，图底分配决定知觉。", true),
    page("群体图形与局部人物", "理解局部重复如何形成整体结构。", "大量局部人物或形状可组成更大的图案。读者要练习从局部元素切换到整体组织，这为 Gestalt principles 做铺垫。", "整体知觉可能超出局部元素本身。", true),
    page("Escher 图形", "看整体结构如何挑战局部一致性。", "Escher 风格图案常让局部形状合理，但整体组织产生循环或矛盾。它说明视觉系统会努力组织全局结构，即使结构在现实中不可能。", "局部合理不保证整体可实现。", true),
    page("Spinning lady", "理解运动方向的双稳态解释。", "旋转舞者可以被看成顺时针或逆时针，关键在于深度和身体前后面的解释不同。视频或动态图不能由静态图完全还原，但它说明运动知觉也会出现多解释竞争。", "运动知觉同样需要大脑选择解释。", true),
    page("Max Wertheimer and Gestalt psychology", "把错觉过渡到格式塔心理学。", "Wertheimer 强调 whole is more than the sum of parts。前面许多错觉已经说明，整体组织会改变局部元素的意义；这正是 Gestalt psychology 的核心。", "格式塔心理学研究整体组织原则。", true),
    page("Gestalt principles overview", "学习 proximity、similarity、closure 等组织原则。", "图中列出接近、相似、连续、闭合、共同命运等原则。读图时把每个小例子都问成：为什么这些元素被看成一组？", "格式塔原则解释视觉系统如何自动分组。", true),
    page("Induced motion", "理解周围运动如何改变目标运动感。", "当周围物体运动时，中央对象可能看起来在反方向移动。这个 induced motion 说明运动知觉使用相对参考框架，而不是只读取目标本身。", "运动知觉依赖目标和背景的关系。", true),
    page("Biological motion from random dots", "理解点光源如何产生人物知觉。", "少量移动点若符合人体关节运动规律，就能让人看出行走的人。这说明视觉系统对生物运动有高度解释性，会把动态点组织成有意义对象。", "生物运动知觉来自运动模式的整体组织。", true),
    page("Shadow motion demonstration", "用阴影和运动理解对象归属。", "静态截图只能保留演示入口；课堂动画可能展示阴影如何改变物体运动或位置解释。读者应回到主线：运动、阴影和背景都会影响对象知觉。", "动态图页要记录机制和限制，不能假装截图包含全部过程。", true),
    page("Induced self-motion", "理解视觉运动如何造成自身运动感。", "周围大范围视觉运动会让人感觉自己在移动，甚至导致 motion sickness。读图时把它联系到 peripheral retina 和视觉-前庭系统冲突。", "自我运动感依赖视觉环境和身体平衡信号的整合。", true),
    page("Impossible Figures", "理解局部特征与全局结构不相容。", "不可能图形在局部看似合理，但整体无法在三维空间中实现。读者要沿着每个连接追踪，找出局部规则何时与全局结构矛盾。", "视觉系统可以被局部一致性诱导出不可能整体。", true),
    page("Impossible columns", "练习发现局部-整体冲突。", "柱子图让上端和下端数量或连接关系不一致。读图时分段看会觉得合理，整体看才发现冲突。", "不可能图形暴露了局部解释和整体约束的矛盾。", true),
    page("Escher-Penrose stairs", "理解循环楼梯为什么不可能。", "Penrose stairs 每一段局部像是在上升或下降，但整体形成闭合循环，违反真实三维几何。它利用了透视和遮挡线索的局部合理性。", "全局结构检查能揭示局部透视造成的错觉。", true),
    page("Recursivity and Shepard Tone", "把视觉递归连接到听觉错觉。", "Shepard tone 给人持续上升或下降的感觉，却在物理上循环。它与 Penrose stairs 类似：局部变化暗示方向，整体却回到原处。", "感知错觉也可以跨模态出现，核心仍是局部线索和整体结构的关系。", true)
  ],
  lecture3b: [
    page("Gestalt Psychology：整体优先", "理解 Wertheimer 和 Gestalt 的核心主张。", "这页用倒置肖像说明整体组织的重要性。Gestalt 认为 whole is more than the sum of parts，反对把意识经验完全拆成孤立元素。注意课件中 Wertheimer 拼写和年份可能来自原页，笔记按原页保留但讲解以格式塔观点为主。", "格式塔心理学强调整体组织先于零散元素。", true),
    page("Whole is more than sum of parts", "用名言固定格式塔的学习核心。", "倒置人物图进一步说明：局部五官可能相同，但整体方向和组织改变后，知觉意义发生变化。读者要把这页与 Lecture 1a 的 structuralism 对比，理解为什么格式塔反对只分析元素。", "整体关系会改变局部元素的意义。", true),
    page("Fantz face preference experiment", "理解婴儿如何偏好有组织的人脸。", "图中正常脸和打乱脸用于研究婴儿视觉偏好。若新生儿更久看正常脸，说明人脸结构或有组织模式对早期知觉有特殊吸引力。", "模式组织能力可能很早就参与社会知觉。", true),
    page("Infant face perception development", "看婴儿对人脸图式的敏感性如何变化。", "多个月龄图展示婴儿如何逐渐对脸部配置更敏感。读者要注意，不只是单个眼睛鼻子重要，位置关系和整体配置同样重要。", "人脸知觉依赖整体配置和发展过程。", true),
    page("Dalí 双重图像", "体验同一图像中的多层意义。", "画中可见场景、人物和隐藏面孔等多重组织。读图时先看整体，再找局部如何组成另一层对象。这正是 pattern discovery：意义来自组织关系。", "一张图可以通过不同组织方式产生不同意义。", true),
    page("树脸错觉", "理解自然纹理中的对象发现。", "树干和枝叶可被组织成人脸。视觉系统擅长从复杂纹理中寻找熟悉模式，尤其是脸，这有助于快速社会识别，但也会产生过度发现。", "大脑会在自然纹理中主动寻找有意义模式。", true),
    page("All is vanity", "理解图底和尺度切换。", "近看可见梳妆人物，远看像骷髅。读图时切换局部细节和整体轮廓，体会同一图像如何在不同尺度上形成不同对象。", "pattern discovery 取决于观察尺度和图底分配。", true),
    page("How many people are hiding in this tree?", "训练从复杂图形中找隐藏人物。", "树形图要求读者在枝干和轮廓里寻找人脸或人物。重点不是答案数量，而是练习局部边界如何被重组为熟悉对象。", "知觉会把碎片组织成有意义的人物模式。", true),
    page("Perception is pattern discovery", "把前面图像归纳成概念框架。", "这一页明确说 perception 是 discovery、association 和 understanding of patterns。pattern 是 regularity，meaning 来自概念关联和新概念形成；categorization 则判断什么属于一类、什么不属于。", "知觉不仅识别刺激，还发现规律、意义和类别。"),
    page("Life-and-death perception", "理解模式发现的生存价值。", "悬崖或鸟类伪装图说明，能否快速发现隐藏对象可能关系到生存。知觉不是被动欣赏图片，而是帮助行动系统及时判断危险、猎物或道路。", "模式发现有实际行动和生存意义。", true),
    page("Pattern and camouflage", "理解 camouflage 如何利用知觉分组。", "动物伪装通过颜色、纹理和背景相似性打破对象边界。读图时先找背景规律，再找身体轮廓在哪里被隐藏。", "伪装利用了视觉系统依赖边界和相似性的弱点。", true),
    page("图形归纳题：颜色与对称", "把 pattern discovery 用到练习题。", "题图要求找出不符合规律的颜色点或对称关系。讲者备注提示某些答案与颜色互补或点位规则有关。做题时先找每组内部的变换规则，再检查哪个选项违反。", "模式题的关键是明确规则，而不是凭直觉猜。", true),
    page("图形归纳题：旋转与边界", "练习识别旋转、方向和局部边界规则。", "备注提示黑白边界按方向旋转。读者要逐格比较边缘位置和旋转方向，把视觉图形翻译成规则语言。", "视觉规律可以被写成方向、颜色和位置的变换。", true),
    page("图形归纳题：序列与字母", "把图形规律扩展到颜色序列和语言线索。", "停车位、颜色槽和莎士比亚字母题都要求寻找隐藏规则。备注中的答案提示颜色连续、窗口交替和字母来源。重点是把表面图案转成可说明的模式。", "归纳推理和知觉模式发现共享发现规律的能力。", true),
    page("What is a Category?", "理解类别不是总有充分必要条件。", "chair 例子说明类别边界常有模糊性：原型椅子有四条腿、座位和靠背，但轮椅、吧椅、懒人沙发仍可能被归为 chair。类别由许多 exemplars 和 family similarity 形成，不一定有严格真假边界。", "自然类别通常靠原型和相似性，而不是纯逻辑定义。", true),
    page("Pinker：family resemblance", "理解 family resemblance 和 heap paradox。", "vegetable 例子说明类别特征会切入 fruit 边界，边界不是绝对清楚。heap paradox 展示逐步变化如何让类别判断变模糊。connectionism 提示相似性判断更像网络权重计算，而不是一条逻辑规则。", "类别学习更像相似性网络，而不是硬性定义表。", true),
    page("Marr levels and connectionism", "把类别和模式发现放回计算框架。", "Marr 三层再次出现：computational level 问要分类什么，algorithmic level 问表征和学习规则，implementational level 问神经或机器硬件。PDP 和 connectionism 说明类别可以由连接权重学习出来。", "pattern、meaning 和 category 都可以放进 representation + computation 框架。", true),
    page("Perception: finding meaning", "用社会场景总结 perception 的目标。", "电梯场景看似日常，但知觉要做的不只是识别人和物，还要理解正在发生什么、谁在互动、情境意味着什么。它总结本讲：perception 最终是从输入中找到 meaning。", "知觉的终点不是图像，而是可行动、可理解的意义。", true)
  ]
};

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
  const teaching = teachingPages[spec.key]?.[slide.number - 1];
  if (teaching) return teaching.visual;
  if (!slide.text.length) return true;
  if (slide.text.length <= 4) return true;
  if (slide.embeddedMedia.length) return true;
  if (["lecture3a", "lecture3b"].includes(spec.key)) return true;
  return false;
}

function buildMarkdown(spec, material, assetsByPage) {
  const sections = material.slides.map((slide) => {
    const teaching = teachingPages[spec.key]?.[slide.number - 1];
    const title = teaching?.title || titleFor(spec, slide);
    const asset = assetsByPage.get(slide.number);
    const needsImage = teaching?.visual ?? shouldInlineImage(spec, slide);
    const inlineImage = needsImage
      ? `\n\n![${safeAlt(`${material.sourceFile}，第${slide.number}页：${title}`)}](/api/media/${asset.id})\n\n*原课件：${safeAlt(material.sourceFile)}，第${slide.number}页；用于核对“${safeAlt(title)}”。*\n\n${readHint(spec, title, slide.number)}`
      : "";
    return `### 第${slide.number}页｜${title}

**学习目标：** ${teaching?.goal || inferRole(spec, slide.number, material.slideCount)}

**带读者讲解：** ${teaching?.teach || explanationFor(spec, slide, title, slide.number, material.slideCount)}

**本页结论：** ${teaching?.takeaway || "把本页放回本讲主线，明确它提供的概念、例子或图示证据。"}

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
  const teaching = teachingPages[spec.key];
  if (teaching && teaching.length !== material.slideCount) {
    throw new Error(`${spec.key}: teaching pages ${teaching.length} != slides ${material.slideCount}`);
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
