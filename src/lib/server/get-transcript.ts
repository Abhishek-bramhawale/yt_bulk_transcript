import {
  fetchTranscript,
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptNotAvailableLanguageError,
  YoutubeTranscriptTooManyRequestError,
  YoutubeTranscriptVideoUnavailableError,
  YoutubeTranscriptInvalidVideoIdError,
  type TranscriptConfig,
  type TranscriptResult,
  type TranscriptSegment as YtSegment,
} from "youtube-transcript-plus";
import {
  extractVideoId,
  formatTimestamp,
  thumbnailUrl,
  type TranscriptApiResponse,
  type TranscriptSegment,
} from "@/lib/transcript";

function browserUserAgent() {
  return (
    process.env.YT_USER_AGENT ||
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
  );
}

/**
 * Optional HTTP(S) proxy for YouTube requests.
 * Datacenter IPs (Vercel) are often blocked — set YT_PROXY_URL if needed,
 * e.g. http://user:pass@proxy-host:port
 */
function proxyFetchFactory() {
  const proxyUrl = process.env.YT_PROXY_URL?.trim();
  if (!proxyUrl) return undefined;

  // undici is only needed when a proxy is configured
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const undici = require("undici") as typeof import("undici");
  const agent = new undici.ProxyAgent(proxyUrl);

  type FetchArgs = {
    url: string;
    method?: "GET" | "POST";
    body?: string;
    headers?: Record<string, string>;
    lang?: string;
    userAgent?: string;
    signal?: AbortSignal;
  };

  return async ({
    url,
    method,
    body,
    headers,
    lang,
    userAgent,
    signal,
  }: FetchArgs) => {
    const res = await undici.fetch(url, {
      method: method ?? "GET",
      body,
      signal,
      dispatcher: agent,
      headers: {
        ...(lang ? { "Accept-Language": lang } : {}),
        ...(userAgent ? { "User-Agent": userAgent } : {}),
        ...headers,
      },
    });
    // undici Response is fetch-compatible enough for the library
    return res as unknown as Response;
  };
}

function buildConfig(lang?: string): TranscriptConfig & { videoDetails: true } {
  const proxied = proxyFetchFactory();
  const base: TranscriptConfig & { videoDetails: true } = {
    lang,
    userAgent: browserUserAgent(),
    retries: 2,
    retryDelay: 800,
    videoDetails: true,
  };

  if (!proxied) return base;

  return {
    ...base,
    videoFetch: proxied,
    playerFetch: proxied,
    transcriptFetch: proxied,
  };
}

export function mapErrorMessage(err: unknown): { status: number; message: string } {
  if (err instanceof YoutubeTranscriptInvalidVideoIdError) {
    return { status: 400, message: "Invalid YouTube URL or video ID." };
  }
  if (err instanceof YoutubeTranscriptVideoUnavailableError) {
    return { status: 404, message: "This video is unavailable or private." };
  }
  if (err instanceof YoutubeTranscriptDisabledError) {
    return {
      status: 404,
      message: "Transcripts are disabled for this video by the creator.",
    };
  }
  if (
    err instanceof YoutubeTranscriptNotAvailableError ||
    err instanceof YoutubeTranscriptNotAvailableLanguageError
  ) {
    return {
      status: 404,
      message: "No captions/transcript found for this video.",
    };
  }
  if (err instanceof YoutubeTranscriptTooManyRequestError) {
    return {
      status: 429,
      message:
        "YouTube rate-limited this request. Try again shortly, or configure YT_PROXY_URL for Vercel.",
    };
  }

  const msg = err instanceof Error ? err.message : "Failed to fetch transcript.";
  // Common IP-block wording from YouTube / libraries
  if (/blocked|captcha|sign in|bot/i.test(msg)) {
    return {
      status: 503,
      message:
        "YouTube blocked the request from this server IP. Set YT_PROXY_URL (residential proxy) for Vercel deployments.",
    };
  }

  return { status: 500, message: msg };
}

export async function getTranscriptForVideo(
  input: string,
  lang?: string
): Promise<TranscriptApiResponse> {
  const videoId = extractVideoId(input);
  if (!videoId) {
    throw new YoutubeTranscriptInvalidVideoIdError();
  }

  const result: TranscriptResult = await fetchTranscript(videoId, buildConfig(lang));
  const { videoDetails, segments: rawSegments } = result;

  const segments: TranscriptSegment[] = rawSegments.map((s: YtSegment) => ({
    time: formatTimestamp(s.offset),
    text: s.text.replace(/\s+/g, " ").trim(),
    offset: s.offset,
    duration: s.duration,
  }));

  if (segments.length === 0) {
    throw new YoutubeTranscriptNotAvailableError(videoId);
  }

  const language = rawSegments[0]?.lang ?? lang ?? null;
  const rawText = segments
    .map((s) => (s.time ? `[${s.time}] ${s.text}` : s.text))
    .join("\n");

  return {
    videoId,
    title: videoDetails?.title || `YouTube Video (${videoId})`,
    author: videoDetails?.author ?? null,
    language,
    thumbnail: videoDetails?.thumbnails?.[0]?.url || thumbnailUrl(videoId),
    segments,
    rawText,
  };
}
