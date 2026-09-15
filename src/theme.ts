"use client";

import { createTheme } from "@mantine/core";

export const theme = createTheme({
  primaryColor: "youtube",
  fontFamily:
    "var(--font-geist-sans), ui-sans-serif, system-ui, -apple-system, sans-serif",
  fontFamilyMonospace:
    "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, monospace",
  defaultRadius: "md",
  colors: {
    youtube: [
      "#ffe5ea",
      "#ffc2cd",
      "#ff99ab",
      "#ff6680",
      "#ff3355",
      "#ff0033",
      "#e6002e",
      "#c40027",
      "#a30021",
      "#80001a",
    ],
    dark: [
      "#f9fafb",
      "#e5e7eb",
      "#9ca3af",
      "#6b7280",
      "#374151",
      "#1f2937",
      "#1f293d",
      "#161f30",
      "#111827",
      "#0b0f19",
    ],
  },
  other: {
    accent: "#ff0033",
  },
  components: {
    Button: {
      defaultProps: {
        radius: "md",
      },
    },
    TextInput: {
      defaultProps: {
        radius: "md",
      },
    },
    Paper: {
      defaultProps: {
        radius: "md",
      },
    },
  },
});
