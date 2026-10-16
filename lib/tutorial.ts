export const tutorialVersion = 4;
export const tutorialKey = (userId: string) => `study-note-tutorial:v${tutorialVersion}:${userId}`;
export type TutorialScene = "home" | "note" | "stars" | "artifacts" | "organizer";
export const tutorialChapters = [
  { id: "begin", title: "打开第一篇笔记", scene: "home", bridge: "先从一门课程出发。" },
  { id: "read", title: "理解与原页对照", scene: "note", bridge: "找到笔记之后，开始真正读懂它。" },
  { id: "stars", title: "留下自己的重点", scene: "note", bridge: "AI 帮你理清，重点由你留下。" },
  { id: "index", title: "找回收藏的页面", scene: "stars", bridge: "留下的重点，需要随时找得到。" },
  { id: "search", title: "从内容找回知识", scene: "note", bridge: "没有加星也没关系，记得一个词就够了。" },
  { id: "resume", title: "从上次停下处继续", scene: "note", bridge: "不必一次读完，笔记本会替你记住位置。" },
  { id: "focus", title: "进入专注阅读", scene: "note", bridge: "位置找到了，让界面安静下来。" },
  { id: "images", title: "用好图片里的信息", scene: "note", bridge: "回到材料本身，图片也能成为可用的信息。" },
  { id: "review", title: "把阅读变成复习", scene: "artifacts", bridge: "读懂之后，用问题和结构再检查一次。" },
  { id: "ai", title: "让 AI 帮你整理", scene: "organizer", bridge: "你已经会读、会找、会复习，再看看这些笔记如何来到这里。" },
  { id: "space", title: "熟悉你的学习空间", scene: "home", bridge: "学习主线已经走通，最后让这里更像你的空间。" }
] as const satisfies ReadonlyArray<{ id: string; title: string; scene: TutorialScene; bridge: string }>;
type Kind = "click" | "input" | "change" | "confirm" | "event" | "activate";
export type TutorialStep = { id: string; chapter: string; title: string; body: string; target: string; kind: Kind; event?: string; value?: string; button?: string };
const page = (n: number) => `#note-tutorial-note-page-${n}-1`;
const s = (chapter: string, id: string, kind: Kind, target: string, title: string, body: string, extra: Partial<TutorialStep> = {}): TutorialStep => ({ chapter, id, kind, target, title, body, ...extra });
export const tutorialSteps: TutorialStep[] = [
  s("begin", "course", "click", ".home-course-card", "选择一门课程", "我们从这张课程卡片出发。课程按学期归档，眼前是临时教学资料，不是你的正式课程。"),
  s("begin", "chapter", "click", ".course-chapter", "进入章节", "一门课程下面按讲次或章节组织内容。光标会进入这一章；不同主题的入口造型不同，用法相同。"),
  s("begin", "note", "click", ".notes-list .note-item", "选中本章笔记", "这里列出本章笔记。选中一篇，就能开始阅读，不必在散落的文件之间来回查找。"),
  s("read", "framework", "confirm", ".note-reader > .markdown > h2", "先看知识之间的联系", "概念框架先回答“这一讲在讲什么”。AI 整理不只是压缩原文，而是建立联系，再逐页带你学习；讲解仍需与原材料核对。"),
  s("read", "page", "confirm", page(1), "逐页讲解，不跳过细节", "每个“第 N 页”对应一张原课件。正文讲清概念、条件、例题和前后联系；摘要、闪卡不能代替正文。"),
  s("read", "source-open", "click", `${page(1)} .page-source-button`, "一键核对原课件", "页标题右侧的小课件图标，能打开该页完整原图。接下来自动打开核对；本次是明确标注的教学示例。"),
  s("read", "source-close", "event", '[aria-label="关闭原课件预览"]', "看完原页，回到讲解", "看原图时，核对图示、公式条件和题干。看完关闭即可回到原处，我们现在回到讲解。", { event: "source-closed" }),
  s("read", "zoom-open", "click", ".note-reader .note-image-zoom", "需要细看时，放大图片", "正文中的必要插图紧邻讲解。光标会点开放大，方便细看，再结合“读图提示”理解箭头和结论。"),
  s("read", "zoom-close", "event", '[aria-label="关闭图片预览"]', "对照完，继续阅读", "看完细节，关闭预览就能继续阅读。放大图片不会改变原来的阅读位置。", { event: "image-closed" }),
  s("read", "appendix", "click", ".courseware-appendix > summary", "完整材料也有保留", "完整原页也保存在附录里。现在展开看看：附录用于核对，不能代替正文讲解或逐页原图按钮。"),
  s("stars", "star", "click", `${page(2)} .page-star-button`, "给值得再看的这一页加星", "遇到值得再看的页面，点页标题右侧的空心星。星标定位到具体页码，加星后会自动打开备注框。"),
  s("stars", "memo", "event", ".page-note-editor", "留下“为什么要再看”", "备注记下为什么要再看。这里演示输入“二刷时自己画一次知识地图”并保存；取消编辑也会保留星标。", { event: "memo-closed" }),
  s("stars", "memo-open", "click", `${page(2)} .page-note-button`, "备注随时可以修改", "加星后，旁边会出现备注入口。现在重新打开它，看看如何把提醒写得更具体。"),
  s("stars", "memo-edit", "event", ".page-note-editor", "把提醒改得更有用", "把提醒改成“先自己画，再核对箭头”。只有加星后才有备注；取消备注编辑不会取消星标。", { event: "memo-closed" }),
  s("index", "list-close", "click", ".starred-pages-heading", "重点在笔记最上方集合", "加星页在笔记最上方集合，默认展开。我们先折叠它，看看长笔记怎样保持整洁。"),
  s("index", "list-open", "click", ".starred-pages-heading", "再展开重点列表", "再展开列表，页码、标题和备注都在这里。接下来直接从这份清单跳到重点。"),
  s("index", "list-jump", "click", ".starred-page-link", "从列表直达重点页", "这一项指向第2页。点击后自动定位，不用记住页面在长笔记里的滚动位置。"),
  s("index", "list-return", "click", ".return-to-stars", "看完再回到列表", "看完重点，用悬浮的“返回加星列表”回到顶部集合。这是来回复习时的快捷路径。"),
  s("index", "list-remove", "click", ".starred-page-remove", "不再重要的，可以移除", "这条教学星标不再需要时，可以移除。取消收藏只移除星标和备注，不删除笔记正文。"),
  s("index", "index-home", "click", '[data-tutorial="home"]', "跨笔记查重点，从主页开始", "单篇笔记有自己的重点列表，主页还有跨笔记入口。现在回到主页认识它。"),
  s("index", "global-stars", "activate", '[data-tutorial="home-stars"]', "全局加星索引", "全局加星索引汇总不同笔记的重点。通常点击打开；实验室主题直接展示列表。"),
  s("index", "global-stars-info", "confirm", '.world-index-drawer, [data-tutorial="home-stars"]', "不同笔记的重点，在这里汇合", "正式使用时，点击索引中的条目就能进入对应笔记页。刚才取消了教学星标，所以这里是空列表，不是正文被删了。"),
  s("search", "search-input", "input", '[aria-label="搜索全部笔记"]', "用“知识地图”找回内容", "试着从“知识地图”找回内容。光标会输入关键词；搜索匹配正文，不只匹配笔记标题。尚未入库的图片选字不等于全文索引。", { value: "知识地图" }),
  s("search", "search-filter", "change", ".search-results-header select", "按课程缩小范围", "搜索结果显示内容片段、课程、章节、笔记和页码。切换课程筛选，能缩小范围，减少同名知识点的干扰。", { value: "tutorial-course" }),
  s("search", "search-result", "click", ".search-result-card", "点击结果，直达命中页", "打开这条结果，就会跳到包含关键词的具体页。搜索的目的，是从记得的一点内容找回上下文。"),
  s("search", "search-back", "event", page(2), "回到刚才的搜索结果", "从结果进入笔记后，可以浏览器后退返回刚才的搜索。这里自动带你返回，关键词与结果会保留。", { event: "search-back", button: "返回搜索结果" }),
  s("search", "search-clear", "click", '[aria-label="清除搜索"]', "完成查找，清除关键词", "查找结束，清除关键词即可恢复普通浏览。下一段看看离开之后如何接着读。"),
  s("resume", "back-chapters", "click", ".back-button", "返回课程章节", "这个按钮返回课程章节。读到深处时，快速上滚也会浮出返回按钮；慢慢上滚是浏览，向下滚动则隐藏。"),
  s("resume", "resume-home", "click", '[data-tutorial="home"]', "阅读位置已经自动记下", "最后看到的页数会自动记录，不需要另点保存。它表示读到哪里，不代表已经掌握。现在回到主页。"),
  s("resume", "resume-open", "click", ".room-resume, .world-resume, .home-continue-card", "接着上次读", "主页的“接着上次读”直接恢复笔记与页码。现在打开它，不必重新从第一页翻起。"),
  s("resume", "recent-home", "click", '[data-tutorial="home"]', "也能直接找最近笔记", "除了续读，也可以从主页找最近更新的笔记。我们回主页看另一个入口。"),
  s("resume", "recent-index", "activate", '[data-tutorial="home-notes"]', "最近笔记入口", "最近笔记方便快速打开文档；它和“继续阅读”的页码定位作用不同。实验室主题会直接展示条目。"),
  s("resume", "recent-open", "click", '[data-tutorial="home-note-item"]', "直接打开最近的笔记", "从最近笔记直接打开这篇教学文档。临时离开课程后，也能省去逐级查找。"),
  s("focus", "focus-enter", "click", ".sidebar-focus-button", "让阅读空间安静下来", "左侧固定的专注按钮，在进入笔记文档后始终可找。现在进入专注阅读，给正文留出安静的空间。"),
  s("focus", "focus-tools", "event", ".focus-reader-toolbar", "鼠标靠近，工具才展开", "平时顶部工具几乎隐去；鼠标靠近顶部中央才展开，键盘聚焦也可以。光标现在会靠近并展开工具。", { event: "focus-tools" }),
  s("focus", "focus-dark", "click", ".focus-theme-toggle", "切换深色或浅色", "专注阅读可以单独切换深浅。正文图片保持原样；这个明暗偏好与空间主题是两件事。"),
  s("focus", "focus-exit", "event", '[aria-label="退出专注阅读"]', "随时回到普通阅读", "退出专注或按 Esc，都能回到普通阅读。工具栏中的“返回章节”则会直接离开文档。", { event: "focus-exit" }),
  s("images", "ocr", "event", ".note-reader .note-image-ocr", "图片中的英文也能选择", "点击“选择文字”后，图片英文也能选择。教学图片使用预置文字层，正式图片按需识别，数字和标点也在范围内。", { event: "ocr-ready" }),
  s("images", "ocr-select", "event", ".note-reader .ocr-text-layer", "看一次拖动选字", "光标将演示选中 Learn 42, understand!，包括数字、逗号和感叹号。正式识别可能有误，选字后还要核对原图。", { event: "ocr-selected" }),
  s("images", "ocr-copy", "event", ".ocr-selection-bar button", "复制选中的内容", "选好以后可点“复制”、按 Ctrl+C 或右键复制。目前没有内置右键翻译；此处只展示入口，不自动覆盖你的剪贴板。", { event: "ocr-copied" }),
  s("images", "ocr-close", "click", ".note-reader .note-image-ocr", "收起选字层", "再次点击“选择中”即可收起文字层，回到普通看图。接下来认识补充图片的入口。"),
  s("images", "insert-open", "click", ".note-image-control > button", "给已有笔记补图", "“插入图片”可以给已有笔记补充实验图、板书等，不必为了一张图重新整理整篇笔记。"),
  s("images", "insert-fields", "confirm", ".note-image-form", "选择位置并补充说明", "正式使用时，选择图片和插入位置，填写说明，确认后写入。教学区禁用文件选择和提交，这里只展示步骤。"),
  s("images", "insert-close", "click", ".note-image-control > button", "先收起补图面板", "先收起补图面板。已有笔记的补图，与下一步的课件图片库，是两个不同入口。"),
  s("images", "courseware-open", "click", ".courseware-images > button", "课件图片库是另一个入口", "课件图片库可导入 PPTX 图片、选择已有图片并插入笔记。现在展开面板；教程不读取你的文件。"),
  s("images", "courseware-info", "confirm", ".courseware-image-library", "导入图片，不等于完成笔记", "导入图片不等于完成逐页整理。原页按钮还需要正文页码与完整原页正确关联，不能省掉教学式讲解。"),
  s("review", "flashcards", "confirm", ".flashcards", "用问题检查自己", "先读问题，自己回想答案，再核对显示的解答。当前闪卡答案直接展示；闪卡是辅助，不能替代逐页正文。"),
  s("review", "mindmap", "confirm", ".artifact-grid .mindmap", "把概念放回结构", "导图用层级串起关系。真实笔记只显示已保存的闪卡和导图；没有时可向 Codex 提出补充要求，不会自动生成。"),
  s("ai", "codex", "confirm", ".organizer .request-box", "AI 是整理伙伴，不只是摘要机", "推荐直接在 Codex 对话附上资料，说清课程、学期和整理范围。例如：“整理到 PHY1000，2026 秋季，逐页讲解并保留对应原图”。由 Codex 阅读、整理并写入笔记本，不必启用内置付费 AI。"),
  s("ai", "instruction", "input", ".request-box", "内置整理台：先说明目标", "内置整理台先写目标，再提供材料。这里演示逐页讲解、保留原图的要求；考试复习侧重点也不默认删去详细内容。"),
  s("ai", "source-text", "click", '[data-tutorial="source-text"]', "文字材料", "“文字”适合课堂记录和摘录。正式使用时可在下方粘贴原始文字或截图。"),
  s("ai", "source-outline", "click", '[data-tutorial="source-outline"]', "大纲材料", "“大纲”适合已有结构的提纲。仍应提供实际内容，避免只给几个标题，让 AI 猜原课件。"),
  s("ai", "source-image", "click", '[data-tutorial="source-image"]', "截图和图片", "“图片”适合截图和板书。可以上传或粘贴剪贴板截图，正式整理默认保留原图。"),
  s("ai", "source-file", "click", '[data-tutorial="source-file"]', "课件文件", "“课件”用于文件材料。支持格式以面板提示为准，添加后仍需主动提交；教学演示不会选择真实文件。"),
  s("ai", "upload", "confirm", ".organizer .upload-zone", "提供材料，而不是只给标题", "在这里添加文件，也可在下方补充原始文字。提交前核对课程、文件和整理范围。教程里的文件选择已禁用，不会偷偷调用服务。"),
  s("ai", "mode", "change", '[data-tutorial="output-mode"]', "选择整理侧重点", "整理模式改变侧重点。现在切到“考试复习”：它强调复习，但不能用少量要点替代逐页讲解。", { value: "exam" }),
  s("ai", "submit", "confirm", '[data-tutorial="organize-submit"]', "最后才执行 AI 整理", "正式点击这里会调用配置的 AI，可能产生费用，并把结果写入课程。核对后再执行，完成后检查页码、讲解、原图和公式；AI 输出不是自动正确。本教学按钮已禁用。"),
  s("ai", "command", "input", ".command-box", "还可以用自然语言提出修改", "自然语言命令还可提出修改要求。这里演示输入“把这篇笔记改为考试复习侧重点”，只练习表达，不执行命令。"),
  s("ai", "command-risk", "confirm", '[data-tutorial="command-submit"]', "执行前，再确认一次影响范围", "“执行命令”会真正调用 AI 并可能修改资料；涉及删除、覆盖时尤其谨慎。教学区禁止提交，退出时练习输入也会丢弃。"),
  s("ai", "collapse", "click", ".organizer .collapse-button", "暂时不用，收起整理台", "暂时不用 AI 整理台时，可以收起它，给阅读多留一点空间。"),
  s("ai", "expand", "click", ".organizer-rail-button", "需要时再打开", "需要时点击窄栏，整理台就会重新展开。下面把学习主线收好，再认识空间设置。"),
  s("space", "term", "change", '[aria-label="主页选择学期"]', "切换学期", "主页可以切换学期，课程跟着学期显示。某门课暂时不见了，先检查学期，不表示资料已经删除。", { value: "2026年秋季 · 教学练习" }),
  s("space", "courses-nav", "click", '[data-tutorial="courses"]', "从侧栏进入课程目录", "侧栏“课程”进入课程目录。顶部也有学期和课程选择器，适合在学习时快速切换。"),
  s("space", "course-switch", "change", '[aria-label="选择课程"]', "切换一门课程", "切换课程前，先确认学期，再确认课程。接下来认识不会改变笔记内容的空间主题。"),
  s("space", "theme-entry", "click", ".theme-entry-button", "最后，挑一个愿意停留的空间", "最后，挑一个愿意停留的空间。主题会改变主页、课程目录与氛围，不改变笔记内容。"),
  s("space", "ambience", "click", '.ambience-switch button', "调节氛围强度", "氛围有极简、标准与沉浸几个强度，用来调节纹理和光影。再有氛围，也要让正文保持清楚。"),
  s("space", "theme", "click", ".theme-card-poetic-realm", "进入一处流动的诗境", "选择“诗之境”后，会直接进入对应主页。各个空间都有自己的结构和氛围，这里用流动诗境示范互动。"),
  s("space", "poem", "click", ".poetry-verses", "点诗句，换一境", "直接点诗句，就能换一境。诗与背景相呼应，不是固定的每日诗歌，景与情共同构成氛围。"),
  s("space", "hold", "click", ".poetry-hold", "喜欢此刻，就让它停留", "喜欢此刻，可以“留住此境”，也可恢复流转。教学主题与诗境变化不会覆盖个人偏好。"),
  s("space", "logout", "confirm", '[data-tutorial="logout"]', "离开之前，记住两个入口", "左侧“退出”用于退出账号；“新手指导”可随时重开或续看。退出教程不会退出登录。临时公网访问依赖电脑开机联网，服务停止后网址失效。", { button: "完成教程" })
];
export type TutorialProgress = { version: number; stepId: string; status: "paused" | "completed"; introSeen: boolean; completedChapters: string[] };
export function readTutorialProgress(userId: string): TutorialProgress | null {
  try {
    const p = JSON.parse(localStorage.getItem(tutorialKey(userId)) ?? "null");
    if (p?.version !== tutorialVersion || !tutorialSteps.some(s => s.id === p.stepId) || !["paused", "completed"].includes(p.status) || typeof p.introSeen !== "boolean") return null;
    const completedChapters: string[] = Array.isArray(p.completedChapters) ? [...new Set<string>(p.completedChapters.filter((id: unknown) => tutorialChapters.some(c => c.id === id)))] : [];
    return { ...p, completedChapters, status: p.status === "completed" && completedChapters.length !== tutorialChapters.length ? "paused" : p.status };
  } catch { return null; }
}
export function tutorialEvent(name: string) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("study-note-tutorial", { detail: name }));
}
