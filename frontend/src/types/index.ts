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
