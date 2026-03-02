import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPrompts, fetchPrompt, updatePrompt } from '../../api/prompts';

const PROMPT_LABELS: Record<string, string> = {
  'default_explainer.txt': 'Chat — Default Explainer',
  'socratic_tutor.txt': 'Chat — Socratic Tutor',
  'exam_analyzer.txt': 'Exam Analyzer',
  'lecture_notes_generator.txt': 'Lecture Notes Generator',
  'slide_explanation_instructions.txt': 'Slide Explanation Instructions',
  'core_principles_system.txt': 'Core Principles — System',
  'core_principles_instructions.txt': 'Core Principles — Instructions',
};

function labelFor(name: string): string {
  return PROMPT_LABELS[name] ?? name.replace(/_/g, ' ').replace(/\.txt$/, '');
}

interface Props {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: Props) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [saved, setSaved] = useState(false);

  const { data: promptList = [] } = useQuery({
    queryKey: ['prompts'],
    queryFn: fetchPrompts,
  });

  const { data: promptData, isFetching } = useQuery({
    queryKey: ['prompt', selected],
    queryFn: () => fetchPrompt(selected!),
    enabled: !!selected,
  });

  useEffect(() => {
    if (promptList.length > 0 && !selected) {
      setSelected(promptList[0]);
    }
  }, [promptList, selected]);

  useEffect(() => {
    if (promptData) {
      setDraft(promptData.content);
      setSaved(false);
    }
  }, [promptData]);

  const mutation = useMutation({
    mutationFn: ({ name, content }: { name: string; content: string }) =>
      updatePrompt(name, content),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['prompt', vars.name] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const handleSave = useCallback(() => {
    if (!selected) return;
    mutation.mutate({ name: selected, content: draft });
  }, [selected, draft, mutation]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [handleSave, onClose],
  );

  const isDirty = promptData ? draft !== promptData.content : false;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={handleKeyDown}
    >
      <div className="flex h-[80vh] w-[64rem] max-w-[95vw] flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-700">
          <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
            Prompt Settings
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Prompt list */}
          <nav className="w-60 shrink-0 overflow-y-auto border-r border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50">
            <ul className="py-2">
              {promptList.map((name) => (
                <li key={name}>
                  <button
                    onClick={() => setSelected(name)}
                    className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                      selected === name
                        ? 'bg-blue-50 font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-700/50'
                    }`}
                  >
                    {labelFor(name)}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Editor */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {selected ? (
              <>
                <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2 dark:border-zinc-700">
                  <div>
                    <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                      {labelFor(selected)}
                    </h3>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">{selected}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {saved && (
                      <span className="text-xs font-medium text-green-600 dark:text-green-400">
                        Saved
                      </span>
                    )}
                    {isDirty && !saved && (
                      <span className="text-xs text-amber-600 dark:text-amber-400">
                        Unsaved changes
                      </span>
                    )}
                    <button
                      onClick={handleSave}
                      disabled={!isDirty || mutation.isPending}
                      className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-40"
                    >
                      {mutation.isPending ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden p-4">
                  {isFetching ? (
                    <div className="flex h-full items-center justify-center">
                      <span className="text-sm text-zinc-400">Loading...</span>
                    </div>
                  ) : (
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      spellCheck={false}
                      className="h-full w-full resize-none rounded-lg border border-zinc-300 bg-zinc-50 p-4 font-mono text-sm leading-relaxed text-zinc-800 focus:border-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
                    />
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-sm text-zinc-400">Select a prompt to edit</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer hint */}
        <div className="border-t border-zinc-200 px-5 py-2 dark:border-zinc-700">
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Press <kbd className="rounded border border-zinc-300 px-1 py-0.5 text-[10px] dark:border-zinc-600">Ctrl+S</kbd> to save
            {' · '}
            <kbd className="rounded border border-zinc-300 px-1 py-0.5 text-[10px] dark:border-zinc-600">Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
}
