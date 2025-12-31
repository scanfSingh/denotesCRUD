import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "View Topics",
  description: "Browse your knowledge base with a beautiful visual interface. Explore topics, linked content, and discover connections.",
  openGraph: {
    title: "Browse Topics | denotes",
    description: "Explore your personal knowledge base visually.",
  },
};

export default function TopicsViewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

