"use client";

import { createContext, useContext, type ReactNode } from "react";
import { featureFlags, type FeatureFlags } from "@/lib/featureFlags";

/**
 * Makes the database-backed feature flags (fetched once, server-side,
 * in app/layout.tsx via getAllFeatureFlags()) available to any client
 * component via useFeatureFlags(), without prop-drilling or each
 * component doing its own fetch/round-trip.
 *
 * Defaults to the static env-var flags so anything rendered outside
 * the provider (shouldn't happen, but TypeScript needs a value) still
 * gets a sane fallback instead of crashing.
 */
const FeatureFlagsContext = createContext<FeatureFlags>(featureFlags);

export function FeatureFlagsProvider({
  flags,
  children,
}: {
  flags: FeatureFlags;
  children: ReactNode;
}) {
  return <FeatureFlagsContext.Provider value={flags}>{children}</FeatureFlagsContext.Provider>;
}

export function useFeatureFlags(): FeatureFlags {
  return useContext(FeatureFlagsContext);
}
