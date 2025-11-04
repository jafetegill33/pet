const KEY = 'idle-pet-v1';

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      ...state,
      lastTick: Date.now(),
      lastSave: Date.now(),
    }));
  } catch {}
}

