import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const dbPath = path.resolve("data/app-db.json");
const outputRoot = path.resolve("data/aie2040-vocabulary");
const appendixMarker = "\n<!-- courseware-appendix -->\n";

const vocabulary = {
  "Lecture 1：统计机器学习导论": [
    ["统计基础", "statistics", "统计学", "用数据描述规律、量化不确定性并进行推断"],
    ["统计基础", "data", "数据", "分析所依据的观测、记录或测量结果"],
    ["统计基础", "observation", "观测／样本点", "数据表中的一条记录，通常对应一个研究对象"],
    ["统计基础", "population", "总体", "研究问题所关心的全部对象或潜在数据分布"],
    ["统计基础", "sample", "样本", "从总体中实际获得的一部分观测"],
    ["统计基础", "variable", "变量", "对每个观测记录的属性或测量值"],
    ["统计基础", "distribution", "分布", "变量可能取值及其出现概率的整体规律"],
    ["统计基础", "inference", "统计推断", "由样本反推总体规律或未知参数"],
    ["统计基础", "uncertainty", "不确定性", "数据噪声、抽样波动或未知因素造成的不确定程度"],
    ["数据结构", "structured data", "结构化数据", "按行列和固定字段组织的数据"],
    ["数据结构", "unstructured data", "非结构化数据", "文本、图像、音频等没有固定表格结构的数据"],
    ["数据结构", "data matrix", "数据矩阵", "以 n 个观测为行、p 个变量为列的矩阵"],
    ["变量类型", "numeric variable", "数值变量", "数值大小和差值具有实际含义"],
    ["变量类型", "categorical variable", "类别变量", "取值表示组别而非可直接运算的数量"],
    ["变量类型", "nominal variable", "名义变量", "类别之间没有自然顺序"],
    ["变量类型", "ordinal variable", "有序类别变量", "类别有顺序，但相邻差距未必相等"],
    ["学习元素", "feature / predictor", "特征／预测变量", "模型用于解释或预测输出的输入 X"],
    ["学习元素", "response / target", "响应／目标变量", "模型要解释或预测的输出 Y"],
    ["学习范式", "supervised learning", "监督学习", "训练数据同时提供输入与目标标签"],
    ["学习范式", "unsupervised learning", "无监督学习", "没有目标标签，主要发现结构或分组"],
    ["学习范式", "semi-supervised learning", "半监督学习", "同时使用少量有标签和大量无标签数据"],
    ["学习范式", "reinforcement learning", "强化学习", "智能体通过行动、奖励和环境反馈学习策略"],
    ["学习任务", "regression", "回归", "预测连续数值响应"],
    ["学习任务", "classification", "分类", "预测离散类别响应"],
    ["学习任务", "clustering", "聚类", "按相似性把无标签观测分组"],
    ["建模", "statistical learning", "统计学习", "强调概率模型、推断和不确定性的学习方法"],
    ["建模", "machine learning", "机器学习", "从数据学习预测或决策规则的方法集合"],
    ["建模", "model", "模型", "对数据产生机制或输入输出关系的简化表达"],
    ["建模", "prediction", "预测", "利用已学关系估计新观测的结果"],
    ["建模", "error / noise", "误差／噪声", "模型没有解释的随机偏差或测量扰动"],
    ["分布案例", "life expectancy", "预期寿命", "人口寿命分布的常用摘要指标"],
    ["分布案例", "right-skewed distribution", "右偏分布", "右侧长尾，少量大值拉高均值"],
    ["分布案例", "log scale", "对数尺度", "用数量级而非原始差值比较正值数据"],
    ["分布案例", "lognormal distribution", "对数正态分布", "取对数后近似正态的正值分布"],
    ["分布案例", "mixture model", "混合模型", "用多个子群分布的加权组合描述总体"],
    ["社会统计", "income inequality", "收入不平等", "收入在群体之间分配不均的程度"],
    ["社会统计", "Gini index", "基尼指数", "由洛伦兹曲线概括不平等程度的指标"],
    ["社会统计", "Preston curve", "Preston 曲线", "国家收入与预期寿命之间的经验关系"],
    ["维度", "high-dimensional data", "高维数据", "变量数 p 很大、甚至接近或超过样本数 n 的数据"],
    ["综合能力", "data science", "数据科学", "统计、计算与领域知识协同解决数据问题"],
  ],
  "Lecture 1 补充：为什么需要统计——四个案例": [
    ["寿命分析", "lifespan", "寿命", "个体从出生到死亡的持续时间"],
    ["寿命分析", "survival function", "生存函数", "存活超过时间 t 的概率"],
    ["寿命分析", "conditional survival", "条件生存概率", "已经存活到某时点后继续存活的概率"],
    ["寿命分析", "hazard rate", "风险率／失效率", "已存活至当前时刻条件下的瞬时失败率"],
    ["寿命分析", "mortality rate", "死亡率", "一定人口和时间范围内的死亡频率"],
    ["寿命分析", "distribution fitting", "分布拟合", "选择并估计能描述观测数据的概率分布"],
    ["收入分析", "income distribution", "收入分布", "收入在个人、家庭或地区之间的分布规律"],
    ["收入分析", "gross domestic product (GDP)", "国内生产总值", "一定时期内经济体最终产品与服务的价值"],
    ["收入分析", "purchasing power parity (PPP)", "购买力平价", "按不同地区实际购买力调整货币比较"],
    ["收入分析", "Lorenz curve", "洛伦兹曲线", "累计人口比例与累计收入比例的关系曲线"],
    ["收入分析", "Gini coefficient", "基尼系数", "由洛伦兹曲线面积计算的不平等指标"],
    ["收入分析", "population density", "人口密度", "单位面积中的人口数量"],
    ["收入分析", "weighted average", "加权平均", "按人口或样本权重组合各组数值"],
    ["数据形态", "long-tailed distribution", "长尾分布", "远离主体区域仍保留显著概率的分布"],
    ["数据形态", "skewness", "偏度", "分布不对称方向和程度的度量"],
    ["数据形态", "data transformation", "数据变换", "改变尺度或形状以便建模和解释"],
    ["数据形态", "log transformation", "对数变换", "压缩大值并常用于缓解右偏和异方差"],
    ["数据形态", "robustness", "稳健性", "方法对异常值或模型偏离不敏感的程度"],
    ["数据形态", "efficiency", "效率", "在给定信息下估计量方差较小的程度"],
    ["因果判断", "association", "关联", "两个变量共同变化，但不自动表示因果"],
    ["因果判断", "correlation", "相关", "变量线性共同变化的方向与强度"],
    ["因果判断", "causation", "因果关系", "改变一个因素会导致另一个结果改变"],
    ["因果判断", "confounder", "混杂变量", "同时影响解释变量和结果、造成表面关联的第三因素"],
    ["因果判断", "spurious correlation", "伪相关", "由巧合、趋势或混杂产生的非因果相关"],
    ["因果判断", "selection bias", "选择偏差", "样本进入机制使样本系统性偏离总体"],
    ["因果判断", "survivorship bias", "幸存者偏差", "只观察留下来的对象而忽略未被观察者"],
    ["混合模型", "mixture distribution", "混合分布", "由多个潜在子群分布按权重组合而成"],
    ["混合模型", "mixture component", "混合成分", "混合模型中的一个子群分布"],
    ["混合模型", "mixing weight", "混合权重", "各成分在总体中所占比例，权重和为 1"],
    ["混合模型", "component mean", "成分均值", "某个潜在子群的中心位置"],
    ["混合模型", "component variance", "成分方差", "某个潜在子群内部的离散程度"],
    ["预测任务", "regression", "回归", "预测连续结果，如寿命或死亡率"],
    ["预测任务", "classification", "分类", "预测离散标签，如是否患病"],
    ["预测任务", "logistic regression", "逻辑回归", "用概率形式建立二分类结果与特征的关系"],
    ["预测任务", "response variable", "响应变量", "模型需要解释或预测的结果"],
    ["预测任务", "covariate", "协变量", "用于解释响应变化的输入变量"],
    ["预测任务", "median", "中位数", "把排序数据分成上下两半的中心位置"],
    ["预测任务", "absolute loss", "绝对损失", "误差绝对值；总体最优常对应条件中位数"],
    ["时间序列", "time series", "时间序列", "按时间顺序记录的一系列观测"],
    ["时间序列", "trend", "趋势", "序列中长期上升、下降或平稳的变化"],
    ["时间序列", "seasonality", "季节性", "按固定周期重复出现的变化模式"],
    ["时间序列", "lag", "滞后", "变量过去时点相对当前时点的时间间隔"],
    ["时间序列", "scatterplot matrix", "散点图矩阵", "同时查看多个变量两两关系的图阵"],
    ["时间序列", "local polynomial smoothing", "局部多项式平滑", "在每个位置用邻近数据拟合低阶多项式"],
    ["时间序列", "LOESS", "局部加权回归", "常用的局部平滑方法"],
    ["模型比较", "linear model", "线性模型", "响应由特征的线性组合表示"],
    ["模型比较", "quadratic term", "二次项", "用于表达弯曲关系的平方特征"],
    ["模型比较", "residual", "残差", "观测值与模型预测值之差"],
    ["模型比较", "Akaike information criterion (AIC)", "AIC 信息准则", "在拟合优度和模型复杂度之间折中"],
    ["模型比较", "Bayesian information criterion (BIC)", "BIC 信息准则", "对参数数量施加较强惩罚的模型选择指标"],
    ["流程", "data science cycle", "数据科学循环", "问题、数据、建模、评估、沟通和迭代的闭环"],
  ],
  "Lecture 2：概率分布与模型选择": [
    ["分布基础", "probability distribution", "概率分布", "描述随机变量可能取值及其概率规律"],
    ["分布基础", "probability density", "概率密度", "连续变量单位区间附近的概率强度"],
    ["分布基础", "support", "支持集", "分布允许出现的取值范围"],
    ["分布基础", "parameter", "参数", "控制分布形状、位置或尺度的未知常数"],
    ["分布基础", "moment", "矩", "概括分布中心、离散和形状的期望量"],
    ["模型类型", "parametric model", "参数模型", "由有限维参数确定的模型族"],
    ["模型类型", "nonparametric model", "非参数模型", "不预设有限维固定函数形式的模型"],
    ["模型类型", "linear model", "线性模型", "预测函数对参数或特征呈线性组合"],
    ["模型类型", "nonlinear model", "非线性模型", "无法用简单线性组合表达的输入输出关系"],
    ["学习场景", "unsupervised learning", "无监督学习", "从没有标签的数据发现分布、密度或聚类结构"],
    ["学习场景", "supervised learning", "监督学习", "利用输入与已知响应学习预测关系"],
    ["无监督模型", "clustering", "聚类", "按相似性识别潜在群组"],
    ["无监督模型", "Gaussian mixture model (GMM)", "高斯混合模型", "多个高斯成分的加权组合"],
    ["无监督模型", "mixture component", "混合成分", "混合模型中代表一个潜在子群的分布"],
    ["无监督模型", "expectation-maximization (EM)", "期望最大化算法", "交替估计隐变量与参数以提高似然"],
    ["无监督模型", "kernel density estimation", "核密度估计", "以样本为中心叠加核函数估计密度"],
    ["无监督模型", "power-law distribution", "幂律分布", "尾概率按幂次缓慢衰减的重尾模型"],
    ["无监督模型", "lognormal distribution", "对数正态分布", "变量取对数后服从正态的模型"],
    ["估计", "likelihood", "似然", "把已观测数据视为固定后衡量参数支持度"],
    ["估计", "log-likelihood", "对数似然", "似然取对数，将乘积化为和"],
    ["估计", "maximum likelihood estimation (MLE)", "最大似然估计", "选择使观测数据似然最大的参数"],
    ["监督模型", "prediction function", "预测函数", "把输入 X 映射为预测输出的函数"],
    ["监督模型", "error term", "误差项", "实际响应中未被系统部分解释的随机成分"],
    ["监督模型", "homoscedasticity", "同方差性", "不同输入位置的条件误差方差相同"],
    ["监督模型", "heteroscedasticity", "异方差性", "条件误差方差随输入变化"],
    ["监督模型", "loss function", "损失函数", "衡量预测与真实结果差异的目标函数"],
    ["监督模型", "least squares error (LSE)", "最小二乘误差", "以平方误差和作为拟合目标"],
    ["监督模型", "cross-entropy", "交叉熵", "分类中衡量预测概率与真实标签差异的损失"],
    ["分布选择", "Gaussian distribution", "高斯分布", "对称轻尾的连续分布模型"],
    ["分布选择", "Student's t distribution", "Student t 分布", "比正态分布尾部更厚的对称分布"],
    ["分布选择", "Cauchy distribution", "Cauchy 分布", "均值和方差不存在的重尾分布"],
    ["分布选择", "Poisson model", "Poisson 模型", "描述给定曝光量内事件计数的模型"],
    ["算法", "k-nearest neighbors (kNN)", "k 近邻", "依据最近训练样本进行预测的非参数方法"],
    ["算法", "density-based clustering (DBSCAN)", "基于密度的聚类", "按稠密区域连接样本并识别噪声"],
    ["算法", "generalized linear model (GLM)", "广义线性模型", "用链接函数连接响应均值与线性预测子"],
    ["推理方向", "forward problem", "正向问题", "已知模型和参数，求数据或结果的分布"],
    ["推理方向", "inverse problem", "逆向问题", "由观测数据反推未知模型或参数"],
    ["推理方向", "estimation", "估计", "利用样本给未知参数或分布确定数值"],
    ["推理方向", "model selection", "模型选择", "比较候选分布或模型并选择合适者"],
  ],
  "AI专题：人工智能中的概率与统计": [
    ["概率基础", "probability axiom", "概率公理", "非负、归一化和可列可加是概率规则的基础"],
    ["概率基础", "random variable", "随机变量", "把随机结果映射为数值的函数"],
    ["概率基础", "probability mass function (PMF)", "概率质量函数", "给离散变量每个取值分配概率"],
    ["概率基础", "probability density function (PDF)", "概率密度函数", "连续概率由密度在区间上的积分给出"],
    ["概率基础", "cumulative distribution function (CDF)", "累积分布函数", "给出随机变量不超过阈值的概率"],
    ["概率基础", "expectation", "期望", "按概率加权的长期平均或中心"],
    ["概率基础", "variance", "方差", "随机变量围绕均值的平方离散程度"],
    ["概率基础", "independence", "独立性", "联合分布能够分解为边缘分布的乘积"],
    ["条件推理", "conditional probability", "条件概率", "已知证据后在缩小的参考范围内计算概率"],
    ["条件推理", "law of total probability", "全概率公式", "按互斥来源对条件概率加权求和"],
    ["条件推理", "Bayes' theorem", "贝叶斯定理", "由先验和似然更新证据后的后验"],
    ["条件推理", "prior", "先验", "观察当前数据之前对未知量的概率认识"],
    ["条件推理", "likelihood", "似然", "给定参数或假设时观测到数据的可能性"],
    ["条件推理", "posterior", "后验", "结合数据后对未知量更新得到的分布"],
    ["极限定理", "law of large numbers (LLN)", "大数定律", "样本平均随样本量增加趋近总体均值"],
    ["极限定理", "central limit theorem (CLT)", "中心极限定理", "适当标准化的和或均值趋近正态分布"],
    ["信息论", "entropy", "熵", "概率分布不确定性的平均信息量"],
    ["信息论", "cross-entropy", "交叉熵", "用预测分布编码真实数据的平均代价"],
    ["离散分布", "Bernoulli distribution", "Bernoulli 分布", "一次二元成功或失败的分布"],
    ["离散分布", "Binomial distribution", "二项分布", "固定次数独立 Bernoulli 试验的成功数"],
    ["离散分布", "Poisson distribution", "Poisson 分布", "给定曝光范围内的事件计数分布"],
    ["离散分布", "Multinomial distribution", "多项分布", "固定次数试验在多个类别中的计数向量"],
    ["连续分布", "Uniform distribution", "均匀分布", "给定区间内密度恒定的分布"],
    ["连续分布", "Normal / Gaussian distribution", "正态／高斯分布", "由均值和方差决定的对称钟形分布"],
    ["连续分布", "Exponential distribution", "指数分布", "常数风险率下的等待时间分布"],
    ["连续分布", "Gamma distribution", "Gamma 分布", "正值等待时间和尺度数据的分布族"],
    ["连续分布", "Beta distribution", "Beta 分布", "定义在 0 到 1 上的概率或比例分布"],
    ["连续分布", "Dirichlet distribution", "Dirichlet 分布", "多个非负比例且总和为 1 的分布"],
    ["分布族", "exponential family", "指数族", "具有统一自然参数形式的一大类分布"],
    ["贝叶斯建模", "conjugate prior", "共轭先验", "使先验与后验属于同一分布族的先验"],
    ["贝叶斯建模", "Beta-Bernoulli model", "Beta–Bernoulli 模型", "用 Beta 先验更新 Bernoulli 成功率"],
    ["贝叶斯建模", "Dirichlet-Multinomial model", "Dirichlet–Multinomial 模型", "用 Dirichlet 先验更新多类别概率"],
    ["参数估计", "parameter", "参数", "控制概率模型的未知常数"],
    ["参数估计", "estimator", "估计量", "由样本计算、用于估计参数的统计量"],
    ["参数估计", "maximum likelihood estimation (MLE)", "最大似然估计", "最大化数据似然得到点估计"],
    ["参数估计", "maximum a posteriori (MAP)", "最大后验估计", "最大化后验密度得到点估计"],
    ["参数估计", "method of moments", "矩估计", "让样本矩与理论矩匹配来估计参数"],
    ["参数估计", "full Bayesian inference", "完整贝叶斯推断", "保留整个后验分布而非只取一个点"],
    ["参数估计", "Fisher information", "Fisher 信息", "数据关于未知参数所含局部信息量"],
    ["参数估计", "asymptotic normality", "渐近正态性", "大样本下估计量经缩放后趋近正态"],
    ["概率模型", "generative model", "生成式模型", "建立数据与标签的联合分布或数据生成机制"],
    ["概率模型", "discriminative model", "判别式模型", "直接建立条件分布或决策边界"],
    ["概率图模型", "Bayesian network", "贝叶斯网络", "用有向无环图表示条件依赖并分解联合分布"],
    ["概率图模型", "Markov random field (MRF)", "马尔可夫随机场", "用无向图表达局部条件依赖"],
    ["序列模型", "Markov chain", "马尔可夫链", "下一状态只依赖当前状态的随机过程"],
    ["序列模型", "transition probability", "转移概率", "从一个状态移动到另一个状态的概率"],
    ["序列模型", "stationary distribution", "平稳分布", "经过一步转移后仍保持不变的状态分布"],
    ["序列模型", "hidden Markov model (HMM)", "隐马尔可夫模型", "隐状态满足马尔可夫性并生成可观测序列"],
    ["序列模型", "forward algorithm", "前向算法", "计算 HMM 观测序列似然和过滤概率"],
    ["序列模型", "Viterbi algorithm", "Viterbi 算法", "寻找最可能的隐状态路径"],
    ["序列模型", "Baum-Welch algorithm", "Baum–Welch 算法", "用 EM 思想估计 HMM 参数"],
    ["深度学习", "softmax", "Softmax", "把一组得分转换为总和为 1 的类别概率"],
    ["深度学习", "calibration", "概率校准", "预测概率与实际发生频率相匹配的程度"],
    ["深度学习", "dropout", "随机失活", "训练时随机屏蔽神经元的正则化方法"],
    ["深度学习", "predictive uncertainty", "预测不确定性", "模型对未来预测结果不确定程度的量化"],
    ["深度学习", "generative adversarial network (GAN)", "生成对抗网络", "生成器与判别器对抗训练的生成模型"],
    ["深度学习", "variational autoencoder (VAE)", "变分自编码器", "用潜变量和变分推断训练的生成模型"],
    ["深度学习", "latent variable", "潜变量", "不能直接观察但用于解释数据结构的变量"],
    ["应用", "Naive Bayes", "朴素 Bayes", "假设给定类别后特征条件独立的分类器"],
    ["应用", "recommendation system", "推荐系统", "利用用户、物品和反馈的不确定关系进行推荐"],
    ["应用", "image segmentation", "图像分割", "为图像中的像素或区域分配类别"],
    ["应用", "reinforcement learning", "强化学习", "智能体在不确定环境中根据奖励学习策略"],
    ["应用", "exploration-exploitation trade-off", "探索—利用权衡", "在获取新信息与使用已有最佳行动之间取舍"],
    ["辨析", "aleatoric uncertainty", "数据不确定性", "由观测噪声和随机性引起、通常不可消除"],
    ["辨析", "epistemic uncertainty", "模型不确定性", "由知识或数据不足引起，可随数据增加而降低"],
  ],
  "Tutorial 1：概率基础与解题入门": [
    ["事件", "sample space", "样本空间", "随机试验全部可能结果的集合"],
    ["事件", "event", "事件", "样本空间的子集"],
    ["事件", "union", "并集", "至少一个事件发生"],
    ["事件", "intersection", "交集", "多个事件同时发生"],
    ["事件", "complement", "补集", "目标事件不发生"],
    ["事件", "mutually exclusive", "互斥", "两个事件不可能同时发生"],
    ["概率规则", "conditional probability", "条件概率", "先限定条件事件，再重新归一化"],
    ["概率规则", "independence", "独立", "一个事件发生不改变另一个事件的概率"],
    ["概率规则", "pairwise independence", "两两独立", "每一对事件独立，但不保证整体相互独立"],
    ["概率规则", "mutual independence", "相互独立", "所有非空事件子集的联合概率均可分解"],
    ["概率规则", "law of total probability", "全概率公式", "按互斥原因加权汇总目标概率"],
    ["概率规则", "Bayes' theorem", "贝叶斯定理", "由结果反推原因的后验概率"],
    ["概率规则", "inclusion-exclusion", "容斥原理", "修正事件并集中被重复计算的交叠"],
    ["随机变量", "random variable", "随机变量", "把试验结果映射为数值"],
    ["随机变量", "discrete random variable", "离散随机变量", "取值有限或可数"],
    ["随机变量", "continuous random variable", "连续随机变量", "概率由区间面积给出"],
    ["分布函数", "probability mass function (PMF)", "概率质量函数", "给离散变量单个取值分配概率"],
    ["分布函数", "probability density function (PDF)", "概率密度函数", "连续概率在区间上的积分核"],
    ["分布函数", "cumulative distribution function (CDF)", "累积分布函数", "随机变量不超过阈值的概率"],
    ["分布函数", "normalization", "归一化", "使全部概率质量或密度积分等于 1"],
    ["矩", "expectation", "期望", "按概率加权的平均"],
    ["矩", "variance", "方差", "相对均值的平方偏离期望"],
    ["矩", "standard deviation", "标准差", "方差平方根，与原变量单位相同"],
    ["矩", "linearity of expectation", "期望线性性", "和的期望等于期望之和，不要求独立"],
    ["矩", "LOTUS", "无意识统计学家定律", "直接在原变量分布下计算函数的期望"],
    ["常见分布", "Bernoulli distribution", "Bernoulli 分布", "一次成功或失败"],
    ["常见分布", "Binomial distribution", "二项分布", "固定次数独立同概率试验的成功数"],
    ["常见分布", "Uniform distribution", "均匀分布", "等长区间具有相同概率"],
    ["常见分布", "Normal distribution", "正态分布", "由均值和方差决定的对称连续分布"],
    ["计算", "standardization", "标准化", "减去均值再除以标准差"],
    ["计算", "z-score", "标准分数", "观测值距均值多少个标准差"],
    ["计算", "point probability", "点概率", "连续变量单点概率为 0"],
    ["计算", "tail probability", "尾概率", "阈值一侧或两侧的概率"],
    ["应用", "measurement error", "测量误差", "观测值相对真实值的随机偏差"],
    ["应用", "tolerance", "容差", "允许误差落入的范围"],
    ["应用", "overbooking", "超售", "销售数量超过容量并依赖未出现概率管理风险"],
    ["应用", "expected compensation", "期望赔付", "各赔付金额按发生概率加权的平均成本"],
  ],
  "Tutorial 2：联合分布、Bayes与统计不确定性": [
    ["联合分布", "joint distribution", "联合分布", "同时描述多个随机变量怎样共同取值"],
    ["联合分布", "joint PMF", "联合概率质量函数", "离散变量一组取值的联合概率"],
    ["联合分布", "joint PDF", "联合概率密度函数", "连续变量区域概率的积分核"],
    ["联合分布", "marginal distribution", "边缘分布", "把不关心的变量求和或积分掉"],
    ["联合分布", "marginalization", "边缘化", "由联合分布取得单个变量分布的运算"],
    ["联合分布", "conditional distribution", "条件分布", "给定另一个变量后重新归一化的分布"],
    ["联合分布", "conditional density", "条件密度", "联合密度除以条件变量的边缘密度"],
    ["Bayes", "law of total probability", "全概率公式", "按群体占比对条件概率加权"],
    ["Bayes", "prior probability", "先验概率", "观察证据之前对原因的概率"],
    ["Bayes", "likelihood", "似然", "给定原因时观察到证据的概率"],
    ["Bayes", "evidence", "证据", "Bayes 公式中用于归一化的总概率"],
    ["Bayes", "posterior probability", "后验概率", "观察证据后更新的原因概率"],
    ["Bayes", "base rate", "基准率", "总体中目标类别原本所占比例"],
    ["Bayes", "sensitivity", "灵敏度", "真实为正时检测为正的概率"],
    ["Bayes", "false positive rate", "假阳性率", "真实为负时检测为正的概率"],
    ["独立性", "independent events", "独立事件", "一个事件的信息不改变另一个事件的概率"],
    ["独立性", "independent random variables", "独立随机变量", "联合分布等于边缘分布乘积"],
    ["抽样", "independent and identically distributed (iid)", "独立同分布", "样本之间独立且来自同一分布"],
    ["统计推断", "statistical inference", "统计推断", "由样本反推未知总体或参数"],
    ["统计推断", "population", "总体", "研究对象的完整集合或概率分布"],
    ["统计推断", "sample", "样本", "从总体获得的有限观测"],
    ["统计推断", "parameter", "参数", "描述总体但通常未知的固定量"],
    ["统计推断", "statistic", "统计量", "只由样本计算、不含未知参数的量"],
    ["统计推断", "estimator", "估计量", "用于估计总体参数的统计量"],
    ["统计推断", "estimate", "估计值", "把实际样本代入估计量得到的数值"],
    ["统计推断", "sampling variability", "抽样变异", "不同随机样本产生不同统计量的现象"],
    ["统计推断", "sampling distribution", "抽样分布", "统计量在重复抽样下的概率分布"],
    ["统计推断", "sample mean", "样本均值", "样本观测的算术平均"],
    ["统计推断", "standard error", "标准误", "估计量抽样分布的标准差"],
    ["极限定理", "law of large numbers (LLN)", "大数定律", "样本均值随样本量增加靠近总体均值"],
    ["极限定理", "central limit theorem (CLT)", "中心极限定理", "标准化样本均值趋近正态分布"],
    ["极限定理", "convergence in probability", "依概率收敛", "偏离目标固定距离的概率趋近 0"],
    ["极限定理", "convergence in distribution", "依分布收敛", "分布函数在连续点趋近极限分布函数"],
  ],
  "Tutorial 3：多元概率、相关性与变量变换": [
    ["期望工具", "law of the unconscious statistician (LOTUS)", "无意识统计学家定律", "无需先求变换后分布，直接在原分布下求函数期望"],
    ["期望工具", "joint expectation", "联合期望", "按联合 PMF 或 PDF 对多变量函数加权"],
    ["期望工具", "iterated integral", "累次积分", "在二维区域中依次对两个变量积分"],
    ["依赖性", "covariance", "协方差", "衡量两个变量偏离均值时是否同向变化"],
    ["依赖性", "correlation coefficient", "相关系数", "标准化协方差，取值范围为负一到一"],
    ["依赖性", "positive correlation", "正相关", "一个变量增大时另一个变量倾向线性增大"],
    ["依赖性", "negative correlation", "负相关", "一个变量增大时另一个变量倾向线性减小"],
    ["依赖性", "uncorrelated", "不相关", "协方差为 0，但仍可能存在非线性依赖"],
    ["依赖性", "independence", "独立", "联合分布可分解为边缘分布乘积"],
    ["依赖性", "linear dependence", "线性依赖", "一个变量可由另一个变量的线性函数确定"],
    ["依赖性", "Cauchy-Schwarz inequality", "Cauchy–Schwarz 不等式", "用于证明相关系数绝对值不超过 1"],
    ["依赖性", "scatterplot", "散点图", "观察两个数值变量关系形状和方向的图"],
    ["多项分布", "Multinomial distribution", "多项分布", "固定次数试验在多个类别中的计数向量"],
    ["多项分布", "category count", "类别计数", "落入某一类别的试验次数"],
    ["多项分布", "joint PMF", "联合 PMF", "多个类别计数同时取值的概率"],
    ["多项分布", "marginal Binomial distribution", "边缘二项分布", "只观察一个类别计数时得到的分布"],
    ["多项分布", "category aggregation", "类别合并", "把多个类别概率与计数相加后重新看作一类"],
    ["多项分布", "conditional Multinomial distribution", "条件多项分布", "给定部分计数后对剩余数量和概率重新归一化"],
    ["多项分布", "negative covariance", "负协方差", "总数固定使一个类别增加时其他类别可用数量减少"],
    ["变量变换", "change of variables", "变量变换", "由原随机变量构造新变量并求其分布"],
    ["变量变换", "monotone transformation", "单调变换", "支持集上只有一个逆映射分支"],
    ["变量变换", "inverse function", "逆函数", "由新变量值反解原变量值"],
    ["变量变换", "absolute derivative", "导数绝对值", "一维密度变换中的尺度修正"],
    ["变量变换", "Jacobian determinant", "Jacobian 行列式", "多维变换中局部面积或体积的伸缩因子"],
    ["变量变换", "inverse mapping", "逆映射", "由新坐标求回原坐标的函数"],
    ["变量变换", "transformed support", "变换后支持集", "新变量允许取值的区域"],
    ["Box–Muller", "Box-Muller transform", "Box–Muller 变换", "由两个独立均匀变量生成两个独立标准正态变量"],
    ["Box–Muller", "polar coordinates", "极坐标", "用半径和角度表示二维点"],
    ["Box–Muller", "radial component", "径向分量", "Box–Muller 变换中的随机半径"],
    ["Box–Muller", "angular component", "角向分量", "Box–Muller 变换中的均匀随机角度"],
    ["Box–Muller", "factorization", "因子分解", "联合密度写成边缘密度乘积以证明独立"],
    ["辨析", "zero covariance", "零协方差", "只排除线性共同变化，不足以推出独立"],
    ["辨析", "nonlinear dependence", "非线性依赖", "相关系数可能为 0 但变量仍通过曲线关系相依"],
  ],
};

const hash = (value) => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
const countTerms = (main) => {
  const section = main.split(/^## 英语术语分类总表$/m)[1] || "";
  return (section.match(/^\| (?!类别 \|)(?!--- \|).+ \|$/gm) || []).length;
};

function buildTable(rows) {
  const cell = (value) => value.replaceAll("|", "\\|");
  return `## 英语术语分类总表

以下术语是本笔记正文、公式、图表、案例和练习中需要主动掌握的专业英语。复习时应做到：看到英文能说出中文含义，看到公式或题目能判断它所指的对象，并能区分同组内容易混淆的概念。

| 类别 | English | 中文 | 掌握重点 |
| --- | --- | --- | --- |
${rows.map((row) => `| ${row.map(cell).join(" | ")} |`).join("\n")}`;
}

function replaceVocabulary(content, rows) {
  const parts = content.split(appendixMarker);
  if (parts.length !== 2) throw new Error("Expected exactly one courseware appendix marker");
  const cleanMain = parts[0].replace(/\n+## 英语术语分类总表\n[\s\S]*$/m, "").trimEnd();
  return `${cleanMain}\n\n${buildTable(rows)}${appendixMarker}${parts[1]}`;
}

const baseline = JSON.parse(await fs.readFile(dbPath, "utf8"));
const course = baseline.courses.find((item) => item.code === "AIE2040");
if (!course) throw new Error("AIE2040 course not found");
const courseLessons = baseline.lessons.filter((item) => item.courseId === course.id).sort((a, b) => a.order - b.order);
if (courseLessons.length !== 12) throw new Error(`Expected 12 AIE2040 lessons, found ${courseLessons.length}`);
const courseLessonIds = new Set(courseLessons.map((item) => item.id));
const courseNotes = baseline.notes.filter((item) => courseLessonIds.has(item.lessonId));
if (courseNotes.length !== courseLessons.length) throw new Error("Every AIE2040 lesson must have exactly one note");
const courseNoteIds = new Set(courseNotes.map((item) => item.id));
const protectedBefore = hash({
  ...baseline,
  notes: baseline.notes.filter((item) => !courseNoteIds.has(item.id)),
});
const next = structuredClone(baseline);
const now = new Date().toISOString();
const stamp = now.replace(/[:.]/g, "-");
const backupDir = path.resolve("data/backups", `aie2040-vocabulary-${stamp}`);
await fs.mkdir(backupDir, { recursive: true });
await fs.mkdir(outputRoot, { recursive: true });
await fs.writeFile(path.join(backupDir, "app-db.json"), JSON.stringify(baseline, null, 2), "utf8");

const results = [];
for (const lesson of courseLessons) {
  const note = next.notes.find((item) => item.lessonId === lesson.id);
  const rows = vocabulary[lesson.title];
  const beforeHash = hash(note.contentMarkdown);
  if (rows) {
    note.contentMarkdown = replaceVocabulary(note.contentMarkdown, rows);
    note.updatedAt = now;
  }
  const [main] = note.contentMarkdown.split(appendixMarker);
  const headings = (main.match(/^## 英语术语分类总表$/gm) || []).length;
  const terms = countTerms(main);
  const lastH2 = [...main.matchAll(/^## (.+)$/gm)].at(-1)?.[1];
  if (headings !== 1 || terms === 0 || lastH2 !== "英语术语分类总表") throw new Error(`${lesson.title}: vocabulary table missing or misplaced`);
  if (rows && terms !== rows.length) throw new Error(`${lesson.title}: expected ${rows.length} terms, found ${terms}`);
  await fs.writeFile(path.join(outputRoot, `${note.id}.md`), note.contentMarkdown, "utf8");
  results.push({
    order: lesson.order,
    lessonTitle: lesson.title,
    lessonId: lesson.id,
    noteId: note.id,
    vocabularyTerms: terms,
    changed: beforeHash !== hash(note.contentMarkdown),
    contentHash: crypto.createHash("sha256").update(note.contentMarkdown).digest("hex"),
  });
}

const protectedAfter = hash({
  ...next,
  notes: next.notes.filter((item) => !courseNoteIds.has(item.id)),
});
if (protectedBefore !== protectedAfter) throw new Error("Records outside AIE2040 changed");
const temp = `${dbPath}.${stamp}.tmp`;
await fs.writeFile(temp, JSON.stringify(next, null, 2), "utf8");
await fs.rename(temp, dbPath);
const report = {
  updatedAt: now,
  courseId: course.id,
  userId: course.userId,
  backupDir,
  noteCount: results.length,
  changedNotes: results.filter((item) => item.changed).length,
  totalVocabularyTerms: results.reduce((sum, item) => sum + item.vocabularyTerms, 0),
  protectedHash: protectedAfter,
  notes: results,
};
await fs.writeFile(path.join(outputRoot, "report.json"), JSON.stringify(report, null, 2), "utf8");
console.log(JSON.stringify(report, null, 2));
