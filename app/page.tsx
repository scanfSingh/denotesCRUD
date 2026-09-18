"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { testDatabaseConnection, getSharedTopics, getPublishedBlogPosts, type SharedTopic, type Topic, type BlogPost } from "./actions";
import Navigation from "./components/Navigation";
import { featureFlags } from "@/lib/featureFlags";
import { getEffectiveFlag } from "./feature-flags-actions";
import { OPEN_RAG_CHAT_EVENT } from "./components/RagChatWidget";

function openAiAssistant() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(OPEN_RAG_CHAT_EVENT));
  }
}

export default function Home() {
  const { data: session, status } = useSession();
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharedTopics, setSharedTopics] = useState<SharedTopic[]>([]);
  const [loadingShared, setLoadingShared] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loadingBlogs, setLoadingBlogs] = useState(false);
  // Env default first, reconciled with any admin override shortly
  // after mount - see app/feature-flags-actions.ts.
  const [ragChatEnabled, setRagChatEnabled] = useState(featureFlags.ragChat.enabled);

  useEffect(() => {
    getEffectiveFlag("ragChat.enabled")
      .then(setRagChatEnabled)
      .catch(() => {});
  }, []);

  useEffect(() => {
    async function checkConnection() {
      const connected = await testDatabaseConnection();
      setIsConnected(connected);
      setLoading(false);
    }
    checkConnection();
    loadBlogPosts();
  }, []);

  const loadBlogPosts = async () => {
    setLoadingBlogs(true);
    try {
      const posts = await getPublishedBlogPosts();
      setBlogPosts(posts);
    } catch (err) {
      console.error("Failed to load blog posts:", err);
    } finally {
      setLoadingBlogs(false);
    }
  };

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
      "from-blue-400 to-blue-600",
      "from-blue-500 to-indigo-600",
      "from-indigo-400 to-blue-600",
      "from-sky-500 to-blue-600",
      "from-blue-600 to-slate-700",
      "from-indigo-500 to-blue-600",
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
        className={`group rounded-xl border transition-all cursor-pointer overflow-hidden ${
          isSelected
            ? "border-blue-500/60 bg-white/[0.06] shadow-lg shadow-blue-500/10"
            : "border-white/[0.08] bg-white/[0.04] hover:border-blue-500/30 hover:bg-white/[0.06]"
        }`}
      >
        <div className="p-4">
          {sharer && (
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${getAvatarColor(sharer.sharedByName || "U")} flex items-center justify-center`}>
                <span className="text-[10px] font-bold text-white">{getInitials(sharer.sharedByName || "Unknown")}</span>
              </div>
              <span className="text-xs text-slate-400">{sharer.sharedByName}</span>
            </div>
          )}
          <h3 className="font-semibold text-white mb-2 line-clamp-1">{topic.title}</h3>
          {topic.description && topic.description !== "<p></p>" ? (
            <div
              className={`prose prose-sm dark:prose-invert max-w-none text-slate-400 text-sm ${isSelected ? "" : "line-clamp-2"}`}
              dangerouslySetInnerHTML={{ __html: topic.description }}
            />
          ) : (
            <p className="text-slate-500 text-sm italic">No description</p>
          )}
          <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between">
            <span className="text-xs text-slate-500">
              {topic.createdAt && new Date(topic.createdAt).toLocaleDateString()}
            </span>
            <span className="text-xs font-medium text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
              {isSelected ? "Collapse" : "Expand"}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Features data for landing page
  const features = [
    ...(ragChatEnabled
      ? [
          {
            icon: (
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8-1.17 0-2.29-.196-3.312-.552L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            ),
            title: "AI Assistant",
            description: "Chat with an AI that's grounded in denotes' help content and, once synced, your own notes and topics.",
            color: "from-purple-500 to-indigo-500",
            bg: "bg-purple-500/10",
            text: "text-purple-400",
          },
        ]
      : []),
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
      text: "text-blue-400",
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
      text: "text-blue-400",
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
      text: "text-blue-400",
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
      text: "text-blue-400",
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      title: "Rich Content",
      description: "Add formatted text, images, and more to your notes. Express your ideas without limitations.",
      color: "from-blue-500 to-indigo-500",
      bg: "bg-blue-500/10",
      text: "text-blue-400",
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
      text: "text-blue-400",
    },
  ];

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
        {/* Background */}
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(59,130,246,0.12),transparent)]" />
          <div className="absolute top-0 right-0 w-[min(80vw,600px)] h-[min(80vw,600px)] bg-blue-500/[0.08] rounded-full blur-[100px]" />
          <div className="absolute bottom-0 left-0 w-[min(60vw,400px)] h-[min(60vw,400px)] bg-blue-400/[0.05] rounded-full blur-[80px]" />
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)`,
              backgroundSize: "48px 48px",
            }}
          />
        </div>

        {/* Hero - only for guests */}
        {status !== "authenticated" && (
          <header className="relative z-10">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 pb-14 sm:pb-18">
              <div className="flex flex-col items-center text-center">
                <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
                  {loading ? (
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] text-slate-400 text-xs font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-pulse" />
                      Connecting…
                    </span>
                  ) : isConnected ? (
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-400 text-xs font-medium border border-blue-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                      Connected
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 text-red-400 text-xs font-medium border border-red-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                      Connection failed
                    </span>
                  )}
                  {ragChatEnabled && (
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-300 text-xs font-medium border border-purple-500/20">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      New: AI Assistant
                    </span>
                  )}
                </div>

                <h1 className="text-6xl sm:text-7xl md:text-8xl font-black tracking-tight mb-5">
                  <span className="bg-gradient-to-r from-blue-300 via-sky-300 to-blue-400 bg-clip-text text-transparent">
                    denotes
                  </span>
                </h1>
                <p className="text-lg sm:text-xl text-slate-300 max-w-xl mx-auto mb-2">
                  Notes, tasks, and knowledge — in one place.
                </p>
                <p className="text-sm text-slate-500 max-w-md mx-auto mb-10">
                  {ragChatEnabled
                    ? "Organize, collaborate, and chat with an AI assistant that knows your notes."
                    : "Organize, collaborate, and build your personal knowledge base."}
                </p>

                <div className="flex flex-wrap justify-center gap-3">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2.5 px-7 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors"
                  >
                    Get started
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                  <Link
                    href="/app-demo"
                    className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium rounded-xl transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Demo
                  </Link>
                </div>
              </div>
            </div>
          </header>
        )}

        {/* AI Assistant showcase - guests only */}
        {status !== "authenticated" && ragChatEnabled && (
          <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
            <div className="grid lg:grid-cols-2 gap-8 items-center rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/[0.07] via-white/[0.03] to-transparent p-6 sm:p-8">
              <div>
                <p className="text-purple-300 font-medium text-xs uppercase tracking-wider mb-3">AI Assistant</p>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                  Ask questions. Get answers grounded in your own notes.
                </h2>
                <p className="text-slate-400 text-sm leading-relaxed mb-5">
                  denotes' built-in AI assistant answers from denotes' own help content — and, once you
                  sync them, from your own notes and topics too. Nothing you write is ever visible to
                  other users' chats.
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg transition-colors"
                >
                  Try it — sign in
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>

              {/* Static mock conversation - illustrative only */}
              <div className="rounded-xl overflow-hidden border border-white/[0.08] bg-slate-900 shadow-2xl">
                <div className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white/15">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8-1.17 0-2.29-.196-3.312-.552L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-white">denotes Assistant</p>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-lg bg-purple-600 px-3 py-2 text-sm text-white">
                      What did I note about the Q3 roadmap?
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-lg bg-white/[0.06] px-3 py-2 text-sm text-slate-200">
                      Your "Q3 Planning" note lists three priorities: mobile redesign, billing migration,
                      and the new onboarding flow. The billing migration is flagged as highest risk.
                      <div className="mt-2 border-t border-white/10 pt-2 text-xs text-purple-300">
                        Q3 Planning
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Main Content */}
        {status === "authenticated" ? (
          <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            {/* Bento: welcome + stats row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
              <div className="lg:col-span-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                    <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      Hi{session?.user?.name ? `, ${session.user.name.split(" ")[0]}` : ""}
                    </h2>
                    <p className="text-sm text-slate-400">Shared topics from your network</p>
                  </div>
                </div>
                <Link
                  href="/shared-topics"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium text-white transition-colors shrink-0"
                >
                  View all
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
              {sharedTopics.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Shared", value: allSharedTopics.length },
                    { label: "People", value: Object.keys(groupedBySharer).length },
                  ].map((stat, i) => (
                    <div key={i} className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                      <p className="text-2xl font-bold text-white tabular-nums">{stat.value}</p>
                      <p className="text-xs text-slate-500">{stat.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Contributors row */}
            {Object.keys(groupedBySharer).length > 0 && (
              <div className="mb-8">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Contributors</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(groupedBySharer).map(([sharerId, data]) => (
                    <div
                      key={sharerId}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08]"
                    >
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarColor(data.name)} flex items-center justify-center`}>
                        <span className="text-xs font-bold text-white">{getInitials(data.name)}</span>
                      </div>
                      <span className="text-sm text-white">{data.name}</span>
                      <span className="text-xs text-slate-500">{data.topics.length}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {loadingShared ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-10 h-10 rounded-full border-2 border-blue-500/30 border-t-blue-400 animate-spin" />
                <p className="mt-4 text-sm text-slate-500">Loading shared topics…</p>
              </div>
            ) : sharedTopics.length === 0 ? (
              <div className="text-center py-16 px-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">No shared topics yet</h3>
                <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
                  When friends share topics with you, they’ll show up here.
                </p>
                <Link
                  href="/friends"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Find friends
                </Link>
              </div>
            ) : (
              <>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Recent shared</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {allSharedTopics.slice(0, 6).map((topic, index) => renderTopicCard(topic, index))}
                </div>
                {allSharedTopics.length > 6 && (
                  <div className="flex justify-center">
                    <Link
                      href="/shared-topics"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium text-white transition-colors"
                    >
                      All {allSharedTopics.length} shared topics
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                )}
              </>
            )}

            {/* Quick actions bento */}
            <div className={`mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4 ${ragChatEnabled ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
              {[
                { href: "/crud", onClick: undefined, title: "Tasks", desc: "Manage tasks", icon: "✓", accent: false },
                { href: "/topics", onClick: undefined, title: "Topics", desc: "Organize topics", icon: "📝", accent: false },
                { href: "/topics-view", onClick: undefined, title: "View", desc: "Browse knowledge", icon: "👁", accent: false },
                ...(ragChatEnabled
                  ? [{ href: undefined, onClick: openAiAssistant, title: "Ask AI", desc: "Chat with your notes", icon: "✨", accent: true }]
                  : []),
              ].map((action, i) => {
                const content = (
                  <>
                    <span
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-medium transition-colors ${
                        action.accent
                          ? "bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20"
                          : "bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20"
                      }`}
                    >
                      {action.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white">{action.title}</h3>
                      <p className="text-xs text-slate-500">{action.desc}</p>
                    </div>
                    <svg className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </>
                );
                const className = `group flex items-center gap-4 p-4 rounded-xl bg-white/[0.04] border transition-all text-left w-full ${
                  action.accent
                    ? "border-purple-500/20 hover:border-purple-500/40 hover:bg-white/[0.06]"
                    : "border-white/[0.08] hover:border-blue-500/30 hover:bg-white/[0.06]"
                }`;

                return action.href ? (
                  <Link key={i} href={action.href} className={className}>
                    {content}
                  </Link>
                ) : (
                  <button key={i} type="button" onClick={action.onClick} className={className}>
                    {content}
                  </button>
                );
              })}
            </div>
            {ragChatEnabled && (
              <p className="mt-3 text-xs text-slate-500">
                Tip: open the AI assistant and tap the sync icon to index your notes so it can answer from them.
              </p>
            )}
          </main>
        ) : (
          /* Features for guests */
          <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center mb-12">
              <p className="text-blue-400 font-medium text-xs uppercase tracking-wider mb-3">Features</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
                One workspace for notes, tasks & knowledge
              </h2>
              <p className="text-slate-400 text-base max-w-xl mx-auto">
                Capture, organize, and share — without the clutter.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="group p-6 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:border-blue-500/20 transition-all"
                >
                  <div className={`w-12 h-12 rounded-lg ${feature.bg} flex items-center justify-center mb-4 ${feature.text || "text-blue-400"}`}>
                    {feature.icon}
                  </div>
                  <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>

            <div className="mt-14 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors"
              >
                Start for free
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <p className="mt-3 text-slate-500 text-xs">No credit card required</p>
            </div>
          </section>
        )}

        {/* Blog */}
        {blogPosts.length > 0 && (
          <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
            <div className="text-center mb-10">
              <p className="text-blue-400 font-medium text-xs uppercase tracking-wider mb-2">Blog</p>
              <h2 className="text-2xl font-bold text-white">Latest posts</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {blogPosts.slice(0, 6).map((post) => (
                <Link
                  key={post._id}
                  href={`/blog/${post._id}`}
                  className="group block rounded-xl border border-white/[0.08] bg-white/[0.03] overflow-hidden hover:border-blue-500/30 transition-colors"
                >
                  {post.coverImage ? (
                    <div className="aspect-[16/10] overflow-hidden">
                      <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform" />
                    </div>
                  ) : (
                    <div className="aspect-[16/10] bg-white/[0.04] flex items-center justify-center">
                      <svg className="w-12 h-12 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                      </svg>
                    </div>
                  )}
                  <div className="p-4">
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {post.tags.slice(0, 2).map((tag, i) => (
                          <span key={i} className="px-2 py-0.5 text-xs bg-blue-500/10 text-blue-400 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <h3 className="font-semibold text-white line-clamp-2 mb-2 group-hover:text-blue-400 transition-colors">{post.title}</h3>
                    <p className="text-sm text-slate-500 line-clamp-2 mb-3">{post.excerpt}</p>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{post.authorName}</span>
                      <span>
                        {post.publishedAt && new Date(post.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            {blogPosts.length > 6 && (
              <div className="text-center mt-8">
                <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors">
                  View all posts
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            )}
          </section>
        )}

        {/* Footer */}
        <footer className="relative z-10 border-t border-white/[0.06] mt-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-lg font-bold bg-gradient-to-r from-blue-400 to-sky-400 bg-clip-text text-transparent">
                denotes
              </span>
              <div className="flex items-center gap-6 text-sm">
                {status === "authenticated" ? (
                  <>
                    <Link href="/crud" className="text-slate-400 hover:text-blue-400 transition-colors">Tasks</Link>
                    <Link href="/topics" className="text-slate-400 hover:text-blue-400 transition-colors">Topics</Link>
                    <Link href="/blog" className="text-slate-400 hover:text-blue-400 transition-colors">Blog</Link>
                    <Link href="/friends" className="text-slate-400 hover:text-blue-400 transition-colors">Friends</Link>
                    <Link href="/shared-topics" className="text-slate-400 hover:text-blue-400 transition-colors">Shared</Link>
                  </>
                ) : (
                  <>
                    <Link href="/login" className="text-slate-400 hover:text-blue-400 transition-colors">Sign in</Link>
                    <Link href="/blog" className="text-slate-400 hover:text-blue-400 transition-colors">Blog</Link>
                    <Link href="/app-demo" className="text-slate-400 hover:text-blue-400 transition-colors">Demo</Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
