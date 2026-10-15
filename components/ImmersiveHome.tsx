"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Bookmark, ChevronDown, ChevronRight, FileText, Star, X } from "lucide-react";
import type { Course, Lesson, Note, NoteReadingProgress, NoteStar } from "@/lib/types";
import { extractNotePages } from "@/lib/note-pages";
import { poeticScenes } from "@/lib/themes";
import { PoetryPassage, usePoeticFlow } from "@/components/ThemeWorld";
import WorldScenery from "@/components/WorldScenery";

export type ImmersiveHomeProps = {
  theme: "poetic-realm" | "arcane-library";
  poeticFlow: ReturnType<typeof usePoeticFlow>;
  searchCourseIds?: string[];
  courses: Course[]; lessons: Lesson[]; notes: Note[]; noteStars: NoteStar[]; readingProgress: NoteReadingProgress[];
  greeting: string; name: string; selectedTerm: string; terms: string[];
  onOpenCourse: (id: string) => void;
  onOpenNote: (note: Note) => void;
  onContinue: (note: Note, pageKey?: string) => void;
  onTermChange: (term: string) => void;
};

export default function ImmersiveHome(props: ImmersiveHomeProps) {
  const { theme, poeticFlow, searchCourseIds, courses, lessons, notes, noteStars, readingProgress, greeting, name, selectedTerm, terms, onContinue, onOpenCourse, onOpenNote, onTermChange } = props;
  const magic = theme === "arcane-library";
  const [indexOpen, setIndexOpen] = useState<"notes" | "stars" | null>(null);
  const [entering, setEntering] = useState<Course | null>(null);
  const navigate = useRef(onOpenCourse);
  navigate.current = onOpenCourse;
  const drawerRef = useRef<HTMLDivElement>(null);
  const entryRef = useRef<HTMLButtonElement>(null);
  const visibleCourses = courses.filter(course => !selectedTerm || course.term === selectedTerm);
  const latest = [...readingProgress].sort((a,b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const recentNotes = [...notes].sort((a,b) => b.updatedAt.localeCompare(a.updatedAt));
  const resumeNote = (latest && notes.find(note => note.id === latest.noteId)) || recentNotes[0];
  const resumePage = resumeNote && latest?.noteId === resumeNote.id ? extractNotePages(resumeNote.contentMarkdown).find(page => page.key === latest.pageKey) : undefined;
  const starredPages = useMemo(() => {
    const result = new Map<string, ReturnType<typeof extractNotePages>>();
    if (indexOpen === "stars") {
      const ids = new Set(noteStars.map(star => star.noteId));
      for (const note of notes) if (ids.has(note.id)) result.set(note.id, extractNotePages(note.contentMarkdown));
    }
    return result;
  }, [indexOpen, notes, noteStars]);

  useEffect(() => {
    if (!entering) return;
    const timer = window.setTimeout(() => navigate.current(entering.id), 620);
    return () => clearTimeout(timer);
  }, [entering]);

  useEffect(() => {
    if (!indexOpen) return;
    drawerRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setIndexOpen(null); entryRef.current?.focus(); }
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [indexOpen]);

  function enterCourse(course: Course) {
    if (entering) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) onOpenCourse(course.id);
    else setEntering(course);
  }

  function toggleIndex(kind: "notes" | "stars", target: HTMLButtonElement) {
    entryRef.current = target;
    setIndexOpen(current => current === kind ? null : kind);
  }

  return (
    <div className={`home-dashboard world-home ${magic ? "archive-home" : "poem-home"}${entering ? " world-entering" : ""}`} data-searching={Boolean(searchCourseIds)}>
      <WorldScenery magic={magic} poem={poeticScenes[poeticFlow.index].id} />
      <div className="world-front">
        <header className="world-welcome">
          <span className="world-location">{magic ? "THE NOCTURNE ARCHIVE" : "山水之间 · 与诗相逢"}</span>
          <h1>{greeting}，{name}</h1>
          <span className="world-welcome-note">{magic ? "你收藏的知识，正在等待下一次翻阅。" : "有时读书，有时读懂自己。"}</span>
        </header>

        {magic ? <div className="archive-vault" aria-hidden="true"><span>秘法藏书院</span><i /><p>凡所求索，皆有微光</p></div> : <div className="poem-open-space">
          <PoetryPassage index={poeticFlow.index} held={poeticFlow.held} onToggle={poeticFlow.toggleHeld} onNext={poeticFlow.next} />
          <span className="poem-scene-inscription">{poeticScenes[poeticFlow.index].image}</span>
        </div>}

        <section className={magic ? "archive-collection" : "poem-collection"} aria-label={magic ? "课程书架" : "课程诗笺"}>
          <div className="world-collection-heading">
            <div><span>{magic ? "COLLECTION" : "案上书笺"}</span><h2>{magic ? "你的课程藏书" : "读过的，终会成为自己"}</h2></div>
            <label className="world-term"><span className="sr-only">主页选择学期</span><select aria-label="主页选择学期" value={selectedTerm} onChange={event => onTermChange(event.target.value)}>{terms.map(term => <option key={term} value={term}>{term}</option>)}</select><ChevronDown size={13} /></label>
          </div>
          <div className={magic ? "archive-bookshelf" : "poem-manuscripts"}>
            {visibleCourses.map((course, index) => {
              const courseNotes = notes.filter(note => note.courseId === course.id);
              const chapterCount = lessons.filter(lesson => lesson.courseId === course.id).length;
              const readCount = courseNotes.filter(note => readingProgress.some(progress => progress.noteId === note.id)).length;
              const matched = searchCourseIds?.includes(course.id) ? " course-search-match" : "";
              return magic ? <button className={`home-course-card archive-book binding-${index % 4}${matched}`} key={course.id} disabled={Boolean(entering)} onClick={() => enterCourse(course)} type="button" aria-label={`打开课程：${course.code} ${course.title}`}>
                <span className="archive-book-edge" aria-hidden="true" />
                <span className="archive-book-cover"><span className="archive-book-code">{course.code}</span><span className="archive-book-sigil" aria-hidden="true">✧</span><h3 className={course.title.length - course.code.length > 10 ? "long-course-title" : undefined}>{course.title.startsWith(course.code) ? course.title.slice(course.code.length).trim() : course.title}</h3><span className="archive-book-rule" /><span className="archive-book-count">{chapterCount} 章 · {courseNotes.length} 篇</span><span className="archive-book-open">翻开藏书 <ArrowRight size={13} /></span></span>
                <span className="archive-shelf-label">{String(index + 1).padStart(2,"0")} / {readCount ? `已读 ${readCount} 篇` : "尚待探寻"}</span>
              </button> : <button className={`home-course-card poem-manuscript manuscript-${index % 3}${matched}`} key={course.id} disabled={Boolean(entering)} onClick={() => enterCourse(course)} type="button" aria-label={`打开课程：${course.code} ${course.title}`}>
                <span className="manuscript-binding" aria-hidden="true" /><span className="manuscript-code">{course.code}</span><h3 className={course.title.length - course.code.length > 15 ? "long-course-title" : undefined}>{course.title.startsWith(course.code) ? course.title.slice(course.code.length).trim() : course.title}</h3><span className="manuscript-count">{chapterCount} 章 / {courseNotes.length} 篇</span><span className="manuscript-seal" aria-hidden="true">学</span><span className="manuscript-open">展卷 <ArrowRight size={12} /></span>
              </button>;
            })}
            {!visibleCourses.length && <p className="world-empty">这一学期还没有课程，切换学期后再来看看。</p>}
          </div>
          {magic && <div className="archive-shelf-plank" aria-hidden="true"><i /><i /><i /></div>}
        </section>

        <footer className="world-reading-desk">
          {resumeNote ? <button className="world-resume" onClick={() => onContinue(resumeNote, resumePage?.key)} type="button"><Bookmark size={18} /><span><small>接着上次读</small><strong>{resumeNote.title}</strong>{resumePage && <em>第 {resumePage.pageNumber} 页 · {resumePage.title}</em>}</span><ArrowRight size={17} /></button> : <div className="world-resume-empty">{magic ? "从架上选一本书，开启新的求索。" : "选一卷书笺，从这里落笔。"}</div>}
          <div className="world-index-actions">
            <button aria-expanded={indexOpen === "notes"} aria-controls="world-reading-index" onClick={event => toggleIndex("notes", event.currentTarget)} type="button"><FileText size={15} />最近笔记 <span>{notes.length}</span></button>
            <button aria-expanded={indexOpen === "stars"} aria-controls="world-reading-index" onClick={event => toggleIndex("stars", event.currentTarget)} type="button"><Star size={15} />加星索引 <span>{noteStars.length}</span></button>
          </div>
        </footer>
      </div>
      {indexOpen && <div className="world-index-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) { setIndexOpen(null); entryRef.current?.focus(); } }}>
        <section ref={drawerRef} role="region" aria-label={indexOpen === "notes" ? "最近笔记索引" : "加星页面索引"} className="world-index-drawer" id="world-reading-index">
          <header><div><span>{magic ? "READING INDEX" : "拾得一页"}</span><h2>{indexOpen === "notes" ? "最近笔记" : "加星索引"}</h2></div><button type="button" aria-label="关闭阅读索引" onClick={() => { setIndexOpen(null); entryRef.current?.focus(); }}><X size={20} /></button></header>
          <div className="world-index-list">
            {indexOpen === "notes" ? recentNotes.slice(0,12).map(note => <button type="button" key={note.id} onClick={() => onOpenNote(note)}><FileText size={17} /><span><strong>{note.title}</strong><small>{courses.find(course => course.id === note.courseId)?.code} · {lessons.find(lesson => lesson.id === note.lessonId)?.title}</small></span><ChevronRight size={16} /></button>) : [...noteStars].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(star => {
              const note = notes.find(item => item.id === star.noteId);
              if (!note) return null;
              const page = starredPages.get(note.id)?.find(item => item.key === star.pageKey);
              return <button type="button" key={`${star.noteId}-${star.pageKey}`} onClick={() => onContinue(note,star.pageKey)}><Star size={17} /><span><strong>第{star.pageNumber}页 · {page?.title ?? note.title}</strong><small>{star.note || note.title}</small></span><ChevronRight size={16} /></button>;
            })}
            {!(indexOpen === "notes" ? notes.length : noteStars.length) && <p className="world-empty">{indexOpen === "notes" ? "还没有笔记，先进入一门课程。" : "在阅读中为页面加星，就能从这里再次找到它。"}</p>}
          </div>
        </section>
      </div>}
      {entering && <div className={`world-opening ${magic ? "opening-book" : "opening-scroll"}`} role="status" aria-label={`正在打开${entering.title}`}><div className="world-opening-leaf"><small>{entering.code}</small><strong>{entering.title}</strong><span>正在展开章节</span></div><div className="world-opening-light" /></div>}
    </div>
  );
}
