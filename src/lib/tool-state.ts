'use client';

import type { ToolId } from './image-tools';

const FAVORITES_KEY = 'ajn-buzz-image:favorites:v1';
const RECENT_KEY = 'ajn-buzz-image:recent:v1';
const PRESETS_KEY = 'ajn-buzz-image:presets:v1';

export type SavedPreset = { id: string; name: string; tool: ToolId; options: Record<string, unknown>; createdAt: number };

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null');
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent('ajn-buzz-local-state'));
}

export function favoriteTools(): ToolId[] { return read<ToolId[]>(FAVORITES_KEY, []); }
export function isFavorite(id: ToolId) { return favoriteTools().includes(id); }
export function toggleFavorite(id: ToolId) {
  const current = favoriteTools();
  write(FAVORITES_KEY, current.includes(id) ? current.filter(value => value !== id) : [id, ...current].slice(0, 40));
}

const MAX_RECENT_TOOLS = 10;

export function cleanupRecentTools(maxItems = MAX_RECENT_TOOLS): ToolId[] {
  const stored = read<unknown>(RECENT_KEY, []);
  if (!Array.isArray(stored)) return [];
  const valid = stored.filter((item): item is ToolId => typeof item === 'string' && item.length > 0);
  const deduped = Array.from(new Set(valid));
  if (deduped.length > maxItems || deduped.length !== stored.length) {
    const trimmed = deduped.slice(0, maxItems);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(trimmed));
      } catch {}
    }
    return trimmed;
  }
  return deduped;
}

export function recentTools(): ToolId[] { return cleanupRecentTools(MAX_RECENT_TOOLS); }
export function markRecentTool(id: ToolId) {
  const cleaned = cleanupRecentTools(MAX_RECENT_TOOLS);
  write(RECENT_KEY, [id, ...cleaned.filter(value => value !== id)].slice(0, MAX_RECENT_TOOLS));
}

export function savedPresets(): SavedPreset[] { return read<SavedPreset[]>(PRESETS_KEY, []); }
export function savePreset(name: string, tool: ToolId, options: Record<string, unknown>) {
  const preset: SavedPreset = { id: crypto.randomUUID(), name: name.trim().slice(0, 50) || 'My preset', tool, options, createdAt: Date.now() };
  write(PRESETS_KEY, [preset, ...savedPresets()].slice(0, 30));
  return preset;
}
export function deletePreset(id: string) { write(PRESETS_KEY, savedPresets().filter(item => item.id !== id)); }
