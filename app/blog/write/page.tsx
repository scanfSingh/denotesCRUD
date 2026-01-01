"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Navigation from "../../components/Navigation";
import ProtectedRoute from "../../components/ProtectedRoute";
import RichTextEditor from "../../components/RichTextEditor";
import {
  createBlogPost,
  updateBlogPost,
  getBlogPost,
  type BlogPost,
} from "../../actions";

function BlogWriteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    excerpt: "",
    coverImage: "",
    tags: "",
    published: false,
  });
  const [loading, setLoading] = useState(false);
  const [loadingPost, setLoadingPost] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load post data if editing
  useEffect(() => {
    if (editId) {
      loadPost(editId);
    }
  }, [editId]);

  const loadPost = async (postId: string) => {
    setLoadingPost(true);
    try {
      const post = await getBlogPost(postId);
      if (post) {
        setFormData({
          title: post.title,
          content: post.content,
          excerpt: post.excerpt || "",
          coverImage: post.coverImage || "",
          tags: post.tags?.join(", ") || "",
          published: post.published,
        });
      } else {
        setError("Blog post not found");
      }
    } catch (err) {
      setError("Failed to load blog post");
    } finally {
      setLoadingPost(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent, publish: boolean = false) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const formDataObj = new FormData();
    formDataObj.append("title", formData.title);
    formDataObj.append("content", formData.content);
    formDataObj.append("excerpt", formData.excerpt);
    formDataObj.append("coverImage", formData.coverImage);
    formDataObj.append("tags", formData.tags);
    formDataObj.append("published", publish ? "true" : formData.published.toString());

    try {
      let result;
      if (editId) {
        result = await updateBlogPost(editId, formDataObj);
      } else {
        result = await createBlogPost(formDataObj);
      }

      if (result.success) {
        setSuccess(editId ? "Blog post updated!" : "Blog post created!");
        setTimeout(() => {
          router.push("/blog");
        }, 1500);
      } else {
        setError(result.error || "Failed to save blog post");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (loadingPost) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-purple-200 dark:border-purple-900 rounded-full animate-pulse" />
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-purple-600 rounded-full animate-spin" />
        </div>
        <p className="mt-6 text-gray-600 dark:text-gray-400 font-medium">Loading post...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Alerts */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded-xl flex items-center gap-3">
          <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>{success}</span>
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

      <form onSubmit={(e) => handleSubmit(e)} className="space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Title *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-3 text-xl font-semibold border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            placeholder="Enter your blog title..."
            required
          />
        </div>

        {/* Cover Image URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Cover Image URL
          </label>
          <input
            type="url"
            value={formData.coverImage}
            onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            placeholder="https://example.com/image.jpg"
          />
          {formData.coverImage && (
            <div className="mt-3 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600">
              <img
                src={formData.coverImage}
                alt="Cover preview"
                className="w-full h-48 object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}
        </div>

        {/* Content */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Content *
          </label>
          <div className="border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden">
            <RichTextEditor
              value={formData.content}
              onChange={(value) => setFormData({ ...formData, content: value })}
              placeholder="Write your blog content here..."
            />
          </div>
        </div>

        {/* Excerpt */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Excerpt
            <span className="text-gray-400 font-normal ml-2">(optional - auto-generated if empty)</span>
          </label>
          <textarea
            value={formData.excerpt}
            onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
            rows={3}
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
            placeholder="A brief summary of your post..."
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tags
            <span className="text-gray-400 font-normal ml-2">(comma separated)</span>
          </label>
          <input
            type="text"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            placeholder="technology, coding, web development"
          />
          {formData.tags && (
            <div className="mt-2 flex flex-wrap gap-2">
              {formData.tags.split(",").map((tag, i) => (
                tag.trim() && (
                  <span
                    key={i}
                    className="px-2 py-1 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 text-sm rounded-lg"
                  >
                    {tag.trim()}
                  </span>
                )
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={(e) => handleSubmit(e, false)}
            disabled={loading}
            className="flex-1 px-6 py-3 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save as Draft"}
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e, true)}
            disabled={loading}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium rounded-xl transition-all shadow-lg disabled:opacity-50"
          >
            {loading ? "Publishing..." : editId ? "Update & Publish" : "Publish Now"}
          </button>
        </div>
      </form>
    </div>
  );
}

function BlogWriteFallback() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="animate-pulse space-y-6">
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      </div>
    </div>
  );
}

export default function BlogWritePage() {
  return (
    <ProtectedRoute>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-700 dark:from-purple-900 dark:via-violet-900 dark:to-indigo-900">
          <div className="absolute inset-0 bg-grid-pattern opacity-10" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center gap-4">
              <Link
                href="/blog"
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white">Write Blog Post</h1>
                <p className="text-purple-200 text-sm">Share your thoughts with the world</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 sm:p-8">
            <Suspense fallback={<BlogWriteFallback />}>
              <BlogWriteForm />
            </Suspense>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

