import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile",
  description: "Manage your denotes profile settings and preferences. Update your account information and customize your experience.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

