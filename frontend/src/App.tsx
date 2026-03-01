import { useState } from 'react';
import Sidebar from './components/Sidebar/Sidebar';
import SlideViewer from './components/SlideViewer/SlideViewer';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  function handleSelectCourse(course: string) {
    setSelectedCourse(course);
    setSelectedFile(null);
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((o) => !o)}
        selectedCourse={selectedCourse}
        onSelectCourse={handleSelectCourse}
        selectedFile={selectedFile}
        onSelectFile={setSelectedFile}
      />

      {/* Main viewer area */}
      <main className="relative flex flex-1 flex-col overflow-hidden">
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute left-3 top-3 z-10 rounded-md bg-zinc-200 p-1.5 text-zinc-600 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            title="Open sidebar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
              <path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
            </svg>
          </button>
        )}

        {selectedCourse && selectedFile ? (
          <SlideViewer course={selectedCourse} filename={selectedFile} />
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-zinc-400 dark:text-zinc-600">
              {selectedCourse
                ? 'Select a PDF from the sidebar'
                : 'Select a course to get started'}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
