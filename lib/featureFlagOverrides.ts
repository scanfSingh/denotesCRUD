/**
 * Feature flags, persisted in MongoDB - the single source of truth for
 * every flag's live value.
 *
 * lib/featureFlags.ts defines env-var-driven "factory defaults" (used
 * to seed a brand-new deployment's doc, to fill in any flag a legacy
 * doc doesn't have yet, and as a fallback if the database is
 * unreachable). This module is what actually gets read on every
 * request: an admin's toggle in the dashboard writes here directly,
 * with no redeploy needed.
 *
 * Single document, single collection - this app doesn't have many
 * settings yet, so there's no need for a settings-per-key collection.
 *
 * Storage shape is nested (`{ ragChat: { enabled: true } }`), mirroring
 * the FeatureFlags type exactly - MongoDB's $set always treats dots in
 * a field path as nested traversal, so a flag path like
 * "ragChat.enabled" naturally lands as a nested document. That's
 * intentional here (unlike the old sparse-overrides model this file
 * used to hold), since `flags` is meant to be a full mirror of
 * FeatureFlags, not a delta.
 */
import type { Collection } from "mongodb";
import client from "@/lib/mongodb";
import { featureFlags, type FeatureFlags, getStaticFlag, mergeWithDefaults } from "@/lib/featureFlags";

const COLLECTION = "settings";
const DOC_ID = "featureFlags";

interface FeatureFlagsDoc {
  _id: string;
  flags: Partial<FeatureFlags>;
  updatedAt?: Date;
}

async function getCollection(): Promise<Collection<FeatureFlagsDoc>> {
  const mongoClient = await client.connect();
  return mongoClient.db().collection<FeatureFlagsDoc>(COLLECTION);
}

/**
 * Reads every flag's current value from the database, seeding the doc
 * from the env-var defaults on first read (atomic upsert, no race
 * condition), and filling in any flag a legacy doc predates via
 * mergeWithDefaults().
 */
export async function getFeatureFlags(): Promise<FeatureFlags> {
  const collection = await getCollection();
  const result = await collection.findOneAndUpdate(
    { _id: DOC_ID },
    { $setOnInsert: { _id: DOC_ID, flags: featureFlags, updatedAt: new Date() } },
    { upsert: true, returnDocument: "after" }
  );
  return mergeWithDefaults(result?.flags);
}

/** Writes one flag's value straight into the database. */
export async function setFeatureFlagValue(path: string, value: boolean): Promise<void> {
  const collection = await getCollection();
  await collection.updateOne(
    { _id: DOC_ID },
    { $set: { [`flags.${path}`]: value, updatedAt: new Date() } },
    { upsert: true }
  );
}

/** Resets one flag back to its env-var "factory default" in the database. */
export async function resetFeatureFlagValue(path: string): Promise<void> {
  await setFeatureFlagValue(path, getStaticFlag(path));
}
