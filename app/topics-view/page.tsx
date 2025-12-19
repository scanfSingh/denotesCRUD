"use client";

import { useState, useEffect, useRef, type ReactElement } from "react";
import { getTopics, type Topic } from "../actions";
import ProtectedRoute from "../components/ProtectedRoute";
import Navigation from "../components/Navigation";

interface TopicNode extends Topic {
  children?: TopicNode[];
}

export default function TopicsViewPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [highlightedTopic, setHighlightedTopic] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const topicRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    loadTopics();
  }, []);

  const loadTopics = async () => {
    setLoading(true);
    try {
      const fetchedTopics = await getTopics();
      setTopics(fetchedTopics);
      // Auto-expand all nodes
      const allIds = new Set(fetchedTopics.map((t) => t._id!));
      setExpandedNodes(allIds);
    } catch (err) {
      console.error("Failed to load topics:", err);
    } finally {
      setLoading(false);
    }
  };

  // Filter topics based on search
  const filteredTopics = topics.filter(
    (topic) =>
      topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      topic.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Build hierarchical tree structure
  const buildTree = (topics: Topic[]): TopicNode[] => {
    const topicMap = new Map<string, TopicNode>();
    const rootTopics: TopicNode[] = [];

    topics.forEach((topic) => {
      topicMap.set(topic._id!, { ...topic, children: [] });
    });

    topics.forEach((topic) => {
      const node = topicMap.get(topic._id!)!;
      if (topic.parentTopicId && topicMap.has(topic.parentTopicId)) {
        const parent = topicMap.get(topic.parentTopicId)!;
        if (!parent.children) parent.children = [];
        parent.children.push(node);
      } else {
        rootTopics.push(node);
      }
    });

    const sortTopics = (nodes: TopicNode[]) => {
      nodes.sort((a, b) => a.title.localeCompare(b.title));
      nodes.forEach((node) => {
        if (node.children) sortTopics(node.children);
      });
    };

    sortTopics(rootTopics);
    return rootTopics;
  };

  const toggleExpand = (topicId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(topicId)) {
      newExpanded.delete(topicId);
    } else {
      newExpanded.add(topicId);
    }
    setExpandedNodes(newExpanded);
  };

  const scrollToTopic = (topicId: string) => {
    const element = topicRefs.current.get(topicId);
    if (element) {
      const yOffset = -100;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
      setHighlightedTopic(topicId);
      setTimeout(() => setHighlightedTopic(null), 2000);
    }
  };

  const getTopicStats = () => {
    const rootCount = topics.filter((t) => !t.parentTopicId).length;
    const withLinks = topics.filter((t) => t.linkedTopics && t.linkedTopics.length > 0).length;
    const withDescription = topics.filter((t) => t.description && t.description !== "<p></p>").length;
    return { rootCount, withLinks, withDescription };
  };

  const stats = getTopicStats();

  const renderTopicCard = (topic: Topic): ReactElement => {
    const linkedTopicsData = topics.filter((t) => topic.linkedTopics?.includes(t._id!));
    const isHighlighted = highlightedTopic === topic._id;
    const isSelected = selectedTopic?._id === topic._id;
    const hasDescription = topic.description && topic.description !== "<p></p>";

    return (
      <div
        key={topic._id}
        ref={(el) => {
          if (el) topicRefs.current.set(topic._id!, el);
        }}
        onClick={() => setSelectedTopic(isSelected ? null : topic)}
        className={`group relative bg-white dark:bg-gray-800 rounded-xl border-2 transition-all duration-300 cursor-pointer overflow-hidden ${
          isHighlighted
            ? "ring-4 ring-purple-500 ring-offset-2 shadow-2xl border-purple-500 scale-[1.02]"
            : isSelected
            ? "border-blue-500 shadow-xl"
            : "border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:shadow-lg"
        }`}
      >
        {/* Gradient accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity" />

        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
              {topic.title}
            </h3>
            {linkedTopicsData.length > 0 && (
              <span className="flex-shrink-0 ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
                {linkedTopicsData.length} linked
              </span>
            )}
          </div>

          {/* Description Preview */}
          {hasDescription ? (
            <div
              className={`prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-400 ${
                isSelected ? "" : "line-clamp-3"
              }`}
              dangerouslySetInnerHTML={{ __html: topic.description }}
            />
          ) : (
            <p className="text-gray-400 dark:text-gray-500 text-sm italic">
              No description
            </p>
          )}

          {/* Linked Topics */}
          {linkedTopicsData.length > 0 && isSelected && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Linked Topics
              </p>
              <div className="flex flex-wrap gap-2">
                {linkedTopicsData.map((linked) => (
                  <button
                    key={linked._id}
                    onClick={(e) => {
                      e.stopPropagation();
                      scrollToTopic(linked._id!);
                    }}
                    className="px-3 py-1 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium hover:from-blue-100 hover:to-purple-100 dark:hover:from-blue-900/50 dark:hover:to-purple-900/50 transition-colors"
                  >
                    {linked.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {topic.createdAt && new Date(topic.createdAt).toLocaleDateString()}
            </span>
            <span className="text-xs text-blue-500 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
              {isSelected ? "Click to collapse" : "Click to expand"}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderTreeNode = (node: TopicNode, level: number = 0): ReactElement => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node._id!);
    const isActive = selectedTopic?._id === node._id;

    return (
      <div key={node._id}>
        <div
          className={`flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-all duration-200 ${
            isActive
              ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
              : "hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300"
          }`}
          style={{ paddingLeft: `${level * 16 + 12}px` }}
          onClick={() => {
            scrollToTopic(node._id!);
            setSelectedTopic(node);
          }}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node._id!);
              }}
              className="w-5 h-5 flex items-center justify-center text-xs rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {isExpanded ? "▼" : "▶"}
            </button>
          ) : (
            <span className="w-5 h-5 flex items-center justify-center text-gray-300 dark:text-gray-600">
              •
            </span>
          )}
          <span className="text-sm font-medium truncate flex-1">{node.title}</span>
          {node.linkedTopics && node.linkedTopics.length > 0 && (
            <span className="text-xs text-gray-400">{node.linkedTopics.length}</span>
          )}
        </div>
        {hasChildren && isExpanded && (
          <div className="ml-2 border-l border-gray-200 dark:border-gray-700">
            {node.children!.map((child) => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const topicTree = buildTree(topics);

  return (
    <ProtectedRoute>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800">
        {/* Hero Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 dark:from-blue-900 dark:via-purple-900 dark:to-indigo-900">
          <div className="absolute inset-0 bg-grid-pattern opacity-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">
                  Knowledge Base
                </h1>
                <p className="text-blue-100 text-lg">
                  Explore and navigate through your topics
                </p>
              </div>

              {/* Stats Cards */}
              <div className="flex flex-wrap gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/20">
                  <p className="text-3xl font-bold text-white">{topics.length}</p>
                  <p className="text-blue-200 text-sm">Total Topics</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/20">
                  <p className="text-3xl font-bold text-white">{stats.rootCount}</p>
                  <p className="text-blue-200 text-sm">Root Topics</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/20">
                  <p className="text-3xl font-bold text-white">{stats.withLinks}</p>
                  <p className="text-blue-200 text-sm">With Links</p>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="mt-8 max-w-2xl">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search topics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-5 py-4 pl-12 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-xl border-0 shadow-xl text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-white/50 transition-all"
                />
                <svg
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-200 dark:border-blue-900 rounded-full animate-pulse" />
                <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-blue-600 rounded-full animate-spin" />
              </div>
              <p className="mt-6 text-gray-600 dark:text-gray-400 font-medium">
                Loading your knowledge base...
              </p>
            </div>
          ) : topics.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                No topics yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                Start building your knowledge base by creating your first topic.
              </p>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Sidebar */}
              <div className="lg:w-80 flex-shrink-0">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden sticky top-4">
                  {/* Sidebar Header */}
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-750">
                    <div className="flex items-center justify-between">
                      <h2 className="font-bold text-gray-900 dark:text-white">
                        Topic Navigator
                      </h2>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setViewMode("grid")}
                          className={`p-2 rounded-lg transition-colors ${
                            viewMode === "grid"
                              ? "bg-blue-100 dark:bg-blue-900/50 text-blue-600"
                              : "text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                          }`}
                          title="Grid view"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setViewMode("list")}
                          className={`p-2 rounded-lg transition-colors ${
                            viewMode === "list"
                              ? "bg-blue-100 dark:bg-blue-900/50 text-blue-600"
                              : "text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                          }`}
                          title="List view"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Tree Navigation */}
                  <div className="p-3 max-h-[calc(100vh-300px)] overflow-y-auto">
                    {topicTree.length === 0 ? (
                      <p className="text-center text-gray-500 dark:text-gray-400 text-sm py-4">
                        No topics found
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {topicTree.map((node) => renderTreeNode(node))}
                      </div>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <button
                      onClick={() => {
                        const allIds = new Set(topics.map((t) => t._id!));
                        setExpandedNodes(allIds);
                      }}
                      className="w-full py-2 px-4 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                    >
                      Expand All
                    </button>
                    <button
                      onClick={() => setExpandedNodes(new Set())}
                      className="w-full py-2 px-4 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors mt-1"
                    >
                      Collapse All
                    </button>
                  </div>
                </div>
              </div>

              {/* Topic Cards */}
              <div className="flex-1 min-w-0">
                {filteredTopics.length === 0 ? (
                  <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
                    <p className="text-gray-500 dark:text-gray-400">
                      No topics match your search.
                    </p>
                    <button
                      onClick={() => setSearchQuery("")}
                      className="mt-4 text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Clear search
                    </button>
                  </div>
                ) : (
                  <div
                    className={
                      viewMode === "grid"
                        ? "grid grid-cols-1 md:grid-cols-2 gap-5"
                        : "space-y-4"
                    }
                  >
                    {filteredTopics.map((topic) => renderTopicCard(topic))}
                  </div>
                )}

                {/* Results count */}
                {searchQuery && filteredTopics.length > 0 && (
                  <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
                    Showing {filteredTopics.length} of {topics.length} topics
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
