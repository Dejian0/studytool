import { useCallback, useSyncExternalStore } from 'react';

type Theme = 'dark' | 'light';

const KEY = 'theme';
const listeners = new Set<() => void>();

function getSnapshot(): Theme {
  return (localStorage.getItem(KEY) as Theme) || 'dark';
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

// Apply on load
applyTheme(getSnapshot());

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot);

  const toggle = useCallback(() => {
    const next: Theme = getSnapshot() === 'dark' ? 'light' : 'dark';
    localStorage.setItem(KEY, next);
    applyTheme(next);
    listeners.forEach((cb) => cb());
  }, []);

  return { theme, toggle } as const;
}
