import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shared Topics",
  description: "View topics shared with you by friends and colleagues. Discover new knowledge and insights from your network.",
  openGraph: {
    title: "Shared Topics | denotes",
    description: "Explore knowledge shared by your network.",
  },
};

export default function SharedTopicsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

