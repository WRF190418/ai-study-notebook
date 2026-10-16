export const themeIds = ["warm-study", "mist-forest", "midnight-atlas", "cognitive-lab", "poetic-realm", "arcane-library", "galactic-guide"] as const;

export const themeOptions = [
  { id: "warm-study", name: "金灯书房", eyebrow: "胡桃木 · 黄铜 · 灯下书页", description: "夜色落在窗外，一盏金灯照亮书桌。翻开课程簿，把时间留给书与自己。", detail: "黄铜台灯 / 纸质课程簿 / 夜窗书桌" },
  { id: "mist-forest", name: "苔庭晨雾", eyebrow: "林间 · 晨雾 · 透叶天光", description: "循着透叶的晨光走进森林，在薄雾与书径之间，沿自己的节奏慢慢读。", detail: "林间书径 / 透叶天光 / 流动薄雾" },
  { id: "midnight-atlas", name: "极夜星图", eyebrow: "深海蓝 · 星金 · 夜幕", description: "把课程连成星座，以好奇心为引力，在浩瀚夜空中找到下一处知识坐标。", detail: "课程星座 / 黄铜星仪 / 坐标网格" },
  { id: "cognitive-lab", name: "棱镜实验舱", eyebrow: "冰蓝 · 棱镜 · 神经网络", description: "悬浮的棱镜折射出知识的连接，进入清晰、冷静的研究空间。", detail: "光学棱镜 / 数据轨道 / 玻璃界面" },
  { id: "poetic-realm", name: "诗之境", eyebrow: "景随情生 · 诗意流转", description: "从相思到求索，从长风到清欢。情、景与诗缓缓交融，偶然与你相遇。", detail: "流动诗境 / 山水留白 / 留住此境" },
  { id: "arcane-library", name: "秘法藏书院", eyebrow: "拱窗 · 烛光 · 古老秘典", description: "夜幕下的藏书院仍亮着烛火。翻开书页，知识自有隐秘的光。", detail: "原创秘法纹样 / 星仪 / 浮烛微光" },
  { id: "galactic-guide", name: "银河系搭车客指南", eyebrow: "随身本 · 宇宙 · 一杯茶", description: "封面可以打开。宇宙暂不支持此操作。", detail: "实体封面 / 索引内页 / 编者夹页" }
] as const;

export const poeticMotifs = ["longing", "devotion", "journey", "courage", "freedom", "repose"] as const;

// Public-domain poems; preserve the first six positions for saved reading sessions.
// A motif connects each complete poetic thought to scenery, not an inferred user mood.
export const poeticScenes = [
  { id: "longing", motif: "longing", verse: ["愿君多采撷", "此物最相思"], author: "王维", title: "相思", image: "月照远山，一点朱红" },
  { id: "devotion", motif: "devotion", verse: ["衣带渐宽终不悔", "为伊消得人憔悴"], author: "柳永", title: "蝶恋花·伫倚危楼风细细", image: "灯火未眠，山长水远" },
  { id: "journey", motif: "journey", verse: ["山重水复疑无路", "柳暗花明又一村"], author: "陆游", title: "游山西村", image: "曲水回转，天光渐明" },
  { id: "courage", motif: "courage", verse: ["长风破浪会有时", "直挂云帆济沧海"], author: "李白", title: "行路难·其一", image: "长风万里，一帆向远" },
  { id: "freedom", motif: "freedom", verse: ["竹杖芒鞋轻胜马，谁怕？", "一蓑烟雨任平生"], author: "苏轼", title: "定风波·莫听穿林打叶声", image: "风雨从容，天地宽阔" },
  { id: "repose", motif: "repose", verse: ["行到水穷处", "坐看云起时"], author: "王维", title: "终南别业", image: "水尽云起，心有闲处" },
  { id: "shared-moon", motif: "longing", verse: ["海上生明月", "天涯共此时"], author: "张九龄", title: "望月怀远", image: "海天一月，万里同望" },
  { id: "lasting-love", motif: "devotion", verse: ["两情若是久长时", "又岂在朝朝暮暮"], author: "秦观", title: "鹊桥仙·纤云弄巧", image: "星河迢递，深情不改" },
  { id: "heart-connection", motif: "longing", verse: ["身无彩凤双飞翼", "心有灵犀一点通"], author: "李商隐", title: "无题·昨夜星辰昨夜风", image: "星辰昨夜，心意相通" },
  { id: "ocean-memory", motif: "devotion", verse: ["曾经沧海难为水", "除却巫山不是云"], author: "元稹", title: "离思五首·其四", image: "沧海云深，旧意难忘" },
  { id: "returning-swallow", motif: "longing", verse: ["无可奈何花落去", "似曾相识燕归来"], author: "晏殊", title: "浣溪沙·一曲新词酒一杯", image: "落花时节，归燕似曾" },
  { id: "moon-wish", motif: "longing", verse: ["但愿人长久", "千里共婵娟"], author: "苏轼", title: "水调歌头·明月几时有", image: "月色温柔，愿人长久" },
  { id: "homeward", motif: "freedom", verse: ["回首向来萧瑟处", "归去，也无风雨也无晴"], author: "苏轼", title: "定风波·莫听穿林打叶声", image: "回首风雨，心自澄明" },
  { id: "lantern-night", motif: "devotion", verse: ["东风夜放花千树", "更吹落，星如雨"], author: "辛弃疾", title: "青玉案·元夕", image: "花灯如昼，星雨满城" },
  { id: "lingering-thought", motif: "devotion", verse: ["此情无计可消除", "才下眉头，却上心头"], author: "李清照", title: "一剪梅·红藕香残玉簟秋", image: "一笺心事，眉间心上" },
  { id: "born-to-shine", motif: "courage", verse: ["天生我材必有用", "千金散尽还复来"], author: "李白", title: "将进酒", image: "胸有长风，不负此生" },
  { id: "autumn-horizon", motif: "journey", verse: ["落霞与孤鹜齐飞", "秋水共长天一色"], author: "王勃", title: "滕王阁序", image: "落霞秋水，天地同色" },
  { id: "higher-view", motif: "journey", verse: ["欲穷千里目", "更上一层楼"], author: "王之涣", title: "登鹳雀楼", image: "登高望远，前路未尽" },
  { id: "summit", motif: "courage", verse: ["会当凌绝顶", "一览众山小"], author: "杜甫", title: "望岳", image: "群山在下，心向绝顶" },
  { id: "great-river", motif: "courage", verse: ["大江东去", "浪淘尽，千古风流人物"], author: "苏轼", title: "念奴娇·赤壁怀古", image: "大江奔流，千古回响" },
  { id: "heroic-spirit", motif: "courage", verse: ["生当作人杰", "死亦为鬼雄"], author: "李清照", title: "夏日绝句", image: "山河有气，慷慨长存" },
  { id: "east-fence", motif: "repose", verse: ["采菊东篱下", "悠然见南山"], author: "陶渊明", title: "饮酒·其五", image: "东篱有菊，南山自见" },
  { id: "pine-moon", motif: "repose", verse: ["明月松间照", "清泉石上流"], author: "王维", title: "山居秋暝", image: "松间月白，石上泉清" },
  { id: "spring-dawn", motif: "repose", verse: ["夜来风雨声", "花落知多少"], author: "孟浩然", title: "春晓", image: "一夜春雨，晓来惜花" },
  { id: "lake-light", motif: "freedom", verse: ["水光潋滟晴方好", "山色空蒙雨亦奇"], author: "苏轼", title: "饮湖上初晴后雨·其二", image: "晴雨皆宜，湖山有情" },
  { id: "first-lotus", motif: "journey", verse: ["小荷才露尖尖角", "早有蜻蜓立上头"], author: "杨万里", title: "小池", image: "新荷初展，蜻蜓轻落" },
  { id: "quiet-rain", motif: "freedom", verse: ["随风潜入夜", "润物细无声"], author: "杜甫", title: "春夜喜雨", image: "夜雨无声，万物悄长" },
  { id: "spring-stillness", motif: "repose", verse: ["人闲桂花落", "夜静春山空"], author: "王维", title: "鸟鸣涧", image: "山空夜静，花落可闻" },
  { id: "mountain-companion", motif: "repose", verse: ["相看两不厌", "只有敬亭山"], author: "李白", title: "独坐敬亭山", image: "与山相对，无言亦亲" },
  { id: "far-friend", motif: "journey", verse: ["海内存知己", "天涯若比邻"], author: "王勃", title: "送杜少府之任蜀州", image: "山川虽远，知己在心" }
] as const;
