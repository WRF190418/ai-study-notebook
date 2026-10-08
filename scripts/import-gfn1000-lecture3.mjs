import { copyFile, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { nanoid } from "nanoid";
import sharp from "sharp";
import ts from "typescript";

const execFileAsync = promisify(execFile);

const root = path.resolve("data/gfn1000-review");
const lectureRoot = path.join(root, "lecture3");
const mediaDir = path.resolve("data/media");
const pdfPath = "D:/Win_Data/Desktop/SUMMER PREVIEW/GFN1000/Lecture_3 .pdf";
const popplerPdftoppm =
  "C:/Users/59281/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/Library/bin/pdftoppm.exe";

const userId = "_9hLO-wve3Rp84FB21L0x";
const courseId = "ossai_Z9P-3LzgOpMdZpQ";
const userEmail = "59281701@qq.com";
const sourceFile = "Lecture_3 .pdf";

const lessonSpec = {
  key: "lecture3",
  title: "Lecture 3：近代物理学的诞生",
  subtitle: "The Birth of a New Physics",
  summary: "从亚里士多德宇宙论到牛顿力学的范式转移：Newton 的生平与方法、Copernicus/Kepler/Galileo 的准备、数学化与实验如何共同构成 modern science。",
  icon: "atom",
  accent: "cobalt",
  order: 4
};

function digest(data) {
  return createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

function protectedData(db) {
  return {
    ...db,
    courses: db.courses.filter((course) => !(course.userId === userId && course.id === courseId)),
    lessons: db.lessons.filter((lesson) => !(lesson.userId === userId && lesson.courseId === courseId)),
    notes: db.notes.filter((note) => !(note.userId === userId && note.courseId === courseId)),
    mediaAssets: db.mediaAssets.filter((asset) => {
      const note = db.notes.find((item) => item.id === asset.noteId);
      return !(note?.userId === userId && note.courseId === courseId);
    })
  };
}

function assertTarget(db) {
  const user = db.users.find((item) => item.id === userId);
  const course = db.courses.find((item) => item.id === courseId && item.userId === userId);
  if (user?.email !== userEmail || course?.code !== "GFN1000") {
    throw new Error("Target identity mismatch; refusing to import.");
  }
  if (db.lessons.some((lesson) => lesson.userId === userId && lesson.courseId === courseId && /Lecture 3|近代物理学的诞生|Birth of a New Physics/i.test(lesson.title))) {
    throw new Error("Lecture 3 already exists in GFN1000; refusing duplicate import.");
  }
  return course;
}

async function extractPdfText() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(await readFile(pdfPath));
  const document = await pdfjs.getDocument({
    data,
    useWorkerFetch: false,
    isEvalSupported: false,
    disableFontFace: true
  }).promise;
  const pages = [];
  for (let number = 1; number <= document.numPages; number += 1) {
    const page = await document.getPage(number);
    const content = await page.getTextContent();
    const text = content.items.map((item) => item.str).join(" ").replace(/\s+/g, " ").trim();
    pages.push({ number, text });
  }
  const sourceText = pages.map((page) => `### Page ${page.number}\n${page.text}`).join("\n\n");
  await mkdir(lectureRoot, { recursive: true });
  await writeFile(path.join(lectureRoot, "source.txt"), sourceText, "utf8");
  return pages;
}

async function renderPages(pages) {
  await mkdir(lectureRoot, { recursive: true });
  const rawPrefix = path.join(lectureRoot, "raw-page");
  await execFileAsync(popplerPdftoppm, ["-r", "144", "-png", pdfPath, rawPrefix], { maxBuffer: 1024 * 1024 * 20 });
  const rendered = [];
  for (const page of pages) {
    const candidates = [
      path.join(lectureRoot, `raw-page-${page.number}.png`),
      path.join(lectureRoot, `raw-page-${String(page.number).padStart(2, "0")}.png`),
      path.join(lectureRoot, `raw-page-${String(page.number).padStart(3, "0")}.png`)
    ];
    let png = "";
    for (const candidate of candidates) {
      try {
        await stat(candidate);
        png = candidate;
        break;
      } catch {
        // Try the next Poppler filename variant.
      }
    }
    if (!png) throw new Error(`Rendered page image not found for page ${page.number}`);
    const fileName = `page-${String(page.number).padStart(3, "0")}.webp`;
    const webp = path.join(lectureRoot, fileName);
    await sharp(png)
      .resize({ width: 1600, height: 1200, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(webp);
    await rm(png, { force: true });
    const metadata = await sharp(webp).metadata();
    rendered.push({
      ...page,
      fileName,
      path: webp,
      width: metadata.width ?? 0,
      height: metadata.height ?? 0,
      size: (await stat(webp)).size
    });
  }
  await writeFile(
    path.join(lectureRoot, "materials.json"),
    JSON.stringify({ sourceFile, pageCount: pages.length, pages: rendered.map(({ path: _path, ...page }) => page) }, null, 2),
    "utf8"
  );
  return rendered;
}

function buildNote() {
  return `# GFN1000 Lecture 3：近代物理学的诞生（The Birth of a New Physics）

## 先建立概念框架

本讲回答的核心问题是：**近代物理学为什么不是在亚里士多德自然哲学上简单加几条观察，而是一次 mechanics 的范式转移（paradigm shift）？** 课件把线索从 Newton 本人展开到他之前的“巨人”：中世纪学者的运动量化、Copernicus 的日心说、Tycho 的精确观测、Kepler 的行星定律、Galileo 的数学化、思想实验与实验研究，最后回到 Newton 如何用定义、公理与证明统一地上和天上运动。

主线可以压缩成一句话：**Aristotelian cosmology 的地心、完美天界、圆周与匀速假设被一层层拆解；Newton 的新物理把数学化假设与持续实验结合起来，用同一套力学原则解释 terrestrial and celestial regions。**

| 关键词 | 初学者理解及联系 |
| --- | --- |
| Scientific Method，科学方法 | 课件用观察、形成假设、设计并执行实验、检验假设、若不成立则回到假设这一循环作为入口。 |
| Paradigm shift，范式转移 | 一个学科基本概念和实验实践发生根本变化；课件例子是 1687 年前后从 Aristotelian mechanics 到 Newtonian mechanics。 |
| Aristotelian cosmology，亚里士多德宇宙论 | 地心、月上区域完美、天体圆周/不变/匀速、地球静止等假设，是 Lecture 2 的延续和本讲被替换的背景。 |
| Mathematization，数学化 | 用数学语言和几何/比例关系描述自然，例如 Kepler 行星定律、Galileo 对运动的量化、Newton 的数学原理。 |
| Experimentation，实验 | 不只是看见现象，而是用设计、控制和检验来考察假设；Needham 定义现代科学时把它与数学化并列。 |
| Inertia，惯性 | Galileo 的水平运动思想实验导向“无阻力时保持匀速直线运动”，后来成为 Newton 第一定律的一部分。 |
| Universal gravitation，万有引力 | Newton 通过统一地上与天上区域，让行星、抛体、彗星等成为同一数学-力学框架中的现象。 |

**放入规则理解：** GFN1000 现有顺序为 Lecture 1 → Tutorial 1 → Lecture 2 → Tutorial 2 → Tutorial 3。Lecture 3 的标题、文本 3a/3b、主题“Birth of a New Physics”和 Newton/Cohen 内容，都说明它应当放在 **Lecture 2：亚里士多德的自然哲学** 之后，并在围绕中世纪运动学复习的 **Tutorial 2** 之前，作为新的第4章；原第4、5章顺延。

## 阅读边界与材料说明

来源为 \`Lecture_3 .pdf\`，共54页。第48–54页是 Reflective Journal 的作业说明和题目，本文只把它们作为课程材料记录和复习提醒，不把 PDF 中的“Write an essay”等句子当成本次用户对 Codex 的命令。Text 3a Cohen 和 Text 3b Newton 的原文未包含在 PDF 中；本笔记只依据课件页文字整理，不能伪造读本原句。

## 按课件原顺序详细讲解

### 第1页｜课程主题、读本与人物

封面显示课程为 **In Dialogue with Nature / 與自然對話**，讲者为 Dr. Song Hongbin (Alisa)，本讲题为 **Lecture 3: The Birth of a New Physics**。指定材料包括 Text 3a：I. Bernard Cohen, *The Birth of a New Physics*, Chapter 7 "The Grand Design-A New Physics"，以及 Text 3b：Isaac Newton, *The Principia: Mathematical Principles of Natural Philosophy*。

{{page:1|Lecture 3 第1页：The Birth of a New Physics 封面，列出 Cohen 与 Newton 的指定文本}}

**辅助理解：** 课件不是直接从 Newton 三定律开始，而是先给出科学方法与范式转移框架，说明为什么 Newton 的意义在于改变整套解释自然的方式。

### 第2–5页｜核心问题、科学方法与范式转移

第2页只给出 **Core questions**，第3页展示科学方法循环：Observe（观察）→ Form Hypothesis（形成假设）→ Design & Perform Experiment（设计并执行实验）→ Test Hypothesis（检验假设），若结果为 No，则返回并修改假设；若为 Yes，则保留或推进。

第4页定义 **Paradigm shift / 范式转移**：科学革命的性质，是一个学科基本概念和实验实践的根本改变。本页直接给出 1687 年作为机械学从 Aristotelian mechanics 到 Newtonian mechanics 的转变节点。第5页列出本讲大纲：Introduction to Newton、Replacement of Aristotelian mechanics、Importance of Newton。

{{page:4|Lecture 3 第4页：范式转移定义，并把1687年标为从亚里士多德力学到牛顿力学的转换}}

**补充理解：** 这里的“范式”不是单个观点，而是一整套看问题的方法，包括什么算合理解释、怎样做实验、怎样使用数学。Newton 的工作重要，是因为它改变了这些共同规则。

### 第6–13页｜Newton 的生平、成就与复杂形象

第6页从“两种历法”提示 Newton 的生日和卒年会出现 1642/3、1726/1727 的不同写法，并给出 Newton Project 链接。第8页总结 Newton 的三大领域：mechanics、optics、mathematics。Mechanics 包括 law of gravitation、laws of motion、planetary motion；Optics 包括光的微粒说、白光七色、Newton's ring；Mathematics 包括 general binomial series 与 calculus。

第9–10页给出 Newton 身份：English mathematician、astronomer、theologian、physicist，在其时代被称为 natural philosopher；1661年进入 Cambridge University 的 Trinity College；在 1665 年伦敦大瘟疫期间发展 calculus、optics 和 law of gravitation；1703年任 Royal Society 会长；1696–1727年任 Royal Mint 的 Warden and Master；还从 1668/9 开始接触 alchemy，并从 1673 起研究 Biblical studies。

第11页提醒 Newton 的“dark sides”：alchemy、magic、末世预言；课件引用 Nature 2004 的 Geoff Brumfiel，指出 Newton 的宗教与科学都可能与追求 absolute truth 相关。第12页把这些信息合并，并称 Newton 是 scientific revolution 的关键人物之一。第13页列出两句名言：Alexander Pope 的墓志铭式赞词，以及 Newton “stood on the shoulders of giants”。

{{page:8|Lecture 3 第8页：Newton 在 mechanics、optics 和 mathematics 三方面的成就概览}}

**辅助理解：** 本课不是把 Newton 神化为单独天才，也不是因为他有炼金术和神学兴趣就否定科学贡献。课件要的是历史理解：Newton 的新物理在当时的自然哲学、宗教和数学文化中形成。

### 第14–17页｜“巨人”是谁：从亚里士多德到中世纪与文艺复兴

第14页提出 Who are the giants? 并把 Plato、Aristotle、Middle Ages、Renaissance、Modern Science 连成历史序列，说明 Aristotle 的思想支配超过1000年。第15页把人物排成链条：John Philoponus（6th）、Avicenna and Averroes（10–12th）、Thomas Aquinas（13th）、Franciscus de Marchia and John Buridan（14th）、Copernicus（15–16th）、Galileo 与 Kepler（16–17th），最后到 Newton。

第16页进一步强调中世纪阶段的 quantitative investigation：mathematical description of motions、quantity and intensity、diagram representation，并把 Text 2 Chapter 12 的自然运动、抛射运动、匀速运动、匀加速运动、非匀加速运动、温度、强度、热量等连接起来。第17页把 Renaissance 的 mathemactic language 与 experiment 加入，指出这是 Newton 前的重要准备期。

{{page:16|Lecture 3 第16页：中世纪量化研究如何为运动数学化准备概念工具}}

**与前后笔记的联系：** 这就是为什么 Lecture 3 应该放在 Lecture 2 后面：它接着亚里士多德自然哲学和中世纪运动讨论，展示这些讨论怎样被 Copernicus、Kepler、Galileo 和 Newton 改造。

### 第18–20页｜从亚里士多德宇宙论到 Copernican heliocentrism

第18页标题为 Aristotelian Cosmology。第19页对照 Ptolemy 与 Copernicus：Ptolemy 的 geocentrism / 地心说包含 deferent（均轮）和 epicycle（本轮）；Copernicus 的 heliocentrism / 日心说把太阳置于中心。第20页列出 Aristotelian cosmology 的核心命题：geocentric universe、superlunar region perfect、celestial motion 中 Earth is stationary、perfect circle、unchanging、uniform motion；其中地心和地球静止被课件标为错误，并与 Copernican heliocentrism 对照。

{{page:19|Lecture 3 第19页：Ptolemy 地心模型与 Copernicus 日心模型对照，含 deferent 与 epicycle}}

**辅助理解：** Copernicus 的意义不只是把中心换成太阳，而是动摇了“地球静止”和传统宇宙结构。课件后面会继续拆解“天界完美、不变、匀速圆周”等假设。

### 第21–28页｜Tycho 与 Kepler：精确观测如何推翻完美天界和匀速圆周

第21–23页介绍 Tycho Brahe：他是 Kepler 的 supervisor，用肉眼作出精确的行星位置记录；1572年观测到 supernova，说明 heaven was NOT unchanging；他提出 geo-heliocentric astronomy，月亮绕地球、行星绕太阳、太阳绕地球，课件说明这是对 Copernican model 的 slight deviation。

第24页给出 Kepler 关于 Tycho 观测误差 8' 的长引文。重点在于：如果 8' 可以忽略，他本可以让旧模型勉强成立；正因为不能忽略，才走向 astronomy 的 complete reformation。课件概括为：gave up all accepted methods，trusted the accuracy of the data and reject the perfect circle。

第25–27页按顺序呈现 Kepler's Laws：第一，行星轨道是 ellipse，太阳位于两个焦点之一；第二，连接行星与太阳的线段在相等时间扫过相等面积，说明行星有时快、有时慢，不是 uniform motion；第三，行星周期平方与半长轴立方成正比，$T^2 \\propto a^3$。第28页把 Copernicus、Tycho、Kepler 汇总，并用叉号继续否定亚里士多德宇宙论中的 geocentric、perfect circle、unchanging、uniform motion。

{{page:24|Lecture 3 第24页：Kepler 重视 Tycho 的8角分误差，因而放弃完美圆轨道}}

{{page:27|Lecture 3 第27页：Kepler 第三定律，$T^2 \\propto a^3$，并继续否定匀速圆周运动}}

**初学者关系图：** Tycho 提供高精度数据；Kepler 尊重数据到足以放弃完美圆；三个定律将行星运动数学化；这为 Newton 后来解释“为什么这些数学规律成立”留下入口。

### 第29–38页｜Galileo：观察、数学化、思想实验与实验研究

第29页介绍 Galileo Galilei，称其为 Italian astronomer、physicist、engineer、philosopher、mathematician，并列出 Father of modern observational astronomy、modern physics、science/modern science 等称号。第30页列出他做了什么：改进 refracting telescope；观察月球山脉；发现 Jupiter's satellites，说明 Earth is not the centre of the universe；观察 sunspots，说明 celestial region is not perfect。第31页用这些发现系统否定 Aristotelian cosmology：geocentric、superlunar perfect、Earth stationary、perfect circle、unchanging、uniform motion 都被打叉。

第32–33页强调 **mathematization**，引用 Galileo “Nature is written in the language of mathematics...” 并加上 thought experiment。第34页提醒 Pisa falling tower story “Probably not”。第35页展示 cannonball 与 musket ball 被绳子连接的思想实验，要求思考 Galileo 如何用思想实验反驳 Aristotle，以及科学家为什么提出 thought experiments。

第36–37页加入 experimental investigation：由于自由落体太快，Galileo 让物体在光滑斜面上下滑，发现 velocity 与 time elapsed 成正比，且 independent of mass。课件对比 Explain Why（为什么石头下落）与 Explain How（石头怎样下落），说明近代物理更重视可测量的运动描述。第38页展示 Galileo 的水平运动思想实验：若无阻力，有初速度的物体会以恒定速度沿直线一直运动；这就是 horizontal motion is inertial，后来成为 Newton's First Law。

{{page:30|Lecture 3 第30页：Galileo 通过月球山脉、木星卫星与太阳黑子挑战完美天界和地心结构}}

{{page:38|Lecture 3 第38页：Galileo 的惯性思想实验，无阻力时水平运动保持匀速直线}}

**易错点：** 课件第37页文字中出现 “Falling objects have constant speed”，但同页又写 velocity proportional to time elapsed；按物理含义应理解为斜面研究显示速度随时间变化的规律，而不是自由落体全过程恒速。笔记保留课件文字，同时提醒复习时以教师讲解或原图为准核对。

### 第39–44页｜Newton 的万有引力发现、Cohen 的统一解释与《原理》的方法

第39页回到“Are these giants correct?”，说明即便前人推进了数学化和实验，Newton 仍要进一步统一。第40页指出 1679–80 年 Newton 与 Hooke 关于 falling bodies path 的通信，为 Newton 提供 inertia 与 centripetal attraction 的关键动力学概念；页面还标出 Hooke's Law $f=kx$。

第41页列出 Robert Hooke、Edmond Halley、Sir Christopher Wren，并提出 Text 3a 的问题：Newton 如何发现 universal law of gravitation？他的科学史贡献是什么？第42页直接给出 Cohen 的答案方向：Newton's unification of the terrestrial and celestial regions。第43页以 Halley's Comet 为例：Halley 用 Newton 的方法在1705年确定周期并预测1758年回归；它确实按期回归，使人们对 human reason aided by mathematics 产生新的敬畏。

第44页说明 Newton 实际做了什么：Make Definitions，包括 mass、motion、inertia、centripetal force；State Axioms，包括 Newton's three laws of motion 与 law of universal gravitation；Prove Results，包括 projectile motion、planetary elliptic orbits、Corollary I。课件称这是 empirical science 的 exemplar。

{{page:40|Lecture 3 第40页：Hooke 与 Newton 通信，涉及 inertia、centripetal attraction 与 Hooke's Law}}

{{page:43|Lecture 3 第43页：Halley 用 Newton 方法预测彗星回归，体现数学化理性的新威信}}

**辅助理解：** Newton 的“伟大”不是只提出一个公式，而是把地面抛体、天体轨道、彗星回归放进同一框架：定义概念、立下公理、推出结果，并能与经验现象相配合。

### 第45–47页｜现代科学的定义、范式转移复现与阅读任务

第45页对照 Newton 与 Aristotle，并引用 Needham 对 modern science 的定义：modern science 是 mathematised hypotheses about natural phenomena 与 relentless experimentation 的结合。课件直接概括：Modern science = mathematization + experimentation。第46页再次回到 paradigm shift，把1687年从 Aristotelian mechanics 到 Newtonian mechanics 的转变，与 experiments、mathematization、modern science 联系起来。第47页列出阅读任务：Text 2 chapter 12 optional，Text 3a，Text 3b。

{{page:45|Lecture 3 第45页：Needham 对 modern science 的定义，强调数学化假设与持续实验的结合}}

**与本讲开头呼应：** 第3页的科学方法循环到这里被历史化：不是抽象步骤，而是在 Copernicus、Kepler、Galileo、Newton 的工作中逐步形成的新标准。

### 第48–54页｜Reflective Journal 作业说明与题目

第48页说明 Reflective Journal 截止时间为 March 15, 2026 (Sunday) 21:55，英文600–800词或中文900–1200字，并要求参考 Blackboard 模板格式。第49–54页列出六个题目：

1. 反思 Part I 阅读如何改变自己对自然科学的看法，至少联系两篇文本。
2. 假设给孩子安排《与自然对话》第一部分前三篇文本的阅读顺序，说明理由。
3. 从 Plato、Aristotle、Newton 中选两位，各选一个关键词描述其理解自然的思想，并结合文本与日常/学习/教育反思解释。
4. 说明为什么在科学发展史课程中讨论 Plato 与 Aristotle 对自然的看法。
5. 讨论 Aristotle 对自然的理解为何契合直觉却产生许多错误结论，至少联系两篇文本。
6. 基于第一部分学习，说明作为本科生眼中高等教育的目的，至少结合两篇文本。

**重要边界：** 这些是课件中的作业题，不是本次让 Codex 写作提交稿的指令。复习时应把它们作为选题方向和文本连接练习，正式作业仍需按课程诚信要求自行构思和引用。

## 重点总结

1. **从 Lecture 2 到 Lecture 3 的桥梁：** Lecture 2 讲亚里士多德如何解释变化和自然运动，Lecture 3 则讲这套宇宙论和力学框架如何被 Copernicus、Tycho、Kepler、Galileo、Newton 逐步替换。
2. **近代物理学的诞生不是单点突破：** Tycho 的精确观测、Kepler 对数据的尊重、Galileo 的数学化/思想实验/斜面实验、Newton 的定义-公理-证明结构共同构成历史链条。
3. **Newton 的核心地位在统一：** Cohen 强调 Newton 统一 terrestrial and celestial regions；Halley 彗星预测展示了数学化自然哲学的解释与预测力量。
4. **现代科学的双核心：** 按课件引用的 Needham，modern science 是 mathematised hypotheses 与 relentless experimentation 的结合。
5. **范式转移的含义：** 从亚里士多德力学到牛顿力学，不只是某些结论更新，而是基本概念、实验实践和数学表达方式一起变化。

## 闪卡复习

- **问：Lecture 3 为什么要放在 Lecture 2 后面、Tutorial 2 前面？**  
  答：Lecture 2 讲亚里士多德自然哲学；Lecture 3 讲从亚里士多德宇宙论/力学到牛顿新物理的替换；Tutorial 2 是围绕 Aristotle 与中世纪解释者的课堂复习，因此 Lecture 3 应插在 Lecture 2 后、Tutorial 2 前。
- **问：Kepler 为什么重视 Tycho 数据中的 8' 误差？**  
  答：如果忽略这个误差，旧模型可以勉强保留；不能忽略时，就必须放弃完美圆等旧假设，走向行星椭圆轨道的新模型。
- **问：Galileo 对近代物理的贡献在课件中体现在哪三点？**  
  答：望远镜观察挑战完美天界和地心结构；用数学语言描述自然；通过思想实验和斜面实验研究运动。
- **问：Cohen 如何概括 Newton 的伟大？**  
  答：Newton 统一了地上区域与天上区域，用同一套数学力学框架解释抛体、行星和彗星等现象。
- **问：课件引用 Needham 如何定义 modern science？**  
  答：现代科学是数学化的自然假设与持续实验的结合，即 mathematization + experimentation。

## 思维导图

- 近代物理学的诞生
  - 科学方法与范式转移
    - 观察、假设、实验、检验
    - 1687：Aristotelian mechanics → Newtonian mechanics
  - Newton 的复杂形象
    - 数学、光学、力学
    - 神学、炼金术、绝对真理
  - 前人的准备
    - 中世纪量化运动
    - Copernicus 日心说
    - Tycho 精确观测
    - Kepler 三定律
    - Galileo 数学化、思想实验、实验
  - Newton 的统一
    - inertia 与 centripetal attraction
    - terrestrial/celestial unification
    - definitions、axioms、proofs
  - 现代科学
    - mathematization
    - experimentation
    - reflective journal 作为课程反思任务

## 逐页覆盖核对

已覆盖第1–54页：封面与读本、第2页核心问题、第3页科学方法、第4页范式转移、第5页大纲、第6–13页 Newton 生平与评价、第14–17页历史巨人和中世纪量化、第18–20页亚里士多德宇宙论与 Copernicus、第21–28页 Tycho 和 Kepler、第29–38页 Galileo、第39–44页 Newton 与 Cohen、第45–47页现代科学定义和阅读任务、第48–54页 Reflective Journal 作业说明。PDF 文字提取会改变部分图像和多栏阅读顺序，完整原页图已放入下方逐页核对附录，可放大检查。`;
}

function buildFlashcards() {
  return [
    ["Lecture 3 的核心范式转移是什么？", "1687年前后从 Aristotelian mechanics 转向 Newtonian mechanics；变化不只是结论，而是基本概念、实验实践和数学化表达方式的改变。"],
    ["为什么 Lecture 3 应插在 Lecture 2 与 Tutorial 2 之间？", "它接着 Lecture 2 的亚里士多德自然哲学，讲其宇宙论和力学框架如何被新物理替代；Tutorial 2 则是围绕 Aristotle 与中世纪运动学的复习。"],
    ["Kepler 三定律在本讲中的作用是什么？", "它们用椭圆、等面积和 $T^2 \\propto a^3$ 数学化行星运动，否定完美圆和匀速天体运动，为 Newton 的解释留下问题。"],
    ["Galileo 的贡献有哪些？", "望远镜观察挑战完美天界和地心结构；用数学语言描述自然；用思想实验和斜面实验研究运动。"],
    ["Cohen 所说 Newton 的统一指什么？", "Newton 把 terrestrial region 和 celestial region 放入同一数学力学框架，统一解释地面抛体、行星轨道和彗星回归。"],
    ["Needham 对 modern science 的定义是什么？", "Modern science 是 mathematised hypotheses about natural phenomena 与 relentless experimentation 的结合，即数学化假设 + 持续实验。"]
  ].map(([front, back]) => ({ id: nanoid(), front, back, difficulty: "medium" }));
}

function buildMindMap() {
  return [
    {
      id: nanoid(),
      label: "Lecture 3：近代物理学的诞生",
      children: [
        { id: nanoid(), label: "科学方法与范式转移", children: ["观察-假设-实验-检验", "1687 mechanics 转换"].map((label) => ({ id: nanoid(), label })) },
        { id: nanoid(), label: "Newton", children: ["力学、光学、数学", "宗教与炼金术背景", "定义、公理、证明"].map((label) => ({ id: nanoid(), label })) },
        { id: nanoid(), label: "前人准备", children: ["中世纪量化", "Copernicus", "Tycho", "Kepler", "Galileo"].map((label) => ({ id: nanoid(), label })) },
        { id: nanoid(), label: "现代科学", children: ["mathematization", "experimentation", "terrestrial/celestial unification"].map((label) => ({ id: nanoid(), label })) }
      ]
    }
  ];
}

function replaceInlineFigures(markdown, pageAssets) {
  return markdown.replace(/\{\{page:(\d+)\|([^}]+)\}\}/g, (_, number, caption) => {
    const asset = pageAssets.get(Number(number));
    if (!asset) throw new Error(`Missing page asset ${number}`);
    return `![${caption}（${sourceFile}，第 ${number} 页）](/api/media/${asset.id})`;
  });
}

function buildAppendix(renderedPages, pageAssets) {
  const appendix = renderedPages.map((page) => {
    const asset = pageAssets.get(page.number);
    const text = page.text.trim();
    const fence = "`".repeat(Math.max(3, ...[...text.matchAll(/`+/g)].map((match) => match[0].length + 1)));
    const extracted = text ? `${fence}text\n${text}\n${fence}` : "本页主要为空白、图像或低可提取文字；请以完整原页图中的文字、公式和图形为准。";
    return `### 第 ${page.number} 页\n\n${extracted}\n\n![${sourceFile} 第 ${page.number} 页完整原页](/api/media/${asset.id})`;
  }).join("\n\n");
  return `<!-- courseware-appendix -->\n\n## 逐页课件核对\n\n来源：${sourceFile}，共 ${renderedPages.length} 页。以下保存每一页的提取文字与完整原页图；提取文字可能改变公式、多栏顺序或特殊符号，公式排版和图形请以原页图为准。图片可放大核对。\n\n${appendix}`;
}

async function main() {
  const dbSource = await readFile("lib/db.ts", "utf8");
  await mkdir(lectureRoot, { recursive: true });
  await writeFile(
    path.join(root, "db.mjs"),
    ts.transpileModule(dbSource, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
    }).outputText,
    "utf8"
  );
  const { viewDb, mutateDb } = await import(pathToFileURL(path.join(root, "db.mjs")));

  const before = await viewDb((db) => db);
  const course = assertTarget(before);
  const protectedHash = digest(protectedData(before));
  const existingLessons = before.lessons
    .filter((lesson) => lesson.userId === userId && lesson.courseId === courseId)
    .sort((a, b) => a.order - b.order);
  const placement = {
    decision: "Insert Lecture 3 after Lecture 2 and before Tutorial 2.",
    rule: "Sort by lecture/tutorial number first, then by thematic dependency: lectures introduce the main historical-conceptual material; matching tutorials review or apply the preceding lecture material.",
    before: existingLessons.map((lesson) => ({ order: lesson.order, title: lesson.title })),
    insertOrder: lessonSpec.order
  };
  await writeFile(path.join(lectureRoot, "placement.json"), JSON.stringify(placement, null, 2), "utf8");

  const pages = await extractPdfText();
  const renderedPages = await renderPages(pages);
  await mkdir(mediaDir, { recursive: true });

  const now = new Date().toISOString();
  const backupDir = path.resolve("data/backups", `gfn1000-lecture3-insert-${now.replace(/[:.]/g, "-")}`);
  await mkdir(backupDir, { recursive: true });
  await writeFile(
    path.join(backupDir, "workspace.json"),
    JSON.stringify({
      course,
      lessons: existingLessons,
      notes: before.notes.filter((note) => note.userId === userId && note.courseId === courseId),
      mediaAssets: before.mediaAssets.filter((asset) => {
        const note = before.notes.find((item) => item.id === asset.noteId);
        return note?.userId === userId && note.courseId === courseId;
      }),
      protectedHash
    }, null, 2),
    "utf8"
  );

  const lessonId = nanoid();
  const noteId = nanoid();
  const assets = [];
  const pageAssets = new Map();
  for (const page of renderedPages) {
    const id = nanoid();
    const storageName = `${id}.webp`;
    await copyFile(page.path, path.join(mediaDir, storageName), constants.COPYFILE_EXCL);
    const asset = {
      id,
      userId,
      noteId,
      fileName: `lecture3-page-${String(page.number).padStart(3, "0")}.webp`,
      mimeType: "image/webp",
      size: page.size,
      storageName,
      sourceFile,
      slideNumber: page.number,
      slideText: page.text,
      alt: `${sourceFile} 第 ${page.number} 页完整原页`,
      width: page.width,
      height: page.height,
      createdAt: now
    };
    assets.push(asset);
    pageAssets.set(page.number, asset);
  }

  const sourceText = pages.map((page) => `### Page ${page.number}\n${page.text}`).join("\n\n");
  const markdown = replaceInlineFigures(buildNote(), pageAssets);
  const contentMarkdown = `${markdown.trim()}\n\n${buildAppendix(renderedPages, pageAssets)}`;
  const lesson = {
    id: lessonId,
    userId,
    courseId,
    title: lessonSpec.title,
    subtitle: lessonSpec.subtitle,
    order: lessonSpec.order,
    icon: lessonSpec.icon,
    accent: lessonSpec.accent,
    createdAt: now
  };
  const note = {
    id: noteId,
    userId,
    courseId,
    lessonId,
    title: lessonSpec.title,
    sourceType: "file",
    sourceText,
    contentMarkdown,
    summary: lessonSpec.summary,
    flashcards: buildFlashcards(),
    mindMap: buildMindMap(),
    createdAt: now,
    updatedAt: now
  };

  await mutateDb((db) => {
    assertTarget(db);
    if (digest(protectedData(db)) !== protectedHash) throw new Error("Protected data changed during preparation; refusing import.");
    for (const item of db.lessons.filter((item) => item.userId === userId && item.courseId === courseId && item.order >= lessonSpec.order)) {
      item.order += 1;
    }
    db.lessons.push(lesson);
    db.notes.unshift(note);
    db.mediaAssets.push(...assets);
    if (digest(protectedData(db)) !== protectedHash) throw new Error("Protected records changed unexpectedly.");
  });

  const after = await viewDb((db) => db);
  if (digest(protectedData(after)) !== protectedHash) throw new Error("Post-import protected data mismatch.");

  const importPath = path.join(root, "import.json");
  const importInfo = JSON.parse(await readFile(importPath, "utf8"));
  importInfo.notes = [
    ...importInfo.notes.filter((item) => item.key !== lessonSpec.key),
    {
      key: lessonSpec.key,
      noteId,
      lessonId,
      title: lessonSpec.title,
      pages: renderedPages.length,
      images: assets.length,
      chars: contentMarkdown.length,
      flashcards: note.flashcards.length,
      insertedOrder: lessonSpec.order,
      insertedBetween: ["Lecture 2：亚里士多德的自然哲学", "Tutorial 2：变化与中世纪运动学"]
    }
  ].sort((a, b) => {
    const order = { lecture1: 1, tutorial1: 2, lecture2: 3, lecture3: 4, tutorial2: 5, tutorial3: 6 };
    return (order[a.key] ?? 99) - (order[b.key] ?? 99);
  });
  await writeFile(importPath, JSON.stringify(importInfo, null, 2), "utf8");

  console.log(JSON.stringify({
    imported: lessonSpec.title,
    noteId,
    lessonId,
    insertedOrder: lessonSpec.order,
    pages: renderedPages.length,
    images: assets.length,
    backupDir,
    placement
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
