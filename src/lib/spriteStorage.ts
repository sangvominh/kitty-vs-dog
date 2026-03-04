/**
 * IndexedDB persistence layer for sprite configurations and image blobs.
 * Uses idb-keyval for minimal wrapper around IndexedDB key-value storage.
 */

import { get, set, del, keys } from 'idb-keyval';
import type { SpriteConfig } from '../game/state/spriteTypes';

const CONFIG_KEY = 'sprite-config';
const BLOB_PREFIX = 'blob:';

/**
 * Persist the full sprite configuration (metadata only, no blobs) to IndexedDB.
 */
export async function saveConfig(config: SpriteConfig): Promise<void> {
  config.lastModified = Date.now();
  await set(CONFIG_KEY, config);
}

/**
 * Load the saved sprite configuration from IndexedDB.
 * Returns null if no config exists or on deserialization errors.
 */
export async function loadConfig(): Promise<SpriteConfig | null> {
  try {
    const config = await get<SpriteConfig>(CONFIG_KEY);
    return config ?? null;
  } catch (err) {
    console.warn('[spriteStorage] Failed to load config:', err);
    return null;
  }
}

/**
 * Store an image blob in IndexedDB.
 */
export async function saveImageBlob(imageId: string, blob: Blob): Promise<void> {
  await set(`${BLOB_PREFIX}${imageId}`, blob);
}

/**
 * Retrieve an image blob from IndexedDB.
 * Returns null if missing (deleted externally or evicted by browser).
 */
export async function loadImageBlob(imageId: string): Promise<Blob | null> {
  try {
    const blob = await get<Blob>(`${BLOB_PREFIX}${imageId}`);
    return blob ?? null;
  } catch (err) {
    console.warn(`[spriteStorage] Failed to load blob for ${imageId}:`, err);
    return null;
  }
}

/**
 * Remove an image blob from IndexedDB.
 * Idempotent: no error if key doesn't exist.
 */
export async function deleteImageBlob(imageId: string): Promise<void> {
  await del(`${BLOB_PREFIX}${imageId}`);
}

/**
 * Remove all sprite-related data from IndexedDB (config + all blobs).
 */
export async function clearAllSprites(): Promise<void> {
  const allKeys = await keys();
  for (const key of allKeys) {
    if (key === CONFIG_KEY || (typeof key === 'string' && key.startsWith(BLOB_PREFIX))) {
      await del(key);
    }
  }
}

// ── Local Data Source ──

import type { LocalManifest } from '../game/state/spriteTypes';

/**
 * Fetch and parse the local-data manifest.
 * Returns null if the file doesn't exist or is invalid.
 */
export async function loadLocalManifest(): Promise<LocalManifest | null> {
  try {
    const resp = await fetch('/local-data/manifest.json', { cache: 'no-cache' });
    if (!resp.ok) return null;
    const data: LocalManifest = await resp.json();
    if (!data.version || !data.entities) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Load an image from the local-data folder as a Blob.
 * @param relativePath - path relative to local-data/, e.g. "sprites/kitty/idle.png"
 */
export async function loadLocalImageBlob(relativePath: string): Promise<Blob | null> {
  try {
    const resp = await fetch(`/local-data/${relativePath}`, { cache: 'no-cache' });
    if (!resp.ok) return null;
    return await resp.blob();
  } catch {
    return null;
  }
}
