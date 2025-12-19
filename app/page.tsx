"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { testDatabaseConnection, getSharedTopics, type SharedTopic, type Topic } from "./actions";
import Navigation from "./components/Navigation";

export default function Home() {
  const { data: session, status } = useSession();
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharedTopics, setSharedTopics] = useState<SharedTopic[]>([]);
  const [loadingShared, setLoadingShared] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  useEffect(() => {
    async function checkConnection() {
      const connected = await testDatabaseConnection();
      setIsConnected(connected);
      setLoading(false);
    }
    checkConnection();
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      loadSharedTopics();
    }
  }, [status]);

  const loadSharedTopics = async () => {
    setLoadingShared(true);
    try {
      const fetched = await getSharedTopics();
      setSharedTopics(fetched);
    } catch (err) {
      console.error("Failed to load shared topics:", err);
    } finally {
      setLoadingShared(false);
    }
  };

  const allSharedTopics = sharedTopics.flatMap((st) => st.topics || []);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      "from-pink-500 to-rose-500",
      "from-purple-500 to-indigo-500",
      "from-blue-500 to-cyan-500",
      "from-teal-500 to-emerald-500",
      "from-orange-500 to-amber-500",
      "from-red-500 to-pink-500",
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const groupedBySharer = sharedTopics.reduce((acc, share) => {
    const sharerName = share.sharedByName || "Unknown";
    const sharerId = share.sharedBy;
    if (!acc[sharerId]) {
      acc[sharerId] = { name: sharerName, shares: [], topics: [] };
    }
    acc[sharerId].shares.push(share);
    acc[sharerId].topics.push(...(share.topics || []));
    return acc;
  }, {} as { [key: string]: { name: string; shares: SharedTopic[]; topics: Topic[] } });

  const renderTopicCard = (topic: Topic, index: number) => {
    const sharer = sharedTopics.find((st) =>
      st.topics?.some((t) => t._id === topic._id)
    );
    const isSelected = selectedTopic?._id === topic._id;

    return (
      <div
        key={topic._id}
        onClick={() => setSelectedTopic(isSelected ? null : topic)}
        className={`group relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border transition-all duration-500 cursor-pointer overflow-hidden ${
          isSelected
            ? "border-violet-500 shadow-2xl shadow-violet-500/20 scale-[1.02]"
            : "border-white/20 dark:border-gray-700/50 hover:border-violet-400/50 hover:shadow-xl hover:shadow-violet-500/10"
        }`}
        style={{ animationDelay: `${index * 100}ms` }}
      >
        {/* Animated gradient border */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ padding: '1px' }}>
          <div className="w-full h-full bg-white dark:bg-gray-800 rounded-2xl" />
        </div>

        <div className="relative p-5 bg-white/90 dark:bg-gray-800/90 rounded-2xl">
          {/* Sharer badge */}
          {sharer && (
            <div className="flex items-center gap-2 mb-3">
              <div
                className={`w-7 h-7 rounded-full bg-gradient-to-br ${getAvatarColor(
                  sharer.sharedByName || "U"
                )} flex items-center justify-center ring-2 ring-white dark:ring-gray-700 shadow-lg`}
              >
                <span className="text-[10px] font-bold text-white">
                  {getInitials(sharer.sharedByName || "Unknown")}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 dark:text-gray-400">Shared by</span>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{sharer.sharedByName}</span>
              </div>
            </div>
          )}

          {/* Title */}
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors line-clamp-1">
            {topic.title}
          </h3>

          {/* Description */}
          {topic.description && topic.description !== "<p></p>" ? (
            <div
              className={`prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-400 ${
                isSelected ? "" : "line-clamp-2"
              }`}
              dangerouslySetInnerHTML={{ __html: topic.description }}
            />
          ) : (
            <p className="text-gray-400 dark:text-gray-500 text-sm italic">
              No description available
            </p>
          )}

          {/* Footer */}
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/50 flex items-center justify-between">
            <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {topic.createdAt && new Date(topic.createdAt).toLocaleDateString()}
            </span>
            <span className="text-xs font-medium text-violet-500 dark:text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              {isSelected ? "Click to collapse" : "View more"}
              <svg className={`w-3 h-3 transition-transform ${isSelected ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Features data for landing page
  const features = [
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      title: "Task Management",
      description: "Organize, prioritize, and track your tasks with an intuitive interface. Never miss a deadline again.",
      color: "from-blue-500 to-cyan-500",
      bg: "bg-blue-500/10",
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
      title: "Topic Organization",
      description: "Build a hierarchical knowledge base with nested topics and rich descriptions. Your ideas, structured.",
      color: "from-violet-500 to-purple-500",
      bg: "bg-violet-500/10",
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      title: "Collaborative Sharing",
      description: "Share your knowledge with friends and colleagues. Learn from shared insights and grow together.",
      color: "from-fuchsia-500 to-pink-500",
      bg: "bg-fuchsia-500/10",
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      ),
      title: "Smart Linking",
      description: "Connect related topics and tasks. Create a web of knowledge that grows with your ideas.",
      color: "from-amber-500 to-orange-500",
      bg: "bg-amber-500/10",
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      title: "Rich Content",
      description: "Add formatted text, images, and more to your notes. Express your ideas without limitations.",
      color: "from-emerald-500 to-teal-500",
      bg: "bg-emerald-500/10",
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      title: "Secure & Private",
      description: "Your data is protected with enterprise-grade security. Your notes stay private, always.",
      color: "from-rose-500 to-red-500",
      bg: "bg-rose-500/10",
    },
  ];

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden">
        {/* Animated Background */}
        <div className="fixed inset-0 z-0">
          {/* Gradient orbs */}
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-violet-600/30 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-fuchsia-600/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[150px]" />
          
          {/* Grid pattern */}
          <div 
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
              backgroundSize: '60px 60px'
            }}
          />
          
          {/* Noise texture overlay */}
          <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noise"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%" height="100%" filter="url(%23noise)"/%3E%3C/svg%3E")' }} />
        </div>

        {/* Hero Section */}
        <div className="relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
            <div className="text-center">
              {/* Database Status - subtle indicator */}
              <div className="mb-8">
                {loading ? (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-400 text-sm">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
                    <span>Connecting...</span>
                  </div>
                ) : isConnected ? (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                    <span>Connected</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    <div className="w-2 h-2 bg-red-400 rounded-full" />
                    <span>Connection failed</span>
                  </div>
                )}
              </div>

              {/* Main Logo */}
              <div className="relative inline-block mb-6">
                <h1 className="text-7xl md:text-8xl lg:text-9xl font-black tracking-tighter">
                  <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
                    denotes
                  </span>
                </h1>
                {/* Glow effect */}
                <div className="absolute inset-0 text-7xl md:text-8xl lg:text-9xl font-black tracking-tighter blur-2xl opacity-30">
                  <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
                    denotes
                  </span>
                </div>
              </div>

              {/* Tagline */}
              <p className="text-xl md:text-2xl text-gray-400 font-light max-w-2xl mx-auto mb-4">
                Your intelligent workspace for 
                <span className="text-white font-medium"> notes</span>,
                <span className="text-white font-medium"> tasks</span>, and
                <span className="text-white font-medium"> knowledge</span>
              </p>

              {/* Subtitle */}
              <p className="text-gray-500 text-sm md:text-base mb-12 max-w-xl mx-auto">
                Organize your thoughts, collaborate with your team, and build your personal knowledge base — all in one beautiful place.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                {status === "authenticated" ? (
                  <>
                    <Link
                      href="/crud"
                      className="group relative px-8 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold rounded-2xl shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/40 transform hover:-translate-y-1 transition-all duration-300 flex items-center gap-3"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Task Manager
                      <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                    <Link
                      href="/topics"
                      className="group relative px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-semibold rounded-2xl transform hover:-translate-y-1 transition-all duration-300 flex items-center gap-3"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      Topic Manager
                    </Link>
                    <Link
                      href="/topics-view"
                      className="group relative px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-semibold rounded-2xl transform hover:-translate-y-1 transition-all duration-300 flex items-center gap-3"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View Topics
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="group relative px-10 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold rounded-2xl shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/40 transform hover:-translate-y-1 transition-all duration-300 flex items-center gap-3"
                    >
                      Get Started Free
                      <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </Link>
                    <Link
                      href="/app-demo"
                      className="px-10 py-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-semibold rounded-2xl transform hover:-translate-y-1 transition-all duration-300 flex items-center gap-3"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Watch Demo
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        {status === "authenticated" ? (
          /* Dashboard for authenticated users */
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {/* Welcome Section */}
            <div className="mb-12">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 p-8 rounded-3xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 backdrop-blur-sm">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-1">
                      Welcome back{session?.user?.name ? `, ${session.user.name.split(' ')[0]}` : ''}!
                    </h2>
                    <p className="text-gray-400">
                      Here&apos;s what your friends have been sharing with you
                    </p>
                  </div>
                </div>
                <Link
                  href="/shared-topics"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-violet-500/50 text-white rounded-xl font-medium transition-all duration-300"
                >
                  View All Shared Topics
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Stats Grid */}
            {sharedTopics.length > 0 && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
                {[
                  { label: "Shared Topics", value: allSharedTopics.length, icon: "📚", color: "from-violet-500 to-purple-600" },
                  { label: "Contributors", value: Object.keys(groupedBySharer).length, icon: "👥", color: "from-fuchsia-500 to-pink-600" },
                  { label: "With Links", value: allSharedTopics.filter(t => t.linkedTopics && t.linkedTopics.length > 0).length, icon: "🔗", color: "from-blue-500 to-cyan-600" },
                  { label: "With Content", value: allSharedTopics.filter(t => t.description && t.description !== "<p></p>").length, icon: "📝", color: "from-emerald-500 to-teal-600" },
                ].map((stat, i) => (
                  <div key={i} className="group relative p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all duration-300">
                    <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                    <div className="relative">
                      <span className="text-2xl mb-3 block">{stat.icon}</span>
                      <p className="text-3xl md:text-4xl font-bold text-white mb-1">{stat.value}</p>
                      <p className="text-sm text-gray-400">{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Contributors */}
            {Object.keys(groupedBySharer).length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                  Contributors
                </h3>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(groupedBySharer).map(([sharerId, data]) => (
                    <div
                      key={sharerId}
                      className="group flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-violet-500/50 rounded-xl transition-all duration-300 cursor-pointer"
                    >
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(data.name)} flex items-center justify-center ring-2 ring-white/10 group-hover:ring-violet-500/50 transition-all`}>
                        <span className="text-sm font-bold text-white">{getInitials(data.name)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{data.name}</p>
                        <p className="text-xs text-gray-500">{data.topics.length} topic{data.topics.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Loading State */}
            {loadingShared ? (
              <div className="flex flex-col items-center justify-center py-24">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-2 border-violet-500/20" />
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-violet-500 animate-spin" />
                </div>
                <p className="mt-6 text-gray-400">Loading shared topics...</p>
              </div>
            ) : sharedTopics.length === 0 ? (
              /* Empty State */
              <div className="text-center py-20 px-8 rounded-3xl bg-gradient-to-br from-white/5 to-transparent border border-white/10">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
                  <svg className="w-12 h-12 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">
                  No shared topics yet
                </h3>
                <p className="text-gray-400 max-w-md mx-auto mb-8">
                  When your friends share topics with you, they&apos;ll appear here. Start by adding some friends!
                </p>
                <Link
                  href="/friends"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold rounded-2xl shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/40 transform hover:-translate-y-1 transition-all duration-300"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Find Friends
                </Link>
              </div>
            ) : (
              /* Shared Topics Grid */
              <>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-500" />
                  Recent Shared Topics
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
                  {allSharedTopics.slice(0, 6).map((topic, index) => renderTopicCard(topic, index))}
                </div>

                {allSharedTopics.length > 6 && (
                  <div className="text-center">
                    <Link
                      href="/shared-topics"
                      className="inline-flex items-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-violet-500/50 text-white font-medium rounded-2xl transition-all duration-300"
                    >
                      View all {allSharedTopics.length} shared topics
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                )}
              </>
            )}

            {/* Quick Actions */}
            <div className="mt-16 grid md:grid-cols-3 gap-6">
              {[
                { href: "/crud", title: "Task Manager", desc: "Manage your tasks", icon: "📋", color: "from-blue-500 to-cyan-500" },
                { href: "/topics", title: "Topic Manager", desc: "Organize your topics", icon: "🏷️", color: "from-violet-500 to-purple-500" },
                { href: "/topics-view", title: "View Topics", desc: "Browse your knowledge", icon: "👁️", color: "from-fuchsia-500 to-pink-500" },
              ].map((action, i) => (
                <Link
                  key={i}
                  href={action.href}
                  className="group relative p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all duration-300 overflow-hidden"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                  <div className="relative flex items-center gap-4">
                    <span className="text-3xl group-hover:scale-110 transition-transform duration-300">{action.icon}</span>
                    <div>
                      <h3 className="font-semibold text-white group-hover:text-violet-300 transition-colors">{action.title}</h3>
                      <p className="text-sm text-gray-400">{action.desc}</p>
                    </div>
                    <svg className="w-5 h-5 text-gray-500 group-hover:text-violet-400 group-hover:translate-x-1 transition-all ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          /* Features Section for non-authenticated users */
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            {/* Section Header */}
            <div className="text-center mb-16">
              <p className="text-violet-400 font-medium tracking-wider uppercase text-sm mb-4">Features</p>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Everything you need to
                <span className="block bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                  organize your mind
                </span>
              </h2>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                A powerful suite of tools designed to help you capture, organize, and share your knowledge.
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="group relative p-8 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all duration-500 overflow-hidden"
                  onMouseEnter={() => setHoveredFeature(index)}
                  onMouseLeave={() => setHoveredFeature(null)}
                >
                  {/* Hover gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
                  
                  {/* Icon */}
                  <div className={`relative w-16 h-16 rounded-2xl ${feature.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500`}>
                    <div className={`bg-gradient-to-br ${feature.color} bg-clip-text text-transparent`}>
                      {feature.icon}
                    </div>
                  </div>

                  {/* Content */}
                  <h3 className="relative text-xl font-bold text-white mb-3 group-hover:text-violet-300 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="relative text-gray-400 leading-relaxed">
                    {feature.description}
                  </p>

                  {/* Arrow indicator */}
                  <div className="relative mt-6 flex items-center text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="text-sm font-medium">Learn more</span>
                    <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA Section */}
            <div className="mt-20 text-center">
              <div className="inline-flex flex-col sm:flex-row gap-4">
                <Link
                  href="/login"
                  className="group relative px-10 py-5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold rounded-2xl shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/40 transform hover:-translate-y-1 transition-all duration-300 flex items-center gap-3"
                >
                  Start organizing for free
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
              <p className="mt-4 text-gray-500 text-sm">No credit card required • Free forever</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="relative z-10 border-t border-white/10 mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-black bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                  denotes
                </span>
                <span className="text-gray-500 text-sm">• Organize your mind</span>
              </div>
              
              <div className="flex items-center gap-8">
                {status === "authenticated" ? (
                  <>
                    <Link href="/crud" className="text-gray-400 hover:text-violet-400 transition-colors text-sm">Tasks</Link>
                    <Link href="/topics" className="text-gray-400 hover:text-violet-400 transition-colors text-sm">Topics</Link>
                    <Link href="/friends" className="text-gray-400 hover:text-violet-400 transition-colors text-sm">Friends</Link>
                    <Link href="/shared-topics" className="text-gray-400 hover:text-violet-400 transition-colors text-sm">Shared</Link>
                  </>
                ) : (
                  <>
                    <Link href="/login" className="text-gray-400 hover:text-violet-400 transition-colors text-sm">Sign In</Link>
                    <Link href="/app-demo" className="text-gray-400 hover:text-violet-400 transition-colors text-sm">Demo</Link>
                  </>
                )}
              </div>
            </div>
            
            <div className="mt-8 pt-8 border-t border-white/5 text-center text-gray-500 text-sm">
              <p>Built with ❤️ using Next.js, MongoDB, and TailwindCSS</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
