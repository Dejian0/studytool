import { memo } from 'react';
import MarkdownRenderer from '../common/MarkdownRenderer';

interface Props {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

export default memo(function ChatMessage({ role, content, isStreaming }: Props) {
  if (role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-blue-600 px-4 py-2.5 text-sm text-white">
          <p className="whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-zinc-100 px-4 py-2.5 dark:bg-zinc-800">
        <MarkdownRenderer content={content} className="text-sm" />
        {isStreaming && (
          <span className="mt-1 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-zinc-400 dark:bg-zinc-500" />
        )}
      </div>
    </div>
  );
});
