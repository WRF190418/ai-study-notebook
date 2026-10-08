"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Maximize2, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

export default function MarkdownView({
  content,
  compact = false,
  inline = false
}: {
  content: string;
  compact?: boolean;
  inline?: boolean;
}) {
  const appendixMarker = "\n<!-- courseware-appendix -->\n";
  const appendixIndex = !inline && !compact ? content.indexOf(appendixMarker) : -1;
  if (appendixIndex >= 0) {
    const appendix = content.slice(appendixIndex + appendixMarker.length);
    const pages = [...appendix.matchAll(/^### 第 \d+ 页/gm)].length;
    return <>
      <MarkdownView content={content.slice(0, appendixIndex)} />
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
        table: ({ children }) => <div className="markdown-table-scroll" tabIndex={0} role="region" aria-label="笔记表格"><table>{children}</table></div>
      }} remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
        {normalizeMath(content, compact)}
      </ReactMarkdown>
    </article>
  );
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
