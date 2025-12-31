import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Friends",
  description: "Connect with friends and colleagues on denotes. Share your knowledge, collaborate on topics, and learn together.",
  openGraph: {
    title: "Friends | denotes",
    description: "Build your knowledge network and collaborate with others.",
  },
};

export default function FriendsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

