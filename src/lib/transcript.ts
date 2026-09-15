export type TranscriptSegment = {
  time: string;
  text: string;
  offset: number;
  duration: number;
};

export type TranscriptApiResponse = {
  videoId: string;
  title: string;
  author: string | null;
  language: string | null;
  thumbnail: string;
  segments: TranscriptSegment[];
  rawText: string;
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

  const regExp =
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/|live\/)|youtu\.be\/)([^"&?/\s]{11})/;
  const match = trimmed.match(regExp);
  return match ? match[1] : null;
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
