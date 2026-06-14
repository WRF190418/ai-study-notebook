"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Atom,
  BookOpen,
  Brain,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileText,
  FunctionSquare,
  HelpCircle,
  ImagePlus,
  Library,
  LogOut,
  Network,
  Search,
  Sparkles,
  Upload,
  X
} from "lucide-react";
import type { Course, Lesson, MindMapNode, Note, User, UserPreferences } from "@/lib/types";
import MarkdownView from "@/components/MarkdownView";

type Workspace = {
  courses: Course[];
  lessons: Lesson[];
  notes: Note[];
  preferences: UserPreferences;
};

type SourceType = "text" | "outline" | "image" | "file";
type Mode = "standard" | "exam" | "deep";
type ProcessStep = {
  label: string;
  description: string;
};

const organizeSteps: ProcessStep[] = [
  { label: "读取材料", description: "正在解析文字、图片或课件内容。" },
  { label: "理解重点", description: "提取概念、公式、表格和复习线索。" },
  { label: "判断章节", description: "匹配已有章节，必要时准备新建章节。" },
  { label: "生成笔记", description: "写入 Markdown、闪卡和思维导图结构。" },
  { label: "保存结果", description: "把整理好的内容归档到笔记本。" }
];

const commandSteps: ProcessStep[] = [
  { label: "理解命令", description: "识别你想修改的内容或界面。" },
  { label: "匹配对象", description: "查找相关笔记、课程或个人偏好。" },
  { label: "执行操作", description: "应用删除、修改、新建或布局调整。" },
  { label: "刷新界面", description: "同步当前账号下的笔记本状态。" }
];

export default function NotebookApp({
  initialUser,
  initialWorkspace
}: {
  initialUser: Pick<User, "id" | "name" | "email" | "onboardingCompletedAt">;
  initialWorkspace: Workspace;
}) {
  const [workspace, setWorkspace] = useState(initialWorkspace);
  const [selectedTerm, setSelectedTerm] = useState(initialWorkspace.courses[0]?.term ?? "");
  const [courseId, setCourseId] = useState(initialWorkspace.courses[0]?.id ?? "");
  const [lessonId, setLessonId] = useState(initialWorkspace.lessons.find((lesson) => lesson.courseId === courseId)?.id ?? "");
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState(initialWorkspace.notes[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [organizerCollapsed, setOrganizerCollapsed] = useState(false);
  const [appHydrated, setAppHydrated] = useState(false);
  const [onboardingCompletedAt, setOnboardingCompletedAt] = useState(initialUser.onboardingCompletedAt ?? "");
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);

  const terms = useMemo(() => Array.from(new Set(workspace.courses.map((item) => item.term).filter(Boolean))), [workspace.courses]);
  const termCourses = useMemo(
    () => workspace.courses.filter((item) => !selectedTerm || item.term === selectedTerm),
    [selectedTerm, workspace.courses]
  );
  const course = termCourses.find((item) => item.id === courseId) ?? termCourses[0] ?? workspace.courses[0];
  const lessons = workspace.lessons.filter((lesson) => lesson.courseId === course?.id);
  const activeLesson = lessons.find((lesson) => lesson.id === activeLessonId) ?? null;
  const notes = workspace.notes.filter((note) => note.courseId === course?.id);
  const visibleNotes = activeLesson ? notes.filter((note) => note.lessonId === activeLesson.id) : notes;
  const filteredNotes = visibleNotes.filter((note) => `${note.title} ${note.summary}`.toLowerCase().includes(query.toLowerCase()));
  const selectedNote = filteredNotes.find((note) => note.id === selectedNoteId) ?? filteredNotes[0];

  useEffect(() => {
    setAppHydrated(true);
    if (!initialUser.onboardingCompletedAt) {
      setOnboardingOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!terms.length) return;
    if (!selectedTerm || !terms.includes(selectedTerm)) {
      setSelectedTerm(terms[0]);
    }
  }, [selectedTerm, terms]);

  useEffect(() => {
    if (!course) return;
    if (course.id !== courseId) {
      chooseCourse(course.id, { keepTerm: true });
    }
  }, [course, courseId]);

  function chooseCourse(nextCourseId: string, options?: { keepTerm?: boolean }) {
    const nextCourse = workspace.courses.find((item) => item.id === nextCourseId);
    if (nextCourse && !options?.keepTerm) {
      setSelectedTerm(nextCourse.term);
    }
    setCourseId(nextCourseId);
    const firstLesson = workspace.lessons.find((lesson) => lesson.courseId === nextCourseId);
    setLessonId(firstLesson?.id ?? "");
    setActiveLessonId(null);
    setSelectedNoteId("");
  }

  function chooseTerm(nextTerm: string) {
    setSelectedTerm(nextTerm);
    const firstCourse = workspace.courses.find((item) => item.term === nextTerm);
    if (firstCourse) {
      setCourseId(firstCourse.id);
      const firstLesson = workspace.lessons.find((lesson) => lesson.courseId === firstCourse.id);
      setLessonId(firstLesson?.id ?? "");
    } else {
      setCourseId("");
      setLessonId("");
    }
    setActiveLessonId(null);
    setSelectedNoteId("");
  }

  function enterLesson(lesson: Lesson) {
    setLessonId(lesson.id);
    setActiveLessonId(lesson.id);
    const firstNote = workspace.notes.find((note) => note.lessonId === lesson.id);
    setSelectedNoteId(firstNote?.id ?? "");
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.reload();
  }

  function closeOnboarding() {
    setOnboardingOpen(false);
    if (!onboardingCompletedAt) {
      setOnboardingCompletedAt(new Date().toISOString());
      void fetch("/api/onboarding", { method: "POST" })
        .then(async (response) => {
          if (!response.ok) return;
          const data = await response.json();
          setOnboardingCompletedAt(data.user?.onboardingCompletedAt ?? new Date().toISOString());
        })
        .catch(() => {
          setOnboardingCompletedAt("");
        });
    }
  }

  return (
    <main
      className="app-shell"
      data-primary={workspace.preferences.primaryColor}
      data-button-radius={workspace.preferences.buttonRadius}
      data-button-style={workspace.preferences.buttonStyle}
      data-density={workspace.preferences.density}
      data-card-style={workspace.preferences.cardStyle}
      data-note-layout={workspace.preferences.noteLayout}
    >
      <aside className="sidebar">
        <div className="nav-logo">
          <span className="nav-icon">
            <BookOpen size={21} />
          </span>
          <span>StudyNote AI</span>
        </div>

        <nav className="nav-menu" aria-label="主导航">
          <button className="nav-item active" type="button">
            <Library size={18} />
            课程
          </button>
          <button className="nav-item" type="button">
            <Brain size={18} />
            AI 整理
          </button>
          <button className="nav-item" type="button">
            <Network size={18} />
            复习资产
          </button>
          <button
            className="nav-item"
            onClick={() => {
              setOnboardingStep(0);
              setOnboardingOpen(true);
            }}
            type="button"
          >
            <HelpCircle size={18} />
            新手指导
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-card">
            <strong>{initialUser.name}</strong>
            <span>{initialUser.email}</span>
          </div>
          <button className="ghost-button" disabled={!appHydrated} onClick={logout} type="button">
            <LogOut size={17} />
            退出
          </button>
        </div>
      </aside>

      <section className="main">
        <header className="topbar">
          <div className="course-switcher">
            <label className="term-select">
              <CalendarDays size={15} />
              <select value={selectedTerm} onChange={(event) => chooseTerm(event.target.value)} aria-label="选择学期">
                {terms.map((term) => (
                  <option key={term} value={term}>
                    {term}
                  </option>
                ))}
              </select>
            </label>
            <select value={course?.id ?? ""} onChange={(event) => chooseCourse(event.target.value)} aria-label="选择课程">
              {termCourses.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </div>
          <label className="search-box">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索笔记、公式或知识点" />
          </label>
        </header>

        <div className={`workspace ${organizerCollapsed ? "organizer-collapsed" : ""}`}>
          <div className="content-scroll" data-scroll-region="notes">
            {activeLesson ? (
              <LessonDetail
                course={course}
                lesson={activeLesson}
                notes={filteredNotes}
                selectedNote={selectedNote}
                onBack={() => {
                  setActiveLessonId(null);
                  setSelectedNoteId("");
                }}
                onSelectNote={setSelectedNoteId}
                onWorkspaceUpdated={setWorkspace}
              />
            ) : (
              <CourseHome
                course={course}
                lessons={lessons}
                activeLessonId={lessonId}
                lessonLayout={workspace.preferences.lessonLayout}
                onEnterLesson={enterLesson}
              />
            )}
          </div>

          {course ? (
            <OrganizerPanel
              course={course}
              lessons={lessons}
              currentLessonId={activeLesson?.id ?? lessonId}
              currentNoteId={selectedNote?.id ?? ""}
              collapsed={organizerCollapsed}
              onToggleCollapsed={() => setOrganizerCollapsed((value) => !value)}
              onCommandApplied={(payload) => {
                setWorkspace(payload.workspace);
                const nextCourse = payload.workspace.courses.find((item) => item.id === payload.selectedCourseId);
                if (nextCourse) setSelectedTerm(nextCourse.term);
                setCourseId(payload.selectedCourseId);
                setLessonId(payload.selectedLessonId || "");
                setSelectedNoteId(payload.selectedNoteId || "");
                setActiveLessonId(
                  payload.selectedNoteId || payload.action === "create_lesson" || payload.action === "rename_lesson" || payload.action === "update_note"
                    ? payload.selectedLessonId || null
                    : null
                );
              }}
              onNoteCreated={({ note, lesson }) => {
                setWorkspace((current) => ({
                  ...current,
                  lessons: current.lessons.some((item) => item.id === lesson.id) ? current.lessons : [...current.lessons, lesson],
                  notes: [note, ...current.notes]
                }));
                setActiveLessonId(note.lessonId);
                setLessonId(note.lessonId);
                setSelectedNoteId(note.id);
              }}
            />
          ) : null}
        </div>
      </section>

      {onboardingOpen ? (
        <OnboardingGuide
          completed={Boolean(onboardingCompletedAt)}
          step={onboardingStep}
          onStepChange={setOnboardingStep}
          onClose={closeOnboarding}
        />
      ) : null}
    </main>
  );
}

const onboardingSteps = [
  {
    title: "把零散材料变成真正能复习的笔记",
    body: "StudyNote AI 的核心不是普通记事本，而是把课堂截图、老师板书、课件片段和自己的草稿交给 AI，自动整理成清晰、有结构、可回看的课程笔记。",
    highlights: ["截图/文字/大纲", "结构化 Markdown", "自动归档"]
  },
  {
    title: "每门课都有自己的学习主页",
    body: "按学期和课程管理你的学习空间。AI 会根据内容和你的要求选择章节；你写“整理到第二章”时，如果第二章还不存在，它会自动新建并保存进去。",
    highlights: ["多学期", "多课程", "自动新建章节"]
  },
  {
    title: "AI 不只排版，而是帮你重组知识",
    body: "整理台会把原始内容压成重点、解释概念关系、渲染 LaTeX 公式、生成表格，并同时产出闪卡和思维导图，让一份材料直接变成复习资产。",
    highlights: ["LaTeX 公式", "表格", "闪卡", "思维导图"]
  },
  {
    title: "用自然语言管理整个笔记本",
    body: "你可以直接说“删除刚才那篇笔记”“第一章颜色改成彩色”“新建一个 PHY1000 板块”。AI 会优先理解你的命令，再修改当前账号下的课程、章节、笔记和界面风格。",
    highlights: ["AI 命令行", "个性化界面", "账号独立"]
  },
  {
    title: "越用越像你的专属学习系统",
    body: "每个账号都有自己的课程结构、笔记内容和视觉偏好。你可以持续补充材料、重整旧笔记、积累闪卡，让笔记本从“存资料”变成“帮你学习”。",
    highlights: ["个人知识库", "持续重整", "主动复习"]
  }
];

function OnboardingGuide({
  completed,
  step,
  onStepChange,
  onClose
}: {
  completed: boolean;
  step: number;
  onStepChange: (step: number) => void;
  onClose: () => void | Promise<void>;
}) {
  const current = onboardingSteps[step] ?? onboardingSteps[0];
  const isLast = step === onboardingSteps.length - 1;

  return (
    <div className="onboarding-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="新手指导">
      <section className="onboarding-card" onClick={(event) => event.stopPropagation()}>
        <div className="onboarding-kicker">
          <Sparkles size={17} />
          {completed ? "新手指导" : "首次进入 · 新手指导"}
        </div>
        <h2>{current.title}</h2>
        <p>{current.body}</p>
        <div className="onboarding-highlights" aria-label="核心能力">
          {current.highlights.map((highlight) => (
            <span key={highlight}>{highlight}</span>
          ))}
        </div>
        <div className="onboarding-dots" aria-label="指导进度">
          {onboardingSteps.map((item, index) => (
            <button
              aria-label={`跳到新手指导第 ${index + 1} 步`}
              className={index === step ? "active" : ""}
              key={item.title}
              onClick={() => onStepChange(index)}
              type="button"
            />
          ))}
        </div>
        <div className="onboarding-actions">
          <button className="text-button" onClick={onClose} onPointerDown={onClose} type="button">
            跳过
          </button>
          <div>
            <button
              className="ghost-button"
              disabled={step === 0}
              onClick={() => onStepChange(Math.max(0, step - 1))}
              type="button"
            >
              上一步
            </button>
            <button
              className="primary-button"
              onClick={() => {
                if (isLast) {
                  void onClose();
                } else {
                  onStepChange(step + 1);
                }
              }}
              type="button"
            >
              {isLast ? "完成" : "下一步"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function CourseHome({
  course,
  lessons,
  activeLessonId,
  lessonLayout,
  onEnterLesson
}: {
  course?: Course;
  lessons: Lesson[];
  activeLessonId: string;
  lessonLayout: UserPreferences["lessonLayout"];
  onEnterLesson: (lesson: Lesson) => void;
}) {
  return (
    <>
      {course ? (
        <section className="course-hero">
          <h1>{course.title}</h1>
          <p>
            {course.code} - {course.description}
          </p>
          <div className="tag-row">
            {course.tags.map((tag) => (
              <span className="tag" key={tag}>
                <Sparkles size={15} />
                {tag}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <div className="section-title">
        <h2>
          <BookOpen size={23} />
          课程章节
        </h2>
      </div>

      <div className={`lesson-grid ${lessonLayout === "list" ? "lesson-list" : ""}`}>
        {lessons.map((lesson) => (
          <LessonCard key={lesson.id} lesson={lesson} active={lesson.id === activeLessonId} onClick={() => onEnterLesson(lesson)} />
        ))}
      </div>
    </>
  );
}

function LessonDetail({
  course,
  lesson,
  notes,
  selectedNote,
  onBack,
  onSelectNote,
  onWorkspaceUpdated
}: {
  course?: Course;
  lesson: Lesson;
  notes: Note[];
  selectedNote?: Note;
  onBack: () => void;
  onSelectNote: (id: string) => void;
  onWorkspaceUpdated: (workspace: Workspace) => void;
}) {
  return (
    <>
      <button className="back-button" onClick={onBack} type="button">
        <ChevronLeft size={18} />
        返回课程章节
      </button>

      <section className={`lesson-detail-hero ${lesson.accent}`}>
        <div>
          <span className="lesson-detail-kicker">Lecture {lesson.order}</span>
          <h1>{lesson.title}</h1>
          <p>
            {lesson.subtitle}
            {course ? ` · ${course.code}` : ""}
          </p>
        </div>
      </section>

      <div className="section-title">
        <h2>
          <FileText size={23} />
          本章笔记
        </h2>
        <span className="small-muted">{notes.length} 篇</span>
      </div>

      <div className="notes-list">
        {notes.length ? (
          notes.map((note) => (
            <button
              key={note.id}
              className={`note-item ${selectedNote?.id === note.id ? "active" : ""}`}
              type="button"
              onClick={() => onSelectNote(note.id)}
            >
              <span>
                <strong>{note.title}</strong>
                <span>{note.summary}</span>
              </span>
              <ChevronRight size={18} />
            </button>
          ))
        ) : (
          <div className="note-item">
            <span>
              <strong>这个章节还没有整理好的笔记</strong>
              <span>右侧 AI 整理台会把新笔记保存到当前选择的章节。</span>
            </span>
          </div>
        )}
      </div>

      {selectedNote ? (
        <>
          <section className="note-reader">
            <div className="panel-heading">
              <div>
                <h2>{selectedNote.title}</h2>
                <p>{selectedNote.summary}</p>
              </div>
              <NoteImageInsert
                key={selectedNote.id}
                note={selectedNote}
                onWorkspaceUpdated={onWorkspaceUpdated}
              />
            </div>
            <MarkdownView content={selectedNote.contentMarkdown} />
          </section>
          <LearningArtifacts note={selectedNote} />
        </>
      ) : null}
    </>
  );
}

function NoteImageInsert({
  note,
  onWorkspaceUpdated
}: {
  note: Note;
  onWorkspaceUpdated: (workspace: Workspace) => void;
}) {
  const [open, setOpen] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [placement, setPlacement] = useState<"start" | "end" | "after_heading">("end");
  const [afterHeading, setAfterHeading] = useState("");
  const [alt, setAlt] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!image) {
      setMessage("请选择要插入的图片。");
      return;
    }
    if (placement === "after_heading" && !afterHeading.trim()) {
      setMessage("请输入图片要放在哪个标题后。");
      return;
    }

    setBusy(true);
    setMessage("");
    const payload = new FormData();
    payload.set("image", image);
    payload.set("placement", placement);
    payload.set("afterHeading", afterHeading);
    payload.set("alt", alt);

    try {
      const response = await fetch(`/api/notes/${note.id}/images`, {
        method: "POST",
        body: payload
      });
      const data = await readJsonResponse(response);
      if (!response.ok || data?.error) {
        setMessage(data?.error ?? "图片插入失败。");
        return;
      }
      onWorkspaceUpdated(data.workspace);
      setImage(null);
      setMessage(data.message ?? "图片已插入笔记。");
      setOpen(false);
    } catch {
      setMessage("图片上传中断，请检查网络后重试。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="note-image-control">
      <button className="ghost-button" onClick={() => setOpen((value) => !value)} type="button">
        <ImagePlus size={17} />
        插入图片
      </button>
      {open ? (
        <form className="note-image-form" onSubmit={submit}>
          <label className="field">
            <span>选择图片</span>
            <input
              accept="image/png,image/jpeg,image/webp,image/gif"
              aria-label="选择笔记图片"
              onChange={(event) => setImage(event.target.files?.[0] ?? null)}
              type="file"
            />
          </label>
          <label className="field">
            <span>插入位置</span>
            <select
              aria-label="图片插入位置"
              onChange={(event) => setPlacement(event.target.value as typeof placement)}
              value={placement}
            >
              <option value="start">笔记开头</option>
              <option value="end">笔记结尾</option>
              <option value="after_heading">指定标题后</option>
            </select>
          </label>
          {placement === "after_heading" ? (
            <label className="field">
              <span>标题文字</span>
              <input
                aria-label="图片目标标题"
                onChange={(event) => setAfterHeading(event.target.value)}
                placeholder="例如：原始材料要点"
                value={afterHeading}
              />
            </label>
          ) : null}
          <label className="field">
            <span>图片说明（可选）</span>
            <input
              aria-label="图片说明"
              onChange={(event) => setAlt(event.target.value)}
              placeholder="例如：实验装置示意图"
              value={alt}
            />
          </label>
          <button className="primary-button" disabled={busy} type="submit">
            {busy ? "插入中..." : "确认插入"}
          </button>
        </form>
      ) : null}
      {message ? <div className="note-image-message">{message}</div> : null}
    </div>
  );
}

function LessonCard({ lesson, active, onClick }: { lesson: Lesson; active: boolean; onClick: () => void }) {
  const Icon = lesson.icon === "atom" ? Atom : lesson.icon === "function" ? FunctionSquare : lesson.icon === "sparkles" ? Sparkles : BookOpen;
  return (
    <button
      className="lesson-card"
      style={{ outline: active ? "3px solid rgba(63, 143, 122, 0.22)" : undefined }}
      type="button"
      onClick={onClick}
    >
      <div className={`lesson-art ${lesson.accent}`}>
        <span className="lesson-badge">Lecture {lesson.order}</span>
        <span className="lesson-icon">
          <Icon size={34} />
        </span>
      </div>
      <div className="lesson-body">
        <h3>{lesson.title}</h3>
        <p>{lesson.subtitle}</p>
        <span className="inline-link">进入章节 <ChevronRight size={17} /></span>
      </div>
    </button>
  );
}

function OrganizerPanel({
  course,
  lessons,
  currentLessonId,
  currentNoteId,
  collapsed,
  onToggleCollapsed,
  onCommandApplied,
  onNoteCreated
}: {
  course: Course;
  lessons: Lesson[];
  currentLessonId: string;
  currentNoteId: string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onCommandApplied: (payload: {
    action:
      | "create_course"
      | "create_lesson"
      | "delete_course"
      | "delete_lesson"
      | "delete_note"
      | "rename_course"
      | "rename_lesson"
      | "update_lesson_style"
      | "update_note"
      | "update_preferences"
      | "ai_plan"
      | "reply";
    selectedCourseId: string;
    selectedLessonId: string;
    selectedNoteId: string;
    workspace: Workspace;
  }) => void;
  onNoteCreated: (payload: { note: Note; lesson: Lesson }) => void;
}) {
  const [sourceType, setSourceType] = useState<SourceType>("text");
  const [mode, setMode] = useState<Mode>("standard");
  const [commandBusy, setCommandBusy] = useState(false);
  const [commandStep, setCommandStep] = useState(0);
  const [commandMessage, setCommandMessage] = useState("");
  const [commandImage, setCommandImage] = useState<File | null>(null);
  const [targetInstruction, setTargetInstruction] = useState("");
  const [text, setText] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [organizeStep, setOrganizeStep] = useState(0);
  const [organizeProgress, setOrganizeProgress] = useState(0);
  const [organizeElapsedSeconds, setOrganizeElapsedSeconds] = useState(0);
  const [organizeMessage, setOrganizeMessage] = useState("");
  const [error, setError] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const commandRef = useRef<HTMLTextAreaElement>(null);
  const commandImageRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!commandBusy) {
      setCommandStep(0);
      return;
    }
    setCommandStep(0);
    const timer = window.setInterval(() => {
      setCommandStep((current) => Math.min(current + 1, commandSteps.length - 1));
    }, 1200);
    return () => window.clearInterval(timer);
  }, [commandBusy]);

  useEffect(() => {
    if (!busy) {
      setOrganizeStep(0);
      setOrganizeProgress(0);
      setOrganizeElapsedSeconds(0);
      return;
    }

    const startedAt = Date.now();
    setOrganizeStep(0);
    setOrganizeProgress(4);
    const timer = window.setInterval(() => {
      const elapsedMs = Date.now() - startedAt;
      const progress = estimateOrganizeProgress(elapsedMs);
      setOrganizeProgress(progress);
      setOrganizeElapsedSeconds(Math.floor(elapsedMs / 1000));
      setOrganizeStep(getOrganizeStep(progress));
    }, 500);
    return () => window.clearInterval(timer);
  }, [busy]);

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    setSelectedFiles(files);
    setSourceType(files.every((file) => file.type.startsWith("image/")) ? "image" : "file");
    setError("");
  }

  function removeFile(index: number) {
    setSelectedFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submitCommand(event: FormEvent) {
    event.preventDefault();
    const currentCommand = commandRef.current?.value ?? "";
    if (!currentCommand.trim()) {
      setCommandMessage("请输入要 AI 执行的命令。");
      return;
    }

    setCommandBusy(true);
    setCommandMessage("");
    setOrganizeMessage("");
    setError("");

    try {
      const commandPayload = commandImage
        ? (() => {
            const payload = new FormData();
            payload.set("command", currentCommand);
            payload.set("currentCourseId", course.id);
            payload.set("currentLessonId", currentLessonId);
            payload.set("currentNoteId", currentNoteId);
            payload.set("image", commandImage);
            return payload;
          })()
        : JSON.stringify({
            command: currentCommand,
            currentCourseId: course.id,
            currentLessonId,
            currentNoteId
          });
      const response = await fetch("/api/ai/command", {
        method: "POST",
        headers: commandImage ? undefined : { "Content-Type": "application/json" },
        body: commandPayload
      });
      const data = await readJsonResponse(response);

      if (!response.ok || data?.error) {
        setCommandMessage(data?.error ?? "AI 命令执行失败。");
        return;
      }

      onCommandApplied(data);
      if (commandRef.current) commandRef.current.value = "";
      if (commandImageRef.current) commandImageRef.current.value = "";
      setCommandImage(null);
      setCommandMessage(
        data.aiProvider ? `${data.message ?? "命令已处理。"}（由 ${data.aiProvider} 理解并执行）` : data.message ?? "命令已处理。"
      );
    } catch {
      setCommandMessage("AI 命令请求中断，请检查网络后重试。");
    } finally {
      setCommandBusy(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const form = new FormData(event.currentTarget as HTMLFormElement);
    const currentText = textRef.current?.value ?? String(form.get("sourceText") ?? text);

    if (!currentText.trim() && !selectedFiles.length) {
      setError("请先粘贴文字、输入大纲，或上传图片/课件。");
      return;
    }
    setBusy(true);
    setError("");
    setOrganizeMessage("");

    const payload = new FormData();
    payload.set("courseId", course.id);
    payload.set("targetInstruction", targetInstruction);
    payload.set("sourceType", sourceType);
    payload.set("mode", mode);
    payload.set("text", currentText);
    selectedFiles.forEach((file) => payload.append("files", file));

    try {
      const response = await fetch("/api/ai/organize", {
        method: "POST",
        body: payload
      });
      const data = await readJsonResponse(response);

      if (!response.ok || data?.error) {
        setError(data?.error ?? "AI 整理失败。");
        return;
      }
      if (!data?.note || !data?.lesson) {
        setError("服务器返回了不完整的整理结果，请重试。");
        return;
      }

      setOrganizeProgress(100);
      setOrganizeStep(organizeSteps.length - 1);
      onNoteCreated({ note: data.note, lesson: data.lesson });
      setOrganizeMessage(data.warning ?? `已保存到「${data.lesson.title}」，可以进入章节查看完整笔记。`);
      if (textRef.current) textRef.current.value = "";
      setText("");
      setSelectedFiles([]);
      if (fileRef.current) fileRef.current.value = "";
    } catch {
      setError("整理请求中断或服务器响应异常，请检查网络后重试。");
    } finally {
      setBusy(false);
    }
  }

  if (collapsed) {
    return (
      <aside className="organizer organizer-rail">
        <button className="organizer-rail-button" onClick={onToggleCollapsed} type="button" title="展开 AI 整理台">
          <Brain size={22} />
          <span>AI 整理台</span>
        </button>
      </aside>
    );
  }

  return (
    <aside className="organizer">
      <div className="panel-heading">
        <div>
          <h2>AI 整理台</h2>
          <p>截图、文字、大纲都会自动归档到合适章节。</p>
        </div>
        <button className="icon-button collapse-button" onClick={onToggleCollapsed} type="button" title="收起 AI 整理台">
          <ChevronRight size={18} />
        </button>
      </div>

      <form className="command-panel" onSubmit={submitCommand}>
        <label className="field">
          <span>AI 命令行</span>
          <textarea
            ref={commandRef}
            className="command-box"
            placeholder="例如：删除刚才那篇笔记；把牛顿第二定律改成考试复习版；新建一个高等数学板块，学期为 2026 秋季。"
          />
        </label>
        <div className="command-image-row">
          <label className="command-image-picker">
            <ImagePlus size={16} />
            {commandImage ? "更换图片" : "附加图片"}
            <input
              accept="image/png,image/jpeg,image/webp,image/gif"
              aria-label="AI 命令图片"
              onChange={(event) => setCommandImage(event.target.files?.[0] ?? null)}
              ref={commandImageRef}
              type="file"
            />
          </label>
          {commandImage ? (
            <div className="command-image-name">
              <span title={commandImage.name}>{commandImage.name}</span>
              <button
                aria-label="移除 AI 命令图片"
                onClick={() => {
                  setCommandImage(null);
                  if (commandImageRef.current) commandImageRef.current.value = "";
                }}
                type="button"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <span className="small-muted">可命令 AI 把所附图片插入指定笔记位置</span>
          )}
        </div>
        <div className="status-row">
          <span className="small-muted">由真实 AI 理解上下文并执行经过校验的操作</span>
          <button className="ghost-button" disabled={commandBusy || !hydrated} type="submit">
            {commandBusy ? "执行中..." : <><Brain size={17} /> 执行命令</>}
          </button>
        </div>
        {commandBusy ? <ProcessProgress steps={commandSteps} activeIndex={commandStep} /> : null}
        {commandMessage ? <div className="command-message">{commandMessage}</div> : null}
      </form>

      <form onSubmit={submit}>
        <label className="field">
          <span>整理要求</span>
          <textarea
            className="request-box"
            value={targetInstruction}
            onChange={(event) => setTargetInstruction(event.target.value)}
            placeholder="例如：整理到近代物理学；偏考试复习；如果没有合适章节就新建一个“力学基础”。不填则由 AI 根据内容判断。"
          />
        </label>

        <div className="mode-tabs" aria-label="材料类型">
          <button className={sourceType === "text" ? "active" : ""} onClick={() => setSourceType("text")} type="button">
            文字
          </button>
          <button className={sourceType === "outline" ? "active" : ""} onClick={() => setSourceType("outline")} type="button">
            大纲
          </button>
          <button className={sourceType === "image" ? "active" : ""} onClick={() => setSourceType("image")} type="button">
            图片
          </button>
          <button className={sourceType === "file" ? "active" : ""} onClick={() => setSourceType("file")} type="button">
            课件
          </button>
        </div>

        <label className="upload-zone">
          <Upload size={24} />
          <strong>{selectedFiles.length ? `已选择 ${selectedFiles.length} 个文件` : "上传图片或课程课件"}</strong>
          <span className="small-muted">支持 PNG / JPG / WEBP / PDF / PPTX / DOCX / TXT / Markdown</span>
          <input
            accept="image/png,image/jpeg,image/webp,image/gif,.pdf,.pptx,.docx,.txt,.md,.markdown,.csv"
            multiple
            onChange={handleFiles}
            ref={fileRef}
            type="file"
          />
        </label>
        {selectedFiles.length ? (
          <div className="selected-files" aria-label="已选择的文件">
            {selectedFiles.map((file, index) => (
              <div className="selected-file" key={`${file.name}-${file.lastModified}-${index}`}>
                <FileText size={16} />
                <span title={file.name}>{file.name}</span>
                <small>{formatFileSize(file.size)}</small>
                <button aria-label={`移除 ${file.name}`} onClick={() => removeFile(index)} type="button">
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <label className="field">
          <span>
            {sourceType === "outline"
              ? "课程大纲"
              : sourceType === "image" || sourceType === "file"
                ? "补充说明"
                : "原始文字"}
          </span>
          <textarea
            ref={textRef}
            name="sourceText"
            onInput={(event) => setText(event.currentTarget.value)}
            placeholder={
              sourceType === "outline"
                ? "例如：1. 牛顿第一定律 2. 惯性参考系 3. 受力分析常见错误"
                : sourceType === "image" || sourceType === "file"
                  ? "可选：补充课程背景、老师强调的重点或期望的整理方向"
                  : "粘贴课堂记录、老师板书文字、课件片段或自己的草稿"
            }
          />
        </label>

        <label className="field">
          <span>输出风格</span>
          <select value={mode} onChange={(event) => setMode(event.target.value as Mode)}>
            <option value="standard">标准课堂笔记</option>
            <option value="exam">考试复习版</option>
            <option value="deep">深度理解版</option>
          </select>
        </label>

        <div className="status-row">
          <span className="small-muted">AI 会选择已有章节，或自动新建章节</span>
          <button className="primary-button" disabled={busy || !hydrated} type="submit">
            {busy ? `整理中 ${organizeProgress}%` : <><Sparkles size={17} /> 开始整理</>}
          </button>
        </div>
        {busy ? (
          <ProcessProgress
            steps={organizeSteps}
            activeIndex={organizeStep}
            percentage={organizeProgress}
            elapsedSeconds={organizeElapsedSeconds}
          />
        ) : null}
        {organizeMessage ? <div className="command-message">{organizeMessage}</div> : null}
        {error ? <div className="error-box">{error}</div> : null}
      </form>
    </aside>
  );
}

function ProcessProgress({
  steps,
  activeIndex,
  percentage,
  elapsedSeconds
}: {
  steps: ProcessStep[];
  activeIndex: number;
  percentage?: number;
  elapsedSeconds?: number;
}) {
  return (
    <div className="progress-panel" aria-live="polite">
      {typeof percentage === "number" ? (
        <div className="progress-summary">
          <div className="progress-summary-row">
            <strong>预计整理进度</strong>
            <span>{percentage}%</span>
          </div>
          <div
            aria-label={`整理进度 ${percentage}%`}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={percentage}
            className="progress-track"
            role="progressbar"
          >
            <span style={{ width: `${percentage}%` }} />
          </div>
          <small className="progress-hint">
            已等待 {formatElapsedTime(elapsedSeconds ?? 0)}；不设自动超时，请保持页面打开。
          </small>
        </div>
      ) : null}
      {steps.map((step, index) => (
        <div
          className={`progress-step ${index < activeIndex ? "done" : ""} ${index === activeIndex ? "active" : ""}`}
          key={step.label}
        >
          <span className="progress-dot">{index + 1}</span>
          <span>
            <strong>{step.label}</strong>
            <small>{step.description}</small>
          </span>
        </div>
      ))}
    </div>
  );
}

function LearningArtifacts({ note }: { note: Note }) {
  return (
    <div className="artifact-grid">
      <section className="artifact-panel">
        <div className="panel-heading">
          <div>
            <h3>闪卡</h3>
            <p>从笔记中抽取的复习问题。</p>
          </div>
        </div>
        <div className="flashcards">
          {note.flashcards.map((card) => (
            <div className="flashcard" key={card.id}>
              <div className="flashcard-front">
                <MarkdownView compact content={card.front} />
              </div>
              <div className="flashcard-back">
                <MarkdownView compact content={card.back} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="artifact-panel">
        <div className="panel-heading">
          <div>
            <h3>思维导图</h3>
            <p>用于快速浏览知识结构。</p>
          </div>
        </div>
        {note.mindMap.length ? (
          <ul className="mindmap">{note.mindMap.map((node) => <MindMapItem key={node.id} node={node} />)}</ul>
        ) : (
          <p className="small-muted">这篇笔记还没有思维导图。</p>
        )}
      </section>
    </div>
  );
}

function MindMapItem({ node }: { node: MindMapNode }) {
  return (
    <li>
      <MarkdownView compact inline content={node.label} />
      {node.children?.length ? (
        <ul className="mindmap">
          {node.children.map((child) => (
            <MindMapItem key={child.id} node={child} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function estimateOrganizeProgress(elapsedMs: number) {
  const ratio = Math.min(elapsedMs / 240_000, 1);
  return Math.min(96, Math.round(4 + 92 * Math.pow(ratio, 0.65)));
}

function getOrganizeStep(progress: number) {
  if (progress < 22) return 0;
  if (progress < 48) return 1;
  if (progress < 67) return 2;
  if (progress < 100) return 3;
  return 4;
}

async function readJsonResponse(response: Response) {
  const raw = await response.text();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("INVALID_SERVER_RESPONSE");
  }
}

function formatElapsedTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes ? `${minutes} 分 ${seconds} 秒` : `${seconds} 秒`;
}
