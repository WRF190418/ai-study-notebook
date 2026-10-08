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
    throw new Error(`Missing courseware image for page ${page}`);
  }
}

const originalContent = note.contentMarkdown;
const appendixIndex = originalContent.indexOf(appendixMarker);
if (appendixIndex < 0) {
  throw new Error("Existing appendix marker was not found; refusing to rewrite.");
}
const appendix = originalContent.slice(appendixIndex);

function img(page, caption) {
  const asset = assetsByPage.get(page);
  return `\n\n![${caption}](courseware:${asset.id})`;
}

const pageSections = [
  {
    page: 1,
    title: "封面、课程位置与指定文本",
    body: "本页给出本讲的课程身份：GFN1000 / In Dialogue with Nature（与自然对话），Lecture 3 的标题是 **The Birth of a New Physics**。指定文本有两类：Text 3a 是 I. Bernard Cohen 的 *The Birth of a New Physics* 第7章，Text 3b 是 Newton 的 *The Principia: Mathematical Principles of Natural Philosophy*。这说明本讲不是单讲 Newton 传记，而是借 Newton 解释一种新物理怎样诞生。",
    image: true
  },
  {
    page: 2,
    title: "Core questions：本讲要问什么",
    body: "课件只写出 **Core questions**，没有展开具体问题。结合后续页面，本讲的核心问题可以读成三组：Newton 为什么重要；亚里士多德式宇宙论/力学怎样被替代；近代科学为什么需要数学化、实验和范式转移。这一页是导向页，后面第3页先给科学方法，第4页给范式转移定义。"
  },
  {
    page: 3,
    title: "Scientific Method：观察、假设、实验、检验",
    body: "本页用循环图说明科学方法：Observe（观察）之后 Form Hypothesis（形成假设），再 Design & Perform Experiment（设计并执行实验），用 Test Hypothesis（实验检验假设）。如果结果是 No，就回到假设并修改；如果是 Yes，假设暂时通过检验。这里的重点不是“做一次实验就得到真理”，而是科学知识通过可检验、可修正的循环逐步形成。",
    image: true
  },
  {
    page: 4,
    title: "Paradigm shift：从亚里士多德力学到牛顿力学",
    body: "本页给出 **Paradigm shift（范式转移）**：科学革命是一个学科基本概念和实验实践的根本变化。课件把 1687 年标为 mechanics 中从 **Aristotelian mechanics** 到 **Newtonian mechanics** 的转折点，也就是 Newton 的 *Principia* 所代表的新物理正式成形。注意这里的转变不只是多了一个公式，而是关于运动、原因、证据和数学表达方式的整套改变。",
    image: true
  },
  {
    page: 5,
    title: "Outline：三段式路线",
    body: "本讲大纲是三步：Introduction to Newton（介绍 Newton）、Replacement of Aristotelian mechanics（亚里士多德力学被替换）、Importance of Newton（Newton 的重要性）。这个顺序很重要：先认识 Newton，再回头看他之前的 Copernicus、Tycho、Kepler、Galileo 等“巨人”，最后说明 Newton 怎样把这些线索统一成新物理。"
  },
  {
    page: 6,
    title: "Newton 的日期与日历问题",
    body: "本页提问 **What do you know about Newton?** 并提示 Two calendars，所以 Newton 的生卒年常写作 Isaac Newton (1642/3-1726/1727)。这是因为不同日历体系会造成年份标注差异。课件还给出 Newton Project 链接，提示学生不要只记传奇故事，而要回到可核对的历史资料。"
  },
  {
    page: 7,
    title: "空白或低文字页：需以原页图核对",
    body: "这一页 PDF 文本提取为空。它可能是过渡页、图片页或扫描识别不到文字的页。为了避免编造内容，正文只记录“无可提取文字”，完整原页保留在下方逐页附录中；复习时应打开原页图核对是否有视觉信息。",
    image: true
  },
  {
    page: 8,
    title: "Newton 的三类成就：力学、光学、数学",
    body: "本页概览 Newton 的主要贡献：calculus（微积分）、optics（光学）和 law of gravitation（引力定律）。力学方面包括 law of gravitation、laws of motion（课件提取为 monition，应按 motion 理解）和 planetary motion；光学方面包括 corpuscular theory（光的微粒说）、white light with seven colors（白光由七色组成）和 Newton's ring（牛顿环）；数学方面包括 general binomial series 和 calculus。页面还把 *Principia* 和 *Opticks* 放进人生时间线，帮助理解成果出现的顺序。",
    image: true
  },
  {
    page: 9,
    title: "Newton 的身份：自然哲学家而不只是物理学家",
    body: "本页说明 Newton 是 English mathematician、astronomer、theologian 和 physicist；在他自己的时代，他更常被称为 **natural philosopher**。他 1661 年进入 Cambridge University 的 Trinity College。课件特别指出，calculus、optics 和 law of gravitation 都与 1665 年 London Great Plague 期间有关，这把个人学术突破放进历史环境中理解。"
  },
  {
    page: 10,
    title: "Newton 的社会职位与非现代科学兴趣",
    body: "本页在第9页基础上补充 Newton 的公共身份：1703 年成为 Royal Society 会长，1696-1727 年任 Royal Mint 的 Warden and Master。同时，课件保留 alchemy（炼金术，1668-9 起）和 Biblical studies（旧约先知书解释，1673 起）。这提醒我们：Newton 不能被简化为现代学科分工中的“纯物理学家”，他的科学、宗教和炼金兴趣在历史上交织在一起。"
  },
  {
    page: 11,
    title: "Newton 的 dark sides：宗教、炼金术与科学",
    body: "本页标题是 **The Dark Sides Of Sir Isaac Newton**，列出 alchemist、magician、对世界末日的预测，以及 1692-1693 年与 Richard Bentley 的通信。课件强调 Newton 可能把科学和宗教都理解为追求 absolute truth：自然哲学可以作为上帝存在和“true religion”的支撑。这里不是让我们用今天的科学边界去嘲笑 Newton，而是看到近代科学形成时与神学、宗教解释仍有复杂关系。",
    image: true
  },
  {
    page: 12,
    title: "Newton 小结：科学革命关键人物",
    body: "本页汇总前几页内容，并明确 Newton 是 **one of the most influential scientists of all time** 和 scientific revolution 的 key figure。它把 Newton 的身份、机构位置、科学贡献、炼金术和圣经研究放在同一页，说明本讲研究 Newton 的方式是历史性的：不仅看公式，还看一个思想体系如何在具体时代中形成。"
  },
  {
    page: 13,
    title: "Newton 的形象：光明隐喻与巨人肩膀",
    body: "本页引用 Alexander Pope 的墓志铭式赞颂和 Newton 关于“站在巨人肩膀上”的说法。前者把 Newton 塑造成让自然法则显明的人；后者把重点转向前人积累。接下来第14页开始回答：这些 giants 到底是谁？所以本页是从 Newton 个人转向科学史链条的桥。"
  },
  {
    page: 14,
    title: "Who are the giants：从 Aristotle 到 Modern Science",
    body: "本页把 Middle Ages、Renaissance 和 Modern Science 放在时间线上，并说明 Aristotle's ideas dominated over 1000 years。这里的“巨人”不是只夸 Newton 前人伟大，而是提示 Newton 的新物理是在长期争论和修正中出现的。Lecture 2 的 Aristotle 是本讲被继承和被替换的起点。"
  },
  {
    page: 15,
    title: "巨人名单：从 Philoponus 到 Kepler",
    body: "本页列出若干关键人物和主题：John Philoponus、Avicenna/Averroes、Thomas Aquinas、Franciscus de Marchia、John Buridan、Copernicus、Galileo、Kepler，最后通向 Newton。课件把 Copernicus 与 heliocentric model、Galileo 与 falling bodies、Kepler 与 laws of planetary motion 联系起来。复习时不要把这些名字当孤立人物表，而要看他们分别改动了 Aristotle 框架的哪一部分。",
    image: true
  },
  {
    page: 16,
    title: "Middle Ages：运动的量化准备",
    body: "本页突出中世纪并非科学空白，而有 **Quantitative investigation**：mathematical description of motions、quantity and intensity、diagram representation。页上还连接 Text 2 Chapter 12 的主题：natural motion、projectile motion、uniform motion、uniformly accelerated motion、nonuniformly accelerated motion，以及 temperature、intensity、quantity of heat。也就是说，Newton 之前已经有人在尝试把性质、强度和运动放进可量化表示。",
    image: true
  },
  {
    page: 17,
    title: "Renaissance：数学语言与实验并重",
    body: "本页在前一页中世纪量化的基础上加入 Renaissance，并标出两个关键词：**Mathematic language** 和 **Experiment**。这就是后面 Needham 定义 modern science 的雏形：自然研究不再只是解释“为什么”，还要用数学语言描述“如何”，并通过实验或观测检验。Copernicus、Galileo、Kepler 都被放在这一过渡阶段。"
  },
  {
    page: 18,
    title: "Aristotelian Cosmology：被替换的背景",
    body: "本页以 Aristotle 和 Aristotelian Cosmology 为标题，承接 Lecture 2。它没有列出细节，但为第19-22页作铺垫：我们接下来要看地心宇宙、月上区域完美、天体圆周/不变/匀速等假设如何被新的观测和模型削弱。"
  },
  {
    page: 19,
    title: "Ptolemy 与 Copernicus：地心和日心模型",
    body: "本页对照 Ptolemy's geocentric model 和 Copernicus' heliocentric model。Ptolemy 模型中每个行星由 deferent（均轮）和 epicycle（本轮）等结构解释运动；Copernicus 则把太阳置于中心。这里要抓住模型变化的意义：不是单纯换一个中心点，而是对 Aristotle/Ptolemy 传统宇宙秩序的挑战。",
    image: true
  },
  {
    page: 20,
    title: "Copernicus 对 Aristotelian Cosmology 的冲击",
    body: "本页列出 Aristotelian Cosmology 的要点：geocentric universe、superlunar region perfect、celestial motion 中 earth is stationary、perfect circle、unchanging、uniform motion。页面用叉号标出 Copernican heliocentrism 已挑战 geocentric 和 earth stationary。注意 Copernicus 尚未完全推翻圆周、完美和匀速假设，后面 Kepler、Tycho、Galileo 继续拆解这些部分。",
    image: true
  },
  {
    page: 21,
    title: "Tycho Brahe：精确观测与超新星",
    body: "本页进入 **Just Before Newton**。Tycho Brahe 是 Kepler 的 supervisor，他通过肉眼进行准确的 planetary positions 观测。1572 年他观察到 supernova（超新星），从而说明 heaven was NOT unchanging。课件还说明 Tycho 的 geo-heliocentric system：Moon orbiting Earth，planets orbiting Sun，Sun orbiting Earth。这个模型不是 Copernicus 的完全日心说，而是一个折中体系。",
    image: true
  },
  {
    page: 22,
    title: "Tycho 怎样继续削弱 Aristotle",
    body: "本页把 Tycho 的超新星观测与 Aristotelian Cosmology 对照。叉号显示：geocentric、earth stationary、unchanging 等假设受到挑战。尤其“天界不变”的否定很关键，因为 Aristotle 把月上区域看作完美、恒常；超新星观测让“天界也会变化”成为问题。",
    image: true
  },
  {
    page: 23,
    title: "从 Tycho 到 Kepler：数据的继承",
    body: "本页把 Tycho 和 Johannes Kepler 放在一起：Tycho 证明 heaven was NOT unchanging，并留下 geo-heliocentric astronomy；Kepler inherited the astronomical observation data from Brahe。这里的关键词是 **data**。Kepler 的突破不是凭空想出，而是建立在 Tycho 精密观测数据之上。"
  },
  {
    page: 24,
    title: "Kepler 对 8 角分误差的态度",
    body: "本页引用 Kepler 对 Tycho 数据的重视：如果能忽略 8' 的经度误差，旧假说似乎还能过关；但 Kepler 没有忽略，于是走向天文学改革。课件总结为三点：gave up accepted methods、trusted the accuracy of the data、reject the perfect circle。初学者要抓住：Kepler 的科学性在于宁愿修改模型，也不轻易抹掉精确数据。",
    image: true
  },
  {
    page: 25,
    title: "Kepler 第一定律：椭圆轨道",
    body: "本页给出 Kepler's first law：planet 的 orbit 是 ellipse，Sun 位于两个 foci 之一。这一页直接反对 perfect circle。椭圆有 major axis 和 minor axis，太阳不在椭圆中心，而在焦点上。对于 Aristotle/传统天文学而言，这意味着天体运动不再必须符合“完美圆”的审美或形而上学预设。",
    image: true
  },
  {
    page: 26,
    title: "Kepler 第二定律：等面积与非匀速",
    body: "本页给出第二定律：连接 planet 和 Sun 的线段在 equal intervals of time 内扫过 equal areas，图中写 A1=A2。结果是 **NOT uniform motion**：行星有时快、有时慢。它进一步拆解 Aristotle 式天体运动中的 uniform motion 假设，也让“速度变化”成为可数学表达的关系。",
    image: true
  },
  {
    page: 27,
    title: "Kepler 第三定律：周期与半长轴",
    body: "本页给出第三定律：planet 的 orbital period 平方与 semi-major axis 的三次方成正比，即 $T^2 \\propto a^3$。这不是只描述单个行星，而是把不同行星的周期和轨道尺度放进一个数学比例关系。它强化了本讲主线：自然现象可以被数学化，而不是只用定性语言解释。",
    image: true
  },
  {
    page: 28,
    title: "Newton 前夜小结：Tycho、Kepler、Galileo",
    body: "本页总结 Newton 之前的关键变化：Tycho 证明 heaven was NOT unchanging，并提出 geo-heliocentric astronomy；Kepler 继承 Brahe 数据、信任数据并拒绝旧模型，1609 年提出椭圆轨道和等面积定律；Galileo 即将登场。页面右侧再次列出 Aristotelian Cosmology 并几乎全部打叉：geocentric、earth stationary、perfect circle、unchanging、uniform motion 都被逐步削弱。",
    image: true
  },
  {
    page: 29,
    title: "Galileo 的身份与评价",
    body: "本页介绍 Galileo Galilei：Italian astronomer、physicist、engineer、philosopher、mathematician，并称其为 father of modern observational astronomy、modern physics、science 和 modern science。这个评价为后面的望远镜观测、数学化、思想实验和实验研究作铺垫。"
  },
  {
    page: 30,
    title: "Galileo 的望远镜观测",
    body: "本页回答 What did Galileo do：改进 refracting telescope，观察 moon 上的 mountains，发现 Jupiter's satellites，并观察 sunspots。Jupiter 卫星说明并非所有天体都绕地球运行；月球山脉和太阳黑子说明天体并非完美无瑕。它们从观测层面挑战 Aristotle 的宇宙秩序。",
    image: true
  },
  {
    page: 31,
    title: "Galileo 对 Aristotelian Cosmology 的全面反驳",
    body: "本页标题是 **Totally Disproved**，把太阳黑子、月球山脉和 Aristotelian Cosmology 放在一起。叉号覆盖 geocentric universe、superlunar region perfect、earth stationary、perfect circle、unchanging、uniform motion。这里的“全面反驳”是课件表述，复习时可理解为：Galileo 的观测使 Aristotle 的天界完美与地心秩序难以维持。",
    image: true
  },
  {
    page: 32,
    title: "Mathematization：自然用数学语言书写",
    body: "本页引用 Galileo 的思想：Nature is written in the language of mathematics，并把关键词标为 **Mathematization**。这与第17页的 mathematic language 呼应。数学化意味着自然研究要寻找可表达、可计算、可比较的关系，例如几何图形、比例、速度和时间关系，而不是只给出目的论解释。"
  },
  {
    page: 33,
    title: "Thought Experiment：思想实验加入方法工具箱",
    body: "本页在 Mathematization 后加入 **Thought Experiment**。思想实验不是随便想象，而是在理想化条件下检查一个理论是否自洽。它特别适合研究现实中难以完全控制的情况，例如无阻力、不同质量物体相连、理想平面等。后面第35页会用 cannonball 与 musket ball 展开。"
  },
  {
    page: 34,
    title: "Went to Pisa? Probably not：历史传说与证据",
    body: "本页写 **Went to Pisa? Probably not.** 它提醒我们著名的 Pisa 斜塔落体故事可能不可靠。课件的重点不是八卦，而是方法论：学习科学史时要区分传奇叙事、思想实验和真实实验记录。"
  },
  {
    page: 35,
    title: "落体思想实验：重球、轻球和绳子",
    body: "本页展示 cannonball、musket ball 和 rope，并提问 Galileo 如何用思想实验反驳 Aristotle，以及科学家为什么提出思想实验。核心逻辑是：如果重物应比轻物下落更快，那么把二者绑在一起会产生矛盾预测：轻物似乎会拖慢重物，但合在一起又比单个重物更重，似乎应更快。这个矛盾迫使人重新思考“质量决定下落速度”的 Aristotle 式直觉。",
    image: true
  },
  {
    page: 36,
    title: "Galileo 的三种方法：数学化、思想实验、实验研究",
    body: "本页把 Galileo 的做法总结为三项：Mathematization、Thought Experiment、Experimental investigation。它承接第32-35页，也为第37页斜面实验铺垫。Galileo 的重要性正在于他把抽象数学、理想化推理和实际实验结合起来。"
  },
  {
    page: 37,
    title: "斜面实验：用慢速化研究落体",
    body: "本页说明 falling is too fast，因此 Galileo 让物体在 smooth inclined plane 上滑下，以便测量。他发现 velocity 与 time elapsed 成正比，并且 independent of mass。课件提取中还出现 “Falling objects have constant speed”，这与“velocity ∝ time elapsed”存在张力；整理时保留原句，同时按上下文理解为：页面重点在区分 explain why（例如 why do rocks fall）和 explain how（例如 how do rocks fall），以及 Galileo 更关注运动如何随时间变化。",
    image: true
  },
  {
    page: 38,
    title: "惯性思想：无阻力时匀速直线运动",
    body: "本页给出 Galileo 的思想实验：如果没有 resistance，球会以 constant speed in straight line forever。课件结论是 horizontal motion is inertial，即没有外力时的运动。它后来成为 Newton's First Law。这里正好从 Galileo 过渡到 Newton：Galileo 给出惯性思想的关键方向，Newton 把它放进系统化的定律结构。",
    image: true
  },
  {
    page: 39,
    title: "Are these giants correct：前人既重要又不完整",
    body: "本页再次列出从 Philoponus 到 Kepler、Galileo、Newton 的链条，并问 **Are these giants correct?** 这个问题非常关键：站在巨人肩膀上不等于前人都正确。科学史中的继承常常是“保留可用问题和方法，同时修正错误结论”。这也解释为什么 Lecture 3 要先回顾前人，再讲 Newton 的统一。"
  },
  {
    page: 40,
    title: "Hooke 与 Newton：惯性和向心吸引",
    body: "本页讲 1679-80 年 Newton 与 Hooke 关于 falling bodies path 的通信，为 Newton 提供 inertia 和 centripetal attraction 两个关键 dynamic concepts。页面还写 Hooke's Law $f=kx$，并把 Hooke 与 Newton 放在 universal law of gravitation 的发现背景中。注意 Hooke 的贡献是问题和概念刺激之一，Newton 的贡献则在后面被界定为统一和证明体系。",
    image: true
  },
  {
    page: 41,
    title: "Hooke、Halley、Wren 与 Text 3a 的问题",
    body: "本页列出 Robert Hooke、Edmond Halley、Sir Christopher Wren，并提出 Text 3a 要回答的问题：Newton 如何发现 universal law of gravitation？他对科学史的重大贡献是什么？这页是阅读导向页：不要只记 Newton 一人，而要看当时学术网络如何共同推动问题形成。"
  },
  {
    page: 42,
    title: "Cohen 的答案：统一地上与天上",
    body: "本页非常短，但概念很重：**Newton's unification of the terrestrial and celestial regions**。这就是 Cohen 解释 Newton 伟大的核心：同一套力学原则可以解释地面物体运动和天体运动。它直接替换 Aristotle 的月下/月上二分，构成本讲“新物理诞生”的中心结论。"
  },
  {
    page: 43,
    title: "Halley 彗星：数学预测带来的新科学威信",
    body: "本页讲 Halley 在 1705 年用 Newton 的方法确定 Comet Halley 周期并预测 1758 年回归。课件记录其约每 76 年回归，上次为 1986 年，下次为 2061 年。它的意义在于：Newton 式数学方法不仅解释过去，还能成功预测未来，从而使人们对 human reason aided by mathematics 产生新的敬畏。",
    image: true
  },
  {
    page: 44,
    title: "Newton actually did：定义、公理、证明",
    body: "本页回答 Newton 实际做了什么：Make Definitions（mass、motion、inertia、centripetal force），State Axioms（Newton's three laws of motion、law of universal gravitation），Prove Results（projectile motion、planetary elliptic orbits、Corollary I）。课件称其为 empirical science 的 exemplar。也就是说，Newton 的伟大不只是提出引力，而是用清晰术语、基本定律和数学证明组织整个自然研究。",
    image: true
  },
  {
    page: 45,
    title: "Needham 定义 modern science",
    body: "本页把 Aristotle、Newton、experiments、mathematisation 和 modern science 放在一起。Needham 对 modern science 的定义强调：mathematised hypotheses about natural phenomena 与 relentless experimentation 的结合。课件总结为 **Modern science = mathematization + experimentation**。这正好把第3页科学方法、第17页数学语言/实验、第32-38页 Galileo 和第44页 Newton 串起来。",
    image: true
  },
  {
    page: 46,
    title: "回到范式转移：1687 的意义",
    body: "本页重复第4页的 Paradigm shift 定义，并在图中加入 Experiments、Mathematisation、Modern Science。重复不是多余，而是形成闭环：开头先给定义，经过 Copernicus、Tycho、Kepler、Galileo、Hooke、Halley 和 Newton 后，学生现在应能理解为什么 1687 的转变是基本概念和实验实践的改变。"
  },
  {
    page: 47,
    title: "Reading task：Text 2 与 Text 3a/3b",
    body: "本页列出阅读任务：Text 2 chapter 12 optional，Text 3a，Text 3b。Text 2 与中世纪运动学、Aristotle 背景相连；Text 3a 是 Cohen 对 Newton 新物理的历史解释；Text 3b 是 Newton 的 *Principia* 文本。复习时可以按“背景问题 -> Cohen 解释 -> Newton 原文概念”的顺序阅读。"
  },
  {
    page: 48,
    title: "Reflective Journal：作业要求",
    body: "从本页开始是 Reflective Journal 作业说明。课件写明截止时间为 **March 15, 2026 (Sunday) 21:55**，英文 600-800 words 或中文 900-1200 字，并要求参考 Blackboard 模板。这里作为课件原文记录；当前整理日期是 2026-10-08，所以不要把它误当成新的待办提醒，最终以课程平台通知为准。",
    image: true
  },
  {
    page: 49,
    title: "Topic 1：自然科学观念的改变",
    body: "题目1要求基于课程 Part I 阅读，反思自己对 natural science 的 views and attitude 有哪些变化，并且至少联系两篇 texts。写作重点不是泛泛说“科学很重要”，而是要说明阅读前后具体改变了什么，并用至少两篇文本支撑。"
  },
  {
    page: 50,
    title: "Topic 2：给孩子安排前三篇文本阅读顺序",
    body: "题目2设定一个假设情境：如果你有孩子，要在不同人生阶段安排其阅读 *In Dialogue with Nature* 第一部分前三篇文本，请描述 preferred reading order 和 reasons。这个题目考查你是否理解 Plato、Aristotle、Newton 等文本在教育顺序上的不同作用，而不是只复述课堂内容。"
  },
  {
    page: 51,
    title: "Topic 3：两位学者与两个关键词",
    body: "题目3要求在 Plato、Aristotle、Newton 中选择两位学者，并为每人选一个能够描述其 understanding nature 的关键词。解释必须基于 texts，并联系 daily life、study 或 education 的反思。写作时应避免只贴标签，比如给 Newton 写“science”，而要解释这个词如何体现其方法或自然观。"
  },
  {
    page: 52,
    title: "Topic 4：为什么科学史课讨论 Plato 和 Aristotle",
    body: "题目4要求回答：为什么在 science development/history 课程中讨论 Plato 和 Aristotle 对 Nature 的哲学？这与 Lecture 3 主线直接相关：Newton 的新物理不是从空白中出现，而是在长期哲学和自然解释传统中发生转向。可从问题意识、方法、世界观和被后人修正的框架角度展开。"
  },
  {
    page: 53,
    title: "Topic 5：Aristotle 的直觉性与错误结论",
    body: "题目5指出 Aristotle's understanding of nature aligns closely with ordinary people's intuitive perceptions，但他 nonetheless arrived at many erroneous conclusions。要求至少联系 Part I 两篇文本阐述矛盾。这个题目很适合联系 Lecture 2 和 Lecture 3：直觉解释为什么有吸引力，Galileo/Newton 式数学化和实验为什么能纠正直觉。"
  },
  {
    page: 54,
    title: "Topic 6：高等教育的目的",
    body: "题目6要求作为本科生，基于 Part I 学习回答 higher education 的 purpose，并至少结合两篇文本。它不是单纯课程内容题，而是反思题：可以从学习不同自然观、训练批判性阅读、理解科学方法与人文问题的联系等方向展开，但仍需回到文本。"
  }
];

const main = `# GFN1000 Lecture 3：近代物理学的诞生（The Birth of a New Physics）

## 原始材料要点 / 概念框架

本讲的主线是：**近代物理学不是突然出现的公式集合，而是从 Aristotelian cosmology / mechanics 逐步转向 Newtonian mechanics 的范式转移。** 课件先用 scientific method 和 paradigm shift 定义问题，再介绍 Newton，随后按历史顺序追踪“巨人”：中世纪量化传统、Copernicus、Tycho、Kepler、Galileo、Hooke、Halley，最后回到 Newton 如何把地上运动和天体运动统一起来。

| 线索 | 本讲要掌握的联系 |
| --- | --- |
| Scientific Method | 观察、假设、实验、检验、修正，构成现代科学知识的循环。 |
| Paradigm shift | 1687 年前后从 Aristotelian mechanics 到 Newtonian mechanics，不只是结论改变，而是概念、证据和实践方式改变。 |
| Aristotle 背景 | 地心、月上完美、天体圆周/不变/匀速、地球静止，是本讲逐步拆解的旧框架。 |
| Mathematization | 用数学语言描述自然：Kepler 的行星定律、Galileo 的运动量化、Newton 的数学原理。 |
| Experimentation | 通过观测、实验和思想实验检验理论，不再只依赖直觉解释。 |
| Newton 的贡献 | 通过 definitions、axioms、proofs 和 universal gravitation 统一 terrestrial and celestial regions。 |

## 放入规则理解

GFN1000 现有章节顺序为 Lecture 1 → Tutorial 1 → Lecture 2 → Tutorial 2 → Tutorial 3。Lecture 3 的主题是 **The Birth of a New Physics**，内容接在 Lecture 2 的 Aristotle 自然哲学之后，解释旧宇宙论和力学如何被 Copernicus、Tycho、Kepler、Galileo 与 Newton 替换；同时它又应放在围绕 Aristotle / 中世纪运动学复习的 Tutorial 2 之前。因此本笔记应作为新的 **Lecture 3** 插在 Lecture 2 和 Tutorial 2 中间，后续 Tutorial 顺延。

## 逐页详细讲解

${pageSections
  .map((section) => {
    const caption = `Lecture 3 第${section.page}页：${section.title}`;
    return `### 第${section.page}页｜${section.title}\n\n${section.body}${section.image ? img(section.page, caption) : ""}`;
  })
  .join("\n\n")}

## 本讲重点总结

1. **Newton 的伟大在于统一。** Cohen 强调 Newton 统一了 terrestrial and celestial regions，使地面落体和天体运行不再属于两套不同物理。
2. **现代科学由数学化和实验共同构成。** Kepler 的比例定律、Galileo 的运动量化、Newton 的数学证明都体现 mathematization；Tycho 的观测、Galileo 的实验和 scientific method 体现 experimentation。
3. **范式转移是多层替换。** Copernicus 挑战地心与地球静止，Tycho 挑战天界不变，Kepler 挑战完美圆和匀速，Galileo 挑战天界完美并发展惯性思想，Newton 完成系统化统一。
4. **前人不必全对才重要。** 本讲的“巨人”既包含正确洞见，也包含被后人修正的模型；科学进步经常是保留问题、方法和数据，同时替换解释框架。

## 复习提示

- 复习时先画一条链：Aristotle → Middle Ages quantitative investigation → Copernicus → Tycho → Kepler → Galileo → Hooke/Halley → Newton。
- 每个人至少记一个“拆解了旧框架哪一部分”：Copernicus 拆地心，Tycho 拆天界不变，Kepler 拆完美圆和匀速，Galileo 拆天界完美并给出惯性方向，Newton 统一地上和天上。
- 公式重点：Kepler 第三定律 $T^2 \\propto a^3$，Hooke's Law $f=kx$，以及 Newton 的三定律/万有引力在本讲中作为体系化框架出现。
- 第48-54页是 Reflective Journal 题目，不是本讲物理概念本身，但它们说明课程希望你把科学史、文本阅读和教育反思联系起来。

## 逐页覆盖核对

正文已经为第1-54页分别建立独立小节。第7页 PDF 文本提取为空，已明确标注并保留原页图；第37页“velocity 与 time 成正比”与提取句“Falling objects have constant speed”存在表述张力，正文已保留并说明需要以原页和课堂语境核对。所有完整原页图和提取文字仍保存在下面的逐页课件核对附录中，方便放大检查公式、图像和多栏排版。
`;

const nextContent = `${main.trim()}\n\n${appendix.trim()}\n`;
const headings = [...nextContent.matchAll(/^### 第\d+页｜/gm)].length;
const refs = [...nextContent.matchAll(/\(courseware:([^)]+)\)/g)].map((match) => match[1]);
const knownAssetIds = new Set(db.mediaAssets.map((asset) => asset.id));
const missingRefs = refs.filter((id) => !knownAssetIds.has(id));

if (headings !== 54) {
  throw new Error(`Expected 54 page headings, got ${headings}`);
}
if (missingRefs.length > 0) {
  throw new Error(`Unknown courseware references: ${missingRefs.join(", ")}`);
}

fs.mkdirSync(backupDir, { recursive: true });
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupPath = path.join(backupDir, `before-rewrite-gfn1000-lecture3-pagewise-${timestamp}.json`);
fs.writeFileSync(backupPath, JSON.stringify(note, null, 2), "utf8");

note.contentMarkdown = nextContent;
note.summary =
  "GFN1000 Lecture 3 逐页整理：从科学方法和范式转移出发，按第1-54页讲解 Newton、新物理诞生、Aristotle 框架的逐步替换、Copernicus/Tycho/Kepler/Galileo/Hooke/Halley 的作用，以及 Reflective Journal 题目要求。";
note.updatedAt = new Date().toISOString();

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), "utf8");

console.log(
  JSON.stringify(
    {
      noteId,
      headings,
      coursewareRefs: refs.length,
      chars: nextContent.length,
      backupPath
    },
    null,
    2
  )
);
