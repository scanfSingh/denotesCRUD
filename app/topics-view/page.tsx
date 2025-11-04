"use client";

import { useState, useEffect } from "react";
import { getTopics, type Topic } from "../actions";

interface TopicNode extends Topic {
  children?: TopicNode[];
}

export default function TopicsViewPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadTopics();
  }, []);

  const loadTopics = async () => {
    setLoading(true);
    try {
      const fetchedTopics = await getTopics();
      setTopics(fetchedTopics);
    } catch (err) {
      console.error("Failed to load topics:", err);
    } finally {
      setLoading(false);
    }
  };

  // Build hierarchical tree structure
  const buildTree = (topics: Topic[]): TopicNode[] => {
    const topicMap = new Map<string, TopicNode>();
    const rootTopics: TopicNode[] = [];

    // Create map of all topics
    topics.forEach((topic) => {
      topicMap.set(topic._id!, { ...topic, children: [] });
    });

    // Build tree structure
    topics.forEach((topic) => {
      const node = topicMap.get(topic._id!)!;
      if (topic.parentTopicId && topicMap.has(topic.parentTopicId)) {
        const parent = topicMap.get(topic.parentTopicId)!;
        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push(node);
      } else {
        rootTopics.push(node);
      }
    });

    // Sort by title
    const sortTopics = (nodes: TopicNode[]) => {
      nodes.sort((a, b) => a.title.localeCompare(b.title));
      nodes.forEach((node) => {
        if (node.children) {
          sortTopics(node.children);
        }
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

  const renderTopicCard = (topic: Topic): JSX.Element => {
    const linkedTopicsData = topics.filter((t) =>
      topic.linkedTopics?.includes(t._id!)
    );

    return (
      <div
        key={topic._id}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
      >
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {topic.title}
          </h2>
          {topic.description ? (
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
              {topic.description}
            </p>
          ) : (
            <p className="text-gray-400 dark:text-gray-500 italic">
              No description provided.
            </p>
          )}
        </div>

        {linkedTopicsData.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
              Linked Topics
            </h3>
            <div className="flex flex-wrap gap-2">
              {linkedTopicsData.map((linkedTopic) => (
                <span
                  key={linkedTopic._id}
                  className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium"
                >
                  {linkedTopic.title}
                </span>
              ))}
            </div>
          </div>
        )}

        {topic.createdAt && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            Created: {new Date(topic.createdAt).toLocaleString()}
          </p>
        )}
      </div>
    );
  };

  const renderTreeNode = (node: TopicNode, level: number = 0): JSX.Element => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node._id!);

    return (
      <div key={node._id} className="mb-4">
        <div
          className={`flex items-center gap-2 py-2 px-3 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
            hasChildren ? "bg-gray-50 dark:bg-gray-800" : ""
          }`}
          style={{ paddingLeft: `${level * 24 + 12}px` }}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node._id!);
              }}
              className="w-5 h-5 flex items-center justify-center text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              {isExpanded ? "▼" : "▶"}
            </button>
          )}
          {!hasChildren && <span className="w-5"></span>}
          <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white">
            {node.title}
          </span>
        </div>
        {hasChildren && isExpanded && (
          <div className="mt-1">
            {node.children!.map((child) => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const topicTree = buildTree(topics);
  const flatTopics = topics;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Topics & Descriptions
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            View all topics and their descriptions (Read-only)
          </p>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              Loading topics...
            </p>
          </div>
        ) : topics.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              No topics available yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Sidebar - Topic Tree Navigation */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 sticky top-8">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  Topic Structure ({topics.length})
                </h2>
                <div className="max-h-[600px] overflow-y-auto">
                  {topicTree.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      No topics available.
                    </p>
                  ) : (
                    <div>{topicTree.map((node) => renderTreeNode(node))}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Panel - Topic Cards */}
            <div className="lg:col-span-2">
              <div className="space-y-6">
                {flatTopics.length === 0 ? (
                  <div className="text-center py-16">
                    <p className="text-gray-600 dark:text-gray-400">
                      No topics to display.
                    </p>
                  </div>
                ) : (
                  flatTopics.map((topic) => renderTopicCard(topic))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

