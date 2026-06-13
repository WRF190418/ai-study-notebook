"use client";

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
  if (inline) {
    return (
      <span className="markdown markdown-inline">
        <ReactMarkdown
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
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
        {normalizeMath(content, compact)}
      </ReactMarkdown>
    </article>
  );
}

function normalizeMath(content: string, compact: boolean) {
  if (!compact) return content;
  return content.replace(/\$\$([\s\S]*?)\$\$/g, (_, formula: string) => `$${formula.trim()}$`);
}
