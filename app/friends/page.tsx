"use client";

import { useState, useEffect } from "react";
import {
  getFriends,
  getPendingFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  searchUsers,
  type Friend,
  type FriendRequest,
  type User,
} from "../actions";
import ProtectedRoute from "../components/ProtectedRoute";
import Navigation from "../components/Navigation";

export default function FriendsPage() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<{
    sent: FriendRequest[];
    received: FriendRequest[];
  }>({ sent: [], received: [] });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"friends" | "requests" | "search">("friends");

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        performSearch();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [friendsData, requestsData] = await Promise.all([
        getFriends(),
        getPendingFriendRequests(),
      ]);
      setFriends(friendsData);
      setPendingRequests(requestsData);
    } catch (err) {
      console.error("Failed to load friends data:", err);
      setError("Failed to load friends data");
    } finally {
      setLoading(false);
    }
  };

  const performSearch = async () => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const results = await searchUsers(searchQuery);
      setSearchResults(results);
    } catch (err) {
      console.error("Failed to search users:", err);
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (userId: string) => {
    setError(null);
    setSuccess(null);
    const result = await sendFriendRequest(userId);
    if (result.success) {
      setSuccess("Friend request sent!");
      await loadData();
      setSearchQuery("");
      setSearchResults([]);
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(result.error || "Failed to send friend request");
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    setError(null);
    setSuccess(null);
    const result = await acceptFriendRequest(requestId);
    if (result.success) {
      setSuccess("Friend request accepted!");
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(result.error || "Failed to accept friend request");
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    setError(null);
    setSuccess(null);
    const result = await rejectFriendRequest(requestId);
    if (result.success) {
      setSuccess("Friend request rejected");
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(result.error || "Failed to reject friend request");
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!confirm("Are you sure you want to remove this friend? You will no longer see their shared notes.")) {
      return;
    }

    setError(null);
    setSuccess(null);
    const result = await removeFriend(friendId);
    if (result.success) {
      setSuccess("Friend removed");
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(result.error || "Failed to remove friend");
      setTimeout(() => setError(null), 3000);
    }
  };

  const isUserFriend = (userId: string) => {
    return friends.some((f) => f._id === userId);
  };

  const isPendingRequest = (userId: string) => {
    return (
      pendingRequests.sent.some((r) => r.to === userId) ||
      pendingRequests.received.some((r) => r.from === userId)
    );
  };

  return (
    <ProtectedRoute>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Friends
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage your friend circle and share notes with friends
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

          {/* Tabs */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg mb-6">
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setActiveTab("friends")}
                className={`flex-1 px-6 py-3 text-center font-medium transition-colors ${
                  activeTab === "friends"
                    ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                Friends ({friends.length})
              </button>
              <button
                onClick={() => setActiveTab("requests")}
                className={`flex-1 px-6 py-3 text-center font-medium transition-colors ${
                  activeTab === "requests"
                    ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                Requests (
                {pendingRequests.received.length + pendingRequests.sent.length})
              </button>
              <button
                onClick={() => setActiveTab("search")}
                className={`flex-1 px-6 py-3 text-center font-medium transition-colors ${
                  activeTab === "search"
                    ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                Search Users
              </button>
            </div>
          </div>

          {/* Friends Tab */}
          {activeTab === "friends" && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  <p className="mt-4 text-gray-600 dark:text-gray-400">
                    Loading friends...
                  </p>
                </div>
              ) : friends.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">
                    No friends yet.
                  </p>
                  <p className="text-gray-500 dark:text-gray-500 text-sm">
                    Search for users and send friend requests to get started!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {friends.map((friend) => (
                    <div
                      key={friend._id}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {friend.name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {friend.email}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveFriend(friend._id)}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Requests Tab */}
          {activeTab === "requests" && (
            <div className="space-y-6">
              {/* Received Requests */}
              {pendingRequests.received.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                    Received Requests ({pendingRequests.received.length})
                  </h2>
                  <div className="space-y-3">
                    {pendingRequests.received.map((request) => (
                      <div
                        key={request._id}
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {request.fromName}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {request.createdAt &&
                              new Date(request.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAcceptRequest(request._id!)}
                            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors text-sm"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleRejectRequest(request._id!)}
                            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors text-sm"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sent Requests */}
              {pendingRequests.sent.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                    Sent Requests ({pendingRequests.sent.length})
                  </h2>
                  <div className="space-y-3">
                    {pendingRequests.sent.map((request) => (
                      <div
                        key={request._id}
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {request.toName}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Pending •{" "}
                            {request.createdAt &&
                              new Date(request.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-full text-sm font-medium">
                          Pending
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pendingRequests.received.length === 0 &&
                pendingRequests.sent.length === 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                    <div className="text-center py-12">
                      <p className="text-gray-600 dark:text-gray-400 text-lg">
                        No pending friend requests.
                      </p>
                    </div>
                  </div>
                )}
            </div>
          )}

          {/* Search Tab */}
          {activeTab === "search" && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <div className="mb-6">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by email or name (min 2 characters)..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              {searching && (
                <div className="text-center py-4">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                </div>
              )}

              {!searching && searchResults.length > 0 && (
                <div className="space-y-3">
                  {searchResults.map((user) => {
                    const isFriend = isUserFriend(user._id);
                    const isPending = isPendingRequest(user._id);

                    return (
                      <div
                        key={user._id}
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {user.name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {user.email}
                          </p>
                        </div>
                        {isFriend ? (
                          <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-sm font-medium">
                            Friend
                          </span>
                        ) : isPending ? (
                          <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-full text-sm font-medium">
                            Pending
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSendRequest(user._id)}
                            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors text-sm"
                          >
                            Send Request
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {!searching &&
                searchQuery.trim().length >= 2 &&
                searchResults.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-600 dark:text-gray-400">
                      No users found matching "{searchQuery}"
                    </p>
                  </div>
                )}

              {searchQuery.trim().length < 2 && (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    Enter at least 2 characters to search for users
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

