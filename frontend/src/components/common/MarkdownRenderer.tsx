import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface Props {
  content: string;
  className?: string;
}

/**
 * Normalize LaTeX delimiters that remark-math doesn't handle.
 * LLMs frequently emit \(...\) and \[...\] even when prompted for $...$ / $$...$$.
 */
function normalizeLatexDelimiters(text: string): string {
  // \[...\] → $$...$$  (display math)
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$');
  // \(...\) → $...$    (inline math)
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');
  return text;
}

export default function MarkdownRenderer({ content, className = '' }: Props) {
  const normalized = useMemo(() => normalizeLatexDelimiters(content), [content]);

  return (
    <div
      className={`
        prose prose-zinc dark:prose-invert
        max-w-none
        prose-headings:font-semibold
        prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
        prose-p:leading-relaxed
        prose-pre:bg-zinc-100 prose-pre:dark:bg-zinc-800
        prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
        prose-a:text-blue-600 prose-a:dark:text-blue-400
        prose-strong:text-zinc-900 prose-strong:dark:text-zinc-100
        prose-img:rounded-lg
        ${className}
      `}
    >
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {normalized}
      </ReactMarkdown>
    </div>
  );
}
