"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Navigation from "../../components/Navigation";
import { getBlogPost, type BlogPost } from "../../actions";

// Social Share Button Component
function ShareButton({
  platform,
  url,
  title,
  excerpt,
}: {
  platform: "linkedin" | "twitter" | "facebook" | "copy";
  url: string;
  title: string;
  excerpt: string;
}) {
  const [copied, setCopied] = useState(false);

  const getShareUrl = () => {
    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);
    const encodedExcerpt = encodeURIComponent(excerpt);

    switch (platform) {
      case "linkedin":
        return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
      case "twitter":
        return `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
      case "facebook":
        return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
      default:
        return url;
    }
  };

  const handleShare = async () => {
    if (platform === "copy") {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    } else {
      window.open(getShareUrl(), "_blank", "width=600,height=400");
    }
  };

  const getIcon = () => {
    switch (platform) {
      case "linkedin":
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
          </svg>
        );
      case "twitter":
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        );
      case "facebook":
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
        );
      case "copy":
        return copied ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        );
    }
  };

  const getLabel = () => {
    switch (platform) {
      case "linkedin":
        return "LinkedIn";
      case "twitter":
        return "X (Twitter)";
      case "facebook":
        return "Facebook";
      case "copy":
        return copied ? "Copied!" : "Copy Link";
    }
  };

  const getColor = () => {
    switch (platform) {
      case "linkedin":
        return "bg-[#0A66C2] hover:bg-[#004182]";
      case "twitter":
        return "bg-black hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200";
      case "facebook":
        return "bg-[#1877F2] hover:bg-[#0d65d9]";
      case "copy":
        return copied
          ? "bg-green-600 hover:bg-green-700"
          : "bg-gray-600 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600";
    }
  };

  return (
    <button
      onClick={handleShare}
      className={`inline-flex items-center gap-2 px-4 py-2.5 text-white text-sm font-medium rounded-xl transition-all shadow-md hover:shadow-lg ${getColor()}`}
    >
      {getIcon()}
      <span className="hidden sm:inline">{getLabel()}</span>
    </button>
  );
}

export default function BlogPostPage() {
  const params = useParams();
  const postId = params.id as string;
  
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPost();
  }, [postId]);

  const loadPost = async () => {
    setLoading(true);
    try {
      const fetchedPost = await getBlogPost(postId);
      if (fetchedPost) {
        if (!fetchedPost.published) {
          setError("This blog post is not published yet.");
        } else {
          setPost(fetchedPost);
        }
      } else {
        setError("Blog post not found");
      }
    } catch (err) {
      setError("Failed to load blog post");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getShareUrl = () => {
    if (typeof window !== "undefined") {
      return window.location.href;
    }
    return "";
  };

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800">
          <div className="flex flex-col items-center justify-center py-24">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-purple-200 dark:border-purple-900 rounded-full animate-pulse" />
              <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-purple-600 rounded-full animate-spin" />
            </div>
            <p className="mt-6 text-gray-600 dark:text-gray-400 font-medium">Loading post...</p>
          </div>
        </div>
      </>
    );
  }

  if (error || !post) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center py-24">
              <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30 rounded-full flex items-center justify-center">
                <svg className="w-16 h-16 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{error || "Post not found"}</h3>
              <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-6">
                The blog post you're looking for might have been removed or is not available.
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <article className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800">
        {/* Cover Image */}
        {post.coverImage && (
          <div className="relative h-72 sm:h-96 lg:h-[28rem] w-full overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent z-10" />
            <img
              src={post.coverImage}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium mb-8 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>

          {/* Post Header */}
          <header className="mb-8">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">
              {post.title}
            </h1>

            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-4 text-gray-600 dark:text-gray-400 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-semibold">
                  {post.authorName?.charAt(0).toUpperCase() || "A"}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{post.authorName}</p>
                  <p className="text-sm">{formatDate(post.publishedAt || post.createdAt)}</p>
                </div>
              </div>
            </div>

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {post.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-sm font-medium rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Share Buttons */}
            <div className="border-t border-b border-gray-200 dark:border-gray-700 py-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Share this article:</p>
              <div className="flex flex-wrap gap-2">
                <ShareButton
                  platform="linkedin"
                  url={getShareUrl()}
                  title={post.title}
                  excerpt={post.excerpt || ""}
                />
                <ShareButton
                  platform="twitter"
                  url={getShareUrl()}
                  title={post.title}
                  excerpt={post.excerpt || ""}
                />
                <ShareButton
                  platform="facebook"
                  url={getShareUrl()}
                  title={post.title}
                  excerpt={post.excerpt || ""}
                />
                <ShareButton
                  platform="copy"
                  url={getShareUrl()}
                  title={post.title}
                  excerpt={post.excerpt || ""}
                />
              </div>
            </div>
          </header>

          {/* Post Content */}
          <div
            className="prose prose-lg dark:prose-invert max-w-none
              prose-headings:font-bold prose-headings:text-gray-900 dark:prose-headings:text-white
              prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed
              prose-a:text-purple-600 dark:prose-a:text-purple-400 prose-a:no-underline hover:prose-a:underline
              prose-strong:text-gray-900 dark:prose-strong:text-white
              prose-code:text-purple-600 dark:prose-code:text-purple-400 prose-code:bg-purple-50 dark:prose-code:bg-purple-900/30 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
              prose-pre:bg-gray-900 dark:prose-pre:bg-gray-950 prose-pre:shadow-xl
              prose-blockquote:border-purple-500 prose-blockquote:bg-purple-50 dark:prose-blockquote:bg-purple-900/20 prose-blockquote:rounded-r-xl prose-blockquote:py-1
              prose-img:rounded-xl prose-img:shadow-lg
              prose-ul:marker:text-purple-500 prose-ol:marker:text-purple-500"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Bottom Share Section */}
          <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Enjoyed this article?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Share it with your network and help others discover great content!
              </p>
              <div className="flex flex-wrap gap-2">
                <ShareButton
                  platform="linkedin"
                  url={getShareUrl()}
                  title={post.title}
                  excerpt={post.excerpt || ""}
                />
                <ShareButton
                  platform="twitter"
                  url={getShareUrl()}
                  title={post.title}
                  excerpt={post.excerpt || ""}
                />
                <ShareButton
                  platform="facebook"
                  url={getShareUrl()}
                  title={post.title}
                  excerpt={post.excerpt || ""}
                />
                <ShareButton
                  platform="copy"
                  url={getShareUrl()}
                  title={post.title}
                  excerpt={post.excerpt || ""}
                />
              </div>
            </div>
          </div>

          {/* Author Card */}
          <div className="mt-8 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
                {post.authorName?.charAt(0).toUpperCase() || "A"}
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Written by</p>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white">{post.authorName}</h4>
              </div>
            </div>
          </div>
        </div>
      </article>
    </>
  );
}

