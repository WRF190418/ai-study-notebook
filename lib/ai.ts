import OpenAI from "openai";
import { nanoid } from "nanoid";
import { z } from "zod";
import type { AiOrganizeResult, Course, Lesson, MindMapNode, Note, UserPreferences } from "@/lib/types";

const flashcardSchema = z.object({
  front: z.string().optional(),
  back: z.string().optional(),
  question: z.string().optional(),
  answer: z.string().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium")
});

type RawMindMapNode = {
  label?: string;
  topic?: string;
  title?: string;
  name?: string;
  children?: unknown[];
};

const resultSchema = z.object({
  title: z.string(),
  summary: z.string(),
  markdown: z.string(),
  flashcards: z.array(flashcardSchema).default([]),
  mindMap: z.array(z.unknown()).default([]),
  targetLesson: z
    .object({
      mode: z.enum(["existing", "new"]).optional(),
      lessonId: z.string().optional(),
      title: z.string().optional(),
      subtitle: z.string().optional(),
      icon: z.enum(["book", "atom", "sparkles", "function", "image"]).optional(),
      accent: z.enum(["sage", "amber", "cobalt", "rose"]).optional(),
      reason: z.string().optional()
    })
    .optional()
});

type OrganizeInput = {
  sourceType: "text" | "outline" | "image" | "file";
  text: string;
  imageDataUrls?: string[];
  fileNames?: string[];
  courseTitle: string;
  targetInstruction?: string;
  lessons: Pick<Lesson, "id" | "title" | "subtitle" | "order">[];
  mode: "standard" | "exam" | "deep";
};

type AiProviderId = "openai" | "zhipu" | "deepseek";
type AiProvider = {
  id: AiProviderId;
  label: string;
  apiKey: string;
  baseURL?: string;
  model: string;
  supportsVision: boolean;
};

type ChatRequest = Omit<OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming, "model">;

export async function organizeWithBuiltInAi(input: OrganizeInput): Promise<AiOrganizeResult> {
  const modeText = {
    standard: "标准课堂笔记：清晰、完整、适合课后复习。",
    exam: "考试复习版：突出考点、易错点、公式适用条件和速记框。",
    deep: "深度理解版：补充概念关系、推导逻辑、例子和反直觉点。"
  }[input.mode];

  const instruction = [
    "你是一个给大学生使用的 AI 学习笔记整理器。",
    "请把用户提供的截图、课件、文字或大纲整理成漂亮、严谨、可复习的课程笔记。",
    "必须输出严格 JSON，不要使用 Markdown 代码围栏。",
    "markdown 字段必须是 Markdown，支持 GFM 表格与 LaTeX。行内公式用 $...$，块级公式用 $$...$$。",
    "最高优先级：忠实于用户材料。不得把用户没有提到的主题当作主要内容，不得把一个短句擅自扩展成另一个完整知识点。",
    "如果用户材料很短或很碎，只围绕材料本身整理；不要为了完整性强行引入无关定律、概念、人物或例子。",
    "标准课堂笔记模式下，默认只整理用户提供的信息；只有必要的连接词、结构化标题和复习提示可以轻微补充。",
    "考试复习版和深度理解版允许补充背景、例子、公式或易错点，但所有补充内容必须单独放在“补充理解”小节，不能混入原材料整理。",
    "markdown 字段必须先包含“原始材料要点”小节，用 2 到 6 条准确复述用户材料，再进入整理内容。",
    "笔记结构建议包含：标题、原始材料要点、核心问题、概念解释、公式/表格、重点总结、复习提示；如有补充，单独加“补充理解”。",
    "flashcards 生成 3 到 6 张，front 是问题，back 是答案。闪卡必须优先来自用户材料；若来自补充理解，问题或答案中标注“补充”。",
    "闪卡里的公式请使用行内 LaTeX，例如 $F=ma$；不要在 flashcards 的 front/back 中使用 $$...$$ 块级公式。",
    "mindMap 是适合渲染思维导图的层级节点数组。",
    "同时你必须判断这篇笔记应该归档到哪个课程章节。",
    "targetLesson 字段规则：如果已有章节匹配，输出 {\"mode\":\"existing\",\"lessonId\":\"已有章节 id\",\"reason\":\"原因\"}。",
    "如果已有章节都不适合，输出 {\"mode\":\"new\",\"title\":\"新章节中文标题\",\"subtitle\":\"简短英文或说明副标题\",\"icon\":\"book|atom|sparkles|function|image\",\"accent\":\"sage|amber|cobalt|rose\",\"reason\":\"原因\"}。",
    "用户有整理要求时优先满足；用户没有明确要求时，根据材料主题和已有章节语义判断。",
    `当前课程：${input.courseTitle}`,
    `上传文件：${input.fileNames?.join("、") || "无"}`,
    `用户整理要求：${input.targetInstruction?.trim() || "用户没有明确要求，请你根据材料内容判断归档章节。"}`,
    `已有章节：${JSON.stringify(input.lessons)}`,
    `整理模式：${modeText}`
  ]
    .filter(Boolean)
    .join("\n");

  const textContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
    {
      type: "text",
      text: `${instruction}\n\n用户材料：\n${input.text || "(用户主要提供了图片，请识别图中内容并整理。)"}`
    }
  ];
  const content = [...textContent];

  for (const imageDataUrl of input.imageDataUrls ?? []) {
    content.push({
      type: "image_url",
      image_url: {
        url: imageDataUrl
      }
    });
  }

  const createRequest = (userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[]): ChatRequest => ({
    temperature: 0.45,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "你只输出可被 JSON.parse 解析的对象，字段为 title、summary、markdown、flashcards、mindMap、targetLesson。"
      },
      {
        role: "user",
        content: userContent
      }
    ]
  });

  let raw;
  if (input.imageDataUrls?.length) {
    const hasLocalOcr = input.text.includes("## 图片 OCR：");
    const preferVision = process.env.AI_PREFER_VISION === "true";

    if (hasLocalOcr && !preferVision) {
      raw = await createCompletionWithFallback(createRequest(textContent));
    } else {
      try {
        raw = await createCompletionWithFallback(createRequest(content), { requiresVision: true });
      } catch (visionError) {
        if (!hasLocalOcr) throw visionError;
        console.warn("Vision provider unavailable; falling back to local OCR text.", visionError);
        raw = await createCompletionWithFallback(createRequest(textContent));
      }
    }
  } else {
    raw = await createCompletionWithFallback(createRequest(textContent));
  }

  const parsed = resultSchema.parse(parseJsonObject(raw.content));
  const normalizedTargetLesson =
    parsed.targetLesson?.mode === "existing" || parsed.targetLesson?.mode === "new"
      ? { ...parsed.targetLesson, mode: parsed.targetLesson.mode }
      : undefined;

  return {
    title: parsed.title,
    summary: parsed.summary,
    markdown: parsed.markdown,
    flashcards: parsed.flashcards
      .map((card) => ({
        id: nanoid(),
        front: card.front ?? card.question ?? "",
        back: card.back ?? card.answer ?? "",
        difficulty: card.difficulty
      }))
      .filter((card) => card.front && card.back),
    mindMap: parsed.mindMap.map(addMindMapIds),
    targetLesson: normalizedTargetLesson
  };
}

const commandOperationSchema = z.object({
  action: z.enum([
    "create_course",
    "create_lesson",
    "delete_course",
    "delete_lesson",
    "delete_note",
    "update_course",
    "update_lesson",
    "update_note",
    "move_note",
    "update_preferences"
  ]),
  courseId: z.string().optional(),
  course: z
    .object({
      title: z.string().optional(),
      code: z.string().optional(),
      term: z.string().optional(),
      description: z.string().optional(),
      lessonTitle: z.string().optional(),
      lessonSubtitle: z.string().optional(),
      tags: z.array(z.string()).optional()
    })
    .optional(),
  lessonId: z.string().optional(),
  lesson: z
    .object({
      title: z.string().optional(),
      subtitle: z.string().optional(),
      icon: z.enum(["book", "atom", "sparkles", "function", "image"]).optional(),
      accent: z.enum(["sage", "amber", "cobalt", "rose"]).optional()
    })
    .optional(),
  noteId: z.string().optional(),
  updatedNote: z
    .object({
      title: z.string().optional(),
      summary: z.string().optional(),
      markdown: z.string().optional()
    })
    .optional(),
  preferences: z
    .object({
      primaryColor: z.enum(["sage", "cobalt", "violet", "mono"]).optional(),
      buttonRadius: z.enum(["square", "soft", "pill"]).optional(),
      buttonStyle: z.enum(["solid", "soft", "outline"]).optional(),
      density: z.enum(["compact", "comfortable", "airy"]).optional(),
      cardStyle: z.enum(["elevated", "bordered", "flat"]).optional(),
      lessonLayout: z.enum(["grid", "list"]).optional(),
      noteLayout: z.enum(["reader", "study"]).optional()
    })
    .optional()
}).superRefine((operation, context) => {
  const requireText = (value: string | undefined, path: (string | number)[], message: string) => {
    if (!value?.trim()) {
      context.addIssue({ code: z.ZodIssueCode.custom, path, message });
    }
  };
  const requireObject = (value: object | undefined, path: (string | number)[], message: string) => {
    if (!value || !Object.values(value).some((item) => item !== undefined && item !== "")) {
      context.addIssue({ code: z.ZodIssueCode.custom, path, message });
    }
  };

  switch (operation.action) {
    case "create_course":
      requireText(operation.course?.title, ["course", "title"], "create_course 缺少 course.title");
      requireText(operation.course?.code, ["course", "code"], "create_course 缺少 course.code");
      requireText(operation.course?.term, ["course", "term"], "create_course 缺少 course.term");
      requireText(operation.course?.description, ["course", "description"], "create_course 缺少 course.description");
      break;
    case "create_lesson":
      requireText(operation.courseId, ["courseId"], "create_lesson 缺少 courseId");
      requireText(operation.lesson?.title, ["lesson", "title"], "create_lesson 缺少 lesson.title");
      break;
    case "delete_course":
    case "update_course":
      requireText(operation.courseId, ["courseId"], `${operation.action} 缺少 courseId`);
      if (operation.action === "update_course") {
        requireObject(operation.course, ["course"], "update_course 缺少课程修改内容");
      }
      break;
    case "delete_lesson":
    case "update_lesson":
      requireText(operation.lessonId, ["lessonId"], `${operation.action} 缺少 lessonId`);
      if (operation.action === "update_lesson") {
        requireObject(operation.lesson, ["lesson"], "update_lesson 缺少章节修改内容");
      }
      break;
    case "delete_note":
    case "update_note":
      requireText(operation.noteId, ["noteId"], `${operation.action} 缺少 noteId`);
      if (operation.action === "update_note") {
        requireObject(operation.updatedNote, ["updatedNote"], "update_note 缺少笔记修改内容");
      }
      break;
    case "move_note":
      requireText(operation.noteId, ["noteId"], "move_note 缺少 noteId");
      requireText(operation.courseId, ["courseId"], "move_note 缺少目标 courseId");
      requireText(operation.lessonId, ["lessonId"], "move_note 缺少目标 lessonId");
      break;
    case "update_preferences":
      requireObject(operation.preferences, ["preferences"], "update_preferences 缺少界面修改内容");
      break;
  }
});

const commandPlanSchema = z.object({
  message: z.string().default(""),
  requiresClarification: z.boolean().default(false),
  operations: z.array(commandOperationSchema).max(8).default([])
});

export type AiCommandOperation = z.infer<typeof commandOperationSchema>;
export type AiCommandPlan = z.infer<typeof commandPlanSchema>;

export async function interpretNotebookCommand(input: {
  command: string;
  currentCourseId: string;
  currentLessonId?: string;
  currentNoteId?: string;
  courses: Course[];
  lessons: Lesson[];
  notes: Note[];
  preferences: UserPreferences;
}): Promise<AiCommandPlan & { provider: string }> {
  const courseContext = input.courses.map(({ id, title, code, term, description }) => ({
    id,
    title,
    code,
    term,
    description
  }));
  const lessonContext = input.lessons.map(({ id, courseId, title, subtitle, order }) => ({
    id,
    courseId,
    title,
    subtitle,
    order
  }));
  const noteContext = input.notes.slice(0, 30).map(({ id, courseId, lessonId, title, summary, contentMarkdown, createdAt }) => ({
    id,
    courseId,
    lessonId,
    title,
    summary,
    createdAt,
    markdownPreview: contentMarkdown.slice(0, id === input.currentNoteId ? 12_000 : 2_000)
  }));

  const raw = await createCompletionWithFallback({
    temperature: 0.15,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: [
          "你是网页笔记本中真正负责理解和规划操作的 AI 助手。",
          "你只能输出严格 JSON，不要 Markdown 代码围栏。",
          "输出对象固定为 {message, requiresClarification, operations}。",
          "operations 可以包含 0 到 8 个动作，并按执行顺序排列。不要输出白名单外的动作。",
          '严格示例：{"message":"同时修改第一章标题和颜色","requiresClarification":false,"operations":[{"action":"update_lesson","lessonId":"真实章节 id","lesson":{"title":"经典力学导论","accent":"cobalt"}}]}',
          "允许动作：create_course、create_lesson、delete_course、delete_lesson、delete_note、update_course、update_lesson、update_note、move_note、update_preferences。",
          "create_course 必须给 course.title、code、term、description；可给 starter lesson 的 lessonTitle、lessonSubtitle。",
          "create_lesson 必须选择 courseId，并给 lesson.title；可给 subtitle、icon、accent。",
          "delete_course/delete_lesson/delete_note 必须使用上下文里真实存在的对应 id。只有用户明确要求删除时才允许。",
          "当用户明确使用“删除”等措辞且能唯一匹配对象时，直接生成删除动作，不要因为对象下没有内容或删除不可撤销而再次询问确认；只有目标不唯一或意图含糊时才澄清。",
          "update_course 必须给 courseId，并在 course 中给出需要更新的 title/code/term/description。",
          "update_lesson 必须给 lessonId，并在 lesson 中给出需要更新的 title/subtitle/icon/accent。",
          "update_note 必须给 noteId。修改正文时，updatedNote.markdown 必须是完整修改后的 Markdown，不是修改说明；也可更新 title、summary。",
          "move_note 必须给 noteId、courseId、lessonId，且目标章节必须属于目标课程。",
          "update_preferences 用于全局页面主题、按钮、密度、卡片和布局偏好。",
          "复杂命令可以拆成多个 operations，例如同时重命名章节并改变颜色。",
          "如果只是咨询、对象不明确、可能误删，operations 留空，requiresClarification=true，并在 message 中询问用户。",
          "偏好枚举含义：primaryColor sage=绿色清爽，cobalt=蓝色学术，violet=紫色灵感，mono=黑白极简；buttonRadius square=方正，soft=轻圆角，pill=胶囊；buttonStyle solid=实色，soft=浅色柔和，outline=线框；density compact=紧凑，comfortable=标准，airy=宽松；cardStyle elevated=阴影，bordered=边框，flat=平面；lessonLayout grid=卡片网格，list=列表。",
          "章节样式枚举含义：lesson.accent sage=绿色，amber=橙黄色，cobalt=蓝色，rose=粉色/玫红/彩色活泼；lesson.icon book=书本，atom=物理/原子，sparkles=复习/重点，function=公式/函数，image=图像/标注。",
          "“当前/这篇/这一章”优先使用 currentCourseId、currentLessonId、currentNoteId。",
          "如果用户说“刚才那篇/最新那篇”，优先选择 notes 列表中 createdAt 最新的笔记。",
          "删除和修改都必须尽量匹配用户指定的标题、主题或当前课程。",
          "不要猜测不存在的 id，不要用标题代替 id。",
          "message 要简洁说明你的理解；实际完成结果会由服务端补充。"
        ].join("\n")
      },
      {
        role: "user",
        content: JSON.stringify({
          command: input.command,
          currentCourseId: input.currentCourseId,
          currentLessonId: input.currentLessonId || null,
          currentNoteId: input.currentNoteId || null,
          courses: courseContext,
          lessons: lessonContext,
          notes: noteContext,
          currentPreferences: input.preferences
        })
      }
    ]
  });

  const parsedPlan = commandPlanSchema.safeParse(parseJsonObject(raw.content));
  if (parsedPlan.success) {
    return { ...parsedPlan.data, provider: raw.provider.label };
  }

  const repaired = await createCompletionWithFallback({
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "你是 JSON 操作计划修复器。根据原始命令和上下文修复格式并补齐动作的必要字段，不改变用户意图。每个 operations 元素都必须包含白名单中的 action，并保留真实对象 id。只输出严格 JSON。"
      },
      {
        role: "user",
        content: JSON.stringify({
          originalCommand: input.command,
          currentCourseId: input.currentCourseId,
          currentLessonId: input.currentLessonId || null,
          currentNoteId: input.currentNoteId || null,
          courses: courseContext,
          lessons: lessonContext,
          requiredShape: {
            message: "string",
            requiresClarification: "boolean",
            operations: [
              {
                action:
                  "create_course|create_lesson|delete_course|delete_lesson|delete_note|update_course|update_lesson|update_note|move_note|update_preferences"
              }
            ]
          },
          validationErrors: parsedPlan.error.issues,
          invalidPlan: raw.content
        })
      }
    ]
  });

  return {
    ...commandPlanSchema.parse(parseJsonObject(repaired.content)),
    provider: repaired.provider.label
  };
}

async function createCompletionWithFallback(request: ChatRequest, options?: { requiresVision?: boolean }) {
  const providers = getConfiguredProviders(options?.requiresVision);
  const errors: unknown[] = [];

  for (const provider of providers) {
    const client = new OpenAI({
      apiKey: provider.apiKey,
      baseURL: provider.baseURL,
      maxRetries: 0,
      fetch: fetchWithoutSdkTimeout
    });
    const attempts = request.response_format ? [request, { ...request, response_format: undefined }] : [request];

    for (const attempt of attempts) {
      try {
        const completion = await client.chat.completions.create(
          {
            ...attempt,
            model: provider.model
          },
          {
            maxRetries: 0
          }
        );
        const content = completion.choices[0]?.message.content;
        if (!content) throw new Error("AI_EMPTY_RESPONSE");
        return { content, provider };
      } catch (error) {
        errors.push(error);
        if (!shouldRetryWithoutJsonFormat(error, attempt)) break;
      }
    }
  }

  throw errors.at(-1) ?? new Error("AI_PROVIDER_KEY_MISSING");
}

async function fetchWithoutSdkTimeout(input: RequestInfo | URL, init?: RequestInit) {
  const { signal: _sdkTimeoutSignal, ...options } = init ?? {};
  return fetch(input, options);
}

function getConfiguredProviders(requiresVision = false) {
  const configuredOrder = requiresVision
    ? process.env.AI_VISION_PROVIDER_ORDER ?? "openai,zhipu"
    : process.env.AI_PROVIDER_ORDER ?? "deepseek,openai,zhipu";
  const order = configuredOrder
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean) as AiProviderId[];
  const providers = Array.from(new Set(order))
    .map(createProvider)
    .filter((provider): provider is AiProvider => Boolean(provider))
    .filter((provider) => !requiresVision || provider.supportsVision);
  if (!providers.length) {
    throw new Error(requiresVision ? "AI_VISION_PROVIDER_MISSING" : "AI_PROVIDER_KEY_MISSING");
  }
  return providers;
}

function createProvider(id: AiProviderId): AiProvider | null {
  if (id === "deepseek") {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) return null;
    return {
      id,
      label: "DeepSeek",
      apiKey,
      baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
      supportsVision: false
    };
  }

  if (id === "zhipu") {
    const apiKey = process.env.ZHIPU_API_KEY || process.env.ZHIPUAI_API_KEY;
    if (!apiKey) return null;
    return {
      id,
      label: "智谱 GLM",
      apiKey,
      baseURL: process.env.ZHIPU_BASE_URL || "https://open.bigmodel.cn/api/paas/v4",
      model: process.env.ZHIPU_MODEL || "glm-4-flash",
      supportsVision: /(?:^|[-_])(?:glm-\d+(?:\.\d+)?v|vision|vl)(?:$|[-_])/i.test(
        process.env.ZHIPU_MODEL || "glm-4-flash"
      )
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return {
    id: "openai",
    label: "OpenAI",
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL,
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    supportsVision: isVisionModel(process.env.OPENAI_MODEL || "gpt-4o-mini")
  };
}

function isVisionModel(model: string) {
  return /gpt-4(?:o|\.\d)|gpt-5|vision|gemini|(?:^|[-_])vl(?:$|[-_])/i.test(model);
}

function shouldRetryWithoutJsonFormat(error: unknown, request: ChatRequest) {
  return Boolean(request.response_format && hasStatus(error, 400));
}

function hasStatus(error: unknown, status: number) {
  return typeof error === "object" && error !== null && "status" in error && (error as { status?: number }).status === status;
}

function parseJsonObject(raw: string) {
  const trimmed = raw.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    return JSON.parse(withoutFence);
  } catch {
    const start = withoutFence.indexOf("{");
    const end = withoutFence.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(withoutFence.slice(start, end + 1));
    }
    throw new Error("AI_JSON_PARSE_FAILED");
  }
}

function addMindMapIds(node: unknown): MindMapNode {
  if (typeof node === "string") {
    return {
      id: nanoid(),
      label: node
    };
  }

  if (Array.isArray(node)) {
    const [head, ...rest] = node;
    return {
      id: nanoid(),
      label: typeof head === "string" ? head : "知识节点",
      children: rest.length ? rest.map(addMindMapIds) : undefined
    };
  }

  const item = typeof node === "object" && node !== null ? (node as RawMindMapNode) : {};
  return {
    id: nanoid(),
    label: item.label ?? item.topic ?? item.title ?? item.name ?? "未命名节点",
    children: item.children?.map((child) => addMindMapIds(child))
  };
}
