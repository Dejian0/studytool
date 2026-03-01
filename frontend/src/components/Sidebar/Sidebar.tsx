import CourseSelector from './CourseSelector';
import FileList from './FileList';
import UploadZone from './UploadZone';
import ThemeToggle from '../ThemeToggle';

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
  if (!open) return null;

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h1 className="text-sm font-bold tracking-tight">Study Tool</h1>
        <div className="flex items-center gap-1">
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
