"use client";

import { useEffect, useRef, useState } from "react";
import GalacticScenery from "@/components/GalacticScenery";

export default function GalacticCover({ onFinish }: { onFinish: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const opening = useRef(false);
  const [isOpening, setOpening] = useState(false);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    element?.querySelector<HTMLButtonElement>(".guide-book-front")?.focus();
    return () => { if (timer.current) clearTimeout(timer.current); element?.close(); };
  }, []);
  function open() {
    if (opening.current) return;
    opening.current = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { onFinish(); return; }
    setOpening(true);
    timer.current = setTimeout(onFinish, 680);
  }
  return <dialog ref={dialog} className="guide-cover-dialog" aria-labelledby="guide-cover-title" onCancel={e => { e.preventDefault(); onFinish(); }} data-opening={isOpening}>
    <div className="guide-cover-cosmos"><GalacticScenery /></div>
    <h2 id="guide-cover-title" className="sr-only">银河系搭车客指南封面</h2>
    <header className="guide-cover-caption"><span>一份随身指南。一个尚未解释的宇宙。</span><button type="button" onClick={onFinish}>直接进入索引 <span aria-hidden="true">↗</span></button></header>
    <div className="guide-cover-stage">
      <div className="guide-closed-book">
        <button type="button" className="guide-book-front" aria-label="打开随身指南" onClick={open} autoFocus>
          <span className="guide-cover-edition">THE HITCHHIKER’S GUIDE<br />TO THE GALAXY</span>
          <strong>DON’T<br />PANIC<span>.</span></strong>
          <span className="guide-cover-rule" aria-hidden="true" />
          <span className="guide-cover-chinese">银河系搭车客指南</span>
          <span className="guide-cover-sticker">EARTH<br /><b>0042</b><small>随身携带</small></span>
          <span className="guide-cover-smallprint">修订中。宇宙暂未对此发表意见。</span>
        </button>
      </div>
      <p className="guide-cover-invitation">点击封面，打开指南 <span aria-hidden="true">↗</span></p>
    </div>
    <footer className="guide-cover-bottom"><span>PERSONAL FIELD COPY / 随身本</span><span>封面可以打开。宇宙暂不支持此操作。</span></footer>
  </dialog>;
}
