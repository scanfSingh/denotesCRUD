"use server";

import { isCurrentUserAdmin } from "./actions";
import {
  getFeatureFlags,
  setFeatureFlagValue,
  resetFeatureFlagValue,
} from "@/lib/featureFlagOverrides";
import { listToggleableFlags, getFlagAtPath, type FeatureFlags } from "@/lib/featureFlags";

/**
 * Server actions backing the "Feature Flags" panel in the admin
 * dashboard (app/admin/page.tsx), plus getAllFeatureFlags() - the
 * unrestricted read used by the root layout to feed every flag's
 * current value into the app via FeatureFlagsProvider.
 *
 * MongoDB (lib/featureFlagOverrides.ts) is the source of truth for
 * every flag's live value now, not just admin-touched deltas -
 * env vars only supply the "factory default" a flag is seeded with
 * (new deployment) or reset to (admin dashboard "Reset" action).
 */

export interface FeatureFlagRow {
  path: string;
  category: string;
  key: string;
  label: string;
  envDefault: boolean;
  /** null = currently equal to the env default; non-null = admin has
   * diverged this flag from its factory default. Kept for the admin
   * dashboard's "Overridden" badge/"Reset" affordance. */
  override: boolean | null;
  effective: boolean;
}

export async function getFeatureFlagDashboard(): Promise<
  { success: true; flags: FeatureFlagRow[] } | { success: false; error: string }
> {
  try {
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      return { success: false, error: "Unauthorized" };
    }

    const dbFlags = await getFeatureFlags();
    const flags: FeatureFlagRow[] = listToggleableFlags().map((f) => {
      const effective = getFlagAtPath(dbFlags, f.path);
      return {
        ...f,
        override: effective === f.envDefault ? null : effective,
        effective,
      };
    });

    return { success: true, flags };
  } catch (error) {
    console.error("[feature-flags-actions] getFeatureFlagDashboard failed:", error);
    return { success: false, error: "Failed to load feature flags" };
  }
}

export async function setFeatureFlagOverride(
  path: string,
  value: boolean
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      return { success: false, error: "Unauthorized" };
    }

    await setFeatureFlagValue(path, value);
    return { success: true };
  } catch (error) {
    console.error("[feature-flags-actions] setFeatureFlagOverride failed:", error);
    return { success: false, error: "Failed to update flag" };
  }
}

/** Resets the flag in the database back to its env-var factory default. */
export async function clearFeatureFlagOverride(
  path: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      return { success: false, error: "Unauthorized" };
    }

    await resetFeatureFlagValue(path);
    return { success: true };
  } catch (error) {
    console.error("[feature-flags-actions] clearFeatureFlagOverride failed:", error);
    return { success: false, error: "Failed to reset flag" };
  }
}

/**
 * Reads every flag's current value from the database in one call - used
 * by the root layout to hydrate FeatureFlagsProvider on every request.
 * Not admin-gated (every visitor's page render needs this), but only
 * ever returns booleans already safe to ship to the client. Falls back
 * to the static env-var defaults if the database is unreachable, so a
 * Mongo hiccup never breaks page rendering.
 */
export async function getAllFeatureFlags(): Promise<FeatureFlags> {
  try {
    return await getFeatureFlags();
  } catch (error) {
    console.error("[feature-flags-actions] getAllFeatureFlags failed, using static defaults:", error);
    const { featureFlags } = await import("@/lib/featureFlags");
    return featureFlags;
  }
}
