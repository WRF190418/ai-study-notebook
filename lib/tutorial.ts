export const tutorialVersion = 3;
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
  s("begin", "course", "click", ".home-course-card", "选择一门课程", "这是临时教学课程，不是你的正式资料。请点击这张课程卡片；课程按学期归档。"),
  s("begin", "chapter", "click", ".course-chapter", "进入章节", "课程下面按讲次或章节组织内容。点击这个章节。主题不同，入口造型会不同，用法相同。"),
  s("begin", "note", "click", ".notes-list .note-item", "选中本章笔记", "这里列出本章的笔记。点击这一篇，接下来带你认识正文。"),
  s("read", "framework", "confirm", ".note-reader > .markdown > h2", "先看知识之间的联系", "概念框架先回答“这一讲在讲什么”。AI 整理不只是压缩原文，而是建立联系，再逐页带你学习；讲解仍需与原材料核对。"),
  s("read", "page", "confirm", page(1), "逐页讲解，不跳过细节", "每个“第 N 页”对应一张原课件。正文讲清概念、条件、例题和前后联系；摘要、闪卡不能代替正文。"),
  s("read", "source-open", "click", `${page(1)} .page-source-button`, "亲手核对原课件", "点击页标题右侧的小课件图标。正式笔记会打开对应完整原页；本次展示明确标注的教学示例。"),
  s("read", "source-close", "event", '[aria-label="关闭原课件预览"]', "看完原页，回到讲解", "核对图示、公式条件和题干。点击关闭或按 Esc，回到刚才的阅读位置。", { event: "source-closed" }),
  s("read", "zoom-open", "click", ".note-reader .note-image-zoom", "需要细看时，放大图片", "正文中的必要插图会紧邻讲解。点击图片右上角的放大图标，再结合“读图提示”理解箭头和结论。"),
  s("read", "zoom-close", "event", '[aria-label="关闭图片预览"]', "对照完，继续阅读", "点击关闭或按 Esc。图片放大不会改变你在笔记里的位置。", { event: "image-closed" }),
  s("read", "appendix", "click", ".courseware-appendix > summary", "完整材料也有保留", "点击展开原页附录。它方便逐页核对，不能代替正文讲解和页标题的原图按钮。"),
  s("stars", "star", "click", `${page(2)} .page-star-button`, "给值得再看的这一页加星", "点击空心星。星标定位到具体页码，不只是收藏整篇笔记。加星后会自动出现备注框。"),
  s("stars", "memo", "event", ".page-note-editor", "留下“为什么要再看”", "写下例如“二刷时自己画一次知识地图”，再保存备注。也可点取消，只保留星标；只有加星后才有备注入口。", { event: "memo-closed" }),
  s("stars", "memo-open", "click", `${page(2)} .page-note-button`, "备注随时可以修改", "点击星星旁的备注图标，重新打开这一页的备注。"),
  s("stars", "memo-edit", "event", ".page-note-editor", "把提醒改得更有用", "保存修改，或取消本次编辑。取消备注编辑不会取消星标；取消加星则会移除该页的收藏和备注。", { event: "memo-closed" }),
  s("index", "list-close", "click", ".starred-pages-heading", "重点在笔记最上方集合", "加星列表默认展开。先点击标题折叠它，长笔记也能保持整洁。此处已准备一条教学星标。"),
  s("index", "list-open", "click", ".starred-pages-heading", "再展开重点列表", "点击标题展开，可以看到页码、标题和已保存的备注。"),
  s("index", "list-jump", "click", ".starred-page-link", "从列表直达重点页", "点击这一项，跳到对应页面。"),
  s("index", "list-return", "click", ".return-to-stars", "看完再回到列表", "点击悬浮的“返回加星列表”。它会带你回到笔记顶部的重点集合，不用手动往上翻。"),
  s("index", "list-remove", "click", ".starred-page-remove", "不再重要的，可以移除", "点击这条教学星标旁的移除按钮。只取消收藏，不删除笔记正文；正式使用时也可再点页标题的实心星。"),
  s("index", "index-home", "click", '[data-tutorial="home"]', "跨笔记查重点，从主页开始", "接下来看看跨笔记入口。点击左侧主页；你的笔记内容不会因此关闭或丢失。"),
  s("index", "global-stars", "activate", '[data-tutorial="home-stars"]', "全局加星索引", "这里汇总所有笔记的加星页，不限于当前一篇。点击打开索引；实验室主题会直接显示列表。本次刚取消了教学星标，也能看到真实空状态。"),
  s("index", "global-stars-info", "confirm", '.world-index-drawer, [data-tutorial="home-stars"]', "不同笔记的重点，在这里汇合", "正式使用时，点击索引中的页码条目就能跳转到对应笔记页。本次刚移除了教学星标，所以显示空列表；并不是笔记被删除了。"),
  s("search", "search-input", "input", '[aria-label="搜索全部笔记"]', "试着搜索“知识地图”", "输入：知识地图。搜索匹配笔记正文，不只查标题；图片里的未入库选字结果不等于已纳入全文检索。", { value: "知识地图" }),
  s("search", "search-filter", "change", ".search-results-header select", "按课程缩小范围", "把“全部课程”切换成 LEARN 教学课程。结果中的内容片段、课程、章节、笔记和页码，能帮你判断是否找对。", { value: "tutorial-course" }),
  s("search", "search-result", "click", ".search-result-card", "点击结果，直达命中页", "请打开这条结果。笔记会定位到包含“知识地图”的具体页。"),
  s("search", "search-back", "event", page(2), "回到刚才的搜索结果", "可以使用浏览器后退，回到关键词和结果列表；也可以点击下面的“返回搜索结果”完成同样的操作。", { event: "search-back", button: "返回搜索结果" }),
  s("search", "search-clear", "click", '[aria-label="清除搜索"]', "完成查找，清除关键词", "点击搜索框里的 ×，恢复普通浏览。"),
  s("resume", "back-chapters", "click", ".back-button", "返回课程章节", "点击返回按钮。读到深处时，快速向上滚动也会浮出它；缓慢上滚按正常浏览处理，向下滚动则隐藏。"),
  s("resume", "resume-home", "click", '[data-tutorial="home"]', "阅读位置已经自动记下", "不需要另点保存。退出笔记前，最后看到的页码会自动记录；它表示读到哪里，不表示已经掌握。现在点击主页。"),
  s("resume", "resume-open", "click", ".room-resume, .world-resume, .home-continue-card", "接着上次读", "主页这个入口会带你回到上次页面。点击继续阅读。"),
  s("resume", "recent-home", "click", '[data-tutorial="home"]', "也能直接找最近笔记", "再次回到主页，认识另一个快捷入口。"),
  s("resume", "recent-index", "activate", '[data-tutorial="home-notes"]', "最近笔记入口", "点击查看最近更新的笔记。实验室主题直接展示这些条目；它与“继续阅读”的页码定位作用不同。"),
  s("resume", "recent-open", "click", '[data-tutorial="home-note-item"]', "直接打开最近的笔记", "点击这篇教学笔记。以后临时离开课程，也不必重新逐级查找。"),
  s("focus", "focus-enter", "click", ".sidebar-focus-button", "让阅读空间安静下来", "专注按钮固定在左侧；进入笔记文档后，无论读到哪里都能找到。点击进入专注阅读。"),
  s("focus", "focus-tools", "event", ".focus-reader-toolbar", "鼠标靠近，工具才展开", "把鼠标移到顶部中央的小浮标附近；键盘也可用 Tab 聚焦。平时它几乎隐去，不挡正文。", { event: "focus-tools" }),
  s("focus", "focus-dark", "click", ".focus-theme-toggle", "切换深色或浅色", "点击这里切换阅读明暗。正文图片保持原样；这是专注阅读的明暗偏好，和空间主题是两件事。"),
  s("focus", "focus-exit", "event", '[aria-label="退出专注阅读"]', "随时回到普通阅读", "点击退出专注或按 Esc。工具栏中的“返回章节”则会直接离开文档。", { event: "focus-exit" }),
  s("images", "ocr", "event", ".note-reader .note-image-ocr", "图片中的英文也能选择", "点击“选择文字”。本教学图片使用预置文字层，供你练习；正式图片会按需进行英文识别，数字和标点也在范围内。", { event: "ocr-ready" }),
  s("images", "ocr-select", "event", ".note-reader .ocr-text-layer", "在图片上拖动选字", "试着拖动选中 Learn 42, understand!。英文、数字、逗号和感叹号都能选；识别可能有误，复制后仍要核对原图。", { event: "ocr-selected" }),
  s("images", "ocr-copy", "event", ".ocr-selection-bar button", "复制选中的内容", "点击复制，或使用 Ctrl+C／右键复制。这里只教选字和复制，目前没有内置右键翻译。", { event: "ocr-copied" }),
  s("images", "ocr-close", "click", ".note-reader .note-image-ocr", "收起选字层", "再次点击“选择中”，恢复普通看图。"),
  s("images", "insert-open", "click", ".note-image-control > button", "给已有笔记补图", "点击“插入图片”。这用于补充实验图、板书等，不必重新整理整篇笔记。"),
  s("images", "insert-fields", "confirm", ".note-image-form", "选择位置并补充说明", "正式使用时：选图 → 选开头、结尾或指定标题后 → 填说明 → 确认插入。此练习区禁用上传和提交，不会改变真实笔记。"),
  s("images", "insert-close", "click", ".note-image-control > button", "先收起补图面板", "点击“插入图片”收起。接下来区分课件图片库和 AI 整理。"),
  s("images", "courseware-open", "click", ".courseware-images > button", "课件图片库是另一个入口", "点击“课件图片”。这里可以导入 PPTX 中的图片、选择已有图片并插入笔记；并不等同于逐页 AI 教学式整理。"),
  s("images", "courseware-info", "confirm", ".courseware-image-library", "导入图片，不等于完成笔记", "课件原页按钮还需要正文页码与完整原页一一关联。单纯导入图片不会自动补齐讲解；教学区没有真实图片库，导入也已禁用。"),
  s("review", "flashcards", "confirm", ".flashcards", "用问题检查自己", "先读问题，自己回想答案，再核对显示的解答。当前闪卡答案直接展示；闪卡是辅助，不能替代逐页正文。"),
  s("review", "mindmap", "confirm", ".artifact-grid .mindmap", "把概念放回结构", "导图用层级串起关系。真实笔记只显示已保存的闪卡和导图；没有时可向 Codex 提出补充要求，不会自动生成。"),
  s("ai", "codex", "confirm", ".organizer .request-box", "AI 是整理伙伴，不只是摘要机", "推荐直接在 Codex 对话附上资料，说清课程、学期和整理范围。例如：“整理到 PHY1000，2026 秋季，逐页讲解并保留对应原图”。由 Codex 阅读、整理并写入笔记本，不必启用内置付费 AI。"),
  s("ai", "instruction", "input", ".request-box", "内置整理台：先说明目标", "若主动使用内置 AI，先确认顶部课程，再在“整理要求”中写目标。请试写一句要求；考试复习版只改变侧重点，不默认删去详细正文。"),
  s("ai", "source-text", "click", '[data-tutorial="source-text"]', "文字材料", "点击“文字”。适合粘贴课堂记录；可在原始文字框粘贴内容或截图。"),
  s("ai", "source-outline", "click", '[data-tutorial="source-outline"]', "大纲材料", "点击“大纲”。适合已有结构的提纲，但要尽量提供实际内容，避免让 AI 根据几个标题猜测原课件。"),
  s("ai", "source-image", "click", '[data-tutorial="source-image"]', "截图和图片", "点击“图片”。正式使用时可上传图片或粘贴剪贴板截图，默认保留原图。"),
  s("ai", "source-file", "click", '[data-tutorial="source-file"]', "课件文件", "点击“课件”。支持的格式与数量以面板提示为准，添加文件后仍需手动提交；教程不上传你的文件。"),
  s("ai", "upload", "confirm", ".organizer .upload-zone", "提供材料，而不是只给标题", "在这里添加文件，也可在下方补充原始文字。提交前核对课程、文件和整理范围。教程里的文件选择已禁用，不会偷偷调用服务。"),
  s("ai", "mode", "change", '[data-tutorial="output-mode"]', "选择整理侧重点", "试着切换到“考试复习”。标准、考试复习和深入理解改变侧重点，不意味着可以省略逐页教学式讲解。", { value: "exam" }),
  s("ai", "submit", "confirm", '[data-tutorial="organize-submit"]', "最后才执行 AI 整理", "正式点击这里会调用配置的 AI，可能产生费用，并把结果写入课程。核对后再执行，完成后检查页码、讲解、原图和公式；AI 输出不是自动正确。本教学按钮已禁用。"),
  s("ai", "command", "input", ".command-box", "还可以用自然语言提出修改", "试写：“把这篇笔记改为考试复习侧重点”。命令行可附图并指定位置，也可能新建、重写或删除内容，必须把对象和范围说清。这里只练习输入，不执行。"),
  s("ai", "command-risk", "confirm", '[data-tutorial="command-submit"]', "执行前，再确认一次影响范围", "“执行命令”会真正调用 AI 并可能修改资料；涉及删除、覆盖时尤其谨慎。教学区禁止提交，退出时练习输入也会丢弃。"),
  s("ai", "collapse", "click", ".organizer .collapse-button", "暂时不用，收起整理台", "点击箭头收起，给阅读多留一点空间。"),
  s("ai", "expand", "click", ".organizer-rail-button", "需要时再打开", "点击窄栏中的 AI 整理台，随时展开。"),
  s("space", "term", "change", '[aria-label="主页选择学期"]', "切换学期", "请切换到“2026年秋季 · 教学练习”。课程跟着学期切换，原有笔记仍然保留，不是被删除了。", { value: "2026年秋季 · 教学练习" }),
  s("space", "courses-nav", "click", '[data-tutorial="courses"]', "从侧栏进入课程目录", "点击“课程”。顶部也有学期和课程选择器，方便切换。"),
  s("space", "course-switch", "change", '[aria-label="选择课程"]', "切换一门课程", "在选择器里选择教学课程。先确认学期，再确认课程；需要恢复起点时，可点击气泡中的“重来本节”。"),
  s("space", "theme-entry", "click", ".theme-entry-button", "最后，挑一个愿意停留的空间", "点击“空间主题”。主题会改变主页、课程目录和环境氛围，不改变笔记内容。"),
  s("space", "ambience", "click", '.ambience-switch button', "调节氛围强度", "点击极简、标准或沉浸。强度控制光影和纹理，不应牺牲正文清晰度；本次选择仅用于练习。"),
  s("space", "theme", "click", ".theme-card-poetic-realm", "进入一处流动的诗境", "点击“诗之境”。选择主题后直接进入对应主页；六种空间各有不同氛围，这里用诗境示范互动。"),
  s("space", "poem", "click", ".poetry-verses", "点诗句，换一境", "直接点击诗句本身。诗与背景相呼应，不是固定的每日诗歌；留白和景物都服务于诗的情境。"),
  s("space", "hold", "click", ".poetry-hold", "喜欢此刻，就让它停留", "点击“留住此境”暂停，或“继续流转”恢复。正式使用会记住诗境偏好；教学练习不覆盖你的个人偏好。"),
  s("space", "logout", "confirm", '[data-tutorial="logout"]', "离开之前，记住两个入口", "左侧“退出”用于退出账号；“新手指导”可以随时重开或续学。退出教程不会退出登录。临时公网网址需要这台电脑开机联网，服务停止后失效；网址可访问不代表别人拥有你的账号。本次退出账号按钮已禁用。", { button: "完成教程" })
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
