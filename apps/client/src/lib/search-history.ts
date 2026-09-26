import { Platform } from 'react-native';

const STORAGE_KEY = 'sirohi-point-search-history-v1';
const MAX_ITEMS = 4;

function isWeb(): boolean {
  return Platform.OS === 'web' && typeof window !== 'undefined';
}

export function getSearchHistory(): string[] {
  if (!isWeb()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addSearchTerm(term: string): string[] {
  const trimmed = term.trim();
  if (!trimmed) return getSearchHistory();
  const history = getSearchHistory().filter((t) => t.toLowerCase() !== trimmed.toLowerCase());
  history.unshift(trimmed);
  const updated = history.slice(0, MAX_ITEMS);
  if (isWeb()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  }
  return updated;
}

export function removeSearchTerm(term: string): string[] {
  const history = getSearchHistory().filter((t) => t !== term);
  if (isWeb()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch {}
  }
  return history;
}

export function clearSearchHistory(): void {
  if (isWeb()) {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }
}
