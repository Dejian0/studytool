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
