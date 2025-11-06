"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";

export default function Navigation() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  const navLinks = [
    { href: "/", label: "Home", icon: "🏠" },
    { href: "/crud", label: "Tasks", icon: "✓" },
    { href: "/topics", label: "Topics", icon: "📝" },
    { href: "/topics-view", label: "View", icon: "👁️" },
  ];

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" });
  };

  return (
    <nav className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              denotes
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-1">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    active
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  <span className="hidden sm:inline">{link.label}</span>
                  <span className="sm:hidden">{link.icon}</span>
                </Link>
              );
            })}

            {/* Auth Links */}
            {status === "authenticated" ? (
              <button
                onClick={handleLogout}
                className="ml-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
              >
                Logout
              </button>
            ) : (
              <Link
                href="/login"
                className={`ml-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive("/login")
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg"
                    : "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg"
                }`}
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

