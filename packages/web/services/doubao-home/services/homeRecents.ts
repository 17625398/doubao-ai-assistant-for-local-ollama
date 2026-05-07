export const HOME_RECENTS_STORAGE_KEY = 'doubao-home-recent-prompts';

export function loadRecentPrompts(defaults: string[]): string[] {
  if (typeof window === 'undefined') return defaults;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(HOME_RECENTS_STORAGE_KEY) || '[]') as unknown;
    return Array.isArray(parsed) && parsed.every((item) => typeof item === 'string') ? parsed.slice(0, 30) : defaults;
  } catch {
    return defaults;
  }
}

export function saveRecentPrompt(items: string[], prompt: string): string[] {
  const next = [prompt, ...items.filter((item) => item !== prompt)].slice(0, 30);
  window.localStorage.setItem(HOME_RECENTS_STORAGE_KEY, JSON.stringify(next));
  return next;
}
