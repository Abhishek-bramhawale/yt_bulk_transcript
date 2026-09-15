"use client";

import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { theme } from "@/theme";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider theme={theme} forceColorScheme="dark" defaultColorScheme="dark">
      <Notifications position="bottom-center" zIndex={1000} />
      {children}
    </MantineProvider>
  );
}
