import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import {
  createLesson,
  createCourseWithStarterLesson,
  defaultPreferences,
  deleteCourse,
  deleteLesson,
  deleteNote,
  getWorkspace,
  updateCourse,
  updateLesson,
  updateNote,
  updateUserPreferences
} from "@/lib/db";
import { interpretNotebookCommand } from "@/lib/ai";
import type { AiCommandResult } from "@/lib/ai";
import type { Course, Lesson, Note, UserPreferences } from "@/lib/types";

const schema = z.object({
  command: z.string().min(2).max(2000),
  currentCourseId: z.string()
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录。" }, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "请输入有效的 AI 命令。" }, { status: 400 });
  }

  try {
    const workspace = await getWorkspace(user.id);
    const currentCourse = workspace.courses.find((item) => item.id === parsed.data.currentCourseId);
    let aiError: unknown = null;
    let aiReply = "";
    let aiIncomplete = "";

    try {
      const result = await interpretNotebookCommand({
        command: parsed.data.command,
        currentCourseId: parsed.data.currentCourseId,
        courses: workspace.courses,
        lessons: workspace.lessons,
        notes: workspace.notes,
        preferences: workspace.preferences
      });
      if (result.action === "reply") {
        aiReply = result.message;
      } else {
        const response = await applyAiCommandResult({
          result,
          userId: user.id,
          currentCourseId: parsed.data.currentCourseId,
          workspace
        });
        if (response) return response;
        aiIncomplete = result.message || "AI 已返回理解结果，但缺少可执行对象或修改内容。";
      }
    } catch (error) {
      aiError = error;
    }

    const directLessonStyle = inferLessonStyleCommand(parsed.data.command, workspace.lessons, currentCourse?.id);
    if (directLessonStyle) {
      const updated = await updateLesson(user.id, directLessonStyle.lesson.id, {
        accent: directLessonStyle.accent,
        icon: directLessonStyle.icon
      });
      if (!updated) return NextResponse.json({ error: "没有找到要调整样式的章节。" }, { status: 404 });
      const nextWorkspace = await getWorkspace(user.id);
      return NextResponse.json({
        action: "update_lesson_style",
        message: `已将「${updated.title}」的卡片样式改为${directLessonStyle.label}。`,
        selectedCourseId: updated.courseId,
        selectedLessonId: updated.id,
        selectedNoteId: "",
        workspace: nextWorkspace
      });
    }

    const directPreferences = inferPreferenceCommand(parsed.data.command, user.id);
    if (directPreferences) {
      const preferences = await updateUserPreferences(user.id, directPreferences);
      const nextWorkspace = await getWorkspace(user.id);
      return NextResponse.json({
        action: "update_preferences",
        message: "已按你的要求调整当前账号的界面风格。",
        selectedCourseId: parsed.data.currentCourseId,
        selectedLessonId: "",
        selectedNoteId: "",
        preferences,
        workspace: nextWorkspace
      });
    }

    const directCourse = inferCreateCourseCommand(parsed.data.command, currentCourse?.term);
    if (directCourse) {
      const { course, lesson } = await createCourseWithStarterLesson(user.id, directCourse);
      const nextWorkspace = await getWorkspace(user.id);
      return NextResponse.json({
        action: "create_course",
        message: `已新建板块「${course.title}」。`,
        selectedCourseId: course.id,
        selectedLessonId: lesson.id,
        selectedNoteId: "",
        workspace: nextWorkspace
      });
    }

    const directCreateLesson = inferCreateLessonCommand(parsed.data.command);
    if (directCreateLesson && currentCourse) {
      const lesson = await createLesson(user.id, currentCourse.id, directCreateLesson);
      const nextWorkspace = await getWorkspace(user.id);
      return NextResponse.json({
        action: "create_lesson",
        message: `已在「${currentCourse.title}」中新建章节「${lesson.title}」。`,
        selectedCourseId: currentCourse.id,
        selectedLessonId: lesson.id,
        selectedNoteId: "",
        workspace: nextWorkspace
      });
    }

    const directDeleteCourse = inferDeleteCourseCommand(parsed.data.command, workspace.courses, currentCourse?.id);
    if (directDeleteCourse) {
      if (workspace.courses.length <= 1) {
        return NextResponse.json({ error: "至少需要保留一个课程板块。" }, { status: 422 });
      }
      const deleted = await deleteCourse(user.id, directDeleteCourse.id);
      if (!deleted) return NextResponse.json({ error: "没有找到要删除的课程板块。" }, { status: 404 });
      const nextWorkspace = await getWorkspace(user.id);
      const nextCourse = nextWorkspace.courses[0];
      const nextLesson = nextWorkspace.lessons.find((lesson) => lesson.courseId === nextCourse?.id);
      return NextResponse.json({
        action: "delete_course",
        message: `已删除课程板块「${deleted.title}」。`,
        selectedCourseId: nextCourse?.id ?? "",
        selectedLessonId: nextLesson?.id ?? "",
        selectedNoteId: "",
        workspace: nextWorkspace
      });
    }

    const directDeleteLesson = inferDeleteLessonCommand(parsed.data.command, workspace.lessons, currentCourse?.id);
    if (directDeleteLesson) {
      const deleted = await deleteLesson(user.id, directDeleteLesson.id);
      if (!deleted) return NextResponse.json({ error: "没有找到要删除的章节。" }, { status: 404 });
      const nextWorkspace = await getWorkspace(user.id);
      const nextLesson = nextWorkspace.lessons.find((lesson) => lesson.courseId === deleted.courseId);
      return NextResponse.json({
        action: "delete_lesson",
        message: `已删除章节「${deleted.title}」。`,
        selectedCourseId: deleted.courseId,
        selectedLessonId: nextLesson?.id ?? "",
        selectedNoteId: "",
        workspace: nextWorkspace
      });
    }

    const directRenameCourse = inferRenameCourseCommand(parsed.data.command, workspace.courses, currentCourse?.id);
    if (directRenameCourse) {
      const updated = await updateCourse(user.id, directRenameCourse.course.id, {
        title: directRenameCourse.nextTitle,
        code: inferCourseCode(directRenameCourse.nextTitle) || directRenameCourse.course.code
      });
      if (!updated) return NextResponse.json({ error: "没有找到要重命名的课程板块。" }, { status: 404 });
      const nextWorkspace = await getWorkspace(user.id);
      return NextResponse.json({
        action: "rename_course",
        message: `已将课程板块重命名为「${updated.title}」。`,
        selectedCourseId: updated.id,
        selectedLessonId: "",
        selectedNoteId: "",
        workspace: nextWorkspace
      });
    }

    const directRenameLesson = inferRenameLessonCommand(parsed.data.command, workspace.lessons, currentCourse?.id);
    if (directRenameLesson) {
      const updated = await updateLesson(user.id, directRenameLesson.lesson.id, { title: directRenameLesson.nextTitle });
      if (!updated) return NextResponse.json({ error: "没有找到要重命名的章节。" }, { status: 404 });
      const nextWorkspace = await getWorkspace(user.id);
      return NextResponse.json({
        action: "rename_lesson",
        message: `已将章节重命名为「${updated.title}」。`,
        selectedCourseId: updated.courseId,
        selectedLessonId: updated.id,
        selectedNoteId: "",
        workspace: nextWorkspace
      });
    }

    const directDeleteNote = inferDeleteNoteCommand(parsed.data.command, workspace.notes, currentCourse?.id);
    if (directDeleteNote) {
      const deleted = await deleteNote(user.id, directDeleteNote.id);
      if (!deleted) return NextResponse.json({ error: "没有找到要删除的笔记。" }, { status: 404 });
      const nextWorkspace = await getWorkspace(user.id);
      return NextResponse.json({
        action: "delete_note",
        message: `已删除笔记「${deleted.title}」。`,
        selectedCourseId: deleted.courseId,
        selectedLessonId: deleted.lessonId,
        selectedNoteId: "",
        workspace: nextWorkspace
      });
    }

    if (aiReply) {
      return NextResponse.json({
        action: "reply",
        message: aiReply,
        selectedCourseId: parsed.data.currentCourseId,
        selectedLessonId: "",
        selectedNoteId: "",
        workspace
      });
    }

    if (aiError) throw aiError;

    if (aiIncomplete) {
      return NextResponse.json(
        {
          error: `已优先调用 AI，但这条命令没有形成可执行修改：${aiIncomplete} 请再明确对象和动作，例如“把第一章卡片改成粉色”。`
        },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { error: "没有理解这条命令。你可以说明要修改的对象和动作，例如“把第一章标题改为牛顿力学”或“把第一章卡片改成粉色”。" },
      { status: 422 }
    );
  } catch (error) {
    if (error instanceof Error && (error.message === "OPENAI_API_KEY_MISSING" || error.message === "AI_PROVIDER_KEY_MISSING")) {
      return NextResponse.json(
        { error: "尚未配置可用的 AI API Key。请在 .env.local 中填入 DEEPSEEK_API_KEY、OPENAI_API_KEY 或 ZHIPU_API_KEY 后重启开发服务器。" },
        { status: 503 }
      );
    }

    if (hasStatus(error, 429)) {
      return NextResponse.json({ error: "已优先调用 AI，但当前模型达到速率限制或额度限制，请稍后再试。" }, { status: 429 });
    }

    console.error(error);
    return NextResponse.json(
      {
        error: explainCommandFailure(error)
      },
      { status: 500 }
    );
  }
}

async function applyAiCommandResult({
  result,
  userId,
  currentCourseId,
  workspace
}: {
  result: AiCommandResult;
  userId: string;
  currentCourseId: string;
  workspace: Awaited<ReturnType<typeof getWorkspace>>;
}) {
  if (result.action === "create_course") {
    const title = result.course?.title?.trim();
    if (!title) return null;
    const { course, lesson } = await createCourseWithStarterLesson(userId, {
      title: title.slice(0, 80),
      code: (result.course?.code || inferCourseCode(title) || title.toUpperCase().replace(/\s+/g, "-").slice(0, 16)).slice(0, 30),
      term: (result.course?.term || workspace.courses.find((item) => item.id === currentCourseId)?.term || "当前学期").slice(0, 40),
      description: (result.course?.description || `用于整理 ${title} 相关笔记。`).slice(0, 220),
      tags: result.course?.tags?.slice(0, 4),
      lessonTitle: result.course?.lessonTitle,
      lessonSubtitle: result.course?.lessonSubtitle
    });
    const nextWorkspace = await getWorkspace(userId);
    return NextResponse.json({
      action: "create_course",
      message: result.message || `已新建板块「${course.title}」。`,
      selectedCourseId: course.id,
      selectedLessonId: lesson.id,
      selectedNoteId: "",
      workspace: nextWorkspace
    });
  }

  if (result.action === "create_lesson") {
    const courseId = result.courseId || currentCourseId;
    const course = workspace.courses.find((item) => item.id === courseId);
    const title = result.lesson?.title?.trim();
    if (!course || !title) return null;
    const lesson = await createLesson(userId, course.id, {
      title: title.slice(0, 80),
      subtitle: result.lesson?.subtitle,
      icon: result.lesson?.icon,
      accent: result.lesson?.accent
    });
    const nextWorkspace = await getWorkspace(userId);
    return NextResponse.json({
      action: "create_lesson",
      message: result.message || `已在「${course.title}」中新建章节「${lesson.title}」。`,
      selectedCourseId: course.id,
      selectedLessonId: lesson.id,
      selectedNoteId: "",
      workspace: nextWorkspace
    });
  }

  if (result.action === "delete_course") {
    if (!result.courseId || workspace.courses.length <= 1) return null;
    const deleted = await deleteCourse(userId, result.courseId);
    if (!deleted) return null;
    const nextWorkspace = await getWorkspace(userId);
    const nextCourse = nextWorkspace.courses[0];
    const nextLesson = nextWorkspace.lessons.find((lesson) => lesson.courseId === nextCourse?.id);
    return NextResponse.json({
      action: "delete_course",
      message: result.message || `已删除课程板块「${deleted.title}」。`,
      selectedCourseId: nextCourse?.id ?? "",
      selectedLessonId: nextLesson?.id ?? "",
      selectedNoteId: "",
      workspace: nextWorkspace
    });
  }

  if (result.action === "delete_lesson") {
    if (!result.lessonId) return null;
    const deleted = await deleteLesson(userId, result.lessonId);
    if (!deleted) return null;
    const nextWorkspace = await getWorkspace(userId);
    const nextLesson = nextWorkspace.lessons.find((lesson) => lesson.courseId === deleted.courseId);
    return NextResponse.json({
      action: "delete_lesson",
      message: result.message || `已删除章节「${deleted.title}」。`,
      selectedCourseId: deleted.courseId,
      selectedLessonId: nextLesson?.id ?? "",
      selectedNoteId: "",
      workspace: nextWorkspace
    });
  }

  if (result.action === "delete_note") {
    if (!result.noteId) return null;
    const deleted = await deleteNote(userId, result.noteId);
    if (!deleted) return null;
    const nextWorkspace = await getWorkspace(userId);
    return NextResponse.json({
      action: "delete_note",
      message: result.message || `已删除笔记「${deleted.title}」。`,
      selectedCourseId: deleted.courseId,
      selectedLessonId: deleted.lessonId,
      selectedNoteId: "",
      workspace: nextWorkspace
    });
  }

  if (result.action === "rename_course") {
    if (!result.courseId || !result.newTitle?.trim()) return null;
    const updated = await updateCourse(userId, result.courseId, {
      title: result.newTitle.slice(0, 80),
      code: inferCourseCode(result.newTitle) || workspace.courses.find((course) => course.id === result.courseId)?.code
    });
    if (!updated) return null;
    const nextWorkspace = await getWorkspace(userId);
    return NextResponse.json({
      action: "rename_course",
      message: result.message || `已将课程板块重命名为「${updated.title}」。`,
      selectedCourseId: updated.id,
      selectedLessonId: "",
      selectedNoteId: "",
      workspace: nextWorkspace
    });
  }

  if (result.action === "rename_lesson") {
    if (!result.lessonId || !result.newTitle?.trim()) return null;
    const updated = await updateLesson(userId, result.lessonId, { title: result.newTitle.slice(0, 80) });
    if (!updated) return null;
    const nextWorkspace = await getWorkspace(userId);
    return NextResponse.json({
      action: "rename_lesson",
      message: result.message || `已将章节重命名为「${updated.title}」。`,
      selectedCourseId: updated.courseId,
      selectedLessonId: updated.id,
      selectedNoteId: "",
      workspace: nextWorkspace
    });
  }

  if (result.action === "update_lesson_style") {
    if (!result.lessonId || !result.lesson || !Object.keys(result.lesson).length) return null;
    const updated = await updateLesson(userId, result.lessonId, {
      icon: result.lesson.icon,
      accent: result.lesson.accent,
      subtitle: result.lesson.subtitle
    });
    if (!updated) return null;
    const nextWorkspace = await getWorkspace(userId);
    return NextResponse.json({
      action: "update_lesson_style",
      message: result.message || `已调整「${updated.title}」的章节卡片样式。`,
      selectedCourseId: updated.courseId,
      selectedLessonId: updated.id,
      selectedNoteId: "",
      workspace: nextWorkspace
    });
  }

  if (result.action === "update_note") {
    if (!result.noteId || !result.updatedNote?.markdown) return null;
    const updated = await updateNote(userId, result.noteId, {
      title: result.updatedNote.title,
      summary: result.updatedNote.summary,
      contentMarkdown: result.updatedNote.markdown
    });
    if (!updated) return null;
    const nextWorkspace = await getWorkspace(userId);
    return NextResponse.json({
      action: "update_note",
      message: result.message || `已修改笔记「${updated.title}」。`,
      selectedCourseId: updated.courseId,
      selectedLessonId: updated.lessonId,
      selectedNoteId: updated.id,
      workspace: nextWorkspace
    });
  }

  if (result.action === "update_preferences") {
    if (!result.preferences || !Object.keys(result.preferences).length) return null;
    const preferences = await updateUserPreferences(userId, result.preferences);
    const nextWorkspace = await getWorkspace(userId);
    return NextResponse.json({
      action: "update_preferences",
      message: result.message || "已按你的要求调整当前账号的界面风格。",
      selectedCourseId: currentCourseId,
      selectedLessonId: "",
      selectedNoteId: "",
      preferences,
      workspace: nextWorkspace
    });
  }

  return null;
}

function hasStatus(error: unknown, status: number) {
  return typeof error === "object" && error !== null && "status" in error && (error as { status?: number }).status === status;
}

function inferCreateCourseCommand(command: string, fallbackTerm = "当前学期") {
  const wantsCreate = /新建|创建|新增|添加|建一个|开一个/.test(command);
  const wantsCourse = /大板块|板块|课程|科目|笔记本|学习空间/.test(command);
  const isLessonOrNote = /章节|小节|闪卡/.test(command) || (/笔记/.test(command) && !/笔记本/.test(command));
  if (!wantsCreate || !wantsCourse || isLessonOrNote) return null;

  const titleMatch = command.match(
    /(?:新建|创建|新增|添加|建一个|开一个)(?:一个|一门|新的)?\s*(.+?)\s*(?:大板块|板块|课程|科目|笔记本|学习空间)/
  );
  const captured = normalizeSpaces(titleMatch?.[1] ?? "");
  const withoutTerm = captured
    .replace(/(?:，|,)?\s*(?:学期|term|semester).*/i, "")
    .replace(/(?:的)?学习$/i, "")
    .trim();
  const code = inferCourseCode(captured || command);
  const title = normalizeCourseTitle(withoutTerm || captured || code || "新课程", code);
  const term = inferTerm(command) || fallbackTerm;

  return {
    title: title.slice(0, 80),
    code: (code || title.toUpperCase().replace(/\s+/g, "-").slice(0, 16)).slice(0, 30),
    term: term.slice(0, 40),
    description: `用于整理 ${title} 相关笔记。`,
    tags: ["AI 命令", "课程笔记"],
    lessonTitle: "第一章",
    lessonSubtitle: "Start here"
  };
}

function normalizeSpaces(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function inferCourseCode(value: string) {
  const match = value.match(/[A-Za-z]{2,}\s*-?\s*\d{3,5}[A-Za-z]?/);
  return match?.[0].replace(/\s+/g, "").toUpperCase() ?? "";
}

function normalizeCourseTitle(value: string, code: string) {
  const compactCode = code.toLowerCase().replace(/[-\s]/g, "");
  const compactValue = value.toLowerCase().replace(/[-\s]/g, "");
  if (code && (!value || compactValue === compactCode || compactValue === `${compactCode}学习`)) {
    return code;
  }
  if (code && compactValue.startsWith(compactCode)) {
    return value.replace(new RegExp(code, "i"), code).replace(/学习$/, "").trim() || code;
  }
  return value;
}

function inferTerm(command: string) {
  const fullTerm = command.match(/20\d{2}\s*年?\s*(?:春季|秋季|夏季|冬季|上|下)\s*(?:学期)?/);
  if (fullTerm) return fullTerm[0].replace(/\s+/g, "");
  if (/秋季|秋学期/.test(command)) return "秋季学期";
  if (/春季|春学期/.test(command)) return "春季学期";
  if (/夏季|夏学期/.test(command)) return "夏季学期";
  if (/冬季|冬学期/.test(command)) return "冬季学期";
  return "";
}

function inferCreateLessonCommand(command: string): Pick<Lesson, "title"> & Partial<Pick<Lesson, "subtitle" | "icon" | "accent">> | null {
  const wantsCreate = /新建|创建|新增|添加|建一个|开一个/.test(command);
  const wantsLesson = isLessonLikeCommand(command);
  if (!wantsCreate || !wantsLesson) return null;

  const match = command.match(
    /(?:新建|创建|新增|添加|建一个|开一个)(?:一个|一节|新的)?\s*(.+?)\s*(?:章节卡片|章节|小节|课时|lecture|笔记栏|卡片)/
  );
  const title = cleanTargetName(match?.[1] ?? "");
  if (!title) return null;
  return {
    title: title.slice(0, 80),
    subtitle: "AI-created chapter",
    icon: inferLessonIcon(title),
    accent: inferLessonAccent(title)
  };
}

function inferDeleteCourseCommand(command: string, courses: Course[], currentCourseId?: string) {
  if (!isDeleteCommand(command) || !/大板块|板块|课程|科目|笔记本|学习空间/.test(command)) return null;
  if (/章节|小节|课时|lecture|笔记栏|卡片|笔记/.test(command) && !/笔记本/.test(command)) return null;
  const target = extractTargetBeforeObject(command, /大板块|板块|课程|科目|笔记本|学习空间/);
  if (/当前|这个|本课程|此课程|这个板块/.test(command) && currentCourseId) {
    return courses.find((course) => course.id === currentCourseId) ?? null;
  }
  return findBestCourse(target || command, courses);
}

function inferDeleteLessonCommand(command: string, lessons: Lesson[], currentCourseId?: string) {
  if (!isDeleteCommand(command) || !isLessonLikeCommand(command)) return null;
  const target = extractTargetBeforeObject(command, /章节卡片|章节|小节|课时|lecture|笔记栏|卡片/);
  const scopedLessons = lessons.filter((lesson) => !currentCourseId || lesson.courseId === currentCourseId);
  if (/当前|这个|本章|此章节|这个章节|这个笔记栏/.test(command)) {
    return findBestLesson(target, scopedLessons) ?? scopedLessons[0] ?? null;
  }
  return findBestLesson(target || command, scopedLessons);
}

function inferDeleteNoteCommand(command: string, notes: Note[], currentCourseId?: string) {
  if (!isDeleteCommand(command) || !/笔记/.test(command) || /笔记栏|笔记本/.test(command)) return null;
  const scopedNotes = notes.filter((note) => !currentCourseId || note.courseId === currentCourseId);
  if (/刚才|最新|上一[篇个]?|最近/.test(command)) return scopedNotes[0] ?? null;
  const target = extractTargetBeforeObject(command, /笔记/);
  return findBestNote(target || command, scopedNotes);
}

function inferRenameCourseCommand(command: string, courses: Course[], currentCourseId?: string) {
  const rename = extractRename(command);
  if (!rename || !/大板块|板块|课程|科目|笔记本|学习空间/.test(command)) return null;
  const course =
    /当前|这个|本课程|此课程|这个板块/.test(rename.from) && currentCourseId
      ? courses.find((item) => item.id === currentCourseId)
      : findBestCourse(rename.from, courses);
  if (!course) return null;
  return { course, nextTitle: cleanTargetName(rename.to).slice(0, 80) };
}

function inferRenameLessonCommand(command: string, lessons: Lesson[], currentCourseId?: string) {
  const rename = extractRename(command);
  if (!rename || !isLessonLikeCommand(command)) return null;
  const scopedLessons = lessons.filter((lesson) => !currentCourseId || lesson.courseId === currentCourseId);
  const lesson = findBestLesson(rename.from, scopedLessons);
  if (!lesson) return null;
  return { lesson, nextTitle: cleanTargetName(rename.to).slice(0, 80) };
}

function inferLessonStyleCommand(command: string, lessons: Lesson[], currentCourseId?: string) {
  const isStyle = /按钮|颜色|色|卡片|封面|图标|样式|外观|背景/.test(command);
  if (!isStyle || !isLessonLikeCommand(command)) return null;
  const scopedLessons = lessons.filter((lesson) => !currentCourseId || lesson.courseId === currentCourseId);
  const target =
    extractTargetBeforeStyle(command) ||
    command.match(/(.+?)(?:按钮|颜色|卡片|封面|图标|样式|外观|背景)/)?.[1] ||
    command;
  const lesson = findBestLesson(target, scopedLessons);
  if (!lesson) return null;

  const color = inferLessonAccentFromCommand(command);
  const icon = inferLessonIconFromCommand(command);
  if (!color && !icon) return null;

  return {
    lesson,
    accent: color?.accent,
    icon,
    label: [color?.label, icon ? "对应图标" : ""].filter(Boolean).join("、") || "新样式"
  };
}

function isDeleteCommand(command: string) {
  return /删除|删掉|移除|去掉|清除/.test(command);
}

function isLessonLikeCommand(command: string) {
  return /章节|小节|课时|lecture|笔记栏|章节卡片|卡片|第?\s*(?:\d{1,2}|[一二三四五六七八九十])\s*(?:章|节|讲)/i.test(command);
}

function extractTargetBeforeObject(command: string, objectPattern: RegExp) {
  const deleteWords = "(?:删除|删掉|移除|去掉|清除)";
  const match = command.match(new RegExp(`${deleteWords}(?:这个|当前|一个|一篇|一节)?\\s*(.+?)\\s*(?:的)?(?:${objectPattern.source})`));
  return cleanTargetName(match?.[1] ?? "");
}

function extractTargetBeforeStyle(command: string) {
  const match = command.match(/(.+?)(?:课程按钮|按钮|卡片|封面|图标|样式|外观|背景)?(?:颜色|色|样式|外观)?\s*(?:改成|改为|设为|设置为|换成|变成)/);
  return cleanTargetName(match?.[1] ?? "");
}

function extractRename(command: string) {
  const match =
    command.match(/(?:把|将)\s*(.+?)\s*(?:改名为|重命名为|改成|改为|命名为)\s*(.+)/) ??
    command.match(/(?:重命名|改名)\s*(.+?)\s*(?:为|成)\s*(.+)/) ??
    command.match(/(.+?)(?:标题|名字|名称|题目)\s*(?:改名为|重命名为|改成|改为|命名为)\s*(.+)/) ??
    command.match(/(.+?)\s*(?:改名为|重命名为|改成|改为|命名为)\s*(.+)/);
  if (!match) return null;
  return {
    from: cleanTargetName(match[1]).replace(/(?:标题|名字|名称|题目)$/, ""),
    to: cleanTargetName(match[2])
  };
}

function inferLessonAccentFromCommand(command: string): { accent: Lesson["accent"]; label: string } | null {
  if (/彩色|多彩|缤纷|活泼|鲜艳/.test(command)) return { accent: "rose", label: "彩色渐变" };
  if (/粉|粉色|玫瑰|玫红|红/.test(command)) return { accent: "rose", label: "粉色" };
  if (/蓝|蓝色|青|青蓝/.test(command)) return { accent: "cobalt", label: "蓝色" };
  if (/黄|黄色|橙|橙色|金|金色|琥珀/.test(command)) return { accent: "amber", label: "橙黄色" };
  if (/绿|绿色|自然|清爽|薄荷/.test(command)) return { accent: "sage", label: "绿色" };
  return null;
}

function inferLessonIconFromCommand(command: string): Lesson["icon"] | undefined {
  if (/公式|函数|数学|方程|表格/.test(command)) return "function";
  if (/物理|力学|原子|量子|电磁|热学/.test(command)) return "atom";
  if (/图|图片|截图|标注|视觉/.test(command)) return "image";
  if (/复习|重点|考试|闪卡/.test(command)) return "sparkles";
  return undefined;
}

function explainCommandFailure(error: unknown) {
  if (error instanceof Error && error.message === "AI_JSON_PARSE_FAILED") {
    return "已优先调用 AI，但模型返回的内容不是可执行 JSON。请重试，或把命令写得更具体一些。";
  }
  if (error instanceof Error && error.message === "AI_EMPTY_RESPONSE") {
    return "已优先调用 AI，但模型返回为空。请稍后重试。";
  }
  if (hasStatus(error, 400)) {
    return "已优先调用 AI，但模型请求被拒绝，可能是当前模型不支持 JSON 输出参数。系统会继续尝试其它已配置模型；如果仍失败，请检查模型配置。";
  }
  if (hasStatus(error, 401) || hasStatus(error, 403)) {
    return "已优先调用 AI，但 API Key 无效、权限不足，或账号暂时不能访问该模型。";
  }
  if (typeof error === "object" && error !== null && "status" in error && typeof (error as { status?: number }).status === "number") {
    return `已优先调用 AI，但模型服务返回 ${(error as { status: number }).status}。请稍后重试或检查 API 配置。`;
  }
  return "AI 命令执行失败。本地可直接处理：新建/删除/重命名课程，新建/删除/重命名章节，删除笔记，调整按钮、颜色、布局等界面偏好。";
}

function cleanTargetName(value: string) {
  return normalizeSpaces(value)
    .replace(/^(一个|一门|一节|一篇|这个|当前|新的)/, "")
    .replace(/(?:的)?(?:大板块|板块|课程|科目|笔记本|学习空间|章节卡片|章节|小节|课时|笔记栏|卡片|笔记)$/i, "")
    .replace(/[。.!！?？]$/, "")
    .trim();
}

function normalizeForMatch(value: string) {
  return value
    .toLowerCase()
    .replace(/[，,、。.!！?？:：;；"'“”‘’()\[\]【】《》<>·\-_\s]/g, "")
    .replace(/的/g, "")
    .replace(/大板块|板块|课程|科目|笔记本|学习空间|章节卡片|章节|小节|课时|笔记栏|卡片|笔记/g, "");
}

function findBestCourse(target: string, courses: Course[]) {
  const normalizedTarget = normalizeForMatch(target);
  if (!normalizedTarget) return null;
  return (
    courses.find((course) => {
      const title = normalizeForMatch(course.title);
      const code = normalizeForMatch(course.code);
      return title === normalizedTarget || code === normalizedTarget || title.includes(normalizedTarget) || normalizedTarget.includes(title);
    }) ?? null
  );
}

function findBestLesson(target: string, lessons: Lesson[]) {
  const normalizedTarget = normalizeForMatch(target);
  const lectureOrder = parseLessonOrder(target);
  if (lectureOrder) {
    const byOrder = lessons.find((lesson) => lesson.order === lectureOrder);
    if (byOrder) return byOrder;
  }
  if (!normalizedTarget) return null;
  return (
    lessons.find((lesson) => {
      const title = normalizeForMatch(lesson.title);
      const subtitle = normalizeForMatch(lesson.subtitle);
      return title === normalizedTarget || title.includes(normalizedTarget) || normalizedTarget.includes(title) || subtitle.includes(normalizedTarget);
    }) ?? null
  );
}

function parseLessonOrder(target: string) {
  const digit = target.match(/(?:lecture|第)?\s*(\d{1,2})\s*(?:章|节|讲)?/i)?.[1];
  if (digit) return Number(digit);
  const chinese = target.match(/第?\s*([一二三四五六七八九十])\s*(?:章|节|讲)/)?.[1];
  if (!chinese) return null;
  const map: Record<string, number> = {
    一: 1,
    二: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
    十: 10
  };
  return map[chinese] ?? null;
}

function findBestNote(target: string, notes: Note[]) {
  const normalizedTarget = normalizeForMatch(target);
  if (!normalizedTarget) return null;
  return (
    notes.find((note) => {
      const title = normalizeForMatch(note.title);
      const summary = normalizeForMatch(note.summary);
      return title === normalizedTarget || title.includes(normalizedTarget) || normalizedTarget.includes(title) || summary.includes(normalizedTarget);
    }) ?? null
  );
}

function inferLessonIcon(title: string): Lesson["icon"] {
  if (/公式|函数|微积分|数学|方程|表格/.test(title)) return "function";
  if (/物理|力学|原子|量子|电磁|热学/.test(title)) return "atom";
  if (/图|图片|截图|标注|视觉/.test(title)) return "image";
  if (/复习|重点|考试/.test(title)) return "sparkles";
  return "book";
}

function inferLessonAccent(title: string) {
  if (/公式|函数|数学|图像|标注/.test(title)) return "rose";
  if (/哲学|自然|生命/.test(title)) return "amber";
  if (/物理|科学|实验|量子/.test(title)) return "cobalt";
  return "sage";
}

function inferPreferenceCommand(command: string, userId: string): Partial<Omit<UserPreferences, "userId" | "updatedAt">> | null {
  const text = command.toLowerCase();
  const isPreferenceCommand = /按钮|界面|页面|布局|主题|颜色|色|卡片|圆角|胶囊|紧凑|宽松|列表|网格|notion|极简|好看|美观|风格/.test(
    command
  );
  if (!isPreferenceCommand) return null;

  if (/恢复默认|默认风格|还原/.test(command)) {
    const { userId: _userId, updatedAt: _updatedAt, ...preferences } = defaultPreferences(userId);
    return preferences;
  }

  const preferences: Partial<Omit<UserPreferences, "userId" | "updatedAt">> = {};

  if (/蓝|学术|冷静/.test(command)) preferences.primaryColor = "cobalt";
  if (/紫|灵感|创意/.test(command)) preferences.primaryColor = "violet";
  if (/黑白|极简|notion|灰/.test(text)) preferences.primaryColor = "mono";
  if (/绿|清爽|自然/.test(command)) preferences.primaryColor = "sage";

  if (/胶囊|更圆|圆润|圆一点/.test(command)) preferences.buttonRadius = "pill";
  if (/方正|直角|硬朗/.test(command)) preferences.buttonRadius = "square";
  if (/轻圆角|不要太圆|标准圆角/.test(command)) preferences.buttonRadius = "soft";

  if (/线框|描边|空心/.test(command)) preferences.buttonStyle = "outline";
  if (/柔和|浅色|轻一点|notion/.test(text)) preferences.buttonStyle = "soft";
  if (/实色|醒目|突出/.test(command)) preferences.buttonStyle = "solid";

  if (/紧凑|密一点|省空间/.test(command)) preferences.density = "compact";
  if (/宽松|留白|松一点|呼吸感/.test(command)) preferences.density = "airy";
  if (/标准|默认密度/.test(command)) preferences.density = "comfortable";

  if (/无阴影|平面|扁平|notion/.test(text)) preferences.cardStyle = "flat";
  if (/边框|线条/.test(command)) preferences.cardStyle = "bordered";
  if (/阴影|立体|浮起来/.test(command)) preferences.cardStyle = "elevated";

  if (/列表/.test(command)) preferences.lessonLayout = "list";
  if (/网格|卡片/.test(command)) preferences.lessonLayout = "grid";

  if (/闪卡优先|学习模式/.test(command)) preferences.noteLayout = "study";
  if (/阅读优先|正文优先/.test(command)) preferences.noteLayout = "reader";

  return Object.keys(preferences).length ? preferences : null;
}
