import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import Sidebar from './components/Sidebar/Sidebar';
import SlideViewer from './components/SlideViewer/SlideViewer';
import SlideNotesPane from './components/SlideNotesPane/SlideNotesPane';
import NotesPanel from './components/NotesPanel/NotesPanel';
import ChatPanel from './components/ChatPanel/ChatPanel';
import { fetchGenerateNotesStatus } from './api/notes';
import type { GenerateStatus, ChatMessage, ChatContext } from './types';

type Tab = 'slides' | 'notes' | 'principles';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('slides');
  const [slidePages, setSlidePages] = useState<Record<string, number>>({});

  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatContext, setChatContext] = useState<ChatContext | null>(null);

  function handleSelectCourse(course: string) {
    setSelectedCourse(course);
    setSelectedFile(null);
    setActiveTab('slides');
  }

  function handleSelectFile(file: string) {
    setSelectedFile(file);
    setActiveTab('slides');
  }

  const slidePageKey = selectedCourse && selectedFile ? `${selectedCourse}/${selectedFile}` : '';
  const slidePage = slidePages[slidePageKey] ?? 1;
  const setSlidePage = useCallback(
    (page: number) => setSlidePages((prev) => ({ ...prev, [slidePageKey]: page })),
    [slidePageKey],
  );

  useEffect(() => {
    setActiveTab('slides');
  }, [selectedCourse, selectedFile]);

  // Reset chat when switching courses or PDFs
  useEffect(() => {
    setChatMessages([]);
    setChatContext(null);
  }, [selectedCourse, selectedFile]);

  const hasFile = selectedCourse && selectedFile;

  const { data: notesStatus } = useQuery<GenerateStatus>({
    queryKey: ['generateStatus', 'notes', selectedCourse, selectedFile],
    queryFn: () => fetchGenerateNotesStatus(selectedCourse!, selectedFile!),
    enabled: !!hasFile,
    refetchInterval: (query) => {
      return query.state.data?.status === 'running' ? 2000 : 10000;
    },
  });

  function buildDefaultContext(): ChatContext {
    return {
      course: selectedCourse!,
      pdf: selectedFile!,
      page: slidePage,
      selected_text: null,
      cropped_image_base64: null,
      include_slide_notes: true,
    };
  }

  const handleAskAI = useCallback(
    (partialContext?: { selected_text?: string; cropped_image_base64?: string }) => {
      if (!selectedCourse || !selectedFile) return;
      const ctx: ChatContext = {
        course: selectedCourse,
        pdf: selectedFile,
        page: slidePage,
        selected_text: partialContext?.selected_text ?? null,
        cropped_image_base64: partialContext?.cropped_image_base64 ?? null,
        include_slide_notes: true,
      };
      setChatContext(ctx);
      setChatOpen(true);
    },
    [selectedCourse, selectedFile, slidePage],
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((o) => !o)}
        selectedCourse={selectedCourse}
        onSelectCourse={handleSelectCourse}
        selectedFile={selectedFile}
        onSelectFile={handleSelectFile}
      />

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

        {hasFile ? (
          <>
            {/* Tab bar */}
            <div className="flex shrink-0 items-center border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex flex-1">
                <TabButton
                  active={activeTab === 'slides'}
                  onClick={() => setActiveTab('slides')}
                >
                  Slides
                </TabButton>
                <TabButton
                  active={activeTab === 'notes'}
                  onClick={() => setActiveTab('notes')}
                  badge={notesStatus?.status}
                >
                  Lecture Notes
                </TabButton>
                <TabButton
                  active={activeTab === 'principles'}
                  onClick={() => setActiveTab('principles')}
                >
                  Core Principles
                </TabButton>
              </div>
              <button
                onClick={() => {
                  if (!chatOpen && !chatContext) setChatContext(buildDefaultContext());
                  setChatOpen((o) => !o);
                }}
                className={`mr-2 rounded-md p-1.5 transition-colors ${
                  chatOpen
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'
                    : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200'
                }`}
                title={chatOpen ? 'Close AI chat' : 'Open AI chat'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                  <path fillRule="evenodd" d="M10 2c-2.236 0-4.43.18-6.57.524C1.993 2.755 1 3.925 1 5.261v5.478c0 1.336.993 2.506 2.43 2.737.236.038.474.065.713.082l-.49 2.452a.75.75 0 0 0 1.084.785l4.158-2.08A17.483 17.483 0 0 0 10 14.76c2.236 0 4.43-.18 6.57-.524C18.007 13.996 19 12.826 19 11.49V5.26c0-1.336-.993-2.506-2.43-2.737A49.1 49.1 0 0 0 10 2ZM6.75 6a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5ZM6 9.25a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5A.75.75 0 0 1 6 9.25Z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            {/* Tab content */}
            <div className="flex flex-1 overflow-hidden">
              {activeTab === 'slides' && (
                <>
                  {/* Left: slide viewer */}
                  <div className="flex min-w-0 flex-[55] overflow-hidden">
                    <SlideViewer
                      course={selectedCourse}
                      filename={selectedFile}
                      page={slidePage}
                      onPageChange={setSlidePage}
                      onSwitchToNotes={() => setActiveTab('notes')}
                      onAskAI={handleAskAI}
                    />
                  </div>
                  {/* Right: per-slide notes + chat overlay */}
                  <div className="relative flex min-w-0 flex-[45] overflow-hidden">
                    <SlideNotesPane
                      course={selectedCourse}
                      filename={selectedFile}
                      page={slidePage}
                    />
                    {chatOpen && chatContext && (
                      <ChatPanel
                        course={selectedCourse}
                        filename={selectedFile}
                        page={slidePage}
                        context={chatContext}
                        messages={chatMessages}
                        onMessagesChange={setChatMessages}
                        onContextChange={setChatContext}
                        onClose={() => setChatOpen(false)}
                      />
                    )}
                  </div>
                </>
              )}
              {activeTab === 'notes' && (
                <div className="relative flex flex-1 overflow-hidden">
                  <NotesPanel
                    course={selectedCourse}
                    filename={selectedFile}
                    type="notes"
                  />
                  {chatOpen && chatContext && (
                    <ChatPanel
                      course={selectedCourse}
                      filename={selectedFile}
                      page={slidePage}
                      context={chatContext}
                      messages={chatMessages}
                      onMessagesChange={setChatMessages}
                      onContextChange={setChatContext}
                      onClose={() => setChatOpen(false)}
                    />
                  )}
                </div>
              )}
              {activeTab === 'principles' && (
                <div className="relative flex flex-1 overflow-hidden">
                  <NotesPanel
                    course={selectedCourse}
                    filename={selectedFile}
                    type="principles"
                  />
                  {chatOpen && chatContext && (
                    <ChatPanel
                      course={selectedCourse}
                      filename={selectedFile}
                      page={slidePage}
                      context={chatContext}
                      messages={chatMessages}
                      onMessagesChange={setChatMessages}
                      onContextChange={setChatContext}
                      onClose={() => setChatOpen(false)}
                    />
                  )}
                </div>
              )}
            </div>
          </>
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

function TabButton({
  active,
  onClick,
  badge,
  children,
}: {
  active: boolean;
  onClick: () => void;
  badge?: GenerateStatus['status'];
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
        active
          ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
          : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
      }`}
    >
      {children}
      {badge === 'running' && (
        <svg className="size-3.5 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z" />
        </svg>
      )}
      {badge === 'completed' && (
        <svg className="size-3.5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
        </svg>
      )}
    </button>
  );
}
