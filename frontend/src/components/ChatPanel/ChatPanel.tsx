import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { sendChatMessage } from '../../api/chat';
import { fetchPrompts } from '../../api/prompts';
import type { ChatContext, ChatMessage as ChatMessageType } from '../../types';
import ChatMessage from './ChatMessage';
import ContextIndicator from './ContextIndicator';
import ModelSelect from '../common/ModelSelect';

interface Props {
  course: string;
  filename: string;
  page: number;
  context: ChatContext;
  messages: ChatMessageType[];
  onMessagesChange: (messages: ChatMessageType[]) => void;
  onContextChange: (context: ChatContext) => void;
  onClose: () => void;
}

export default function ChatPanel({
  course,
  filename,
  page,
  context,
  messages,
  onMessagesChange,
  onContextChange,
  onClose,
}: Props) {
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState('gpt-5-mini');
  const [systemPrompt, setSystemPrompt] = useState('default_explainer.txt');
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const CHAT_PROMPTS = ['default_explainer.txt', 'socratic_tutor.txt', 'exam_analyzer.txt'];

  const { data: allPrompts = [] } = useQuery({
    queryKey: ['prompts'],
    queryFn: fetchPrompts,
    staleTime: 60_000,
  });

  const chatPrompts = allPrompts.length > 0
    ? allPrompts.filter((p) => CHAT_PROMPTS.includes(p))
    : CHAT_PROMPTS;

  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, streamingContent]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    setInput('');
    setError(null);

    const userMessage: ChatMessageType = { role: 'user', content: text };
    const updatedMessages = [...messages, userMessage];
    onMessagesChange(updatedMessages);

    setStreaming(true);
    setStreamingContent('');

    const controller = new AbortController();
    abortRef.current = controller;

    let accumulated = '';

    await sendChatMessage({
      model,
      system_prompt: systemPrompt,
      message: text,
      context: { ...context, page },
      history: messages,
      signal: controller.signal,
      onChunk: (chunk) => {
        accumulated += chunk;
        setStreamingContent(accumulated);
      },
      onDone: () => {
        if (accumulated) {
          onMessagesChange([
            ...updatedMessages,
            { role: 'assistant', content: accumulated },
          ]);
        }
        setStreaming(false);
        setStreamingContent('');
      },
      onError: (err) => {
        setError(err);
        setStreaming(false);
        setStreamingContent('');
      },
    }).catch((err) => {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Connection failed');
      }
      setStreaming(false);
      setStreamingContent('');
    });
  }, [input, streaming, messages, onMessagesChange, context, page, model, systemPrompt]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleStop() {
    abortRef.current?.abort();
    abortRef.current = null;
  }

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-white/95 backdrop-blur-sm dark:bg-zinc-950/95">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">AI Chat</h3>
        <div className="flex items-center gap-2">
          <ModelSelect
            value={model}
            onChange={setModel}
            className="rounded border border-zinc-300 bg-white px-1.5 py-0.5 text-xs dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
          />
          <button
            onClick={onClose}
            className="rounded p-1 text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-200"
            title="Close chat"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Prompt selector */}
      <div className="border-b border-zinc-200 px-3 py-1.5 dark:border-zinc-800">
        <select
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
        >
          {chatPrompts.map((p) => (
            <option key={p} value={p}>
              {p.replace(/_/g, ' ').replace(/\.txt$/, '').replace(/\b\w/g, (c) => c.toUpperCase())}
            </option>
          ))}
        </select>
      </div>

      {/* Context indicator */}
      <ContextIndicator context={context} page={page} onUpdate={onContextChange} />

      {/* Messages */}
      <div ref={messagesRef} className="flex flex-1 flex-col gap-3 overflow-y-auto px-3 py-3">
        {messages.length === 0 && !streaming && (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-center text-sm text-zinc-400 dark:text-zinc-600">
              Ask a question about<br />
              <span className="font-medium text-zinc-500 dark:text-zinc-400">{filename}</span>
              <br />Slide {page}
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <ChatMessage key={i} role={msg.role} content={msg.content} />
        ))}
        {streaming && streamingContent && (
          <ChatMessage role="assistant" content={streamingContent} isStreaming />
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mx-3 mb-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Input */}
      <div className="border-t border-zinc-200 px-3 py-2 dark:border-zinc-800">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this slide..."
            rows={1}
            className="max-h-32 min-h-[2.25rem] flex-1 resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500"
          />
          {streaming ? (
            <button
              onClick={handleStop}
              className="shrink-0 rounded-lg bg-red-600 p-2 text-white transition-colors hover:bg-red-700"
              title="Stop generating"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
                <rect x="5" y="5" width="10" height="10" rx="1" />
              </svg>
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="shrink-0 rounded-lg bg-blue-600 p-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-40"
              title="Send message"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
                <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.926A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.897 28.897 0 0 0 15.293-7.155.75.75 0 0 0 0-1.114A28.897 28.897 0 0 0 3.105 2.288Z" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
