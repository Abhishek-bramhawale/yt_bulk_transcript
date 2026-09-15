"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Box,
  Button,
  Group,
  Image,
  Loader,
  Paper,
  ScrollArea,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconAlertCircle,
  IconBrandYoutube,
  IconCheck,
  IconClock,
  IconClockOff,
  IconCopy,
  IconDownload,
  IconLoader2,
  IconSearch,
} from "@tabler/icons-react";
import {
  SAMPLE_VIDEOS,
  extractVideoId,
  thumbnailUrl,
  type TranscriptApiResponse,
  type TranscriptSegment,
} from "@/lib/transcript";

type JobStatus = "queued" | "loading" | "done" | "error";

type TranscriptJob = {
  id: string;
  videoId: string;
  input: string;
  status: JobStatus;
  title: string;
  author: string | null;
  language: string | null;
  thumbnail: string;
  segments: TranscriptSegment[];
  rawText: string;
  error: string | null;
};

function parseUrlList(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of text.split(/[\n,]+/)) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const id = extractVideoId(trimmed);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(trimmed);
  }
  return out;
}

function segmentsToPlain(segments: TranscriptSegment[], withTimestamps: boolean) {
  if (withTimestamps) {
    return segments
      .map((s) => (s.time ? `[${s.time}] ${s.text}` : s.text))
      .join("\n");
  }
  return segments.map((s) => s.text).join(" ");
}

export function TranscriptApp() {
  const [urlText, setUrlText] = useState("");
  const [jobs, setJobs] = useState<TranscriptJob[]>([]);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [filter, setFilter] = useState("");
  const [showTimestamps, setShowTimestamps] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const doneJobs = useMemo(
    () => jobs.filter((j) => j.status === "done" && j.segments.length > 0),
    [jobs]
  );

  const progressLabel = useMemo(() => {
    if (!jobs.length) return null;
    const done = jobs.filter((j) => j.status === "done" || j.status === "error").length;
    return `${done}/${jobs.length}`;
  }, [jobs]);

  function updateJob(id: string, patch: Partial<TranscriptJob>) {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  }

  async function fetchOne(job: TranscriptJob) {
    updateJob(job.id, {
      status: "loading",
      error: null,
      title: `Video ID: ${job.videoId}`,
    });

    try {
      const res = await fetch(
        `/api/transcript?videoId=${encodeURIComponent(job.videoId)}`,
        { method: "GET" }
      );
      const payload = (await res.json()) as TranscriptApiResponse & {
        error?: string;
      };

      if (!res.ok) {
        throw new Error(payload.error || `Request failed (${res.status})`);
      }

      updateJob(job.id, {
        status: "done",
        title: payload.title,
        author: payload.author,
        language: payload.language,
        thumbnail: payload.thumbnail || thumbnailUrl(payload.videoId),
        segments: payload.segments,
        rawText: payload.rawText,
        error: null,
      });
    } catch (err) {
      updateJob(job.id, {
        status: "error",
        error: err instanceof Error ? err.message : "Failed to load transcript.",
        segments: [],
        rawText: "",
      });
    }
  }

  async function startBulk(overrideText?: string) {
    const list = parseUrlList(overrideText ?? urlText);
    if (!list.length) {
      setFormError("Paste at least one valid YouTube URL or video ID (one per line).");
      return;
    }

    setFormError(null);
    setFilter("");

    const nextJobs: TranscriptJob[] = list.map((input, i) => {
      const videoId = extractVideoId(input)!;
      return {
        id: `${videoId}-${Date.now()}-${i}`,
        videoId,
        input,
        status: "queued" as const,
        title: `Video ID: ${videoId}`,
        author: null,
        language: null,
        thumbnail: thumbnailUrl(videoId),
        segments: [],
        rawText: "",
        error: null,
      };
    });

    setJobs(nextJobs);
    setBulkRunning(true);

    // Process sequentially so cards fill in one-by-one
    for (const job of nextJobs) {
      await fetchOne(job);
    }

    setBulkRunning(false);
  }

  function loadSample(sampleUrl: string) {
    setUrlText(sampleUrl);
    void startBulk(sampleUrl);
  }

  async function copyAllTranscripts() {
    if (!doneJobs.length) return;
    const text = doneJobs
      .map((j) => {
        const body = segmentsToPlain(j.segments, showTimestamps);
        return `${j.title}\n${body}`;
      })
      .join("\n\n---\n\n");

    await navigator.clipboard.writeText(text);
    notifications.show({
      message: `Copied ${doneJobs.length} transcript${doneJobs.length > 1 ? "s" : ""}`,
      color: "blue",
      autoClose: 2500,
    });
  }

  async function copyOne(job: TranscriptJob) {
    if (!job.segments.length) return;
    await navigator.clipboard.writeText(
      segmentsToPlain(job.segments, showTimestamps)
    );
    notifications.show({
      message: "Transcript copied",
      color: "blue",
      autoClose: 2000,
    });
  }

  function downloadAll() {
    if (!doneJobs.length) return;
    const text = doneJobs
      .map((j) => `# ${j.title}\n${segmentsToPlain(j.segments, showTimestamps)}`)
      .join("\n\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `transcripts-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <Box w="100%" mih="100vh" px={{ base: "md", md: "xl" }} py="lg">
      <Stack gap="lg" w="100%">
        <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
          <Stack gap={4}>
            <Group gap="xs">
              <IconBrandYoutube size={32} color="#ff0033" stroke={1.5} />
              <Title order={1} fw={700} style={{ letterSpacing: "-0.025em" }}>
                <Text span c="youtube.5" inherit>
                  YouTube
                </Text>{" "}
                Transcript
              </Title>
              <Badge variant="light" color="youtube" size="sm">
                Bulk · Serverless
              </Badge>
            </Group>
            <Text c="dimmed" size="sm">
              Paste one or more YouTube links (one per line). Transcripts appear as each finishes.
            </Text>
          </Stack>

          {jobs.length > 0 && (
            <Group gap="xs">
              <Button
                variant="default"
                size="sm"
                leftSection={<IconCopy size={16} />}
                disabled={!doneJobs.length}
                onClick={() => void copyAllTranscripts()}
              >
                Copy All
              </Button>
              <Button
                variant="default"
                size="sm"
                leftSection={<IconDownload size={16} />}
                disabled={!doneJobs.length}
                onClick={downloadAll}
              >
                Download .txt
              </Button>
              <Button
                variant="default"
                size="sm"
                leftSection={
                  showTimestamps ? <IconClockOff size={16} /> : <IconClock size={16} />
                }
                onClick={() => setShowTimestamps((v) => !v)}
              >
                {showTimestamps ? "Hide Timestamps" : "Show Timestamps"}
              </Button>
            </Group>
          )}
        </Group>

        <Paper
          p="md"
          withBorder
          style={{
            background: "var(--mantine-color-dark-8)",
            borderColor: "var(--mantine-color-dark-5)",
          }}
        >
          <Stack gap="sm">
            <Group align="stretch" gap="sm" wrap="nowrap" className="input-row">
              <Textarea
                flex={1}
                minRows={3}
                maxRows={8}
                autosize
                placeholder={
                  "Paste YouTube URLs (one per line)\nhttps://www.youtube.com/watch?v=...\nhttps://youtu.be/..."
                }
                value={urlText}
                onChange={(e) => setUrlText(e.currentTarget.value)}
                styles={{
                  input: {
                    background: "var(--mantine-color-dark-6)",
                    borderColor: "var(--mantine-color-dark-4)",
                    fontFamily: "var(--font-geist-mono), monospace",
                    fontSize: 13,
                  },
                }}
              />
              <Button
                size="md"
                color="youtube"
                loading={bulkRunning}
                onClick={() => void startBulk()}
                style={{ alignSelf: "stretch", minWidth: 140 }}
              >
                {bulkRunning ? `Working ${progressLabel}` : "Get Transcript"}
              </Button>
            </Group>

            <Group gap="xs" wrap="wrap">
              <Text size="sm" c="dimmed">
                Try an example:
              </Text>
              {SAMPLE_VIDEOS.map((sample) => (
                <UnstyledButton
                  key={sample.id}
                  onClick={() => loadSample(sample.url)}
                  px={10}
                  py={3}
                  style={{
                    borderRadius: 12,
                    background: "#1e293b",
                    border: "1px solid #334155",
                    color: "#93c5fd",
                    fontSize: 13,
                  }}
                >
                  {sample.label}
                </UnstyledButton>
              ))}
            </Group>

            {formError && (
              <Alert
                icon={<IconAlertCircle size={16} />}
                color="red"
                variant="light"
                title="Invalid input"
              >
                {formError}
              </Alert>
            )}
          </Stack>
        </Paper>

        {jobs.length > 0 && (
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg" w="100%">
            {/* Left: thumbnails / job list + copy */}
            <Paper
              p="md"
              withBorder
              style={{
                background: "var(--mantine-color-dark-8)",
                borderColor: "var(--mantine-color-dark-5)",
                alignSelf: "start",
              }}
            >
              <Stack gap="md">
                <Group justify="space-between">
                  <Text fw={600} size="sm">
                    Videos ({jobs.length})
                  </Text>
                  <Tooltip label="Copy every finished transcript">
                    <Button
                      size="xs"
                      color="youtube"
                      variant="light"
                      leftSection={<IconCopy size={14} />}
                      disabled={!doneJobs.length}
                      onClick={() => void copyAllTranscripts()}
                    >
                      Copy All
                    </Button>
                  </Tooltip>
                </Group>

                <ScrollArea.Autosize mah="70vh" type="auto" offsetScrollbars>
                  <Stack gap="sm" pr={4}>
                    {jobs.map((job) => (
                      <Paper
                        key={job.id}
                        p="sm"
                        radius="md"
                        style={{
                          background: "var(--mantine-color-dark-7)",
                          border:
                            job.status === "error"
                              ? "1px solid rgba(239,68,68,0.4)"
                              : "1px solid transparent",
                        }}
                      >
                        <Group gap="sm" wrap="nowrap" align="flex-start">
                          <Image
                            src={job.thumbnail}
                            alt=""
                            w={120}
                            h={68}
                            radius="sm"
                            fit="cover"
                            style={{ flexShrink: 0 }}
                          />
                          <Box style={{ minWidth: 0, flex: 1 }}>
                            <Text fw={600} size="sm" lineClamp={2}>
                              {job.title}
                            </Text>
                            <Group gap={6} mt={4}>
                              {job.status === "queued" && (
                                <Badge size="xs" color="gray" variant="light">
                                  Queued
                                </Badge>
                              )}
                              {job.status === "loading" && (
                                <Badge
                                  size="xs"
                                  color="yellow"
                                  variant="light"
                                  leftSection={<Loader size={10} color="yellow" />}
                                >
                                  Fetching…
                                </Badge>
                              )}
                              {job.status === "done" && (
                                <Badge
                                  size="xs"
                                  color="teal"
                                  variant="light"
                                  leftSection={<IconCheck size={10} />}
                                >
                                  {job.segments.length} lines
                                </Badge>
                              )}
                              {job.status === "error" && (
                                <Badge size="xs" color="red" variant="light">
                                  Failed
                                </Badge>
                              )}
                              {job.language && (
                                <Text size="xs" c="dimmed">
                                  {job.language}
                                </Text>
                              )}
                            </Group>
                            {job.error && (
                              <Text size="xs" c="red.4" mt={4} lineClamp={2}>
                                {job.error}
                              </Text>
                            )}
                          </Box>
                        </Group>
                      </Paper>
                    ))}
                  </Stack>
                </ScrollArea.Autosize>
              </Stack>
            </Paper>

            {/* Right: transcript cards */}
            <Stack gap="md">
              <Group gap="sm">
                <TextInput
                  placeholder="Filter text..."
                  leftSection={<IconSearch size={14} />}
                  value={filter}
                  onChange={(e) => setFilter(e.currentTarget.value)}
                  flex={1}
                  size="xs"
                  styles={{
                    input: {
                      background: "var(--mantine-color-dark-6)",
                      borderColor: "var(--mantine-color-dark-4)",
                    },
                  }}
                />
              </Group>

              {jobs.map((job) => {
                if (job.status === "queued") return null;
                if (job.status === "loading") {
                  return (
                    <Paper
                      key={job.id}
                      p="lg"
                      withBorder
                      style={{
                        background: "var(--mantine-color-dark-8)",
                        borderColor: "var(--mantine-color-dark-5)",
                      }}
                    >
                      <Group gap="sm">
                        <IconLoader2 size={18} className="spin" />
                        <Text size="sm" c="dimmed">
                          Fetching transcript for {job.videoId}…
                        </Text>
                      </Group>
                    </Paper>
                  );
                }
                if (job.status === "error") {
                  return (
                    <Alert
                      key={job.id}
                      icon={<IconAlertCircle size={16} />}
                      color="red"
                      variant="light"
                      title={job.title}
                    >
                      {job.error}
                    </Alert>
                  );
                }

                const q = filter.trim().toLowerCase();
                const lines = q
                  ? job.segments.filter((s) => s.text.toLowerCase().includes(q))
                  : job.segments;

                return (
                  <Paper
                    key={job.id}
                    p="md"
                    withBorder
                    style={{
                      background: "var(--mantine-color-dark-8)",
                      borderColor: "var(--mantine-color-dark-5)",
                    }}
                  >
                    <Stack gap="sm">
                      <Group justify="space-between" align="flex-start" wrap="wrap">
                        <Box style={{ minWidth: 0, flex: 1 }}>
                          <Text fw={600} size="sm" lineClamp={2}>
                            {job.title}
                          </Text>
                          {job.author && (
                            <Text size="xs" c="dimmed" mt={2}>
                              {job.author}
                              {job.language ? ` · ${job.language}` : ""}
                            </Text>
                          )}
                        </Box>
                        <Button
                          size="xs"
                          variant="default"
                          leftSection={<IconCopy size={14} />}
                          onClick={() => void copyOne(job)}
                        >
                          Copy
                        </Button>
                      </Group>

                      <ScrollArea.Autosize mah={360} type="auto" offsetScrollbars>
                        <Stack gap={6} pr={4}>
                          {lines.length === 0 ? (
                            <Text c="dimmed" size="sm" ta="center" py="md">
                              No matching text.
                            </Text>
                          ) : showTimestamps ? (
                            lines.map((item, i) => (
                              <Group
                                key={`${job.id}-${item.offset}-${i}`}
                                gap="sm"
                                wrap="nowrap"
                                align="flex-start"
                                className="transcript-row"
                                px={4}
                                py={4}
                                style={{ borderRadius: 6 }}
                              >
                                {item.time && (
                                  <Text
                                    span
                                    ff="monospace"
                                    size="xs"
                                    fw={600}
                                    c="cyan.4"
                                    style={{ flexShrink: 0 }}
                                  >
                                    [{item.time}]
                                  </Text>
                                )}
                                <Text size="sm" c="gray.3" style={{ lineHeight: 1.55 }}>
                                  {item.text}
                                </Text>
                              </Group>
                            ))
                          ) : (
                            <Text size="sm" c="gray.3" style={{ lineHeight: 1.7 }}>
                              {lines.map((s) => s.text).join(" ")}
                            </Text>
                          )}
                        </Stack>
                      </ScrollArea.Autosize>
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          </SimpleGrid>
        )}
      </Stack>
    </Box>
  );
}
