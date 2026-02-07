"use client";

import { useState, useEffect } from "react";
import {
  getFamilies,
  createFamily,
  addMemberToFamily,
  removeMemberFromFamily,
  searchUsers,
  type Family,
  type User,
} from "../actions";
import ProtectedRoute from "../components/ProtectedRoute";
import Navigation from "../components/Navigation";

export default function FamiliesPage() {
  const [families, setFamilies] = useState<Family[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState("");
  const [addingMemberTo, setAddingMemberTo] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    loadFamilies();
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim().length >= 2 && addingMemberTo) {
        performSearch();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, addingMemberTo]);

  const loadFamilies = async () => {
    setLoading(true);
    try {
      const fetched = await getFamilies();
      setFamilies(fetched);
    } catch (err) {
      console.error("Failed to load families:", err);
      setError("Failed to load families");
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

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmed = newFamilyName.trim();
    if (!trimmed) {
      setError("Family name is required");
      return;
    }

    const result = await createFamily(trimmed);
    if (result.success) {
      setSuccess("Family created!");
      setNewFamilyName("");
      setShowCreateForm(false);
      await loadFamilies();
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(result.error || "Failed to create family");
    }
  };

  const handleAddMember = async (familyId: string, userId: string) => {
    setError(null);
    setSuccess(null);

    const result = await addMemberToFamily(familyId, userId);
    if (result.success) {
      setSuccess("Member added!");
      setAddingMemberTo(null);
      setSearchQuery("");
      setSearchResults([]);
      await loadFamilies();
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(result.error || "Failed to add member");
    }
  };

  const handleRemoveMember = async (familyId: string, userId: string) => {
    if (!confirm("Remove this member from the family?")) return;

    setError(null);
    setSuccess(null);

    const result = await removeMemberFromFamily(familyId, userId);
    if (result.success) {
      setSuccess("Member removed");
      await loadFamilies();
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(result.error || "Failed to remove member");
    }
  };

  const isMemberInFamily = (family: Family, userId: string) => {
    return family.members.some((m) => m.userId === userId);
  };

  return (
    <ProtectedRoute>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50 to-orange-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Families
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Create family groups to share inventory. Anyone in the family can update items and mark them as finished.
            </p>
          </div>

          {/* Alerts */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl flex items-center gap-3">
              <span className="text-xl">⚠️</span>
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">×</button>
            </div>
          )}
          {success && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded-xl flex items-center gap-3">
              <span className="text-xl">✓</span>
              <span>{success}</span>
              <button onClick={() => setSuccess(null)} className="ml-auto text-green-500 hover:text-green-700">×</button>
            </div>
          )}

          {/* Create Family Button */}
          {!showCreateForm && (
            <div className="mb-6">
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-medium rounded-xl shadow-lg transition-all"
              >
                <span>+</span>
                Create Family
              </button>
            </div>
          )}

          {/* Create Family Form */}
          {showCreateForm && (
            <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Create a new family</h2>
              <form onSubmit={handleCreateFamily} className="flex gap-3">
                <input
                  type="text"
                  value={newFamilyName}
                  onChange={(e) => setNewFamilyName(e.target.value)}
                  placeholder="Family name (e.g. Smith Household)"
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-medium rounded-xl hover:from-amber-700 hover:to-orange-700 transition-all"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewFamilyName("");
                  }}
                  className="px-6 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </form>
            </div>
          )}

          {/* Families List */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Loading families...</p>
            </div>
          ) : families.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center py-24">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center mb-6">
                <span className="text-5xl">👨‍👩‍👧‍👦</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No families yet</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
                Create a family to share inventory with others. Any family member can add items, update amounts, and mark items as finished.
              </p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-medium rounded-xl hover:from-amber-700 hover:to-orange-700 transition-all"
              >
                + Create first family
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {families.map((family) => (
                <div
                  key={family._id}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {family.name}
                    </h3>
                    <a
                      href={`/inventory?family=${family._id}`}
                      className="text-sm font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300"
                    >
                      View inventory →
                    </a>
                  </div>

                  <div className="p-6">
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Members</h4>
                    <div className="space-y-2 mb-4">
                      {family.members.map((member) => (
                        <div
                          key={member.userId}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl"
                        >
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{member.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{member.email}</p>
                          </div>
                          <button
                            onClick={() => handleRemoveMember(family._id, member.userId)}
                            className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>

                    {addingMemberTo === family._id ? (
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search by email or name (min 2 chars)..."
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white mb-3"
                        />
                        {searching && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Searching...</p>
                        )}
                        {searchResults.length > 0 && (
                          <div className="space-y-2">
                            {searchResults
                              .filter((u) => !isMemberInFamily(family, u._id))
                              .map((user) => (
                                <div
                                  key={user._id}
                                  className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                                >
                                  <div>
                                    <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                                  </div>
                                  <button
                                    onClick={() => handleAddMember(family._id, user._id)}
                                    className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                                  >
                                    Add
                                  </button>
                                </div>
                              ))}
                          </div>
                        )}
                        <button
                          onClick={() => {
                            setAddingMemberTo(null);
                            setSearchQuery("");
                            setSearchResults([]);
                          }}
                          className="mt-3 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAddingMemberTo(family._id)}
                        className="text-sm font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300"
                      >
                        + Add member
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
