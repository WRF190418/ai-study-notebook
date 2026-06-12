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
  sourceType: "text" | "outline" | "image";
  text: string;
  imageDataUrl?: string;
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
    "请把用户提供的截图、文字或大纲整理成漂亮、严谨、可复习的课程笔记。",
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
    `用户整理要求：${input.targetInstruction?.trim() || "用户没有明确要求，请你根据材料内容判断归档章节。"}`,
    `已有章节：${JSON.stringify(input.lessons)}`,
    `整理模式：${modeText}`
  ]
    .filter(Boolean)
    .join("\n");

  const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
    {
      type: "text",
      text: `${instruction}\n\n用户材料：\n${input.text || "(用户主要提供了截图，请识别图中内容并整理。)"}`
    }
  ];

  if (input.imageDataUrl) {
    content.push({
      type: "image_url",
      image_url: {
        url: input.imageDataUrl
      }
    });
  }

  const raw = await createCompletionWithFallback({
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
        content
      }
    ]
  });

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

const commandSchema = z.object({
  action: z.enum([
    "create_course",
    "create_lesson",
    "delete_course",
    "delete_lesson",
    "delete_note",
    "rename_course",
    "rename_lesson",
    "update_lesson_style",
    "update_note",
    "update_preferences",
    "reply"
  ]),
  message: z.string().default(""),
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
  newTitle: z.string().optional(),
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
});

export type AiCommandResult = z.infer<typeof commandSchema>;

export async function interpretNotebookCommand(input: {
  command: string;
  currentCourseId: string;
  courses: Course[];
  lessons: Lesson[];
  notes: Note[];
  preferences: UserPreferences;
}): Promise<AiCommandResult> {
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
  const noteContext = input.notes.map(({ id, courseId, lessonId, title, summary, contentMarkdown }) => ({
    id,
    courseId,
    lessonId,
    title,
    summary,
    markdownPreview: contentMarkdown.slice(0, 6000)
  }));

  const raw = await createCompletionWithFallback({
    temperature: 0.25,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: [
          "你是网页笔记本的 AI 命令行解析器。",
          "你只能输出严格 JSON，不要 Markdown 代码围栏。",
          "允许动作：",
          "1. create_course：用户要求新建大板块/课程/科目/笔记本。必须给 course.title、code、term、description，可给 lessonTitle。",
          "2. create_lesson：用户要求在当前课程中新建章节/小节/课时/笔记栏/章节卡片。必须给 lesson.title，可给 subtitle、icon、accent。",
          "3. delete_course：用户要求删除课程/大板块/科目。必须选择 courseId。删除风险高，只有用户明确删除课程时使用。",
          "4. delete_lesson：用户要求删除章节/小节/课时/笔记栏/章节卡片。必须选择 lessonId。",
          "5. delete_note：用户要求删除某篇笔记。必须根据上下文选择最匹配 noteId。",
          "6. rename_course：用户要求修改课程/大板块名称。必须选择 courseId，并给 newTitle。",
          "7. rename_lesson：用户要求修改章节/小节/课时/笔记栏标题。必须选择 lessonId，并给 newTitle。",
          "8. update_lesson_style：用户要求修改某个章节卡片/课程按钮/章节按钮的颜色、图标、外观。必须选择 lessonId，并在 lesson.accent 或 lesson.icon 中给出修改。注意：如果用户说“第一章课程按钮颜色改为粉色”，这是 update_lesson_style，不是 rename_lesson。",
          "9. update_note：用户要求修改某篇笔记正文。必须选择 noteId，并在 updatedNote.markdown 里输出完整修改后的 Markdown；如有需要也输出 title/summary。",
          "10. update_preferences：用户要求改变整个页面布局、全局按钮造型、主题颜色、卡片风格、界面密度、章节排列、阅读布局等视觉体验。只允许输出 preferences 枚举值。",
          "11. reply：用户意图不清或风险太高时，只回复解释，不做修改。",
          "偏好枚举含义：primaryColor sage=绿色清爽，cobalt=蓝色学术，violet=紫色灵感，mono=黑白极简；buttonRadius square=方正，soft=轻圆角，pill=胶囊；buttonStyle solid=实色，soft=浅色柔和，outline=线框；density compact=紧凑，comfortable=标准，airy=宽松；cardStyle elevated=阴影，bordered=边框，flat=平面；lessonLayout grid=卡片网格，list=列表。",
          "章节样式枚举含义：lesson.accent sage=绿色，amber=橙黄色，cobalt=蓝色，rose=粉色/玫红/彩色活泼；lesson.icon book=书本，atom=物理/原子，sparkles=复习/重点，function=公式/函数，image=图像/标注。",
          "如果用户说“刚才那篇/最新那篇”，优先选择 notes 列表里最靠前的笔记。",
          "删除和修改都必须尽量匹配用户指定的标题、主题或当前课程。",
          "如果用户指定某一章、Lecture、章节卡片、课程按钮，则优先理解为该章节相关操作，而不是全局偏好。",
          "如果用户说按钮不好看、界面太挤、颜色不好、卡片太重、想要更像 Notion/更清爽/更学术且没有指定章节，优先选择 update_preferences。"
        ].join("\n")
      },
      {
        role: "user",
        content: JSON.stringify({
          command: input.command,
          currentCourseId: input.currentCourseId,
          courses: courseContext,
          lessons: lessonContext,
          notes: noteContext,
          currentPreferences: input.preferences
        })
      }
    ]
  });

  return commandSchema.parse(parseJsonObject(raw.content));
}

async function createCompletionWithFallback(request: ChatRequest) {
  const providers = getConfiguredProviders();
  const errors: unknown[] = [];

  for (const provider of providers) {
    const client = new OpenAI({
      apiKey: provider.apiKey,
      baseURL: provider.baseURL
    });
    const attempts = request.response_format ? [request, { ...request, response_format: undefined }] : [request];

    for (const attempt of attempts) {
      try {
        const completion = await client.chat.completions.create({
          ...attempt,
          model: provider.model
        });
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

function getConfiguredProviders() {
  const order = (process.env.AI_PROVIDER_ORDER ?? "deepseek,openai,zhipu")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean) as AiProviderId[];
  const providers = Array.from(new Set(order)).map(createProvider).filter((provider): provider is AiProvider => Boolean(provider));
  if (!providers.length) throw new Error("AI_PROVIDER_KEY_MISSING");
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
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat"
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
      model: process.env.ZHIPU_MODEL || "glm-4-flash"
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return {
    id: "openai",
    label: "OpenAI",
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL,
    model: process.env.OPENAI_MODEL || "gpt-4o-mini"
  };
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
