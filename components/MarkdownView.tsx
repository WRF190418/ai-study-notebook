"use client";

import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

export default function MarkdownView({ content, compact = false }: { content: string; compact?: boolean }) {
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
