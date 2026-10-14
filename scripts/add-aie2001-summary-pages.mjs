import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

const root = process.cwd();
const dbPath = path.join(root, "data", "app-db.json");
const backupRoot = path.join(root, "data", "backups");
const userId = "_9hLO-wve3Rp84FB21L0x";
const courseCode = "AIE2001";
const startMarker = "<!-- aie2001-summary-page -->";
const endMarker = "<!-- /aie2001-summary-page -->";

const digest = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

const summaries = {
  "感知与认知基础速成": `## 总结页｜AIE2001 前四讲总地图

这篇速成笔记先把 AIE2001 的主线压成一张学习地图：课程不是把心理学、神经科学和人工智能分开背，而是反复追问同一个问题：心智如何表示信息、如何计算、又由什么神经机制实现。

| 学习模块 | 这部分要回答的问题 | 核心关键词 | 读法 |
| --- | --- | --- | --- |
| 认知科学入口 | mind 能不能被科学研究 | cognition, cognitive science, Gardner hexagon | 先看研究对象，再看六大学科各自贡献 |
| 理性与推理 | 什么叫合理地使用知识达成目标 | rationality, deduction, induction, Wason task | 先分清规范模型和真实表现 |
| 神经实现 | 心智活动靠哪些脑结构和神经信号承载 | CNS/PNS, cortex, neuron, synapse | 从系统到细胞逐层下降 |
| 感觉与知觉 | 外界刺激如何变成有意义经验 | sensation, perception, transduction | 区分输入、转导和解释 |
| 错觉与模式 | 为什么看见不等于真实复制 | top-down, bottom-up, Gestalt, category | 用错觉反推正常知觉机制 |
| 记忆系统 | 信息如何编码、保持和提取 | sensory memory, working memory, long-term memory | 把实验结果放回流程图 |

### 一句话框架

认知科学的核心不是“人有什么心理现象”，而是解释这些现象背后的 **representation + computation + neural implementation**。

### 复习顺序

1. 先用 Lecture 1a 建立学科地图和心理学流派。
2. 再用 Lecture 1b 理解 rationality 和 reasoning。
3. 用 Lecture 2a/2b 把心智活动落到神经系统、神经元和感觉转导。
4. 用 Lecture 3a/3b 理解知觉为什么是推断和模式发现。
5. 最后用 Lecture 4a/4b 把 memory 系统、失忆症和记忆错误接上前面的神经基础。`,

  "Lecture 1a：认知科学与心理学流派": `## 总结页｜Lecture 1a 学习地图

本讲的作用是给整门课建立入口：先说明 cognitive science 研究什么，再比较早期心理学流派如何选择研究对象和方法，最后过渡到 Marr 三层与当代计算认知科学。

| 部分 | 关键问题 | 代表人物/框架 | 要记住的区别 |
| --- | --- | --- | --- |
| Cognitive science | mind 如何被跨学科研究 | Gardner hexagon | 心理学、神经科学、语言学、哲学、人类学、AI 从不同层面研究同一个 mind |
| Structuralism | 意识由什么基本元素组成 | Wundt, Titchener | 依赖 analytic introspection，问题是主观且难复现 |
| Functionalism | 意识有什么功能 | William James | 意识是 continuous stream，重点是适应和用途 |
| Behaviorism | 心理学能否只研究可观察行为 | Watson, Skinner | 用 observable behavior 和 operation definition 换取客观性 |
| Psychoanalysis | 无意识如何影响行为 | Freud | 行为可受 unconscious motives 和 conflicts 影响 |
| Contemporary view | 如何把心智变成可计算问题 | Marr, PDP, connectionism | 分 computational、algorithmic、implementational 三层 |

### 本讲最重要的对比

| 流派 | 研究对象 | 方法倾向 | 局限 |
| --- | --- | --- | --- |
| Structuralism | 意识元素 | 内省 | 主观、复现困难 |
| Functionalism | 意识功能 | 适应与目的分析 | 不一定给出精确机制 |
| Behaviorism | 可观察行为 | 刺激-反应、操作定义 | 排除了主观经验 |
| Psychoanalysis | 无意识 | 临床解释 | 实验证据较难标准化 |
| Gestalt | 整体组织 | 图形与知觉原则 | 更偏现象解释 |

### 读这一讲时要带着的问题

这一讲不是人物史，而是在比较“心理学应该研究什么证据”。后面讲知觉、记忆和推理时，都可以回到这个问题：我们是在解释主观经验、可观察行为、神经机制，还是计算目标？`,

  "Lecture 1b：理性、逻辑与推理": `## 总结页｜Lecture 1b 学习地图

本讲从 rationality 进入 reasoning。核心不是背逻辑名词，而是理解智能体怎样用知识达成目标，以及为什么人类真实推理会受语境、经验和证据诊断性影响。

| 主题 | 要回答的问题 | 核心词 | 学习重点 |
| --- | --- | --- | --- |
| Rationality | 什么叫理性 | knowledge, goal, normative model | 理性是用知识达成目标，不只是“聪明” |
| Descriptive vs normative | 人应该怎样推理和实际怎样推理是否一致 | ought to, benchmark | 规范模型是标准，真实行为可偏离 |
| Deduction | 结论是否必然成立 | statement, quantifier | 前提真且形式有效时结论必须真 |
| Induction | 如何从样例发现规则 | pattern, evidence | 结论有强弱，不保证绝对必然 |
| Wason task | 如何检验条件规则 | if P then Q | 找反例 P and not Q |
| Context effect | 为什么熟悉规则更容易 | beer-age task | 内容语境会帮助人类推理 |

### Deduction 与 induction 对比

| 类型 | 推理方向 | 结论性质 | 典型题 |
| --- | --- | --- | --- |
| Deduction | 一般规则到具体结论 | 若形式有效则必然 | 量词、Square of Opposition、Wason task |
| Induction | 具体样例到一般规律 | 概率性、可修正 | 数字、图形、颜色、位置规律题 |

### 本讲的考试抓手

做 reasoning 题时不要只写答案。要写出规则、反例或证据如何改变信念。特别是 Wason task，永远先把题目翻译成 if P then Q，再找 P and not Q。`,

  "Lecture 2a：神经系统与大脑结构": `## 总结页｜Lecture 2a 学习地图

本讲把认知功能放到神经系统中。学习顺序是从大到小：先分 CNS/PNS，再看反射弧和自主神经系统，然后进入脑干、边缘系统、大脑四叶、半球连接和语言区。

| 层级 | 结构 | 本讲作用 | 记忆方法 |
| --- | --- | --- | --- |
| 系统层 | CNS / PNS | 区分信息整合中心和身体连接通路 | 中枢处理，外周连接 |
| 回路层 | Reflex arc | 展示输入到输出的快速闭环 | stimulus → spinal cord → muscle |
| 身体状态 | Sympathetic / parasympathetic | 解释 fight-or-flight 与恢复 | 动员 vs 冷静 |
| 脑干与皮层下 | thalamus, brainstem, limbic system | 中继、生命维持、情绪记忆动机 | 先定位，再记功能 |
| 皮层 | frontal, parietal, temporal, occipital | 建立四叶功能地图 | 前额控制，后枕视觉，侧颞听觉识别，上顶感觉整合 |
| 半球与语言 | corpus callosum, Broca, Wernicke | 理解侧化与连接 | 分工不等于完全独立 |

### 四叶功能速查

| 脑叶 | 主要线索 | 与课程后续的关系 |
| --- | --- | --- |
| Frontal lobe | 运动、计划、目标控制、推理 | 与理性、决策、人格变化相连 |
| Parietal lobe | 躯体感觉、多模态整合、空间 | 与感知整合和注意相连 |
| Temporal lobe | 听觉、语言理解、面孔识别、情绪连接 | 与语言、记忆和识别相连 |
| Occipital lobe | 视觉处理 | 与 Lecture 3 视觉知觉直接相连 |

### 读图策略

每张脑图先读方向，再读结构，再读功能。不要把脑区当作孤立标签，应该问：它接收什么输入，参与什么网络，损伤后可能影响什么行为。`,

  "Lecture 2b：神经元、突触与感觉转导": `## 总结页｜Lecture 2b 学习地图

本讲从脑结构下沉到神经元和感觉转导。核心链条是：神经元接收输入，整合 EPSP/IPSP，超过阈值产生 action potential，沿 axon 传播，到 synapse 释放 neurotransmitter，再影响下一个细胞。

| 环节 | 关键词 | 发生了什么 | 容易混淆点 |
| --- | --- | --- | --- |
| 输入 | dendrite, receptor | 接收递质或感觉信号 | 输入不是动作电位本身 |
| 整合 | soma, EPSP, IPSP | 兴奋和抑制加总 | EPSP/IPSP 是 graded |
| 触发 | threshold, all-or-none | 超阈值产生 spike | spike 幅度不表示刺激强度 |
| 传播 | axon, voltage-gated channel | Na+ 内流、K+ 外流推动波前 | 传播是连续再触发 |
| 维护 | Na+/K+ pump | 恢复离子梯度 | 泵维持长期可重复放电 |
| 突触 | synaptic cleft, neurotransmitter | 电信号转化为化学传递 | 递质必须匹配受体 |
| 感觉转导 | retina, rods, cones | 物理能量转为神经信号 | 感觉不是直接复制外界 |

### 动作电位速记

| 阶段 | 电位变化 | 主要离子动作 |
| --- | --- | --- |
| Resting | 约 -70 mV | Na+ 外多，K+ 内多，内部较负 |
| Threshold | 约 -40 mV | 达到触发条件 |
| Depolarization | 上升到正电 | Na+ channels 打开，Na+ 内流 |
| Repolarization | 回到负电 | K+ channels 打开，K+ 外流 |
| Recovery | 恢复梯度 | Na+/K+ pump 维持浓度差 |

### 本讲和后面课程的关系

Lecture 3 的视觉转导、Lecture 4 的记忆形成，都需要这讲的细胞机制做底层解释。读这一讲时要把“mind comes about”理解成从离子、突触、网络逐层产生功能。`,

  "Lecture 3a：上下行加工与视觉错觉": `## 总结页｜Lecture 3a 学习地图

本讲是 AIE2001 的关键讲次：它用视觉错觉证明 perception 不是对外界的逐像素复制，而是大脑基于输入、语境、经验和先验假设做出的 unconscious inference。

| 模块 | 核心问题 | 关键例子 | 要记住的机制 |
| --- | --- | --- | --- |
| 视觉输入 | 光如何进入视觉系统 | eye, retina, rods/cones | sensation 是转导，不是理解 |
| 适应 | 为什么当前知觉受之前刺激影响 | light adaptation, afterimage, motion after-effect | 神经通道会改变 set-point |
| 填补 | 为什么看不到盲点 | blind spot | 大脑根据周围信息补全缺失 |
| 对比增强 | 为什么网格出现灰点 | Hermann grid | lateral inhibition 增强局部对比 |
| 特征整合 | 如何从边缘线条到形状 | feature detectors, V1 | bottom-up 逐层组合 |
| 推断 | 为什么知觉会受期待影响 | Helmholtz, Bayesian brain | top-down 与 bottom-up 结合 |
| 深度与大小 | 为什么同一大小看起来不同 | Ames room, binocular disparity | 大脑根据 3D 假设解释 2D 输入 |
| 亮度与阴影 | 为什么同样灰度看起来不同 | checker shadow, shading | 亮度知觉会校正照明 |
| 双稳态与不可能图形 | 为什么同一图可有多种解释 | Rubin vase, Penrose stairs | 局部合理不等于全局可实现 |

### Bottom-up 与 top-down 对比

| 加工方向 | 来自哪里 | 作用 | 例子 |
| --- | --- | --- | --- |
| Bottom-up | sensory input / proximal stimulus | 提供证据和限制条件 | 边缘、方向、颜色、亮度 |
| Top-down | context / expectation / knowledge | 选择最可能解释 | 语境读词、Ames room、阴影恒常性 |

### 学这一讲的总公式

**Perception = sensory evidence + prior assumptions + context-based inference**。  
每看一个错觉，都要问三件事：输入是什么，大脑默认假设是什么，为什么这个假设在这张图里导致错误。`,

  "Lecture 3b：模式发现与类别形成": `## 总结页｜Lecture 3b 学习地图

本讲把知觉从“看见物体”推进到“发现模式和意义”。核心是 Gestalt psychology、pattern discovery、camouflage、categorization 和 connectionism。

| 主题 | 本讲问题 | 典型材料 | 学习重点 |
| --- | --- | --- | --- |
| Gestalt | 为什么整体不等于部分相加 | 倒置肖像、whole quote | 整体组织会改变局部意义 |
| Face perception | 人脸为什么容易被发现 | 婴儿脸偏好、树脸错觉 | 配置关系比单个特征更重要 |
| Figure-ground | 为什么同一图有不同对象 | All is vanity, hidden people | 观察尺度和图底分配影响意义 |
| Camouflage | 为什么对象会隐藏在背景里 | 岩壁鸟、雪地动物 | 相似性和边界破坏会削弱识别 |
| Pattern puzzle | 如何从例子发现规律 | 颜色、旋转、序列题 | 要把视觉直觉写成规则 |
| Category | 类别边界为什么模糊 | chair, vegetable | 原型、样例和 family resemblance |
| Connectionism | 类别如何由网络学习 | neural network diagrams | 相似性判断可来自连接权重 |

### Gestalt 与 category 的关系

| 问题 | Gestalt 侧重 | Category 侧重 |
| --- | --- | --- |
| 研究对象 | 局部特征如何组织成整体 | 多个对象如何归为一类 |
| 核心机制 | grouping, figure-ground, closure | prototype, exemplar, family resemblance |
| 典型错误 | 看到不存在的整体或隐藏图形 | 类别边界模糊、例外难处理 |
| 与 AI 的关系 | 模式组织 | 表征学习与分类 |

### 本讲最该记住的一句话

Perception 的终点不是“图像”，而是 **meaning**：大脑把局部特征组织成模式，再把模式连接到概念和类别。`,

  "Lecture 4a：记忆系统": `## 总结页｜Lecture 4a 学习地图

本讲建立 memory systems 的基本框架：记忆不是单一仓库，而是一组过程和系统。先看 encoding、storage、retrieval 三个过程，再看 sensory memory、working memory、long-term memory 三层系统，最后进入长期记忆分类。

| 维度 | 类型 | 关键问题 | 例子 |
| --- | --- | --- | --- |
| 过程 | encoding / storage / retrieval | 信息如何进入、保持、取出 | 学单词、保持号码、考试回忆 |
| 时间系统 | sensory / working / long-term | 信息能保存多久、容量多大 | 感觉痕迹、digit span、长期知识 |
| 工作记忆 | phonological loop / visuospatial sketchpad / central executive | 当前任务如何被保持和操作 | 口头复述、迷宫、双任务 |
| 编码策略 | chunking / levels of processing | 为什么同样材料记忆效果不同 | GPS/FBI/USA、语义判断 |
| 长期记忆 | declarative / nondeclarative | 能否有意识说出 | 事实和经历 vs 技能习惯 |
| 陈述性记忆 | semantic / episodic | 一般知识还是个人经历 | 概念网络、Inside Out 场景 |

### 记忆系统对比

| 系统 | 容量 | 持续时间 | 典型编码 | 进入下一阶段靠什么 |
| --- | --- | --- | --- | --- |
| Sensory memory | 很大但短暂 | 毫秒到数秒 | 感觉模态 | 注意 |
| Working memory | 有限 | 十几到几十秒 | 声音、视觉空间、任务规则 | 复述、操作、编码 |
| Long-term memory | 极大 | 很久到终身 | 意义、经历、技能 | 深加工和关联 |

### 本讲的学习路线

先画流程图，再把每个实验放回流程图。digit span 测工作记忆，serial position 同时涉及短时和长期，levels of processing 解释为什么深层语义加工更利于长期记忆。`,

  "Lecture 4b：失忆症与记忆错误": `## 总结页｜Lecture 4b 学习地图

本讲用 amnesia、H.M.、priming、skill learning 和 Seven Sins of Memory 说明：记忆系统可以分离，记忆也会重构和出错。

| 主题 | 要回答的问题 | 核心例子 | 学习重点 |
| --- | --- | --- | --- |
| Amnesia 分类 | 是忘了过去，还是不能形成新记忆 | retrograde / anterograde | 用时间轴区分 |
| H.M. | medial temporal lobe 损伤说明什么 | 手术后无法形成新陈述性记忆 | 工作记忆和长期陈述性记忆可分离 |
| Preserved learning | 没有意识回忆还能学习吗 | mirror tracing, Tower of Hanoi | procedural memory 可保留 |
| Priming | 无意识接触如何影响表现 | MEM___ completion | 非陈述性记忆可改变行为 |
| Memory errors | 记忆为什么会错 | Seven Sins | 错误来自不同记忆环节 |
| Neural basis | 哪些脑区参与记忆 | hippocampus, cortex, basal ganglia | 新关联、分布式存储、技能习惯分工 |

### Retrograde 与 anterograde 对比

| 类型 | 影响时间方向 | 典型表现 | 关键问题 |
| --- | --- | --- | --- |
| Retrograde amnesia | 发病前 | 忘记事故前事件或个人经历 | 旧记忆检索/保持受损 |
| Anterograde amnesia | 发病后 | 难以形成新的长期陈述性记忆 | 新编码和巩固受损 |

### H.M. 案例一句话

H.M. 说明“记忆”不是一个整体能力：人可以短时对话、学会技能，却无法形成新的情景/陈述性长期记忆。`,

  "Exam 1 必考课件总复习": `## 总结页｜Exam 1 复习总图

这篇总复习要把 Exam 1 范围从“很多页课件”变成几条可答题的主线。复习时不要只背定义，要能把人物、实验、脑区、错觉和记忆病例放回对应理论。

| 主线 | 代表内容 | 常见考法 | 答题时必须写清 |
| --- | --- | --- | --- |
| 认知科学是什么 | Gardner hexagon, Marr levels | 解释跨学科框架 | 研究对象、方法层次、计算视角 |
| 心理学流派 | Wundt, James, Watson, Freud, Gestalt | 比较流派 | 研究对象、方法、局限 |
| 理性与推理 | rationality, deduction, induction, Wason task | 判断推理类型或反例 | 规则、量词、反例逻辑 |
| 神经基础 | CNS/PNS, lobes, neuron, synapse | 标图或解释机制 | 结构位置、功能、信号方向 |
| 感觉与知觉 | retina, transduction, rods/cones | 解释视觉机制 | 从物理刺激到神经信号 |
| 错觉与推断 | blind spot, Hermann grid, Ames room | 用错觉解释 perception | 输入、先验假设、错误来源 |
| 模式与类别 | Gestalt, camouflage, category | 解释整体/类别 | grouping、prototype、family resemblance |
| 记忆系统 | working memory, long-term memory, H.M. | 比较系统或病例 | 过程、系统、脑区、行为证据 |

### 高频对比表

| 对比 | A | B | 不要混淆 |
| --- | --- | --- | --- |
| Normative vs descriptive | 应该怎样推理 | 实际怎样推理 | 标准不等于表现 |
| Deduction vs induction | 必然结论 | 概率规律 | 演绎看形式，归纳看证据 |
| Sensation vs perception | 转导输入 | 解释意义 | 看到不是复制 |
| Bottom-up vs top-down | 输入驱动 | 经验/语境驱动 | 真实知觉通常两者都有 |
| Declarative vs nondeclarative | 可说出事实/经历 | 技能、习惯、priming | H.M. 案例最关键 |
| Retrograde vs anterograde | 影响过去记忆 | 影响新记忆形成 | 用发病时间点划线 |

### 考前使用方法

先看这页总表定位弱点，再回到对应 Lecture 的逐页讲解。每个概念都至少准备一个例子：一个人物、一个实验/图、一个机制解释。`
};

function stripExistingSummary(markdown) {
  const pattern = new RegExp(`\\n?${startMarker}[\\s\\S]*?${endMarker}\\n?`, "g");
  return markdown.replace(pattern, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function insertSummary(markdown, summary) {
  const clean = stripExistingSummary(markdown);
  const match = clean.match(/^# .+$/m);
  const block = `${startMarker}\n\n${summary.trim()}\n\n${endMarker}`;
  if (!match) return `${block}\n\n${clean}`;
  const insertAt = match.index + match[0].length;
  return `${clean.slice(0, insertAt)}\n\n${block}${clean.slice(insertAt)}`.trim();
}

function protectedView(db, targetNoteIds) {
  return {
    users: db.users,
    preferences: db.preferences,
    passwordResets: db.passwordResets,
    courses: db.courses,
    lessons: db.lessons,
    notes: db.notes.filter((note) => !targetNoteIds.has(note.id)),
    mediaAssets: db.mediaAssets
  };
}

const baseline = JSON.parse(await fs.readFile(dbPath, "utf8"));
const course = baseline.courses.find((item) => item.userId === userId && item.code === courseCode);
if (!course) throw new Error(`${courseCode} course not found`);

const lessons = baseline.lessons
  .filter((lesson) => lesson.userId === userId && lesson.courseId === course.id)
  .sort((a, b) => a.order - b.order);

const targets = [];
for (const lesson of lessons) {
  const note = baseline.notes.find((item) => item.userId === userId && item.lessonId === lesson.id);
  if (!note) throw new Error(`No note found for lesson ${lesson.title}`);
  const summary = summaries[lesson.title];
  if (!summary) throw new Error(`Missing summary draft for lesson ${lesson.title}`);
  targets.push({ lesson, note, summary });
}

const targetNoteIds = new Set(targets.map(({ note }) => note.id));
const now = new Date().toISOString();
const backupDir = path.join(backupRoot, `aie2001-summary-pages-${now.replace(/[:.]/g, "-")}`);
await fs.mkdir(backupDir, { recursive: true });
await fs.writeFile(path.join(backupDir, "app-db.json"), JSON.stringify(baseline, null, 2), "utf8");

const next = structuredClone(baseline);
const report = [];
for (const { lesson, note, summary } of targets) {
  const target = next.notes.find((item) => item.id === note.id);
  target.contentMarkdown = insertSummary(target.contentMarkdown, summary);
  target.summary = `${target.summary || ""} 已添加本讲总结页。`.trim();
  target.updatedAt = now;
  const count = (target.contentMarkdown.match(new RegExp(startMarker, "g")) || []).length;
  if (count !== 1) throw new Error(`${lesson.title}: summary marker count ${count}`);
  const beforeAppendix = target.contentMarkdown.split("<!-- courseware-appendix -->")[0];
  if (!beforeAppendix.includes("## 总结页")) throw new Error(`${lesson.title}: summary page missing before appendix`);
  report.push({
    lessonOrder: lesson.order,
    lessonTitle: lesson.title,
    noteId: note.id,
    contentChars: target.contentMarkdown.length,
    contentHash: digest(target.contentMarkdown)
  });
}

const protectedBefore = digest(protectedView(baseline, targetNoteIds));
const protectedAfter = digest(protectedView(next, targetNoteIds));
if (protectedBefore !== protectedAfter) throw new Error("Non-target records changed unexpectedly");

const tmp = `${dbPath}.${now.replace(/[:.]/g, "-")}.tmp`;
await fs.writeFile(tmp, JSON.stringify(next, null, 2), "utf8");
await fs.rename(tmp, dbPath);

const result = {
  updatedAt: now,
  courseId: course.id,
  courseCode,
  backupDir,
  notes: report
};
await fs.writeFile(path.join(root, "data", "aie2001-summary-pages-report.json"), JSON.stringify(result, null, 2), "utf8");
console.log(JSON.stringify(result, null, 2));
