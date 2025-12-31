import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Task Manager",
  description: "Organize, prioritize, and track your tasks with denotes. Never miss a deadline with our intuitive task management system.",
  openGraph: {
    title: "Task Manager | denotes",
    description: "Powerful task management with assignments, priorities, and progress tracking.",
  },
};

export default function CrudLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

