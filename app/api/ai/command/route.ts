import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import {
  createCourseWithStarterLesson,
  createLesson,
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
import type { AiCommandOperation, AiCommandPlan } from "@/lib/ai";

const schema = z.object({
  command: z.string().min(2).max(2000),
  currentCourseId: z.string(),
  currentLessonId: z.string().default(""),
  currentNoteId: z.string().default("")
});

type Workspace = Awaited<ReturnType<typeof getWorkspace>>;

class CommandValidationError extends Error {}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录。" }, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "请输入有效的 AI 命令。" }, { status: 400 });
  }

  try {
    const workspace = await getWorkspace(user.id);
    const plan = await interpretNotebookCommand({
      command: parsed.data.command,
      currentCourseId: parsed.data.currentCourseId,
      currentLessonId: parsed.data.currentLessonId,
      currentNoteId: parsed.data.currentNoteId,
      courses: workspace.courses,
      lessons: workspace.lessons,
      notes: workspace.notes,
      preferences: workspace.preferences
    });

    if (plan.requiresClarification || !plan.operations.length) {
      return NextResponse.json({
        action: "reply",
        message: plan.message || "这条命令还不够明确，请说明要操作的课程、章节或笔记。",
        selectedCourseId: parsed.data.currentCourseId,
        selectedLessonId: parsed.data.currentLessonId,
        selectedNoteId: parsed.data.currentNoteId,
        workspace
      });
    }

    validatePlan(plan, workspace);

    let selectedCourseId = parsed.data.currentCourseId;
    let selectedLessonId = parsed.data.currentLessonId;
    let selectedNoteId = parsed.data.currentNoteId;
    const executionMessages: string[] = [];

    for (const operation of plan.operations) {
      const result = await executeOperation(operation, user.id, workspace);
      executionMessages.push(result.message);
      selectedCourseId = result.courseId ?? selectedCourseId;
      selectedLessonId = result.lessonId ?? selectedLessonId;
      selectedNoteId = result.noteId ?? selectedNoteId;
    }

    const nextWorkspace = await getWorkspace(user.id);
    const normalized = normalizeSelection(nextWorkspace, {
      courseId: selectedCourseId,
      lessonId: selectedLessonId,
      noteId: selectedNoteId
    });

    return NextResponse.json({
      action: "ai_plan",
      message: [plan.message, ...executionMessages].filter(Boolean).join(" "),
      aiProvider: plan.provider,
      selectedCourseId: normalized.courseId,
      selectedLessonId: normalized.lessonId,
      selectedNoteId: normalized.noteId,
      workspace: nextWorkspace
    });
  } catch (error) {
    if (error instanceof CommandValidationError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    if (error instanceof Error && (error.message === "OPENAI_API_KEY_MISSING" || error.message === "AI_PROVIDER_KEY_MISSING")) {
      return NextResponse.json({ error: "真实 AI 服务尚未配置，命令不会使用本地规则代替执行。" }, { status: 503 });
    }
    if (hasStatus(error, 429)) {
      return NextResponse.json({ error: "真实 AI 当前达到速率或额度限制，请稍后重试。" }, { status: 429 });
    }

    console.error("AI command failed.", error);
    return NextResponse.json({ error: explainCommandFailure(error) }, { status: 500 });
  }
}

function validatePlan(plan: AiCommandPlan, workspace: Workspace) {
  const courseIds = new Set(workspace.courses.map((item) => item.id));
  const lessonById = new Map(workspace.lessons.map((item) => [item.id, item]));
  const noteIds = new Set(workspace.notes.map((item) => item.id));
  const deletedCourses = new Set<string>();
  const deletedLessons = new Set<string>();
  const deletedNotes = new Set<string>();
  let courseCount = workspace.courses.length;

  for (const operation of plan.operations) {
    if (operation.courseId && deletedCourses.has(operation.courseId)) {
      throw new CommandValidationError("AI 计划引用了已在前一步删除的课程，请换一种说法后重试。");
    }
    if (operation.lessonId && deletedLessons.has(operation.lessonId)) {
      throw new CommandValidationError("AI 计划引用了已在前一步删除的章节，请换一种说法后重试。");
    }
    if (operation.noteId && deletedNotes.has(operation.noteId)) {
      throw new CommandValidationError("AI 计划引用了已在前一步删除的笔记，请换一种说法后重试。");
    }

    switch (operation.action) {
      case "create_course":
        requireText(operation.course?.title, "AI 没有给出新课程名称。");
        requireText(operation.course?.code, "AI 没有给出新课程代码。");
        requireText(operation.course?.term, "AI 没有给出新课程学期。");
        requireText(operation.course?.description, "AI 没有给出新课程说明。");
        courseCount += 1;
        break;
      case "create_lesson":
        requireExisting(operation.courseId, courseIds, "AI 选择的新章节所属课程不存在。");
        requireText(operation.lesson?.title, "AI 没有给出新章节标题。");
        break;
      case "delete_course":
        requireExisting(operation.courseId, courseIds, "AI 选择的课程不存在。");
        if (deletedCourses.has(operation.courseId!)) throw new CommandValidationError("AI 重复删除了同一课程。");
        deletedCourses.add(operation.courseId!);
        for (const lesson of workspace.lessons.filter((item) => item.courseId === operation.courseId)) {
          deletedLessons.add(lesson.id);
        }
        for (const note of workspace.notes.filter((item) => item.courseId === operation.courseId)) {
          deletedNotes.add(note.id);
        }
        courseCount -= 1;
        break;
      case "delete_lesson":
        requireExisting(operation.lessonId, new Set(lessonById.keys()), "AI 选择的章节不存在。");
        deletedLessons.add(operation.lessonId!);
        for (const note of workspace.notes.filter((item) => item.lessonId === operation.lessonId)) {
          deletedNotes.add(note.id);
        }
        break;
      case "delete_note":
        requireExisting(operation.noteId, noteIds, "AI 选择的笔记不存在。");
        deletedNotes.add(operation.noteId!);
        break;
      case "update_course":
        requireExisting(operation.courseId, courseIds, "AI 选择的课程不存在。");
        requireObject(operation.course, "AI 没有给出课程修改内容。");
        break;
      case "update_lesson":
        requireExisting(operation.lessonId, new Set(lessonById.keys()), "AI 选择的章节不存在。");
        requireObject(operation.lesson, "AI 没有给出章节修改内容。");
        break;
      case "update_note":
        requireExisting(operation.noteId, noteIds, "AI 选择的笔记不存在。");
        requireObject(operation.updatedNote, "AI 没有给出笔记修改内容。");
        break;
      case "move_note": {
        requireExisting(operation.noteId, noteIds, "AI 选择的笔记不存在。");
        requireExisting(operation.courseId, courseIds, "AI 选择的目标课程不存在。");
        const lesson = operation.lessonId ? lessonById.get(operation.lessonId) : null;
        if (!lesson || lesson.courseId !== operation.courseId) {
          throw new CommandValidationError("AI 选择的目标章节不属于目标课程。");
        }
        break;
      }
      case "update_preferences":
        requireObject(operation.preferences, "AI 没有给出界面修改内容。");
        break;
    }
  }

  if (courseCount < 1) throw new CommandValidationError("至少需要保留一个课程板块。");
}

async function executeOperation(operation: AiCommandOperation, userId: string, workspace: Workspace) {
  switch (operation.action) {
    case "create_course": {
      const input = operation.course!;
      const { course, lesson } = await createCourseWithStarterLesson(userId, {
        title: input.title!.trim().slice(0, 80),
        code: input.code!.trim().slice(0, 30),
        term: input.term!.trim().slice(0, 40),
        description: input.description!.trim().slice(0, 220),
        tags: input.tags?.slice(0, 4),
        lessonTitle: input.lessonTitle?.slice(0, 80),
        lessonSubtitle: input.lessonSubtitle?.slice(0, 120)
      });
      return { message: `已新建板块「${course.title}」。`, courseId: course.id, lessonId: lesson.id, noteId: "" };
    }
    case "create_lesson": {
      const lesson = await createLesson(userId, operation.courseId!, {
        title: operation.lesson!.title!.trim().slice(0, 80),
        subtitle: operation.lesson!.subtitle?.slice(0, 120),
        icon: operation.lesson!.icon,
        accent: operation.lesson!.accent
      });
      return { message: `已新建章节「${lesson.title}」。`, courseId: lesson.courseId, lessonId: lesson.id, noteId: "" };
    }
    case "delete_course": {
      const deleted = await deleteCourse(userId, operation.courseId!);
      if (!deleted) throw new CommandValidationError("课程在执行前已不存在。");
      return { message: `已删除课程「${deleted.title}」。`, courseId: "", lessonId: "", noteId: "" };
    }
    case "delete_lesson": {
      const deleted = await deleteLesson(userId, operation.lessonId!);
      if (!deleted) throw new CommandValidationError("章节在执行前已不存在。");
      return { message: `已删除章节「${deleted.title}」。`, courseId: deleted.courseId, lessonId: "", noteId: "" };
    }
    case "delete_note": {
      const deleted = await deleteNote(userId, operation.noteId!);
      if (!deleted) throw new CommandValidationError("笔记在执行前已不存在。");
      return { message: `已删除笔记「${deleted.title}」。`, courseId: deleted.courseId, lessonId: deleted.lessonId, noteId: "" };
    }
    case "update_course": {
      const updated = await updateCourse(userId, operation.courseId!, {
        title: operation.course?.title?.slice(0, 80),
        code: operation.course?.code?.slice(0, 30),
        term: operation.course?.term?.slice(0, 40),
        description: operation.course?.description?.slice(0, 220)
      });
      if (!updated) throw new CommandValidationError("课程在执行前已不存在。");
      const message = operation.course?.title
        ? `已将课程板块重命名为「${updated.title}」。`
        : `已更新课程「${updated.title}」。`;
      return { message, courseId: updated.id };
    }
    case "update_lesson": {
      const updated = await updateLesson(userId, operation.lessonId!, {
        title: operation.lesson?.title?.slice(0, 80),
        subtitle: operation.lesson?.subtitle?.slice(0, 120),
        icon: operation.lesson?.icon,
        accent: operation.lesson?.accent
      });
      if (!updated) throw new CommandValidationError("章节在执行前已不存在。");
      const styleLabel =
        operation.lesson?.accent === "rose"
          ? "粉色"
          : operation.lesson?.accent === "cobalt"
            ? "蓝色"
            : operation.lesson?.accent === "amber"
              ? "橙黄色"
              : operation.lesson?.accent === "sage"
                ? "绿色"
                : "";
      const message = operation.lesson?.title
        ? `已将章节重命名为「${updated.title}」。`
        : styleLabel
          ? `已将「${updated.title}」的章节卡片样式改为${styleLabel}。`
          : `已更新章节「${updated.title}」的章节卡片样式。`;
      return { message, courseId: updated.courseId, lessonId: updated.id };
    }
    case "update_note": {
      const updated = await updateNote(userId, operation.noteId!, {
        title: operation.updatedNote?.title?.slice(0, 120),
        summary: operation.updatedNote?.summary?.slice(0, 500),
        contentMarkdown: operation.updatedNote?.markdown
      });
      if (!updated) throw new CommandValidationError("笔记在执行前已不存在。");
      return { message: `已更新笔记「${updated.title}」。`, courseId: updated.courseId, lessonId: updated.lessonId, noteId: updated.id };
    }
    case "move_note": {
      const updated = await updateNote(userId, operation.noteId!, {
        courseId: operation.courseId,
        lessonId: operation.lessonId
      });
      if (!updated) throw new CommandValidationError("笔记在执行前已不存在。");
      const target = workspace.lessons.find((item) => item.id === operation.lessonId);
      return {
        message: `已将笔记「${updated.title}」移动到「${target?.title ?? "目标章节"}」。`,
        courseId: operation.courseId,
        lessonId: operation.lessonId,
        noteId: updated.id
      };
    }
    case "update_preferences": {
      await updateUserPreferences(userId, operation.preferences!);
      return { message: "已更新界面偏好。" };
    }
  }
}

function normalizeSelection(workspace: Workspace, selection: { courseId: string; lessonId: string; noteId: string }) {
  const course = workspace.courses.find((item) => item.id === selection.courseId) ?? workspace.courses[0];
  const lessons = workspace.lessons.filter((item) => item.courseId === course?.id);
  const lesson = lessons.find((item) => item.id === selection.lessonId) ?? lessons[0];
  const notes = workspace.notes.filter((item) => item.courseId === course?.id && (!lesson || item.lessonId === lesson.id));
  const note = notes.find((item) => item.id === selection.noteId);
  return {
    courseId: course?.id ?? "",
    lessonId: lesson?.id ?? "",
    noteId: note?.id ?? ""
  };
}

function requireExisting(value: string | undefined, ids: Set<string>, message: string): asserts value is string {
  if (!value || !ids.has(value)) throw new CommandValidationError(message);
}

function requireText(value: string | undefined, message: string): asserts value is string {
  if (!value?.trim()) throw new CommandValidationError(message);
}

function requireObject(value: object | undefined, message: string) {
  if (!value || !Object.values(value).some((item) => item !== undefined && item !== "")) {
    throw new CommandValidationError(message);
  }
}

function hasStatus(error: unknown, status: number) {
  return typeof error === "object" && error !== null && "status" in error && (error as { status?: number }).status === status;
}

function explainCommandFailure(error: unknown) {
  if (error instanceof z.ZodError) return "真实 AI 返回的操作计划格式不完整，请重试或把命令写得更明确。";
  if (error instanceof Error && error.message === "AI_JSON_PARSE_FAILED") return "真实 AI 返回的内容无法解析，请重试。";
  if (error instanceof Error && error.message === "AI_EMPTY_RESPONSE") return "真实 AI 返回为空，请稍后重试。";
  if (hasStatus(error, 400)) return "真实 AI 拒绝了当前请求，请检查模型配置或稍后重试。";
  if (hasStatus(error, 401) || hasStatus(error, 403)) return "真实 AI 的 API Key 无效或权限不足。";
  if (typeof error === "object" && error !== null && "status" in error) {
    return `真实 AI 服务返回 ${(error as { status?: number }).status ?? "异常状态"}，请稍后重试。`;
  }
  return "真实 AI 命令执行失败，系统没有使用本地预设替代操作。";
}
