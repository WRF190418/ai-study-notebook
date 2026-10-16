import type { Course, Lesson, Note, NoteReadingProgress, NoteStar, UserPreferences } from "./types";
export const tutorialImage = "/tutorial/learning-map.svg";
export const tutorialTerm = "2026年秋季 · 教学练习";
const at = "2026-01-01T00:00:00.000Z";
export function createTutorialWorkspace(userId: string, preferences: UserPreferences) {
  const courses: Course[] = [
    { id: "tutorial-course", userId, code: "LEARN", title: "学习方法练习", term: tutorialTerm, description: "仅供教学，不会写入你的正式课程。", tags: ["教学示例"], accent: "sage", createdAt: at },
    { id: "tutorial-course-other", userId, code: "REVIEW", title: "另一门教学课程", term: tutorialTerm, description: "练习切换课程。", tags: [], accent: "cobalt", createdAt: at },
    { id: "tutorial-course-spring", userId, code: "EXPLORE", title: "另一学期的练习", term: "2026年春季 · 教学练习", description: "练习切换学期。", tags: [], accent: "violet", createdAt: at }
  ];
  const lessons: Lesson[] = [{ id: "tutorial-lesson", userId, courseId: "tutorial-course", title: "从材料到理解", subtitle: "Learn by doing · 临时教学练习", order: 1, icon: "book", accent: "sage", createdAt: at }];
  const note: Note = { id: "tutorial-note", userId, courseId: "tutorial-course", lessonId: "tutorial-lesson", title: "你的第一段学习旅程 · 教学示例", sourceType: "text", sourceText: "原创教学示例，不是实际上传的课件或实时 AI 输出。", summary: "用一小段临时材料练习真实界面。退出后回到你自己的笔记本。", createdAt: at, updatedAt: at,
    contentMarkdown: `# 从零散材料，到自己的理解

## 概念框架

学习不是把资料存得越多越好，而是能解释概念、核对材料，并在需要时找回重点。AI 可以帮助梳理材料、建立联系和逐页讲解，但不能替你判断是否真的理解。下面是原创教学示例，不是教师课件，也不是刚刚调用 AI 生成的结果。

### 第1页｜整理不是学习的终点

这一页先区分“有一份笔记”和“学会了知识”。如果只收藏材料，却不能解释一个概念怎样用于例子，学习还停在输入阶段。阅读时先问：这一页要解决什么问题？概念成立需要哪些条件？它与前后页是什么关系？带着问题看讲解，才能把词语连成因果关系。

整理的作用是降低理解材料的门槛。例如，一张只写术语的幻灯片，经过教学式整理后，应解释术语的意义、适用条件和图示关系，而不是简单翻译几个关键词。遇到公式要看每个符号代表什么、单位是否一致、方向和条件是否满足；遇到例题要跟着给定量、所求量、推理和结果走一遍。总结可以帮你回顾，却不能替代这段推理过程。

讲解读起来流畅，不代表它一定正确。核对时要回到对应完整原页，看看题干、坐标、单位和限定条件有没有遗漏。额外的背景知识应明确标作补充，不能假装来自原课件。如果原材料无法读取，应该记录缺失，而不是补出貌似完整的内容。这也是为什么笔记同时保留讲解、必要插图和原页入口。

读完这一页，应记住：笔记提供学习路径，是否理解要靠自己解释和检验。先理解，再核对，最后主动回想；保存阅读位置只是记录进度，不是替你宣布掌握。需要再看的地方可以加星，并写明复习理由，让下一次阅读有一个清楚的起点。

## 从理解走向回看

第一次阅读不必记住所有细节。可以先讲出主线，再找一个容易混淆的关系进行检查。把“我不太懂”改成具体问题，例如“这个箭头表示因果还是顺序”，会比反复重读整篇更有效。下一页用知识地图把这个过程串起来。

### 第2页｜知识地图：让学习形成循环

本页的学习目标是用知识地图理解学习过程。图中的 MATERIAL 是材料，UNDERSTAND 是理解，REVISIT 是重新回看；箭头表示一个可反复进行的学习顺序，而不是实验得出的因果定律。英文标题里的 42、逗号与感叹号仅用于选字练习，不是科学结论或数据。

![教学示例知识地图：英文、数字与标点练习](${tutorialImage})

**读图提示：**从左向右看，先有材料，再通过讲解、原页核对和例子建立理解，最后通过问题回想。下方回环提醒你：发现不会解释的部分，就重新回到材料。一次阅读没有结束整个过程，加星备注可以把回环的起点留给未来的自己。

读完应能用自己的话解释三个节点，并指出自己目前卡在哪一步。下一页把“重新回看”具体化为可执行的复习动作。

### 第3页｜把阅读变成下一次的起点

这一页把学习循环落到操作：给不熟悉的页面加星，写清易错点；用搜索从正文关键词找回具体页；离开后从主页续读。闪卡适合主动回想，思维导图适合检查关系，两者都不能替代完整正文。

你可以先不看答案，尝试解释为什么讲解和原材料要互相核对，再检查遗漏了哪些条件。最后从导图回到这一讲的主线。记住：笔记本负责让资料有结构、重点找得到，理解和判断仍由你完成。

<!-- courseware-appendix -->
## 教学原页核对附录

这里的完整图片是本教程自带的原创练习页，不是教师原课件。正式笔记的这个位置保留真实源文件的完整原页。

### 第 1 页

![教学示例，第1页，练习原页核对](${tutorialImage})

### 第 2 页

![教学示例，第2页，知识地图完整练习图](${tutorialImage})

### 第 3 页

![教学示例，第3页，练习学习回环](${tutorialImage})`,
    flashcards: [{ id: "tutorial-card", front: "为什么讲解和原课件需要对照？", back: "讲解帮助理解，原材料用于核查条件和图示；AI 输出流畅不等于内容一定正确。", difficulty: "easy" }],
    mindMap: [{ id: "tutorial-map", label: "学习循环", children: [{ id: "tutorial-a", label: "材料与 AI 整理" }, { id: "tutorial-b", label: "逐页理解与原页核对" }, { id: "tutorial-c", label: "加星备注与回想复习" }] }]
  };
  return { courses, lessons, notes: [note], noteStars: [] as NoteStar[], readingProgress: [] as NoteReadingProgress[], preferences: { ...preferences } };
}
// Only this authored tutorial SVG uses a pre-positioned teaching layer. Real images still use OCR.
export const tutorialOcrLayout = { width: 1000, height: 420, words: [
  { text: "Learn", confidence: 100, bbox: { x0: 66, y0: 78, x1: 210, y1: 126 } },
  { text: "42,", confidence: 100, bbox: { x0: 225, y0: 78, x1: 300, y1: 126 } },
  { text: "understand!", confidence: 100, bbox: { x0: 315, y0: 78, x1: 644, y1: 126 } },
  { text: "MATERIAL", confidence: 100, bbox: { x0: 99, y0: 224, x1: 270, y1: 254 } },
  { text: "UNDERSTAND", confidence: 100, bbox: { x0: 375, y0: 224, x1: 615, y1: 254 } },
  { text: "REVISIT", confidence: 100, bbox: { x0: 740, y0: 224, x1: 879, y1: 254 } }
] };
