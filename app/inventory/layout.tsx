import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Home Inventory",
  description: "Track your home inventory items and amounts with denotes.",
  openGraph: {
    title: "Home Inventory | denotes",
    description: "View and manage your home inventory with item amounts.",
  },
};

export default function InventoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
