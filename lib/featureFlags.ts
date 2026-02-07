/**
 * Feature Flags Configuration
 * 
 * Toggle features on/off by changing the values below.
 * These can also be driven by environment variables for production flexibility.
 */

export const featureFlags = {
  // Audio Notes Features
  audioNotes: {
    /** Enable/disable the entire audio notes feature */
    enabled: process.env.NEXT_PUBLIC_FF_AUDIO_NOTES !== "false",
    
    /** Enable AI processing of transcriptions (requires OpenAI API key) */
    aiProcessing: process.env.NEXT_PUBLIC_FF_AI_PROCESSING === "true",
    
    /** Show live transcription preview while recording */
    liveTranscriptionPreview: process.env.NEXT_PUBLIC_FF_LIVE_PREVIEW !== "false",
    
    /** Allow linking notes to topics */
    topicLinking: process.env.NEXT_PUBLIC_FF_TOPIC_LINKING !== "false",
  },

  // Topics Features
  topics: {
    /** Enable/disable topics feature */
    enabled: process.env.NEXT_PUBLIC_FF_TOPICS !== "false",
    
    /** Enable sharing topics with friends */
    sharing: process.env.NEXT_PUBLIC_FF_TOPIC_SHARING !== "false",
    
    /** Enable topics view page */
    viewPage: process.env.NEXT_PUBLIC_FF_TOPICS_VIEW !== "false",
  },

  // Notes Features
  notes: {
    /** Enable/disable notes feature */
    enabled: process.env.NEXT_PUBLIC_FF_NOTES !== "false",
    
    /** Enable rich text editor for notes */
    richTextEditor: process.env.NEXT_PUBLIC_FF_RICH_TEXT !== "false",
    
    /** Enable note summaries */
    summaries: process.env.NEXT_PUBLIC_FF_SUMMARIES !== "false",
    
    /** Enable tasks/crud page */
    tasks: process.env.NEXT_PUBLIC_FF_TASKS !== "false",
  },

  // Blog Features
  blog: {
    /** Enable/disable blog feature */
    enabled: process.env.NEXT_PUBLIC_FF_BLOG !== "false",
  },

  // Social Features
  social: {
    /** Enable friends feature */
    friends: process.env.NEXT_PUBLIC_FF_FRIENDS !== "false",
    
    /** Enable shared topics view */
    sharedTopics: process.env.NEXT_PUBLIC_FF_SHARED_TOPICS !== "false",
    
    /** Enable families feature for shared inventory */
    families: process.env.NEXT_PUBLIC_FF_FAMILIES !== "false",
  },

  // Auth Features
  auth: {
    /** Enable Google OAuth login */
    googleAuth: process.env.NEXT_PUBLIC_FF_GOOGLE_AUTH !== "false",
    
    /** Enable email/password login */
    emailAuth: process.env.NEXT_PUBLIC_FF_EMAIL_AUTH !== "false",
    
    /** Enable forgot password feature */
    forgotPassword: process.env.NEXT_PUBLIC_FF_FORGOT_PASSWORD !== "false",
  },

  // UI Features
  ui: {
    /** Enable dark mode toggle */
    darkMode: process.env.NEXT_PUBLIC_FF_DARK_MODE !== "false",
    
    /** Show API status indicator */
    apiStatusIndicator: process.env.NEXT_PUBLIC_FF_API_STATUS !== "false",
  },

  // Navigation Features
  navigation: {
    /** Show Home link */
    home: process.env.NEXT_PUBLIC_FF_NAV_HOME !== "false",

    /** Show Home Inventory link */
    inventory: process.env.NEXT_PUBLIC_FF_NAV_INVENTORY !== "false",
    
    /** Show Tasks link */
    tasks: process.env.NEXT_PUBLIC_FF_NAV_TASKS !== "false",
    
    /** Show Topics link */
    topics: process.env.NEXT_PUBLIC_FF_NAV_TOPICS !== "false",
    
    /** Show Topics View link */
    topicsView: process.env.NEXT_PUBLIC_FF_NAV_TOPICS_VIEW !== "false",
    
    /** Show Shared Topics link */
    sharedTopics: process.env.NEXT_PUBLIC_FF_NAV_SHARED !== "false",
    
    /** Show Audio Notes link */
    audioNotes: process.env.NEXT_PUBLIC_FF_NAV_AUDIO_NOTES !== "false",
    
    /** Show Blog link */
    blog: process.env.NEXT_PUBLIC_FF_NAV_BLOG !== "false",
    
    /** Show Friends link */
    friends: process.env.NEXT_PUBLIC_FF_NAV_FRIENDS !== "false",
    
    /** Show Families link */
    families: process.env.NEXT_PUBLIC_FF_NAV_FAMILIES !== "false",
    
    /** Show Profile link */
    profile: process.env.NEXT_PUBLIC_FF_NAV_PROFILE !== "false",
  },
};

// Type for accessing feature flags
export type FeatureFlags = typeof featureFlags;

// Helper function to check if a feature is enabled
export function isFeatureEnabled(
  category: keyof FeatureFlags,
  feature: string
): boolean {
  const categoryFlags = featureFlags[category] as Record<string, boolean>;
  return categoryFlags?.[feature] ?? false;
}

// Helper hook for client components
export function useFeatureFlag(
  category: keyof FeatureFlags,
  feature: string
): boolean {
  return isFeatureEnabled(category, feature);
}

