"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { getFriendsForSharing, shareTopics, type User } from "../actions";

interface ShareTopicsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTopicIds: string[];
  onSuccess: () => void;
}

export default function ShareTopicsModal({
  isOpen,
  onClose,
  selectedTopicIds,
  onSuccess,
}: ShareTopicsModalProps) {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  const loadUsers = async () => {
    try {
      // Only load friends for sharing
      const fetchedUsers = await getFriendsForSharing();
      setUsers(fetchedUsers);
    } catch (err) {
      console.error("Failed to load friends:", err);
    }
  };

  const handleToggleUser = (userId: string) => {
    const newSelected = new Set(selectedUserIds);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUserIds(newSelected);
  };

  const handleShare = async () => {
    if (selectedUserIds.size === 0) {
      setError("Please select at least one user to share with");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await shareTopics(
        Array.from(selectedTopicIds),
        Array.from(selectedUserIds)
      );

      if (result.success) {
        setSuccess("Topics shared successfully!");
        setTimeout(() => {
          onSuccess();
          onClose();
          setSelectedUserIds(new Set());
          setError(null);
          setSuccess(null);
        }, 1000);
      } else {
        setError(result.error || "Failed to share topics");
      }
    } catch (err) {
      setError("An error occurred while sharing topics");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Share Topics
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
            >
              ×
            </button>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Select users to share {selectedTopicIds.length} topic(s) with
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg">
              {success}
            </div>
          )}

          <div className="mb-6 max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            {users.length === 0 ? (
              <div className="text-gray-500 dark:text-gray-400 text-center py-4">
                <p className="mb-2">No friends available to share with.</p>
                <p className="text-sm">Add friends first to share topics with them.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {users.map((user) => (
                  <label
                    key={user._id}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUserIds.has(user._id)}
                      onChange={() => handleToggleUser(user._id)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {user.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {user.email}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleShare}
              disabled={loading || selectedUserIds.size === 0}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Sharing..." : "Share"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

