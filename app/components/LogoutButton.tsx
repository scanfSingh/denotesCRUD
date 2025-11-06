"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LogoutButton() {
  const { data: session } = useSession();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/login");
    router.refresh();
  };

  if (!session) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 flex items-center gap-4">
      <span className="text-sm text-gray-700 dark:text-gray-300">
        {session.user?.email}
      </span>
      <button
        onClick={handleLogout}
        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
      >
        Logout
      </button>
    </div>
  );
}

