"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navigation from "../components/Navigation";
import ProtectedRoute from "../components/ProtectedRoute";
import {
  getUserBlogPosts,
  deleteBlogPost,
  type BlogPost,
} from "../actions";

export default function BlogManagePage() {
  const { status } = useSession();
  const router = useRouter();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const fetchedPosts = await getUserBlogPosts();
      setPosts(fetchedPosts);
    } catch (err) {
      setError("Failed to load blog posts");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this blog post?")) return;

    setError(null);
    setSuccess(null);
    const result = await deleteBlogPost(postId);
    if (result.success) {
      setSuccess("Blog post deleted successfully!");
      await loadPosts();
    } else {
      setError(result.error || "Failed to delete blog post");
    }
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <ProtectedRoute>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-700 dark:from-purple-900 dark:via-violet-900 dark:to-indigo-900">
          <div className="absolute inset-0 bg-grid-pattern opacity-10" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                    </svg>
                  </div>
                  <h1 className="text-4xl font-bold text-white">My Blog Posts</h1>
                </div>
                <p className="text-purple-100 text-lg">
                  Manage and create your blog posts
                </p>
              </div>

              <Link
                href="/blog/write"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-purple-700 font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Write New Post
              </Link>
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

          {/* Posts List */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-purple-200 dark:border-purple-900 rounded-full animate-pulse" />
                <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-purple-600 rounded-full animate-spin" />
              </div>
              <p className="mt-6 text-gray-600 dark:text-gray-400 font-medium">Loading posts...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 rounded-full flex items-center justify-center">
                <svg className="w-16 h-16 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No blog posts yet</h3>
              <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-6">
                Start sharing your thoughts with the world. Write your first blog post!
              </p>
              <Link
                href="/blog/write"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Write Your First Post
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <div
                  key={post._id}
                  className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white truncate">
                          {post.title}
                        </h3>
                        {post.published ? (
                          <span className="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-full">
                            Published
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 rounded-full">
                            Draft
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2 mb-3">
                        {post.excerpt}
                      </p>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Created {formatDate(post.createdAt)}
                        </span>
                        {post.publishedAt && (
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Published {formatDate(post.publishedAt)}
                          </span>
                        )}
                        {post.tags && post.tags.length > 0 && (
                          <div className="flex items-center gap-1">
                            {post.tags.slice(0, 3).map((tag, i) => (
                              <span key={i} className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 text-xs rounded">
                                {tag}
                              </span>
                            ))}
                            {post.tags.length > 3 && (
                              <span className="text-xs text-gray-400">+{post.tags.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/blog/write?edit=${post._id}`}
                        className="px-4 py-2 text-sm font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(post._id!)}
                        className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
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
    </ProtectedRoute>
  );
}

