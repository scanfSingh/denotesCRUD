import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Families",
  description: "Create and manage family groups for shared inventory. Anyone in the family can update items and mark them as finished.",
  openGraph: {
    title: "Families | denotes",
    description: "Share inventory with your family and collaborate on tracking items.",
  },
};

export default function FamiliesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
