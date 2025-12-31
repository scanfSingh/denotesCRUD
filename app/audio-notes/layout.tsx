import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Audio Notes",
  description: "Record voice memos and let AI transcribe them automatically. Capture your thoughts hands-free with denotes audio notes.",
  openGraph: {
    title: "Audio Notes | denotes",
    description: "Voice-to-text transcription powered by AI. Capture ideas effortlessly.",
  },
};

export default function AudioNotesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

