"use client";

import { useState, useEffect } from "react";
import {
  createTask,
  getTasks,
  updateTask,
  deleteTask,
  toggleTask,
  getFriendsForSharing,
  type Task,
  type User,
} from "../actions";
import ProtectedRoute from "../components/ProtectedRoute";
import Navigation from "../components/Navigation";

export default function CrudPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState({ title: "", description: "", assignedTo: "" });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "pending">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"list" | "board">("list");

  useEffect(() => {
    loadTasks();
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const fetchedUsers = await getFriendsForSharing();
      setUsers(fetchedUsers);
    } catch (err) {
      console.error("Failed to load friends:", err);
    }
  };

  const loadTasks = async () => {
    setLoading(true);
    try {
      const fetchedTasks = await getTasks();
      setTasks(fetchedTasks);
    } catch (err) {
      setError("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (editingTask) {
      const formDataObj = new FormData();
      formDataObj.append("title", formData.title);
      formDataObj.append("description", formData.description);
      formDataObj.append("completed", editingTask.completed.toString());
      if (formData.assignedTo) {
        formDataObj.append("assignedTo", formData.assignedTo);
      }

      const result = await updateTask(editingTask._id!, formDataObj);
      if (result.success) {
        setSuccess("Task updated successfully!");
        setEditingTask(null);
        setFormData({ title: "", description: "", assignedTo: "" });
        setShowForm(false);
        await loadTasks();
      } else {
        setError(result.error || "Failed to update task");
      }
    } else {
      const formDataObj = new FormData();
      formDataObj.append("title", formData.title);
      formDataObj.append("description", formData.description);
      if (formData.assignedTo) {
        formDataObj.append("assignedTo", formData.assignedTo);
      }

      const result = await createTask(formDataObj);
      if (result.success) {
        setSuccess("Task created successfully!");
        setFormData({ title: "", description: "", assignedTo: "" });
        setShowForm(false);
        await loadTasks();
      } else {
        setError(result.error || "Failed to create task");
      }
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description,
      assignedTo: task.assignedTo || "",
    });
    setShowForm(true);
    setError(null);
    setSuccess(null);
  };

  const handleCancel = () => {
    setEditingTask(null);
    setFormData({ title: "", description: "", assignedTo: "" });
    setShowForm(false);
    setError(null);
    setSuccess(null);
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    setError(null);
    setSuccess(null);
    const result = await deleteTask(taskId);
    if (result.success) {
      setSuccess("Task deleted successfully!");
      await loadTasks();
    } else {
      setError(result.error || "Failed to delete task");
    }
  };

  const handleToggle = async (task: Task) => {
    setError(null);
    const result = await toggleTask(task._id!, task.completed);
    if (result.success) {
      await loadTasks();
    } else {
      setError(result.error || "Failed to toggle task");
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    if (statusFilter === "completed" && !task.completed) return false;
    if (statusFilter === "pending" && task.completed) return false;

    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      const matchesTitle = task.title.toLowerCase().includes(query);
      const matchesDescription = task.description?.toLowerCase().includes(query) || false;
      if (!matchesTitle && !matchesDescription) return false;
    }

    return true;
  });

  const pendingTasks = filteredTasks.filter((t) => !t.completed);
  const completedTasks = filteredTasks.filter((t) => t.completed);
  const completionRate = tasks.length > 0 ? Math.round((tasks.filter((t) => t.completed).length / tasks.length) * 100) : 0;

  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      "from-pink-500 to-rose-500",
      "from-purple-500 to-indigo-500",
      "from-blue-500 to-cyan-500",
      "from-teal-500 to-emerald-500",
      "from-orange-500 to-amber-500",
    ];
    return colors[name.charCodeAt(0) % colors.length];
  };

  const TaskCard = ({ task }: { task: Task }) => (
    <div
      className={`group relative bg-white dark:bg-gray-800 rounded-xl border-2 transition-all duration-300 overflow-hidden ${
        task.completed
          ? "border-gray-200 dark:border-gray-700 opacity-75"
          : "border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:shadow-lg"
      }`}
    >
      {/* Priority indicator */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${task.completed ? "bg-green-500" : "bg-blue-500"}`} />

      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Checkbox */}
          <button
            onClick={() => handleToggle(task)}
            className={`mt-1 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
              task.completed
                ? "bg-green-500 border-green-500 text-white"
                : "border-gray-300 dark:border-gray-600 hover:border-blue-500"
            }`}
          >
            {task.completed && (
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          <div className="flex-1 min-w-0">
            {/* Title */}
            <h3
              className={`text-lg font-semibold mb-1 ${
                task.completed
                  ? "line-through text-gray-400 dark:text-gray-500"
                  : "text-gray-900 dark:text-white"
              }`}
            >
              {task.title}
            </h3>

            {/* Description */}
            {task.description && (
              <p className={`text-sm mb-3 ${task.completed ? "line-through text-gray-400" : "text-gray-600 dark:text-gray-400"}`}>
                {task.description}
              </p>
            )}

            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-3">
              {task.assignedToName && (
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${getAvatarColor(task.assignedToName)} flex items-center justify-center`}>
                    <span className="text-[10px] font-bold text-white">{getInitials(task.assignedToName)}</span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {task.assignedToName}
                  </span>
                </div>
              )}

              {task.createdByName && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  by {task.createdByName}
                </span>
              )}

              {task.createdAt && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {new Date(task.createdAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => handleEdit(task)}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
              title="Edit"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => handleDelete(task._id!)}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
              title="Delete"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <ProtectedRoute>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800">
        {/* Hero Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 dark:from-blue-900 dark:via-indigo-900 dark:to-violet-900">
          <div className="absolute inset-0 bg-grid-pattern opacity-10" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                  </div>
                  <h1 className="text-4xl font-bold text-white">Task Manager</h1>
                </div>
                <p className="text-blue-100 text-lg">
                  Organize, track, and complete your tasks efficiently
          </p>
        </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-6 py-4 border border-white/20 min-w-[120px]">
                  <p className="text-3xl font-bold text-white">{tasks.length}</p>
                  <p className="text-blue-200 text-sm">Total Tasks</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-6 py-4 border border-white/20 min-w-[120px]">
                  <p className="text-3xl font-bold text-white">{pendingTasks.length}</p>
                  <p className="text-blue-200 text-sm">In Progress</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-6 py-4 border border-white/20 min-w-[120px]">
                  <div className="flex items-center gap-2">
                    <p className="text-3xl font-bold text-white">{completionRate}%</p>
                  </div>
                  <p className="text-blue-200 text-sm">Completed</p>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-8 max-w-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-blue-100">Overall Progress</span>
                <span className="text-sm font-medium text-white">{completedTasks.length} of {tasks.length} tasks</span>
              </div>
              <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Alerts */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded-xl flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>{success}</span>
              <button onClick={() => setSuccess(null)} className="ml-auto hover:opacity-70">✕</button>
          </div>
        )}
        {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-auto hover:opacity-70">✕</button>
          </div>
        )}

          {/* Toolbar */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  {(["all", "pending", "completed"] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        statusFilter === status
                          ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                          : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                      }`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>

                {/* View Mode Toggle */}
                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-2 rounded-lg transition-colors ${
                      viewMode === "list"
                        ? "bg-white dark:bg-gray-600 text-blue-600 shadow-sm"
                        : "text-gray-400 hover:text-gray-600"
                    }`}
                    title="List view"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewMode("board")}
                    className={`p-2 rounded-lg transition-colors ${
                      viewMode === "board"
                        ? "bg-white dark:bg-gray-600 text-blue-600 shadow-sm"
                        : "text-gray-400 hover:text-gray-600"
                    }`}
                    title="Board view"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Add Task Button */}
              <button
                onClick={() => {
                  setShowForm(true);
                  setEditingTask(null);
                  setFormData({ title: "", description: "", assignedTo: "" });
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-xl transition-all shadow-lg hover:shadow-xl"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Task
              </button>
            </div>
          </div>

          {/* Task Form Modal */}
          {showForm && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {editingTask ? "Edit Task" : "Create New Task"}
          </h2>
                    <button
                      onClick={handleCancel}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder="What needs to be done?"
                required
                      autoFocus
              />
            </div>

            <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
                      placeholder="Add more details..."
              />
            </div>

            <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Assign To
              </label>
              <select
                value={formData.assignedTo}
                      onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="">Unassigned</option>
                {users.map((user) => (
                  <option key={user._id} value={user._id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
                    {users.length === 0 && (
                      <p className="mt-2 text-xs text-gray-500">Add friends to assign tasks to them</p>
                    )}
            </div>

                  <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCancel}
                      className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
            <button
                      type="submit"
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-xl transition-all"
                    >
                      {editingTask ? "Update Task" : "Create Task"}
            </button>
          </div>
                </form>
              </div>
            </div>
          )}

          {/* Tasks Content */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-200 dark:border-blue-900 rounded-full animate-pulse" />
                <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-blue-600 rounded-full animate-spin" />
              </div>
              <p className="mt-6 text-gray-600 dark:text-gray-400 font-medium">Loading tasks...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-full flex items-center justify-center">
                <svg className="w-16 h-16 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
            </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No tasks yet</h3>
              <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-6">
                Get started by creating your first task. Stay organized and boost your productivity!
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Your First Task
              </button>
            </div>
          ) : viewMode === "board" ? (
            /* Board View */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* In Progress Column */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full" />
                      <h3 className="font-bold text-gray-900 dark:text-white">In Progress</h3>
                      </div>
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
                      {pendingTasks.length}
                          </span>
                  </div>
                      </div>
                <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
                  {pendingTasks.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-8 text-sm">
                      No tasks in progress
                    </p>
                  ) : (
                    pendingTasks.map((task) => <TaskCard key={task._id} task={task} />)
                      )}
                    </div>
              </div>

              {/* Completed Column */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full" />
                      <h3 className="font-bold text-gray-900 dark:text-white">Completed</h3>
                    </div>
                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 text-xs font-medium rounded-full">
                      {completedTasks.length}
                    </span>
                  </div>
                </div>
                <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
                  {completedTasks.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-8 text-sm">
                      No completed tasks
                    </p>
                  ) : (
                    completedTasks.map((task) => <TaskCard key={task._id} task={task} />)
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* List View */
            <div className="space-y-4">
              {filteredTasks.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
                  <svg className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-gray-500 dark:text-gray-400">No tasks match your filters</p>
                  <button
                    onClick={() => {
                      setStatusFilter("all");
                      setSearchQuery("");
                    }}
                    className="mt-4 text-blue-600 dark:text-blue-400 hover:underline text-sm"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                filteredTasks.map((task) => <TaskCard key={task._id} task={task} />)
              )}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
