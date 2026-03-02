export interface TextSpan {
  text: string;
  font: string;
  size: number;
}

export interface TextLine {
  bbox: [number, number, number, number];
  spans: TextSpan[];
}

export interface TextBlock {
  id: number;
  bbox: [number, number, number, number];
  text: string;
  lines: TextLine[];
}

export interface PageText {
  page: number;
  width: number;
  height: number;
  blocks: TextBlock[];
}

export interface GenerateStatus {
  status: 'idle' | 'running' | 'completed' | 'failed';
  current_slide: number;
  total_slides: number;
  error: string | null;
}

export interface NoteContent {
  filename: string;
  content: string;
}

export interface ChatContext {
  course: string;
  pdf: string;
  page: number;
  selected_text?: string | null;
  cropped_image_base64?: string | null;
  include_slide_notes: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type Providers = Record<string, string[]>;
