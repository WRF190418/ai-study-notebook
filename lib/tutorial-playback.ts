import type { TutorialStep } from "./tutorial";
export function tutorialTarget(selector: string): HTMLElement | null {
  return Array.from(document.querySelectorAll<HTMLElement>(selector)).find(el => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden") ?? null;
}
export function setDemoInput(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string) {
  const prototype = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(el, value);
  el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
}
export function demoInput(step: TutorialStep) {
  return step.value ?? (step.id === "command" ? "把这篇笔记改为考试复习侧重点" : "按原课件逐页讲解，保留对应原图");
}
// Only runs against the isolated, in-memory practice workspace. Never submit, upload or log out.
export function performDemoAction(step: TutorialStep, searchBack: () => void): boolean {
  const el = tutorialTarget(step.target); if (!el) return false;
  if (step.kind === "confirm" || step.kind === "input") return true;
  if (step.kind === "change") {
    const select = el instanceof HTMLSelectElement ? el : el.querySelector("select"); if (!select) return false;
    setDemoInput(select, step.value ?? "tutorial-course-other"); return true;
  }
  if (step.kind === "event") {
    switch (step.event) {
      case "memo-closed": {
        const input = el.querySelector("textarea"), save = Array.from(el.querySelectorAll<HTMLButtonElement>("button")).find(b => b.textContent?.includes("保存备注"));
        if (!input || !save) return false;
        setDemoInput(input, step.id === "memo-edit" ? "二刷：先自己画知识地图，再核对箭头" : "二刷时自己画一次知识地图"); save.click(); return true;
      }
      case "source-closed": case "image-closed": case "focus-exit": case "ocr-ready": el.click(); return true;
      case "search-back": searchBack(); return true;
      case "focus-tools": el.focus({ preventScroll: true }); return true;
      case "ocr-selected": {
        const words = el.querySelectorAll(".ocr-word"); if (words.length < 3) return false;
        const range = document.createRange(); range.setStart(words[0], 0); range.setEnd(words[2], words[2].childNodes.length);
        const selection = window.getSelection(); selection?.removeAllRanges(); selection?.addRange(range);
        el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true })); return true;
      }
      case "ocr-copied": return true; // Show the button without silently overwriting the real clipboard.
      default: return false;
    }
  }
  if (step.kind === "activate" && el.tagName !== "BUTTON") return true;
  if (el.matches(":disabled")) return false;
  el.click(); return true;
}
