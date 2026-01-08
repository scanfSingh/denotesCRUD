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
  createSubject,
  getSubjects,
  updateSubject,
  deleteSubject,
  type Topic,
  type Subject,
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const filterTree = (nodes: TopicNode[], query: string): TopicNode[] => {
    if (!query) return nodes;
    const filtered: TopicNode[] = [];
    nodes.forEach((node) => {
      const matchesSearch = node.title.toLowerCase().includes(query.toLowerCase());
      const filteredChildren = node.children ? filterTree(node.children, query) : [];
      if (matchesSearch || filteredChildren.length > 0) {
        filtered.push({ ...node, children: filteredChildren.length > 0 ? filteredChildren : node.children });
      }
    });
    return filtered;
  };

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
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
            isSelected ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300"
              : isDisabled ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-100 dark:hover:bg-gray-700"
          }`}
          style={{ paddingLeft: `${level * 20 + 12}px` }}
        >
          {hasChildren ? (
            <button onClick={(e) => toggleExpand(node._id!, e)} className="w-5 h-5 flex items-center justify-center text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors">
              <svg className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          ) : (
            <span className="w-5 h-5 flex items-center justify-center"><span className="w-1.5 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" /></span>
          )}
          <svg className={`w-4 h-4 flex-shrink-0 ${isSelected ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400"}`} fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
          </svg>
          <span className="flex-1 text-sm font-medium truncate">{node.title}</span>
          {isSelected && (
            <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </div>
        {hasChildren && isExpanded && <div className="border-l border-gray-200 dark:border-gray-700 ml-6">{node.children!.map((child) => renderTreeNode(child, level + 1))}</div>}
      </div>
    );
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button type="button" onClick={() => setIsOpen(!isOpen)} className={`w-full flex items-center justify-between px-4 py-3 border-2 rounded-xl transition-all duration-200 ${isOpen ? "border-indigo-500 ring-2 ring-indigo-100 dark:ring-indigo-900/50" : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"} bg-white dark:bg-gray-800`}>
        <div className="flex items-center gap-3 min-w-0">
          {selectedId ? (
            <>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" /></svg>
              </div>
              <div className="min-w-0 text-left">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{selectedTopic?.title}</p>
                {getTopicPath(selectedId).length > 1 && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{getTopicPath(selectedId).slice(0, -1).join(" → ")}</p>}
              </div>
            </>
          ) : (
            <>
              <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">No parent (Root Topic)</span>
            </>
          )}
        </div>
        <svg className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" placeholder="Search topics..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:text-white" autoFocus />
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto">
            <div onClick={() => handleSelect("")} className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-gray-100 dark:border-gray-700 ${selectedId === "" ? "bg-indigo-50 dark:bg-indigo-900/30" : "hover:bg-gray-50 dark:hover:bg-gray-700/50"}`}>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>
              </div>
              <div className="flex-1"><p className="text-sm font-medium text-gray-900 dark:text-white">No Parent</p><p className="text-xs text-gray-500 dark:text-gray-400">Create as a root topic</p></div>
              {selectedId === "" && <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
            </div>
            {filteredTree.length > 0 ? <div className="py-2">{filteredTree.map((node) => renderTreeNode(node))}</div> : searchQuery ? (
              <div className="py-8 text-center text-gray-500 dark:text-gray-400"><svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><p className="text-sm">No topics found</p></div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

// Subject colors for selection
const SUBJECT_COLORS = [
  "#6366f1", // Indigo
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#ef4444", // Red
  "#f97316", // Orange
  "#eab308", // Yellow
  "#22c55e", // Green
  "#14b8a6", // Teal
  "#06b6d4", // Cyan
  "#3b82f6", // Blue
];

export default function TopicsPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [formData, setFormData] = useState({ title: "", description: "", parentTopicId: "", subjectId: "" });
  const [subjectFormData, setSubjectFormData] = useState({ title: "", description: "", color: "#6366f1" });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [selectedTopicIds, setSelectedTopicIds] = useState<Set<string>>(new Set());
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSubjectFilter, setActiveSubjectFilter] = useState<string | null>(null); // null = all, "unassigned" = no subject, or subjectId

  useEffect(() => {
    loadTopicsAndSubjects();
  }, []);

  const loadTopicsAndSubjects = async () => {
    setLoading(true);
    try {
      const [fetchedTopics, fetchedSubjects] = await Promise.all([
        getTopics(),
        getSubjects(),
      ]);
      setTopics(fetchedTopics);
      setSubjects(fetchedSubjects);
      const allIds = new Set(fetchedTopics.map((t) => t._id!));
      setExpandedNodes(allIds);
      const allSubjectIds = new Set(fetchedSubjects.map((s) => s._id!));
      setExpandedSubjects(allSubjectIds);
      if (selectedTopic) {
        const refreshed = await getTopic(selectedTopic._id!);
        if (refreshed) setSelectedTopic(refreshed);
      }
    } catch (err) {
      setError("Failed to load topics");
    } finally {
      setLoading(false);
    }
  };

  const buildTree = (topics: Topic[]): TopicNode[] => {
    const topicMap = new Map<string, TopicNode>();
    const rootTopics: TopicNode[] = [];
    topics.forEach((topic) => topicMap.set(topic._id!, { ...topic, children: [] }));
    topics.forEach((topic) => {
      const node = topicMap.get(topic._id!)!;
      if (topic.parentTopicId && topicMap.has(topic.parentTopicId)) {
        const parent = topicMap.get(topic.parentTopicId)!;
        if (!parent.children) parent.children = [];
        parent.children.push(node);
      } else rootTopics.push(node);
    });
    const sortTopics = (nodes: TopicNode[]) => {
      nodes.sort((a, b) => a.title.localeCompare(b.title));
      nodes.forEach((node) => { if (node.children) sortTopics(node.children); });
    };
    sortTopics(rootTopics);
    return rootTopics;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (editingTopic) {
      const formDataObj = new FormData();
      formDataObj.append("title", formData.title);
      formDataObj.append("description", formData.description);
      formDataObj.append("parentTopicId", formData.parentTopicId);
      formDataObj.append("subjectId", formData.subjectId);
      const result = await updateTopic(editingTopic._id!, formDataObj);
      if (result.success) {
        setSuccess("Topic updated successfully!");
        setEditingTopic(null);
        setFormData({ title: "", description: "", parentTopicId: "", subjectId: "" });
        setShowForm(false);
        await loadTopicsAndSubjects();
      } else setError(result.error || "Failed to update topic");
    } else {
      const formDataObj = new FormData();
      formDataObj.append("title", formData.title);
      formDataObj.append("description", formData.description);
      formDataObj.append("parentTopicId", formData.parentTopicId);
      formDataObj.append("subjectId", formData.subjectId);
      const result = await createTopic(formDataObj);
      if (result.success) {
        setSuccess("Topic created successfully!");
        setFormData({ title: "", description: "", parentTopicId: "", subjectId: "" });
        setShowForm(false);
        await loadTopicsAndSubjects();
      } else setError(result.error || "Failed to create topic");
    }
  };

  const handleSubjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (editingSubject) {
      const formDataObj = new FormData();
      formDataObj.append("title", subjectFormData.title);
      formDataObj.append("description", subjectFormData.description);
      formDataObj.append("color", subjectFormData.color);
      const result = await updateSubject(editingSubject._id!, formDataObj);
      if (result.success) {
        setSuccess("Subject updated successfully!");
        setEditingSubject(null);
        setSubjectFormData({ title: "", description: "", color: "#6366f1" });
        setShowSubjectForm(false);
        await loadTopicsAndSubjects();
      } else setError(result.error || "Failed to update subject");
    } else {
      const formDataObj = new FormData();
      formDataObj.append("title", subjectFormData.title);
      formDataObj.append("description", subjectFormData.description);
      formDataObj.append("color", subjectFormData.color);
      const result = await createSubject(formDataObj);
      if (result.success) {
        setSuccess("Subject created successfully!");
        setSubjectFormData({ title: "", description: "", color: "#6366f1" });
        setShowSubjectForm(false);
        await loadTopicsAndSubjects();
      } else setError(result.error || "Failed to create subject");
    }
  };

  const handleEdit = (topic: Topic) => {
    setEditingTopic(topic);
    setFormData({ title: topic.title, description: topic.description, parentTopicId: topic.parentTopicId || "", subjectId: topic.subjectId || "" });
    setShowForm(true);
    setError(null);
    setSuccess(null);
  };

  const handleEditSubject = (subject: Subject) => {
    setEditingSubject(subject);
    setSubjectFormData({ title: subject.title, description: subject.description, color: subject.color || "#6366f1" });
    setShowSubjectForm(true);
    setError(null);
    setSuccess(null);
  };

  const handleCancel = () => {
    setEditingTopic(null);
    setFormData({ title: "", description: "", parentTopicId: "", subjectId: "" });
    setShowForm(false);
    setError(null);
    setSuccess(null);
  };

  const handleCancelSubject = () => {
    setEditingSubject(null);
    setSubjectFormData({ title: "", description: "", color: "#6366f1" });
    setShowSubjectForm(false);
    setError(null);
    setSuccess(null);
  };

  const handleDelete = async (topicId: string) => {
    if (!confirm("Are you sure you want to delete this topic?")) return;
    setError(null);
    setSuccess(null);
    const result = await deleteTopic(topicId);
    if (result.success) {
      setSuccess("Topic deleted successfully!");
      if (selectedTopic?._id === topicId) setSelectedTopic(null);
      await loadTopicsAndSubjects();
    } else setError(result.error || "Failed to delete topic");
  };

  const handleDeleteSubject = async (subjectId: string) => {
    if (!confirm("Are you sure you want to delete this subject? Topics under this subject will become unassigned.")) return;
    setError(null);
    setSuccess(null);
    const result = await deleteSubject(subjectId);
    if (result.success) {
      setSuccess("Subject deleted successfully!");
      if (selectedSubject?._id === subjectId) setSelectedSubject(null);
      await loadTopicsAndSubjects();
    } else setError(result.error || "Failed to delete subject");
  };

  const handleTopicClick = async (topicId: string) => {
    const topic = await getTopic(topicId);
    if (topic) {
      setSelectedTopic(topic);
      setSelectedSubject(null);
      setEditingTopic(null);
      setFormData({ title: "", description: "", parentTopicId: "", subjectId: "" });
    }
  };

  const handleLinkTopic = async (linkedTopicId: string) => {
    if (!selectedTopic) return;
    setError(null);
    const result = await linkTopics(selectedTopic._id!, linkedTopicId);
    if (result.success) {
      setSuccess("Topics linked successfully!");
      await loadTopicsAndSubjects();
    } else setError(result.error || "Failed to link topics");
  };

  const handleUnlinkTopic = async (linkedTopicId: string) => {
    if (!selectedTopic) return;
    setError(null);
    const result = await unlinkTopics(selectedTopic._id!, linkedTopicId);
    if (result.success) {
      setSuccess("Topics unlinked successfully!");
      await loadTopicsAndSubjects();
    } else setError(result.error || "Failed to unlink topics");
  };

  const toggleSubjectExpand = (subjectId: string) => {
    const newExpanded = new Set(expandedSubjects);
    if (newExpanded.has(subjectId)) newExpanded.delete(subjectId);
    else newExpanded.add(subjectId);
    setExpandedSubjects(newExpanded);
  };

  const handleSubjectClick = (subject: Subject) => {
    setSelectedSubject(subject);
    setSelectedTopic(null);
  };

  const toggleExpand = (topicId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(topicId)) newExpanded.delete(topicId);
    else newExpanded.add(topicId);
    setExpandedNodes(newExpanded);
  };

  const toggleTopicSelection = (topicId: string) => {
    const newSelected = new Set(selectedTopicIds);
    if (newSelected.has(topicId)) newSelected.delete(topicId);
    else newSelected.add(topicId);
    setSelectedTopicIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedTopicIds.size === topics.length) setSelectedTopicIds(new Set());
    else setSelectedTopicIds(new Set(topics.map((t) => t._id!)));
  };

  const handleShareClick = () => {
    if (selectedTopicIds.size === 0) { setError("Please select at least one topic to share"); return; }
    setIsShareModalOpen(true);
  };

  const handleShareSuccess = () => {
    setSelectedTopicIds(new Set());
    setSuccess("Topics shared successfully!");
    setTimeout(() => setSuccess(null), 3000);
  };

  // Helper function to get the subject of a topic (including inherited from parent)
  const getTopicSubject = (topic: Topic): string | undefined => {
    if (topic.subjectId) return topic.subjectId;
    if (topic.parentTopicId) {
      const parent = topics.find(t => t._id === topic.parentTopicId);
      if (parent) return getTopicSubject(parent);
    }
    return undefined;
  };

  const filteredTopics = topics.filter((t) => {
    // Apply search filter
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Apply subject filter (including inherited subject from parent)
    let matchesSubject = true;
    if (activeSubjectFilter === "unassigned") {
      // For unassigned, check if topic has no subject (directly or inherited)
      matchesSubject = !getTopicSubject(t);
    } else if (activeSubjectFilter !== null) {
      // Check if topic belongs to subject (directly or through parent inheritance)
      matchesSubject = getTopicSubject(t) === activeSubjectFilter;
    }
    
    return matchesSearch && matchesSubject;
  });

  const topicTree = buildTree(filteredTopics);
  const availableTopics = topics.filter((t) => t._id !== editingTopic?._id && t._id !== selectedTopic?._id);
  const rootCount = topics.filter((t) => !t.parentTopicId).length;
  const withLinks = topics.filter((t) => t.linkedTopics && t.linkedTopics.length > 0).length;

  const renderTreeNode = (node: TopicNode, level: number = 0): ReactElement => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node._id!);
    const isSelected = selectedTopic?._id === node._id;
    const isChecked = selectedTopicIds.has(node._id!);

    return (
      <div key={node._id} className="select-none">
        <div className={`group flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-all duration-200 ${isSelected ? "bg-indigo-100 dark:bg-indigo-900/50 border-l-4 border-indigo-500" : "hover:bg-gray-100 dark:hover:bg-gray-700/50"}`} style={{ paddingLeft: `${level * 16 + 8}px` }}>
          <input type="checkbox" checked={isChecked} onChange={(e) => { e.stopPropagation(); toggleTopicSelection(node._id!); }} onClick={(e) => e.stopPropagation()} className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer" />
          {hasChildren ? (
            <button onClick={(e) => { e.stopPropagation(); toggleExpand(node._id!); }} className="w-5 h-5 flex items-center justify-center text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors">
              <svg className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          ) : <span className="w-5 h-5 flex items-center justify-center"><span className="w-1.5 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" /></span>}
          <svg className={`w-4 h-4 flex-shrink-0 ${isSelected ? "text-indigo-600" : "text-gray-400"}`} fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
          </svg>
          <span onClick={() => handleTopicClick(node._id!)} className={`flex-1 text-sm font-medium truncate ${isSelected ? "text-indigo-700 dark:text-indigo-300" : "text-gray-900 dark:text-white"}`}>
            {node.title}
          </span>
          {node.linkedTopics && node.linkedTopics.length > 0 && (
            <span className="text-xs text-gray-400 dark:text-gray-500">{node.linkedTopics.length}</span>
          )}
        </div>
        {hasChildren && isExpanded && (
          <div className="ml-4 border-l border-gray-200 dark:border-gray-700">
            {node.children!.map((child) => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <ProtectedRoute>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-100 dark:from-gray-950 dark:via-indigo-950/20 dark:to-gray-900">
        {/* Hero Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-700 dark:from-indigo-900 dark:via-purple-900 dark:to-violet-900">
          <div className="absolute inset-0 bg-grid-pattern opacity-10" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
            </div>
                  <h1 className="text-4xl font-bold text-white">Topic Manager</h1>
          </div>
                <p className="text-indigo-100 text-lg">Organize your knowledge with hierarchical topics</p>
              </div>

              <div className="flex flex-wrap gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-6 py-4 border border-white/20">
                  <p className="text-3xl font-bold text-white">{subjects.length}</p>
                  <p className="text-indigo-200 text-sm">Subjects</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-6 py-4 border border-white/20">
                  <p className="text-3xl font-bold text-white">{topics.length}</p>
                  <p className="text-indigo-200 text-sm">Total Topics</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-6 py-4 border border-white/20">
                  <p className="text-3xl font-bold text-white">{rootCount}</p>
                  <p className="text-indigo-200 text-sm">Root Topics</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-6 py-4 border border-white/20">
                  <p className="text-3xl font-bold text-white">{withLinks}</p>
                  <p className="text-indigo-200 text-sm">With Links</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Subject Tabs */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 py-3 overflow-x-auto scrollbar-hide">
              {/* All Topics Tab */}
              <button
                onClick={() => { setActiveSubjectFilter(null); setSelectedSubject(null); }}
                className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeSubjectFilter === null
                    ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  All
                  <span className="text-xs bg-gray-200 dark:bg-gray-600 px-1.5 py-0.5 rounded">{topics.length}</span>
                </span>
              </button>

              {/* Divider */}
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 flex-shrink-0" />

              {/* Subject Tabs */}
              {subjects.map((subject) => {
                const count = topics.filter(t => t.subjectId === subject._id).length;
                const isActive = activeSubjectFilter === subject._id;
                return (
                  <button
                    key={subject._id}
                    onClick={() => { setActiveSubjectFilter(subject._id!); setSelectedSubject(subject); setSelectedTopic(null); }}
                    className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? "shadow-sm"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                    style={isActive ? { backgroundColor: `${subject.color}20`, color: subject.color } : {}}
                  >
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: subject.color }} />
                      {subject.title}
                      <span 
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={isActive ? { backgroundColor: `${subject.color}30` } : { backgroundColor: 'rgb(229 231 235)', color: 'inherit' }}
                      >
                        {count}
                      </span>
                    </span>
                  </button>
                );
              })}

              {/* Unassigned Tab */}
              {topics.some(t => !t.subjectId) && (
                <>
                  <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 flex-shrink-0" />
                  <button
                    onClick={() => { setActiveSubjectFilter("unassigned"); setSelectedSubject(null); }}
                    className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeSubjectFilter === "unassigned"
                        ? "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 shadow-sm"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                      Unassigned
                      <span className="text-xs bg-gray-300 dark:bg-gray-500 px-1.5 py-0.5 rounded">
                        {topics.filter(t => !t.subjectId).length}
                      </span>
                    </span>
                  </button>
                </>
              )}

              {/* Add Subject Button */}
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 flex-shrink-0" />
              <button
                onClick={() => { setEditingSubject(null); setSubjectFormData({ title: "", description: "", color: "#6366f1" }); setShowSubjectForm(true); }}
                className="flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
              >
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Subject
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Alerts */}
            {success && (
            <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded-xl flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
              <span className="flex-1">{success}</span>
              <button onClick={() => setSuccess(null)} className="hover:opacity-70">✕</button>
              </div>
            )}
            {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              <span className="flex-1">{error}</span>
              <button onClick={() => setError(null)} className="hover:opacity-70">✕</button>
              </div>
            )}

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar */}
            <div className="lg:w-80 flex-shrink-0">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden sticky top-4">
                {/* Sidebar Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-bold text-gray-900 dark:text-white">
                      {activeSubjectFilter === null ? "All Topics" : 
                       activeSubjectFilter === "unassigned" ? "Unassigned Topics" :
                       subjects.find(s => s._id === activeSubjectFilter)?.title || "Topics"}
                    </h2>
                    <div className="flex gap-1">
                      {filteredTopics.length > 0 && (
                        <button onClick={handleSelectAll} className={`p-2 rounded-lg transition-colors ${selectedTopicIds.size === filteredTopics.length ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"}`} title={selectedTopicIds.size === filteredTopics.length ? "Deselect All" : "Select All"}>
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 6a1 1 0 011-1h12a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6z" clipRule="evenodd" /></svg>
                    </button>
                  )}
                </div>
                  </div>

                  {/* Search */}
                  <div className="relative mb-3">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input type="text" placeholder="Search topics..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" />
            </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 mb-2">
                    <button onClick={() => { setEditingTopic(null); setFormData({ title: "", description: "", parentTopicId: "", subjectId: activeSubjectFilter && activeSubjectFilter !== "unassigned" ? activeSubjectFilter : "" }); setShowForm(true); }} className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium py-2 px-3 rounded-xl transition-all shadow-lg hover:shadow-xl text-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      New Topic
                    </button>
                  </div>
                    {selectedTopicIds.size > 0 && (
                    <button onClick={handleShareClick} className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-xl transition-colors text-sm">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                      Share {selectedTopicIds.size} Topic{selectedTopicIds.size > 1 ? 's' : ''}
                    </button>
                    )}
                </div>

                {/* Topic Tree */}
                <div className="p-3 max-h-[calc(100vh-400px)] overflow-y-auto">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                      <p className="mt-3 text-sm text-gray-500">Loading...</p>
                    </div>
                  ) : topicTree.length === 0 ? (
                    <div className="text-center py-12">
                      <svg className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{searchQuery ? "No topics found" : "No topics in this view"}</p>
                      <button
                        onClick={() => { setEditingTopic(null); setFormData({ title: "", description: "", parentTopicId: "", subjectId: activeSubjectFilter && activeSubjectFilter !== "unassigned" ? activeSubjectFilter : "" }); setShowForm(true); }}
                        className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all text-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Add Topic
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {topicTree.map((node) => renderTreeNode(node))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Main Panel */}
            <div className="flex-1 min-w-0">
              {selectedSubject ? (
                /* Subject Detail View */
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  {/* Subject Header */}
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700" style={{ background: `linear-gradient(135deg, ${selectedSubject.color}15 0%, ${selectedSubject.color}05 100%)` }}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg" style={{ backgroundColor: selectedSubject.color }}>
                          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedSubject.title}</h2>
                          {selectedSubject.createdAt && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">Created {new Date(selectedSubject.createdAt).toLocaleDateString()}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleEditSubject(selectedSubject)} className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors" title="Edit">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => handleDeleteSubject(selectedSubject._id!)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Delete">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Subject Content */}
                  <div className="p-6">
                    {/* Description */}
                    <div className="mb-8">
                      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Description</h3>
                      {selectedSubject.description ? (
                        <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">{selectedSubject.description}</p>
                      ) : (
                        <p className="text-gray-400 dark:text-gray-500 italic bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">No description provided.</p>
                      )}
                    </div>

                    {/* Topics in this Subject */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Topics in this Subject</h3>
                      {(() => {
                        const subjectTopics = topics.filter(t => t.subjectId === selectedSubject._id);
                        if (subjectTopics.length === 0) {
                          return (
                            <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                              <svg className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                              </svg>
                              <p className="text-gray-500 dark:text-gray-400 mb-4">No topics in this subject yet</p>
                              <button
                                onClick={() => { setEditingTopic(null); setFormData({ title: "", description: "", parentTopicId: "", subjectId: selectedSubject._id! }); setShowForm(true); }}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all text-sm"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                Add Topic
                              </button>
                            </div>
                          );
                        }
                        return (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {subjectTopics.map((topic) => (
                              <button
                                key={topic._id}
                                onClick={() => handleTopicClick(topic._id!)}
                                className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors text-left"
                              >
                                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                                  <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" /></svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 dark:text-white truncate">{topic.title}</p>
                                  {topic.parentTopicId && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Sub-topic</p>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              ) : selectedTopic ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  {/* Topic Header */}
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                          <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                          </svg>
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedTopic.title}</h2>
                          {selectedTopic.createdAt && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">Created {new Date(selectedTopic.createdAt).toLocaleDateString()}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(selectedTopic)} className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors" title="Edit">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => handleDelete(selectedTopic._id!)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Delete">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    {/* Subject Badge */}
                    {selectedTopic.subjectId && (() => {
                      const subject = subjects.find(s => s._id === selectedTopic.subjectId);
                      if (!subject) return null;
                      return (
                        <div className="mb-4">
                          <button
                            onClick={() => handleSubjectClick(subject)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:opacity-80"
                            style={{ backgroundColor: `${subject.color}20`, color: subject.color }}
                          >
                            <div className="w-3 h-3 rounded" style={{ backgroundColor: subject.color }} />
                            {subject.title}
                          </button>
                        </div>
                      );
                    })()}

                    {/* Parent Topic Breadcrumb */}
                    {selectedTopic.parentTopicId && (() => {
                      const getBreadcrumb = (topicId: string): Topic[] => {
                        const path: Topic[] = [];
                        let current = topics.find((t) => t._id === topicId);
                        while (current) {
                          path.unshift(current);
                          current = topics.find((t) => t._id === current?.parentTopicId);
                        }
                        return path;
                      };
                      const breadcrumb = getBreadcrumb(selectedTopic.parentTopicId);
                      return breadcrumb.length > 0 ? (
                        <div className="mb-6">
                          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Parent Path</h3>
                          <nav className="flex items-center flex-wrap gap-2 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
                            <svg className="w-4 h-4 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                            </svg>
                            {breadcrumb.map((parent, index) => (
                              <div key={parent._id} className="flex items-center gap-2">
                                {index > 0 && (
                                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                )}
                                <button
                                  onClick={() => handleTopicClick(parent._id!)}
                                  className="px-3 py-1.5 text-sm font-medium text-indigo-700 dark:text-indigo-300 bg-white dark:bg-gray-800 rounded-lg border border-indigo-200 dark:border-indigo-700 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors shadow-sm"
                                >
                                  {parent.title}
                                </button>
                              </div>
                            ))}
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            <span className="px-3 py-1.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg shadow-sm">
                              {selectedTopic.title}
                            </span>
                          </nav>
                        </div>
                      ) : null;
                    })()}

                    {/* Description */}
                    <div className="mb-8">
                      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Description</h3>
                      {selectedTopic.description && selectedTopic.description !== "<p></p>" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4" dangerouslySetInnerHTML={{ __html: selectedTopic.description }} />
                      ) : (
                        <p className="text-gray-400 dark:text-gray-500 italic bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">No description provided.</p>
                      )}
                </div>

                {/* Linked Topics */}
                    <div className="mb-8">
                      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Linked Topics</h3>
                  {selectedTopic.linkedTopics && selectedTopic.linkedTopics.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedTopic.linkedTopics.map((linkedId) => {
                        const linkedTopic = topics.find((t) => t._id === linkedId);
                        return linkedTopic ? (
                              <div key={linkedId} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors">
                                <button onClick={() => handleTopicClick(linkedId)} className="flex items-center gap-3 text-left hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                                  <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                                    <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" /></svg>
                                  </div>
                                  <span className="font-medium text-gray-900 dark:text-white">{linkedTopic.title}</span>
                                </button>
                                <button onClick={() => handleUnlinkTopic(linkedId)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Unlink">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                        ) : null;
                      })}
                    </div>
                  ) : (
                        <p className="text-gray-400 dark:text-gray-500 italic bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">No linked topics.</p>
                  )}
                </div>

                {/* Link New Topic */}
                <div>
                      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Link to Another Topic</h3>
                      <select onChange={(e) => { if (e.target.value) { handleLinkTopic(e.target.value); e.target.value = ""; } }} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white">
                    <option value="">Select a topic to link...</option>
                        {availableTopics.filter((t) => !selectedTopic.linkedTopics?.includes(t._id!) && t._id !== selectedTopic._id).map((topic) => (
                          <option key={topic._id} value={topic._id}>{topic.title}</option>
                      ))}
                  </select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center py-24">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 flex items-center justify-center mb-6">
                    <svg className="w-12 h-12 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Select a Topic</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-center max-w-md mb-6">
                    Choose a topic from the sidebar to view its details, or create a new one to get started.
                  </p>
                  <button onClick={() => { setEditingTopic(null); setFormData({ title: "", description: "", parentTopicId: "", subjectId: "" }); setShowForm(true); }} className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Create New Topic
                  </button>
              </div>
            )}
          </div>
          </div>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{editingTopic ? "Edit Topic" : "Create New Topic"}</h2>
                  <button onClick={handleCancel} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Topic Title *</label>
                  <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white" placeholder="Enter topic title" required autoFocus />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                  <RichTextEditor content={formData.description} onChange={(html) => setFormData({ ...formData, description: html })} placeholder="Enter topic description..." />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Subject (Optional)</label>
                  <select
                    value={formData.subjectId}
                    onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">No Subject</option>
                    {subjects.map((subject) => (
                      <option key={subject._id} value={subject._id}>
                        {subject.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Parent Topic (Optional)</label>
                  <ParentTopicSelector topics={topics} selectedId={formData.parentTopicId} onChange={(id) => setFormData({ ...formData, parentTopicId: id })} excludeId={editingTopic?._id} />
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={handleCancel} className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-xl transition-all">{editingTopic ? "Update Topic" : "Create Topic"}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <ShareTopicsModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} selectedTopicIds={Array.from(selectedTopicIds)} onSuccess={handleShareSuccess} />

        {/* Subject Form Modal */}
        {showSubjectForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{editingSubject ? "Edit Subject" : "Create New Subject"}</h2>
                  <button onClick={handleCancelSubject} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubjectSubmit} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Subject Title *</label>
                  <input type="text" value={subjectFormData.title} onChange={(e) => setSubjectFormData({ ...subjectFormData, title: e.target.value })} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white" placeholder="Enter subject title" required autoFocus />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description (Optional)</label>
                  <textarea value={subjectFormData.description} onChange={(e) => setSubjectFormData({ ...subjectFormData, description: e.target.value })} rows={3} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white" placeholder="Enter subject description..." />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Color</label>
                  <div className="flex flex-wrap gap-2">
                    {SUBJECT_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setSubjectFormData({ ...subjectFormData, color })}
                        className={`w-8 h-8 rounded-lg transition-all ${subjectFormData.color === color ? "ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-800" : "hover:scale-110"}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={handleCancelSubject} className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 px-4 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-medium rounded-xl transition-all">{editingSubject ? "Update Subject" : "Create Subject"}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
