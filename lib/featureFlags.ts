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
    
    /** Families = separate app; disabled here */
    families: process.env.NEXT_PUBLIC_FF_FAMILIES === "true",
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

  // RAG Chat Feature (AI assistant grounded on ingested docs/blog content)
  ragChat: {
    /** Enable the floating chat widget. Off by default since it needs
     * Upstash Vector + OpenAI configured (see RAG_CHAT_SETUP.md). */
    enabled: process.env.NEXT_PUBLIC_FF_RAG_CHAT === "true",
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

    /** Inventory = separate app; hidden by default */
    inventory: process.env.NEXT_PUBLIC_FF_NAV_INVENTORY === "true",
    
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
    
    /** Families = separate app; hidden by default */
    families: process.env.NEXT_PUBLIC_FF_NAV_FAMILIES === "true",
    
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

// ---------------------------------------------------------------------
// Database-backed flags (admin dashboard)
// ---------------------------------------------------------------------
//
// The static `featureFlags` object above is env-var-driven and still
// exists as (a) the TypeScript shape every flag doc must match, (b)
// the "factory default" seed for a brand new deployment's DB doc and
// for the admin dashboard's "Reset" action, and (c) a safe fallback if
// the database is ever unreachable. The database (see
// lib/featureFlagOverrides.ts) is the actual runtime source of truth -
// every flag lives there, not just the ones an admin has touched.
//
// Everything below is pure (no I/O), so it's safe to import from both
// server and client code.

/** Categories intentionally left out of the runtime-toggleable
 * dashboard. Auth methods stay env-only so an admin can never
 * accidentally lock everyone - including themselves - out of login by
 * flipping a switch in the UI. */
const NON_TOGGLEABLE_CATEGORIES: (keyof FeatureFlags)[] = ["auth"];

export interface FeatureFlagEntry {
  /** Dot path used as the flag's key in the database, e.g. "ragChat.enabled". */
  path: string;
  category: string;
  key: string;
  /** Human-readable label derived from the key, e.g. "Enabled". */
  label: string;
  envDefault: boolean;
}

function humanizeFlagKey(key: string): string {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Flat list of every boolean flag eligible for the admin dashboard,
 * derived from the static `featureFlags` object above so it can never
 * drift out of sync with new flags added there. */
export function listToggleableFlags(): FeatureFlagEntry[] {
  const entries: FeatureFlagEntry[] = [];
  for (const [category, group] of Object.entries(featureFlags)) {
    if (NON_TOGGLEABLE_CATEGORIES.includes(category as keyof FeatureFlags)) continue;
    for (const [key, value] of Object.entries(group as Record<string, unknown>)) {
      if (typeof value !== "boolean") continue;
      entries.push({
        path: `${category}.${key}`,
        category,
        key,
        label: humanizeFlagKey(key),
        envDefault: value,
      });
    }
  }
  return entries;
}

/** Reads a single dot-path boolean straight out of the static
 * `featureFlags` object, e.g. getStaticFlag("ragChat.enabled"). Used
 * as the "factory default" a flag resets back to. */
export function getStaticFlag(path: string): boolean {
  const [category, key] = path.split(".");
  const group = (featureFlags as unknown as Record<string, Record<string, unknown>>)[category];
  return Boolean(group?.[key]);
}

/** Reads a single dot-path boolean out of any FeatureFlags-shaped
 * object - used for both the static defaults and a flag set loaded
 * from the database. */
export function getFlagAtPath(flags: FeatureFlags, path: string): boolean {
  const [category, key] = path.split(".");
  const group = (flags as unknown as Record<string, Record<string, unknown>>)[category];
  return Boolean(group?.[key]);
}

/**
 * Deep-merges a (possibly partial/legacy) flag set loaded from the
 * database on top of the current factory defaults. This is what makes
 * it safe to add a brand new flag to `featureFlags` above at any time:
 * an older database doc that predates that flag simply won't have it,
 * and this fills the gap with the env-var default instead of
 * `undefined`, category by category.
 */
export function mergeWithDefaults(dbFlags: Partial<FeatureFlags> | null | undefined): FeatureFlags {
  const merged = JSON.parse(JSON.stringify(featureFlags)) as Record<string, Record<string, unknown>>;
  if (dbFlags) {
    for (const [category, group] of Object.entries(dbFlags)) {
      if (!group || typeof group !== "object") continue;
      merged[category] = { ...(merged[category] || {}), ...(group as Record<string, unknown>) };
    }
  }
  return merged as unknown as FeatureFlags;
}

