"use client";

import { useState, useEffect, useRef, type ReactElement } from "react";
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
import ProtectedRoute from "../components/ProtectedRoute";
import Navigation from "../components/Navigation";
import ShareTopicsModal from "../components/ShareTopicsModal";
import RichTextEditor from "../components/RichTextEditor";

interface TopicNode extends Topic {
  children?: TopicNode[];
}

// Custom Parent Topic Selector Component
interface ParentTopicSelectorProps {
  topics: Topic[];
  selectedId: string;
  onChange: (id: string) => void;
  excludeId?: string;
}

function ParentTopicSelector({ topics, selectedId, onChange, excludeId }: ParentTopicSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Build tree structure
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

  // Filter topics based on search
  const filterTree = (nodes: TopicNode[], query: string): TopicNode[] => {
    if (!query) return nodes;
    
    const filtered: TopicNode[] = [];
    nodes.forEach((node) => {
      const matchesSearch = node.title.toLowerCase().includes(query.toLowerCase());
      const filteredChildren = node.children ? filterTree(node.children, query) : [];
      
      if (matchesSearch || filteredChildren.length > 0) {
        filtered.push({
          ...node,
          children: filteredChildren.length > 0 ? filteredChildren : node.children,
        });
      }
    });
    return filtered;
  };

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedNodes(newExpanded);
  };

  const handleSelect = (id: string) => {
    onChange(id);
    setIsOpen(false);
    setSearchQuery("");
  };

  const selectedTopic = topics.find((t) => t._id === selectedId);
  const topicTree = buildTree(topics.filter((t) => t._id !== excludeId));
  const filteredTree = filterTree(topicTree, searchQuery);

  // Get path to selected topic for display
  const getTopicPath = (topicId: string): string[] => {
    const path: string[] = [];
    let current = topics.find((t) => t._id === topicId);
    while (current) {
      path.unshift(current.title);
      current = topics.find((t) => t._id === current?.parentTopicId);
    }
    return path;
  };

  const renderTreeNode = (node: TopicNode, level: number = 0): ReactElement => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node._id!) || searchQuery.length > 0;
    const isSelected = node._id === selectedId;
    const isDisabled = node._id === excludeId;

    return (
      <div key={node._id}>
        <div
          onClick={() => !isDisabled && handleSelect(node._id!)}
          className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-all duration-150 ${
            isSelected
              ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
              : isDisabled
              ? "opacity-40 cursor-not-allowed"
              : "hover:bg-gray-100 dark:hover:bg-gray-700"
          }`}
          style={{ paddingLeft: `${level * 20 + 12}px` }}
        >
          {hasChildren ? (
            <button
              onClick={(e) => toggleExpand(node._id!, e)}
              className="w-5 h-5 flex items-center justify-center text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
            >
              <svg
                className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          ) : (
            <span className="w-5 h-5 flex items-center justify-center">
              <span className="w-1.5 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
            </span>
          )}
          <svg
            className={`w-4 h-4 flex-shrink-0 ${
              isSelected ? "text-blue-600 dark:text-blue-400" : "text-gray-400"
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
          </svg>
          <span className="flex-1 text-sm font-medium truncate">{node.title}</span>
          {isSelected && (
            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
        {hasChildren && isExpanded && (
          <div className="border-l border-gray-200 dark:border-gray-700 ml-6">
            {node.children!.map((child) => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Selected Value Display */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-3 border-2 rounded-xl transition-all duration-200 ${
          isOpen
            ? "border-blue-500 ring-2 ring-blue-100 dark:ring-blue-900/50"
            : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
        } bg-white dark:bg-gray-800`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {selectedId ? (
            <>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                </svg>
              </div>
              <div className="min-w-0 text-left">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {selectedTopic?.title}
                </p>
                {getTopicPath(selectedId).length > 1 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {getTopicPath(selectedId).slice(0, -1).join(" → ")}
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                No parent (Root Topic)
              </span>
            </>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Search Input */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
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
              <input
                type="text"
                placeholder="Search topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white"
                autoFocus
              />
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-72 overflow-y-auto">
            {/* Root Option */}
            <div
              onClick={() => handleSelect("")}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-gray-100 dark:border-gray-700 ${
                selectedId === ""
                  ? "bg-blue-50 dark:bg-blue-900/30"
                  : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">No Parent</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Create as a root topic</p>
              </div>
              {selectedId === "" && (
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>

            {/* Topic Tree */}
            {filteredTree.length > 0 ? (
              <div className="py-2">
                {filteredTree.map((node) => renderTreeNode(node))}
              </div>
            ) : searchQuery ? (
              <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm">No topics found</p>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
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
  const [selectedTopicIds, setSelectedTopicIds] = useState<Set<string>>(new Set());
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

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

  const toggleTopicSelection = (topicId: string) => {
    const newSelected = new Set(selectedTopicIds);
    if (newSelected.has(topicId)) {
      newSelected.delete(topicId);
    } else {
      newSelected.add(topicId);
    }
    setSelectedTopicIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedTopicIds.size === topics.length) {
      setSelectedTopicIds(new Set());
    } else {
      setSelectedTopicIds(new Set(topics.map((t) => t._id!)));
    }
  };

  const handleShareClick = () => {
    if (selectedTopicIds.size === 0) {
      setError("Please select at least one topic to share");
      return;
    }
    setIsShareModalOpen(true);
  };

  const handleShareSuccess = () => {
    setSelectedTopicIds(new Set());
    setSuccess("Topics shared successfully!");
    setTimeout(() => setSuccess(null), 3000);
  };

  const renderTreeNode = (node: TopicNode, level: number = 0): ReactElement => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node._id!);
    const isSelected = selectedTopic?._id === node._id;
    const isChecked = selectedTopicIds.has(node._id!);

    return (
      <div key={node._id} className="select-none">
        <div
          className={`flex items-center gap-2 py-1 px-2 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
            isSelected ? "bg-blue-100 dark:bg-blue-900" : ""
          }`}
          style={{ paddingLeft: `${level * 20 + 8}px` }}
        >
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) => {
              e.stopPropagation();
              toggleTopicSelection(node._id!);
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
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
    <ProtectedRoute>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="flex h-screen">
        {/* Left Sidebar - Hierarchical Topics */}
        <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Topics
            </h2>
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => {
                  setEditingTopic(null);
                  setSelectedTopic(null);
                  setFormData({ title: "", description: "", parentTopicId: "" });
                  setError(null);
                  setSuccess(null);
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
              >
                + New Topic
              </button>
              {topics.length > 0 && (
                <button
                  onClick={handleSelectAll}
                  className="px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors text-sm"
                  title={selectedTopicIds.size === topics.length ? "Deselect All" : "Select All"}
                >
                  {selectedTopicIds.size === topics.length ? "☑" : "☐"}
                </button>
              )}
            </div>
            {selectedTopicIds.size > 0 && (
              <button
                onClick={handleShareClick}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
              >
                📤 Share ({selectedTopicIds.size})
              </button>
            )}
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
                  <RichTextEditor
                    content={formData.description}
                    onChange={(html) =>
                      setFormData({ ...formData, description: html })
                    }
                    placeholder="Enter topic description..."
                  />
                </div>
                <div>
                  <label
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Parent Topic (Optional)
                  </label>
                  <ParentTopicSelector
                    topics={topics}
                    selectedId={formData.parentTopicId}
                    onChange={(id) => setFormData({ ...formData, parentTopicId: id })}
                    excludeId={editingTopic?._id}
                  />
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
                  {selectedTopic.description && selectedTopic.description !== "<p></p>" ? (
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none text-gray-900 dark:text-white"
                      dangerouslySetInnerHTML={{ __html: selectedTopic.description }}
                    />
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 italic">
                      No description provided.
                    </p>
                  )}
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

      <ShareTopicsModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        selectedTopicIds={Array.from(selectedTopicIds)}
        onSuccess={handleShareSuccess}
      />
    </ProtectedRoute>
  );
}

