"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Bookmark, ChevronDown, ChevronRight, FileText, Star, X } from "lucide-react";
import type { ImmersiveHomeProps } from "@/components/ImmersiveHome";
import GalacticScenery from "@/components/GalacticScenery";
import GalacticCover from "@/components/GalacticCover";
import { extractNotePages } from "@/lib/note-pages";
import { guideFiction, guideIncidents, guideMarginalia } from "@/lib/galactic-guide";

type Props = Omit<ImmersiveHomeProps, "theme" | "poeticFlow"> & { showCover: boolean; onCoverOpened: () => void };

export default function GalacticHome(props: Props) {
  const { courses, lessons, notes, noteStars, readingProgress, selectedTerm, terms, onTermChange, onOpenCourse, onOpenNote, onContinue, name, searchCourseIds } = props;
  const [incident, setIncident] = useState({ event: 0, scene: 0 });
  const [margin, setMargin] = useState(0);
  const [fiction, setFiction] = useState<number | null>(null);
  const [indexOpen, setIndexOpen] = useState<"notes" | "stars" | null>(null);
  const drawer = useRef<HTMLElement>(null), trigger = useRef<HTMLButtonElement>(null);
  const indexHeading = useRef<HTMLHeadingElement>(null);
  const recent = [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const latest = [...readingProgress].filter(p => notes.some(n => n.id === p.noteId)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const resume = (latest && notes.find(n => n.id === latest.noteId)) || recent[0];
  const resumePage = resume && latest?.noteId === resume.id ? extractNotePages(resume.contentMarkdown).find(p => p.key === latest.pageKey) : undefined;
  const visible = courses.filter(c => !selectedTerm || c.term === selectedTerm);
  const dispatch = guideIncidents[incident.event % guideIncidents.length];
  function openCover() { props.onCoverOpened(); requestAnimationFrame(() => indexHeading.current?.focus({ preventScroll: true })); }
  function nextIncident() {
    setIncident(previous => {
      const event = previous.event + 1;
      return { event, scene: guideIncidents[event % guideIncidents.length].scene ?? previous.scene };
    });
  }
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
    <div className="guide-space-window"><GalacticScenery event={incident.event} scene={incident.scene} /></div>
    <div className="guide-front">
      <header className="guide-arrival"><span>THE HITCHHIKER’S GUIDE TO THE GALAXY</span><p>{name}的随身本 <i /> 当前位置：尚在途中</p></header>
      <section className="guide-opening" aria-label="银河系搭车客指南">
        <div><span className="guide-edition-label">PERSONAL FIELD COPY / 地球随身本</span><h1>银河系搭车客指南<span>随身携带 · 不必上交</span></h1></div>
      </section>
      <section className="guide-device" aria-label="随身电子指南">
        <div className="guide-device-spine" aria-hidden="true"><span>DON’T PANIC.</span><i /><small>FIELD COPY · 0042</small></div>
        <header className="guide-device-bezel"><span><i /> THE GUIDE <small>REVISED / MORE OR LESS</small></span><span>NO. 0042 <i className="guide-screw" /></span></header>
        <nav className="guide-page-tabs" aria-label="指南交叉索引"><span aria-current="page">01 / 课程索引</span>{(["notes", "stars"] as const).map(kind => <button key={kind} type="button" data-tutorial={`home-${kind}`} aria-expanded={indexOpen === kind} aria-controls="guide-reading-index" onClick={e => { trigger.current = e.currentTarget; setIndexOpen(kind); }}>{kind === "notes" ? <FileText size={13} /> : <Star size={13} />}<span>{kind === "notes" ? "最近笔记" : "加星索引"}</span><small>{String(kind === "notes" ? notes.length : noteStars.length).padStart(2, "0")}</small></button>)}</nav>
        <div className="guide-screen">
          <section className="guide-directory" aria-label="课程索引">
            <header className="guide-page-heading"><div><span>A–Z / 已知知识的暂定分类</span><h2 tabIndex={-1} ref={indexHeading}>已知领域</h2></div><label className="guide-term"><select aria-label="主页选择学期" value={selectedTerm} onChange={e => onTermChange(e.target.value)}>{terms.map(t => <option key={t} value={t}>{t}</option>)}</select><ChevronDown size={12} /></label></header>
            <div className="guide-manifest">
              {visible.map((c, i) => <button key={c.id} className={`home-course-card guide-course${searchCourseIds?.includes(c.id) ? " course-search-match" : ""}`} type="button" onClick={() => onOpenCourse(c.id)} aria-label={`打开课程：${c.code} ${c.title}`}><span className="guide-entry-number">{String(i + 1).padStart(2, "0")}</span><span className="guide-entry-text"><small>{c.code}</small><h3>{c.title.startsWith(c.code) ? c.title.slice(c.code.length).trim() : c.title}</h3><em>{lessons.filter(l => l.courseId === c.id).length} 章 / {notes.filter(n => n.courseId === c.id).length} 篇笔记</em></span><ChevronRight size={16} /></button>)}
              {!visible.length && <p className="guide-empty">这一学期尚无课程。可以切换学期查看。</p>}
            </div>
            <footer className="guide-index-footnote"><span>编者附注 {String(margin + 1).padStart(2, "0")}</span><button type="button" className="guide-margin-note" aria-label="翻阅编者边注" title="点击边注，翻一条" onClick={() => setMargin(n => (n + 1) % guideMarginalia.length)}><span key={margin}>{guideMarginalia[margin]}</span><small>↗</small></button></footer>
          </section>
          <aside className="guide-log" aria-label="阅读记录">
            <header className="guide-page-heading"><div><span>夹页 / PERSONAL BOOKMARK</span><h2>上次读到这里</h2></div><Bookmark size={18} /></header>
            <div className="guide-location-slip"><span>最后确认位置</span>{resume ? <><strong>{resumePage ? `第 ${resumePage.pageNumber} 页` : "最近的笔记"}</strong><p>{resumePage?.title || resume.title}</p><small>{resumePage ? "至于为什么来到这里，记录中没有说明。" : "尚无具体页码记录。"}</small></> : <><strong>暂无记录</strong><p>从左侧课程索引开始阅读。</p></>}</div>
            {resume && <button className="world-resume guide-resume" type="button" onClick={() => onContinue(resume, resumePage?.key)} aria-label={`继续阅读：${resume.title}`}><span><small>{courses.find(c => c.id === resume.courseId)?.code} · 接着上次读</small><strong>{resume.title}</strong><em>继续阅读</em></span><ArrowRight size={19} /></button>}
            <div className="guide-fiction"><span>编者夹页 · 虚构条目</span>{fiction === null ? <button type="button" className="guide-fiction-open" onClick={() => setFiction(0)}>宇宙，以及其他 <ArrowRight size={14} /></button> : <section aria-label="指南虚构条目"><header><small>{guideFiction[fiction].number}</small><button type="button" aria-label="收起虚构条目" onClick={() => setFiction(null)}><X size={13} /></button></header><h3>{guideFiction[fiction].title}</h3><p>{guideFiction[fiction].body}</p><button type="button" className="guide-cross-reference" onClick={() => setFiction(n => (n! + 1) % guideFiction.length)}>{guideFiction[fiction].reference} ↗</button></section>}</div>
            <span className="guide-log-foot">页码记在这里。旅途继续。</span>
          </aside>
        </div>
        <footer className="guide-device-footer"><span>条目可增补。宇宙不提供校样。</span><div className="guide-hardware"><span>IMPROBABILITY</span><button className="guide-improbability" type="button" onClick={nextIncident} aria-label="触发一次不大可能事件" title="不大可能按键 · 只影响主题场景"><i aria-hidden="true" /><span aria-hidden="true">↗</span></button><span>0042</span></div></footer>
      </section>
      <div className="guide-beside"><aside className="guide-incident" aria-label="虚构舷窗短讯"><span className="guide-channel">舷窗短讯 / 主题虚构</span><div aria-live="polite" aria-atomic="true" key={incident.event}><small>{dispatch.label}</small><p>{dispatch.text}</p></div></aside><div className="guide-tea" aria-hidden="true"><svg viewBox="0 0 150 100"><ellipse cx="70" cy="79" rx="49" ry="7" fill="#000" opacity=".28" /><ellipse cx="72" cy="76" rx="43" ry="8" fill="#a9a68f" stroke="#d4c9a8" /><path d="M40 37H98L93 68Q70 86 45 67Z" fill="#d4cbb1" stroke="#9c9a84" /><path d="M98 42Q125 38 116 57Q110 65 96 60" fill="none" stroke="#c7c1a8" strokeWidth="4" /><ellipse cx="69" cy="37" rx="29" ry="6" fill="#554d37" /><path className="guide-tea-steam" d="M60 24Q48 12 62 1M79 24Q90 13 78 3" fill="none" stroke="#ddd7ba" strokeWidth="1.5" opacity=".4" /></svg><span>一杯茶。无需计算。</span></div></div>
      <footer className="guide-colophon"><span>本指南仍在修订</span><span>原创场景与编者边注 / 致意 Douglas Adams</span></footer>
    </div>
    {indexOpen && <div className="world-index-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) closeIndex(); }}><section className="world-index-drawer guide-index-drawer" ref={drawer} id="guide-reading-index" role="dialog" aria-modal="true" aria-label={indexOpen === "notes" ? "最近笔记索引" : "加星页面索引"}><header><div><span>THE GUIDE / CROSS-REFERENCE</span><h2>{indexOpen === "notes" ? "最近笔记" : "加星索引"}</h2></div><button type="button" aria-label="关闭阅读索引" onClick={closeIndex}><X size={20} /></button></header><div className="world-index-list">
      {indexOpen === "notes" ? recent.slice(0, 12).map(note => <button data-tutorial="home-note-item" key={note.id} type="button" onClick={() => onOpenNote(note)}><FileText size={17} /><span><strong>{note.title}</strong><small>{courses.find(c => c.id === note.courseId)?.code} · {lessons.find(l => l.id === note.lessonId)?.title}</small></span><ChevronRight size={16} /></button>) : [...noteStars].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(star => {
        const note = notes.find(n => n.id === star.noteId); if (!note) return null;
        const page = extractNotePages(note.contentMarkdown).find(p => p.key === star.pageKey);
        return <button key={`${star.noteId}-${star.pageKey}`} type="button" onClick={() => onContinue(note, star.pageKey)}><Star size={17} /><span><strong>第{star.pageNumber}页 · {page?.title || note.title}</strong><small>{star.note || note.title}</small></span><ChevronRight size={16} /></button>;
      })}
      {!(indexOpen === "notes" ? notes.length : noteStars.length) && <p className="world-empty">{indexOpen === "notes" ? "还没有笔记，先进入一门课程。" : "为正文页面加星后，可以在这里找到它。"}</p>}
    </div></section></div>}
    {props.showCover && <GalacticCover onFinish={openCover} />}
  </div>;
}
