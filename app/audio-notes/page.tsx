"use client";

import { useState, useEffect } from "react";
import {
  createNote,
  getNotes,
  updateNote,
  deleteNote,
  getTopics,
  type Note,
  type Topic,
} from "../actions";
import ProtectedRoute from "../components/ProtectedRoute";
import Navigation from "../components/Navigation";
import AudioRecorder from "../components/AudioRecorder";

export default function AudioNotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    summary: "",
    topicId: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [apiStatus, setApiStatus] = useState<"checking" | "ready" | "not_ready">("checking");

  useEffect(() => {
    loadNotes();
    loadTopics();
    checkApiStatus();
  }, []);

  const checkApiStatus = async () => {
    try {
      const response = await fetch("/api/audio/test");
      const data = await response.json();
      setApiStatus(data.status === "ready" ? "ready" : "not_ready");
      if (data.status !== "ready") {
        console.warn("Audio API not fully configured:", data);
        if (!data.checks.mongodbUri) {
          setError("MongoDB connection is not configured. Audio transcription will not work.");
        }
      }
    } catch (err) {
      console.error("Failed to check API status:", err);
      setApiStatus("not_ready");
    }
  };

  const loadNotes = async () => {
    setLoading(true);
    try {
      const fetchedNotes = await getNotes();
      setNotes(fetchedNotes);
    } catch (err) {
      setError("Failed to load notes");
    } finally {
      setLoading(false);
    }
  };

  const loadTopics = async () => {
    try {
      const fetchedTopics = await getTopics();
      setTopics(fetchedTopics);
    } catch (err) {
      console.error("Failed to load topics:", err);
    }
  };

  const handleTranscriptionComplete = async (transcription: string) => {
    setProcessing(true);
    setError(null);
    setSuccess(null);

    // Validate transcription
    if (!transcription || transcription.trim().length === 0) {
      setError("No speech detected. Please try again and speak clearly.");
      setProcessing(false);
      return;
    }

    try {
      // Create a simple title from the first few words
      const words = transcription.trim().split(/\s+/);
      const titleWords = words.slice(0, 6).join(" ");
      const title = titleWords.length > 50 
        ? titleWords.substring(0, 47) + "..." 
        : titleWords + (words.length > 6 ? "..." : "");

      // Save note directly to database
      const noteFormData = new FormData();
      noteFormData.append("title", title || "Voice Note");
      noteFormData.append("content", transcription);
      noteFormData.append("summary", "");
      noteFormData.append("transcription", transcription);

      const result = await createNote(noteFormData);

      if (result.success) {
        setSuccess("Note saved successfully!");
        await loadNotes();
        // Pre-fill form with the created note for editing
        setFormData({
          title: title || "Voice Note",
          content: transcription,
          summary: "",
          topicId: "",
        });
      } else {
        setError(result.error || "Failed to save note");
      }
    } catch (err: any) {
      console.error("Error saving transcription:", err);
      setError(err.message || "Failed to save note");
    } finally {
      setProcessing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (editingNote) {
      // Update existing note
      const noteFormData = new FormData();
      noteFormData.append("title", formData.title);
      noteFormData.append("content", formData.content);
      noteFormData.append("summary", formData.summary);
      noteFormData.append("topicId", formData.topicId);

      const result = await updateNote(editingNote._id!, noteFormData);
      if (result.success) {
        setSuccess("Note updated successfully!");
        setEditingNote(null);
        setFormData({ title: "", content: "", summary: "", topicId: "" });
        setSelectedNote(null);
        await loadNotes();
      } else {
        setError(result.error || "Failed to update note");
      }
    }
  };

  const handleEdit = (note: Note) => {
    setEditingNote(note);
    setFormData({
      title: note.title,
      content: note.content,
      summary: note.summary || "",
      topicId: note.topicId || "",
    });
    setSelectedNote(note);
    setError(null);
    setSuccess(null);
  };

  const handleCancel = () => {
    setEditingNote(null);
    setFormData({ title: "", content: "", summary: "", topicId: "" });
    setSelectedNote(null);
    setError(null);
    setSuccess(null);
  };

  const handleDelete = async (noteId: string) => {
    if (!confirm("Are you sure you want to delete this note?")) {
      return;
    }

    setError(null);
    setSuccess(null);
    const result = await deleteNote(noteId);
    if (result.success) {
      setSuccess("Note deleted successfully!");
      if (selectedNote?._id === noteId) {
        setSelectedNote(null);
      }
      await loadNotes();
    } else {
      setError(result.error || "Failed to delete note");
    }
  };

  const handleNoteClick = (note: Note) => {
    setSelectedNote(note);
    setEditingNote(null);
    setFormData({ title: "", content: "", summary: "", topicId: "" });
  };

  const getTopicName = (topicId?: string) => {
    if (!topicId) return null;
    const topic = topics.find((t) => t._id === topicId);
    return topic?.title || null;
  };

  return (
    <ProtectedRoute>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Audio Notes
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Speak and save your voice notes instantly
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

          {/* Processing Indicator */}
          {processing && (
            <div className="mb-6 p-4 bg-blue-100 border border-blue-400 text-blue-700 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-700"></div>
                <span>Saving your note...</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Audio Recorder and Form */}
            <div className="lg:col-span-1 space-y-6">
              {/* Audio Recorder */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Record Audio
                  </h2>
                  {apiStatus === "ready" && (
                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs font-medium rounded">
                      ✓ Ready
                    </span>
                  )}
                  {apiStatus === "not_ready" && (
                    <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs font-medium rounded">
                      ⚠ Check Config
                    </span>
                  )}
                </div>
                <AudioRecorder
                  onTranscriptionComplete={handleTranscriptionComplete}
                  onError={(err) => setError(err)}
                />
              </div>

              {/* Note Form */}
              {(editingNote || selectedNote) && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    {editingNote ? "Edit Note" : "Note Details"}
                  </h2>
                  {editingNote ? (
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
                          required
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="content"
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                        >
                          Content
                        </label>
                        <textarea
                          id="content"
                          value={formData.content}
                          onChange={(e) =>
                            setFormData({ ...formData, content: e.target.value })
                          }
                          rows={6}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="summary"
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                        >
                          Summary
                        </label>
                        <textarea
                          id="summary"
                          value={formData.summary}
                          onChange={(e) =>
                            setFormData({ ...formData, summary: e.target.value })
                          }
                          rows={3}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="topicId"
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                        >
                          Link to Topic (Optional)
                        </label>
                        <select
                          id="topicId"
                          value={formData.topicId}
                          onChange={(e) =>
                            setFormData({ ...formData, topicId: e.target.value })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                          <option value="">None</option>
                          {topics.map((topic) => (
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
                          Update Note
                        </button>
                        <button
                          type="button"
                          onClick={handleCancel}
                          className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Title
                        </h3>
                        <p className="text-gray-900 dark:text-white font-semibold">
                          {selectedNote?.title}
                        </p>
                      </div>
                      {selectedNote?.summary && (
                        <div>
                          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Summary
                          </h3>
                          <p className="text-gray-900 dark:text-white">
                            {selectedNote.summary}
                          </p>
                        </div>
                      )}
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Content
                        </h3>
                        <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                          {selectedNote?.content}
                        </p>
                      </div>
                      {selectedNote?.topicId && (
                        <div>
                          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Linked Topic
                          </h3>
                          <p className="text-blue-600 dark:text-blue-400">
                            {getTopicName(selectedNote.topicId)}
                          </p>
                        </div>
                      )}
                      {selectedNote?.transcription && (
                        <details className="mt-4">
                          <summary className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                            View Original Transcription
                          </summary>
                          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                            {selectedNote.transcription}
                          </p>
                        </details>
                      )}
                      <div className="flex gap-2 pt-4">
                        <button
                          onClick={() => handleEdit(selectedNote!)}
                          className="flex-1 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded-lg transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(selectedNote!._id!)}
                          className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Column - Notes List */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
                  Your Notes ({notes.length})
                </h2>
                {loading ? (
                  <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                    Loading notes...
                  </div>
                ) : notes.length === 0 ? (
                  <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                    No notes yet. Record your first audio note above!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {notes.map((note) => (
                      <div
                        key={note._id}
                        onClick={() => handleNoteClick(note)}
                        className={`p-4 border rounded-lg cursor-pointer transition-all ${
                          selectedNote?._id === note._id
                            ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700"
                            : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                              {note.title}
                            </h3>
                            {note.summary && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                {note.summary}
                              </p>
                            )}
                            <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                              {note.content}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                              {note.topicId && (
                                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                                  {getTopicName(note.topicId) || "Topic"}
                                </span>
                              )}
                              {note.createdAt && (
                                <span>
                                  {new Date(note.createdAt).toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(note);
                              }}
                              className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium rounded transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(note._id!);
                              }}
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
        </div>
      </div>
    </ProtectedRoute>
  );
}

