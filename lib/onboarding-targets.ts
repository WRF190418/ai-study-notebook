import type { Course, Lesson, Note } from "./types";
import { extractNotePages, extractPageSourceImages, pageAnchorId } from "./note-pages";
import type { GuideAction, GuideDestination } from "./onboarding";

export type GuideRoute = GuideDestination & { noteId?: string; courseId?: string };
export function resolveGuideRoute(action: GuideAction, workspace: { courses: Course[]; lessons: Lesson[]; notes: Note[] }, preferredNoteId?: string, preferredCourseId?: string): GuideRoute {
  const candidates = workspace.notes.filter(note => workspace.courses.some(course => course.id === note.courseId) && workspace.lessons.some(lesson => lesson.id === note.lessonId && lesson.courseId === note.courseId));
  const preferred = candidates.find(note => note.id === preferredNoteId);
  const ordered = preferred ? [preferred, ...candidates.filter(note => note !== preferred)] : candidates;
  const course = workspace.courses.find(item => item.id === preferredCourseId) ?? workspace.courses[0];
  if (action === "home") return { selector: candidates.length ? ".home-continue-card, .room-resume, .world-resume" : ".home-course-card", context: "主页 · 已有的课程和继续阅读入口", notice: candidates.length ? undefined : "当前还没有笔记，先从课程入口认识笔记本；整理好第一篇笔记后会有续读入口。" };
  if (action === "themes") return { selector: ".theme-gallery", context: "空间主题 · 六种学习空间", notice: "选中主题后会立即进入它的主页，悬浮操作指引仍可继续使用。" };
  if (action === "search") return { selector: ".search-box", context: "全局正文搜索 · 可以跨课程查找", notice: candidates.length ? undefined : "当前没有可搜索的笔记。先熟悉输入位置，整理好资料后再输入正文关键词。" };
  if (action === "courses" || action === "organizer") return { selector: action === "courses" ? ".course-chapter" : ".organizer .request-box", courseId: course?.id, context: course ? `${course.code} · ${course.title}` : "尚无课程", unavailable: course ? undefined : "当前账号没有课程。请先在 Codex 对话中说明课程名称和学期，创建课程并整理资料。", notice: action === "organizer" ? "这里只打开整理台，不会选择文件、填写命令、提交整理或调用 AI。" : undefined };
  const pages = new Map(ordered.map(note => [note.id, extractNotePages(note.contentMarkdown)]));
  let note: Note | undefined;
  if (action === "stars") note = ordered.find(item => pages.get(item.id)?.length);
  else if (action === "ocr") note = ordered.find(item => /!\[[^\]]*\]\(\/api\/media\/[A-Za-z0-9_-]+(?:\s+["'][^"']*["'])?\)/.test(item.contentMarkdown));
  else if (action === "reading") note = ordered.find(item => {
    const originals = extractPageSourceImages(item.contentMarkdown);
    return pages.get(item.id)?.some(page => originals.has(page.pageNumber));
  }) ?? ordered[0];
  else if (action === "artifacts") note = ordered.find(item => item.flashcards.length || item.mindMap.length) ?? ordered[0];
  else note = ordered[0];
  if (!note) return { selector: "", context: "先准备适合练习的笔记", unavailable: action === "ocr" ? "当前没有含可选字图片的笔记。请先整理带原图的课件，或为笔记插入图片，再回来练习。" : action === "stars" ? "当前没有含「第 N 页」标题的逐页笔记。先按逐页要求整理课件，才能练习页星标。" : "当前还没有可打开的笔记。先把资料交给 Codex，说明课程和学期，再回来跟着操作。" };
  const targetCourse = workspace.courses.find(item => item.id === note.courseId)!;
  const lesson = workspace.lessons.find(item => item.id === note.lessonId)!;
  const base = { noteId: note.id, courseId: note.courseId, context: `${targetCourse.code} · ${lesson.title} · ${note.title}` };
  if (action === "reading") {
    const originals = extractPageSourceImages(note.contentMarkdown);
    const page = pages.get(note.id)?.find(item => originals.has(item.pageNumber));
    return { ...base, selector: page ? `#${pageAnchorId(note.id, page.key)} .page-source-button` : pages.get(note.id)?.length ? ".note-reader .note-page-heading" : ".note-reader", notice: page ? `已找到第 ${page.pageNumber} 页的原课件按钮；点击小图标查看完整原页。` : "这篇笔记尚未关联逐页原图，可以先阅读正文。需要原课件按钮时，请补齐对应原页图片。" };
  }
  if (action === "stars") return { ...base, selector: `#${pageAnchorId(note.id, pages.get(note.id)![0].key)} .page-star-button`, notice: "只有你亲手点击星星才会加星；指引不会替你收藏或填写备注。" };
  if (action === "ocr") return { ...base, selector: ".note-reader .note-image-ocr", notice: "只定位选字按钮，不会自动启动识别。若图片在附录中，会为你展开对应折叠区域。" };
  if (action === "artifacts") return { ...base, selector: ".artifact-grid", notice: note.flashcards.length || note.mindMap.length ? undefined : "这篇笔记还没有已保存的闪卡或导图。这里显示的是实际空状态；引导不会替你生成内容。" };
  return { ...base, selector: ".sidebar-focus-button" };
}
