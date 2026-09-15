export type AiProvider = "chatgpt" | "claude" | "gemini";

const AI_URLS: Record<AiProvider, (q: string) => string> = {
  chatgpt: (q) => `https://chatgpt.com/?q=${encodeURIComponent(q)}`,
  claude: (q) => `https://claude.ai/new?q=${encodeURIComponent(q)}`,
  gemini: (q) =>
    `https://gemini.google.com/app?q=${encodeURIComponent(q)}`,
};

const AI_HOME: Record<AiProvider, string> = {
  chatgpt: "https://chatgpt.com/",
  claude: "https://claude.ai/new",
  gemini: "https://gemini.google.com/app",
};

/** Browsers / sites choke on huge query strings — copy + open instead */
const MAX_QUERY_CHARS = 12_000;

export async function openAiWithPrompt(
  provider: AiProvider,
  prompt: string
): Promise<"url" | "clipboard"> {
  const text = prompt.trim();
  if (!text) return "url";

  if (text.length <= MAX_QUERY_CHARS) {
    window.open(AI_URLS[provider](text), "_blank", "noopener,noreferrer");
    return "url";
  }

  await navigator.clipboard.writeText(text);
  window.open(AI_HOME[provider], "_blank", "noopener,noreferrer");
  return "clipboard";
}
