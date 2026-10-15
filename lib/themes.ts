export const themeIds = ["warm-study", "mist-forest", "midnight-atlas", "cognitive-lab", "poetic-realm", "arcane-library"] as const;

export const themeOptions = [
  { id: "warm-study", name: "金灯书房", eyebrow: "胡桃木 · 黄铜 · 灯下书页", description: "夜色落在窗外，一盏金灯照亮书桌。把时间留给书与自己。", detail: "温暖灯光 / 精装藏书 / 纸张肌理" },
  { id: "mist-forest", name: "苔庭晨雾", eyebrow: "林间 · 晨雾 · 透叶天光", description: "推开一扇面向森林的窗，让薄雾、山影与晨光慢慢走进来。", detail: "层叠远山 / 植物剪影 / 流动薄雾" },
  { id: "midnight-atlas", name: "极夜星图", eyebrow: "深海蓝 · 星金 · 夜幕", description: "深蓝阅读空间与细微星轨，在浩瀚夜空中安静探索。", detail: "星轨 / 深蓝夜空 / 星金坐标" },
  { id: "cognitive-lab", name: "棱镜实验舱", eyebrow: "冰蓝 · 棱镜 · 神经网络", description: "悬浮的棱镜折射出知识的连接，进入清晰、冷静的研究空间。", detail: "光学棱镜 / 数据轨道 / 玻璃界面" },
  { id: "poetic-realm", name: "诗之境", eyebrow: "景随情生 · 诗意流转", description: "从相思到求索，从长风到清欢。情、景与诗缓缓交融，偶然与你相遇。", detail: "流动诗境 / 山水留白 / 留住此境" },
  { id: "arcane-library", name: "秘法藏书院", eyebrow: "拱窗 · 烛光 · 古老秘典", description: "夜幕下的藏书院仍亮着烛火。翻开书页，知识自有隐秘的光。", detail: "原创秘法纹样 / 星仪 / 浮烛微光" }
] as const;

// Each scene is a complete poetic thought. No inferred mood or date-based selection.
export const poeticScenes = [
  { id: "longing", verse: ["愿君多采撷", "此物最相思"], author: "王维", title: "相思", image: "月照远山，一点朱红" },
  { id: "devotion", verse: ["衣带渐宽终不悔", "为伊消得人憔悴"], author: "柳永", title: "蝶恋花·伫倚危楼风细细", image: "灯火未眠，山长水远" },
  { id: "journey", verse: ["山重水复疑无路", "柳暗花明又一村"], author: "陆游", title: "游山西村", image: "曲水回转，天光渐明" },
  { id: "courage", verse: ["长风破浪会有时", "直挂云帆济沧海"], author: "李白", title: "行路难·其一", image: "长风万里，一帆向远" },
  { id: "freedom", verse: ["竹杖芒鞋轻胜马，谁怕？", "一蓑烟雨任平生"], author: "苏轼", title: "定风波·莫听穿林打叶声", image: "风雨从容，天地宽阔" },
  { id: "repose", verse: ["行到水穷处", "坐看云起时"], author: "王维", title: "终南别业", image: "水尽云起，心有闲处" }
] as const;
