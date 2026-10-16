"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Bookmark, ChevronDown, ChevronRight, FileText, Shuffle, Star, X } from "lucide-react";
import type { ImmersiveHomeProps } from "@/components/ImmersiveHome";
import GalacticScenery from "@/components/GalacticScenery";
import { extractNotePages } from "@/lib/note-pages";

type Props = Omit<ImmersiveHomeProps, "theme" | "poeticFlow">;
const dispatches = [
  { label: "正常航行", text: "目前没有需要解释的异常。解释部门对此十分满意。" },
  { label: "不大可能事件 / 01", text: "舷窗外出现了一条鲸。它没有提交登船申请。" },
  { label: "不大可能事件 / 02", text: "一盆植物经过舷窗。植物方面拒绝进一步评论。" }
];

export default function GalacticHome(props: Props) {
  const { courses, lessons, notes, noteStars, readingProgress, selectedTerm, terms, onTermChange, onOpenCourse, onOpenNote, onContinue, name, searchCourseIds } = props;
  const [event, setEvent] = useState(0);
  const [indexOpen, setIndexOpen] = useState<"notes" | "stars" | null>(null);
  const drawer = useRef<HTMLElement>(null), trigger = useRef<HTMLButtonElement>(null);
  const recent = [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const latest = [...readingProgress].filter(p => notes.some(n => n.id === p.noteId)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const resume = (latest && notes.find(n => n.id === latest.noteId)) || recent[0];
  const resumePage = resume && latest?.noteId === resume.id ? extractNotePages(resume.contentMarkdown).find(p => p.key === latest.pageKey) : undefined;
  const visible = courses.filter(c => !selectedTerm || c.term === selectedTerm);
  const dispatch = dispatches[event % dispatches.length];
  function closeIndex() { setIndexOpen(null); trigger.current?.focus(); }
  useEffect(() => {
    if (!indexOpen) return;
    drawer.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const keys = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); setIndexOpen(null); trigger.current?.focus(); }
      if (e.key !== "Tab" || document.querySelector(".tutorial-layer")) return;
      const controls = drawer.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
      if (!controls?.length) return;
      const first = controls[0], last = controls[controls.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", keys); return () => window.removeEventListener("keydown", keys);
  }, [indexOpen]);

  return <div className="home-dashboard world-home galactic-home" data-searching={Boolean(searchCourseIds)}>
    <div className="guide-space-window"><GalacticScenery event={event} /></div>
    <div className="guide-front">
      <header className="guide-arrival"><span>THE HITCHHIKER’S FIELD EDITION</span><p>{name}的随身指南 <i /> 当前位置：尚在途中</p></header>
      <section className="guide-opening" aria-label="银河系搭车客指南">
        <div><span className="guide-edition-label">修订中 / EST. SOMEWHERE</span><h1>DON’T<br /><span>PANIC.</span></h1><p>银河系搭车客指南</p></div>
        <div className="guide-incident"><span className="guide-channel">来自舷窗外的消息</span><div aria-live="polite" aria-atomic="true" key={event}><small>{dispatch.label}</small><p>{dispatch.text}</p></div><button className="guide-improbability" type="button" onClick={() => setEvent(n => n + 1)} aria-label="触发一次不大可能事件"><Shuffle size={14} /><span>不大可能按钮</span><ArrowRight size={13} /></button><small className="guide-incident-disclaimer">只影响窗外。不影响笔记。</small></div>
      </section>
      <section className="guide-device" aria-label="随身电子指南">
        <header className="guide-device-bezel"><span><i /> THE GUIDE <small>PERSONAL / EARTH EDITION</small></span><span>NO. 0042 <i className="guide-screw" /></span></header>
        <div className="guide-screen">
          <section className="guide-directory" aria-label="课程索引">
            <header className="guide-page-heading"><div><span>01 / INDEX</span><h2>已知领域</h2></div><label className="guide-term"><select aria-label="主页选择学期" value={selectedTerm} onChange={e => onTermChange(e.target.value)}>{terms.map(t => <option key={t} value={t}>{t}</option>)}</select><ChevronDown size={12} /></label></header>
            <div className="guide-manifest">
              {visible.map((c, i) => <button key={c.id} className={`home-course-card guide-course${searchCourseIds?.includes(c.id) ? " course-search-match" : ""}`} type="button" onClick={() => onOpenCourse(c.id)} aria-label={`打开课程：${c.code} ${c.title}`}><span className="guide-entry-number">{String(i + 1).padStart(2, "0")}</span><span className="guide-entry-text"><small>{c.code}</small><h3>{c.title.startsWith(c.code) ? c.title.slice(c.code.length).trim() : c.title}</h3><em>{lessons.filter(l => l.courseId === c.id).length} 章 / {notes.filter(n => n.courseId === c.id).length} 篇笔记</em></span><ChevronRight size={16} /></button>)}
              {!visible.length && <p className="guide-empty">这一学期尚无课程。可以切换学期查看。</p>}
            </div>
            <footer className="guide-index-footnote"><span>编者附注 01</span><p>本指南收录了你目前知道的一部分事情。<br />其余部分暂未通知本指南。</p></footer>
          </section>
          <aside className="guide-log" aria-label="阅读记录">
            <header className="guide-page-heading"><div><span>02 / PERSONAL LOG</span><h2>旅途尚未结束</h2></div><Bookmark size={18} /></header>
            <div className="guide-location-slip"><span>最后确认位置</span>{resume ? <><strong>{resumePage ? `第 ${resumePage.pageNumber} 页` : "最近的笔记"}</strong><p>{resumePage?.title || resume.title}</p><small>{resumePage ? "至于为什么来到这里，记录中没有说明。" : "尚无具体页码记录。"}</small></> : <><strong>暂无记录</strong><p>从左侧课程索引开始阅读。</p></>}</div>
            {resume && <button className="world-resume guide-resume" type="button" onClick={() => onContinue(resume, resumePage?.key)} aria-label={`继续阅读：${resume.title}`}><span><small>{courses.find(c => c.id === resume.courseId)?.code} · 接着上次读</small><strong>{resume.title}</strong><em>继续阅读</em></span><ArrowRight size={19} /></button>}
            <div className="guide-personal-index">{(["notes", "stars"] as const).map(kind => <button key={kind} type="button" data-tutorial={`home-${kind}`} aria-expanded={indexOpen === kind} aria-controls="guide-reading-index" onClick={e => { trigger.current = e.currentTarget; setIndexOpen(kind); }}>{kind === "notes" ? <FileText size={16} /> : <Star size={16} />}<span>{kind === "notes" ? "最近笔记" : "加星索引"}</span><small>{String(kind === "notes" ? notes.length : noteStars.length).padStart(2, "0")}</small><ChevronRight size={14} /></button>)}</div>
            <div className="guide-tea" aria-hidden="true"><svg viewBox="0 0 150 100"><ellipse cx="70" cy="79" rx="49" ry="7" fill="#46534a" opacity=".1" /><path d="M40 37H98L93 68Q70 86 45 67Z" fill="#c8c6ad" stroke="#818b75" /><path d="M98 42Q125 38 116 57Q110 65 96 60" fill="none" stroke="#818b75" strokeWidth="4" /><ellipse cx="69" cy="37" rx="29" ry="6" fill="#626952" /><path className="guide-tea-steam" d="M60 24Q48 12 62 1M79 24Q90 13 78 3" fill="none" stroke="#8d977d" strokeWidth="1.5" opacity=".4" /></svg><span>一杯茶。无需计算。</span></div>
          </aside>
        </div>
        <footer className="guide-device-footer"><span>条目可增补。宇宙不提供校样。</span><span>EARTH / LOCAL COPY <i /></span></footer>
      </section>
      <footer className="guide-colophon"><span>随身携带 · 不必上交</span><span>原创场景与编者边注 / 致意 Douglas Adams</span></footer>
    </div>
    {indexOpen && <div className="world-index-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) closeIndex(); }}><section className="world-index-drawer guide-index-drawer" ref={drawer} id="guide-reading-index" role="dialog" aria-modal="true" aria-label={indexOpen === "notes" ? "最近笔记索引" : "加星页面索引"}><header><div><span>THE GUIDE / CROSS-REFERENCE</span><h2>{indexOpen === "notes" ? "最近笔记" : "加星索引"}</h2></div><button type="button" aria-label="关闭阅读索引" onClick={closeIndex}><X size={20} /></button></header><div className="world-index-list">
      {indexOpen === "notes" ? recent.slice(0, 12).map(note => <button data-tutorial="home-note-item" key={note.id} type="button" onClick={() => onOpenNote(note)}><FileText size={17} /><span><strong>{note.title}</strong><small>{courses.find(c => c.id === note.courseId)?.code} · {lessons.find(l => l.id === note.lessonId)?.title}</small></span><ChevronRight size={16} /></button>) : [...noteStars].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(star => {
        const note = notes.find(n => n.id === star.noteId); if (!note) return null;
        const page = extractNotePages(note.contentMarkdown).find(p => p.key === star.pageKey);
        return <button key={`${star.noteId}-${star.pageKey}`} type="button" onClick={() => onContinue(note, star.pageKey)}><Star size={17} /><span><strong>第{star.pageNumber}页 · {page?.title || note.title}</strong><small>{star.note || note.title}</small></span><ChevronRight size={16} /></button>;
      })}
      {!(indexOpen === "notes" ? notes.length : noteStars.length) && <p className="world-empty">{indexOpen === "notes" ? "还没有笔记，先进入一门课程。" : "为正文页面加星后，可以在这里找到它。"}</p>}
    </div></section></div>}
  </div>;
}
