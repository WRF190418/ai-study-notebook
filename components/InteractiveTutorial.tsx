"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, BookOpen, Check, Compass, Pause, Play, Sparkles, X } from "lucide-react";
import ThemeLandscape from "@/components/ThemeWorld";
import type { UserPreferences } from "@/lib/types";
import { readTutorialProgress, tutorialChapters, tutorialKey, tutorialSteps, tutorialVersion, type TutorialProgress } from "@/lib/tutorial";

type Props = {
  userId: string;
  firstUse: boolean;
  theme: UserPreferences["theme"];
  onStart: (chapter: string) => void;
  onPrepare: (chapter: string) => void;
  onStop: () => void;
  onClose: () => void;
  onSearchBack: () => void;
};
const introduction = [
  { label: "01 / 让材料有脉络", title: <>零散的材料，<br />可以连成自己的知识。</>, text: "课件、截图、课堂记录。让 AI 帮你建立框架、逐页讲清，把翻不完的材料，变成读得懂的学习路径。", tag: "AI 整理 · 不只是摘要" },
  { label: "02 / 让理解有依据", title: <>整理，只是开始。<br />真正重要的是读懂。</>, text: "顺着讲解理解概念，一键回看原课件，放大图示核对条件。AI 是学习伙伴，不是正确性的保证。", tag: "逐页讲解 · 原页对照" },
  { label: "03 / 让重点属于你", title: <>AI 帮你理清，<br />重点，由你留下。</>, text: "给值得再看的页面加星，写下自己的疑问。从一个关键词找回具体页，用问题与结构把理解变成记忆。", tag: "星标备注 · 搜索定位 · 复习" },
  { label: "04 / 走进你的学习空间", title: <>从上次停下的地方，<br />继续向前。</>, text: "阅读位置自动记住，专注时让界面安静。不同的学习空间，让每次回来都多一点愿意停留的理由。", tag: "续读 · 专注 · 沉浸空间" }
];
type Rect = { left: number; top: number; width: number; height: number };

export default function InteractiveTutorial(props: Props) {
  const callbacks = useRef(props); callbacks.current = props;
  const [saved] = useState(() => readTutorialProgress(props.userId));
  const [phase, setPhase] = useState<"intro" | "menu" | "running" | "complete">(props.firstUse && !saved?.introSeen ? "intro" : "menu");
  const [index, setIndex] = useState(saved ? tutorialSteps.findIndex(s => s.id === saved.stepId) : 0);
  const [intro, setIntro] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [menuProgress, setMenuProgress] = useState(saved);
  const completedChapters = useRef<string[]>(saved?.completedChapters ?? []);
  const [notice, setNotice] = useState("");
  const [rect, setRect] = useState<Rect | null>(null);
  const [position, setPosition] = useState({ left: 24, top: 100 });
  const [portal, setPortal] = useState<HTMLElement | null>(null);
  const [folded, setFolded] = useState(false);
  const [colors, setColors] = useState<CSSProperties>({});
  const bubble = useRef<HTMLElement>(null);
  const modal = useRef<HTMLDivElement>(null);
  const [attempt, setAttempt] = useState(0);
  const active = tutorialSteps[index];
  const chapterIndex = tutorialChapters.findIndex(c => c.id === active.chapter);
  const chapter = tutorialChapters[chapterIndex];
  const chapterSteps = tutorialSteps.filter(s => s.chapter === active.chapter);
  const within = chapterSteps.findIndex(s => s.id === active.id);
  const done = useRef(false);
  const started = useRef(false);

  function persist(status: TutorialProgress["status"], stepIndex = index, introSeen = true) {
    const p: TutorialProgress = { version: tutorialVersion, stepId: tutorialSteps[stepIndex].id, status, introSeen, completedChapters: [...completedChapters.current] };
    setMenuProgress(p);
    try { localStorage.setItem(tutorialKey(props.userId), JSON.stringify(p)); } catch { setStorageError(true); }
  }
  function exit() {
    if (phase === "running") persist("paused");
    else if (phase === "intro" && !menuProgress) persist("paused", 0, false);
    if (started.current) { callbacks.current.onStop(); started.current = false; }
    callbacks.current.onClose();
  }
  function start(chapterId: string) {
    setNotice("");
    done.current = false; setAttempt(n => n + 1);
    const next = tutorialSteps.findIndex(s => s.chapter === chapterId);
    if (!started.current) { callbacks.current.onStart(chapterId); started.current = true; }
    else callbacks.current.onPrepare(chapterId);
    setIndex(next); setFolded(false); setPhase("running"); persist("paused", next);
  }
  function advance() {
    if (done.current || phase !== "running") return;
    done.current = true;
    const chapterFinished = index === tutorialSteps.length - 1 || tutorialSteps[index + 1].chapter !== active.chapter;
    if (chapterFinished && !completedChapters.current.includes(active.chapter)) completedChapters.current.push(active.chapter);
    if (index === tutorialSteps.length - 1) {
      if (completedChapters.current.length === tutorialChapters.length) { persist("completed"); setPhase("complete"); }
      else {
        const nextChapter = tutorialChapters.find(c => !completedChapters.current.includes(c.id))!;
        const nextIndex = tutorialSteps.findIndex(s => s.chapter === nextChapter.id);
        persist("paused", nextIndex); setIndex(nextIndex); setNotice(`本段练习已完成。还有 ${tutorialChapters.length - completedChapters.current.length} 节未完成，可以继续学习或先退出。`); setPhase("menu");
      }
      callbacks.current.onStop(); started.current = false;
      return;
    }
    const next = index + 1;
    if (tutorialSteps[next].chapter !== active.chapter) callbacks.current.onPrepare(tutorialSteps[next].chapter);
    setIndex(next); setFolded(false); persist("paused", next);
  }
  const nextAction = useRef(advance); nextAction.current = advance;

  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (phase !== "intro" || paused || reduced || intro === introduction.length - 1) return;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => { clearTimeout(timer); if (!document.hidden) timer = setTimeout(() => setIntro(i => Math.min(i + 1, introduction.length - 1)), 4700); };
    schedule(); document.addEventListener("visibilitychange", schedule);
    return () => { clearTimeout(timer); document.removeEventListener("visibilitychange", schedule); };
  }, [phase, intro, paused, reduced]);
  useEffect(() => {
    if (phase === "running") return;
    const previous = document.activeElement as HTMLElement | null;
    modal.current?.focus();
    function keys(e: KeyboardEvent) {
      if (e.key === "Escape") { e.preventDefault(); exit(); }
      if (e.key !== "Tab") return;
      const controls = modal.current?.querySelectorAll<HTMLElement>('button:not(:disabled), [tabindex="0"]');
      if (!controls?.length) return;
      const first = controls[0], last = controls[controls.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === modal.current)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || document.activeElement === modal.current)) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", keys);
    return () => { document.removeEventListener("keydown", keys); if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, [phase]);

  useEffect(() => {
    if (phase !== "running") return;
    done.current = false;
    let debounce: ReturnType<typeof setTimeout>;
    const match = (e: Event) => e.target instanceof Element && e.target.closest(active.target);
    const click = (e: Event) => {
      if ((active.kind === "click" || active.kind === "activate") && match(e)) {
        const el = (e.target as Element).closest("button, input, select, summary, a");
        if (!el || el.hasAttribute("disabled")) return;
        clearTimeout(debounce); debounce = setTimeout(() => nextAction.current(), 100);
      }
    };
    const input = (e: Event) => {
      if (!match(e)) return;
      if (!(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement)) return;
      const value = e.target.value.trim();
      if ((active.kind === "input" || active.kind === "change") && (active.value ? value === active.value : active.kind === "input" ? value.length >= 4 : Boolean(value))) {
        clearTimeout(debounce); debounce = setTimeout(() => nextAction.current(), active.kind === "input" ? 650 : 120);
      } else clearTimeout(debounce);
    };
    const custom = (e: Event) => { if (active.kind === "event" && (e as CustomEvent).detail === active.event) nextAction.current(); };
    document.addEventListener("click", click, true);
    document.addEventListener("input", input, true); document.addEventListener("change", input, true);
    window.addEventListener("study-note-tutorial", custom);
    document.documentElement.dataset.tutorialStep = active.id;
    return () => {
      clearTimeout(debounce); document.removeEventListener("click", click, true);
      document.removeEventListener("input", input, true); document.removeEventListener("change", input, true);
      window.removeEventListener("study-note-tutorial", custom); delete document.documentElement.dataset.tutorialStep;
    };
  }, [phase, index, attempt]);

  useEffect(() => {
    if (phase !== "running") { setRect(null); setPortal(null); return; }
    let scrolled = false;
    setRect(null);
    const update = () => {
      const dialog = document.querySelector<HTMLDialogElement>("dialog.image-lightbox[open]");
      setPortal(dialog ?? document.body);
      const el = Array.from(document.querySelectorAll<HTMLElement>(active.target)).find(e => e.getClientRects().length && getComputedStyle(e).visibility !== "hidden");
      if (!el) { setRect(null); return; }
      if (!scrolled) {
        scrolled = true;
        // Scroll only on entering a step; never fight the learner's own scrolling.
        if (!el.closest(".sidebar, .topbar, .focus-reader-toolbar, dialog")) el.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
      }
      const box = el.getBoundingClientRect();
      let top = Math.max(0, box.top), bottom = Math.min(innerHeight, box.bottom);
      const region = el.closest<HTMLElement>(".content-scroll, .organizer, .theme-picker, .world-index-drawer");
      if (region) { const r = region.getBoundingClientRect(); top = Math.max(top, r.top); bottom = Math.min(bottom, r.bottom); }
      const left = Math.max(10, box.left), right = Math.min(innerWidth - 10, box.right);
      if (bottom <= top || right <= left) { setRect(null); return; }
      const r = { left, top, width: right - left, height: bottom - top };
      setRect(prev => prev && Object.keys(r).every(k => Math.abs(prev[k as keyof Rect] - r[k as keyof Rect]) < 1) ? prev : r);
      const width = bubble.current?.offsetWidth ?? 320, height = bubble.current?.offsetHeight ?? 280;
      const gap = 16, minTop = 78, maxTop = Math.max(minTop, innerHeight - height - 16);
      const candidates = [
        { left: right + gap, top: Math.max(minTop, Math.min(top, maxTop)) },
        { left: left - width - gap, top: Math.max(minTop, Math.min(top, maxTop)) },
        { left: Math.max(16, Math.min(left, innerWidth - width - 16)), top: bottom + gap },
        { left: Math.max(16, Math.min(left, innerWidth - width - 16)), top: top - height - gap }
      ];
      const chosen = candidates.find(p => p.left >= 12 && p.left + width <= innerWidth - 12 && p.top >= minTop && p.top + height <= innerHeight - 12)
        ?? { left: Math.max(12, innerWidth - width - 20), top: maxTop };
      setPosition(p => Math.abs(p.left - chosen.left) < 1 && Math.abs(p.top - chosen.top) < 1 ? p : chosen);
    };
    const shell = document.querySelector(".app-shell");
    if (shell) {
      const style = getComputedStyle(shell);
      const vars = ["--theme-surface-solid", "--theme-ink", "--theme-muted", "--theme-line", "--primary-ink"];
      setColors(Object.fromEntries(vars.map(v => [v, style.getPropertyValue(v)])) as CSSProperties);
    }
    update(); const timer = setInterval(update, 180);
    return () => clearInterval(timer);
  }, [phase, index, props.theme, folded, attempt]);

  const exitButton = <button className="tutorial-exit" onClick={exit} type="button"><X size={15} />退出教程</button>;
  if (phase === "intro") return <div className="tutorial-intro tutorial-modal" role="dialog" aria-modal="true" aria-label="新手指导" ref={modal} tabIndex={-1}>
    <div className="tutorial-intro-scene"><ThemeLandscape theme={props.theme} /></div><div className="tutorial-intro-shade" />
    <header><span className="tutorial-brand"><BookOpen size={19} /> StudyNote AI</span>{exitButton}</header>
    <section className="tutorial-intro-copy" key={intro} aria-live="polite"><span className="tutorial-eyebrow">{introduction[intro].label}</span><h1>{introduction[intro].title}</h1><p>{introduction[intro].text}</p><span className="tutorial-intro-tag"><Sparkles size={15} />{introduction[intro].tag}</span></section>
    <footer><div className="tutorial-intro-pages">{introduction.map((_, i) => <button type="button" key={i} onClick={() => setIntro(i)} aria-label={`介绍第 ${i + 1} 幕`} aria-pressed={intro === i}><span /></button>)}<button type="button" className="tutorial-pause" onClick={() => setPaused(p => !p)} aria-label={paused ? "继续介绍" : "暂停介绍"}>{paused ? <Play size={14} /> : <Pause size={14} />}</button></div><div><button className="tutorial-intro-skip" type="button" onClick={() => start("begin")}>跳过介绍</button><button className="tutorial-primary" type="button" onClick={() => intro === 3 ? start("begin") : setIntro(i => i + 1)}>{intro === 3 ? "开始教程" : "继续"}<ArrowRight size={16} /></button></div></footer>
  </div>;
  if (phase === "menu" || phase === "complete") return <div className="tutorial-menu-backdrop tutorial-modal" role="dialog" aria-modal="true" aria-label="新手指导" ref={modal} tabIndex={-1}>
    <section className="tutorial-menu"><header><Compass size={23} /><span>YOUR LEARNING JOURNEY</span>{exitButton}</header>
      {phase === "complete" ? <><div className="tutorial-complete-mark"><Check size={32} /></div><h2>现在，开始自己的学习。</h2><p>教程已走完，已回到你的个人笔记本。练习课程、星标和主题改动不会写入正式资料。</p><p>AI 帮你整理，理解由你完成。以后随时从「新手指导」回来。</p><button type="button" className="tutorial-primary" onClick={exit}>回到我的笔记本<ArrowRight size={16} /></button></> : <>
      <span className="tutorial-eyebrow">先学主线，再探索空间</span><h2>{menuProgress?.status === "paused" ? "接着上次的旅程。" : menuProgress?.status === "completed" ? "随时回来，再试一次。" : "跟着做，真正学会用。"}</h2><p>小气泡会指向真实控件，完成操作后自动继续。使用临时练习资料，不修改你的正式笔记、不调用付费 AI。约 15–20 分钟，也可分节学习。</p>
      {menuProgress?.status === "paused" && <p className="tutorial-resume-note">上次停在「{tutorialChapters.find(c => c.id === tutorialSteps.find(s => s.id === menuProgress.stepId)?.chapter)?.title}」。继续时从本节起点练习，避免半开的弹窗或选择状态影响操作。</p>}
      {notice && <p role="status" className="tutorial-resume-note">{notice}</p>}
      <div className="tutorial-menu-actions"><button className="tutorial-primary" type="button" onClick={() => start(menuProgress?.status === "paused" ? tutorialSteps.find(s => s.id === menuProgress.stepId)!.chapter : "begin")}>{menuProgress?.status === "paused" ? "继续本节" : "开始教程"}<ArrowRight size={16} /></button><button type="button" onClick={() => { setIntro(0); setPhase("intro"); }}>重看沉浸介绍</button>{menuProgress && <button type="button" onClick={() => { completedChapters.current = []; start("begin"); }}>从头开始</button>}</div>
      <nav aria-label="新手指导目录">{tutorialChapters.map((c, i) => <button type="button" key={c.id} onClick={() => start(c.id)}><span>{String(i + 1).padStart(2, "0")}</span><strong>{c.title}</strong>{menuProgress?.completedChapters.includes(c.id) ? <Check size={14} aria-label="本节已完成" /> : <ArrowRight size={14} />}</button>)}</nav></>}
      {storageError && <p role="status">浏览器限制了本地保存；本次仍可学习，但关闭后可能无法续学。</p>}
    </section>
  </div>;
  if (!portal) return null;
  const activateTarget = active.kind === "activate" ? document.querySelector(active.target) : null;
  const activateInline = Boolean(activateTarget && activateTarget.tagName !== "BUTTON");
  return createPortal(<div className="tutorial-layer" style={colors} data-step={active.id}>
    <div className="tutorial-hud"><span className="tutorial-practice-label"><Compass size={15} />教学练习区<small>不写入正式课程</small></span><span className="tutorial-hud-progress">{chapterIndex + 1} / {tutorialChapters.length}<small>{chapter.title}</small></span><button type="button" onClick={() => setFolded(v => !v)}>{folded ? "展开指引" : "收起气泡"}</button>{exitButton}</div>
    {rect && !folded && <div className="tutorial-target-ring" aria-hidden="true" style={{ left: rect.left - 5, top: rect.top - 5, width: rect.width + 10, height: rect.height + 10 }} />}
    {!folded && <aside ref={bubble} className="tutorial-bubble" aria-label="手把手操作指引" style={{ left: rect ? position.left : undefined, top: rect ? position.top : undefined, ...(!rect ? { right: 20, bottom: 20 } : {}) }}>
      <div className="tutorial-bubble-step"><span>{chapter.title}</span><small>{within + 1} / {chapterSteps.length}</small></div>
      {within === 0 && <p className="tutorial-bridge">{chapter.bridge}</p>}
      <h3 aria-live="polite">{active.title}</h3><p>{active.body}</p>
      {!rect && <p className="tutorial-missing" role="status">暂未看到这一步的控件。可稍等或滚动找回；如果已离开当前页面，请重来本节。</p>}
      <footer>{active.kind === "confirm" || activateInline ? <button className="tutorial-primary" disabled={!rect} type="button" onClick={() => nextAction.current()}>{active.button ?? "明白了，继续"}<ArrowRight size={14} /></button> : active.button ? <button className="tutorial-primary" type="button" onClick={() => callbacks.current.onSearchBack()}>{active.button}<ArrowRight size={14} /></button> : <span className="tutorial-action-hint">{active.kind === "input" ? "请在指向的输入框中输入" : active.kind === "change" ? "请在选择器中切换" : active.kind === "event" ? "完成上方操作后自动继续" : "点击指向的控件后自动继续"}</span>}
      <button className="tutorial-restart" type="button" onClick={() => start(active.chapter)}>重来本节</button></footer>
      {storageError && <small role="status">本地进度暂时无法保存</small>}
    </aside>}
  </div>, portal);
}
