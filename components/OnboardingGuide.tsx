"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, BookOpen, Check, ChevronLeft, ChevronRight, Compass, CornerUpLeft, HelpCircle, LocateFixed, Minimize2, MousePointer2, X } from "lucide-react";
import { guideSteps, type GuideDestination } from "@/lib/onboarding";

type Props = {
  step: number;
  completed: boolean;
  destination: GuideDestination;
  onStepChange: (step: number) => void;
  onPractice: (step: number) => void;
  onClose: () => void;
};

export default function OnboardingGuide({ step, completed, destination, onStepChange, onPractice, onClose }: Props) {
  const card = useRef<HTMLElement>(null);
  const article = useRef<HTMLElement>(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  const current = guideSteps[step];
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    card.current?.focus();
    function keys(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); close.current(); }
      if (event.key !== "Tab") return;
      const elements = card.current?.querySelectorAll<HTMLElement>('button:not(:disabled), [tabindex="0"]');
      if (!elements?.length) return;
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === card.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === card.current)) { event.preventDefault(); first.focus(); }
    }
    window.addEventListener("keydown", keys);
    return () => { window.removeEventListener("keydown", keys); if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);
  useEffect(() => { if (article.current) article.current.scrollTop = 0; }, [step]);
  return (
    <div className="onboarding-backdrop" role="dialog" aria-modal="true" aria-label="新手指导" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="guide-library" ref={card} tabIndex={-1}>
        <header className="guide-library-heading">
          <div className="guide-emblem"><Compass size={24} /></div>
          <div><span className="guide-eyebrow">{completed ? "随时回来，按需探索" : "从这里开始，一步一步来"}</span><h2>你的笔记本使用向导</h2><p>先看怎么做，再到真实页面亲手试一试。</p></div>
          <button type="button" className="guide-icon-button" aria-label="关闭新手指导" onClick={onClose}><X size={20} /></button>
        </header>
        <div className="guide-library-body">
          <nav className="guide-chapters" aria-label="新手指导目录">
            <span className="guide-nav-heading">学习路线 <small>{guideSteps.length} 个小步骤</small></span>
            {guideSteps.map((item, index) => <button type="button" key={item.id} className={step === index ? "active" : ""} aria-current={step === index ? "step" : undefined} aria-label={`跳到新手指导第 ${index + 1} 步：${item.label}`} onClick={() => onStepChange(index)}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item.label}</strong>{step === index && <ChevronRight size={14} />}</button>)}
            <p className="guide-nav-note"><BookOpen size={15} />不用一次看完。以后点左侧「新手指导」，随时回到这里。</p>
          </nav>
          <article className="guide-article" ref={article} aria-label="当前步骤说明" tabIndex={0}>
            <span className="guide-step-label">STEP {String(step + 1).padStart(2, "0")} <span>/ {guideSteps.length}</span></span>
            <h3>{current.title}</h3><p className="guide-intro">{current.intro}</p>
            <div className="guide-location"><LocateFixed size={16} /><span>{current.location}</span></div>
            <ol className="guide-instructions">{current.instructions.map((instruction, index) => <li key={instruction}><span aria-hidden="true">{index + 1}</span><p>{instruction}</p></li>)}</ol>
            <div className="guide-outcome"><Check size={17} /><p>{current.result}</p></div>
            <aside className="guide-tip"><HelpCircle size={16} /><p>{current.tip}</p></aside>
            <div className={`guide-destination${destination.unavailable ? " unavailable" : ""}`} role="status"><span>{destination.unavailable ? "先准备资料" : "这次带你前往"}</span><strong>{destination.unavailable ?? destination.context}</strong>{destination.notice && !destination.unavailable && <small>{destination.notice}</small>}</div>
            <button type="button" className="guide-launch" disabled={Boolean(destination.unavailable && current.id === "organizer")} onClick={() => onPractice(destination.unavailable ? guideSteps.findIndex(item => item.id === "organizer") : step)}><MousePointer2 size={17} />{destination.unavailable ? current.id === "organizer" ? "请先在 Codex 对话中创建课程" : "先去了解如何准备笔记" : current.action}<ArrowRight size={17} /></button>
            <p className="guide-safe-note">只跳转和提示；不会替你加星、修改笔记或执行 AI。</p>
          </article>
        </div>
        <footer className="guide-library-footer"><button className="guide-skip" onClick={onClose} type="button">跳过</button><span>可直接选目录，不必按顺序</span><div><button type="button" className="guide-secondary" disabled={step === 0} onClick={() => onStepChange(step - 1)}><ChevronLeft size={15} />上一步</button><button type="button" className="guide-secondary" onClick={() => step === guideSteps.length - 1 ? onClose() : onStepChange(step + 1)}>{step === guideSteps.length - 1 ? "完成" : "下一步"}<ChevronRight size={15} /></button></div></footer>
      </section>
    </div>
  );
}

export function GuidedPractice({ step, destination, onPractice, onLibrary, onClose }: Pick<Props, "step" | "destination" | "onPractice" | "onClose"> & { onLibrary: () => void }) {
  const [collapsed, setCollapsed] = useState(guideSteps[step].id === "themes");
  const [position, setPosition] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [dockLeft, setDockLeft] = useState<number>();
  const dock = useRef<HTMLElement>(null);
  const current = guideSteps[step];
  // The theme picker occupies most of the screen; leave every theme card clickable.
  useEffect(() => { setCollapsed(guideSteps[step].id === "themes"); }, [step]);
  useEffect(() => {
    let frame = 0;
    let initial = true;
    let watched: Element | null = null;
    const resize = new ResizeObserver(() => schedule());
    function measure() {
      const target = destination.selector ? document.querySelector<HTMLElement>(destination.selector) : null;
      if (target && initial) {
        // A real image in the original-slide appendix may be inside a closed <details>.
        for (let parent = target.parentElement; parent; parent = parent.parentElement) {
          if (parent instanceof HTMLDetailsElement) parent.open = true;
        }
        if (target.getClientRects().length) {
          initial = false;
          target.scrollIntoView({ block: "center", inline: "nearest", behavior: "auto" });
          if (current.id === "search") target.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
        }
      }
      if (target !== watched) { resize.disconnect(); if (target) resize.observe(target); if (dock.current) resize.observe(dock.current); watched = target; }
      if (!target || !target.getClientRects().length) { setPosition(null); setDockLeft(undefined); return; }
      const box = target.getBoundingClientRect();
      let left = Math.max(5, box.left), top = Math.max(5, box.top), right = Math.min(innerWidth - 5, box.right), bottom = Math.min(innerHeight - 5, box.bottom);
      for (let parent = target.parentElement; parent; parent = parent.parentElement) {
        const style = getComputedStyle(parent), clip = parent.getBoundingClientRect();
        if (/(auto|scroll|hidden|clip)/.test(style.overflowY)) { top = Math.max(top, clip.top); bottom = Math.min(bottom, clip.bottom); }
        if (/(auto|scroll|hidden|clip)/.test(style.overflowX)) { left = Math.max(left, clip.left); right = Math.min(right, clip.right); }
      }
      const next = right > left && bottom > top ? { left: left - 4, top: top - 4, width: right - left + 8, height: bottom - top + 8 } : null;
      const width = dock.current?.offsetWidth ?? 344, height = dock.current?.offsetHeight ?? 400;
      const overlapsDock = right > innerWidth - 24 - width - 12 && left < innerWidth - 12 && bottom > innerHeight - 23 - height - 12;
      const sidebar = document.querySelector(".sidebar")?.getBoundingClientRect().right ?? 0;
      setDockLeft(innerWidth > 720 && overlapsDock ? Math.max(16, Math.min(sidebar + 20, innerWidth - width - 20)) : undefined);
      setPosition(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    }
    function schedule() { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); }
    const observer = new MutationObserver(schedule);
    observer.observe(document.querySelector(".app-shell") ?? document.body, { childList: true, subtree: true });
    document.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    schedule();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); resize.disconnect(); document.removeEventListener("scroll", schedule, true); window.removeEventListener("resize", schedule); };
  }, [destination.selector, current.id]);

  return <>
    {!collapsed && position && <div className="guide-target-ring" style={position} aria-hidden="true" />}
    <aside className={`guide-practice${collapsed ? " collapsed" : ""}`} aria-label="手把手操作指引" ref={dock} style={dockLeft === undefined ? undefined : { left: dockLeft, right: "auto" }}>
      {collapsed ? <button type="button" className="guide-reopen" aria-label="展开操作指引" onClick={() => setCollapsed(false)}><Compass size={17} /><span>操作指引 · {step + 1}/{guideSteps.length}</span><ChevronLeft size={15} /></button> : <>
        <header><span className="guide-practice-mark"><Compass size={17} /></span><div><small>跟着做 · {step + 1}/{guideSteps.length}</small><h2>{current.label}</h2></div><button type="button" className="guide-icon-button" aria-label="收起操作指引" onClick={() => setCollapsed(true)}><Minimize2 size={15} /></button><button type="button" className="guide-icon-button" aria-label="结束新手指导" onClick={onClose}><X size={16} /></button></header>
        <div className="guide-practice-content"><p className="guide-practice-location">{current.location}</p><ol>{current.instructions.map((instruction, index) => <li key={instruction}><span>{index + 1}</span>{instruction}</li>)}</ol><p className="guide-practice-context">{destination.context}</p>{destination.notice && <p className="guide-practice-notice">{destination.notice}</p>}</div>
        <footer><button type="button" onClick={onLibrary}><CornerUpLeft size={14} />完整指引</button><button type="button" onClick={() => onPractice(step)}><LocateFixed size={14} />重新定位</button><button type="button" className="guide-practice-next" onClick={() => step === guideSteps.length - 1 ? onClose() : onPractice(step + 1)}>{step === guideSteps.length - 1 ? "完成" : "下一步"}<ChevronRight size={14} /></button></footer>
      </>}
    </aside>
  </>;
}
