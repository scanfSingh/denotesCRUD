import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Topic Manager",
  description: "Build a hierarchical knowledge base with nested topics and rich descriptions. Organize your ideas with intelligent topic linking.",
  openGraph: {
    title: "Topic Manager | denotes",
    description: "Create and organize your personal knowledge base with hierarchical topics.",
  },
};

export default function TopicsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

