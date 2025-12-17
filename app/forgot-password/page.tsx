"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { requestPasswordReset } from "../actions";
import Navigation from "../components/Navigation";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resetInfo, setResetInfo] = useState<{
    resetToken?: string;
    resetUrl?: string;
  } | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setResetInfo(null);
    setLoading(true);

    const result = await requestPasswordReset(email);

    if (result.success) {
      setSuccess(result.message || "Password reset link generated");
      // In development, show the reset token/URL
      if (result.resetToken && result.resetUrl) {
        setResetInfo({
          resetToken: result.resetToken,
          resetUrl: result.resetUrl,
        });
      }
    } else {
      setError(result.error || "Failed to process password reset request");
    }
    setLoading(false);
  };

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
              Forgot Password
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
              Enter your email address and we'll send you a password reset link
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                placeholder="Email address"
              />
            </div>

            {error && (
              <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
                <div className="text-sm text-red-800 dark:text-red-200">
                  {error}
                </div>
              </div>
            )}

            {success && (
              <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-4">
                <div className="text-sm text-green-800 dark:text-green-200">
                  {success}
                </div>
              </div>
            )}

            {/* Development: Show reset token and URL */}
            {resetInfo && (
              <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 p-4 border border-blue-200 dark:border-blue-800">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
                  Development Mode - Reset Information:
                </p>
                <div className="space-y-2 text-xs">
                  <div>
                    <p className="text-blue-800 dark:text-blue-300 font-medium">
                      Reset URL:
                    </p>
                    <a
                      href={resetInfo.resetUrl}
                      className="text-blue-600 dark:text-blue-400 hover:underline break-all"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {resetInfo.resetUrl}
                    </a>
                  </div>
                  <div>
                    <p className="text-blue-800 dark:text-blue-300 font-medium">
                      Or use token:
                    </p>
                    <p className="text-blue-600 dark:text-blue-400 break-all font-mono">
                      {resetInfo.resetToken}
                    </p>
                  </div>
                  <p className="text-blue-700 dark:text-blue-300 text-xs mt-2">
                    ⚠️ In production, this would be sent via email
                  </p>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Processing..." : "Send Reset Link"}
              </button>
            </div>

            <div className="text-center">
              <Link
                href="/login"
                className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
              >
                Back to Login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

