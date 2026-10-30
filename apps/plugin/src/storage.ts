import {
  normalizeSettings,
  type Settings,
  splitChunks,
} from '@astrea/breakpoints-core';

/** Shared plugin data namespace (at least 3 alphanumeric characters). */
export const NAMESPACE = 'astreabreakpoints';
const SETTINGS_KEY = 'settings';
const COUNT_KEY = `${SETTINGS_KEY}.count`;

function chunkKey(index: number): string {
  return `${SETTINGS_KEY}.${index}`;
}

function storedChunkCount(): number {
  const count = Number(figma.root.getSharedPluginData(NAMESPACE, COUNT_KEY));
  return Number.isInteger(count) && count > 0 ? count : 0;
}

/**
 * Reads the team settings stored in this file. Returns null on the first run
 * (nothing stored) so the UI can start the setup wizard.
 */
export function loadSettings(): Settings | null {
  const count = storedChunkCount();
  if (count === 0) return null;
  let json = '';
  for (let i = 0; i < count; i++) {
    json += figma.root.getSharedPluginData(NAMESPACE, chunkKey(i));
  }
  try {
    return normalizeSettings(JSON.parse(json));
  } catch {
    return null;
  }
}

/** Stores the settings in this file for everyone who opens it. */
export function saveSettings(settings: Settings): void {
  const chunks = splitChunks(JSON.stringify(settings));
  const previous = storedChunkCount();
  chunks.forEach((chunk, i) => {
    figma.root.setSharedPluginData(NAMESPACE, chunkKey(i), chunk);
  });
  // An empty value deletes the entry.
  for (let i = chunks.length; i < previous; i++) {
    figma.root.setSharedPluginData(NAMESPACE, chunkKey(i), '');
  }
  figma.root.setSharedPluginData(NAMESPACE, COUNT_KEY, String(chunks.length));
}
