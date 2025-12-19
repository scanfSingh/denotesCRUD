"use client";

import { useState, useEffect, type ReactElement } from "react";
import { getSharedTopics, type SharedTopic, type Topic } from "../actions";
import ProtectedRoute from "../components/ProtectedRoute";
import Navigation from "../components/Navigation";

interface TopicNode extends Topic {
  children?: TopicNode[];
}

export default function SharedTopicsPage() {
  const [sharedTopics, setSharedTopics] = useState<SharedTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSharer, setSelectedSharer] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadSharedTopics();
  }, []);

  const loadSharedTopics = async () => {
    setLoading(true);
    try {
      const fetched = await getSharedTopics();
      setSharedTopics(fetched);
      // Auto-expand all
      const allIds = new Set(fetched.flatMap((st) => st.topics?.map((t) => t._id!) || []));
      setExpandedNodes(allIds);
    } catch (err) {
      console.error("Failed to load shared topics:", err);
    } finally {
      setLoading(false);
    }
  };

  // Group shared topics by sharer
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

  // Get filtered topics
  const getFilteredTopics = () => {
    let topics = selectedSharer
      ? groupedBySharer[selectedSharer]?.topics || []
      : sharedTopics.flatMap((st) => st.topics || []);

    if (searchQuery) {
      topics = topics.filter(
        (t) =>
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return topics;
  };

  const filteredTopics = getFilteredTopics();

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

  const allSharedTopics = sharedTopics.flatMap((st) => st.topics || []);
  const sharerCount = Object.keys(groupedBySharer).length;
  const topicTree = buildTree(filteredTopics);

  const renderTreeNode = (node: TopicNode, level: number = 0): ReactElement => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node._id!);
    const isActive = selectedTopic?._id === node._id;

    return (
      <div key={node._id}>
        <div
          className={`flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-all duration-200 ${
            isActive
              ? "bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300"
              : "hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300"
          }`}
          style={{ paddingLeft: `${level * 16 + 12}px` }}
          onClick={() => setSelectedTopic(node)}
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
        </div>
        {hasChildren && isExpanded && (
          <div className="ml-2 border-l border-gray-200 dark:border-gray-700">
            {node.children!.map((child) => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderTopicCard = (topic: Topic): ReactElement => {
    const linkedTopicsData = allSharedTopics.filter((t) =>
      topic.linkedTopics?.includes(t._id!)
    );
    const isSelected = selectedTopic?._id === topic._id;
    const sharer = sharedTopics.find((st) =>
      st.topics?.some((t) => t._id === topic._id)
    );

    return (
      <div
        key={topic._id}
        onClick={() => setSelectedTopic(isSelected ? null : topic)}
        className={`group relative bg-white dark:bg-gray-800 rounded-2xl border-2 transition-all duration-300 cursor-pointer overflow-hidden ${
          isSelected
            ? "border-purple-500 shadow-xl ring-4 ring-purple-100 dark:ring-purple-900/30"
            : "border-gray-200 dark:border-gray-700 hover:border-purple-400 hover:shadow-lg"
        }`}
      >
        {/* Gradient accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500" />

        <div className="p-6">
          {/* Sharer badge */}
          {sharer && (
            <div className="flex items-center gap-2 mb-4">
              <div
                className={`w-6 h-6 rounded-full bg-gradient-to-br ${getAvatarColor(
                  sharer.sharedByName || "U"
                )} flex items-center justify-center`}
              >
                <span className="text-[10px] font-bold text-white">
                  {getInitials(sharer.sharedByName || "Unknown")}
                </span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Shared by <span className="font-medium text-gray-700 dark:text-gray-300">{sharer.sharedByName}</span>
              </span>
            </div>
          )}

          {/* Title */}
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
            {topic.title}
          </h3>

          {/* Description */}
          {topic.description && topic.description !== "<p></p>" ? (
            <div
              className={`prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-400 ${
                isSelected ? "" : "line-clamp-3"
              }`}
              dangerouslySetInnerHTML={{ __html: topic.description }}
            />
          ) : (
            <p className="text-gray-400 dark:text-gray-500 text-sm italic">
              No description provided
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
                      setSelectedTopic(linked);
                    }}
                    className="px-3 py-1 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium hover:from-purple-100 hover:to-pink-100 transition-colors"
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
            <span className="text-xs text-purple-500 dark:text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">
              {isSelected ? "Click to collapse" : "Click to expand"}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <ProtectedRoute>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-purple-50 to-indigo-100 dark:from-gray-950 dark:via-purple-950/20 dark:to-gray-900">
        {/* Hero Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 dark:from-purple-900 dark:via-pink-900 dark:to-rose-900">
          <div className="absolute inset-0 bg-grid-pattern opacity-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h1 className="text-4xl font-bold text-white">Shared With Me</h1>
                </div>
                <p className="text-purple-100 text-lg">
                  Topics shared by your friends and colleagues
                </p>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-6 py-4 border border-white/20">
                  <p className="text-3xl font-bold text-white">{allSharedTopics.length}</p>
                  <p className="text-purple-200 text-sm">Total Topics</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-6 py-4 border border-white/20">
                  <p className="text-3xl font-bold text-white">{sharerCount}</p>
                  <p className="text-purple-200 text-sm">Contributors</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-6 py-4 border border-white/20">
                  <p className="text-3xl font-bold text-white">{sharedTopics.length}</p>
                  <p className="text-purple-200 text-sm">Shares</p>
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="mt-8 max-w-2xl">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search shared topics..."
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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
                <div className="w-16 h-16 border-4 border-purple-200 dark:border-purple-900 rounded-full animate-pulse" />
                <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-purple-600 rounded-full animate-spin" />
              </div>
              <p className="mt-6 text-gray-600 dark:text-gray-400 font-medium">
                Loading shared topics...
              </p>
            </div>
          ) : sharedTopics.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-full flex items-center justify-center">
                <svg className="w-16 h-16 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                No shared topics yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-6">
                When your friends share topics with you, they'll appear here. Add friends to start sharing knowledge!
              </p>
              <a
                href="/friends"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Find Friends
              </a>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Sidebar */}
              <div className="lg:w-80 flex-shrink-0">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden sticky top-4">
                  {/* Contributors Section */}
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-3">Contributors</h3>
                    <div className="space-y-2">
                      {/* All option */}
                      <button
                        onClick={() => setSelectedSharer(null)}
                        className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                          selectedSharer === null
                            ? "bg-purple-100 dark:bg-purple-900/50"
                            : "hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                          </svg>
                        </div>
                        <div className="flex-1 text-left">
                          <p className={`text-sm font-medium ${selectedSharer === null ? "text-purple-700 dark:text-purple-300" : "text-gray-900 dark:text-white"}`}>
                            All Contributors
                          </p>
                          <p className="text-xs text-gray-500">{allSharedTopics.length} topics</p>
                        </div>
                        {selectedSharer === null && (
                          <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>

                      {/* Individual sharers */}
                      {Object.entries(groupedBySharer).map(([sharerId, data]) => (
                        <button
                          key={sharerId}
                          onClick={() => setSelectedSharer(sharerId)}
                          className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                            selectedSharer === sharerId
                              ? "bg-purple-100 dark:bg-purple-900/50"
                              : "hover:bg-gray-100 dark:hover:bg-gray-700"
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarColor(data.name)} flex items-center justify-center`}>
                            <span className="text-xs font-bold text-white">{getInitials(data.name)}</span>
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <p className={`text-sm font-medium truncate ${selectedSharer === sharerId ? "text-purple-700 dark:text-purple-300" : "text-gray-900 dark:text-white"}`}>
                              {data.name}
                            </p>
                            <p className="text-xs text-gray-500">{data.topics.length} topics</p>
                          </div>
                          {selectedSharer === sharerId && (
                            <svg className="w-5 h-5 text-purple-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Topic Tree */}
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-3">
                      Topics ({filteredTopics.length})
                    </h3>
                    <div className="max-h-80 overflow-y-auto">
                      {topicTree.length > 0 ? (
                        <div className="space-y-1">
                          {topicTree.map((node) => renderTreeNode(node))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                          {searchQuery ? "No topics match your search" : "No topics available"}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Quick stats */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-800/50">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-3 bg-white dark:bg-gray-700 rounded-lg">
                        <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                          {filteredTopics.filter((t) => t.linkedTopics && t.linkedTopics.length > 0).length}
                        </p>
                        <p className="text-xs text-gray-500">With Links</p>
                      </div>
                      <div className="text-center p-3 bg-white dark:bg-gray-700 rounded-lg">
                        <p className="text-lg font-bold text-pink-600 dark:text-pink-400">
                          {filteredTopics.filter((t) => t.description && t.description !== "<p></p>").length}
                        </p>
                        <p className="text-xs text-gray-500">With Desc</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Topic Cards */}
              <div className="flex-1 min-w-0">
                {filteredTopics.length === 0 ? (
                  <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
                    <svg className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-gray-500 dark:text-gray-400">
                      {searchQuery ? "No topics match your search" : "No topics from this contributor"}
                    </p>
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="mt-4 text-purple-600 dark:text-purple-400 hover:underline text-sm"
                      >
                        Clear search
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {filteredTopics.map((topic) => renderTopicCard(topic))}
                  </div>
                )}

                {/* Results count */}
                {(searchQuery || selectedSharer) && filteredTopics.length > 0 && (
                  <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
                    Showing {filteredTopics.length} of {allSharedTopics.length} topics
                    {selectedSharer && groupedBySharer[selectedSharer] && (
                      <span> from {groupedBySharer[selectedSharer].name}</span>
                    )}
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
