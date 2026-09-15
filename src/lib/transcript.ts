export type TranscriptSegment = {
  time: string;
  text: string;
  offset: number;
  duration: number;
};

export type TranscriptSource = "library" | "website";

export type TranscriptApiResponse = {
  videoId: string;
  title: string;
  author: string | null;
  language: string | null;
  thumbnail: string;
  segments: TranscriptSegment[];
  rawText: string;
  /** `library` = youtube-transcript-plus; `website` = youtube-transcript.ai relay */
  source: TranscriptSource;
};

export const SAMPLE_VIDEOS = [
  {
    label: "Rick Astley",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    id: "dQw4w9WgXcQ",
  },
  {
    label: "Inside Mind of Procrastinator",
    url: "https://www.youtube.com/watch?v=arj7oStGLkU",
    id: "arj7oStGLkU",
  },
] as const;

export function extractVideoId(url: string): string | null {
  const trimmed = url.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

  const ids = extractAllVideoIds(trimmed);
  return ids[0] ?? null;
}

/**
 * Pull every YouTube video ID from arbitrary text (JSON, mixed lines, pasted API payloads, etc.).
 * Dedupes while preserving first-seen order.
 */
export function extractAllVideoIds(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  const push = (id: string | undefined) => {
    if (!id || id.length !== 11 || seen.has(id)) return;
    if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) return;
    seen.add(id);
    out.push(id);
  };

  // Full / partial YouTube URLs anywhere in the blob (same line, JSON, quotes, etc.)
  const urlRe =
    /(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtube\.com\/(?:watch\?(?:[^"\s<>]*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/gi;

  let match: RegExpExecArray | null;
  while ((match = urlRe.exec(text)) !== null) {
    push(match[1]);
  }

  // Bare 11-char IDs only when the whole line is just the id (avoid false hits like "TRANSACTION")
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim().replace(/^["']|["']$/g, "");
    if (/^[a-zA-Z0-9_-]{11}$/.test(t)) push(t);
  }

  return out;
}

export function thumbnailUrl(videoId: string) {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

/** Format seconds → `m:ss` or `h:mm:ss` */
export function formatTimestamp(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}
