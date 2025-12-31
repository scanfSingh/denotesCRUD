import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to denotes to access your notes, tasks, and topics. Create an account to start organizing your knowledge today.",
  openGraph: {
    title: "Sign In to denotes",
    description: "Access your intelligent workspace for notes, tasks, and knowledge management.",
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

