const SLIDE_HEADER_RE = /^## Slide (\d+)/gm;
const CONTEXT_RE = /<!--\s*CONTEXT:\s*[\s\S]*?-->/g;

/**
 * Split full lecture notes markdown into a map of slide number -> section content.
 * Mirrors the backend's `## Slide N` header convention.
 */
export function parseSlideNotes(markdown: string): Map<number, string> {
  const sections = new Map<number, string>();
  const matches: { slideNum: number; start: number }[] = [];

  let m: RegExpExecArray | null;
  while ((m = SLIDE_HEADER_RE.exec(markdown)) !== null) {
    matches.push({ slideNum: parseInt(m[1], 10), start: m.index });
  }

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].start;
    const end = i + 1 < matches.length ? matches[i + 1].start : markdown.length;
    const raw = markdown.slice(start, end).trim();
    const cleaned = raw.replace(CONTEXT_RE, '').trim();
    sections.set(matches[i].slideNum, cleaned);
  }

  return sections;
}

/**
 * Extract the notes section for a single slide number.
 * Returns null if no section exists for that slide.
 */
export function getSlideSection(
  markdown: string,
  slideNum: number,
): string | null {
  const sections = parseSlideNotes(markdown);
  return sections.get(slideNum) ?? null;
}
