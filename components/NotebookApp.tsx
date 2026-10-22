"use client";

import { ChangeEvent, ClipboardEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowRight,
  BookMarked,
  BookOpen,
  Brain,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock3,
  CornerUpLeft,
  FileText,
  HelpCircle,
  Home,
  ImagePlus,
  Library,
  LogOut,
  Maximize2,
  Minimize2,
  Moon,
  Network,
  Palette,
  Search,
  Sparkles,
  Star,
  Sun,
  Upload,
  X
} from "lucide-react";
import type { Course, Lesson, MindMapNode, Note, NoteReadingProgress, NoteStar, User, UserPreferences } from "@/lib/types";
import MarkdownView from "@/components/MarkdownView";
import CoursewareImages from "@/components/CoursewareImages";
import ThemeLandscape, { usePoeticFlow } from "@/components/ThemeWorld";
import AtmosphericHome from "@/components/AtmosphericHome";
import GalacticHome from "@/components/GalacticHome";
import ImmersiveHome from "@/components/ImmersiveHome";
import CourseSpace from "@/components/CourseSpace";
import InteractiveTutorial from "@/components/InteractiveTutorial";
import { tutorialChapters, tutorialEvent } from "@/lib/tutorial";
import { createTutorialWorkspace, tutorialImage, tutorialTerm } from "@/lib/tutorial-demo";
import { poeticScenes, themeOptions } from "@/lib/themes";
import { extractNotePages, extractPageSourceImages, makeExcerpt, markdownToPlainText, pageAnchorId, type NotePageSection } from "@/lib/note-pages";

type Workspace = {
  courses: Course[];
  lessons: Lesson[];
  notes: Note[];
  noteStars: NoteStar[];
  readingProgress: NoteReadingProgress[];
  preferences: UserPreferences;
};

type SearchIndexItem = {
  noteId: string;
  courseId: string;
  lessonId: string;
  pageKey?: string;
  pageNumber?: number;
  pageTitle: string;
  courseTitle: string;
  courseCode: string;
  lessonTitle: string;
  noteTitle: string;
  plainText: string;
  haystack: string;
};

type SearchResult = SearchIndexItem & { excerpt: string; score: number };

type PageJump = {
  noteId: string;
  pageKey?: string;
};

type NavigationSnapshot = {
  selectedTerm: string;
  courseId: string;
  lessonId: string;
  activeLessonId: string | null;
  selectedNoteId: string;
  query: string;
  searchOpen: boolean;
  searchCourseId?: string;
  searchLessonId?: string;
  searchNoteId?: string;
  scrollTop: number;
};

type SourceType = "text" | "outline" | "image" | "file";
type Mode = "standard" | "exam" | "deep";
type AppView = "home" | "courses";
type AppTheme = UserPreferences["theme"];
type Ambience = UserPreferences["ambience"];
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
  const [appView, setAppView] = useState<AppView>("home");
  const [selectedTerm, setSelectedTerm] = useState(initialWorkspace.courses[0]?.term ?? "");
  const [courseId, setCourseId] = useState(initialWorkspace.courses[0]?.id ?? "");
  const [lessonId, setLessonId] = useState(initialWorkspace.lessons.find((lesson) => lesson.courseId === courseId)?.id ?? "");
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState(initialWorkspace.notes[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchCourseId, setSearchCourseId] = useState("");
  const [searchLessonId, setSearchLessonId] = useState("");
  const [searchNoteId, setSearchNoteId] = useState("");
  const [pendingJump, setPendingJump] = useState<PageJump | null>(null);
  const [starMessage, setStarMessage] = useState("");
  const [organizerCollapsed, setOrganizerCollapsed] = useState(false);
  const [guideWorkbenchOpen, setGuideWorkbenchOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [focusDarkMode, setFocusDarkMode] = useState(false);
  const [appHydrated, setAppHydrated] = useState(false);
  const [onboardingCompletedAt, setOnboardingCompletedAt] = useState(initialUser.onboardingCompletedAt ?? "");
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [tutorialPractice, setTutorialPractice] = useState(false);
  const [tutorialChapter, setTutorialChapter] = useState("");
  const practiceRef = useRef(false);
  const personalSnapshot = useRef<{ workspace: Workspace; view: AppView; nav: NavigationSnapshot; homeScroll: number; collapsed: boolean; dark: boolean; focus: boolean; history: unknown; url: string } | null>(null);
  const tutorialSearchSnapshot = useRef<NavigationSnapshot | null>(null);
  const tutorialHistoryGuard = useRef(false);
  const restoringPersonalHistory = useRef(false);
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const [themeMessage, setThemeMessage] = useState("");
  const [guideCoverRequested, setGuideCoverRequested] = useState(false);
  const themeSaveQueue = useRef(Promise.resolve());
  const themeSaveVersion = useRef(0);
  const savedThemePreferences = useRef(initialWorkspace.preferences);
  const [greeting, setGreeting] = useState("欢迎回来");
  const theme = workspace.preferences.theme ?? "mist-forest";
  const effectiveOrganizerCollapsed = theme === "galactic-guide" && !tutorialPractice ? !guideWorkbenchOpen : organizerCollapsed;
  useEffect(() => {
    if (theme !== "galactic-guide" || appView !== "home" || activeLessonId || tutorialPractice) setGuideCoverRequested(false);
  }, [theme, appView, activeLessonId, tutorialPractice]);
  const poeticFlow = usePoeticFlow(theme === "poetic-realm" && !focusMode, initialUser.id, !tutorialPractice);
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const homeScrollRef = useRef<HTMLDivElement>(null);
  const searchAreaRef = useRef<HTMLDivElement>(null);

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
  const selectedNote = visibleNotes.find((note) => note.id === selectedNoteId) ?? visibleNotes[0];
  const searchIndex = useMemo(
    () => buildSearchIndex(workspace.courses, workspace.lessons, workspace.notes),
    [workspace.courses, workspace.lessons, workspace.notes]
  );
  const searchResults = useMemo(() => searchNotes(searchIndex, query), [query, searchIndex]);
  const searchLessons = workspace.lessons.filter((lesson) => lesson.courseId === searchCourseId).sort((a, b) => a.order - b.order);
  const searchNotesInScope = workspace.notes.filter((note) => note.courseId === searchCourseId && (!searchLessonId || note.lessonId === searchLessonId));
  const visibleSearchResults = searchResults.filter((result) =>
    (!searchCourseId || result.courseId === searchCourseId) &&
    (!searchLessonId || result.lessonId === searchLessonId) &&
    (!searchNoteId || result.noteId === searchNoteId)
  );
  const searchingCurrentLesson = Boolean(activeLesson && searchCourseId === activeLesson.courseId && searchLessonId === activeLesson.id && !searchNoteId);

  function changeSearchCourse(id: string) {
    setSearchCourseId(id);
    setSearchLessonId("");
    setSearchNoteId("");
  }

  function toggleCurrentLessonSearch() {
    if (!activeLesson) return;
    setSearchCourseId(searchingCurrentLesson ? "" : activeLesson.courseId);
    setSearchLessonId(searchingCurrentLesson ? "" : activeLesson.id);
    setSearchNoteId("");
    setSearchOpen(true);
    searchAreaRef.current?.querySelector("input")?.focus();
  }

  useEffect(() => {
    setAppHydrated(true);
    try { setFocusDarkMode(window.localStorage.getItem(`study-note-focus-theme:${initialUser.id}`) === "dark"); } catch { /* Reading still works when browser storage is unavailable. */ }
    const hour = new Date().getHours();
    setGreeting(hour < 6 ? "夜深了" : hour < 11 ? "早上好" : hour < 14 ? "中午好" : hour < 18 ? "下午好" : "晚上好");
    if (!initialUser.onboardingCompletedAt) {
      setOnboardingOpen(true);
    }
  }, []);

  function toggleFocusDarkMode() {
    setFocusDarkMode((current) => {
      const next = !current;
      if (!practiceRef.current) window.localStorage.setItem(`study-note-focus-theme:${initialUser.id}`, next ? "dark" : "light");
      return next;
    });
  }

  useEffect(() => {
    function closeSearchOnOutsideClick(event: MouseEvent) {
      // The practice dock supports the current search; using it must not dismiss results.
      if (event.target instanceof Element && event.target.closest(".tutorial-layer")) return;
      if (searchAreaRef.current && !searchAreaRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", closeSearchOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeSearchOnOutsideClick);
  }, []);

  useEffect(() => {
    if (!focusMode) return;
    const exitFocusMode = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.querySelector(".tutorial-modal, dialog[open]")) { setFocusMode(false); tutorialEvent("focus-exit"); }
    };
    window.addEventListener("keydown", exitFocusMode);
    return () => window.removeEventListener("keydown", exitFocusMode);
  }, [focusMode]);

  useEffect(() => {
    function restoreNavigation(event: PopStateEvent) {
      if (restoringPersonalHistory.current) { restoringPersonalHistory.current = false; return; }
      const snapshot = event.state?.studyNoteSnapshot as NavigationSnapshot | undefined;
      if (!snapshot) return;
      if (snapshot.courseId.startsWith("tutorial-") && !practiceRef.current) return;
      setAppView("courses");
      setSelectedTerm(snapshot.selectedTerm);
      setCourseId(snapshot.courseId);
      setLessonId(snapshot.lessonId);
      setActiveLessonId(snapshot.activeLessonId);
      setSelectedNoteId(snapshot.selectedNoteId);
      setQuery(snapshot.query);
      setSearchOpen(snapshot.searchOpen);
      setSearchCourseId(snapshot.searchCourseId ?? "");
      setSearchLessonId(snapshot.searchLessonId ?? "");
      setSearchNoteId(snapshot.searchNoteId ?? "");
      setPendingJump(null);
      tutorialEvent("search-back");
      window.setTimeout(() => {
        if (contentScrollRef.current) contentScrollRef.current.scrollTop = snapshot.scrollTop;
      }, 0);
    }
    window.addEventListener("popstate", restoreNavigation);
    return () => window.removeEventListener("popstate", restoreNavigation);
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
    setFocusMode(false);
  }

  function openCourse(nextCourseId: string) {
    chooseCourse(nextCourseId);
    setAppView("courses");
  }

  function openNote(note: Note) {
    const nextCourse = workspace.courses.find((item) => item.id === note.courseId);
    if (nextCourse) setSelectedTerm(nextCourse.term);
    setCourseId(note.courseId);
    setLessonId(note.lessonId);
    setActiveLessonId(note.lessonId);
    setSelectedNoteId(note.id);
    setAppView("courses");
    setFocusMode(false);
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
    setFocusMode(false);
  }

  function enterLesson(lesson: Lesson) {
    setLessonId(lesson.id);
    setActiveLessonId(lesson.id);
    const firstNote = workspace.notes.find((note) => note.lessonId === lesson.id);
    setSelectedNoteId(firstNote?.id ?? "");
    setFocusMode(false);
    setAppView("courses");
  }

  function returnHome() {
    setFocusMode(false);
    setActiveLessonId(null);
    setSelectedNoteId("");
    setPendingJump(null);
    setSearchOpen(false);
    setQuery("");
    setAppView("home");
    requestAnimationFrame(() => { if (homeScrollRef.current) homeScrollRef.current.scrollTop = 0; });
  }

  async function saveTheme(theme: AppTheme, ambience: Ambience, enterHome = false) {
    const version = ++themeSaveVersion.current;
    const optimistic = { ...workspace.preferences, theme, ambience, updatedAt: new Date().toISOString() };
    setThemeMessage("");
    setWorkspace((current) => ({ ...current, preferences: optimistic }));
    if (enterHome) {
      returnHome();
      setThemePickerOpen(false);
      setGuideCoverRequested(theme === "galactic-guide" && !practiceRef.current);
    }
    if (practiceRef.current) return;
    const save = themeSaveQueue.current.then(async () => {
      try {
        const response = await fetch("/api/preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ theme, ambience })
        });
        if (!response.ok) throw new Error("THEME_SAVE_FAILED");
        const data = await response.json();
        savedThemePreferences.current = data.preferences;
        if (version === themeSaveVersion.current && !practiceRef.current) setWorkspace((current) => ({ ...current, preferences: data.preferences }));
      } catch {
        if (version === themeSaveVersion.current && !practiceRef.current) {
          setWorkspace((current) => ({ ...current, preferences: savedThemePreferences.current }));
          setThemeMessage("主题没有保存成功，请稍后重试。");
          setGuideCoverRequested(false);
          setThemePickerOpen(true);
        }
      }
    });
    themeSaveQueue.current = save;
    await save;
  }

  async function logout() {
    if (practiceRef.current) return;
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.reload();
  }

  function navigateToLocatedPage(target: SearchIndexItem | { noteId: string; pageKey: string }) {
    const targetNote = workspace.notes.find((note) => note.id === target.noteId);
    if (!targetNote) return;
    const targetCourse = workspace.courses.find((item) => item.id === targetNote.courseId);
    const snapshot: NavigationSnapshot = {
      selectedTerm,
      courseId: course?.id ?? courseId,
      lessonId,
      activeLessonId,
      selectedNoteId: selectedNote?.id ?? selectedNoteId,
      query,
      searchOpen,
      searchCourseId,
      searchLessonId,
      searchNoteId,
      scrollTop: contentScrollRef.current?.scrollTop ?? 0
    };
    const hash = target.pageKey ? pageAnchorId(targetNote.id, target.pageKey) : `note-${targetNote.id}`;
    if (practiceRef.current) {
      if (query.trim() && searchOpen) {
        tutorialSearchSnapshot.current = snapshot;
        if (!window.history.state?.tutorialGuard) { tutorialHistoryGuard.current = true; window.history.pushState({ tutorialGuard: true }, "", window.location.href); }
      }
    } else {
      window.history.replaceState({ ...window.history.state, studyNoteSnapshot: snapshot }, "");
      window.history.pushState({ studyNotePage: true }, "", `#${hash}`);
    }

    if (targetCourse) setSelectedTerm(targetCourse.term);
    setCourseId(targetNote.courseId);
    setLessonId(targetNote.lessonId);
    setActiveLessonId(targetNote.lessonId);
    setSelectedNoteId(targetNote.id);
    setSearchOpen(false);
    setPendingJump({ noteId: targetNote.id, pageKey: target.pageKey });
    setAppView("courses");
  }

  async function togglePageStar(noteId: string, page: { key: string; pageNumber: number }) {
    if (noteId.startsWith("tutorial-") && !practiceRef.current) return;
    const existing = workspace.noteStars.find((item) => item.noteId === noteId && item.pageKey === page.key);
    const optimisticStar: NoteStar = {
      userId: initialUser.id,
      noteId,
      pageKey: page.key,
      pageNumber: page.pageNumber,
      createdAt: new Date().toISOString()
    };
    setStarMessage("");
    setWorkspace((current) => ({
      ...current,
      noteStars: existing
        ? current.noteStars.filter((item) => !(item.noteId === noteId && item.pageKey === page.key))
        : [...current.noteStars, optimisticStar]
    }));

    if (practiceRef.current) return;
    try {
      const response = await fetch("/api/stars", {
        method: existing ? "DELETE" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId, pageKey: page.key, pageNumber: page.pageNumber })
      });
      if (!response.ok) throw new Error("STAR_SAVE_FAILED");
    } catch {
      setWorkspace((current) => ({
        ...current,
        noteStars: existing
          ? [...current.noteStars.filter((item) => !(item.noteId === noteId && item.pageKey === page.key)), existing]
          : current.noteStars.filter((item) => !(item.noteId === noteId && item.pageKey === page.key))
      }));
      setStarMessage("星标没有保存成功，请稍后重试。");
    }
  }

  async function savePageStarNote(noteId: string, page: { key: string; pageNumber: number }, note: string) {
    if (noteId.startsWith("tutorial-") && !practiceRef.current) return;
    const existing = workspace.noteStars.find((item) => item.noteId === noteId && item.pageKey === page.key);
    const optimisticStar: NoteStar = {
      userId: initialUser.id,
      noteId,
      pageKey: page.key,
      pageNumber: page.pageNumber,
      note: note.trim(),
      createdAt: existing?.createdAt ?? new Date().toISOString()
    };
    setStarMessage("");
    setWorkspace((current) => ({
      ...current,
      noteStars: [...current.noteStars.filter((item) => !(item.noteId === noteId && item.pageKey === page.key)), optimisticStar]
    }));

    if (practiceRef.current) return;
    try {
      const response = await fetch("/api/stars", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId, pageKey: page.key, pageNumber: page.pageNumber, note: note.trim() })
      });
      if (!response.ok) throw new Error("STAR_NOTE_SAVE_FAILED");
    } catch {
      setWorkspace((current) => ({
        ...current,
        noteStars: [
          ...current.noteStars.filter((item) => !(item.noteId === noteId && item.pageKey === page.key)),
          ...(existing ? [existing] : [])
        ]
      }));
      setStarMessage("页备注没有保存成功，请稍后重试。");
    }
  }

  function saveReadingProgress(noteId: string, page: { key: string; pageNumber: number }) {
    if (noteId.startsWith("tutorial-") !== practiceRef.current) return;
    const progress: NoteReadingProgress = {
      userId: initialUser.id,
      noteId,
      pageKey: page.key,
      pageNumber: page.pageNumber,
      updatedAt: new Date().toISOString()
    };
    setWorkspace((current) => ({
      ...current,
      readingProgress: [
        ...current.readingProgress.filter((item) => item.noteId !== noteId),
        progress
      ]
    }));
    if (practiceRef.current) return;
    void fetch("/api/reading-progress", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteId, pageKey: page.key, pageNumber: page.pageNumber }),
      keepalive: true
    });
  }

  function closeOnboarding() {
    setOnboardingOpen(false);
    if (!onboardingCompletedAt) {
      setOnboardingCompletedAt(new Date().toISOString());
      void fetch("/api/onboarding", { method: "POST", keepalive: true })
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

  function prepareTutorialChapter(chapterId: string) {
    const scene = tutorialChapters.find(c => c.id === chapterId)?.scene ?? "home";
    setTutorialChapter(`${chapterId}-${Date.now()}`);
    setFocusMode(false); setFocusDarkMode(false); setThemePickerOpen(false);
    setOrganizerCollapsed(theme === "galactic-guide" && scene !== "organizer"); setPendingJump(null); setQuery(""); setSearchOpen(false); changeSearchCourse("");
    tutorialSearchSnapshot.current = null;
    setSelectedTerm(chapterId === "space" ? "2026年春季 · 教学练习" : tutorialTerm);
    setCourseId(chapterId === "space" ? "tutorial-course-spring" : "tutorial-course");
    setLessonId("tutorial-lesson"); setSelectedNoteId("tutorial-note");
    setActiveLessonId(scene === "home" || scene === "organizer" ? null : "tutorial-lesson");
    setAppView(scene === "home" ? "home" : "courses");
    setWorkspace(current => ({ ...current, readingProgress: [], noteStars: scene === "stars" ? [{ userId: initialUser.id, noteId: "tutorial-note", pageKey: "page-2-1", pageNumber: 2, note: "教学示例：二刷时自己画一次知识地图", createdAt: new Date().toISOString() }] : [] }));
  }

  function startTutorial(chapterId: string) {
    personalSnapshot.current = { workspace, view: appView, nav: { selectedTerm, courseId, lessonId, activeLessonId, selectedNoteId, query, searchOpen, searchCourseId, searchLessonId, searchNoteId, scrollTop: contentScrollRef.current?.scrollTop ?? 0 }, homeScroll: homeScrollRef.current?.scrollTop ?? 0, collapsed: organizerCollapsed, dark: focusDarkMode, focus: focusMode, history: window.history.state, url: window.location.href };
    practiceRef.current = true; setTutorialPractice(true);
    setWorkspace(createTutorialWorkspace(initialUser.id, workspace.preferences));
    prepareTutorialChapter(chapterId);
  }

  function stopTutorial() {
    const previous = personalSnapshot.current;
    if (!previous) return;
    practiceRef.current = false; setTutorialPractice(false); personalSnapshot.current = null;
    setWorkspace(previous.workspace); setAppView(previous.view);
    setSelectedTerm(previous.nav.selectedTerm); setCourseId(previous.nav.courseId); setLessonId(previous.nav.lessonId);
    setActiveLessonId(previous.nav.activeLessonId); setSelectedNoteId(previous.nav.selectedNoteId);
    setQuery(previous.nav.query); setSearchOpen(previous.nav.searchOpen);
    setSearchCourseId(previous.nav.searchCourseId ?? ""); setSearchLessonId(previous.nav.searchLessonId ?? ""); setSearchNoteId(previous.nav.searchNoteId ?? "");
    setFocusMode(previous.focus); setFocusDarkMode(previous.dark); setOrganizerCollapsed(previous.collapsed);
    setPendingJump(null); setThemePickerOpen(false); setStarMessage("");
    if (tutorialHistoryGuard.current && window.history.state?.tutorialGuard) { restoringPersonalHistory.current = true; tutorialHistoryGuard.current = false; window.history.back(); }
    else window.history.replaceState(previous.history, "", previous.url);
    requestAnimationFrame(() => { if (contentScrollRef.current) contentScrollRef.current.scrollTop = previous.nav.scrollTop; if (homeScrollRef.current) homeScrollRef.current.scrollTop = previous.homeScroll; });
  }

  function tutorialSearchBack() {
    const snapshot = tutorialSearchSnapshot.current;
    if (!snapshot || !practiceRef.current) return;
    if (window.history.state?.tutorialGuard) { window.history.back(); return; }
    setSelectedTerm(snapshot.selectedTerm); setCourseId(snapshot.courseId); setLessonId(snapshot.lessonId);
    setActiveLessonId(snapshot.activeLessonId); setSelectedNoteId(snapshot.selectedNoteId);
    setQuery(snapshot.query); setSearchOpen(true); setPendingJump(null);
    setSearchCourseId(snapshot.searchCourseId ?? ""); setSearchLessonId(snapshot.searchLessonId ?? ""); setSearchNoteId(snapshot.searchNoteId ?? "");
    tutorialEvent("search-back");
  }

  useEffect(() => {
    if (!tutorialPractice) return;
    // The practice search uses a same-URL history guard, never demo IDs or private content.
    const back = (event: PopStateEvent) => {
      if (!practiceRef.current || !tutorialSearchSnapshot.current) return;
      tutorialHistoryGuard.current = false; event.stopImmediatePropagation(); tutorialSearchBack();
    };
    window.addEventListener("popstate", back, true);
    return () => window.removeEventListener("popstate", back, true);
  }, [tutorialPractice]);

  return (
    <main
      className={`app-shell${focusMode ? " focus-mode" : ""}${focusMode && focusDarkMode ? " focus-dark" : ""}`}
      data-primary={workspace.preferences.primaryColor}
      data-theme={workspace.preferences.theme ?? "mist-forest"}
      data-poem={poeticScenes[poeticFlow.index].id}
      data-poetic-motif={poeticScenes[poeticFlow.index].motif}
      data-poetry-transition={poeticFlow.transition}
      data-poetry-held={poeticFlow.held}
      data-reading={Boolean(activeLesson)}
      data-course-space={appView === "courses" && !activeLesson}
      data-world-home={theme !== "cognitive-lab" && appView === "home" && !activeLesson}
      data-night={theme === "midnight-atlas" || theme === "arcane-library" || theme === "galactic-guide"}
      data-ambience={workspace.preferences.ambience ?? "immersive"}
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
          <span>{theme === "galactic-guide" ? "THE GUIDE" : "StudyNote AI"}</span>
        </div>
        {theme === "galactic-guide" && <div className="guide-binding-label" aria-hidden="true"><strong>DON’T<br />PANIC.</strong><span>PERSONAL FIELD COPY<br />NO. 0042</span></div>}

        <nav className="nav-menu" aria-label="主导航">
          <button
            data-tutorial="home"
            className={`nav-item ${appView === "home" && !activeLesson ? "active" : ""}`}
            onClick={returnHome}
            type="button"
          >
            <Home size={18} />
            主页
          </button>
          <button
            data-tutorial="courses"
            className={`nav-item ${appView === "courses" ? "active" : ""}`}
            onClick={() => {
              setFocusMode(false);
              setActiveLessonId(null);
              setSelectedNoteId("");
              setAppView("courses");
            }}
            type="button"
          >
            <Library size={18} />
            课程
          </button>
          <button
            data-tutorial="organizer"
            className="nav-item"
            onClick={() => {
              setAppView("courses");
              setActiveLessonId(null);
              setOrganizerCollapsed(false);
              if (!practiceRef.current) setGuideWorkbenchOpen(true);
            }}
            type="button"
          >
            <Brain size={18} />
            AI 整理
          </button>
          <button className="nav-item" type="button">
            <Network size={18} />
            复习资产
          </button>
          <button
            data-tutorial="tutorial"
            className="nav-item"
            onClick={() => {
              setThemePickerOpen(false);
              setOnboardingOpen(true);
            }}
            type="button"
          >
            <HelpCircle size={18} />
            新手指导
          </button>
        </nav>

        {activeLesson && selectedNote ? (
          <div className="sidebar-reading-tools">
            <button className="sidebar-focus-button" onClick={() => setFocusMode(true)} type="button">
              <span className="sidebar-focus-icon" aria-hidden="true">
                <Maximize2 size={18} />
              </span>
              <span>
                <strong>专注阅读</strong>
                <small>沉浸查看当前笔记</small>
              </span>
            </button>
          </div>
        ) : null}

        <div className="sidebar-footer">
          <button aria-label="空间主题" title="空间主题" className="theme-entry-button" onClick={() => setThemePickerOpen(true)} type="button">
            <span className="theme-entry-icon"><Palette size={17} /></span>
            <span>
              <strong>空间主题</strong>
              <small>{themeName(workspace.preferences.theme ?? "mist-forest")}</small>
            </span>
            <ChevronRight size={16} />
          </button>
          <div className="user-card">
            <strong>{initialUser.name}</strong>
            <span>{initialUser.email}</span>
          </div>
          <button data-tutorial="logout" className="ghost-button" disabled={!appHydrated || tutorialPractice} onClick={logout} type="button">
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
            <select value={course?.id ?? ""} onChange={(event) => openCourse(event.target.value)} aria-label="选择课程">
              {termCourses.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </div>
          <div className="search-area" ref={searchAreaRef}>
            <div className={`search-box${searchOpen && query.trim() ? " active" : ""}`}>
              <Search size={18} />
              <input
                aria-label="搜索全部笔记"
                autoComplete="off"
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setSearchOpen(false);
                  if (event.key === "Enter" && visibleSearchResults[0]) navigateToLocatedPage(visibleSearchResults[0]);
                }}
                placeholder="搜索笔记、公式或知识点"
                value={query}
              />
              {activeLesson ? (
                <button
                  aria-pressed={searchingCurrentLesson}
                  className="search-current-lesson"
                  onClick={toggleCurrentLessonSearch}
                  title={`搜索本章全部笔记：${activeLesson.title}`}
                  type="button"
                >
                  在本章内搜索
                </button>
              ) : null}
              {query ? (
                <button
                  aria-label="清除搜索"
                  className="search-clear"
                  onClick={() => {
                    setQuery("");
                    setSearchOpen(false);
                    changeSearchCourse("");
                  }}
                  type="button"
                >
                  <X size={16} />
                </button>
              ) : null}
            </div>
            {searchOpen && query.trim() ? (
              <SearchResultsPanel
                courseFilter={searchCourseId}
                courses={workspace.courses}
                lessonFilter={searchLessonId}
                lessons={searchLessons}
                noteFilter={searchNoteId}
                notes={searchNotesInScope}
                onCourseFilter={changeSearchCourse}
                onLessonFilter={(id) => { setSearchLessonId(id); setSearchNoteId(""); }}
                onNoteFilter={setSearchNoteId}
                onOpenResult={navigateToLocatedPage}
                query={query}
                results={visibleSearchResults}
              />
            ) : null}
          </div>
        </header>

        {appView === "home" && !activeLesson ? (
          <div className="home-scroll content-scroll" data-scroll-region="home" ref={homeScrollRef}>
            <DashboardHome
              theme={theme}
              guideCoverRequested={guideCoverRequested}
              onGuideOpened={() => setGuideCoverRequested(false)}
              poeticFlow={poeticFlow}
              searchCourseIds={query.trim() ? [...new Set(searchResults.map(result => result.courseId))] : undefined}
              courses={workspace.courses}
              greeting={greeting}
              lessons={workspace.lessons}
              name={initialUser.name}
              notes={workspace.notes}
              noteStars={workspace.noteStars}
              readingProgress={workspace.readingProgress}
              selectedTerm={selectedTerm}
              terms={terms}
              onContinue={(note, pageKey) => pageKey ? navigateToLocatedPage({ noteId: note.id, pageKey }) : openNote(note)}
              onOpenCourse={openCourse}
              onOpenNote={openNote}
              onTermChange={chooseTerm}
            />
          </div>
        ) : (
        <div className={`workspace ${effectiveOrganizerCollapsed ? "organizer-collapsed" : ""}`}>
          <div className="content-scroll" data-scroll-region="notes" ref={contentScrollRef}>
            {activeLesson ? (
              <LessonDetail
                guide={theme === "galactic-guide"}
                key={tutorialPractice ? tutorialChapter : "personal"}
                practice={tutorialPractice}
                course={course}
                lesson={activeLesson}
                notes={visibleNotes}
                selectedNote={selectedNote}
                noteStars={workspace.noteStars}
                readingProgress={workspace.readingProgress.find((progress) => progress.noteId === selectedNote?.id)}
                pendingJump={pendingJump}
                starMessage={starMessage}
                focusMode={focusMode}
                focusDarkMode={focusDarkMode}
                onBack={() => {
                  setFocusMode(false);
                  setActiveLessonId(null);
                  setSelectedNoteId("");
                }}
                onToggleFocusMode={() => { setFocusMode(!focusMode); if (focusMode) tutorialEvent("focus-exit"); }}
                onToggleFocusDarkMode={toggleFocusDarkMode}
                onReadingProgress={saveReadingProgress}
                onSelectNote={setSelectedNoteId}
                onNavigateToPage={navigateToLocatedPage}
                onSavePageStarNote={savePageStarNote}
                onTogglePageStar={togglePageStar}
                onJumpHandled={() => setPendingJump(null)}
                onWorkspaceUpdated={setWorkspace}
              />
            ) : (
              <CourseSpace
                theme={theme}
                poemIndex={poeticFlow.index}
                onNextPoem={poeticFlow.next}
                course={course}
                lessons={lessons}
                notes={workspace.notes}
                readingProgress={workspace.readingProgress}
                activeLessonId={lessonId}
                lessonLayout={workspace.preferences.lessonLayout}
                onEnterLesson={enterLesson}
              />
            )}
          </div>

          {course ? (
            <OrganizerPanel
              key={tutorialPractice ? `tutorial-${tutorialChapter}` : "personal-organizer"}
              practice={tutorialPractice}
              course={course}
              lessons={lessons}
              currentLessonId={activeLesson?.id ?? lessonId}
              currentNoteId={selectedNote?.id ?? ""}
              collapsed={effectiveOrganizerCollapsed}
              onToggleCollapsed={() => theme === "galactic-guide" && !tutorialPractice ? setGuideWorkbenchOpen(value => !value) : setOrganizerCollapsed(value => !value)}
              onCommandApplied={(payload) => {
                setAppView("courses");
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
                setAppView("courses");
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
        )}
      </section>

      {themePickerOpen ? (
        <ThemePicker
          ambience={workspace.preferences.ambience ?? "immersive"}
          message={themeMessage}
          selectedTheme={workspace.preferences.theme ?? "mist-forest"}
          onApply={(theme, ambience, enterHome) => void saveTheme(theme, ambience, enterHome)}
          onClose={() => setThemePickerOpen(false)}
        />
      ) : null}

      {onboardingOpen ? (
        <InteractiveTutorial
          userId={initialUser.id}
          firstUse={!onboardingCompletedAt}
          theme={theme}
          onStart={startTutorial}
          onPrepare={prepareTutorialChapter}
          onStop={stopTutorial}
          onSearchBack={tutorialSearchBack}
          onClose={closeOnboarding}
        />
      ) : null}
    </main>
  );
}

function themeName(theme: AppTheme) {
  return themeOptions.find((item) => item.id === theme)?.name ?? "苔庭晨雾";
}

function ThemePicker({
  ambience,
  message,
  onApply,
  onClose,
  selectedTheme
}: {
  ambience: Ambience;
  message: string;
  onApply: (theme: AppTheme, ambience: Ambience, enterHome?: boolean) => void;
  onClose: () => void;
  selectedTheme: AppTheme;
}) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);

  return (
    <div className="theme-picker-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section aria-label="空间主题" aria-modal="true" className="theme-picker" role="dialog">
        <header className="theme-picker-heading">
          <div>
            <span className="theme-picker-kicker"><Palette size={15} /> 学习空间</span>
            <h2>选择一种进入知识的方式</h2>
            <p>选择主题，即刻进入它的主页；灯下书房、林间晨光、流动诗境，随心停留。</p>
          </div>
          <button aria-label="关闭主题选择" className="theme-picker-close" onClick={onClose} type="button"><X size={20} /></button>
        </header>

        <div className="theme-gallery">
          {themeOptions.map((theme) => (
            <button
              aria-pressed={selectedTheme === theme.id}
              className={`theme-card theme-card-${theme.id}${selectedTheme === theme.id ? " selected" : ""}`}
              key={theme.id}
              onClick={() => onApply(theme.id, ambience, true)}
              type="button"
            >
              <span className="theme-card-scene" aria-hidden="true">
                <ThemeLandscape theme={theme.id} preview />
              </span>
              <span className="theme-card-copy">
                <span className="theme-card-title">
                  <strong>{theme.name}</strong>
                  {selectedTheme === theme.id ? <span className="theme-selected-mark"><Check size={13} /></span> : null}
                </span>
                <small>{theme.eyebrow}</small>
                <span>{theme.description}</span>
                <em>{theme.detail}</em>
              </span>
            </button>
          ))}
        </div>

        <footer className="theme-picker-footer">
          <div>
            <strong>氛围强度</strong>
            <span>控制环境纹理和光影，不改变正文清晰度。</span>
          </div>
          <div className="ambience-switch" aria-label="选择氛围强度" role="group">
            {(["minimal", "standard", "immersive"] as const).map((value) => (
              <button
                aria-pressed={ambience === value}
                className={ambience === value ? "active" : ""}
                key={value}
                onClick={() => onApply(selectedTheme, value)}
                type="button"
              >
                {value === "minimal" ? "极简" : value === "standard" ? "标准" : "沉浸"}
              </button>
            ))}
          </div>
          {message ? <span className="theme-save-error" role="status">{message}</span> : null}
        </footer>
      </section>
    </div>
  );
}

function DashboardHome({
  theme,
  guideCoverRequested,
  onGuideOpened,
  poeticFlow,
  searchCourseIds,
  courses,
  greeting,
  lessons,
  name,
  notes,
  noteStars,
  onContinue,
  onOpenCourse,
  onOpenNote,
  onTermChange,
  readingProgress,
  selectedTerm,
  terms
}: {
  theme: AppTheme;
  guideCoverRequested: boolean;
  onGuideOpened: () => void;
  poeticFlow: ReturnType<typeof usePoeticFlow>;
  searchCourseIds?: string[];
  courses: Course[];
  greeting: string;
  lessons: Lesson[];
  name: string;
  notes: Note[];
  noteStars: NoteStar[];
  onContinue: (note: Note, pageKey?: string) => void;
  onOpenCourse: (courseId: string) => void;
  onOpenNote: (note: Note) => void;
  onTermChange: (term: string) => void;
  readingProgress: NoteReadingProgress[];
  selectedTerm: string;
  terms: string[];
}) {
  if (theme === "galactic-guide") {
    return <GalacticHome showCover={guideCoverRequested} onCoverOpened={onGuideOpened} searchCourseIds={searchCourseIds} courses={courses} greeting={greeting} lessons={lessons} name={name} notes={notes} noteStars={noteStars} onContinue={onContinue} onOpenCourse={onOpenCourse} onOpenNote={onOpenNote} onTermChange={onTermChange} readingProgress={readingProgress} selectedTerm={selectedTerm} terms={terms} />;
  }
  if (theme === "poetic-realm" || theme === "arcane-library") {
    return <ImmersiveHome theme={theme} poeticFlow={poeticFlow} searchCourseIds={searchCourseIds} courses={courses} greeting={greeting} lessons={lessons} name={name} notes={notes} noteStars={noteStars} onContinue={onContinue} onOpenCourse={onOpenCourse} onOpenNote={onOpenNote} onTermChange={onTermChange} readingProgress={readingProgress} selectedTerm={selectedTerm} terms={terms} />;
  }
  if (theme === "warm-study" || theme === "mist-forest" || theme === "midnight-atlas") {
    return <AtmosphericHome theme={theme} poeticFlow={poeticFlow} searchCourseIds={searchCourseIds} courses={courses} greeting={greeting} lessons={lessons} name={name} notes={notes} noteStars={noteStars} onContinue={onContinue} onOpenCourse={onOpenCourse} onOpenNote={onOpenNote} onTermChange={onTermChange} readingProgress={readingProgress} selectedTerm={selectedTerm} terms={terms} />;
  }
  const visibleCourses = courses.filter((course) => !selectedTerm || course.term === selectedTerm);
  const latestProgress = [...readingProgress].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const progressNote = latestProgress ? notes.find((note) => note.id === latestProgress.noteId) : undefined;
  const recentNotes = [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 4);
  const fallbackNote = recentNotes[0];
  const continueNote = progressNote ?? fallbackNote;
  const continuePage = progressNote && latestProgress
    ? extractNotePages(progressNote.contentMarkdown).find((page) => page.key === latestProgress.pageKey)
    : undefined;
  const recentStars = [...noteStars].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4);
  const readNoteIds = new Set(readingProgress.map((item) => item.noteId));
  const currentTermNotes = notes.filter((note) => visibleCourses.some((course) => course.id === note.courseId));

  return (
    <div className="home-dashboard">
      <section className="home-hero">
        <div className="home-hero-copy">
          <span className="home-eyebrow"><span className="home-live-dot" /> 你的学习空间已经准备好</span>
          <h1>{greeting}，{name}</h1>
          <p>从最近停下的地方继续，或选择一门课程进入今天的学习。</p>
          <div className="home-stats" aria-label="学习空间概览">
            <span><strong>{visibleCourses.length}</strong><small>本学期课程</small></span>
            <span><strong>{currentTermNotes.length}</strong><small>整理笔记</small></span>
            <span><strong>{noteStars.length}</strong><small>加星重点</small></span>
          </div>
        </div>
        <div className="home-hero-art" aria-hidden="true">
          <ThemeLandscape theme={theme} poemIndex={poeticFlow.index} />
        </div>
      </section>

      <section className="home-section home-continue-section">
        <div className="home-section-heading">
          <div>
            <span>CONTINUE</span>
            <h2>继续上次阅读</h2>
          </div>
          {continueNote ? <small>阅读位置已自动记录</small> : null}
        </div>
        {continueNote ? (
          <button className="home-continue-card" onClick={() => onContinue(continueNote, latestProgress?.pageKey)} type="button">
            <span className="home-continue-icon"><BookMarked size={25} /></span>
            <span className="home-continue-copy">
              <small>{courses.find((course) => course.id === continueNote.courseId)?.code ?? "最近笔记"}</small>
              <strong>{continueNote.title}</strong>
              <span>{continuePage ? `上次看到第 ${continuePage.pageNumber} 页 · ${continuePage.title}` : continueNote.summary}</span>
            </span>
            <span className="home-continue-action">继续阅读 <ArrowRight size={18} /></span>
          </button>
        ) : (
          <div className="home-empty-card">
            <BookOpen size={24} />
            <span><strong>还没有最近阅读记录</strong><small>从下面选择课程，第一段学习旅程就会出现在这里。</small></span>
          </div>
        )}
      </section>

      <section className="home-section">
        <div className="home-section-heading home-course-heading">
          <div>
            <span>COURSES</span>
            <h2>我的课程</h2>
          </div>
          <label className="home-term-picker">
            <CalendarDays size={15} />
            <select aria-label="主页选择学期" onChange={(event) => onTermChange(event.target.value)} value={selectedTerm}>
              {terms.map((term) => <option key={term} value={term}>{term}</option>)}
            </select>
          </label>
        </div>
        <div className="home-course-grid">
          {visibleCourses.map((course, index) => {
            const courseLessons = lessons.filter((lesson) => lesson.courseId === course.id);
            const courseNotes = notes.filter((note) => note.courseId === course.id);
            const readCount = courseNotes.filter((note) => readNoteIds.has(note.id)).length;
            const completion = courseNotes.length ? Math.round((readCount / courseNotes.length) * 100) : 0;
            return (
              <button className={`home-course-card accent-${course.accent}`} key={course.id} onClick={() => onOpenCourse(course.id)} type="button">
                <span className="home-course-number">{String(index + 1).padStart(2, "0")}</span>
                <span className="home-course-code">{course.code}</span>
                <h3>{course.title}</h3>
                <p>{course.description}</p>
                <span className="home-course-meta">
                  <span>{courseLessons.length} 个章节</span>
                  <span>{courseNotes.length} 篇笔记</span>
                </span>
                <span className="home-course-progress"><i style={{ width: `${completion}%` }} /></span>
                <span className="home-course-footer"><small>{completion ? `已开始 ${completion}%` : "等待开始"}</small><span>进入课程 <ChevronRight size={16} /></span></span>
              </button>
            );
          })}
        </div>
      </section>

      {(recentNotes.length || recentStars.length) ? (
        <section className="home-lower-grid">
          <div className="home-list-panel" data-tutorial="home-notes">
            <div className="home-section-heading compact"><div><span>RECENT</span><h2>最近笔记</h2></div></div>
            <div className="home-note-list">
              {recentNotes.map((note) => {
                const noteCourse = courses.find((course) => course.id === note.courseId);
                const noteLesson = lessons.find((lesson) => lesson.id === note.lessonId);
                return (
                  <button data-tutorial="home-note-item" key={note.id} onClick={() => onOpenNote(note)} type="button">
                    <span className="home-list-icon"><FileText size={17} /></span>
                    <span><strong>{note.title}</strong><small>{noteCourse?.code} · {noteLesson?.title}</small></span>
                    <ChevronRight size={16} />
                  </button>
                );
              })}
            </div>
          </div>
          <div className="home-list-panel" data-tutorial="home-stars">
            <div className="home-section-heading compact"><div><span>STARRED</span><h2>最近加星</h2></div></div>
            <div className="home-note-list">
              {recentStars.length ? recentStars.map((star) => {
                const note = notes.find((item) => item.id === star.noteId);
                if (!note) return null;
                const page = extractNotePages(note.contentMarkdown).find((item) => item.key === star.pageKey);
                return (
                  <button key={`${star.noteId}-${star.pageKey}`} onClick={() => onContinue(note, star.pageKey)} type="button">
                    <span className="home-list-icon star"><Star size={17} fill="currentColor" /></span>
                    <span><strong>第{star.pageNumber}页 · {page?.title ?? note.title}</strong><small>{star.note || note.title}</small></span>
                    <ChevronRight size={16} />
                  </button>
                );
              }) : <div className="home-list-empty">阅读时给重点页面加星，它们会集中显示在这里。</div>}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function SearchResultsPanel({
  courseFilter,
  courses,
  lessonFilter,
  lessons,
  noteFilter,
  notes,
  onCourseFilter,
  onLessonFilter,
  onNoteFilter,
  onOpenResult,
  query,
  results
}: {
  courseFilter: string;
  courses: Course[];
  lessonFilter: string;
  lessons: Lesson[];
  noteFilter: string;
  notes: Note[];
  onCourseFilter: (courseId: string) => void;
  onLessonFilter: (lessonId: string) => void;
  onNoteFilter: (noteId: string) => void;
  onOpenResult: (result: SearchResult) => void;
  query: string;
  results: SearchResult[];
}) {
  const shownResults = results.slice(0, 80);
  return (
    <section aria-label="笔记搜索结果" className="search-results-panel">
      <div className="search-results-header">
        <div className="search-results-summary">
          <span className="search-results-kicker">全文搜索</span>
          <strong aria-live="polite">{results.length} 条结果</strong>
        </div>
        <div className="search-filters">
          <label>
            <span>课程</span>
            <select aria-label="筛选课程" onChange={(event) => onCourseFilter(event.target.value)} value={courseFilter}>
              <option value="">全部课程</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>{course.code} · {course.title}</option>
              ))}
            </select>
          </label>
          <label>
            <span>章节</span>
            <select aria-label="筛选章节" disabled={!courseFilter} onChange={(event) => onLessonFilter(event.target.value)} value={lessonFilter}>
              <option value="">{courseFilter ? "全部章节" : "请先选择课程"}</option>
              {lessons.map((lesson) => (
                <option key={lesson.id} value={lesson.id}>{lesson.title}</option>
              ))}
            </select>
          </label>
          <label>
            <span>笔记</span>
            <select aria-label="筛选笔记" disabled={!courseFilter} onChange={(event) => onNoteFilter(event.target.value)} value={noteFilter}>
              <option value="">{courseFilter ? "全部笔记" : "请先选择课程"}</option>
              {notes.map((note) => (
                <option key={note.id} value={note.id}>{!lessonFilter ? `${lessons.find((lesson) => lesson.id === note.lessonId)?.title ?? "未分章"} · ` : ""}{note.title}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="search-results-list">
        {shownResults.length ? shownResults.map((result) => (
          <button className="search-result-card" key={`${result.noteId}-${result.pageKey ?? "note"}`} onClick={() => onOpenResult(result)} type="button">
            <div className="search-result-title">
              <span>{result.pageNumber ? `第${result.pageNumber}页` : "整篇笔记"}</span>
              <strong>{result.pageTitle}</strong>
              <ChevronRight size={17} />
            </div>
            <p><HighlightedText query={query} text={result.excerpt} /></p>
            <div className="search-result-path">
              <span className="search-course-code">{result.courseCode}</span>
              <span>{result.courseTitle}</span>
              <ChevronRight size={13} />
              <span>{result.lessonTitle}</span>
              <ChevronRight size={13} />
              <span>{result.noteTitle}</span>
            </div>
          </button>
        )) : (
          <div className="search-empty">
            <Search size={24} />
            <strong>没有找到相关内容</strong>
            <span>换一个关键词，或放宽课程、章节和笔记筛选后再试。</span>
          </div>
        )}
      </div>
      {results.length > shownResults.length ? (
        <div className="search-results-limit">结果较多，当前显示相关度最高的前 {shownResults.length} 项。</div>
      ) : null}
    </section>
  );
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  const tokens = Array.from(new Set(query.trim().split(/\s+/).filter(Boolean))).sort((a, b) => b.length - a.length);
  if (!tokens.length) return <>{text}</>;
  const pattern = new RegExp(`(${tokens.map(escapeRegExp).join("|")})`, "giu");
  const tokenSet = new Set(tokens.map((token) => token.toLocaleLowerCase()));
  return <>{text.split(pattern).map((part, index) => tokenSet.has(part.toLocaleLowerCase()) ? <mark key={`${part}-${index}`}>{part}</mark> : part)}</>;
}

function LessonDetail({
  guide = false,
  practice = false,
  course,
  lesson,
  notes,
  selectedNote,
  noteStars,
  readingProgress,
  pendingJump,
  starMessage,
  focusMode,
  focusDarkMode,
  onBack,
  onToggleFocusMode,
  onToggleFocusDarkMode,
  onReadingProgress,
  onSelectNote,
  onNavigateToPage,
  onSavePageStarNote,
  onTogglePageStar,
  onJumpHandled,
  onWorkspaceUpdated
}: {
  guide?: boolean;
  practice?: boolean;
  course?: Course;
  lesson: Lesson;
  notes: Note[];
  selectedNote?: Note;
  noteStars: NoteStar[];
  readingProgress?: NoteReadingProgress;
  pendingJump: PageJump | null;
  starMessage: string;
  focusMode: boolean;
  focusDarkMode: boolean;
  onBack: () => void;
  onToggleFocusMode: () => void;
  onToggleFocusDarkMode: () => void;
  onReadingProgress: (noteId: string, page: { key: string; pageNumber: number }) => void;
  onSelectNote: (id: string) => void;
  onNavigateToPage: (target: SearchIndexItem | { noteId: string; pageKey: string }) => void;
  onSavePageStarNote: (noteId: string, page: { key: string; pageNumber: number }, note: string) => void | Promise<void>;
  onTogglePageStar: (noteId: string, page: { key: string; pageNumber: number }) => void | Promise<void>;
  onJumpHandled: () => void;
  onWorkspaceUpdated: (workspace: Workspace) => void;
}) {
  const pages = useMemo(
    () => (selectedNote ? extractNotePages(selectedNote.contentMarkdown) : []),
    [selectedNote]
  );
  const sourceImagesByPage = useMemo(
    () => (practice ? new Map([1, 2, 3].map(n => [n, { src: tutorialImage, alt: `原创教学示例，第${n}页；非教师原课件` }])) : selectedNote ? extractPageSourceImages(selectedNote.contentMarkdown) : new Map()),
    [selectedNote, practice]
  );
  const selectedNoteStars = selectedNote ? noteStars.filter((star) => star.noteId === selectedNote.id) : [];
  const starredPageKeys = useMemo(
    () => new Set(selectedNoteStars.map((star) => star.pageKey)),
    [selectedNoteStars]
  );
  const pageNotesByKey = useMemo(
    () => new Map(selectedNoteStars.map((star) => [star.pageKey, star.note ?? ""])),
    [selectedNoteStars]
  );
  const [targetPageKey, setTargetPageKey] = useState<string>();
  const [autoOpenNoteKey, setAutoOpenNoteKey] = useState<string>();
  const [showQuickBack, setShowQuickBack] = useState(false);
  const [currentReadingPage, setCurrentReadingPage] = useState<NotePageSection>();
  const onReadingProgressRef = useRef(onReadingProgress);
  const resumePage = readingProgress
    ? pages.find((page) => page.key === readingProgress.pageKey && page.pageNumber === readingProgress.pageNumber)
    : undefined;

  useEffect(() => {
    onReadingProgressRef.current = onReadingProgress;
  }, [onReadingProgress]);

  useEffect(() => {
    const scrollRegion = document.querySelector<HTMLElement>('[data-scroll-region="notes"]');
    if (!scrollRegion || !selectedNote || !pages.length) {
      setCurrentReadingPage(undefined);
      return;
    }

    let animationFrame = 0;
    let saveTimer = 0;
    let currentPageKey = "";
    let savedPageKey = "";
    let pendingPage: NotePageSection | undefined;

    const persistPendingPage = () => {
      if (!pendingPage || pendingPage.key === savedPageKey) return;
      savedPageKey = pendingPage.key;
      onReadingProgressRef.current(selectedNote.id, pendingPage);
    };

    const detectCurrentPage = () => {
      const readingLine = scrollRegion.getBoundingClientRect().top + Math.min(220, scrollRegion.clientHeight * 0.28);
      let activePage: NotePageSection | undefined;

      for (const page of pages) {
        const heading = document.getElementById(pageAnchorId(selectedNote.id, page.key));
        if (!heading) continue;
        if (heading.getBoundingClientRect().top <= readingLine) activePage = page;
        else break;
      }

      return activePage;
    };

    const updateCurrentPage = () => {
      animationFrame = 0;
      const activePage = detectCurrentPage();

      if (!activePage || activePage.key === currentPageKey) return;
      currentPageKey = activePage.key;
      pendingPage = activePage;
      setCurrentReadingPage(activePage);
      window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(persistPendingPage, 650);
    };

    const captureAndPersistCurrentPage = () => {
      const activePage = detectCurrentPage();
      if (activePage) pendingPage = activePage;
      persistPendingPage();
    };

    const scheduleUpdate = () => {
      if (!animationFrame) animationFrame = window.requestAnimationFrame(updateCurrentPage);
    };

    scheduleUpdate();
    scrollRegion.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("pagehide", captureAndPersistCurrentPage);
    return () => {
      scrollRegion.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("pagehide", captureAndPersistCurrentPage);
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(saveTimer);
      captureAndPersistCurrentPage();
    };
  }, [pages, selectedNote]);

  useEffect(() => {
    const scrollRegion = document.querySelector<HTMLElement>('[data-scroll-region="notes"]');
    if (!scrollRegion) return;

    let lastScrollTop = scrollRegion.scrollTop;
    let lastScrollAt = performance.now();
    let upwardWindowStartedAt = lastScrollAt;
    let upwardDistance = 0;

    const resetUpwardWindow = (now: number) => {
      upwardWindowStartedAt = now;
      upwardDistance = 0;
    };

    const handleScroll = () => {
      const now = performance.now();
      const scrollTop = scrollRegion.scrollTop;
      const delta = scrollTop - lastScrollTop;
      const elapsed = Math.max(now - lastScrollAt, 8);

      if (scrollTop < 160) {
        setShowQuickBack(false);
        resetUpwardWindow(now);
      } else if (delta > 2) {
        setShowQuickBack(false);
        resetUpwardWindow(now);
      } else if (delta < -2) {
        if (now - upwardWindowStartedAt > 180) resetUpwardWindow(now);
        upwardDistance += Math.abs(delta);

        const upwardSpeed = Math.abs(delta) / elapsed;
        const isFastGesture = upwardSpeed >= 0.68 && Math.abs(delta) >= 12;
        const isQuickSequence = upwardDistance >= 56 && now - upwardWindowStartedAt <= 180;

        if (isFastGesture || isQuickSequence) setShowQuickBack(true);
      }

      lastScrollTop = scrollTop;
      lastScrollAt = now;
    };

    scrollRegion.addEventListener("scroll", handleScroll, { passive: true });
    return () => scrollRegion.removeEventListener("scroll", handleScroll);
  }, [lesson.id]);

  useEffect(() => {
    if (!selectedNote || pendingJump?.noteId !== selectedNote.id) return;
    const timer = window.setTimeout(() => {
      if (pendingJump.pageKey) {
        const element = document.getElementById(pageAnchorId(selectedNote.id, pendingJump.pageKey));
        element?.scrollIntoView({ behavior: "smooth", block: "start" });
        element?.focus({ preventScroll: true });
        setTargetPageKey(pendingJump.pageKey);
        window.setTimeout(() => setTargetPageKey(undefined), 1800);
      } else {
        document.getElementById(`note-${selectedNote.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      onJumpHandled();
    }, 80);
    return () => window.clearTimeout(timer);
  }, [onJumpHandled, pendingJump, selectedNote]);

  return (
    <div className={guide ? "guide-reader-spread" : "lesson-document"}>
      {focusMode ? (
        <div className="focus-reader-toolbar" role="toolbar" aria-label="专注阅读工具栏" tabIndex={0} onMouseEnter={() => tutorialEvent("focus-tools")} onFocus={() => tutorialEvent("focus-tools")}>
          <span className="focus-reader-status">
            <span className="focus-reader-dot" aria-hidden="true" />
            <span>
              <strong>专注阅读</strong>
              <small>{currentReadingPage ? `正在阅读第 ${currentReadingPage.pageNumber} 页` : selectedNote?.title}</small>
            </span>
          </span>
          <span className="focus-reader-toolbar-actions">
            <button
              aria-label={focusDarkMode ? "切换为浅色阅读" : "切换为深色阅读"}
              className="focus-theme-toggle"
              onClick={onToggleFocusDarkMode}
              type="button"
            >
              {focusDarkMode ? <Sun size={17} /> : <Moon size={17} />}
              {focusDarkMode ? "浅色" : "深色"}
            </button>
            <button className="focus-reader-back" onClick={onBack} type="button">
              <ChevronLeft size={17} />
              返回章节
            </button>
            <button aria-label="退出专注阅读" onClick={onToggleFocusMode} type="button">
              <Minimize2 size={17} />
              退出专注
              <kbd>Esc</kbd>
            </button>
          </span>
        </div>
      ) : null}

      <div className={`quick-back-slot ${showQuickBack ? "visible" : ""}`}>
        <button
          className="quick-back-button"
          onClick={onBack}
          type="button"
          aria-label="快速返回课程章节"
          tabIndex={showQuickBack ? 0 : -1}
        >
          <span className="quick-back-icon" aria-hidden="true">
            <ChevronLeft size={18} />
          </span>
          返回课程章节
        </button>
      </div>

      <button className="back-button" onClick={onBack} type="button">
        <ChevronLeft size={18} />
        返回课程章节
      </button>

      <div className="lesson-document-index">
      {guide && <header className="guide-entry-imprint"><span>THE GUIDE / FIELD NOTES</span><strong>{course?.code || "FIELD COPY"}</strong><small>分册 {String(lesson.order).padStart(2, "0")} · 个人学习条目</small></header>}
      <section className={`lesson-detail-hero ${lesson.accent}`}>
        <div>
          <span className="lesson-detail-kicker">{lessonLabel(lesson)}</span>
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

      {guide && <nav className="guide-leaf-directory" aria-label="本篇逐页目录"><header><span>本篇页码</span><small>{pages.length} PAGES</small></header>{pages.length ? pages.map(page => <button key={page.key} type="button" aria-current={currentReadingPage?.key === page.key ? "location" : undefined} onClick={() => selectedNote && onNavigateToPage({ noteId: selectedNote.id, pageKey: page.key })}><span>{String(page.pageNumber).padStart(2, "0")}</span><span>{page.title}</span>{starredPageKeys.has(page.key) && <Star size={11} fill="currentColor" />}</button>) : <p>整理完成后，逐页目录会出现在这里。</p>}</nav>}
      {guide && <footer className="guide-entry-colophon"><span>DON’T PANIC.</span><small>条目仍在增补。<br />请以原课件为准。</small></footer>}
      </div>
      <div className="lesson-document-paper" key={guide ? selectedNote?.id ?? lesson.id : "paper"}>
      {guide && <><div className="guide-turn-leaf" aria-hidden="true" /><header className="guide-running-head"><span>{course?.code} / {lessonLabel(lesson)}</span><span>{currentReadingPage ? `正在阅读 · 第 ${currentReadingPage.pageNumber} 页` : "随身本 / 正文"}</span></header></>}
      {selectedNote ? (
        <>
          <section className="note-reader" id={`note-${selectedNote.id}`}>
            <div className="panel-heading">
              <div>
                <h2>{selectedNote.title}</h2>
                <p>{selectedNote.summary}</p>
              </div>
              <div className="note-reader-actions">
                <NoteImageInsert
                  practice={practice}
                  key={selectedNote.id}
                  note={selectedNote}
                  onWorkspaceUpdated={onWorkspaceUpdated}
                />
              </div>
            </div>
            {resumePage ? (
              <button
                className="continue-reading-card"
                onClick={() => onNavigateToPage({ noteId: selectedNote.id, pageKey: resumePage.key })}
                type="button"
              >
                <span className="continue-reading-icon" aria-hidden="true"><Clock3 size={19} /></span>
                <span>
                  <small>上次阅读位置</small>
                  <strong>第 {resumePage.pageNumber} 页 · {resumePage.title}</strong>
                </span>
                <span className="continue-reading-action">继续阅读 <ChevronRight size={16} /></span>
              </button>
            ) : null}
            <StarredPagesPanel
              key={`stars-${selectedNote.id}`}
              note={selectedNote}
              onNavigate={(pageKey) => onNavigateToPage({ noteId: selectedNote.id, pageKey })}
              onToggle={(page) => onTogglePageStar(selectedNote.id, page)}
              pages={pages}
              stars={selectedNoteStars}
              targetPageKey={targetPageKey}
            />
            {starMessage ? <div className="star-save-message" role="status">{starMessage}</div> : null}
            <CoursewareImages practice={practice} key={`courseware-${selectedNote.id}`} note={selectedNote} onUpdate={onWorkspaceUpdated} />
            <MarkdownView
              content={selectedNote.contentMarkdown}
              pageStars={{
                noteId: selectedNote.id,
                pages,
                pageNotesByKey,
                sourceImagesByPage,
                starredPageKeys,
                targetPageKey,
                autoOpenNoteKey,
                onCloseNoteEditor: (pageKey) => {
                  if (autoOpenNoteKey === pageKey) setAutoOpenNoteKey(undefined);
                },
                onSaveNote: (page, note) => void onSavePageStarNote(selectedNote.id, page, note),
                onToggle: (page) => {
                  if (starredPageKeys.has(page.key)) {
                    if (autoOpenNoteKey === page.key) setAutoOpenNoteKey(undefined);
                  } else {
                    setAutoOpenNoteKey(page.key);
                  }
                  void onTogglePageStar(selectedNote.id, page);
                }
              }}
            />
          </section>
          <LearningArtifacts note={selectedNote} />
        </>
      ) : null}
      {guide && !selectedNote && <div className="guide-unwritten-entry"><span>FIELD NOTES / 待编纂</span><h2>这一页还没有写下。</h2><p>当前章节暂无笔记。展开右侧「AI 整理台」，可以添加课件、文字或整理要求。</p></div>}
      {guide && <footer className="guide-paper-folio"><span>THE HITCHHIKER’S GUIDE TO THE GALAXY</span><span>{pages.length ? `${pages.length} 页课件 · 逐页讲解` : "等待新条目"}</span></footer>}
      </div>
    </div>
  );
}

function StarredPagesPanel({
  note,
  onNavigate,
  onToggle,
  pages,
  stars,
  targetPageKey
}: {
  note: Note;
  onNavigate: (pageKey: string) => void;
  onToggle: (page: { key: string; pageNumber: number }) => void | Promise<void>;
  pages: NotePageSection[];
  stars: NoteStar[];
  targetPageKey?: string;
}) {
  const [expanded, setExpanded] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLButtonElement>(null);
  const items = stars
    .map((star) => ({ star, page: pages.find((page) => page.key === star.pageKey) }))
    .sort((left, right) => (left.page?.order ?? Number.MAX_SAFE_INTEGER) - (right.page?.order ?? Number.MAX_SAFE_INTEGER));
  const shownItems = showAll ? items : items.slice(0, 8);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || !items.length) {
      setShowReturn(false);
      return;
    }
    const scrollRegion = panel.closest("[data-scroll-region='notes']");
    const root = scrollRegion && getComputedStyle(scrollRegion).overflowY === "auto" ? scrollRegion : null;
    const observer = new IntersectionObserver(
      ([entry]) => setShowReturn(!entry.isIntersecting),
      { root, threshold: 0.06 }
    );
    observer.observe(panel);
    return () => observer.disconnect();
  }, [items.length]);

  function returnToPanel() {
    setExpanded(true);
    panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => headingRef.current?.focus({ preventScroll: true }), 350);
  }

  return (
    <>
      <section aria-label={`${note.title}的加星页面`} className="starred-pages-panel" ref={panelRef}>
        <button
          aria-expanded={expanded}
          className="starred-pages-heading"
          onClick={() => setExpanded((value) => !value)}
          ref={headingRef}
          type="button"
        >
          <span className="starred-pages-icon"><Star fill="currentColor" size={17} /></span>
          <span>
            <strong>加星页面</strong>
            <small>{items.length ? `${items.length} 个复习重点` : "收藏重点页面，复习更快捷"}</small>
          </span>
          <span className="starred-pages-count">{items.length}</span>
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {expanded ? (
          <div className="starred-pages-body">
            {shownItems.length ? (
              <div className="starred-pages-grid">
                {shownItems.map(({ star, page }) => (
                  <div className={`starred-page-card${targetPageKey === star.pageKey ? " active" : ""}`} key={star.pageKey}>
                    <button
                      className="starred-page-link"
                      disabled={!page}
                      onClick={() => page && onNavigate(page.key)}
                      type="button"
                    >
                      <span className="starred-page-number">
                        第{star.pageNumber}页{page && page.occurrence > 1 ? ` · 第${page.occurrence}处` : ""}
                      </span>
                      <strong>{page?.title ?? "原页面已不存在"}</strong>
                      {star.note ? <span className="starred-page-memo">备注：{star.note}</span> : null}
                      <small>{page?.excerpt ?? "笔记更新后未找到这一个页面，你可以移除该星标。"}</small>
                    </button>
                    <button
                      aria-label={`取消加星：第${star.pageNumber}页`}
                      className="starred-page-remove"
                      onClick={() => void onToggle({ key: star.pageKey, pageNumber: star.pageNumber })}
                      title="取消加星"
                      type="button"
                    >
                      <Star fill="currentColor" size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="starred-pages-empty">
                <span><Star size={19} /></span>
                <div>
                  <strong>还没有加星页面</strong>
                  <p>阅读时点击“第N页”标题右侧的空心星，即可把重点收进这里。</p>
                </div>
              </div>
            )}
            {items.length > 8 ? (
              <button className="starred-pages-more" onClick={() => setShowAll((value) => !value)} type="button">
                {showAll ? "收起多余项目" : `显示剩余 ${items.length - 8} 页`}
                {showAll ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            ) : null}
          </div>
        ) : null}
      </section>

      {showReturn ? (
        <button className="return-to-stars" onClick={returnToPanel} type="button">
          <CornerUpLeft size={17} />
          <Star fill="currentColor" size={15} />
          返回加星列表
        </button>
      ) : null}
    </>
  );
}

function NoteImageInsert({
  practice = false,
  note,
  onWorkspaceUpdated
}: {
  practice?: boolean;
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
    if (practice) { setMessage("教学练习区不上传图片、不修改笔记。"); return; }
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
              disabled={practice}
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
          <button className="primary-button" disabled={busy || practice} type="submit">
            {busy ? "插入中..." : "确认插入"}
          </button>
        </form>
      ) : null}
      {message ? <div className="note-image-message">{message}</div> : null}
    </div>
  );
}

function lessonLabel(lesson: Lesson) {
  return lesson.title.match(/^(?:Lecture|Tutorial|Chapter)\s+\d+[a-z]?(?=\s|[:：]|$)/i)?.[0] ?? `Lecture ${lesson.order}`;
}

function OrganizerPanel({
  practice = false,
  course,
  lessons,
  currentLessonId,
  currentNoteId,
  collapsed,
  onToggleCollapsed,
  onCommandApplied,
  onNoteCreated
}: {
  practice?: boolean;
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
  const [keepOriginalImages, setKeepOriginalImages] = useState(true);
  const [busy, setBusy] = useState(false);
  const [organizeStep, setOrganizeStep] = useState(0);
  const [organizeProgress, setOrganizeProgress] = useState(0);
  const [organizeElapsedSeconds, setOrganizeElapsedSeconds] = useState(0);
  const [organizeMessage, setOrganizeMessage] = useState("");
  const [error, setError] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const commandRef = useRef<HTMLTextAreaElement>(null);
  const commandDraft = useRef("");
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

  function handleCommandPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const images = getClipboardImages(event.clipboardData);
    if (!images.length) return;

    event.preventDefault();
    commandDraft.current = pasteClipboardText(event.currentTarget, event.clipboardData.getData("text/plain"));
    const accepted = images.filter(isSupportedClipboardImage);
    if (!accepted.length) {
      setCommandMessage(getClipboardImageError(images));
      return;
    }

    setCommandImage(accepted[0]);
    setCommandMessage(
      accepted.length > 1
        ? "AI 命令一次只接收一张图片，已附加剪贴板中的第一张。"
        : "已从剪贴板附加图片，请继续输入图片要放入哪篇笔记、哪个位置。"
    );
  }

  function handleSourcePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const images = getClipboardImages(event.clipboardData);
    if (!images.length) return;

    event.preventDefault();
    const nextText = pasteClipboardText(event.currentTarget, event.clipboardData.getData("text/plain"));
    const validImages = images.filter(isSupportedClipboardImage);
    if (!validImages.length) {
      setText(nextText);
      setError(getClipboardImageError(images));
      return;
    }

    const currentImageCount = selectedFiles.filter((file) => file.type.startsWith("image/")).length;
    const availableImageSlots = Math.max(0, 4 - currentImageCount);
    const availableFileSlots = Math.max(0, 8 - selectedFiles.length);
    const accepted = validImages.slice(0, Math.min(availableImageSlots, availableFileSlots));

    setText(nextText);
    if (accepted.length) {
      setSelectedFiles((current) => [...current, ...accepted]);
      setSourceType("image");
      setError("");
      setOrganizeMessage(
        validImages.length > accepted.length
          ? `已粘贴 ${accepted.length} 张图片；图片最多 4 张、文件总数最多 8 个，其余未加入。`
          : `已从剪贴板加入 ${accepted.length} 张图片，整理后会默认保留原图。`
      );
    } else {
      setError("图片最多 4 张、文件总数最多 8 个，请先移除已有文件。");
    }
  }

  function removeFile(index: number) {
    setSelectedFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submitCommand(event: FormEvent) {
    event.preventDefault();
    if (practice) { setCommandMessage("教学练习区不执行 AI 命令。"); return; }
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
      commandDraft.current = "";
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
    if (practice) { setError("教学练习区不调用 AI、不保存练习内容。"); return; }
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
    payload.set("keepOriginalImages", String(keepOriginalImages));
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
        <button className="organizer-rail-button" onClick={onToggleCollapsed} type="button" title="展开 AI 整理台" aria-label="展开 AI 整理台" aria-expanded={false}>
          <Brain size={22} />
          <span>AI 整理台</span>
        </button>
      </aside>
    );
  }

  return (
    <aside className="organizer">
      {practice && <p className="tutorial-practice-notice">教学练习：可填写要求和切换模式；上传、整理和命令提交均已禁用，不调用 AI。</p>}
      <div className="panel-heading organizer-heading">
        <div>
          <h2>AI 整理台</h2>
          <p>截图、文字、大纲都会自动归档到合适章节。</p>
        </div>
        <button className="icon-button collapse-button" onClick={onToggleCollapsed} type="button" title="收起 AI 整理台" aria-label="收起 AI 整理台" aria-expanded={true}>
          <ChevronRight size={16} aria-hidden="true" />
          <span>收起</span>
        </button>
      </div>

      <form className="command-panel" onSubmit={submitCommand}>
        <label className="field">
          <span>AI 命令行</span>
          <textarea
            ref={commandRef}
            className="command-box"
            aria-label="AI 命令行"
            defaultValue={commandDraft.current}
            onInput={event => { commandDraft.current = event.currentTarget.value; }}
            onPaste={handleCommandPaste}
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
              disabled={practice}
              onChange={(event) => setCommandImage(event.target.files?.[0] ?? null)}
              ref={commandImageRef}
              type="file"
            />
          </label>
          {commandImage ? (
            <div className="command-image-name">
              <ImageFilePreview file={commandImage} />
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
          <button data-tutorial="command-submit" className="ghost-button" disabled={commandBusy || !hydrated || practice} type="submit">
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
            aria-label="整理要求"
            value={targetInstruction}
            onChange={(event) => setTargetInstruction(event.target.value)}
            placeholder="例如：整理到近代物理学；偏考试复习；如果没有合适章节就新建一个“力学基础”。不填则由 AI 根据内容判断。"
          />
        </label>

        <div className="mode-tabs" aria-label="材料类型">
          <button data-tutorial="source-text" className={sourceType === "text" ? "active" : ""} onClick={() => setSourceType("text")} type="button">
            文字
          </button>
          <button data-tutorial="source-outline" className={sourceType === "outline" ? "active" : ""} onClick={() => setSourceType("outline")} type="button">
            大纲
          </button>
          <button data-tutorial="source-image" className={sourceType === "image" ? "active" : ""} onClick={() => setSourceType("image")} type="button">
            图片
          </button>
          <button data-tutorial="source-file" className={sourceType === "file" ? "active" : ""} onClick={() => setSourceType("file")} type="button">
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
            disabled={practice}
            onChange={handleFiles}
            ref={fileRef}
            type="file"
          />
        </label>
        {selectedFiles.length ? (
          <div className="selected-files" aria-label="已选择的文件">
            {selectedFiles.map((file, index) => (
              <div className="selected-file" key={`${file.name}-${file.lastModified}-${index}`}>
                {file.type.startsWith("image/") ? <ImageFilePreview file={file} /> : <FileText size={16} />}
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
            aria-label={sourceType === "outline" ? "课程大纲" : sourceType === "image" || sourceType === "file" ? "补充说明" : "原始文字"}
            onInput={(event) => setText(event.currentTarget.value)}
            defaultValue={text}
            onPaste={handleSourcePaste}
            placeholder={
              sourceType === "outline"
                ? "例如：1. 牛顿第一定律 2. 惯性参考系 3. 受力分析常见错误"
                : sourceType === "image" || sourceType === "file"
                  ? "可选：补充课程背景、老师强调的重点或期望的整理方向"
                  : "粘贴课堂记录、老师板书文字、课件片段或自己的草稿"
            }
          />
        </label>

        {selectedFiles.some((file) => file.type.startsWith("image/") || /\.pptx$/i.test(file.name)) ? (
          <label className="keep-images-option">
            <input
              checked={keepOriginalImages}
              onChange={(event) => setKeepOriginalImages(event.target.checked)}
              type="checkbox"
            />
            <span>
              <strong>保留原图与课件图片</strong>
            </span>
          </label>
        ) : null}

        <label className="field">
          <span>输出风格</span>
          <select data-tutorial="output-mode" value={mode} onChange={(event) => setMode(event.target.value as Mode)}>
            <option value="standard">标准课堂笔记</option>
            <option value="exam">考试复习版</option>
            <option value="deep">深度理解版</option>
          </select>
        </label>

        <div className="status-row">
          <span className="small-muted">AI 会选择已有章节，或自动新建章节</span>
          <button data-tutorial="organize-submit" className="primary-button" disabled={busy || !hydrated || practice} type="submit">
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

function buildSearchIndex(courses: Course[], lessons: Lesson[], notes: Note[]): SearchIndexItem[] {
  const courseMap = new Map(courses.map((course) => [course.id, course]));
  const lessonMap = new Map(lessons.map((lesson) => [lesson.id, lesson]));
  const index: SearchIndexItem[] = [];

  for (const note of notes) {
    const course = courseMap.get(note.courseId);
    const lesson = lessonMap.get(note.lessonId);
    if (!course || !lesson) continue;
    const pages = extractNotePages(note.contentMarkdown);
    const mainMarkdown = note.contentMarkdown.split("\n<!-- courseware-appendix -->\n")[0] ?? note.contentMarkdown;
    const overviewText = pages.length ? markdownToPlainText(mainMarkdown.slice(0, pages[0].sourceStart)) : "";
    const pageEntries = pages.map((page) => ({
          pageKey: page.key,
          pageNumber: page.pageNumber,
          pageTitle: page.title,
          plainText: page.plainText
        }));
    const entries = pages.length
      ? [
          ...(overviewText ? [{ pageKey: undefined, pageNumber: undefined, pageTitle: "笔记概览", plainText: overviewText }] : []),
          ...pageEntries
        ]
      : [{ pageKey: undefined, pageNumber: undefined, pageTitle: note.title, plainText: markdownToPlainText(note.contentMarkdown) }];

    for (const entry of entries) {
      const metadata = `${course.code} ${course.title} ${lesson.title} ${lesson.subtitle} ${note.title} ${note.summary} ${entry.pageTitle}`;
      index.push({
        noteId: note.id,
        courseId: course.id,
        lessonId: lesson.id,
        pageKey: entry.pageKey,
        pageNumber: entry.pageNumber,
        pageTitle: entry.pageTitle,
        courseTitle: course.title,
        courseCode: course.code,
        lessonTitle: lesson.title,
        noteTitle: note.title,
        plainText: entry.plainText,
        haystack: `${metadata} ${entry.plainText}`.toLocaleLowerCase()
      });
    }
  }
  return index;
}

function searchNotes(index: SearchIndexItem[], query: string): SearchResult[] {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return [];
  const tokens = normalized.split(/\s+/).filter(Boolean);

  return index
    .filter((item) => tokens.every((token) => item.haystack.includes(token)))
    .map((item) => {
      const titleText = `${item.pageTitle} ${item.noteTitle}`.toLocaleLowerCase();
      const pathText = `${item.courseCode} ${item.courseTitle} ${item.lessonTitle}`.toLocaleLowerCase();
      const bodyIndex = item.plainText.toLocaleLowerCase().indexOf(normalized);
      let score = 0;
      if (item.pageTitle.toLocaleLowerCase().includes(normalized)) score += 90;
      if (item.noteTitle.toLocaleLowerCase().includes(normalized)) score += 65;
      if (titleText.includes(normalized)) score += 30;
      if (pathText.includes(normalized)) score += 22;
      if (bodyIndex >= 0) score += Math.max(12, 45 - Math.min(30, Math.floor(bodyIndex / 120)));
      score += tokens.reduce((sum, token) => sum + (titleText.includes(token) ? 8 : 0), 0);
      return { ...item, excerpt: makeExcerpt(item.plainText, normalized, 165), score };
    })
    .sort((left, right) => right.score - left.score || left.courseCode.localeCompare(right.courseCode) || (left.pageNumber ?? 0) - (right.pageNumber ?? 0));
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function ImageFilePreview({ file }: { file: File }) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    const nextUrl = URL.createObjectURL(file);
    setUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);

  return url ? <img alt="" className="file-thumbnail" src={url} /> : <ImagePlus size={16} />;
}

function getClipboardImages(clipboard: DataTransfer) {
  const now = Date.now();
  return Array.from(clipboard.items)
    .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
    .map((item, index) => {
      const file = item.getAsFile();
      if (!file) return null;
      const extension = clipboardImageExtension(file.type);
      return new File([file], `clipboard-${now}-${index + 1}.${extension}`, {
        type: file.type,
        lastModified: now
      });
    })
    .filter((file): file is File => Boolean(file));
}

function isSupportedClipboardImage(file: File) {
  return ["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type) && file.size <= 10 * 1024 * 1024;
}

function getClipboardImageError(files: File[]) {
  if (files.some((file) => file.size > 10 * 1024 * 1024)) {
    return "单张粘贴图片不能超过 10 MB。";
  }
  return "仅支持粘贴 PNG、JPG、WEBP 或 GIF 图片。";
}

function clipboardImageExtension(mimeType: string) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/gif") return "gif";
  return "png";
}

function pasteClipboardText(textarea: HTMLTextAreaElement, pastedText: string) {
  if (!pastedText) return textarea.value;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const nextValue = `${textarea.value.slice(0, start)}${pastedText}${textarea.value.slice(end)}`;
  textarea.value = nextValue;
  const caret = start + pastedText.length;
  textarea.setSelectionRange(caret, caret);
  return nextValue;
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
