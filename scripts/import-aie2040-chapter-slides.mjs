import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { nanoid } from "nanoid";
import sharp from "sharp";

const root = process.cwd();
const dataRoot = path.join(root, "data");
const reviewRoot = path.join(dataRoot, "aie2040-chapters");
const dbPath = path.join(dataRoot, "app-db.json");
const mediaDir = path.join(dataRoot, "media");
const appendixMarker = "\n<!-- courseware-appendix -->\n";
const userId = "_9hLO-wve3Rp84FB21L0x";

const specs = [
  {
    key: "chapter1", pages: 147, lessonTitle: "Chapter 1：概率——从试验到不确定性推理",
    noteTitle: "Chapter 1 Probability 概率逐页详解", subtitle: "Events, counting, conditional probability, independence and Bayes", accent: "cobalt", icon: "function",
    framework: "本章从“试验—样本空间—事件”建立概率语言，再由集合运算和概率公理推出加法规则。排列组合处理有限等可能模型；条件概率缩小并重新归一化参考范围；独立性刻画联合概率能否分解；全概率与 Bayes 定理把来源、证据和后验判断连接起来。",
    review: "复习时先画清样本空间与事件，再决定用直接求和、计数、条件化还是来源分解。计数必须保证分子分母采用同一种结果单位；条件概率要分清方向；独立不等于互斥；Bayes 计算要同时保留先验、似然和证据总概率。",
    segments: [
      [4, 29, "事件与概率规则", "从试验和样本空间出发，把自然语言翻译成事件的并、交、补与差；再由三条概率公理推导补集、单调性、加法、inclusion-exclusion 与 union bound。"],
      [30, 50, "有序样本与组合", "先判断基本结果是否等可能，再按“顺序是否重要、是否放回”选择乘法原理、排列或组合。分子与分母必须用一致的计数单位。"],
      [51, 73, "计数恒等式与应用", "用对称、Pascal 递推、二项式展开、多项式系数与 stars and bars 处理重复对象和分组；数量向量不一定等概率。"],
      [74, 93, "条件概率与树图", "条件化只保留条件事件并重新归一化；树图沿路径相乘、互斥路径相加，无放回时分母逐步变化。"],
      [94, 115, "独立性与重复试验", "独立要求联合概率分解；两两独立弱于 mutual independence。重复试验的“至少一次”常用全部失败的补事件，公共原因会破坏冗余系统的独立假设。"],
      [116, 139, "全概率与 Bayes 定理", "先用互斥完备分区展开证据总概率，再以先验乘似然并归一化得到后验；罕见类别的 precision 会强烈受 prevalence 影响。"],
      [140, 146, "方法总结与练习答案", "把每个答案与对应 lecture 练习逐项对齐，检查事件翻译、计数单位、条件方向、代入与概率范围。"]
    ]
  },
  {
    key: "chapter2", pages: 139, lessonTitle: "Chapter 2：离散分布",
    noteTitle: "Chapter 2 Discrete Distributions 离散分布逐页详解", subtitle: "PMF, CDF, expectation, moments and named count distributions", accent: "teal", icon: "chart",
    framework: "本章把试验结果映射为离散随机变量，用 PMF 与 CDF 描述分布，再用期望、方差、阶乘矩和 MGF 概括中心、波动与矩。后半章按生成机制区分 Hypergeometric、Bernoulli/Binomial、Geometric、Negative Binomial 与 Poisson。",
    review: "选模型前先问随机变量究竟“数什么”：固定次数内成功数、首次成功等待次数、第 r 次成功的试验位置、无放回抽样成功数，还是连续曝光区间内事件数。写出支持集和参数 convention，再算概率、均值与方差。",
    segments: [
      [4, 27, "随机变量、PMF、CDF 与超几何分布", "随机变量把多个试验结果汇总为数值，映到同一取值的概率要相加。PMF 给点质量，CDF 累加质量；无放回成功数由 Hypergeometric 模型描述。"],
      [28, 44, "数学期望", "期望是概率加权平均。求函数期望可直接对原分布加权；线性期望不要求独立，指示变量把计数拆成若干 0-1 变量。"],
      [45, 59, "方差、阶乘矩与 MGF", "方差是相对均值的平方偏离；MGF 在零点邻域存在时，其导数给出各阶矩。无限求和、积分与求导交换需要收敛条件。"],
      [60, 81, "Bernoulli 与 Binomial", "Binomial 必须有固定次数、独立试验和相同成功率。指定成功序列与成功总数不同，后者要乘选择成功位置的组合数。"],
      [82, 108, "Geometric 与 Negative Binomial", "随机量从“固定次数内成功数”改成“达到成功目标的等待次数”。几何分布等到第一次成功；负二项等到第 r 次成功，最后一试固定为成功。"],
      [109, 131, "Poisson 计数", "Poisson 描述连续曝光区间的事件数，参数等于该区间期望计数；单位率乘曝光时长才是分布参数。稀有独立 Bernoulli 计数可近似 Poisson。"],
      [132, 138, "计算清单与练习答案", "逐题核对随机变量定义、支持集、停止规则、参数化、尾事件方向与最终数值。"]
    ]
  },
  {
    key: "chapter3", pages: 143, lessonTitle: "Chapter 3：连续分布",
    noteTitle: "Chapter 3 Continuous Distributions 连续分布逐页详解", subtitle: "Densities, moments, normal models, lifetime laws and censoring", accent: "violet", icon: "atom",
    framework: "本章从密度曲线面积定义概率，连接 PDF、CDF 与分位数，再讨论连续期望、方差和 MGF。Exponential、Gamma、Chi-square 与 Normal 构成主要分布族；hazard/survival 连接寿命模型；混合分布与 censoring 说明连续模型也可能包含点质量。",
    review: "连续题先写支持集，概率由区间面积而不是单点高度给出。Gamma 使用 shape-scale，Exponential 的均值是 scale，Normal 第二参数是 variance。寿命题同时看 density、survival、hazard；有原子或删失时检查 CDF 跳跃。",
    segments: [
      [4, 23, "密度、CDF 与分位数", "连续概率是密度在区间上的面积，密度可大于 1 而单点概率为 0；CDF 累积面积，分位数反向寻找指定累计概率的位置。"],
      [24, 46, "矩与指数等待时间", "连续期望用积分加权。Poisson 过程中“等待超过 t”等价于前 t 时间无到达，得到 exponential survival 与无记忆性。"],
      [47, 68, "Gamma 与 Chi-square", "Gamma 的 shape 控制形状、scale 控制横向尺度；正整数 shape 表示第 k 次 Poisson 到达时间。Chi-square 是 Gamma 特例并由标准正态平方和产生。"],
      [69, 94, "Normal 分布", "正态模型由均值和方差决定；标准化把原量纲转换为距均值的标准差数。Gaussian integral、完成平方和 MGF 支撑概率与矩公式。"],
      [95, 114, "Hazard 与寿命模型", "hazard 是已存活至 t 条件下的瞬时失败率，累计 hazard 的负指数给 survival。Weibull shape 可表示递减、常数或递增风险，Gompertz 风险指数增长。"],
      [115, 135, "混合分布与删失", "混合分布同时含点质量和密度，CDF 跳跃记录原子。ReLU 把负输入集中到 0；右删失把超过上限的寿命集中到端点。"],
      [136, 142, "计算清单与练习答案", "逐题检查支持集、归一化、参数 convention、积分范围、点质量与单位。"]
    ]
  },
  {
    key: "chapter4", pages: 128, lessonTitle: "Chapter 4：二元分布",
    noteTitle: "Chapter 4 Bivariate Distributions 二元分布逐页详解", subtitle: "Joint laws, covariance, conditioning and bivariate normal models", accent: "rose", icon: "network",
    framework: "本章从联合 PMF/PDF 出发，通过对另一变量求和或积分得到边缘分布；联合分解刻画独立性。Covariance 与 correlation 描述线性共同变化，条件分布和条件期望利用已观察变量更新预测；离散表格、二维支持区域和二元正态是核心载体。",
    review: "二维题先写联合支持集，再决定区域求和或积分顺序。边缘分布是完整切片的总质量；条件分布是切片除以边缘量后重新归一化。零相关通常不等于独立，只有附加联合二元正态条件时才可推出。",
    segments: [
      [4, 21, "离散联合分布", "联合 PMF 单元格给一对取值同时发生的概率；事件是选中单元格之和，行列求和得到边缘分布。Trinomial 计数因总数约束形成三角支持。"],
      [22, 41, "协方差、相关与回归", "协方差看中心化偏差是否同号，相关系数再按标准差缩放。零相关只排除线性关系；最小二乘线用协方差与方差决定斜率。"],
      [42, 62, "条件分布与条件预测", "给定 X 后保留相应联合切片并重新归一化。条件均值是使用 X 信息时最小化均方误差的预测，tower property 与 total variance 把条件量还原为总体量。"],
      [63, 77, "连续联合分布", "二维概率是在事件与支持集交集上积分；边缘密度是完整切片积分。三角、矩形或曲边区域决定积分上下限。"],
      [78, 97, "连续条件分布", "条件密度用联合密度除以边缘密度。垂直切片的宽度和边界决定条件范围，因此条件均值可以是直线或非线性曲线。"],
      [98, 120, "二元正态", "二元正态等高线为椭圆；给定 X 后 Y 仍正态，均值按相关性移动且方差缩小。只有联合二元正态时，零相关等价于独立。"],
      [121, 127, "方法图与练习答案", "把区域概率、边缘化、条件化、协方差与条件正态各题对应到正确入口，并核对支持集和标准化。"]
    ]
  },
  {
    key: "chapter5", pages: 155, lessonTitle: "Chapter 5：随机变量函数的分布",
    noteTitle: "Chapter 5 Distributions of Functions 随机变量函数分布逐页详解", subtitle: "Transformations, sampling distributions, CLT and convergence", accent: "amber", icon: "sparkles",
    framework: "本章先求一元与多元变换后的分布：单调变换用逆函数导数，多分支变换汇总各逆像，二维变换用 Jacobian，和的分布用 convolution。随后从独立样本推出和、均值、样本方差、t、F、Chi-square 的精确分布，最后用 CLT、Markov、Chebyshev 和大数定律处理近似与收敛。",
    review: "变换题先定新支持集再列逆像；多分支不能漏根，二维不能漏 Jacobian 与映射区域。抽样分布要分清精确结论和渐近近似；CLT 需要 iid 与有限方差，离散正态近似还要 continuity correction。",
    segments: [
      [4, 23, "一元变量变换", "从新变量 CDF 出发处理不等式。单调变换使用逆函数导数；非一一映射必须汇总所有逆像；inverse CDF 可用于抽样。"],
      [24, 47, "二维变换、卷积与比例分布", "二维变换先求逆映射和支持集，再乘 Jacobian 绝对值。和的密度由卷积给出；同 scale Gamma 的总量与比例产生 Gamma/Beta，平方比产生 F。"],
      [48, 72, "随机样本、和、均值与 MGF", "随机样本要求 iid。期望相加不要求独立，方差相加需处理协方差；样本均值方差按 1/n 缩小。独立和的 MGF 是各 MGF 的乘积。"],
      [73, 96, "正态抽样分布", "正态样本均值在任意 n 下精确正态。正交分解证明均值与样本方差独立，残差平方和为 Chi-square，Studentized 均值为 t，方差比为 F。"],
      [97, 118, "CLT 与离散近似", "iid 有限方差时标准化均值趋近正态。近似 Binomial/Poisson 时匹配均值方差并做连续性修正；强依赖、重尾或小样本可能失效。"],
      [119, 145, "概率界、收敛与 CLT 证明", "Markov 与 Chebyshev 给有限样本尾界并推出弱大数定律；MGF 或 characteristic function 的零点展开与独立乘积给出分布收敛证明。"],
      [146, 154, "练习答案与完整证明扩展", "逐题核对变换支持集、Jacobian、线性组合方差、t 统计量、连续性修正和收敛条件；最后用特征函数补足只假设有限方差的 CLT。"]
    ]
  }
];

const hash = (value) => createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
const safeAlt = (value) => String(value).replace(/[\[\]\r\n]/g, " ").replace(/\s+/g, " ").trim();
const pageLines = (page) => page.text.split(/\r?\n/).map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean);

function englishTitle(page) {
  const list = pageLines(page);
  if (!list.length) return `Page ${page.number}`;
  const roleOnly = /^(T\d+|Definition|Proof of T\d+|Worked example|Worked derivation|Derivation|Corollary|Construction|Solution)$/i.test(list[0]);
  return (roleOnly && list[1] ? `${list[0]}: ${list[1]}` : list[0]).replace(/\s+\|\s+/g, "：").slice(0, 120);
}

function segmentFor(spec, page) {
  return spec.segments.find(([start, end]) => page.number >= start && page.number <= end) || [1, spec.pages, "章节导览与来源", spec.framework];
}

function roleFor(page) {
  const title = englishTitle(page);
  if (page.number === 1) return "cover";
  if (/Teaching map|Course map/i.test(title)) return "map";
  if (/Scope|Conventions|prerequisites/i.test(title)) return "scope";
  if (/^Lecture \d/i.test(title)) return "lecture";
  if (/Practice/i.test(title)) return "practice";
  if (/Solution/i.test(title)) return "solution";
  if (/Proof|Derivation/i.test(title)) return "proof";
  if (/Worked|example|calculation/i.test(title)) return "worked";
  if (/Definition/i.test(title)) return "definition";
  if (/^T\d|Theorem/i.test(title)) return "theorem";
  if (/References|Textbook/i.test(title)) return "reference";
  return "concept";
}

function formulaFor(page) {
  const t = `${englishTitle(page)} ${page.text}`;
  const rules = [
    [/De Morgan/i, "$$\n(A\\cup B)^c=A^c\\cap B^c,\\qquad (A\\cap B)^c=A^c\\cup B^c.\n$$"],
    [/Addition rule|inclusion/i, "$$\nP(A\\cup B)=P(A)+P(B)-P(A\\cap B).\n$$"],
    [/Conditional probability|chain rule/i, "$$\nP(A\\mid B)=\\frac{P(A\\cap B)}{P(B)},\\qquad P(A\\cap B)=P(A)P(B\\mid A).\n$$"],
    [/Independent events|Independence is|Repeated trials/i, "$$\nP(A\\cap B)=P(A)P(B),\\qquad P(\\text{at least one})=1-(1-p)^n.\n$$"],
    [/Law of total probability/i, "$$\nP(A)=\\sum_i P(A\\mid B_i)P(B_i).\n$$"],
    [/Bayes/i, "$$\nP(B_j\\mid A)=\\frac{P(A\\mid B_j)P(B_j)}{\\sum_iP(A\\mid B_i)P(B_i)}.\n$$"],
    [/Probability mass function|Discrete CDF/i, "$$\np_X(x)=P(X=x),\\qquad F_X(t)=\\sum_{x\\le t}p_X(x).\n$$"],
    [/Expectation|weighted average|Linearity/i, "$$\nE[g(X)]=\\sum_x g(x)p_X(x),\\qquad E[a+bX]=a+bE[X].\n$$"],
    [/Variance identities|Variance is/i, "$$\n\\operatorname{Var}(X)=E[X^2]-E[X]^2.\n$$"],
    [/binomial probability mass/i, "$$\nP(X=x)=\\binom nx p^x(1-p)^{n-x}.\n$$"],
    [/Geometric waiting/i, "$$\nP(T=k)=(1-p)^{k-1}p,\\qquad k=1,2,\\ldots\n$$"],
    [/negative binomial trial-count/i, "$$\nP(T_r=k)=\\binom{k-1}{r-1}p^r(1-p)^{k-r}.\n$$"],
    [/Poisson PMF/i, "$$\nP(X=k)=e^{-\\lambda}\\frac{\\lambda^k}{k!},\\qquad E[X]=\\operatorname{Var}(X)=\\lambda.\n$$"],
    [/continuous probability model|CDF, intervals/i, "$$\nP(a<X\\le b)=\\int_a^b f_X(x)\\,dx,\\qquad F_X(x)=\\int_{-\\infty}^x f_X(u)\\,du.\n$$"],
    [/Exponential rate|Exponential MGF/i, "$$\nf(x)=\\frac1\\theta e^{-x/\\theta},\\qquad S(x)=e^{-x/\\theta}.\n$$"],
    [/Gamma shape|Gamma moments/i, "$$\nf(x)=\\frac{x^{\\alpha-1}e^{-x/\\theta}}{\\Gamma(\\alpha)\\theta^\\alpha},\\qquad E[X]=\\alpha\\theta.\n$$"],
    [/normal density|Normal standardization/i, "$$\nZ=\\frac{X-\\mu}{\\sigma}\\sim N(0,1).\n$$"],
    [/Hazard determines|hazard rate/i, "$$\nh(t)=\\frac{f(t)}{S(t)},\\qquad S(t)=\\exp\\!\\left(-\\int_0^t h(u)\\,du\\right).\n$$"],
    [/Marginalization|marginal PMF/i, "$$\np_X(x)=\\sum_y p_{X,Y}(x,y).\n$$"],
    [/Covariance identities|Covariance measures/i, "$$\n\\operatorname{Cov}(X,Y)=E[XY]-E[X]E[Y],\\qquad \\rho=\\frac{\\operatorname{Cov}(X,Y)}{\\sigma_X\\sigma_Y}.\n$$"],
    [/conditional density/i, "$$\nf_{Y\\mid X}(y\\mid x)=\\frac{f_{X,Y}(x,y)}{f_X(x)}.\n$$"],
    [/tower property/i, "$$\nE[E(Y\\mid X)]=E[Y].\n$$"],
    [/Total variance/i, "$$\n\\operatorname{Var}(Y)=E[\\operatorname{Var}(Y\\mid X)]+\\operatorname{Var}(E[Y\\mid X]).\n$$"],
    [/monotone change|several branches/i, "$$\nf_Y(y)=\\sum_{x:g(x)=y}f_X(x)\\left|\\frac{dx}{dy}\\right|.\n$$"],
    [/Jacobian|two-dimensional transformation/i, "$$\nf_{\\mathbf Y}(\\mathbf y)=f_{\\mathbf X}(\\mathbf h(\\mathbf y))\\left|\\det D\\mathbf h(\\mathbf y)\\right|.\n$$"],
    [/Convolution|sum density/i, "$$\nf_{X+Y}(s)=\\int_{-\\infty}^{\\infty}f_X(x)f_Y(s-x)\\,dx.\n$$"],
    [/sample mean|Exact moments of a sample mean/i, "$$\nE[\\bar X]=\\mu,\\qquad \\operatorname{Var}(\\bar X)=\\frac{\\sigma^2}{n}.\n$$"],
    [/Studentized sample mean|Student’s t/i, "$$\n\\frac{\\bar X-\\mu}{S/\\sqrt n}\\sim t_{n-1}.\n$$"],
    [/central limit theorem|standardized mean/i, "$$\n\\frac{\\sqrt n(\\bar X-\\mu)}{\\sigma}\\xrightarrow{d}N(0,1).\n$$"],
    [/Chebyshev/i, "$$\nP(|\\bar X-\\mu|\\ge\\varepsilon)\\le\\frac{\\sigma^2}{n\\varepsilon^2}.\n$$"]
  ];
  return rules.find(([pattern]) => pattern.test(t))?.[1] || "";
}

function proofGuide(page) {
  const t = `${englishTitle(page)} ${page.text}`;
  if (/set|De Morgan|outcome/i.test(t)) return "取任意结果逐一比较它属于等式两边的条件。";
  if (/count|position|arrangement|Pascal/i.test(t)) return "对同一对象用两种方式计数，或先加标签再除去重复排列。";
  if (/conditional|Bayes|ratio/i.test(t)) return "从条件概率的比值定义出发，展开联合概率并约分或归一化。";
  if (/MGF|moment|differentiat/i.test(t)) return "先确认零点邻域内收敛，再求导并在零点代入。";
  if (/normal|square|Gaussian/i.test(t)) return "完成平方，把被积函数拆成标准正态核与参数常数。";
  if (/Jacobian|transform/i.test(t)) return "写逆变换与新支持集，用 Jacobian 绝对值保证小区域概率守恒。";
  if (/variance|covariance|least|error/i.test(t)) return "中心化后展开平方或乘积，利用零均值使交叉项消失。";
  if (/hazard|survival/i.test(t)) return "由 S'(t)=-f(t) 与 h=f/S 得到微分方程，再积分指数化。";
  if (/CLT|characteristic|remainder/i.test(t)) return "在零点作二阶展开，利用独立性取乘积并识别正态极限。";
  return "先写目标量和适用条件，再沿页面给出的分解、变量代换或代数恒等式逐步连接。";
}

function detailFor(page) {
  const t = `${englishTitle(page)} ${page.text}`;
  const rules = [
    [/sample space|Events collect|Set operations|Union and intersection/i, "样本空间必须保留问题所需的全部信息；事件是结果集合，并集表示至少一个发生，交集表示同时发生，补集表示未发生。"],
    [/probability axioms|Relative frequency/i, "三条公理是非负、全集概率为1、互斥事件可加；频率稳定只提供建模动机，不取代概率模型的假设。"],
    [/Complement|De Morgan|Neither event/i, "补事件常把“至少一个”转成“全部都不”，De Morgan 定律负责把并与交在取补后互换。"],
    [/Addition rule|inclusion|Union bound|Monotonicity/i, "一般事件相加会把交集重复计数，必须扣除；union bound 放弃交集修正换取容易计算的上界。"],
    [/finite uniform|equally likely|ordered dice/i, "只有基本结果等可能时才能用有利数除以总数；把有序骰子对压成点数和会破坏等可能性。"],
    [/Permutation|ordered samples|shrinking pool|Multiplication principle/i, "有序无放回时可选数逐步减少，得到 n!/(n-r)!；有放回时每个位置始终有 n 个选择。"],
    [/Combination|committee|selected set|consistent outcomes/i, "无序选择把同一集合的 r! 种排列合并，因此组合数为 n!/[r!(n-r)!]。概率分子和分母必须同为有序或同为无序。"],
    [/Pascal|binomial identities|distinguishable arrangements|repeated objects/i, "Pascal 递推按固定对象是否被选分类；重复对象排列先视为有标签，再除以各类型内部排列数。"],
    [/stars and bars|count vectors/i, "r 个星号与 n-1 个隔板对应 n 个非负整数之和为 r；允许空组意味着隔板可相邻，但这些数量向量未必等概率。"],
    [/Conditional probability|conditioning changes|retained column|direction of the condition/i, "条件化只保留条件事件所在的行、列或区域，再除以条件事件总概率；P(A|B) 与 P(B|A) 的参考范围不同。"],
    [/chain rule|Multiply along paths|Birthday collisions|hash buckets/i, "沿同一条条件路径相乘，不同互斥路径相加；生日碰撞先求所有生日不同，再取补，比直接枚举碰撞更简洁。"],
    [/mutual independence|pairwise|common causes|reliability/i, "两两独立只检查每一对，mutual independence 还要检查所有子集合；公共原因会让看似冗余的部件同时失败。"],
    [/partition|total probability/i, "分区必须互斥且覆盖全集；目标事件在各来源中的条件概率乘来源权重后相加，才得到总体概率。"],
    [/Bayes|posterior|prevalence|likelihood ratio|Naive Bayes/i, "后验权重正比于先验乘似然。低 prevalence 会让误报在全部阳性中占很大比例；Naive Bayes 额外假设给定类别后特征条件独立。"],
    [/random variable assigns|mapping collects|many outcomes/i, "随机变量是从试验结果到数值的函数；不同结果映到同一数值时，点质量要把所有逆像概率相加。"],
    [/Probability mass function|Discrete CDF|jump size|endpoint choices/i, "PMF 在支持集上非负且总和为1；离散 CDF 是阶梯函数，某点跳跃高度正好等于该点 PMF，端点是否包含会改变概率。"],
    [/hypergeometric|finite supply/i, "超几何分布用于有限总体无放回抽样；支持集同时受样本量、总体成功数和总体失败数限制。"],
    [/Expectation|weighted average|function expectation|Indicator variables|tail-sum/i, "期望是概率加权平均；E[g(X)] 可直接用原分布计算。指示变量的期望等于事件概率，能把复杂计数拆成简单和。"],
    [/best constant squared-error|balance point/i, "均值是最小化常数平方预测误差的位置；它是质量分布的平衡点，但偏态分布中通常不同于中位数。"],
    [/Variance|same mean|factorial moments/i, "方差比较围绕均值的平方偏离；相同均值可对应完全不同的离散程度，因此中心与波动必须分别报告。"],
    [/Moment-generating|MGF|Derivatives generate/i, "MGF 在0附近存在时编码全部原点矩，斜率给均值、二阶导数结合均值给方差；存在区间是使用唯一性与求导的条件。"],
    [/Bernoulli|binomial experiment|success count|sample fraction/i, "Bernoulli 记录一次0-1结果；Binomial 固定试验次数并统计成功数，要求独立且成功率相同。样本比例方差为 p(1-p)/n。"],
    [/geometric|first success|memoryless/i, "几何分布计数到首次成功的试验次数，支持集从1开始；已经失败若干次后，剩余等待仍服从相同分布。"],
    [/negative binomial|rth success|failures before/i, "负二项以第r次成功为停止点；若 T_r=k，最后一次固定成功，只在前k-1次中安排r-1次成功。"],
    [/Poisson|rare-event|exposure|event rate/i, "Poisson 参数是整段曝光中的期望计数 λ=率×曝光量；均值与方差都等于λ，但同均值并不足以证明数据服从 Poisson。"],
    [/density|area under|CDF slope|Uniform distribution|quantile|percentile/i, "连续概率由密度面积给出而非曲线高度；CDF 在可微处的斜率是密度，分位数则反向寻找累计面积达到指定比例的位置。"],
    [/exponential|first waiting|memorylessness|requests to a service/i, "Poisson 过程中等待超过t等价于t内零次到达。Exponential 的 rate 与 scale 互为倒数，使用前必须确认课件采用哪种参数。"],
    [/Gamma|Erlang|kth Poisson arrival|gamma function/i, "Gamma 的 shape 控制形状、scale 控制尺度；正整数 shape 时是第k次到达时间，均值 αθ、方差 αθ²。"],
    [/chi-square|degrees of freedom|squared standard normal/i, "Chi-square 是独立标准正态平方和；自由度记录独立平方项数，并决定密度形状和上尾临界值。"],
    [/normal|Gaussian|standardization|68-95|complete the square/i, "标准化保持概率面积不变，只把坐标改为离均值多少个标准差；正态的完成平方技巧用于 MGF、条件分布和积分。"],
    [/hazard|survival|Weibull|Gompertz/i, "hazard 是存活到t后的瞬时失败率，累计 hazard 决定 survival。Weibull shape 小于、等于、大于1分别对应递减、常数、递增风险。"],
    [/mixed|atom|zero-inflated|ReLU|censor|truncation/i, "混合分布的 CDF 跳跃记录点质量。ReLU 把负半轴压到0；删失保留观测但只知道超过界限，截断则改变样本进入条件。"],
    [/joint probability mass|joint table|marginalization|trinomial/i, "联合表每格是同时取值的概率，整行或列求和得到边缘分布；边缘相同仍可隐藏完全不同的依赖结构。"],
    [/covariance|correlation|uncorrelated|co-movement/i, "协方差看中心化偏差乘积，相关系数再消除单位。零相关只说明无线性共同变化，确定性的曲线关系仍可能存在。"],
    [/best linear predictor|least-squares|regression|residual/i, "最小均方线性预测斜率为 Cov(X,Y)/Var(X)，截距使直线经过均值点；残差与常数和X正交。"],
    [/conditional PMF|conditional mean|tower property|Total variance/i, "条件分布把联合切片归一化；tower property 对条件均值再平均得到总体均值，total variance 分解为组内与组间变异。"],
    [/joint probability density|triangular support|rectangle probabilities|gap event/i, "二维积分限由支持集与事件区域共同决定。先画边界再定积分顺序，可避免把三角支持误当完整矩形。"],
    [/continuous conditional|slanted strip|curved support/i, "条件密度是联合密度除以边缘密度；支持集的垂直切片决定给定X时Y的范围，因而条件均值可为直线或曲线。"],
    [/bivariate normal|ellipse|conditional normal|correlated measurements/i, "二元正态的相关系数控制椭圆倾斜与条件均值，条件方差为 σ_Y²(1-ρ²)；仅有正态边缘不足以保证联合正态。"],
    [/monotone change|several branches|squaring merges|lognormal/i, "变换先确定新支持集和所有逆像。单调分支用逆导数修正密度，多分支要把每个根的贡献相加。"],
    [/inverse-transform|probability integral/i, "均匀变量送入目标 CDF 的广义反函数可生成目标分布；反过来，连续变量代入自身 CDF 得到均匀分布。"],
    [/Jacobian|two-dimensional transformation|area change/i, "二维变换要同时求逆映射、新支持集和 Jacobian 绝对值；该因子补偿局部面积伸缩以保持概率。"],
    [/convolution|sum density|overlap length/i, "卷积沿所有可能分解 s=x+(s-x) 积分；支持区间的重叠长度随s改变，均匀变量之和因此得到分段三角密度。"],
    [/gamma total and proportion|Beta densities|ratio and total/i, "同 scale 的独立 Gamma 变量转为总量与比例后，联合密度分解成 Gamma 与 Beta，说明总量和比例独立。"],
    [/F distribution|scaled squares|degrees of freedom/i, "F 是两个独立 Chi-square 分别除以自由度后的比值；取倒数会交换分子分母自由度。"],
    [/Box.Muller|normal simulation/i, "Box-Muller 把两个独立均匀变量变成极坐标半径和角度，Jacobian 使输出分解为两个独立标准正态。"],
    [/random sample|linear combination|sample mean|mini-batch/i, "iid 样本均值保持总体均值，方差缩为 σ²/n；若样本相关，协方差项会形成无法靠增大批量完全消除的方差下限。"],
    [/MGF of a linear|Bernoulli sums|Poisson counts add|normal squares add/i, "独立和的 MGF 是各 MGF 的乘积；识别乘积形式可证明 Binomial、Poisson、Gamma 与 Normal/Chi-square 的封闭性。"],
    [/normal sample mean|sample mean and variance|orthogonal|Student|variance ratios/i, "正态样本中均值与残差方向正交并独立；残差平方和给 Chi-square，未知方差标准化均值得到 t，两个方差比得到 F。"],
    [/central limit|normal approximation|continuity correction|Cauchy averages/i, "CLT 处理标准化和或均值；离散计数近似正态时整数格要扩成宽度1的区间并做±0.5连续性修正。Cauchy 无有限方差，均值不会按该结论集中。"],
    [/Markov|Chebyshev|Weak law|convergence in probability/i, "Markov 用非负变量均值控制尾部，Chebyshev 对平方偏差应用 Markov；样本均值偏离固定误差的概率趋零即弱大数定律。"],
    [/continuity theorem|MGF limit|Proof of the CLT|characteristic function/i, "MGF 证明在零点二阶展开并利用独立乘积；只假设有限方差时改用始终存在的 characteristic function 控制余项。"]
  ];
  return rules.find(([pattern]) => pattern.test(t))?.[1] || "";
}

function figureHint(page) {
  const t = `${englishTitle(page)} ${page.text}`;
  if (/table|marginal|joint|conditional probabilities/i.test(t)) return "先读行列变量与总计；单元格是联合质量，整行或列之和是边缘量，条件化把选定切片重新缩放到总和为 1。";
  if (/density|PMF|CDF|distribution|quantile|tail|survival|hazard/i.test(t)) return "横轴先确认随机变量与支持集，纵轴区分质量、密度、累计概率或风险率；连续密度看面积，CDF 看累计高度和跳跃。";
  if (/support|region|triangle|rectangle|strip|Jacobian/i.test(t)) return "先沿边界写支持集，再与事件取交；改变积分顺序时重写上下限，变换图还要核对 Jacobian 的面积伸缩。";
  if (/tree|Bayes|source|detector|alert/i.test(t)) return "沿单一路径相乘、互斥路径相加；后验比较要同时看来源先验与来源产生证据的概率。";
  if (/scatter|correlation|regression|cloud|ellipse|residual/i.test(t)) return "先读横纵轴和均值中心，再看点云方向、曲率与残差；非线性形状不能用零相关排除。";
  if (/practice|solution|Worked/i.test(t)) return "圈出给定量、所求量与模型假设，再沿公式或阴影区域核对代入，并检查概率范围、单位和数量级。";
  return "按“目标量—条件—变形—结论”阅读；核对支持集、参数范围、等号方向、求和或积分范围和绝对值 Jacobian。";
}

function shouldInline(page) {
  const title = englishTitle(page);
  if (page.number === 1 || /Teaching map|Course map|Scope|Conventions|References|Textbook alignment|coverage/i.test(title) || /^Lecture \d/i.test(title)) return false;
  return /Proof|Derivation|Worked|example|practice|Solution|Definition|^T\d|Theorem|density|CDF|PMF|distribution|support|region|table|tree|curve|cloud|ellipse|hazard|survival|quantile|probability|count|sampling|variance|mean|MGF|moment|transform|Jacobian|convolution|normal|Gamma|Poisson|binomial|geometric|Bayes|correlation|regression|independen|censor|ReLU|CLT|Markov|Chebyshev/i.test(title);
}

function narrative(spec, page) {
  const [, , topic, explanation] = segmentFor(spec, page);
  const role = roleFor(page);
  const title = englishTitle(page);
  const formula = formulaFor(page);
  const detail = detailFor(page);
  const teaching = detail ? `${explanation}\n\n${detail}` : explanation;
  let text;
  if (role === "cover") text = `${spec.framework} 本页为封面，确认章节主题与后续六个 lecture 单元。`;
  else if (role === "map") text = `本页给出 teaching map。学习顺序是定义和规则、定理与证明、图形或例题、练习和章末核对；各块共同服务于“${topic}”。`;
  else if (role === "scope") text = "本页规定教材范围、符号和参数 convention。后续计算须沿用这些约定，特别要核对支持集、不等号端点、Normal 第二参数以及 Gamma/Exponential 的 rate 或 scale。";
  else if (role === "lecture") text = `本页开启“${topic}”单元并给出目标。${teaching} 后续定义、证明、图形和练习都围绕该目标展开。`;
  else if (role === "proof") text = `${teaching}\n\n证明切入点：${proofGuide(page)} 复习时要能指出所用定义、支持集和收敛条件，而不是只背最后一行。`;
  else if (role === "worked") text = `${teaching}\n\n题目先写清给定分布、参数和支持集，再把所求事件翻译成求和、积分、补事件、条件切片或变量变换；最后用范围、单位和极端情形检查结果。`;
  else if (role === "practice") text = `${teaching}\n\n本页练习应先独立列出每小题的已知量、所求量和方法，再到章末对应 Solution 核对；不能从答案反推并省略中间理由。`;
  else if (role === "solution") text = `${teaching}\n\n本页承接对应 lecture 练习。核对随机变量定义、支持集、条件方向、参数化、代入步骤及近似条件，概率结果还应落在 [0,1] 内。`;
  else if (role === "reference") text = "本页说明教材章节、课堂证明和教学扩展的覆盖边界，用于确认材料来源；未提供的外部内容不在本笔记覆盖承诺内。";
  else if (role === "definition") text = `${teaching}\n\n本页给出正式定义。把每个符号与随机变量、支持集和参数范围对应；条件不满足时不能直接套用。`;
  else if (role === "theorem") text = `${teaching}\n\n本页结论可重复使用，但应先核对前提，再说明目标量位于公式哪一侧以及该结论为何比从定义重算更省步骤。`;
  else text = `${teaching}\n\n本页具体推进“${title}”：先辨认对象和条件，再把图、表或公式放回本单元的概念链，避免只记页面标题。`;
  return formula ? `${text}\n\n${formula}` : text;
}

function excerpt(page) {
  if (!["worked", "practice", "solution"].includes(roleFor(page))) return "";
  const raw = pageLines(page).slice(1, 9).join("\n");
  return raw ? `\n\n**题面或结果原文（OCR 辅助）：**\n\n~~~text\n${raw}\n~~~\n\nOCR 可能误认上下标、根号与希腊字母；具体符号按下方完整原页图核对。` : "";
}

function buildAppendix(material, assets) {
  const pages = material.pages.map((page) => {
    const text = page.text.trim() ? `~~~text\n${page.text.trim()}\n~~~` : "本页 OCR 未可靠识别到文字；请以完整原页图为准。";
    return `### 第 ${page.number} 页\n\n${text}\n\n![${safeAlt(`${material.sourceFile} 第${page.number}页完整原页`)}](/api/media/${assets.get(page.number).id})`;
  }).join("\n\n");
  return `${appendixMarker.trimStart()}\n\n## 逐页课件核对\n\n来源：${material.sourceFile}，共 ${material.pageCount} 页。原 PDF 为整页图片；以下 OCR 仅用于检索，可能误认公式、上下标、希腊字母和多栏顺序，完整原页图才是版面与公式核对依据。正文每个页标题右侧的原课件按钮与这里同页原图一一匹配。\n\n${pages}`;
}

function vocabularyFor(key) {
  const groups = {
    chapter1: [
      ["试验与事件", "experiment", "随机试验", "说明可能结果以及概率模型适用的重复机制"],
      ["试验与事件", "outcome", "结果／样本点", "样本空间中的一个基本结果，常记为 ω"],
      ["试验与事件", "sample space", "样本空间", "所有可能结果的集合，记为 S 或 Ω"],
      ["试验与事件", "event", "事件", "样本空间的子集"],
      ["集合运算", "union", "并集", "A∪B：至少一个事件发生"],
      ["集合运算", "intersection", "交集", "A∩B：两个事件同时发生"],
      ["集合运算", "complement", "补集", "Aᶜ：事件 A 不发生"],
      ["集合运算", "difference", "差集", "A\\B：A 发生但 B 不发生"],
      ["集合运算", "disjoint / mutually exclusive", "不相交／互斥", "不能同时发生；不要与 independent 混淆"],
      ["概率规则", "probability axiom", "概率公理", "非负、全集为 1、互斥可加"],
      ["概率规则", "relative frequency", "相对频率", "重复试验中事件出现次数除以总次数"],
      ["概率规则", "monotonicity", "单调性", "A⊆B 时 P(A)≤P(B)"],
      ["概率规则", "addition rule", "加法公式", "相加后减去被重复计算的交集"],
      ["概率规则", "inclusion-exclusion", "容斥原理", "多个事件并集的系统修正公式"],
      ["概率规则", "union bound", "并集上界", "P(∪Aᵢ)≤ΣP(Aᵢ)，不要求独立"],
      ["计数", "multiplication principle", "乘法原理", "分阶段选择数相乘，需明确每阶段可选数"],
      ["计数", "ordered sample", "有序样本", "结果顺序不同视为不同"],
      ["计数", "with replacement", "有放回", "每次选择后对象回到总体"],
      ["计数", "without replacement", "无放回", "可选总体随抽取缩小"],
      ["计数", "permutation", "排列", "顺序重要的不放回选择"],
      ["计数", "combination", "组合", "只关心选中集合，不关心顺序"],
      ["计数", "binomial coefficient", "二项式系数", "C(n,r)，同时表示组合数"],
      ["计数", "Pascal recursion", "Pascal 递推", "按指定对象是否被选入进行分类"],
      ["计数", "multinomial coefficient", "多项式系数", "把不同对象分入多个有标签组"],
      ["计数", "stars and bars", "隔板法", "计数非负整数解或有放回无序选择"],
      ["条件概率", "conditional probability", "条件概率", "P(A|B)：在 B 已发生的范围内讨论 A"],
      ["条件概率", "renormalize", "重新归一化", "把保留区域的总概率缩放为 1"],
      ["条件概率", "multiplication rule", "乘法公式", "P(A∩B)=P(A)P(B|A)"],
      ["条件概率", "chain rule", "链式法则", "联合事件按连续条件概率展开"],
      ["条件概率", "probability tree", "概率树", "沿路径相乘，互斥路径相加"],
      ["独立性", "independent events", "独立事件", "联合概率等于边缘概率乘积"],
      ["独立性", "pairwise independence", "两两独立", "只检查每一对事件"],
      ["独立性", "mutual independence", "相互独立", "所有非空子集合都满足乘积规则"],
      ["独立性", "repeated trials", "重复试验", "常配合补事件求至少一次成功"],
      ["独立性", "reliability", "可靠性", "系统结构决定使用串联还是并联事件"],
      ["独立性", "conditional independence", "条件独立", "给定第三个条件后联合概率才分解"],
      ["Bayes", "partition", "分区", "互斥且并集覆盖整个样本空间"],
      ["Bayes", "law of total probability", "全概率公式", "按可能来源加权汇总目标概率"],
      ["Bayes", "prior probability", "先验概率", "观察当前证据前对假设的概率"],
      ["Bayes", "likelihood", "似然", "给定假设时观察到证据的概率"],
      ["Bayes", "evidence", "证据", "Bayes 公式的归一化分母"],
      ["Bayes", "posterior probability", "后验概率", "观察证据后更新的假设概率"],
      ["Bayes", "likelihood ratio", "似然比", "证据在两个假设下支持强度的比值"],
      ["Bayes", "posterior odds", "后验优势比", "先验优势比乘似然比"],
      ["Bayes", "prevalence", "基准发生率／流行率", "罕见事件检测中决定 precision 的关键先验"],
      ["Bayes", "sensitivity", "灵敏度", "P(+|真实为正)"],
      ["Bayes", "false positive rate", "假阳性率", "P(+|真实为负)"],
      ["Bayes", "precision", "精确率／阳性预测值", "P(真实为正|检测为正)"],
      ["Bayes", "Naive Bayes", "朴素 Bayes", "假设给定类别后各特征条件独立"]
    ],
    chapter2: [
      ["随机变量", "random variable", "随机变量", "把试验结果映射为实数的函数"],
      ["随机变量", "discrete random variable", "离散随机变量", "支持集有限或可数"],
      ["随机变量", "support", "支持集", "随机变量可能取到且有正概率的值"],
      ["分布函数", "probability mass function (PMF)", "概率质量函数", "pX(x)=P(X=x)，质量总和为 1"],
      ["分布函数", "cumulative distribution function (CDF)", "累积分布函数", "FX(t)=P(X≤t)，离散情形为阶梯函数"],
      ["分布函数", "jump size", "跳跃大小", "CDF 在某点的跳跃等于该点概率"],
      ["分布函数", "normalization", "归一化", "选择常数使全部概率质量和为 1"],
      ["变量函数", "transformation", "变量变换", "Y=g(X)，相同输出的输入概率要相加"],
      ["变量函数", "many-to-one", "多对一", "多个 X 值映射到同一个 Y 值"],
      ["抽样模型", "hypergeometric distribution", "超几何分布", "有限总体无放回抽样的成功数"],
      ["抽样模型", "finite population", "有限总体", "对象总数 N 固定且成功对象数 K 固定"],
      ["矩", "expectation / expected value", "期望／数学期望", "按概率加权的平均"],
      ["矩", "probability-weighted average", "概率加权平均", "每个取值乘其概率再求和"],
      ["矩", "linearity of expectation", "期望线性性", "不要求随机变量独立"],
      ["矩", "indicator variable", "指示变量", "事件发生取 1，否则取 0"],
      ["矩", "tail-sum identity", "尾和公式", "非负整数变量的期望可由尾概率求和"],
      ["矩", "variance", "方差", "相对均值的平方偏离期望"],
      ["矩", "standard deviation", "标准差", "方差平方根，与原变量单位相同"],
      ["矩", "factorial moment", "阶乘矩", "E[X(X-1)…]，计数分布中常简化推导"],
      ["矩", "moment-generating function (MGF)", "矩母函数", "MX(t)=E[e^{tX}]"],
      ["矩", "moment", "矩", "MGF 在 0 处的导数给原点矩"],
      ["矩", "uniqueness theorem", "唯一性定理", "零点邻域内相同 MGF 对应相同分布"],
      ["Bernoulli/Binomial", "Bernoulli trial", "Bernoulli 试验", "一次只有成功与失败两种结果"],
      ["Bernoulli/Binomial", "success probability", "成功概率", "通常记为 p，失败概率 q=1-p"],
      ["Bernoulli/Binomial", "binomial distribution", "二项分布", "固定 n 次独立同成功率试验的成功数"],
      ["Bernoulli/Binomial", "success count", "成功次数", "Binomial 随机变量实际计数的对象"],
      ["Bernoulli/Binomial", "sample proportion", "样本比例", "成功数 X 除以试验次数 n"],
      ["Bernoulli/Binomial", "tail probability", "尾概率", "超过或不超过阈值的一组质量之和"],
      ["Bernoulli/Binomial", "probability recurrence", "概率递推", "利用相邻质量比避免重复算阶乘"],
      ["等待分布", "stopping rule", "停止规则", "决定随机变量何时停止计数"],
      ["等待分布", "geometric distribution", "几何分布", "直到第一次成功的试验次数"],
      ["等待分布", "memorylessness", "无记忆性", "已等待时间不改变剩余等待分布"],
      ["等待分布", "negative binomial distribution", "负二项分布", "直到第 r 次成功的试验次数"],
      ["等待分布", "trial-count convention", "试验次数口径", "把成功的最终试验也计入"],
      ["等待分布", "failure-count convention", "失败次数口径", "只数第 r 次成功前的失败数"],
      ["Poisson", "Poisson process", "Poisson 过程", "按连续曝光量产生事件的计数过程"],
      ["Poisson", "rate", "速率", "每单位时间或长度的平均事件数"],
      ["Poisson", "exposure", "曝光量", "观察时间、长度、面积等规模"],
      ["Poisson", "Poisson distribution", "Poisson 分布", "参数 λ 的事件计数模型"],
      ["Poisson", "rare-event approximation", "稀有事件近似", "n 大、p 小、np 稳定时 Binomial 近似 Poisson"],
      ["模型比较", "sampling mechanism", "抽样机制", "判断 Binomial 与 Hypergeometric 的首要依据"],
      ["模型比较", "overdispersion", "过度离散", "实际方差大于 Poisson 均值"],
      ["模型比较", "underdispersion", "不足离散", "实际方差小于 Poisson 均值"]
    ],
    chapter3: [
      ["连续基础", "continuous random variable", "连续随机变量", "概率由区间积分给出"],
      ["连续基础", "probability density function (PDF)", "概率密度函数", "非负且全域积分为 1"],
      ["连续基础", "density", "密度", "有倒数单位，可以大于 1，不是单点概率"],
      ["连续基础", "area under the curve", "曲线下面积", "连续概率的几何解释"],
      ["连续基础", "cumulative distribution function (CDF)", "累积分布函数", "从负无穷累计到阈值的概率"],
      ["连续基础", "point probability", "单点概率", "连续分布中 P(X=x)=0"],
      ["连续基础", "uniform distribution", "均匀分布", "有限区间上密度恒定"],
      ["连续基础", "quantile", "分位数", "累计概率达到指定 p 的阈值"],
      ["连续基础", "median", "中位数", "下方累计概率至少为 1/2 的分位数"],
      ["连续基础", "inverse CDF", "逆累积分布函数", "从概率水平反求变量值"],
      ["矩与尾部", "integrability", "可积性", "确保期望绝对收敛"],
      ["矩与尾部", "heavy tail", "重尾", "尾部衰减慢，可能使高阶矩发散"],
      ["矩与尾部", "finite moment", "有限矩", "相应积分存在且有限"],
      ["Exponential", "waiting time", "等待时间", "事件发生前经过的连续时间"],
      ["Exponential", "exponential distribution", "指数分布", "常数 hazard 的正值等待模型"],
      ["Exponential", "rate parameter", "速率参数", "单位时间事件率 λ"],
      ["Exponential", "scale parameter", "尺度参数", "θ=1/λ，也是指数分布均值"],
      ["Exponential", "survival function", "生存函数", "S(t)=P(T>t)"],
      ["Exponential", "memorylessness", "无记忆性", "经过时间不改变剩余等待分布"],
      ["Gamma/Chi-square", "gamma function", "Gamma 函数", "把阶乘推广到正实数"],
      ["Gamma/Chi-square", "gamma distribution", "Gamma 分布", "正值变量的 shape-scale 分布族"],
      ["Gamma/Chi-square", "shape parameter", "形状参数", "控制密度形状与偏度"],
      ["Gamma/Chi-square", "scale parameter", "尺度参数", "控制横向伸缩与均值"],
      ["Gamma/Chi-square", "Erlang distribution", "Erlang 分布", "整数 shape 的 Gamma，到达时间解释"],
      ["Gamma/Chi-square", "chi-square distribution", "卡方分布", "独立标准正态平方和的分布"],
      ["Gamma/Chi-square", "degrees of freedom", "自由度", "独立平方项或独立残差方向的数量"],
      ["Gamma/Chi-square", "upper-tail cutoff", "上尾临界值", "右侧尾概率等于指定水平的截点"],
      ["Normal", "normal / Gaussian distribution", "正态／高斯分布", "由均值 μ 与方差 σ² 决定"],
      ["Normal", "Gaussian integral", "高斯积分", "证明正态核归一化的关键积分"],
      ["Normal", "standard normal", "标准正态", "均值 0、方差 1 的正态变量"],
      ["Normal", "standardization", "标准化", "减均值再除以标准差"],
      ["Normal", "z-score", "标准分数", "距均值多少个标准差"],
      ["Normal", "symmetry", "对称性", "左右尾概率可互相转换"],
      ["Normal", "percentile", "百分位数", "给定累计比例对应的变量值"],
      ["寿命模型", "lifetime model", "寿命模型", "描述失效或事件时间的概率模型"],
      ["寿命模型", "hazard rate", "风险率／失效率", "已存活到 t 后的瞬时失败率"],
      ["寿命模型", "cumulative hazard", "累计风险", "H(t)=∫h(u)du，决定 survival"],
      ["寿命模型", "Weibull distribution", "Weibull 分布", "可表示递减、常数或递增 hazard"],
      ["寿命模型", "aging", "老化效应", "hazard 随时间上升"],
      ["寿命模型", "Gompertz distribution", "Gompertz 分布", "hazard 随时间指数增长"],
      ["混合与观测", "mixed distribution", "混合分布", "同时含点质量与连续密度"],
      ["混合与观测", "atom / point mass", "原子／点质量", "某个单点有正概率"],
      ["混合与观测", "zero-inflated", "零膨胀", "零点拥有额外概率质量"],
      ["混合与观测", "ReLU", "修正线性单元", "max(0,Z)，在 0 处产生点质量"],
      ["混合与观测", "censoring", "删失", "保留样本但只知道超过或低于界限"],
      ["混合与观测", "right censoring", "右删失", "真实值超过观测上限"],
      ["混合与观测", "truncation", "截断", "不满足范围的对象不进入样本"],
      ["混合与观测", "endpoint atom", "端点原子", "capping 后集中在上限处的概率质量"]
    ],
    chapter4: [
      ["联合分布", "bivariate distribution", "二元分布", "同时描述两个随机变量"],
      ["联合分布", "joint PMF", "联合概率质量函数", "离散变量一对取值的联合概率"],
      ["联合分布", "joint PDF", "联合概率密度函数", "二维区域概率的积分核"],
      ["联合分布", "joint support", "联合支持集", "允许的 (x,y) 取值区域"],
      ["联合分布", "marginal distribution", "边缘分布", "忽略另一个变量后的单变量分布"],
      ["联合分布", "marginalization", "边缘化", "对另一变量求和或积分"],
      ["联合分布", "factorization", "因子分解", "独立时联合分布等于边缘分布乘积"],
      ["联合分布", "trinomial distribution", "三项分布", "每次试验分入三个互斥类别的计数模型"],
      ["联合分布", "triangular support", "三角支持集", "计数总和约束或不等式形成的区域"],
      ["依赖性", "covariance", "协方差", "中心化变量乘积的期望"],
      ["依赖性", "co-movement", "共同变化", "两个变量偏差同号或异号的趋势"],
      ["依赖性", "correlation coefficient", "相关系数", "标准化协方差，范围 [-1,1]"],
      ["依赖性", "positive correlation", "正相关", "一个变量增大时另一个线性上升"],
      ["依赖性", "negative correlation", "负相关", "一个变量增大时另一个线性下降"],
      ["依赖性", "uncorrelated", "不相关", "协方差为 0，不保证独立"],
      ["依赖性", "linear dependence", "线性依赖", "可由直线趋势描述的依赖"],
      ["回归", "best linear predictor", "最佳线性预测", "使总体均方预测误差最小的直线"],
      ["回归", "least squares", "最小二乘", "最小化平方残差的方法"],
      ["回归", "regression line", "回归直线", "用 X 预测 Y 的总体线性函数"],
      ["回归", "slope", "斜率", "X 增加一单位时线性预测的变化量"],
      ["回归", "intercept", "截距", "使预测线经过均值点的常数项"],
      ["回归", "residual", "残差", "观测值减预测值"],
      ["回归", "orthogonality", "正交性", "最优残差与常数及预测变量内积为 0"],
      ["条件分布", "conditional PMF", "条件 PMF", "离散联合切片除以边缘概率"],
      ["条件分布", "conditional PDF", "条件 PDF", "连续联合密度除以边缘密度"],
      ["条件分布", "conditional mean", "条件均值", "E[Y|X=x]，给定信息后的中心"],
      ["条件分布", "conditional variance", "条件方差", "给定信息后的剩余不确定性"],
      ["条件分布", "tower property", "塔式法则", "E[E(Y|X)]=E[Y]"],
      ["条件分布", "law of total variance", "全方差公式", "总体方差=组内平均+组间方差"],
      ["条件分布", "mean squared error (MSE)", "均方误差", "平方预测误差的期望"],
      ["条件分布", "conditional expectation", "条件期望", "所有 X 函数中最优的 MSE 预测"],
      ["积分区域", "integration region", "积分区域", "事件与联合支持集的交集"],
      ["积分区域", "iterated integral", "累次积分", "按一个变量再另一个变量积分"],
      ["积分区域", "joint CDF", "联合 CDF", "P(X≤a,Y≤b)"],
      ["积分区域", "rectangle probability", "矩形概率", "用四个联合 CDF 值做容斥"],
      ["二元正态", "bivariate normal", "二元正态", "具有椭圆等高线的联合正态模型"],
      ["二元正态", "density contour", "密度等高线", "联合密度相同的点组成的曲线"],
      ["二元正态", "ellipse", "椭圆", "相关结构在等高线中的几何表现"],
      ["二元正态", "conditional normal distribution", "条件正态分布", "给定一个坐标后另一个仍为正态"],
      ["二元正态", "conditional variance reduction", "条件方差缩减", "观察 X 后 Y 方差乘 1-ρ²"],
      ["二元正态", "degenerate distribution", "退化分布", "|ρ|=1 时概率集中在直线上"],
      ["二元正态", "standardized residual", "标准化残差", "去除条件均值后缩放的独立噪声"]
    ],
    chapter5: [
      ["一元变换", "distribution of a function", "随机变量函数的分布", "已知 X，求 Y=g(X) 的分布"],
      ["一元变换", "change of variable", "变量代换", "用逆变换和导数修正密度"],
      ["一元变换", "monotone transformation", "单调变换", "整个支持集上只有一个逆分支"],
      ["一元变换", "inverse function", "逆函数", "由 y 反解原变量 x"],
      ["一元变换", "inverse branch", "逆像分支", "非单调变换中每个满足 g(x)=y 的根"],
      ["一元变换", "absolute derivative", "导数绝对值", "一维密度伸缩修正因子"],
      ["一元变换", "lognormal distribution", "对数正态分布", "正态变量取指数后的右偏正值分布"],
      ["一元变换", "inverse-transform sampling", "逆变换抽样", "将 Uniform(0,1) 送入目标逆 CDF"],
      ["一元变换", "probability integral transform", "概率积分变换", "连续变量代入自身 CDF 后服从均匀分布"],
      ["二维变换", "multivariate transformation", "多元变量变换", "同时变换多个随机变量"],
      ["二维变换", "Jacobian", "Jacobian 行列式", "修正局部面积或体积伸缩"],
      ["二维变换", "inverse mapping", "逆映射", "从新变量解回原变量"],
      ["二维变换", "mapped support", "映射后支持集", "变换后允许的新变量区域"],
      ["二维变换", "convolution", "卷积", "独立变量之和的密度积分"],
      ["二维变换", "overlap length", "重叠长度", "均匀卷积中决定密度的允许积分区间"],
      ["比例分布", "beta distribution", "Beta 分布", "0 到 1 上的比例分布"],
      ["比例分布", "total and proportion", "总量与比例", "Gamma 变量和及其占比的变换"],
      ["比例分布", "F distribution", "F 分布", "两个独立缩放 Chi-square 的比值"],
      ["模拟", "Box-Muller transform", "Box-Muller 变换", "由两个独立均匀变量生成两个独立标准正态"],
      ["随机样本", "random sample", "随机样本", "独立同分布的一组观测"],
      ["随机样本", "independent and identically distributed (iid)", "独立同分布", "CLT 与经典抽样分布的核心条件"],
      ["随机样本", "linear combination", "线性组合", "常数加权随机变量之和"],
      ["随机样本", "sample mean", "样本均值", "观测之和除以样本量"],
      ["随机样本", "sampling distribution", "抽样分布", "统计量在重复抽样下的分布"],
      ["随机样本", "standard error", "标准误", "统计量抽样分布的标准差"],
      ["随机样本", "variance reduction", "方差缩减", "iid 均值方差按 1/n 缩小"],
      ["随机样本", "variance floor", "方差下限", "相关样本使增大 n 后仍残留的方差"],
      ["MGF", "MGF of a sum", "和的 MGF", "独立时等于各 MGF 乘积"],
      ["MGF", "distributional identification", "分布识别", "通过匹配已知 MGF 确认分布"],
      ["精确抽样分布", "sample variance", "样本方差", "用 n-1 分母估计总体方差"],
      ["精确抽样分布", "residual sum of squares", "残差平方和", "偏离样本均值的平方和"],
      ["精确抽样分布", "orthogonal transformation", "正交变换", "保持长度与标准正态独立结构"],
      ["精确抽样分布", "mean-variance independence", "均值与方差独立", "正态样本特有的重要性质"],
      ["精确抽样分布", "Student's t distribution", "Student t 分布", "未知方差标准化正态均值产生的分布"],
      ["精确抽样分布", "Studentized mean", "学生化均值", "用样本标准差替代未知 σ 的统计量"],
      ["精确抽样分布", "degrees of freedom", "自由度", "样本方差中为 n-1"],
      ["精确抽样分布", "variance ratio", "方差比", "两个独立样本方差比较产生 F"],
      ["渐近理论", "central limit theorem (CLT)", "中心极限定理", "标准化 iid 均值趋近标准正态"],
      ["渐近理论", "convergence in distribution", "依分布收敛", "CDF 在连续点趋近极限 CDF"],
      ["渐近理论", "normal approximation", "正态近似", "用匹配均值方差的正态替代复杂计数分布"],
      ["渐近理论", "continuity correction", "连续性修正", "离散整数边界改为半整数边界"],
      ["渐近理论", "binomial approximation", "二项分布近似", "用正态或 Poisson 近似 Binomial"],
      ["渐近理论", "Poisson approximation", "Poisson 近似", "稀有事件 Binomial 的近似"],
      ["概率界", "Markov's inequality", "Markov 不等式", "以非负变量期望控制上尾"],
      ["概率界", "Chebyshev's inequality", "Chebyshev 不等式", "仅用均值方差控制双侧偏离"],
      ["概率界", "convergence in probability", "依概率收敛", "偏离固定 ε 的概率趋于 0"],
      ["概率界", "weak law of large numbers", "弱大数定律", "样本均值依概率收敛到总体均值"],
      ["概率界", "finite-sample guarantee", "有限样本保证", "无需渐近就成立的概率上界"],
      ["证明工具", "continuity theorem for MGFs", "MGF 连续性定理", "MGF 收敛用于推出分布收敛"],
      ["证明工具", "characteristic function", "特征函数", "E[e^{itX}]，始终存在"],
      ["证明工具", "Taylor expansion", "Taylor 展开", "CLT 证明中保留到二阶项"],
      ["证明工具", "remainder term", "余项", "证明展开误差在极限下可忽略"],
      ["反例", "Cauchy distribution", "Cauchy 分布", "均值与方差不存在，样本均值不按普通 CLT 集中"]
    ]
  };
  return groups[key] || [];
}

function buildVocabularyTable(spec) {
  const rows = vocabularyFor(spec.key);
  const cell = (value) => value.replaceAll("|", "\\|");
  const body = rows.map((row) => `| ${row.map(cell).join(" | ")} |`).join("\n");
  return `## 英语术语分类总表

以下术语覆盖本章正文、定理、例题、图表和练习中需要主动掌握的专业英语。复习时应做到：看到英文能说出中文含义，看到公式能解释术语所指对象，并能区分同组内容易混淆的概念。

| 类别 | English | 中文 | 掌握重点 |
| --- | --- | --- | --- |
${body}`;
}

function buildNote(spec, material, assets) {
  let inline = 0;
  const sections = material.pages.map((page) => {
    const [, , topic] = segmentFor(spec, page);
    const title = englishTitle(page);
    let image = "";
    if (shouldInline(page)) {
      inline += 1;
      image = `\n\n![${safeAlt(`${material.sourceFile}，第${page.number}页：${title}`)}](/api/media/${assets.get(page.number).id})\n\n*${material.sourceFile}，第${page.number}页；用于核对“${safeAlt(title)}”中的公式、题干、图表或推导。*\n\n读图提示：${figureHint(page)}`;
    }
    return `### 第${page.number}页｜${topic}：${title}\n\n${narrative(spec, page)}${excerpt(page)}${image}`;
  }).join("\n\n");
  const main = `# ${spec.noteTitle}

## 概念框架

${spec.framework}

## 逐页详细讲解

${sections}

## 本章联系与复习

${spec.review}

## 逐页覆盖核对

本笔记按 PDF 原序覆盖第1页至第${material.pageCount}页，共 ${material.pageCount} 个独立正文小节；每个页标题均可打开对应完整原页。正文按内容选择 ${inline} 页直接插入公式、图表、区域、例题、练习或答案原图并配“读图提示”；完整 ${material.pageCount} 页原图与 OCR 文本保留在附录。原文件没有可提取文本层，OCR 误差不作为公式依据。`;
  return { content: `${main.trim()}\n\n${buildVocabularyTable(spec)}\n\n${buildAppendix(material, assets)}`, inline };
}

function flashcards(spec) {
  const cards = {
    chapter1: [["条件概率分母表示什么？", "条件事件发生后保留的新参考范围。"], ["独立与互斥有何区别？", "独立是联合概率可分解；互斥是不能同时发生。"], ["Bayes 分母为何必要？", "汇总所有来源产生证据的贡献并归一化后验。"]],
    chapter2: [["Binomial 与 Hypergeometric 的区别？", "独立重复试验与有限总体无放回抽样。"], ["Geometric 与 Negative Binomial 数什么？", "达到第1次或第r次成功所需试验次数。"], ["Poisson 参数含义？", "给定曝光区间中的期望事件数。"]],
    chapter3: [["密度值为何不是概率？", "连续概率是区间上的积分面积。"], ["hazard 与 survival 的关系？", "h=f/S，累计风险的负指数给出 S。"], ["censoring 如何制造点质量？", "把超过上限的概率集中到端点。"]],
    chapter4: [["如何得到边缘分布？", "对另一个变量全部取值求和或积分。"], ["零相关意味着独立吗？", "一般不；联合二元正态时才成立。"], ["条件期望的预测意义？", "它最小化基于 X 的均方预测误差。"]],
    chapter5: [["非单调变换为何分支？", "同一 y 的所有逆像贡献都要相加。"], ["Jacobian 的作用？", "修正局部面积伸缩以保持概率。"], ["CLT 基本条件与结论？", "iid、有限非零方差时标准化均值趋近标准正态。"]]
  }[spec.key];
  return cards.map(([front, back], i) => ({ id: nanoid(), front, back, difficulty: i ? "medium" : "easy" }));
}

function mindMap(spec) {
  return [{ id: nanoid(), label: spec.lessonTitle, children: spec.segments.slice(0, 6).map((item) => ({ id: nanoid(), label: item[2] })) }];
}

function protectedView(db, courseId, targetTitles) {
  const lessonIds = new Set(db.lessons.filter((x) => x.courseId === courseId && targetTitles.has(x.title)).map((x) => x.id));
  const noteIds = new Set(db.notes.filter((x) => lessonIds.has(x.lessonId)).map((x) => x.id));
  return {
    users: db.users,
    preferences: db.preferences,
    passwordResets: db.passwordResets,
    courses: db.courses.filter((x) => x.id !== courseId),
    lessons: db.lessons.filter((x) => x.courseId !== courseId),
    notes: db.notes.filter((x) => !noteIds.has(x.id)),
    media: db.mediaAssets.filter((x) => !noteIds.has(x.noteId))
  };
}

function validate(db, note, pages, inline, expectedVocabularyTerms) {
  const [main, appendix = ""] = note.contentMarkdown.split(appendixMarker);
  const mainPages = [...main.matchAll(/^### 第(\d+)页｜/gm)].map((m) => Number(m[1]));
  const appendixPages = [...appendix.matchAll(/^### 第 (\d+) 页/gm)].map((m) => Number(m[1]));
  if (mainPages.length !== pages || !mainPages.every((n, i) => n === i + 1)) throw new Error(`${note.title}: main page coverage`);
  if (appendixPages.length !== pages || !appendixPages.every((n, i) => n === i + 1)) throw new Error(`${note.title}: appendix coverage`);
  const appendixImages = (appendix.match(/!\[[^\]\n]+\]\(\/api\/media\/[A-Za-z0-9_-]+\)/g) || []).length;
  const mainImages = (main.match(/!\[[^\]\n]+\]\(\/api\/media\/[A-Za-z0-9_-]+\)/g) || []).length;
  const hints = (main.match(/读图提示：/g) || []).length;
  if (appendixImages !== pages || mainImages !== inline || hints !== inline) throw new Error(`${note.title}: image or hint coverage`);
  const vocabularyHeadings = (main.match(/^## 英语术语分类总表$/gm) || []).length;
  const vocabularySection = main.split(/^## 英语术语分类总表$/m)[1] || "";
  const vocabularyTerms = (vocabularySection.match(/^\| (?!类别 \|)(?!--- \|).+ \|$/gm) || []).length;
  if (vocabularyHeadings !== 1 || vocabularyTerms !== expectedVocabularyTerms) throw new Error(`${note.title}: vocabulary coverage`);
  if (/courseware:|\{\{page:|[A-Z]:\\/.test(note.contentMarkdown)) throw new Error(`${note.title}: unresolved reference`);
  const mediaIds = new Set(db.mediaAssets.map((x) => x.id));
  const missing = [...note.contentMarkdown.matchAll(/\/api\/media\/([A-Za-z0-9_-]+)/g)].map((m) => m[1]).filter((id) => !mediaIds.has(id));
  if (missing.length) throw new Error(`${note.title}: missing media`);
  const fences = (main.match(/^\$\$$/gm) || []).length;
  if (fences % 2) throw new Error(`${note.title}: unmatched math fence`);
  return { pages, sourceButtons: appendixImages, inlineFigures: mainImages, hints, formulas: fences / 2, vocabularyTerms, contentChars: note.contentMarkdown.length, contentHash: hash(note.contentMarkdown), appendixHash: hash(note.contentMarkdown.slice(note.contentMarkdown.indexOf(appendixMarker))) };
}

const baseline = JSON.parse(await fs.readFile(dbPath, "utf8"));
const course = baseline.courses.find((x) => x.userId === userId && x.code === "AIE2040");
if (!course) throw new Error("AIE2040 course not found");
const targetTitles = new Set(specs.map((x) => x.lessonTitle));
const protectedBefore = hash(protectedView(baseline, course.id, targetTitles));
const next = structuredClone(baseline);
const now = new Date().toISOString();
const stamp = now.replace(/[:.]/g, "-");
const backupDir = path.join(dataRoot, "backups", `aie2040-chapters-import-${stamp}`);
await fs.mkdir(backupDir, { recursive: true });
await fs.writeFile(path.join(backupDir, "app-db.json"), JSON.stringify(baseline, null, 2), "utf8");
await fs.mkdir(mediaDir, { recursive: true });
const created = [];
const summaries = [];

try {
  const lecture2 = next.lessons.find((x) => x.courseId === course.id && x.title.startsWith("Lecture 2："));
  if (!lecture2) throw new Error("Lecture 2 insertion point not found");
  for (const spec of specs) {
    const material = JSON.parse(await fs.readFile(path.join(reviewRoot, spec.key, "materials.json"), "utf8"));
    if (material.pageCount !== spec.pages) throw new Error(`${spec.key}: unexpected page count`);
    let lesson = next.lessons.find((x) => x.courseId === course.id && x.title === spec.lessonTitle);
    if (!lesson) {
      lesson = { id: nanoid(), userId, courseId: course.id, title: spec.lessonTitle, subtitle: spec.subtitle, order: 0, icon: spec.icon, accent: spec.accent, createdAt: now };
      next.lessons.push(lesson);
    }
    let note = next.notes.find((x) => x.lessonId === lesson.id && x.userId === userId);
    if (!note) {
      note = { id: nanoid(), userId, courseId: course.id, lessonId: lesson.id, title: spec.noteTitle, sourceType: "file", sourceText: "", contentMarkdown: "", summary: "", flashcards: [], mindMap: [], createdAt: now, updatedAt: now };
      next.notes.unshift(note);
    }
    const existing = new Map(next.mediaAssets.filter((x) => x.noteId === note.id && x.sourceFile === material.sourceFile).map((x) => [x.slideNumber, x]));
    const assets = new Map();
    for (const page of material.pages) {
      let asset = existing.get(page.number);
      const source = path.join(reviewRoot, spec.key, "pages", page.fileName);
      const usable = asset && await fs.access(path.join(mediaDir, asset.storageName)).then(() => true).catch(() => false);
      if (!usable) {
        const id = nanoid();
        const storageName = `${id}.webp`;
        const target = path.join(mediaDir, storageName);
        await fs.copyFile(source, target);
        created.push(target);
        const metadata = await sharp(source).metadata();
        const stat = await fs.stat(target);
        asset = {
          id, userId, noteId: note.id,
          fileName: `${spec.key}-page-${String(page.number).padStart(3, "0")}.webp`,
          mimeType: "image/webp", size: stat.size, storageName,
          sourceFile: material.sourceFile, slideNumber: page.number,
          slideText: page.text.slice(0, 1500),
          alt: `${material.sourceFile} 第${page.number}页完整原页`,
          width: metadata.width, height: metadata.height, createdAt: now
        };
        next.mediaAssets.push(asset);
      }
      assets.set(page.number, asset);
    }
    const built = buildNote(spec, material, assets);
    Object.assign(note, {
      title: spec.noteTitle,
      sourceType: "file",
      sourceText: material.pages.map((p) => `### PDF 第 ${p.number} 页\n${p.text || "（OCR 未识别到文字）"}`).join("\n\n"),
      contentMarkdown: built.content,
      summary: `${spec.lessonTitle}：${spec.pages}页逐页讲解，标题原课件入口完整，正文插入${built.inline}页必要原图。`,
      flashcards: flashcards(spec),
      mindMap: mindMap(spec),
      updatedAt: now
    });
    await fs.writeFile(path.join(reviewRoot, spec.key, "note-final.md"), note.contentMarkdown, "utf8");
    summaries.push({
      key: spec.key, lessonId: lesson.id, noteId: note.id,
      sourceFile: material.sourceFile, assets: assets.size,
      ...validate(next, note, spec.pages, built.inline, vocabularyFor(spec.key).length)
    });
  }

  const all = next.lessons.filter((x) => x.courseId === course.id);
  const chapterLessons = specs.map((spec) => all.find((x) => x.title === spec.lessonTitle));
  const base = all.filter((x) => !targetTitles.has(x.title)).sort((a, b) => a.order - b.order);
  const insertionIndex = base.findIndex((x) => x.id === lecture2.id);
  const orderedCourseLessons = [...base.slice(0, insertionIndex + 1), ...chapterLessons, ...base.slice(insertionIndex + 1)];
  orderedCourseLessons.forEach((lesson, index) => { lesson.order = index + 1; });
  const firstCourseLessonIndex = next.lessons.findIndex((lesson) => lesson.courseId === course.id);
  const lessonsOutsideCourse = next.lessons.filter((lesson) => lesson.courseId !== course.id);
  const outsideBefore = next.lessons.slice(0, firstCourseLessonIndex).filter((lesson) => lesson.courseId !== course.id).length;
  next.lessons = [
    ...lessonsOutsideCourse.slice(0, outsideBefore),
    ...orderedCourseLessons,
    ...lessonsOutsideCourse.slice(outsideBefore)
  ];

  const courseRecord = next.courses.find((x) => x.id === course.id);
  courseRecord.description = "AIE2040 概率统计与统计机器学习：保留原有 Lecture、AI专题与 Tutorial 1—3，新增 Chapter 1—5 共712页逐页讲义，覆盖概率、离散/连续分布、二元分布与随机变量函数分布。";
  courseRecord.tags = [...new Set([...(courseRecord.tags || []), "Chapter 1—5", "逐页原课件"])];

  const protectedAfter = hash(protectedView(next, course.id, targetTitles));
  if (protectedBefore !== protectedAfter) throw new Error("Non-target records changed");
  const temp = `${dbPath}.${stamp}.tmp`;
  await fs.writeFile(temp, JSON.stringify(next, null, 2), "utf8");
  await fs.rename(temp, dbPath);
  const report = {
    importedAt: now, userId, courseId: course.id, backupDir,
    insertionAfterLessonId: lecture2.id,
    totalPages: summaries.reduce((n, x) => n + x.pages, 0),
    totalInlineFigures: summaries.reduce((n, x) => n + x.inlineFigures, 0),
    notes: summaries, protectedHash: protectedAfter
  };
  await fs.writeFile(path.join(reviewRoot, "import-report.json"), JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  await Promise.all(created.map((file) => fs.rm(file, { force: true }).catch(() => undefined)));
  throw error;
}

