import { useState } from 'react';
import CourseSelector from './CourseSelector';
import FileList from './FileList';
import UploadZone from './UploadZone';
import ThemeToggle from '../ThemeToggle';
import SettingsModal from '../SettingsModal/SettingsModal';

interface Props {
  open: boolean;
  onToggle: () => void;
  selectedCourse: string | null;
  onSelectCourse: (course: string) => void;
  selectedFile: string | null;
  onSelectFile: (file: string) => void;
}

export default function Sidebar({
  open,
  onToggle,
  selectedCourse,
  onSelectCourse,
  selectedFile,
  onSelectFile,
}: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (!open) return null;

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h1 className="text-sm font-bold tracking-tight">Study Tool</h1>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSettingsOpen(true)}
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            title="Prompt settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
              <path fillRule="evenodd" d="M7.84 1.804A1 1 0 0 1 8.82 1h2.36a1 1 0 0 1 .98.804l.331 1.652a6.993 6.993 0 0 1 1.929 1.115l1.598-.54a1 1 0 0 1 1.186.447l1.18 2.044a1 1 0 0 1-.205 1.251l-1.267 1.113a7.047 7.047 0 0 1 0 2.228l1.267 1.113a1 1 0 0 1 .206 1.25l-1.18 2.045a1 1 0 0 1-1.187.447l-1.598-.54a6.993 6.993 0 0 1-1.929 1.115l-.33 1.652a1 1 0 0 1-.98.804H8.82a1 1 0 0 1-.98-.804l-.331-1.652a6.993 6.993 0 0 1-1.929-1.115l-1.598.54a1 1 0 0 1-1.186-.447l-1.18-2.044a1 1 0 0 1 .205-1.251l1.267-1.114a7.05 7.05 0 0 1 0-2.227L1.821 7.773a1 1 0 0 1-.206-1.25l1.18-2.045a1 1 0 0 1 1.187-.447l1.598.54A6.992 6.992 0 0 1 7.51 3.456l.33-1.652ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
            </svg>
          </button>
          <ThemeToggle />
          <button
            onClick={onToggle}
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            title="Close sidebar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
              <path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}

      {/* Scrollable content */}
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-4">
        <CourseSelector selected={selectedCourse} onSelect={onSelectCourse} />

        {selectedCourse && (
          <>
            <FileList
              course={selectedCourse}
              selected={selectedFile}
              onSelect={onSelectFile}
            />
            <UploadZone course={selectedCourse} />
          </>
        )}
      </div>
    </aside>
  );
}
