"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Bookmark, ChevronDown, ChevronRight, FileText, Star, X } from "lucide-react";
import type { ImmersiveHomeProps } from "@/components/ImmersiveHome";
import { extractNotePages } from "@/lib/note-pages";
import HomeScenery from "@/components/HomeScenery";

type Props = Omit<ImmersiveHomeProps, "theme"> & { theme: "warm-study" | "mist-forest" | "midnight-atlas" };
const rooms = {
  "warm-study": { kind: "study", location: "THE LAMPLIT STUDY / 金灯书房", title: ["灯已亮起", "书里还有远方"], invitation: "窗外夜色渐深，案头这一页，刚好留给自己。", collection: "案头课程簿", collectionLabel: "THE COURSE LEDGER", empty: "从课程簿里选一门课，开始今晚的阅读。" },
  "mist-forest": { kind: "forest", location: "INTO THE GROVE / 苔庭晨雾", title: ["循着微光", "往林深处走"], invitation: "不必急着抵达。每读懂一页，脚下就多一段路。", collection: "你的林间书径", collectionLabel: "PATHS OF DISCOVERY", empty: "选一条书径，让今天的探索慢慢开始。" },
  "midnight-atlas": { kind: "atlas", location: "THE NIGHT OBSERVATORY / 极夜星图", title: ["向未知处", "再走一光年"], invitation: "把零散的知识连成星座，让每一次求索都有坐标。", collection: "课程星座", collectionLabel: "YOUR KNOWLEDGE ATLAS", empty: "选一处星座，开启新的观测。" }
} as const;
const constellations = [
  [[8,25],[34,63],[74,15],[102,47],[81,76]],
  [[8,58],[37,19],[67,43],[101,10],[47,72]],
  [[10,15],[44,30],[70,12],[98,52],[48,73]],
  [[14,65],[28,28],[61,14],[92,33],[79,71]],
  [[8,40],[39,12],[52,54],[90,22],[101,68]],
  [[12,18],[27,69],[58,45],[82,74],[101,17]]
];

// These homes have different spatial structures; only navigation and real data are shared.
export default function AtmosphericHome(props: Props) {
  const { theme, searchCourseIds, courses, lessons, notes, noteStars, readingProgress, greeting, name, selectedTerm, terms, onContinue, onOpenCourse, onOpenNote, onTermChange } = props;
  const room = rooms[theme];
  const visibleCourses = courses.filter(course => !selectedTerm || course.term === selectedTerm);
  const recentNotes = [...notes].sort((a,b) => b.updatedAt.localeCompare(a.updatedAt));
  const latest = [...readingProgress].filter(progress => notes.some(note => note.id === progress.noteId)).sort((a,b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const resumeNote = (latest && notes.find(note => note.id === latest.noteId)) || recentNotes[0];
  const resumePage = resumeNote && latest?.noteId === resumeNote.id ? extractNotePages(resumeNote.contentMarkdown).find(page => page.key === latest.pageKey) : undefined;
  const [indexOpen, setIndexOpen] = useState<"notes" | "stars" | null>(null);
  const drawer = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const readIds = new Set(readingProgress.map(progress => progress.noteId));

  function closeIndex() { setIndexOpen(null); trigger.current?.focus(); }
  useEffect(() => {
    if (!indexOpen) return;
    drawer.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const keys = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setIndexOpen(null); trigger.current?.focus(); }
      if (event.key === "Tab") {
        const buttons = drawer.current?.querySelectorAll<HTMLButtonElement>("button");
        if (!buttons?.length) return;
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", keys);
    return () => window.removeEventListener("keydown", keys);
  }, [indexOpen]);

  return <div className={`home-dashboard world-home atmosphere-home ${room.kind}-home`} data-searching={Boolean(searchCourseIds)}>
    <HomeScenery kind={room.kind} />
    <div className="atmosphere-front">
      <header className="atmosphere-welcome"><span>{room.location}</span><h1>{greeting}，{name}</h1></header>
      <div className={`home-room home-room-${room.kind}`}>
        <aside className="room-invitation">
          <div className="room-inscription"><span className="room-small-rule" aria-hidden="true" /><h2>{room.title[0]}<br />{room.title[1]}</h2><p>{room.invitation}</p></div>
          <div className={`room-reading-place ${room.kind}-reading-place`}>
            <span className="reading-place-label">{theme === "warm-study" ? "留在灯下的那一页" : theme === "mist-forest" ? "上次走到的地方" : "LAST OBSERVATION / 上次的坐标"}</span>
            {resumeNote ? <button type="button" className="room-resume" onClick={() => onContinue(resumeNote, resumePage?.key)} aria-label={`继续阅读：${resumeNote.title}`}><Bookmark size={18} /><span><small>{courses.find(course => course.id === resumeNote.courseId)?.code} · 接着上次读</small><strong>{resumeNote.title}</strong><em>{resumePage ? `第 ${resumePage.pageNumber} 页 · ${resumePage.title}` : "打开最近笔记，继续探索"}</em></span><ArrowRight size={17} /></button> : <p className="room-resume-empty">{room.empty}</p>}
            {room.kind === "study" && <span className="desk-ribbon" aria-hidden="true" />}
          </div>
        </aside>
        <section className={`room-collection ${room.kind}-collection`} aria-label={room.collection}>
          <header className="room-collection-heading"><div><span>{room.collectionLabel}</span><h2>{room.collection}</h2></div><label className="room-term"><select aria-label="主页选择学期" value={selectedTerm} onChange={event => onTermChange(event.target.value)}>{terms.map(term => <option key={term} value={term}>{term}</option>)}</select><ChevronDown size={12} /></label></header>
          <div className={`room-courses ${room.kind}-courses`}>
            {room.kind === "forest" && visibleCourses.length > 1 && <svg className="forest-route" viewBox={`0 0 1000 ${visibleCourses.length * 115}`} preserveAspectRatio="none" aria-hidden="true"><path d={`M${visibleCourses.map((_, index) => `${index % 2 ? 230 : 80} ${index * 115 + 50}`).join(" L")}`} fill="none" stroke="currentColor" strokeDasharray="3 8" /></svg>}
            {room.kind === "atlas" && <div className="atlas-chart-grid" aria-hidden="true"><i /><i /><i /><span>N</span><small>KNOWLEDGE / EXPLORATION</small></div>}
            {visibleCourses.map((course, index) => {
              const ownNotes = notes.filter(note => note.courseId === course.id);
              const chapterCount = lessons.filter(lesson => lesson.courseId === course.id).length;
              const readCount = ownNotes.filter(note => readIds.has(note.id)).length;
              const title = course.title.startsWith(course.code) ? course.title.slice(course.code.length).trim() : course.title;
              const stars = constellations[index % constellations.length];
              return <button type="button" className={`home-course-card room-course ${room.kind}-course volume-${index % 4}${searchCourseIds?.includes(course.id) ? " course-search-match" : ""}`} key={course.id} onClick={() => onOpenCourse(course.id)} aria-label={`打开课程：${course.code} ${course.title}`}>
                <span className="room-course-marker" aria-hidden="true">{room.kind === "atlas" ? <svg viewBox="0 0 110 85"><path d={`M${stars.map(([x,y])=>`${x} ${y}`).join(" L")} M${stars[1].join(" ")} L${stars[4].join(" ")}`} /><g>{stars.map(([x,y],n)=><circle key={n} cx={x} cy={y} r={n === 1 ? 3.2 : 1.8} />)}</g></svg> : <span>{String(index + 1).padStart(2,"0")}</span>}</span>
                <span className="room-course-copy"><span className="room-course-code">{course.code}{room.kind === "atlas" && <small>SECTOR {String(index + 1).padStart(2,"0")}</small>}</span><h3>{title}</h3><span className="room-course-meta">{chapterCount} 章 · {ownNotes.length} 篇笔记{readCount > 0 && <span> · {readCount} 篇有阅读记录</span>}</span></span>
                <ChevronRight className="room-course-arrow" size={16} />
              </button>;
            })}
            {!visibleCourses.length && <p className="room-resume-empty">这一学期还没有课程，切换学期后再来看看。</p>}
          </div>
          <footer className="room-collection-colophon"><span>{visibleCourses.length} 门课程</span><span>{room.kind === "study" ? "一页一页，自有所得" : room.kind === "forest" ? "沿着自己的节奏" : "以好奇心为引力"}</span></footer>
        </section>
      </div>
      <footer className="room-tools"><span className="room-space-note">{room.kind === "study" ? "THE LAMPLIT HOURS" : room.kind === "forest" ? "TAKE THE SLOW PATH" : "AD ASTRA / 向着群星"}</span><div className="world-index-actions">{(["notes", "stars"] as const).map(kind => <button type="button" key={kind} aria-expanded={indexOpen === kind} aria-controls="room-reading-index" onClick={event => { trigger.current = event.currentTarget; setIndexOpen(current => current === kind ? null : kind); }}>{kind === "notes" ? <FileText size={15} /> : <Star size={15} />}{kind === "notes" ? "最近笔记" : "加星索引"}<span>{kind === "notes" ? notes.length : noteStars.length}</span></button>)}</div></footer>
    </div>
    {indexOpen && <div className="world-index-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) closeIndex(); }}><section ref={drawer} role="dialog" aria-modal="true" aria-label={indexOpen === "notes" ? "最近笔记索引" : "加星页面索引"} className="world-index-drawer" id="room-reading-index"><header><div><span>READING INDEX</span><h2>{indexOpen === "notes" ? "最近笔记" : "加星索引"}</h2></div><button type="button" aria-label="关闭阅读索引" onClick={closeIndex}><X size={20} /></button></header><div className="world-index-list">
      {indexOpen === "notes" ? recentNotes.slice(0,12).map(note => <button type="button" key={note.id} onClick={() => onOpenNote(note)}><FileText size={17} /><span><strong>{note.title}</strong><small>{courses.find(course => course.id === note.courseId)?.code} · {lessons.find(lesson => lesson.id === note.lessonId)?.title}</small></span><ChevronRight size={16} /></button>) : [...noteStars].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(star => {
        const note = notes.find(item => item.id === star.noteId);
        if (!note) return null;
        const page = extractNotePages(note.contentMarkdown).find(item => item.key === star.pageKey);
        return <button type="button" key={`${star.noteId}-${star.pageKey}`} onClick={() => onContinue(note,star.pageKey)}><Star size={17} /><span><strong>第{star.pageNumber}页 · {page?.title ?? note.title}</strong><small>{star.note || note.title}</small></span><ChevronRight size={16} /></button>;
      })}
      {!(indexOpen === "notes" ? notes.length : noteStars.length) && <p className="world-empty">{indexOpen === "notes" ? "还没有笔记，先进入一门课程。" : "阅读时为重点页面加星，就能在这里再次找到它。"}</p>}
    </div></section></div>}
  </div>;
}
