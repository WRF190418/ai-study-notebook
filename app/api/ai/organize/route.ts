import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createLesson, createNote, viewDb } from "@/lib/db";
import { organizeWithBuiltInAi } from "@/lib/ai";
import { MaterialParseError, parseUploadedMaterials } from "@/lib/courseware";
import { attachImageToNote } from "@/lib/media";
import type { AiOrganizeResult, Lesson } from "@/lib/types";

const metadataSchema = z.object({
  courseId: z.string(),
  targetInstruction: z.string().max(1000).default(""),
  sourceType: z.enum(["text", "outline", "image", "file"]).default("text"),
  text: z.string().max(25_000).default(""),
  mode: z.enum(["standard", "exam", "deep"]).default("standard"),
  keepOriginalImages: z.union([z.boolean(), z.enum(["true", "false"]).transform((value) => value === "true")]).default(true)
});

const legacySchema = metadataSchema.extend({
  imageDataUrl: z.string().max(8_000_000).optional()
});

export async function POST(request: Request) {
  const encoder = new TextEncoder();
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let active = true;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(" \n"));
      heartbeat = setInterval(() => {
        if (active) controller.enqueue(encoder.encode(`${" ".repeat(2048)}\n`));
      }, 10_000);

      void handleOrganize(request)
        .then(async (response) => {
          if (!active) return;
          const body = await response.text();
          if (!active) return;
          controller.enqueue(encoder.encode(body));
          controller.close();
        })
        .catch((error) => {
          console.error(error);
          if (!active) return;
          controller.enqueue(encoder.encode(JSON.stringify({ error: "整理失败，请稍后重试。" })));
          controller.close();
        })
        .finally(() => {
          active = false;
          if (heartbeat) clearInterval(heartbeat);
        });
    },
    cancel() {
      active = false;
      if (heartbeat) clearInterval(heartbeat);
    }
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      "Content-Type": "application/json; charset=utf-8",
      "X-Accel-Buffering": "no"
    }
  });
}

async function handleOrganize(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录。" }, { status: 401 });

  let input: Awaited<ReturnType<typeof parseOrganizeRequest>>;
  try {
    input = await parseOrganizeRequest(request);
  } catch (error) {
    console.error("Material parsing failed.", error);
    const message = error instanceof MaterialParseError ? error.message : "整理材料格式不正确。";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (!input.text.trim() && !input.imageDataUrls.length) {
    return NextResponse.json({ error: "整理材料格式不正确。" }, { status: 400 });
  }

  const { course, lessons } = await viewDb((db) => {
    const course = db.courses.find((item) => item.id === input.courseId && item.userId === user.id);
    const lessons = db.lessons
      .filter((item) => item.courseId === input.courseId && item.userId === user.id)
      .sort((a, b) => a.order - b.order);
    return { course, lessons };
  });

  if (!course) {
    return NextResponse.json({ error: "找不到对应课程。" }, { status: 404 });
  }

  const explicitTargetLesson = inferExplicitTargetLesson(input.targetInstruction, lessons);

  try {
    const result = await organizeWithBuiltInAi({
      sourceType: input.sourceType,
      text: input.text,
      imageDataUrls: input.imageDataUrls,
      fileNames: input.fileNames,
      courseTitle: course.title,
      targetInstruction: input.targetInstruction,
      lessons: lessons.map(({ id, title, subtitle, order }) => ({ id, title, subtitle, order })),
      mode: input.mode
    });

    const lesson = await resolveTargetLesson({
      userId: user.id,
      courseId: course.id,
      lessons,
      targetLesson: explicitTargetLesson ?? result.targetLesson,
      noteTitle: result.title
    });

    const note = await createNote({
      userId: user.id,
      courseId: course.id,
      lessonId: lesson.id,
      title: result.title,
      sourceType: input.sourceType,
      sourceText: input.text || `上传文件：${input.fileNames.join("、")}`,
      contentMarkdown: result.markdown,
      summary: result.summary,
      flashcards: result.flashcards,
      mindMap: result.mindMap
    });
    const retained = await retainOriginalImages({
      userId: user.id,
      note,
      files: input.imageFiles,
      enabled: input.keepOriginalImages
    });

    return NextResponse.json({ note: retained.note, lesson, warning: retained.warning });
  } catch (error) {
    if (canCreateFallback(input.text, input.imageDataUrls)) {
      const fallback = buildFallbackOrganizeResult({
        text: input.text,
        sourceType: input.sourceType,
        targetInstruction: input.targetInstruction,
        lessons,
        mode: input.mode,
        reason: explainAiFailure(error)
      });

      const lesson = await resolveTargetLesson({
        userId: user.id,
        courseId: course.id,
        lessons,
        targetLesson: explicitTargetLesson ?? fallback.targetLesson,
        noteTitle: fallback.title
      });

      const note = await createNote({
        userId: user.id,
        courseId: course.id,
        lessonId: lesson.id,
        title: fallback.title,
        sourceType: input.sourceType,
        sourceText: input.text || `上传文件：${input.fileNames.join("、")}`,
        contentMarkdown: fallback.markdown,
        summary: fallback.summary,
        flashcards: fallback.flashcards,
        mindMap: fallback.mindMap
      });
      const retained = await retainOriginalImages({
        userId: user.id,
        note,
        files: input.imageFiles,
        enabled: input.keepOriginalImages
      });

      console.warn("AI organize failed; saved local fallback note.", error);
      return NextResponse.json({
        note: retained.note,
        lesson,
        fallback: true,
        warning: [
          `AI 暂时不可用，已先保存为本地草稿。原因：${explainAiFailure(error)}`,
          retained.warning
        ].filter(Boolean).join(" ")
      });
    }

    console.error(error);
    return NextResponse.json({ error: explainAiFailure(error) }, { status: getAiFailureStatus(error) });
  }
}

async function parseOrganizeRequest(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new MaterialParseError("上传内容无法读取，请刷新页面后重新选择文件。");
    }

    const files = form
      .getAll("files")
      .filter(isUploadedFile);
    const requestedSourceType = readFormString(form, "sourceType");
    const inferredSourceType = files.some((file) => !file.type.startsWith("image/")) ? "file" : files.length ? "image" : "text";
    const parsed = metadataSchema.safeParse({
      courseId: readFormString(form, "courseId"),
      targetInstruction: readFormString(form, "targetInstruction"),
      sourceType: requestedSourceType || inferredSourceType,
      text: readFormString(form, "text"),
      mode: readFormString(form, "mode") || "standard",
      keepOriginalImages: readFormString(form, "keepOriginalImages") || "true"
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new MaterialParseError(`整理参数不正确：${issue?.path.join(".") || "未知字段"}。请刷新页面后重试。`);
    }

    const materials = await parseUploadedMaterials(files);
    const supplementalText = parsed.data.text.trim()
      ? `## 用户补充说明\n\n${parsed.data.text.trim()}`
      : "";
    const text = [supplementalText, materials.extractedText].filter(Boolean).join("\n\n---\n\n");
    const hasDocument = files.some((file) => !file.type.startsWith("image/"));
    const sourceType = hasDocument ? ("file" as const) : materials.imageDataUrls.length ? ("image" as const) : parsed.data.sourceType;

    return {
      ...parsed.data,
      sourceType,
      text,
      imageDataUrls: materials.imageDataUrls,
      fileNames: materials.fileNames,
      imageFiles: files.filter((file) => file.type.startsWith("image/"))
    };
  }

  const parsed = legacySchema.safeParse(await request.json());
  if (!parsed.success) throw new MaterialParseError("整理材料格式不正确。");
  return {
    ...parsed.data,
    imageDataUrls: parsed.data.imageDataUrl ? [parsed.data.imageDataUrl] : [],
    fileNames: [] as string[],
    imageFiles: [] as File[]
  };
}

async function retainOriginalImages({
  userId,
  note,
  files,
  enabled
}: {
  userId: string;
  note: Awaited<ReturnType<typeof createNote>>;
  files: File[];
  enabled: boolean;
}) {
  if (!enabled || !files.length) return { note, warning: "" };

  let currentNote = note;
  try {
    for (const file of files) {
      const attached = await attachImageToNote({
        userId,
        noteId: currentNote.id,
        file,
        alt: file.name,
        placement: "end"
      });
      currentNote = attached.note;
    }
    return { note: currentNote, warning: "" };
  } catch (error) {
    console.error("Retaining original organize images failed.", error);
    return {
      note: currentNote,
      warning: "笔记已保存，但有原图未能写入正文，请在笔记中重新插入。"
    };
  }
}

function readFormString(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

function isUploadedFile(value: FormDataEntryValue): value is File {
  return (
    typeof value !== "string" &&
    typeof value.name === "string" &&
    typeof value.size === "number" &&
    typeof value.type === "string" &&
    typeof value.arrayBuffer === "function"
  );
}

async function resolveTargetLesson({
  userId,
  courseId,
  lessons,
  targetLesson,
  noteTitle
}: {
  userId: string;
  courseId: string;
  lessons: Lesson[];
  targetLesson: Awaited<ReturnType<typeof organizeWithBuiltInAi>>["targetLesson"];
  noteTitle: string;
}) {
  if (targetLesson?.mode === "existing" && targetLesson.lessonId) {
    const matched = lessons.find((lesson) => lesson.id === targetLesson.lessonId);
    if (matched) return matched;
  }

  if (targetLesson?.mode === "new" && targetLesson.title) {
    return createLesson(userId, courseId, {
      title: targetLesson.title.slice(0, 80),
      subtitle: (targetLesson.subtitle || "AI-created chapter").slice(0, 120),
      icon: targetLesson.icon,
      accent: targetLesson.accent
    });
  }

  return (
    lessons[0] ??
    createLesson(userId, courseId, {
      title: noteTitle.slice(0, 40) || "AI 整理章节",
      subtitle: "AI-created chapter",
      icon: "book",
      accent: "sage"
    })
  );
}

function canCreateFallback(text: string, imageDataUrls: string[]) {
  return Boolean(text.trim() || imageDataUrls.length);
}

function buildFallbackOrganizeResult({
  text,
  sourceType,
  targetInstruction,
  lessons,
  mode,
  reason
}: {
  text: string;
  sourceType: "text" | "outline" | "image" | "file";
  targetInstruction: string;
  lessons: Lesson[];
  mode: "standard" | "exam" | "deep";
  reason: string;
}): AiOrganizeResult {
  const title = inferFallbackTitle(text, sourceType);
  const targetLesson = inferLocalTargetLesson(targetInstruction, lessons, title);
  const sourceLabel =
    sourceType === "outline"
      ? "大纲"
      : sourceType === "image"
        ? "截图/补充说明"
        : sourceType === "file"
          ? "课件"
          : "文字材料";
  const modeLabel = mode === "exam" ? "考试复习版" : mode === "deep" ? "深度理解版" : "标准课堂笔记";
  const safeText = text.trim() || "用户上传了图片材料，但当前模型服务不可用，暂时无法识别图片内容。";
  const summary = `AI 服务暂时不可用，已根据${sourceLabel}保存一版可编辑草稿。`;

  return {
    title,
    summary,
    markdown: [
      `# ${title}`,
      "",
      `> AI 整理暂时不可用，系统已先保存本地草稿，避免材料丢失。失败原因：${reason}`,
      "",
      "## 原始材料",
      "",
      safeText,
      "",
      "## 临时整理",
      "",
      `- 输出风格：${modeLabel}`,
      `- 归档要求：${targetInstruction.trim() || "未填写，已按当前课程默认章节保存。"}`,
      "- 下一步：模型恢复后，可以把这篇笔记内容重新提交给 AI，生成更完整的 Markdown、公式、表格、思维导图和闪卡。",
      "",
      "## 复习提示",
      "",
      "- 先检查原始材料是否完整。",
      "- 给关键概念补充定义、例子和公式适用条件。",
      "- 如果这是考前材料，建议再整理易错点和典型题型。"
    ].join("\n"),
    flashcards: [
      {
        id: nanoid(),
        front: "这份材料当前为什么是草稿？",
        back: `因为 AI 服务暂时不可用：${reason}`,
        difficulty: "easy"
      },
      {
        id: nanoid(),
        front: "模型恢复后应该怎么处理？",
        back: "重新提交这份材料，让 AI 生成完整课堂笔记、闪卡和思维导图。",
        difficulty: "medium"
      }
    ],
    mindMap: [
      {
        id: nanoid(),
        label: title,
        children: [
          { id: nanoid(), label: "原始材料" },
          { id: nanoid(), label: "临时整理" },
          { id: nanoid(), label: "待 AI 深度整理" }
        ]
      }
    ],
    targetLesson
  };
}

function inferFallbackTitle(text: string, sourceType: "text" | "outline" | "image" | "file") {
  if (sourceType === "image") {
    const ocrText = text.split(/## 图片 OCR：[^\n]*\n+/)[1] ?? "";
    const ocrTitle = firstMeaningfulLine(ocrText);
    return ocrTitle?.slice(0, 36) || "图片材料待整理";
  }

  const firstLine = firstMeaningfulLine(text);
  if (firstLine) {
    return firstLine.split(/[。！？!?；;]/)[0].slice(0, 36) || "本地草稿笔记";
  }
  return sourceType === "file" ? "课件材料待整理" : "本地草稿笔记";
}

function firstMeaningfulLine(value: string) {
  return value
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => Boolean(line) && !/^#{1,6}\s/.test(line) && line !== "---");
}

function inferLocalTargetLesson(targetInstruction: string, lessons: Lesson[], title: string): AiOrganizeResult["targetLesson"] {
  const matched = findLessonByText(targetInstruction, lessons) ?? findLessonByText(title, lessons);
  if (matched) {
    return {
      mode: "existing",
      lessonId: matched.id,
      reason: "本地规则匹配到目标章节。"
    };
  }

  const newTitle = extractRequestedLessonTitle(targetInstruction);
  if (newTitle) {
    return {
      mode: "new",
      title: newTitle.slice(0, 80),
      subtitle: "Local fallback chapter",
      icon: "book",
      accent: "sage",
      reason: "本地规则根据整理要求新建章节。"
    };
  }

  return undefined;
}

function findLessonByText(text: string, lessons: Lesson[]) {
  const order = parseLessonOrder(text);
  if (order) {
    const byOrder = lessons.find((lesson) => lesson.order === order);
    if (byOrder) return byOrder;
  }
  const normalized = normalizeForMatch(text);
  if (!normalized) return null;
  return (
    lessons.find((lesson) => {
      const title = normalizeForMatch(lesson.title);
      const subtitle = normalizeForMatch(lesson.subtitle);
      return title === normalized || title.includes(normalized) || normalized.includes(title) || subtitle.includes(normalized);
    }) ?? null
  );
}

function extractRequestedLessonTitle(instruction: string) {
  const match = instruction.match(/(?:整理到|放到|归档到|存到|保存到)\s*(.+)$/);
  if (!match) return "";
  return match[1]
    .replace(/(?:章节|小节|课时|笔记栏|卡片)$/, "")
    .replace(/[。.!！?？]$/, "")
    .trim();
}

function parseLessonOrder(text: string) {
  const digit = text.match(/(?:lecture|第)?\s*(\d{1,2})\s*(?:章|节|讲)?/i)?.[1];
  if (digit) return Number(digit);
  const chinese = text.match(/第?\s*([一二三四五六七八九十])\s*(?:章|节|讲)/)?.[1];
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

function normalizeForMatch(value: string) {
  return value
    .toLowerCase()
    .replace(/[，,、。.!！?？:：;；"'“”‘’()\[\]【】《》<>·\-_\s]/g, "")
    .replace(/的/g, "")
    .replace(/整理到|放到|归档到|存到|保存到|章节卡片|章节|小节|课时|笔记栏|卡片|笔记/g, "");
}

function getAiFailureStatus(error: unknown) {
  const status = typeof error === "object" && error !== null && "status" in error ? (error as { status?: number }).status : undefined;
  if (status === 401 || status === 403 || status === 429) return status;
  if (error instanceof Error && (error.message === "OPENAI_API_KEY_MISSING" || error.message === "AI_PROVIDER_KEY_MISSING")) return 503;
  return 500;
}

function explainAiFailure(error: unknown) {
  if (error instanceof Error && (error.message === "OPENAI_API_KEY_MISSING" || error.message === "AI_PROVIDER_KEY_MISSING")) {
    return "尚未配置可用的 AI API Key，请在 .env.local 中填入 DEEPSEEK_API_KEY、OPENAI_API_KEY 或 ZHIPU_API_KEY 并重启服务。";
  }
  if (error instanceof Error && error.message === "AI_VISION_PROVIDER_MISSING") {
    return "尚未配置可用的视觉模型，且本地 OCR 未识别到可整理的文字。";
  }
  const status = typeof error === "object" && error !== null && "status" in error ? (error as { status?: number }).status : undefined;
  if (status === 400) return "模型请求被拒绝，可能是当前模型不支持该参数、图片或 JSON 输出格式。";
  if (status === 401 || status === 403) return "API Key 无效、权限不足，或当前地区/账号无法访问该模型。";
  if (status === 429) return "AI 服务额度不足或触发限流。";
  if (typeof status === "number" && status >= 500) return "AI 服务端暂时不可用。";
  if (error instanceof Error && error.message === "AI_EMPTY_RESPONSE") return "AI 返回了空结果。";
  return "AI 整理失败，请稍后重试或检查模型配置。";
}

function inferExplicitTargetLesson(targetInstruction: string, lessons: Lesson[]): AiOrganizeResult["targetLesson"] {
  const instruction = targetInstruction.trim();
  if (!instruction) return undefined;
  if (!/(整理到|放到|归档到|存到|保存到|放进|存进|第|lecture)/i.test(instruction)) return undefined;

  const order = parseLessonOrder(instruction);
  if (order) {
    const matched = lessons.find((lesson) => lesson.order === order);
    if (matched) {
      return {
        mode: "existing",
        lessonId: matched.id,
        reason: "用户明确指定了章节序号。"
      };
    }

    return {
      mode: "new",
      title: formatLessonOrderTitle(order),
      subtitle: "AI-created chapter",
      icon: "book",
      accent: inferAccentByOrder(order),
      reason: "用户明确指定的章节不存在，系统自动新建。"
    };
  }

  const requestedTitle = extractRequestedLessonTitle(instruction);
  if (!requestedTitle) return undefined;

  const matched = findLessonByText(requestedTitle, lessons);
  if (matched) {
    return {
      mode: "existing",
      lessonId: matched.id,
      reason: "用户明确指定了章节名称。"
    };
  }

  return {
    mode: "new",
    title: requestedTitle.slice(0, 80),
    subtitle: "AI-created chapter",
    icon: inferIconByText(requestedTitle),
    accent: inferAccentByText(requestedTitle),
    reason: "用户明确指定的章节不存在，系统自动新建。"
  };
}

function formatLessonOrderTitle(order: number) {
  const names = ["", "第一章", "第二章", "第三章", "第四章", "第五章", "第六章", "第七章", "第八章", "第九章", "第十章"];
  return names[order] ?? `第${order}章`;
}

function inferAccentByOrder(order: number): Lesson["accent"] {
  const accents: Lesson["accent"][] = ["sage", "amber", "cobalt", "rose"];
  return accents[(order - 1) % accents.length] ?? "sage";
}

function inferIconByText(text: string): Lesson["icon"] {
  if (/公式|函数|数学|方程|表格/.test(text)) return "function";
  if (/物理|力学|原子|量子|电磁|热学/.test(text)) return "atom";
  if (/图|图片|截图|标注/.test(text)) return "image";
  if (/复习|重点|考试/.test(text)) return "sparkles";
  return "book";
}

function inferAccentByText(text: string): Lesson["accent"] {
  if (/公式|函数|数学|图像|标注/.test(text)) return "rose";
  if (/哲学|自然|生命/.test(text)) return "amber";
  if (/物理|科学|实验|量子|力学/.test(text)) return "cobalt";
  return "sage";
}
