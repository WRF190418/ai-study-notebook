"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { Maximize2, MessageSquareText, Star, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { pageAnchorId, parsePageHeading, type NotePageSection } from "@/lib/note-pages";

type PageStars = {
  noteId: string;
  pages: NotePageSection[];
  pageNotesByKey: Map<string, string>;
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
        img: ({ src, alt, title }) => <NoteImage src={typeof src === "string" ? src : undefined} alt={alt || "笔记插图"} caption={title || alt || ""} />,
        table: ({ children }) => <div className="markdown-table-scroll" tabIndex={0} role="region" aria-label="笔记表格"><table>{children}</table></div>,
        h2: ({ children, node }) => <NotePageHeading level={2} pageStars={pageStars} sourceStart={node?.position?.start.offset}>{children}</NotePageHeading>,
        h3: ({ children, node }) => <NotePageHeading level={3} pageStars={pageStars} sourceStart={node?.position?.start.offset}>{children}</NotePageHeading>
      }} remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
        {normalizeMath(content, compact)}
      </ReactMarkdown>
    </article>
  );
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
      className={`note-page-heading${starred ? " starred-page-heading" : ""}${targeted ? " page-jump-target" : ""}`}
      id={pageAnchorId(pageStars.noteId, pageKey)}
      tabIndex={-1}
    >
      <span>{children}</span>
      <span className="page-heading-actions">
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
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { setFailed(false); }, [src]);
  useEffect(() => { if (expanded) dialog.current?.showModal(); }, [expanded]);
  if (!src) return null;
  return (
    <span className="note-figure" role="figure" aria-label={caption || alt}>
      {failed ? <span className="image-unavailable">图片暂时无法读取：{alt}</span> : (
        <button className="note-image-button" type="button" aria-label={`放大图片：${alt}`} title="放大图片" onClick={() => setExpanded(true)}>
          <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />
          <span className="note-image-zoom"><Maximize2 size={17} /></span>
        </button>
      )}
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
