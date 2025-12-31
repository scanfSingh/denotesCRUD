"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { resendVerificationEmail } from "../actions";

export default function EmailVerificationBanner() {
  const { data: session } = useSession();
  const [dismissed, setDismissed] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Don't show banner if:
  // - No session
  // - User is verified
  // - User dismissed the banner
  // - User signed in with Google (always verified)
  const user = session?.user as { emailVerified?: boolean; provider?: string; email?: string } | undefined;
  
  if (!session || !user) return null;
  if (user.emailVerified) return null;
  if (user.provider === "google") return null;
  if (dismissed) return null;

  const handleResend = async () => {
    if (!user.email) return;
    
    setResending(true);
    setMessage(null);
    
    try {
      const result = await resendVerificationEmail(user.email);
      if (result.success) {
        setMessage({ type: "success", text: "Verification email sent! Check your inbox." });
      } else {
        setMessage({ type: "error", text: result.error || "Failed to send verification email." });
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong. Please try again." });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-amber-500 to-orange-500 dark:from-amber-600 dark:to-orange-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-white">
            <svg 
              className="w-5 h-5 flex-shrink-0" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
              />
            </svg>
            <span className="text-sm font-medium">
              Please verify your email address to access all features.
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            {message && (
              <span className={`text-sm ${message.type === "success" ? "text-green-100" : "text-red-100"}`}>
                {message.text}
              </span>
            )}
            
            <button
              onClick={handleResend}
              disabled={resending}
              className="px-4 py-1.5 text-sm font-medium text-amber-600 bg-white rounded-lg hover:bg-amber-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {resending ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Sending...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Resend Email
                </>
              )}
            </button>
            
            <button
              onClick={() => setDismissed(true)}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Dismiss"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

