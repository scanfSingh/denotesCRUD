"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "./components/ThemeProvider";
import { FeatureFlagsProvider } from "./components/FeatureFlagsProvider";
import RagChatWidget from "./components/RagChatWidget";
import type { ReactNode } from "react";
import type { FeatureFlags } from "@/lib/featureFlags";

export default function Providers({
  children,
  flags,
}: {
  children: ReactNode;
  flags: FeatureFlags;
}) {
  return (
    <SessionProvider>
      <FeatureFlagsProvider flags={flags}>
        <ThemeProvider>
          {children}
          <RagChatWidget />
        </ThemeProvider>
      </FeatureFlagsProvider>
    </SessionProvider>
  );
}
