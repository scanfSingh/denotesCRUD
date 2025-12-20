"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "./components/ThemeProvider";
import type { ReactNode } from "react";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </SessionProvider>
  );
}

