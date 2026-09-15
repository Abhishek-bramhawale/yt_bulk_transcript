"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Box,
  Button,
  Group,
  Image,
  Paper,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconAlertCircle,
  IconBrandYoutube,
  IconClock,
  IconClockOff,
  IconCopy,
  IconDownload,
  IconSearch,
} from "@tabler/icons-react";
import {
  MOCK_TRANSCRIPT,
  SAMPLE_VIDEOS,
  extractVideoId,
  thumbnailUrl,
  type TranscriptSegment,
} from "@/lib/transcript";

type VideoMeta = {
  id: string;
  title: string;
  stats: string;
  thumb: string;
};

export function TranscriptApp() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<VideoMeta | null>(null);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [rawText, setRawText] = useState("");
  const [filter, setFilter] = useState("");
  const [showTimestamps, setShowTimestamps] = useState(true);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return segments;
    return segments.filter((s) => s.text.toLowerCase().includes(q));
  }, [segments, filter]);

  async function fetchTranscript(overrideUrl?: string) {
    const input = overrideUrl ?? url;
    setError(null);

    const videoId = extractVideoId(input);
    if (!videoId) {
      setError("Invalid YouTube URL. Please enter a valid YouTube video link or ID.");
      setMeta(null);
      setSegments([]);
      return;
    }

    setMeta({
      id: videoId,
      title: `Video ID: ${videoId}`,
      stats: "Fetching caption track...",
      thumb: thumbnailUrl(videoId),
    });
    setLoading(true);
    setSegments([]);
    setFilter("");

    // Part 1: mock delay + demo data (real API in later parts)
    await new Promise((r) => setTimeout(r, 700));

    try {
      const mock = MOCK_TRANSCRIPT[videoId];
      if (!mock) {
        throw new Error(
          "No demo transcript for this video yet. Try a sample link — API wiring comes in a later part."
        );
      }

      setMeta({
        id: videoId,
        title: mock.title,
        stats: `Language: ${mock.language}`,
        thumb: thumbnailUrl(videoId),
      });
      setSegments(mock.segments);
      setRawText(
        mock.segments
          .map((s) => (s.time ? `[${s.time}] ${s.text}` : s.text))
          .join("\n")
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load transcript.");
      setSegments([]);
    } finally {
      setLoading(false);
    }
  }

  function loadSample(sampleUrl: string) {
    setUrl(sampleUrl);
    void fetchTranscript(sampleUrl);
  }

  async function copyTranscript() {
    if (!segments.length) return;
    const text = showTimestamps
      ? segments.map((s) => (s.time ? `[${s.time}] ${s.text}` : s.text)).join("\n")
      : segments.map((s) => s.text).join(" ");

    await navigator.clipboard.writeText(text);
    notifications.show({
      message: "Transcript copied to clipboard!",
      color: "blue",
      autoClose: 2500,
    });
  }

  function downloadTranscript() {
    if (!rawText) return;
    const blob = new Blob([rawText], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `transcript-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <Box maw={860} w="100%" mx="auto" px="md" py={40}>
      <Stack gap="xl">
        <Stack gap={6} ta="center">
          <Group justify="center" gap="xs">
            <IconBrandYoutube size={36} color="#ff0033" stroke={1.5} />
            <Title order={1} fw={700} style={{ letterSpacing: "-0.025em" }}>
              <Text span c="youtube.5" inherit>
                YouTube
              </Text>{" "}
              Transcript
            </Title>
          </Group>
          <Text c="dimmed" size="md">
            Paste any YouTube video link to extract subtitles & captions instantly
          </Text>
          <Badge variant="light" color="gray" size="sm" mx="auto" mt={4}>
            Part 1 · UI only (demo data)
          </Badge>
        </Stack>

        <Paper
          p="xl"
          withBorder
          style={{
            background: "var(--mantine-color-dark-8)",
            borderColor: "var(--mantine-color-dark-5)",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.4)",
          }}
        >
          <Stack gap="md">
            <Group align="stretch" gap="sm" wrap="nowrap" className="input-row">
              <TextInput
                flex={1}
                size="md"
                placeholder="e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                value={url}
                onChange={(e) => setUrl(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void fetchTranscript();
                }}
                styles={{
                  input: {
                    background: "var(--mantine-color-dark-6)",
                    borderColor: "var(--mantine-color-dark-4)",
                  },
                }}
              />
              <Button
                size="md"
                color="youtube"
                loading={loading}
                onClick={() => void fetchTranscript()}
                style={{ flexShrink: 0 }}
              >
                Get Transcript
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

            {meta && (
              <Paper
                p="md"
                radius="md"
                style={{ background: "var(--mantine-color-dark-7)" }}
              >
                <Group gap="md" wrap="nowrap" align="center">
                  <Image
                    src={meta.thumb}
                    alt="Video thumbnail"
                    w={120}
                    h={68}
                    radius="sm"
                    fit="cover"
                  />
                  <Box style={{ minWidth: 0 }}>
                    <Text fw={600} size="sm" lineClamp={2}>
                      {meta.title}
                    </Text>
                    <Text size="xs" c="dimmed" mt={4}>
                      {meta.stats}
                    </Text>
                  </Box>
                </Group>
              </Paper>
            )}

            {error && (
              <Alert
                icon={<IconAlertCircle size={16} />}
                color="red"
                variant="light"
                title="Could not load transcript"
              >
                {error}
              </Alert>
            )}
          </Stack>
        </Paper>

        {segments.length > 0 && (
          <Paper
            p="xl"
            withBorder
            style={{
              background: "var(--mantine-color-dark-8)",
              borderColor: "var(--mantine-color-dark-5)",
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.4)",
            }}
          >
            <Stack gap="md">
              <Group justify="space-between" align="center" wrap="wrap" gap="sm">
                <Group gap="sm" wrap="wrap">
                  <TextInput
                    placeholder="Filter text..."
                    leftSection={<IconSearch size={14} />}
                    value={filter}
                    onChange={(e) => setFilter(e.currentTarget.value)}
                    w={{ base: "100%", xs: 170 }}
                    size="xs"
                    styles={{
                      input: {
                        background: "var(--mantine-color-dark-6)",
                        borderColor: "var(--mantine-color-dark-4)",
                      },
                    }}
                  />
                  <Button
                    variant="default"
                    size="xs"
                    leftSection={
                      showTimestamps ? (
                        <IconClockOff size={14} />
                      ) : (
                        <IconClock size={14} />
                      )
                    }
                    onClick={() => setShowTimestamps((v) => !v)}
                  >
                    {showTimestamps ? "Hide Timestamps" : "Show Timestamps"}
                  </Button>
                </Group>
                <Group gap="xs">
                  <Tooltip label="Copy all lines">
                    <Button
                      variant="default"
                      size="xs"
                      leftSection={<IconCopy size={14} />}
                      onClick={() => void copyTranscript()}
                    >
                      Copy All
                    </Button>
                  </Tooltip>
                  <Button
                    variant="default"
                    size="xs"
                    leftSection={<IconDownload size={14} />}
                    onClick={downloadTranscript}
                  >
                    Download .txt
                  </Button>
                </Group>
              </Group>

              <Box
                style={{
                  borderTop: "1px solid var(--mantine-color-dark-4)",
                  paddingTop: 12,
                }}
              >
                <ScrollArea.Autosize mah={480} type="auto" offsetScrollbars>
                  <Stack gap="xs" pr="xs">
                    {filtered.length === 0 ? (
                      <Text c="dimmed" ta="center" py="xl">
                        No matching text found.
                      </Text>
                    ) : (
                      filtered.map((item, i) => (
                        <Group
                          key={`${item.time}-${i}`}
                          gap="md"
                          wrap="nowrap"
                          align="flex-start"
                          px="xs"
                          py={6}
                          style={{ borderRadius: 6 }}
                          className="transcript-row"
                        >
                          {showTimestamps && item.time && (
                            <Text
                              span
                              ff="monospace"
                              size="sm"
                              fw={600}
                              c="cyan.4"
                              style={{ flexShrink: 0, cursor: "default" }}
                            >
                              [{item.time}]
                            </Text>
                          )}
                          <Text size="sm" c="gray.3" style={{ lineHeight: 1.5 }}>
                            {item.text}
                          </Text>
                        </Group>
                      ))
                    )}
                  </Stack>
                </ScrollArea.Autosize>
              </Box>
            </Stack>
          </Paper>
        )}
      </Stack>
    </Box>
  );
}
