"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, BookOpen, Check, Compass, MousePointer2, Pause, Play, RotateCcw, SkipForward, Sparkles, X } from "lucide-react";
import type { UserPreferences } from "@/lib/types";
import { readTutorialProgress, tutorialChapters, tutorialKey, tutorialSteps, tutorialVersion, type TutorialProgress } from "@/lib/tutorial";
import { demoInput, performDemoAction, setDemoInput, tutorialTarget } from "@/lib/tutorial-playback";

type Props = {
  userId: string; firstUse: boolean; theme: UserPreferences["theme"];
  onStart: (chapter: string) => void; onPrepare: (chapter: string) => void;
  onStop: () => void; onClose: () => void; onSearchBack: () => void;
};
const introduction = [
  { label: "01 / 材料，开始有了联系", title: "零散的材料，\n连成自己的知识。", text: "让 AI 建立框架、逐页讲清。课件、截图与课堂记录，从这里成为一条读得懂的学习路径。", tag: "AI 整理 · 概念框架 · 逐页讲解" },
  { label: "02 / 理解，有迹可循", title: "读懂一个概念，\n也看清它的来处。", text: "讲解旁边，始终留着原课件的入口。把疑问留在页边，让每次回看都有方向。", tag: "原页对照 · 星标备注 · 内容搜索" },
  { label: "03 / 这里，留给专注的你", title: "从上次停下的地方，\n继续向前。", text: "阅读位置自动记住，专注时让界面安静。接下来，跟着光标走一遍，认识属于你的学习空间。", tag: "自动带看 · 随时暂停 · 不修改真实资料" }
];
type Rect = { left: number; top: number; width: number; height: number };
function Lettering({ text, start = 0 }: { text: string; start?: number }) {
  return <span className="tutorial-lettering" aria-label={text}>{Array.from(text).map((char, i) => char === "\n" ? <br key={i} /> : <span aria-hidden="true" key={i} style={{ "--letter-delay": `${start + i * 42}ms` } as CSSProperties}>{char === " " ? "\u00a0" : char}</span>)}</span>;
}

export default function InteractiveTutorial(props: Props) {
  const callbacks = useRef(props); callbacks.current = props;
  const [saved] = useState(() => readTutorialProgress(props.userId));
  const [phase, setPhase] = useState<"intro" | "running" | "complete">("intro");
  const [index, setIndex] = useState(0), [intro, setIntro] = useState(0);
  const [paused, setPaused] = useState(false), [hidden, setHidden] = useState(false), [reduced, setReduced] = useState(false);
  const [storageError, setStorageError] = useState(false), [speed, setSpeed] = useState(1), [notice, setNotice] = useState("");
  const [finishedAll, setFinishedAll] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null), [position, setPosition] = useState({ left: 24, top: 100 });
  const [portal, setPortal] = useState<HTMLElement | null>(null), [colors, setColors] = useState<CSSProperties>({});
  const [attempt, setAttempt] = useState(0), [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<"read" | "move" | "act" | "observe">("read"), [cursor, setCursor] = useState({ x: -80, y: -80 });
  const bubble = useRef<HTMLElement>(null), modal = useRef<HTMLDivElement>(null);
  const completedChapters = useRef<string[]>([]), started = useRef(false), done = useRef(false), stopped = useRef(false), needsReset = useRef(false);
  const completionStep = useRef(0);
  const clock = useRef({ elapsed: 0, acted: false, waiting: 0, inputCount: 0 });
  const playback = useRef({ paused, hidden, speed }); playback.current = { paused, hidden, speed };
  const active = tutorialSteps[index], chapterIndex = tutorialChapters.findIndex(c => c.id === active.chapter), chapter = tutorialChapters[chapterIndex];
  const chapterSteps = tutorialSteps.filter(s => s.chapter === active.chapter), within = chapterSteps.findIndex(s => s.id === active.id);

  function persist(status: TutorialProgress["status"], stepIndex = index, introSeen = true) {
    const p: TutorialProgress = { version: tutorialVersion, stepId: tutorialSteps[stepIndex].id, status, introSeen, completedChapters: [...completedChapters.current] };
    try { localStorage.setItem(tutorialKey(props.userId), JSON.stringify(p)); } catch { setStorageError(true); }
  }
  function exit() {
    stopped.current = true;
    if (phase !== "intro" || !saved) persist(phase === "complete" && finishedAll ? "completed" : "paused", phase === "intro" ? 0 : phase === "complete" ? completionStep.current : index, phase !== "intro");
    if (started.current) { callbacks.current.onStop(); started.current = false; }
    window.getSelection()?.removeAllRanges(); callbacks.current.onClose();
  }
  function start(chapterId = "begin", resume = false) {
    stopped.current = false; needsReset.current = false; setNotice(""); setPaused(false); done.current = false; setAttempt(n => n + 1);
    const next = tutorialSteps.findIndex(s => s.chapter === chapterId);
    if (resume) completedChapters.current = [...(saved?.completedChapters ?? [])];
    if (!started.current) { callbacks.current.onStart(chapterId); started.current = true; } else callbacks.current.onPrepare(chapterId);
    setIndex(next); setPhase("running"); persist("paused", next);
  }
  function advance() {
    if (done.current || stopped.current || phase !== "running") return;
    done.current = true;
    const finished = index === tutorialSteps.length - 1 || tutorialSteps[index + 1].chapter !== active.chapter;
    if (finished && !completedChapters.current.includes(active.chapter)) completedChapters.current.push(active.chapter);
    if (index === tutorialSteps.length - 1) {
      finish(); return;
    }
    const next = index + 1;
    if (tutorialSteps[next].chapter !== active.chapter) callbacks.current.onPrepare(tutorialSteps[next].chapter);
    setIndex(next); persist("paused", next);
  }
  function finish() {
    const all = completedChapters.current.length === tutorialChapters.length;
    const remaining = tutorialChapters.find(c => !completedChapters.current.includes(c.id));
    completionStep.current = remaining ? tutorialSteps.findIndex(s => s.chapter === remaining.id) : index;
    persist(all ? "completed" : "paused", completionStep.current); setFinishedAll(all);
    stopped.current = true; callbacks.current.onStop(); started.current = false; setPhase("complete");
  }
  const nextAction = useRef(advance); nextAction.current = advance;
  const startAction = useRef(start); startAction.current = start;
  function togglePause() { if (paused && needsReset.current) { start(active.chapter); return; } setPaused(p => !p); }

  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)"), update = () => setReduced(media.matches), visibility = () => setHidden(document.hidden);
    update(); visibility(); media.addEventListener("change", update); document.addEventListener("visibilitychange", visibility);
    return () => { media.removeEventListener("change", update); document.removeEventListener("visibilitychange", visibility); };
  }, []);
  useEffect(() => {
    if (phase !== "intro") return;
    let elapsed = 0, previous = performance.now(), frame: number;
    const tick = (now: number) => {
      const delta = Math.min(now - previous, 100); previous = now;
      if (!playback.current.paused && !playback.current.hidden) elapsed += delta;
      if (elapsed >= 5600) { if (intro === introduction.length - 1) startAction.current(); else setIntro(i => i + 1); }
      else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick); return () => cancelAnimationFrame(frame);
  }, [phase, intro]);
  useEffect(() => {
    if (phase === "running") return;
    const previous = document.activeElement as HTMLElement | null; modal.current?.focus();
    const keys = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); exit(); }
      if (e.key !== "Tab") return;
      const controls = modal.current?.querySelectorAll<HTMLElement>('button:not(:disabled), [tabindex="0"]'); if (!controls?.length) return;
      const first = controls[0], last = controls[controls.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === modal.current)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || document.activeElement === modal.current)) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", keys);
    return () => { document.removeEventListener("keydown", keys); if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, [phase]);

  useEffect(() => {
    if (phase !== "running") return;
    done.current = false; clock.current = { elapsed: 0, acted: false, waiting: 0, inputCount: 0 }; setStage("read"); setProgress(0);
    document.documentElement.dataset.tutorialStep = active.id;
    const interrupt = (e: Event) => {
      if (!e.isTrusted || !(e.target instanceof Element) || e.target.closest(".tutorial-layer")) return;
      if (e.type === "wheel" || e.type === "pointerdown" || e.type === "keydown" && ["PageDown", "PageUp", "ArrowUp", "ArrowDown", " "].includes((e as KeyboardEvent).key)) {
        setPaused(true);
        if (e.type === "pointerdown") { needsReset.current = true; setNotice("你正在自行操作。继续时会从本段起点演示，避免重复点击。"); }
      }
    };
    const readTime = Math.max(3500, Math.min(6400, active.body.length * 62));
    const typing = active.kind === "input" ? demoInput(active) : active.event === "memo-closed" ? (active.id === "memo-edit" ? "二刷：先自己画知识地图，再核对箭头" : "二刷时自己画一次知识地图") : "";
    const typeTime = typing.length * 60, total = readTime + 900 + typeTime + 1250;
    let previous = performance.now(), frame: number;
    const tick = (now: number) => {
      const delta = Math.min(now - previous, 100); previous = now;
      const state = playback.current, c = clock.current;
      if (!state.paused && !state.hidden && !stopped.current) {
        if (c.acted) {
          c.elapsed += delta * state.speed; setProgress(p => Math.abs(p - Math.min(c.elapsed / total, 1)) >= .01 ? Math.min(c.elapsed / total, 1) : p);
          if (c.elapsed >= total) { nextAction.current(); return; }
          frame = requestAnimationFrame(tick); return;
        }
        const el = tutorialTarget(active.target);
        if (!el) { c.waiting += delta; if (c.waiting > 10000) { setPaused(true); setNotice("这一处界面尚未就绪。可以重播本段，或跳过本段继续。"); } }
        else {
          c.waiting = 0; c.elapsed += delta * state.speed; setProgress(p => Math.abs(p - Math.min(c.elapsed / total, 1)) >= .01 ? Math.min(c.elapsed / total, 1) : p);
          if (c.elapsed >= readTime - 850 && c.elapsed < readTime + 900 + typeTime) {
            const box = el.getBoundingClientRect(); let x = box.left + Math.min(box.width / 2, 100), y = box.top + Math.min(box.height / 2, 26);
            if (active.event === "ocr-selected") {
              const words = el.querySelectorAll(".ocr-word"), first = words[0]?.getBoundingClientRect(), last = words[2]?.getBoundingClientRect();
              if (first && last) { const f = Math.min(1, Math.max(0, (c.elapsed - readTime) / 850)); x = first.left + (last.right - first.left) * f; y = first.top + first.height / 2; }
            }
            setCursor({ x, y }); setStage(c.elapsed < readTime ? "move" : "act");
          }
          if (c.elapsed >= readTime + 700 && typing) {
            const target = el.matches("input,textarea") ? el : el.querySelector("input,textarea");
            if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
              const count = Math.min(typing.length, Math.floor((c.elapsed - readTime - 700) / 60));
              if (count > c.inputCount) { setDemoInput(target, typing.slice(0, count)); c.inputCount = count; }
            }
          }
          if (!c.acted && c.elapsed >= readTime + 900 + typeTime) {
            c.acted = true;
            if (!performDemoAction(active, () => callbacks.current.onSearchBack())) { c.acted = false; c.elapsed = readTime + 700 + typeTime; }
            else setStage("observe");
          }
          if (c.acted && c.elapsed >= total) { nextAction.current(); return; }
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    document.addEventListener("pointerdown", interrupt, true); document.addEventListener("wheel", interrupt, { capture: true, passive: true }); document.addEventListener("keydown", interrupt, true);
    return () => { cancelAnimationFrame(frame); document.removeEventListener("pointerdown", interrupt, true); document.removeEventListener("wheel", interrupt, true); document.removeEventListener("keydown", interrupt, true); delete document.documentElement.dataset.tutorialStep; };
  }, [phase, index, attempt]);

  useEffect(() => {
    if (phase !== "running") { setRect(null); setPortal(null); return; }
    let scrolled = false; setRect(null);
    const update = () => {
      const dialog = document.querySelector<HTMLDialogElement>("dialog.image-lightbox[open]"); setPortal(dialog ?? document.body);
      const el = tutorialTarget(active.target); if (!el) { setRect(null); return; }
      if (!scrolled) { scrolled = true; if (!el.closest(".sidebar, .topbar, .focus-reader-toolbar, dialog")) el.scrollIntoView({ block: "center", inline: "nearest", behavior: reduced ? "instant" : "smooth" }); }
      const box = el.getBoundingClientRect(); let top = Math.max(0, box.top), bottom = Math.min(innerHeight, box.bottom);
      const region = el.closest<HTMLElement>(".content-scroll, .organizer, .theme-picker, .world-index-drawer");
      if (region) { const r = region.getBoundingClientRect(); top = Math.max(top, r.top); bottom = Math.min(bottom, r.bottom); }
      const left = Math.max(10, box.left), right = Math.min(innerWidth - 10, box.right); if (bottom <= top || right <= left) { setRect(null); return; }
      const r = { left, top, width: right - left, height: bottom - top };
      setRect(prev => prev && Object.keys(r).every(k => Math.abs(prev[k as keyof Rect] - r[k as keyof Rect]) < 1) ? prev : r);
      const width = bubble.current?.offsetWidth ?? 340, height = bubble.current?.offsetHeight ?? 280, gap = 18, minTop = 92, maxTop = Math.max(minTop, innerHeight - height - 20);
      const candidates = [{ left: right + gap, top: Math.max(minTop, Math.min(top, maxTop)) }, { left: left - width - gap, top: Math.max(minTop, Math.min(top, maxTop)) }, { left: Math.max(16, Math.min(left, innerWidth - width - 16)), top: bottom + gap }, { left: Math.max(16, Math.min(left, innerWidth - width - 16)), top: top - height - gap }];
      const chosen = candidates.find(p => p.left >= 12 && p.left + width <= innerWidth - 12 && p.top >= minTop && p.top + height <= innerHeight - 12) ?? { left: Math.max(12, innerWidth - width - 20), top: maxTop };
      setPosition(p => Math.abs(p.left - chosen.left) < 1 && Math.abs(p.top - chosen.top) < 1 ? p : chosen);
    };
    const shell = document.querySelector(".app-shell");
    if (shell) { const style = getComputedStyle(shell); setColors(Object.fromEntries(["--theme-surface-solid", "--theme-ink", "--theme-muted", "--theme-line", "--primary-ink"].map(v => [v, style.getPropertyValue(v)])) as CSSProperties); }
    update(); const timer = setInterval(update, 140); return () => clearInterval(timer);
  }, [phase, index, props.theme, attempt, reduced]);

  const exitButton = <button className="tutorial-exit" onClick={exit} type="button"><X size={15} />退出教程</button>;
  if (phase === "intro") return <div className="tutorial-intro tutorial-modal" data-paused={paused || hidden} data-act={intro} role="dialog" aria-modal="true" aria-label="新手指导" ref={modal} tabIndex={-1}>
    <div className="tutorial-cosmos" aria-hidden="true"><div className="tutorial-nebula" /><div className="tutorial-orbit orbit-one" /><div className="tutorial-orbit orbit-two" /><div className="tutorial-world-core"><BookOpen strokeWidth={.6} /><span>IDEAS BECOME CONNECTIONS</span></div>{Array.from({ length: 18 }, (_, i) => <i className="tutorial-mote" key={i} style={{ "--i": i, left: `${(i * 37 + 11) % 100}%`, top: `${(i * 29 + 17) % 100}%` } as CSSProperties} />)}<div className="tutorial-knowledge-lines"><span>材料</span><span>理解</span><span>联系</span></div></div>
    <div className="tutorial-intro-shade" /><header><span className="tutorial-brand"><BookOpen size={19} /> StudyNote AI<small>THE WORLD OF YOUR KNOWLEDGE</small></span>{exitButton}</header>
    <section className="tutorial-intro-copy" key={intro} aria-live="polite"><span className="tutorial-eyebrow">{introduction[intro].label}</span><h1><Lettering text={introduction[intro].title} /></h1><p><Lettering text={introduction[intro].text} start={1050} /></p><span className="tutorial-intro-tag"><Sparkles size={15} />{introduction[intro].tag}</span></section>
    <footer><div className="tutorial-intro-pages">{introduction.map((_, i) => <button type="button" key={i} onClick={() => setIntro(i)} aria-label={`介绍第 ${i + 1} 幕`} aria-pressed={intro === i}><span /></button>)}<button type="button" onClick={() => setPaused(p => !p)} aria-label={paused ? "继续介绍" : "暂停介绍"}>{paused ? <Play size={14} /> : <Pause size={14} />}</button><small>约 17 秒后自动进入带看</small></div><div>{saved?.status === "paused" && saved.introSeen && <button className="tutorial-intro-skip" onClick={() => start(tutorialSteps.find(s => s.id === saved.stepId)!.chapter, true)} type="button">接着上次看</button>}<button className="tutorial-primary" type="button" onClick={() => start()}>跳过介绍<ArrowRight size={16} /></button></div></footer>
  </div>;
  if (phase === "complete") return <div className="tutorial-menu-backdrop tutorial-modal" role="dialog" aria-modal="true" aria-label="新手指导" ref={modal} tabIndex={-1}><section className="tutorial-menu"><header><Compass size={23} /><span>YOUR JOURNEY STARTS HERE</span>{exitButton}</header><div className="tutorial-complete-mark"><Check size={32} /></div><h2>{finishedAll ? "现在，开始自己的学习。" : "带看暂时告一段落。"}</h2><p>{finishedAll ? "阅读、原页核对、加星搜索、专注复习和 AI 整理，已经带你走过一遍。" : "你跳过了部分内容，尚未标记为完整看完。下次可选择接着上次看，回到未看完的段落。"}教程已回到你的个人笔记本；教学数据和主题变化都不会写入正式资料。</p><p>AI 帮你整理，理解由你完成。以后随时从「新手指导」回来。</p><button type="button" className="tutorial-primary" onClick={exit}>回到我的笔记本<ArrowRight size={16} /></button></section></div>;
  if (!portal) return null;
  return createPortal(<div className="tutorial-layer" style={colors} data-step={active.id} data-paused={paused || hidden} data-stage={stage}>
    {!paused && !hidden && <div className="tutorial-playback-shield" aria-hidden="true" />}
    <div className="tutorial-hud"><span className="tutorial-practice-label"><Compass size={15} />自动带看<small>教学示例 · 不写入正式课程</small></span><span className="tutorial-hud-progress">{String(chapterIndex + 1).padStart(2, "0")} / {tutorialChapters.length}<small>{chapter.title}</small></span><button type="button" aria-label={paused ? "继续演示" : "暂停演示"} onClick={togglePause}>{paused ? <Play size={14} /> : <Pause size={14} />}{paused ? "继续" : "暂停"}</button><select aria-label="教程播放速度" value={speed} onChange={e => setSpeed(Number(e.target.value))}><option value={.75}>0.75×</option><option value={1}>1×</option><option value={1.5}>1.5×</option><option value={2}>2×</option></select>{exitButton}</div>
    {rect && <><div className="tutorial-target-ring" aria-hidden="true" style={{ left: rect.left - 5, top: rect.top - 5, width: rect.width + 10, height: rect.height + 10 }} /><div className="tutorial-cursor" data-visible={stage === "move" || stage === "act"} data-click={stage === "act"} aria-hidden="true" style={{ left: cursor.x, top: cursor.y }}><MousePointer2 size={26} fill="#fffaf0" stroke="#775b2f" strokeWidth={1.5} /><i /></div></>}
    <aside ref={bubble} className="tutorial-bubble" aria-label="手把手操作指引" style={{ left: rect ? position.left : undefined, top: rect ? position.top : undefined, ...(!rect ? { right: 20, bottom: 20 } : {}) }}>
      <div className="tutorial-bubble-step"><span>{chapter.title}</span><small>{within + 1} / {chapterSteps.length}</small></div>{within === 0 && <p className="tutorial-bridge">{chapter.bridge}</p>}<h3 aria-live="polite">{active.title}</h3><p>{active.body}</p>
      {active.event === "ocr-copied" && <p className="tutorial-safe-note">这里仅展示复制入口，不自动改写你的剪贴板。</p>}{notice && <p className="tutorial-missing" role="status">{notice}</p>}
      <div className="tutorial-step-timeline" role="progressbar" aria-label="本步演示进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}><span style={{ transform: `scaleX(${progress})` }} /></div>
      <footer><span className="tutorial-action-hint">{hidden ? "切回本页后继续" : paused ? "已暂停，可以慢慢看" : stage === "read" ? "先认识这个功能" : stage === "observe" ? "看看操作后的变化" : "跟随光标，正在演示"}</span><button className="tutorial-restart" type="button" onClick={() => start(active.chapter)}><RotateCcw size={12} />重播本段</button><button className="tutorial-restart" type="button" onClick={() => { const next = tutorialChapters[chapterIndex + 1]; if (next) start(next.id); else finish(); }}><SkipForward size={12} />跳过本段</button></footer>{storageError && <small role="status">本地进度暂时无法保存，仍可继续观看。</small>}
    </aside>
  </div>, portal);
}
