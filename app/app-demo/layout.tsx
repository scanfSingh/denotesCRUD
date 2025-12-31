import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Demo",
  description: "Try denotes without signing up. Experience our intelligent note-taking, task management, and knowledge organization features.",
  openGraph: {
    title: "Try denotes Demo",
    description: "Experience intelligent note-taking without signing up.",
  },
};

export default function AppDemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

