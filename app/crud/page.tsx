"use client";

import { useState, useEffect } from "react";
import {
  createTask,
  getTasks,
  updateTask,
  deleteTask,
  toggleTask,
  type Task,
} from "../actions";
import ProtectedRoute from "../components/ProtectedRoute";
import Navigation from "../components/Navigation";

export default function CrudPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState({ title: "", description: "" });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadTasks();
  }, []);

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
      // Update existing task
      const formDataObj = new FormData();
      formDataObj.append("title", formData.title);
      formDataObj.append("description", formData.description);
      formDataObj.append("completed", editingTask.completed.toString());

      const result = await updateTask(editingTask._id!, formDataObj);
      if (result.success) {
        setSuccess("Task updated successfully!");
        setEditingTask(null);
        setFormData({ title: "", description: "" });
        await loadTasks();
      } else {
        setError(result.error || "Failed to update task");
      }
    } else {
      // Create new task
      const formDataObj = new FormData();
      formDataObj.append("title", formData.title);
      formDataObj.append("description", formData.description);

      const result = await createTask(formDataObj);
      if (result.success) {
        setSuccess("Task created successfully!");
        setFormData({ title: "", description: "" });
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
    });
    setError(null);
    setSuccess(null);
  };

  const handleCancel = () => {
    setEditingTask(null);
    setFormData({ title: "", description: "" });
    setError(null);
    setSuccess(null);
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) {
      return;
    }

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

  return (
    <ProtectedRoute>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Task Manager
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            A CRUD application built with Next.js and MongoDB
          </p>
        </div>

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

        {/* Task Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            {editingTask ? "Edit Task" : "Create New Task"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Title *
              </label>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Enter task title"
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
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Enter task description"
              />
            </div>
            <div className="flex gap-4">
              <button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                {editingTask ? "Update Task" : "Create Task"}
              </button>
              {editingTask && (
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

        {/* Tasks List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            Tasks ({tasks.length})
          </h2>
          {loading ? (
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">
              Loading tasks...
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">
              No tasks yet. Create your first task above!
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => (
                <div
                  key={task._id}
                  className={`p-4 border rounded-lg transition-all ${
                    task.completed
                      ? "bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={() => handleToggle(task)}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                        />
                        <h3
                          className={`text-lg font-semibold ${
                            task.completed
                              ? "line-through text-gray-500 dark:text-gray-400"
                              : "text-gray-900 dark:text-white"
                          }`}
                        >
                          {task.title}
                        </h3>
                      </div>
                      {task.description && (
                        <p
                          className={`ml-8 text-gray-600 dark:text-gray-400 ${
                            task.completed ? "line-through" : ""
                          }`}
                        >
                          {task.description}
                        </p>
                      )}
                      {task.createdAt && (
                        <p className="ml-8 text-xs text-gray-400 dark:text-gray-500 mt-2">
                          Created:{" "}
                          {new Date(task.createdAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleEdit(task)}
                        className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium rounded transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(task._id!)}
                        className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

