"use client";

import { useEffect, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, LoaderCircle, Maximize2, MessageSquareText, Presentation, ScanText, Star, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { pageAnchorId, parsePageHeading, type NotePageSection, type PageSourceImage } from "@/lib/note-pages";

type EnglishOcrLayout = {
  width: number;
  height: number;
  words: Array<{
    text: string;
    confidence: number;
    bbox: { x0: number; y0: number; x1: number; y1: number };
  }>;
};

const englishOcrCache = new Map<string, EnglishOcrLayout>();

type PageStars = {
  noteId: string;
  pages: NotePageSection[];
  pageNotesByKey: Map<string, string>;
  sourceImagesByPage: Map<number, PageSourceImage>;
  starredPageKeys: Set<string>;
  targetPageKey?: string;
  autoOpenNoteKey?: string;
  onCloseNoteEditor: (pageKey: string) => void;
  onSaveNote: (page: { key: string; pageNumber: number }, note: string) => void;
  onToggle: (page: { key: string; pageNumber: number }) => void;
};

export default function MarkdownView({
  content,
  compact = false,
  inline = false,
  pageStars
}: {
  content: string;
  compact?: boolean;
  inline?: boolean;
  pageStars?: PageStars;
}) {
  const appendixMarker = "\n<!-- courseware-appendix -->\n";
  const appendixIndex = !inline && !compact ? content.indexOf(appendixMarker) : -1;
  if (appendixIndex >= 0) {
    const appendix = content.slice(appendixIndex + appendixMarker.length);
    const pages = [...appendix.matchAll(/^### 第 \d+ 页/gm)].length;
    return <>
      <MarkdownView content={content.slice(0, appendixIndex)} pageStars={pageStars} />
      <details className="courseware-appendix"><summary>逐页课件核对 · {pages} 页</summary><MarkdownView content={appendix} /></details>
    </>;
  }
  if (inline) {
    return (
      <span className="markdown markdown-inline">
        <ReactMarkdown
          skipHtml
          components={{
            p: ({ children }) => <>{children}</>
          }}
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
        >
          {normalizeMath(content, true)}
        </ReactMarkdown>
      </span>
    );
  }

  return (
    <article className={`markdown ${compact ? "markdown-compact" : ""}`}>
      <ReactMarkdown skipHtml components={{
        img: MarkdownNoteImage,
        table: ({ children }) => <div className="markdown-table-scroll" tabIndex={0} role="region" aria-label="笔记表格"><table>{children}</table></div>,
        h2: ({ children, node }) => <NotePageHeading level={2} pageStars={pageStars} sourceStart={node?.position?.start.offset}>{children}</NotePageHeading>,
        h3: ({ children, node }) => <NotePageHeading level={3} pageStars={pageStars} sourceStart={node?.position?.start.offset}>{children}</NotePageHeading>
      }} remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
        {normalizeMath(content, compact)}
      </ReactMarkdown>
    </article>
  );
}

function MarkdownNoteImage({ src, alt, title }: ComponentPropsWithoutRef<"img">) {
  return <NoteImage src={typeof src === "string" ? src : undefined} alt={alt || "笔记插图"} caption={title || alt || ""} />;
}

function NotePageHeading({
  children,
  level,
  pageStars,
  sourceStart
}: {
  children: ReactNode;
  level: 2 | 3;
  pageStars?: PageStars;
  sourceStart?: number;
}) {
  const parsed = pageStars ? parsePageHeading(reactNodeText(children)) : null;
  const page = parsed && pageStars ? pageStars.pages.find((item) => item.sourceStart === sourceStart) : undefined;
  const pageKey = page?.key ?? "";
  const starred = Boolean(pageStars && pageKey && pageStars.starredPageKeys.has(pageKey));
  const savedNote = pageStars?.pageNotesByKey.get(pageKey) ?? "";
  const targeted = Boolean(pageStars && pageKey && pageStars.targetPageKey === pageKey);
  const sourceImage = parsed ? pageStars?.sourceImagesByPage.get(parsed.pageNumber) : undefined;
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState(savedNote);
  const Heading = level === 2 ? "h2" : "h3";

  useEffect(() => {
    if (!editorOpen) setDraft(savedNote);
  }, [editorOpen, savedNote]);

  useEffect(() => {
    if (starred && pageStars?.autoOpenNoteKey === pageKey) {
      setDraft(savedNote);
      setEditorOpen(true);
    } else if (!starred) {
      setEditorOpen(false);
    }
  }, [pageKey, pageStars?.autoOpenNoteKey, savedNote, starred]);

  if (!parsed || !pageStars || !page) return <Heading>{children}</Heading>;
  const pageReference = { key: page.key, pageNumber: parsed.pageNumber };

  function saveNote() {
    pageStars?.onSaveNote(pageReference, draft.trim());
    pageStars?.onCloseNoteEditor(pageKey);
    setEditorOpen(false);
  }

  function closeEditor() {
    pageStars?.onCloseNoteEditor(pageKey);
    setEditorOpen(false);
  }

  return (
    <Heading
      className={`note-page-heading${starred ? " starred-page-heading" : ""}${sourceImage ? " has-source-image" : ""}${targeted ? " page-jump-target" : ""}`}
      id={pageAnchorId(pageStars.noteId, pageKey)}
      tabIndex={-1}
    >
      <span>{children}</span>
      <span className="page-heading-actions">
        {sourceImage ? <PageSourceImageButton image={sourceImage} pageNumber={parsed.pageNumber} /> : null}
        {starred ? (
          <button
            aria-label={`${savedNote ? "编辑" : "添加"}页备注：第${parsed.pageNumber}页`}
            className={`page-note-button${savedNote ? " has-note" : ""}`}
            onClick={() => {
              if (editorOpen) {
                closeEditor();
              } else {
                setDraft(savedNote);
                setEditorOpen(true);
              }
            }}
            title={savedNote ? "编辑页备注" : "添加页备注"}
            type="button"
          >
            <MessageSquareText size={17} />
            {savedNote ? <span className="page-note-indicator" /> : null}
          </button>
        ) : null}
        <button
          aria-label={`${starred ? "取消加星" : "加入加星列表"}：第${parsed.pageNumber}页`}
          aria-pressed={starred}
          className={`page-star-button${starred ? " starred" : ""}`}
          onClick={() => pageStars.onToggle(pageReference)}
          title={starred ? "取消加星" : "加入加星列表"}
          type="button"
        >
          <Star fill={starred ? "currentColor" : "none"} size={20} strokeWidth={starred ? 2 : 1.8} />
        </button>
      </span>
      {editorOpen ? (
        <span aria-label={`第${parsed.pageNumber}页备注编辑器`} className="page-note-editor" role="dialog">
          <span className="page-note-editor-title">
            <strong>页备注</strong>
            <small>记录加星目的、易错点或复习提醒</small>
          </span>
          <textarea
            aria-label={`第${parsed.pageNumber}页备注内容`}
            autoFocus
            maxLength={500}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") closeEditor();
              if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) saveNote();
            }}
            placeholder="例如：考试重点；注意符号方向；二刷时重做例题……"
            value={draft}
          />
          <span className="page-note-editor-footer">
            <small>{draft.length}/500</small>
            <button className="page-note-cancel" onClick={closeEditor} type="button">取消</button>
            <button className="page-note-save" onClick={saveNote} type="button">保存备注</button>
          </span>
        </span>
      ) : null}
    </Heading>
  );
}

function PageSourceImageButton({ image, pageNumber }: { image: PageSourceImage; pageNumber: number }) {
  const [expanded, setExpanded] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (expanded) dialog.current?.showModal(); }, [expanded]);

  return <>
    <button
      aria-label={`查看第${pageNumber}页原课件`}
      className="page-source-button"
      onClick={() => setExpanded(true)}
      title="查看该页原课件"
      type="button"
    >
      <Presentation size={17} />
    </button>
    {expanded ? createPortal(
      <dialog
        aria-label={`第${pageNumber}页原课件`}
        className="image-lightbox"
        onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}
        onClose={() => setExpanded(false)}
        ref={dialog}
      >
        <button className="lightbox-close" aria-label="关闭原课件预览" title="关闭" onClick={() => dialog.current?.close()} type="button"><X size={22} /></button>
        <figure>
          <img src={image.src} alt={image.alt} />
          <figcaption>第{pageNumber}页原课件 · {image.alt}</figcaption>
        </figure>
      </dialog>, document.body
    ) : null}
  </>;
}

function reactNodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(reactNodeText).join("");
  if (node && typeof node === "object" && "props" in node) {
    return reactNodeText((node as { props?: { children?: ReactNode } }).props?.children);
  }
  return "";
}

function NoteImage({ src, alt, caption }: { src?: string; alt: string; caption: string }) {
  const [expanded, setExpanded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ocrLayout, setOcrLayout] = useState<EnglishOcrLayout>();
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrActive, setOcrActive] = useState(false);
  const [ocrError, setOcrError] = useState("");
  const [selectedText, setSelectedText] = useState("");
  const [copied, setCopied] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const ocrLayer = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    setFailed(false);
    setOcrLayout(src ? englishOcrCache.get(src) : undefined);
    setOcrActive(false);
    setOcrError("");
    setSelectedText("");
    setCopied(false);
  }, [src]);
  useEffect(() => { if (expanded) dialog.current?.showModal(); }, [expanded]);
  const imageSrc = src ?? "";
  if (!imageSrc) return null;

  async function toggleOcr() {
    if (ocrLayout) {
      setOcrActive((value) => !value);
      setSelectedText("");
      setCopied(false);
      return;
    }

    setOcrBusy(true);
    setOcrError("");
    try {
      const imageResponse = await fetch(imageSrc);
      if (!imageResponse.ok) throw new Error("IMAGE_FETCH_FAILED");
      const image = await imageResponse.blob();
      const form = new FormData();
      form.set("image", image, `note-image.${image.type.split("/")[1] || "png"}`);
      const response = await fetch("/api/ocr/english", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok || !data.layout) throw new Error(data.error || "OCR_FAILED");
      const layout = data.layout as EnglishOcrLayout;
      if (!layout.words.length) {
        setOcrError("没有识别到清晰的英文文字。");
        return;
      }
      englishOcrCache.set(imageSrc, layout);
      setOcrLayout(layout);
      setOcrActive(true);
    } catch (error) {
      setOcrError(error instanceof Error && /[\u4e00-\u9fff]/.test(error.message) ? error.message : "英文识别失败，请稍后重试。");
    } finally {
      setOcrBusy(false);
    }
  }

  function captureSelectedText() {
    window.setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !ocrLayer.current?.contains(selection.anchorNode)) return;
      const text = selection.toString().replace(/\s+/g, " ").trim();
      if (text) {
        setSelectedText(text);
        setCopied(false);
      }
    }, 0);
  }

  async function copySelectedText() {
    if (!selectedText) return;
    try {
      await navigator.clipboard.writeText(selectedText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setOcrError("复制失败，请使用右键菜单中的“复制”。");
    }
  }

  return (
    <span className="note-figure" role="figure" aria-label={caption || alt}>
      {failed ? <span className="image-unavailable">图片暂时无法读取：{alt}</span> : (
        <span className={`note-image-stage${ocrActive ? " selecting-text" : ""}`}>
          <button className="note-image-button" type="button" aria-label={`放大图片：${alt}`} title="放大图片" onClick={() => setExpanded(true)}>
            <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />
          </button>
          {ocrActive && ocrLayout ? (
            <span
              aria-label="可选择的图片英文文字"
              className="ocr-text-layer"
              onMouseUp={captureSelectedText}
              ref={ocrLayer}
            >
              {ocrLayout.words.map((word, index) => {
                const width = ((word.bbox.x1 - word.bbox.x0) / ocrLayout.width) * 100;
                const height = ((word.bbox.y1 - word.bbox.y0) / ocrLayout.height) * 100;
                return (
                  <span
                    className="ocr-word"
                    key={`${word.bbox.x0}-${word.bbox.y0}-${index}`}
                    style={{
                      left: `${(word.bbox.x0 / ocrLayout.width) * 100}%`,
                      top: `${(word.bbox.y0 / ocrLayout.height) * 100}%`,
                      width: `${width}%`,
                      height: `${height}%`,
                      fontSize: `${Math.max(height, 1.2)}cqh`
                    }}
                  >
                    {word.text}{" "}
                  </span>
                );
              })}
            </span>
          ) : null}
          <span className="note-image-tools">
            <button
              aria-label={`${ocrActive ? "关闭文字选择" : "识别并选择英文"}：${alt}`}
              aria-pressed={ocrActive}
              className={`note-image-ocr${ocrActive ? " active" : ""}`}
              disabled={ocrBusy}
              onClick={() => void toggleOcr()}
              title={ocrActive ? "关闭文字选择" : "识别并选择英文"}
              type="button"
            >
              {ocrBusy ? <LoaderCircle className="spin" size={17} /> : <ScanText size={17} />}
              <span>{ocrBusy ? "识别中" : ocrActive ? "选择中" : "选择文字"}</span>
            </button>
            <button aria-label={`放大图片：${alt}`} className="note-image-zoom" onClick={() => setExpanded(true)} title="放大图片" type="button">
              <Maximize2 size={17} />
            </button>
          </span>
          {ocrActive ? (
            <span className="ocr-selection-bar">
              <span>{selectedText ? `已选择：${selectedText.slice(0, 54)}${selectedText.length > 54 ? "…" : ""}` : "拖动选择英文，可直接右键复制"}</span>
              {selectedText ? (
                <button onClick={() => void copySelectedText()} type="button">
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                  {copied ? "已复制" : "复制"}
                </button>
              ) : null}
            </span>
          ) : null}
        </span>
      )}
      {ocrError ? <span className="ocr-error" role="status">{ocrError}</span> : null}
      {caption ? <span className="note-image-caption">{caption}</span> : null}
      {expanded ? createPortal(
        <dialog className="image-lightbox" ref={dialog} aria-label="图片预览" onClose={() => setExpanded(false)} onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}>
          <button className="lightbox-close" aria-label="关闭图片预览" title="关闭" onClick={() => dialog.current?.close()}><X size={22} /></button>
          <figure><img src={src} alt={alt} /><figcaption>{caption}</figcaption></figure>
        </dialog>, document.body
      ) : null}
    </span>
  );
}

function normalizeMath(content: string, compact: boolean) {
  if (!compact) return content;
  return content.replace(/\$\$([\s\S]*?)\$\$/g, (_, formula: string) => `$${formula.trim()}$`);
}
