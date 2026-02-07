"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import EmailVerificationBanner from "./EmailVerificationBanner";
import { featureFlags } from "@/lib/featureFlags";
import { isCurrentUserAdmin } from "../actions";

export default function Navigation() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileHover, setProfileHover] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isActive = (path: string) => pathname === path;

  // Check if user is admin
  useEffect(() => {
    if (status === "authenticated") {
      isCurrentUserAdmin().then(setIsAdmin);
    }
  }, [status]);

  // Feature flags for navigation
  const navFlags = featureFlags.navigation;
  const showDarkMode = featureFlags.ui.darkMode;
  const showFriends = featureFlags.social.friends && navFlags.friends;
  const showFamilies = featureFlags.social.families && navFlags.families;
  const showProfile = navFlags.profile;

  // Build nav links based on feature flags
  const navLinks = useMemo(() => {
    const links: { href: string; label: string; icon: string }[] = [];
    
    if (navFlags.home) {
      links.push({ href: "/", label: "Home", icon: "🏠" });
    }
    if (navFlags.tasks) {
      links.push({ href: "/crud", label: "Tasks", icon: "✓" });
    }
    if (navFlags.inventory) {
      links.push({ href: "/inventory", label: "Inventory", icon: "📦" });
    }
    if (showFamilies) {
      links.push({ href: "/families", label: "Families", icon: "👨‍👩‍👧‍👦" });
    }
    if (navFlags.topics && featureFlags.topics.enabled) {
      links.push({ href: "/topics", label: "Topics", icon: "📝" });
    }
    if (navFlags.topicsView && featureFlags.topics.viewPage) {
      links.push({ href: "/topics-view", label: "View", icon: "👁️" });
    }
    if (navFlags.sharedTopics && featureFlags.social.sharedTopics) {
      links.push({ href: "/shared-topics", label: "Shared", icon: "🔗" });
    }
    if (navFlags.audioNotes && featureFlags.audioNotes.enabled) {
      links.push({ href: "/audio-notes", label: "Audio Notes", icon: "🎤" });
    }
    if (navFlags.blog && featureFlags.blog.enabled) {
      links.push({ href: "/blog", label: "Blog", icon: "📝" });
    }
    
    return links;
  }, [navFlags, showFamilies]);

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    await signOut({ callbackUrl: "/" });
  };

  const handleProfileMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setProfileHover(true);
  };

  const handleProfileMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setProfileHover(false);
    }, 150);
  };

  // Close menu when clicking outside (but not on the toggle button)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      // Don't close if clicking on the menu button (toggle button handles that)
      if (menuButtonRef.current && menuButtonRef.current.contains(target)) {
        return;
      }
      // Close if clicking outside the menu
      if (menuRef.current && !menuRef.current.contains(target)) {
        setMobileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const getUserInitials = () => {
    if (session?.user?.name) {
      return session.user.name.charAt(0).toUpperCase();
    }
    if (session?.user?.email) {
      return session.user.email.charAt(0).toUpperCase();
    }
    return "U";
  };

  return (
    <>
    <nav className="bg-white/80 dark:bg-gray-900/80 mono:bg-white/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 mono:border-black sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              denotes
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    active
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg"
                      : "text-gray-700 dark:text-gray-300 mono:text-black hover:bg-gray-100 dark:hover:bg-gray-800 mono:hover:bg-gray-200"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}

            {/* Theme Toggle */}
            {showDarkMode && <ThemeToggle />}

            {/* Auth Links */}
            {status === "authenticated" ? (
              <div className="flex items-center gap-1 ml-2">
                {/* Profile with Hover Card */}
                {showProfile && (
                <div
                  ref={profileRef}
                  className="relative"
                  onMouseEnter={handleProfileMouseEnter}
                  onMouseLeave={handleProfileMouseLeave}
                >
                  <Link
                    href="/profile"
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive("/profile")
                        ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg"
                        : "text-gray-700 dark:text-gray-300 mono:text-black hover:bg-gray-100 dark:hover:bg-gray-800 mono:hover:bg-gray-200"
                    }`}
                  >
                    <span className="w-6 h-6 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                      {getUserInitials()}
                    </span>
                    <span>Profile</span>
                  </Link>

                  {/* Profile Hover Card */}
                  {profileHover && (
                    <div
                      className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-800 mono:bg-white rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 mono:border-black overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200"
                      onMouseEnter={handleProfileMouseEnter}
                      onMouseLeave={handleProfileMouseLeave}
                    >
                      {/* Header with avatar */}
                      <div className="p-4 bg-gradient-to-r from-indigo-600 to-purple-600 mono:from-black mono:to-gray-800">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white text-xl font-bold border-2 border-white/30">
                            {getUserInitials()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-semibold truncate">
                              {session?.user?.name || "User"}
                            </p>
                            <p className="text-white/80 text-sm truncate">
                              {session?.user?.email}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Quick info */}
                      <div className="p-3 border-b border-gray-100 dark:border-gray-700 mono:border-gray-300">
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mono:text-black">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Signed in</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="p-2">
                        <Link
                          href="/profile"
                          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 mono:text-black hover:bg-gray-100 dark:hover:bg-gray-700 mono:hover:bg-gray-200 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span>View Profile</span>
                        </Link>
                        {showFriends && (
                        <Link
                          href="/friends"
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                            isActive("/friends")
                              ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300"
                              : "text-gray-700 dark:text-gray-300 mono:text-black hover:bg-gray-100 dark:hover:bg-gray-700 mono:hover:bg-gray-200"
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <span>Friends</span>
                        </Link>
                        )}
                        {showFamilies && (
                        <Link
                          href="/families"
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                            isActive("/families")
                              ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300"
                              : "text-gray-700 dark:text-gray-300 mono:text-black hover:bg-gray-100 dark:hover:bg-gray-700 mono:hover:bg-gray-200"
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <span>Families</span>
                        </Link>
                        )}
                        <Link
                          href="/profile"
                          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 mono:text-black hover:bg-gray-100 dark:hover:bg-gray-700 mono:hover:bg-gray-200 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span>Account Settings</span>
                        </Link>
                        {isAdmin && (
                          <Link
                            href="/admin"
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                              isActive("/admin")
                                ? "bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300"
                                : "text-gray-700 dark:text-gray-300 mono:text-black hover:bg-gray-100 dark:hover:bg-gray-700 mono:hover:bg-gray-200"
                            }`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            <span>Admin Panel</span>
                          </Link>
                        )}
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-600 dark:text-red-400 mono:text-black hover:bg-red-50 dark:hover:bg-red-900/20 mono:hover:bg-gray-200 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          <span>Sign out</span>
                        </button>
                      </div>
                    </div>
                    )}
                </div>
                )}
              </div>
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

          {/* Mobile Menu Button & Theme Toggle */}
          <div className="md:hidden flex items-center gap-2">
            {showDarkMode && <ThemeToggle />}
            <button
              ref={menuButtonRef}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-gray-700 dark:text-gray-300 mono:text-black hover:bg-gray-100 dark:hover:bg-gray-800 mono:hover:bg-gray-200 transition-all duration-200"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div
          ref={menuRef}
          className="md:hidden absolute top-16 left-0 right-0 bg-white dark:bg-gray-900 mono:bg-white border-b border-gray-200 dark:border-gray-800 mono:border-black shadow-xl z-40"
        >
          <div className="px-4 py-3 space-y-1">
            {/* User info card for mobile */}
            {status === "authenticated" && session?.user && (
              <div className="mb-3 p-3 bg-gradient-to-r from-indigo-600 to-purple-600 mono:from-black mono:to-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white text-lg font-bold">
                    {getUserInitials()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">
                      {session.user.name || "User"}
                    </p>
                    <p className="text-white/80 text-sm truncate">
                      {session.user.email}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                    active
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg"
                      : "text-gray-700 dark:text-gray-300 mono:text-black hover:bg-gray-100 dark:hover:bg-gray-800 mono:hover:bg-gray-200"
                  }`}
                >
                  <span className="text-lg">{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              );
            })}

            {/* Divider */}
            <div className="border-t border-gray-200 dark:border-gray-700 mono:border-gray-400 my-2" />

            {/* Auth Links */}
            {status === "authenticated" ? (
              <>
                {showProfile && (
                <Link
                  href="/profile"
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                    isActive("/profile")
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg"
                      : "text-gray-700 dark:text-gray-300 mono:text-black hover:bg-gray-100 dark:hover:bg-gray-800 mono:hover:bg-gray-200"
                  }`}
                >
                  <span className="text-lg">👤</span>
                  <span>Profile</span>
                </Link>
                )}
                {showFriends && (
                <Link
                  href="/friends"
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                    isActive("/friends")
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg"
                      : "text-gray-700 dark:text-gray-300 mono:text-black hover:bg-gray-100 dark:hover:bg-gray-800 mono:hover:bg-gray-200"
                  }`}
                >
                  <span className="text-lg">👥</span>
                  <span>Friends</span>
                </Link>
                )}
                {showFamilies && (
                <Link
                  href="/families"
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                    isActive("/families")
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg"
                      : "text-gray-700 dark:text-gray-300 mono:text-black hover:bg-gray-100 dark:hover:bg-gray-800 mono:hover:bg-gray-200"
                  }`}
                >
                  <span className="text-lg">👨‍👩‍👧‍👦</span>
                  <span>Families</span>
                </Link>
                )}
                {isAdmin && (
                <Link
                  href="/admin"
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                    isActive("/admin")
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg"
                      : "text-gray-700 dark:text-gray-300 mono:text-black hover:bg-gray-100 dark:hover:bg-gray-800 mono:hover:bg-gray-200"
                  }`}
                >
                  <span className="text-lg">🛡️</span>
                  <span>Admin</span>
                </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium text-gray-700 dark:text-gray-300 mono:text-black hover:bg-gray-100 dark:hover:bg-gray-800 mono:hover:bg-gray-200 transition-all duration-200"
                >
                  <span className="text-lg">🚪</span>
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg transition-all duration-200"
              >
                <span className="text-lg">🔐</span>
                <span>Login</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
    <EmailVerificationBanner />
    </>
  );
}
