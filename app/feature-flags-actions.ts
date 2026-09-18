"use server";

import { isCurrentUserAdmin } from "./actions";
import {
  getFeatureFlagOverrides,
  setFeatureFlagOverride as setOverride,
  clearFeatureFlagOverride as clearOverride,
} from "@/lib/featureFlagOverrides";
import { listToggleableFlags, resolveFlag, getStaticFlag } from "@/lib/featureFlags";

/**
 * Server actions backing the "Feature Flags" panel in the admin
 * dashboard (app/admin/page.tsx), plus a single unrestricted lookup
 * (getEffectiveFlag) that any logged-in surface can call to find out
 * whether a specific feature is currently on - the client can't
 * enumerate all flags through it, only check one at a time.
 */

export interface FeatureFlagRow {
  path: string;
  category: string;
  key: string;
  label: string;
  envDefault: boolean;
  /** null = no override saved, currently using the env default. */
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

    const overrides = await getFeatureFlagOverrides();
    const flags: FeatureFlagRow[] = listToggleableFlags().map((f) => ({
      ...f,
      override: f.path in overrides ? overrides[f.path] : null,
      effective: resolveFlag(f.path, overrides),
    }));

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

    await setOverride(path, value);
    return { success: true };
  } catch (error) {
    console.error("[feature-flags-actions] setFeatureFlagOverride failed:", error);
    return { success: false, error: "Failed to update flag" };
  }
}

/** Removes the override so the flag falls back to its env-var default. */
export async function clearFeatureFlagOverride(
  path: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      return { success: false, error: "Unauthorized" };
    }

    await clearOverride(path);
    return { success: true };
  } catch (error) {
    console.error("[feature-flags-actions] clearFeatureFlagOverride failed:", error);
    return { success: false, error: "Failed to reset flag" };
  }
}

/**
 * Not admin-gated - any logged-in-or-not surface (e.g. RagChatWidget,
 * the home page hero) needs this to know whether a given feature is
 * currently enabled, including admin overrides. Only ever resolves a
 * single path the caller already knows the name of, so it can't be
 * used to enumerate the full flag set.
 */
export async function getEffectiveFlag(path: string): Promise<boolean> {
  try {
    const overrides = await getFeatureFlagOverrides();
    return resolveFlag(path, overrides);
  } catch (error) {
    console.error("[feature-flags-actions] getEffectiveFlag failed:", error);
    return getStaticFlag(path);
  }
}
