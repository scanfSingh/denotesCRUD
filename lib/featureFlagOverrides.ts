/**
 * Runtime overrides for feature flags, persisted in MongoDB.
 *
 * lib/featureFlags.ts defines env-var-driven defaults, baked in at
 * build/deploy time. This module lets an admin flip a flag on/off at
 * runtime (via the admin dashboard) without a redeploy - the override
 * takes precedence over the env default until cleared.
 *
 * Single document, single collection - this app doesn't have many
 * settings yet, so there's no need for a settings-per-key collection.
 *
 * Storage shape is nested (`{ ragChat: { enabled: true } }`), not a
 * flat `{ "ragChat.enabled": true }` map - MongoDB's $set/$unset always
 * treat dots in a field path as nested traversal, so a flag path like
 * "ragChat.enabled" naturally lands as a nested document. The rest of
 * the app (resolveFlag, the admin dashboard) works with flat
 * "category.key" strings, so getFeatureFlagOverrides() flattens on the
 * way out.
 */
import type { Collection } from "mongodb";
import client from "@/lib/mongodb";

const COLLECTION = "settings";
const DOC_ID = "featureFlagOverrides";

interface FeatureFlagOverridesDoc {
  _id: string;
  overrides: Record<string, Record<string, boolean>>;
  updatedAt?: Date;
}

async function getCollection(): Promise<Collection<FeatureFlagOverridesDoc>> {
  const mongoClient = await client.connect();
  return mongoClient.db().collection<FeatureFlagOverridesDoc>(COLLECTION);
}

function flattenOverrides(nested: Record<string, Record<string, boolean>>): Record<string, boolean> {
  const flat: Record<string, boolean> = {};
  for (const [category, group] of Object.entries(nested || {})) {
    if (!group || typeof group !== "object") continue;
    for (const [key, value] of Object.entries(group)) {
      if (typeof value === "boolean") {
        flat[`${category}.${key}`] = value;
      }
    }
  }
  return flat;
}

/** Map of flag path (e.g. "ragChat.enabled") -> overridden value.
 * A flag with no entry here is using its env-var default. */
export async function getFeatureFlagOverrides(): Promise<Record<string, boolean>> {
  const collection = await getCollection();
  const doc = await collection.findOne({ _id: DOC_ID });
  return flattenOverrides(doc?.overrides || {});
}

export async function setFeatureFlagOverride(path: string, value: boolean): Promise<void> {
  const collection = await getCollection();
  await collection.updateOne(
    { _id: DOC_ID },
    { $set: { [`overrides.${path}`]: value, updatedAt: new Date() } },
    { upsert: true }
  );
}

/** Removes the override so the flag falls back to its env-var default. */
export async function clearFeatureFlagOverride(path: string): Promise<void> {
  const collection = await getCollection();
  await collection.updateOne(
    { _id: DOC_ID },
    { $unset: { [`overrides.${path}`]: "" }, $set: { updatedAt: new Date() } },
    { upsert: true }
  );
}
