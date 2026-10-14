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
const reviewRoot = path.join(root, "data", "aie2001-memory-review");
const userId = "_9hLO-wve3Rp84FB21L0x";
const courseCode = "AIE2001";
const appendixMarker = "\n<!-- courseware-appendix -->\n";
const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false, trimValues: false });

const sources = [
  {
    key: "lecture4a",
    sourcePath: "D:/Win_Data/Downloads/Lecture 4a Memory system(1).pptx",
    renderedDir: path.join(reviewRoot, "lecture4a", "pages"),
    lessonTitle: "Lecture 4a：记忆系统",
    lessonSubtitle: "Memory systems, working memory and long-term memory",
    noteTitle: "Lecture 4a Memory System 逐页详解",
    accent: "teal",
    icon: "function",
    framework: "本讲把 memory 拆成三个连续过程和三类系统：encoding/acquisition、storage/maintenance、retrieval/access 说明信息如何进入、保持和取出；sensory memory、working memory、long-term memory 说明信息在时间尺度和加工方式上的差异；declarative、nondeclarative、semantic、episodic 等分类说明长期记忆并不是一个单一仓库。",
    review: "复习时先画出“感觉记忆到工作记忆到长期记忆”的流向，再把 Baddeley 工作记忆模型、chunking、serial position effect、levels of processing 和长期记忆分类放回同一张图。重点不是背图名，而是解释每个实验或例子证明了记忆系统的哪一层性质。",
    pages: [
      ["Weekly Plan", "本页给出本讲路线：先讲 memory，再分 sensory memory、short-term or working memory、long-term memory；随后进入 amnesia、retrograde amnesia、anterograde amnesia 和 Seven Sins of Memory。它是 Lecture 4a 和 4b 的共同地图，提醒我们记忆既有正常系统，也有损伤和错误。", false],
      ["2026 Nobel Prize in Physiology or Medicine", "课件用 optogenetics 的获奖说法作为入口，把神经科学技术与记忆研究联系起来。复习时应把它当作课件记录，重点理解光遗传学如何用光控制神经活动，而不要把未核实的获奖年份当成考试外事实扩写。", true],
      ["大脑、人工智能与记忆问题", "本页用人脑和电路脑的对照引出核心问题：生物记忆能否被计算系统模拟。它不是在证明大脑等于电脑，而是在提醒记忆研究会同时涉及神经机制、信息表示和人工系统类比。", true],
      ["脑结构与计算电路类比", "两张脑图把真实神经组织和电路化大脑并列。读这一页时要区分“类比”与“机制”：电路图帮助理解信息加工，但真实记忆还依赖突触可塑性、海马和皮层网络。", true],
      ["Immortality and Mind Upload", "Mind upload 是思想实验：如果把心智信息复制到机器，是否等于延续个人身份。它服务于记忆主题，因为记忆常被看作自我连续性的基础，但课件并没有证明上传可行。", true],
      ["科技媒体中的心智上传想象", "本页继续用媒体图像展示数字不朽或脑上传的社会想象。复习时应把它作为问题背景：保存信息、复制行为和保留同一个自我，是三件不同的事。", true],
      ["Three key sequential processes in memory", "本页定义记忆的三个连续过程：encoding/acquisition 把经验转为可用表征，storage/maintenance 维持信息，retrieval/access 在需要时取出。任何一个环节失败，都可能表现为“忘记”。", false],
      ["Types of Memory", "本页总览 sensory memory、short-term memory 和 long-term memory。三者主要区别在保持时间、容量、编码方式和是否需要注意或复述进入下一阶段。", true],
      ["多存储模型", "图示环境输入先进入 sensory memory，经 attention 到 working memory，再通过 encoding 进入 long-term memory；retrieval 又把长期信息带回当前加工。它是本讲最核心的结构图。", true],
      ["Sensory Memory", "Sensory memory 保留原感觉模态和质量，视觉通常只能维持数百毫秒，听觉可维持数秒。它解释为什么短暂刺激消失后，我们仍能短时间利用残留感觉痕迹。", true],
      ["Grounding with your five senses", "五感 grounding exercise 要求依次注意看到、触到、听到、闻到和尝到的信息。它把 sensory memory 与注意训练连接起来，说明感觉输入可以帮助人回到当下任务。", true],
      ["Meditation and Grounding Exercise", "本页用冥想图表示把多种感官线索组织成注意练习。复习时把它看作应用例子：感觉记忆提供原始输入，注意决定哪些输入继续进入工作记忆。", true],
      ["Examples of Absolute Thresholds", "表格列出视觉、听觉、嗅觉、味觉、触觉的绝对阈限例子。absolute threshold 指在特定条件下刚能被觉察的最小刺激强度，不能脱离环境条件机械比较。", true],
      ["Context and sensory memory", "hi-jack 的声音片段需要上下文和长期记忆才能解释。它说明短暂感觉痕迹本身不足以确定意义，大脑会用背景知识来消除歧义。", true],
      ["Short-term memory is working memory", "本页把 short-term memory 强调为当前思考的 workspace。工作记忆不是被动仓库，而是在保持信息的同时进行操作、选择和更新。", true],
      ["Components of short-term memory", "图中 central executive 协调 phonological loop 和 visuospatial sketchpad。语音材料、空间图像和任务控制可以分工，但实际任务通常需要它们互相配合。", true],
      ["Baddeley working memory model", "Baddeley 模型把工作记忆分为 phonological loop、visuospatial sketchpad 和 executive control system。复习时要能说明每个子系统处理什么信息，以及 central executive 如何分配注意。", true],
      ["Short-term memory and long-term memory", "表格比较短期和长期记忆：短期容量约 7±2 items、持续 18 到 30 秒、主要按声音编码；长期记忆容量近似无限、持续可达终身、更多按意义编码。", true],
      ["Digit Span", "Digit span 用逐渐变长的数字串测量短期保持能力。成绩会受复述、chunking、熟悉组合和注意状态影响，所以它测的不是纯粹“容量数字”。", true],
      ["Working memory exercises", "迷宫和视觉搜索练习要求在干扰中保持目标、路线或规则。它们展示 working memory 与 attention、策略选择和视觉空间加工的关系。", true],
      ["Dual Tasking", "双任务页面提示：如果两个任务争用同一工作记忆资源，表现会下降。复习时要能解释任务干扰来自容量限制、注意分配还是编码通道冲突。", true],
      ["Chunking", "Chunking 把多个小单位组织成有意义的信息块，如 GPS、FBI、USA。工作记忆限制常针对 chunks 而非单个字符，所以知识背景会改变有效容量。", false],
      ["Serial Position Effect", "serial position effect 表现为列表开头和结尾更容易回忆。primacy effect 更依赖复述和长期编码，recency effect 更依赖短时保持。", true],
      ["Level of Processing", "levels of processing 说明编码深度影响长期记忆。只看大小写属于浅层加工，判断押韵更深一些，判断句子意义通常产生更好记忆。", false],
      ["Memory flow model review", "本页再次呈现感觉、工作和长期记忆的流程，用于把前面的 serial position、chunking 和 levels of processing 放回统一模型。重复页也要保留，因为它承担阶段总结作用。", true],
      ["Declarative and nondeclarative memory", "长期记忆可分 declarative memory 和 nondeclarative memory。前者可以有意识说出，后者通过技能、习惯、条件作用或启动表现出来。", true],
      ["Long-term memory hierarchy", "图把长期记忆分为 declarative 和 nondeclarative，并继续分出 semantic、episodic、procedural 等类型。考试常要求按层级分类而不是只背名称。", true],
      ["Knowing how and knowing that", "骑车代表 procedural knowing how，事实知识和个人经历属于 declarative knowing that。这个区分为 H.M. 等病例中“会做但说不出经历”的现象做铺垫。", true],
      ["Nondeclarative memory", "非陈述性记忆包括技能习惯、经典条件作用和情绪反应等。它们可以在没有清晰主观回忆的情况下改变行为。", true],
      ["Semantic vs Episodic Memory", "semantic memory 保存一般知识，episodic memory 保存带时间、地点和自我经历的事件。二者都属于陈述性记忆，但检索线索和主观体验不同。", true],
      ["Coin recognition memory", "硬币图用于说明熟悉不等于能准确回忆细节。我们每天见到硬币，却未必能正确识别图案方向和细节，说明注意和编码深度很重要。", true],
      ["Semantic network", "语义网络用节点和关系表示概念知识。激活可以沿关联扩散，解释为什么相关词或类别更容易相互提示。", true],
      ["Hierarchical Semantic Network", "Collins and Quillian 的层级网络把概念放在上位与下位关系中，如 animal、bird、canary。层级结构可以节省存储，但真实语义关系也包含典型性和经验频率。", true],
      ["Associative semantic network", "本页用 car、vehicle、street、flower 等节点展示联想网络。它说明语义记忆不只按严格分类组织，也按生活经验和关系强度连接。", true],
      ["Memorize a list of words", "医疗相关词表会诱发主题化编码，也可能导致对未出现主题词的错误回忆。它为后续 reconstructive memory 和 memory errors 铺垫。", false],
      ["Inside Out and memory imagery", "电影图像把记忆表现成可视化档案。它适合帮助理解情景记忆和情绪记忆的联系，但不能当作真实神经机制图。", true],
      ["Episodic Memory", "Inside Out 的场景用于说明 episodic memory 的主观重体验特点。情景记忆不是只保存事实，还保存“我在何时何地经历了什么”的自我线索。", true],
      ["Train of thoughts and heuristics", "本页用动画场景引出 train of thought 和 heuristic。它提醒我们记忆检索常沿联想捷径推进，因此高效但也可能产生偏差。", true]
    ]
  },
  {
    key: "lecture4b",
    sourcePath: "D:/Win_Data/Downloads/Lecture 4b Amnesia(1).pptx",
    renderedDir: path.join(reviewRoot, "lecture4b", "pages"),
    lessonTitle: "Lecture 4b：失忆症与记忆错误",
    lessonSubtitle: "Amnesia, H.M., memory errors and neural basis",
    noteTitle: "Lecture 4b Amnesia 逐页详解",
    accent: "rose",
    icon: "atom",
    framework: "本讲从复习题进入 amnesia：retrograde amnesia 影响发病前记忆，anterograde amnesia 影响新长期记忆形成。H.M. 病例说明记忆系统可以分离，技能学习、priming 和 Tower of Hanoi 等任务展示非陈述性学习可在陈述性记忆受损时保留。最后的 Seven Sins of Memory 和 neural basis 把记忆错误、海马、皮层、基底节、place cells 与 Hebbian learning 连接起来。",
    review: "复习时用时间轴区分 retrograde 和 anterograde，再用 H.M. 解释 declarative memory、procedural learning 和 priming 的分离。Seven Sins 要能给定义和例子；神经基础部分要能说明 cortex、hippocampus、basal ganglia 和突触连接强度分别承担什么角色。",
    pages: [
      ["Five senses sample question", "本页是感官复习题，要求判断关于五感的唯一正确说法。它把 Lecture 3 的 sensation/perception 与本讲 memory 连接起来：感觉输入先被觉察，之后才可能被注意和编码。", false],
      ["Inductive reasoning sample question", "本页复习归纳推理，要求识别哪类问题不属于 inductive reasoning。它提醒考试常把前面 reasoning 内容与后面记忆内容混合考察。", true],
      ["Brain memory illustration", "图像用人物和脑结构表现记忆被记录或读取的想象。它是进入 amnesia 与记忆解码主题的视觉过渡，不是实验结果。", true],
      ["Total Recall", "Total Recall 电影图像引出“完全回忆”想象。课件借科幻问题反衬真实记忆：人类记忆会选择、重构和遗忘，并非完整录像。", true],
      ["Memory decoder", "头部图显示 hippocampus、multielectrode array 和 memory decoder。复习时应把它理解为记忆神经编码的示意，而不是说目前可以完整读取个人经历。", true],
      ["Singularity", "Ray Kurzweil 与书封引出技术奇点和人机融合设想。本页属于未来想象背景，帮助提出记忆上传问题，但不等同于已证实的认知科学结论。", true],
      ["Memory model review", "本页再次呈现 sensory、working 和 long-term memory 流程，为解释失忆症定位受损环节。amnesia 通常不是所有记忆同时消失，而是某些编码或检索系统受损。", true],
      ["Amnesia overview", "时间轴把过去、现在和未来分开：retrograde amnesia 指病前记忆受损，anterograde amnesia 指病后难以形成新长期记忆。这个页是本讲核心分类图。", true],
      ["Symptoms of Retrograde Amnesia", "本页列出逆行性失忆症状，如忘记事故前事件、保留部分旧技能、童年记忆可能相对保留。复习时注意症状范围会因病因和损伤部位而不同。", true],
      ["Confabulation", "confabulation 指在缺乏真实记忆时产生看似合理的虚构叙述。它通常不是故意撒谎，而与来源监控和记忆填补有关。", true],
      ["Autobiographic Memory", "Nostalgia 和自传式记忆图像强调个人记忆与自我身份的关系。失忆影响的不只是信息，还会影响个人经历连续性的感受。", true],
      ["Anterograde amnesia storyboard", "漫画展示新事件难以稳定进入长期记忆，患者可能忘记刚刚发生的对话或重复询问。它说明 anterograde amnesia 的核心是新长期记忆形成受阻。", true],
      ["The Story of H.M.", "H.M. 故事板介绍手术和术后记忆问题。该病例成为记忆研究关键证据，因为它把 medial temporal lobe 与新陈述性记忆形成联系起来。", true],
      ["Brain and memory technology image", "本页用脑图和科技视觉继续连接神经机制与记忆读取。它是过渡页，提示我们从病例叙事转向脑区和机制。", true],
      ["Memory reconstruction image", "图像表现受伤或机械化大脑，帮助引出脑损伤后记忆改变。复习时不要把艺术图当解剖图，而要抓住“结构改变导致功能改变”的主题。", true],
      ["Robot Brain and memory analogy", "Robot Brain 图像把“机器记忆”和生物脑做类比。类比帮助提出问题，但 H.M. 等病例才是支持记忆系统分离的关键证据。", true],
      ["Patient H.M. documentary", "纪录片页面提示 H.M. 个案有访谈和影像资料。静态截图不能替代视频内容，笔记只保留它作为病例材料入口。", true],
      ["A book on Patient H.M.", "书籍页面表明 H.M. 病例有详细文献叙述。复习时需要记住病例结论，而不是把所有传记细节都当考试重点。", true],
      ["News clip of H.M.", "新闻片段页继续提供病例视频入口。视频中的声音和时间线无法由截图完整还原，所以考试若涉及片段细节需回到原课件播放。", true],
      ["H.M. story storyboard one", "漫画继续展示 H.M. 能进行短时交流，却难以把新事件保存为持久陈述性记忆。它支持工作记忆和长期记忆可分离。", true],
      ["H.M. story storyboard two", "本页进一步展示日常情境中的记忆失败。读图时注意患者可能理解当下任务，但事后无法形成情景记忆。", true],
      ["Preserved skill learning", "镜像描画数据表明遗忘症患者多日练习后错误减少，虽然不记得练习经历。它说明 procedural learning 可在陈述性记忆受损时保留。", true],
      ["Priming", "MEM--- 词干补全展示 priming：近期接触过的词会更容易被补出，即使患者没有有意识回忆。它属于非陈述性记忆证据。", false],
      ["Tower of Hanoi skill learning", "河内塔任务要求遵守移动规则并逐步形成解题技能。遗忘症患者可以改进表现，说明问题解决程序也能在缺少情景记忆时学习。", true],
      ["Amnesic patient video", "视频页呈现失忆患者访谈或病例记录。静态截图只能说明本页有病例材料，不能还原语音、反应时间和完整行为。", true],
      ["Daniel Schacter's Seven Sins of Memory", "Schacter 将记忆错误分为 transience、absent-mindedness、blocking、misattribution、suggestibility、bias、persistence。它们不是单一“记忆差”，而是不同环节的错误。", false],
      ["Seven Sins of Memory icons", "图标把七种记忆错误压缩成复习地图。考试需要能把名称、定义和例子配对，而不是只识别图标。", true],
      ["Neural Basis of Memory", "本页总结记忆神经基础：cortex 分布式存储旧记忆，hippocampus 形成新关联，basal ganglia 支持新技能和习惯；学习会改变突触连接效能。", false],
      ["Brain lobe map review", "脑叶图帮助把记忆相关结构放回大脑地图。它不是说所有记忆只在某一叶，而是提醒皮层、海马和基底节都参与不同记忆功能。", true],
      ["Two Kinds of Amnesia", "本页明确区分 retrograde amnesia 和 anterograde amnesia，并提醒 amnesia 要与 dementia 区分。前者是选择性记忆障碍，后者涉及更广泛认知功能下降。", true],
      ["Brain lobes and sensory areas", "彩色脑图复习 frontal、parietal、temporal、occipital lobes、motor area、somatosensory area、visual area 和 auditory area，为理解记忆网络提供宏观定位。", true],
      ["Biological brain building blocks mimicked by silicon", "本页从 neuronal level、synaptic level 到 neural network level 比较生物脑和硅基系统。它把动作电位、突触学习和网络分类联系到人工系统，但不能把类比当同一机制。", true],
      ["Place cells", "place cells 在特定空间位置放电，支持认知地图和空间记忆。海马和内嗅皮层网络说明记忆不仅保存事实，也保存空间关系。", true],
      ["Hebb's Learning Rule", "Hebb 学习规则说明：如果 A 反复参与激活 B，A 到 B 的连接会增强。它用突触效能改变解释联结如何形成，是记忆神经机制的重要原则。", true]
    ]
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

function usefulLines(slide) {
  const lines = [...slide.text, ...slide.notes.map((line) => `讲者备注：${line}`)]
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line, index, all) => all.indexOf(line) === index);
  return lines.slice(0, 10);
}

function sourceBullets(slide) {
  const lines = usefulLines(slide);
  if (!lines.length) return "- 本页文字提取为空或主要由图片、视频画面构成；已保留完整原页按钮和附录图，复习时需要目视核对原图。";
  return lines.map((line) => `- ${line}`).join("\n");
}

function readHint(page, sectionName) {
  if (!page.visual) {
    return "";
  }
  return `读图提示：先确认标题和主要对象，再按图中的箭头、分类层级、表格列或病例时间顺序阅读；本图服务于“${sectionName}”中的“${page.title}”，用于核对课件原始例子、图表关系和正文解释是否一致。`;
}

function buildAppendix(spec, material, assetsByPage) {
  const pages = material.slides.map((slide) => {
    const asset = assetsByPage.get(slide.number);
    const text = slide.text.length ? `~~~text\n${slide.text.join("\n")}\n~~~` : "本页无可提取文字，请以完整幻灯片图为准。";
    const notes = slide.notes.length ? `\n\n讲者备注（课件原文）：\n\n~~~text\n${slide.notes.join("\n")}\n~~~` : "";
    const media = slide.embeddedMedia.length ? `\n\n媒体说明：本页嵌入 ${[...new Set(slide.embeddedMedia)].join("、")}；附录保存静态画面，音频、视频与动画过程无法由截图完整还原。` : "";
    return `### 第 ${slide.number} 页\n\n${text}${notes}${media}\n\n![${safeAlt(`${material.sourceFile} 第${slide.number}页完整幻灯片`)}](/api/media/${asset.id})`;
  }).join("\n\n");
  return `${appendixMarker.trimStart()}\n\n## 逐页课件核对\n\n来源：${safeAlt(material.sourceFile)}，共 ${material.slideCount} 页。以下按原顺序保存每页可提取文字、讲者备注、媒体提示和完整幻灯片图；正文每个页标题右侧的原课件按钮由这里的同页原图生成。PPT 动画构建顺序、视频和音频不能由静态截图完整还原。\n\n${pages}`;
}

function buildMarkdown(spec, material, assetsByPage) {
  const sourceFile = material.sourceFile;
  const pageSections = spec.pages.map(([title, explanation, visual], index) => {
    const page = { number: index + 1, title, explanation, visual };
    const slide = material.slides[index];
    const asset = assetsByPage.get(page.number);
    const mediaBoundary = slide.embeddedMedia.length
      ? "\n\n**媒体边界：** 本页包含嵌入式音频或视频。下图和原页按钮只能保存静态画面，不能替代播放内容；涉及媒体细节时应回到原文件或课堂说明。"
      : "";
    const imageBlock = page.visual
      ? `\n\n![${safeAlt(`${sourceFile}，第${page.number}页：${page.title}`)}](/api/media/${asset.id})\n\n*原课件：${safeAlt(sourceFile)}，第${page.number}页；用于核对“${safeAlt(page.title)}”。*\n\n${readHint(page, spec.lessonTitle)}`
      : "";
    return `### 第${page.number}页｜${page.title}

**本页定位：** 本页属于 ${spec.lessonTitle}，用于建立“${page.title}”这一知识点在本讲中的位置。

**逐页讲解：** ${explanation}

**原页关键内容：**
${sourceBullets(slide)}${mediaBoundary}${imageBlock}`;
  }).join("\n\n");

  const inlineFigures = spec.pages.filter((page) => page[2]).length;
  const coverage = `## 逐页覆盖核对

本笔记已按当前课件整理规则覆盖 ${material.slideCount} 页：正文从第1页到第${material.slideCount}页连续建立独立小节；每页都说明实际内容、复习作用和与本讲主线的关系；每个正文页标题右侧均可通过“查看该页原课件”按钮打开对应完整幻灯片。正文另选 ${inlineFigures} 张关键图、题图、病例图、分类图或媒体画面，紧邻对应页讲解并配有“读图提示”；完整${material.slideCount}页原图与提取文字保留在下方逐页课件核对附录中。`;

  const body = `# ${spec.noteTitle}

## 概念框架

${spec.framework}

## 逐页详细讲解

${pageSections}

## 本讲联系与复习

${spec.review}

${coverage}`;
  return `${body.trim()}\n\n${buildAppendix(spec, material, assetsByPage)}`;
}

function flashcards(spec) {
  const cards = spec.key === "lecture4a"
    ? [
      ["记忆的三个连续过程是什么？", "encoding/acquisition、storage/maintenance、retrieval/access。"],
      ["sensory memory 的特点？", "保留原感觉模态，持续很短，视觉通常数百毫秒，听觉可持续数秒。"],
      ["working memory 与 short-term memory 的关系？", "课件把短期记忆强调为当前思考和操作信息的 workspace。"],
      ["Baddeley 工作记忆模型包含什么？", "phonological loop、visuospatial sketchpad 和 central executive。"],
      ["chunking 为什么能提高记忆表现？", "它把多个小单位压缩成有意义的信息块，减少工作记忆负担。"],
      ["semantic memory 与 episodic memory 的区别？", "semantic 保存一般知识，episodic 保存带时间地点和自我经历的事件。"]
    ]
    : [
      ["retrograde amnesia 是什么？", "发病前记忆受损，常以事故或疾病发生时间为分界。"],
      ["anterograde amnesia 是什么？", "发病后难以形成新的长期记忆。"],
      ["H.M. 病例说明什么？", "新陈述性记忆可严重受损，但工作记忆、技能学习和启动可部分保留。"],
      ["confabulation 是什么？", "缺乏真实记忆时产生看似合理的虚构叙述，通常不是故意撒谎。"],
      ["Schacter 的 Seven Sins 包括什么？", "transience、absent-mindedness、blocking、misattribution、suggestibility、bias、persistence。"],
      ["Hebb 学习规则的核心？", "反复共同激活会增强神经元之间的连接。"]
    ];
  return cards.map(([front, back], index) => ({ id: nanoid(), front, back, difficulty: index < 2 ? "easy" : "medium" }));
}

function mindMap(spec) {
  const labels = spec.key === "lecture4a"
    ? ["记忆过程", "sensory memory", "working memory", "chunking", "long-term memory", "semantic/episodic"]
    : ["amnesia", "H.M.", "preserved learning", "Seven Sins", "neural basis", "Hebbian learning"];
  return [{ id: nanoid(), label: spec.lessonTitle, children: labels.map((label) => ({ id: nanoid(), label })) }];
}

function protectedView(db, targetCourseId) {
  const targetNoteIds = new Set(db.notes.filter((item) => item.courseId === targetCourseId).map((item) => item.id));
  return {
    users: db.users,
    preferences: db.preferences,
    passwordResets: db.passwordResets,
    courses: db.courses,
    lessons: db.lessons.filter((item) => item.courseId !== targetCourseId),
    notes: db.notes.filter((item) => item.courseId !== targetCourseId),
    mediaAssets: db.mediaAssets.filter((item) => !targetNoteIds.has(item.noteId))
  };
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

const baseline = JSON.parse(await fs.readFile(dbPath, "utf8"));
const course = baseline.courses.find((item) => item.userId === userId && item.code === courseCode);
if (!course) throw new Error("AIE2001 course not found");

const materials = new Map();
for (const spec of sources) {
  const material = await extractPptx(spec);
  if (material.slideCount !== spec.pages.length) {
    throw new Error(`${spec.key}: authored pages ${spec.pages.length} != slides ${material.slideCount}`);
  }
  const files = await fs.readdir(spec.renderedDir);
  const rendered = files.filter((file) => /^slide-\d{3}\.png$/.test(file)).sort();
  if (rendered.length !== material.slideCount) {
    throw new Error(`${spec.key}: rendered pages ${rendered.length} != slides ${material.slideCount}`);
  }
  const specDir = path.join(reviewRoot, spec.key);
  await fs.mkdir(specDir, { recursive: true });
  await fs.writeFile(path.join(specDir, "materials.json"), JSON.stringify(material, null, 2), "utf8");
  materials.set(spec.key, material);
}

const now = new Date().toISOString();
const backupDir = path.join(backupRoot, `aie2001-memory-import-${now.replace(/[:.]/g, "-")}`);
await fs.mkdir(backupDir, { recursive: true });
await fs.writeFile(path.join(backupDir, "app-db.json"), JSON.stringify(baseline, null, 2), "utf8");
await fs.mkdir(mediaDir, { recursive: true });

const next = structuredClone(baseline);
const createdFiles = [];

try {
  const afterLesson = next.lessons.find((item) => item.courseId === course.id && item.title.includes("Lecture 3b"));
  if (!afterLesson) throw new Error("Could not locate Lecture 3b insertion point");
  const insertionOrder = afterLesson.order + 1;
  const newLessonTitles = new Set(sources.map((spec) => spec.lessonTitle));
  next.lessons = next.lessons.filter((lesson) => {
    if (!newLessonTitles.has(lesson.title) || lesson.courseId !== course.id || lesson.userId !== userId) return true;
    const noteIds = new Set(next.notes.filter((note) => note.lessonId === lesson.id).map((note) => note.id));
    next.notes = next.notes.filter((note) => !noteIds.has(note.id));
    const removedAssets = next.mediaAssets.filter((asset) => noteIds.has(asset.noteId));
    next.mediaAssets = next.mediaAssets.filter((asset) => !noteIds.has(asset.noteId));
    for (const asset of removedAssets) {
      fs.rm(path.join(mediaDir, asset.storageName), { force: true }).catch(() => undefined);
    }
    return false;
  });

  next.lessons
    .filter((lesson) => lesson.courseId === course.id && lesson.userId === userId && lesson.order >= insertionOrder)
    .forEach((lesson) => { lesson.order += sources.length; });

  const summaries = [];
  for (const [index, spec] of sources.entries()) {
    const material = materials.get(spec.key);
    const lessonId = nanoid();
    const noteId = nanoid();
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
        noteId,
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

    const note = {
      id: noteId,
      userId,
      courseId: course.id,
      lessonId,
      title: spec.noteTitle,
      sourceType: "file",
      sourceText: material.slides.map((slide) => `### 幻灯片 ${slide.number}\n${slide.text.join("\n") || "（无可提取文字）"}${slide.notes.length ? `\n讲者备注：\n${slide.notes.join("\n")}` : ""}`).join("\n\n"),
      contentMarkdown: buildMarkdown(spec, material, assetsByPage),
      summary: `${spec.lessonTitle} 已按新规则整理：${material.slideCount}页逐页讲解，每页标题右侧可打开对应原课件，正文保留关键图表与读图提示。`,
      flashcards: flashcards(spec),
      mindMap: mindMap(spec),
      createdAt: now,
      updatedAt: now
    };
    const lesson = {
      id: lessonId,
      userId,
      courseId: course.id,
      title: spec.lessonTitle,
      subtitle: spec.lessonSubtitle,
      order: insertionOrder + index,
      icon: spec.icon,
      accent: spec.accent,
      createdAt: now
    };
    next.lessons.push(lesson);
    next.notes.unshift(note);
    summaries.push({
      key: spec.key,
      lessonId,
      noteId,
      slides: material.slideCount,
      assets: material.slideCount,
      sourceFile: material.sourceFile,
      mediaSlides: material.slides.filter((slide) => slide.embeddedMedia.length).map((slide) => slide.number),
      ...validateNote(next, note, material.slideCount)
    });
  }

  const protectedBefore = digest(protectedView(baseline, course.id));
  const protectedAfter = digest(protectedView(next, course.id));
  if (protectedBefore !== protectedAfter) {
    throw new Error("Non-AIE2001 records changed unexpectedly");
  }

  const tmp = `${dbPath}.${now.replace(/[:.]/g, "-")}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(next, null, 2), "utf8");
  await fs.rename(tmp, dbPath);

  const report = {
    importedAt: now,
    userId,
    courseId: course.id,
    backupDir,
    insertionAfterLessonId: afterLesson.id,
    notes: summaries,
    protectedHash: protectedAfter
  };
  await fs.writeFile(path.join(reviewRoot, "import-report.json"), JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  await Promise.all(createdFiles.map((file) => fs.rm(file, { force: true }).catch(() => undefined)));
  throw error;
}
