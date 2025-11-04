"use client";

import { useState, useEffect, type ReactElement } from "react";
import {
  createTopic,
  getTopics,
  getTopic,
  updateTopic,
  deleteTopic,
  linkTopics,
  unlinkTopics,
  type Topic,
} from "../actions";

interface TopicNode extends Topic {
  children?: TopicNode[];
}

export default function TopicsPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    parentTopicId: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadTopics();
  }, []);

  const loadTopics = async () => {
    setLoading(true);
    try {
      const fetchedTopics = await getTopics();
      setTopics(fetchedTopics);
      if (selectedTopic) {
        // Refresh selected topic data
        const refreshed = await getTopic(selectedTopic._id!);
        if (refreshed) {
          setSelectedTopic(refreshed);
        }
      }
    } catch (err) {
      setError("Failed to load topics");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (editingTopic) {
      // Update existing topic
      const formDataObj = new FormData();
      formDataObj.append("title", formData.title);
      formDataObj.append("description", formData.description);
      formDataObj.append("parentTopicId", formData.parentTopicId);

      const result = await updateTopic(editingTopic._id!, formDataObj);
      if (result.success) {
        setSuccess("Topic updated successfully!");
        setEditingTopic(null);
        setFormData({ title: "", description: "", parentTopicId: "" });
        await loadTopics();
      } else {
        setError(result.error || "Failed to update topic");
      }
    } else {
      // Create new topic
      const formDataObj = new FormData();
      formDataObj.append("title", formData.title);
      formDataObj.append("description", formData.description);
      formDataObj.append("parentTopicId", formData.parentTopicId);

      const result = await createTopic(formDataObj);
      if (result.success) {
        setSuccess("Topic created successfully!");
        setFormData({ title: "", description: "", parentTopicId: "" });
        await loadTopics();
      } else {
        setError(result.error || "Failed to create topic");
      }
    }
  };

  const handleEdit = (topic: Topic) => {
    setEditingTopic(topic);
    setFormData({
      title: topic.title,
      description: topic.description,
      parentTopicId: topic.parentTopicId || "",
    });
    setSelectedTopic(topic);
    setError(null);
    setSuccess(null);
  };

  const handleCancel = () => {
    setEditingTopic(null);
    setFormData({ title: "", description: "", parentTopicId: "" });
    setError(null);
    setSuccess(null);
  };

  const handleDelete = async (topicId: string) => {
    if (!confirm("Are you sure you want to delete this topic?")) {
      return;
    }

    setError(null);
    setSuccess(null);
    const result = await deleteTopic(topicId);
    if (result.success) {
      setSuccess("Topic deleted successfully!");
      if (selectedTopic?._id === topicId) {
        setSelectedTopic(null);
      }
      await loadTopics();
    } else {
      setError(result.error || "Failed to delete topic");
    }
  };

  const handleTopicClick = async (topicId: string) => {
    const topic = await getTopic(topicId);
    if (topic) {
      setSelectedTopic(topic);
      setEditingTopic(null);
      setFormData({ title: "", description: "", parentTopicId: "" });
    }
  };

  const handleLinkTopic = async (linkedTopicId: string) => {
    if (!selectedTopic) return;

    setError(null);
    const result = await linkTopics(selectedTopic._id!, linkedTopicId);
    if (result.success) {
      setSuccess("Topics linked successfully!");
      await loadTopics();
    } else {
      setError(result.error || "Failed to link topics");
    }
  };

  const handleUnlinkTopic = async (linkedTopicId: string) => {
    if (!selectedTopic) return;

    setError(null);
    const result = await unlinkTopics(selectedTopic._id!, linkedTopicId);
    if (result.success) {
      setSuccess("Topics unlinked successfully!");
      await loadTopics();
    } else {
      setError(result.error || "Failed to unlink topics");
    }
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

  const renderTreeNode = (node: TopicNode, level: number = 0): ReactElement => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node._id!);
    const isSelected = selectedTopic?._id === node._id;

    return (
      <div key={node._id} className="select-none">
        <div
          className={`flex items-center gap-2 py-1 px-2 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
            isSelected ? "bg-blue-100 dark:bg-blue-900" : ""
          }`}
          style={{ paddingLeft: `${level * 20 + 8}px` }}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node._id!);
              }}
              className="w-4 h-4 flex items-center justify-center text-xs"
            >
              {isExpanded ? "▼" : "▶"}
            </button>
          )}
          {!hasChildren && <span className="w-4"></span>}
          <span
            onClick={() => handleTopicClick(node._id!)}
            className="flex-1 text-sm font-medium text-gray-900 dark:text-white"
          >
            {node.title}
          </span>
        </div>
        {hasChildren && isExpanded && (
          <div>
            {node.children!.map((child) => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const topicTree = buildTree(topics);
  const availableTopics = topics.filter(
    (t) => t._id !== editingTopic?._id && t._id !== selectedTopic?._id
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="flex h-screen">
        {/* Left Sidebar - Hierarchical Topics */}
        <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Topics
            </h2>
            <button
              onClick={() => {
                setEditingTopic(null);
                setSelectedTopic(null);
                setFormData({ title: "", description: "", parentTopicId: "" });
                setError(null);
                setSuccess(null);
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
            >
              + New Topic
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                Loading topics...
              </div>
            ) : topicTree.length === 0 ? (
              <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                No topics yet. Create your first topic!
              </div>
            ) : (
              <div>{topicTree.map((node) => renderTreeNode(node))}</div>
            )}
          </div>
        </div>

        {/* Right Panel - Topic Details and Form */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
              Topic Manager
            </h1>

            {/* Success/Error Messages */}
            {success && (
              <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
                {success}
              </div>
            )}
            {error && (
              <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                {error}
              </div>
            )}

            {/* Topic Form */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                {editingTopic ? "Edit Topic" : "Create New Topic"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="title"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Topic Title *
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Enter topic title"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={6}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Enter topic description"
                  />
                </div>
                <div>
                  <label
                    htmlFor="parentTopicId"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Parent Topic (Optional)
                  </label>
                  <select
                    id="parentTopicId"
                    value={formData.parentTopicId}
                    onChange={(e) =>
                      setFormData({ ...formData, parentTopicId: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">None (Root Topic)</option>
                    {topics
                      .filter(
                        (t) =>
                          t._id !== editingTopic?._id &&
                          t._id !== formData.parentTopicId
                      )
                      .map((topic) => (
                        <option key={topic._id} value={topic._id}>
                          {topic.title}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    {editingTopic ? "Update Topic" : "Create Topic"}
                  </button>
                  {editingTopic && (
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Selected Topic Details */}
            {selectedTopic && !editingTopic && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {selectedTopic.title}
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(selectedTopic)}
                      className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded-lg transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(selectedTopic._id!)}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </h3>
                  <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                    {selectedTopic.description || "No description provided."}
                  </p>
                </div>

                {/* Linked Topics */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Linked Topics
                  </h3>
                  {selectedTopic.linkedTopics && selectedTopic.linkedTopics.length > 0 ? (
                    <div className="space-y-2">
                      {selectedTopic.linkedTopics.map((linkedId) => {
                        const linkedTopic = topics.find((t) => t._id === linkedId);
                        return linkedTopic ? (
                          <div
                            key={linkedId}
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                          >
                            <span
                              onClick={() => handleTopicClick(linkedId)}
                              className="text-blue-600 dark:text-blue-400 cursor-pointer hover:underline"
                            >
                              {linkedTopic.title}
                            </span>
                            <button
                              onClick={() => handleUnlinkTopic(linkedId)}
                              className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded transition-colors"
                            >
                              Unlink
                            </button>
                          </div>
                        ) : null;
                      })}
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">
                      No linked topics.
                    </p>
                  )}
                </div>

                {/* Link New Topic */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Link to Another Topic
                  </h3>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleLinkTopic(e.target.value);
                        e.target.value = "";
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">Select a topic to link...</option>
                    {availableTopics
                      .filter(
                        (t) =>
                          !selectedTopic.linkedTopics?.includes(t._id!) &&
                          t._id !== selectedTopic._id
                      )
                      .map((topic) => (
                        <option key={topic._id} value={topic._id}>
                          {topic.title}
                        </option>
                      ))}
                  </select>
                </div>

                {selectedTopic.createdAt && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
                    Created: {new Date(selectedTopic.createdAt).toLocaleString()}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

