const HISTORY_KEY = 'analyticore_history_ids';
const MAX_HISTORY = 10;

function storageKey(scope = 'default') {
  return `${HISTORY_KEY}:${encodeURIComponent(scope || 'default')}`;
}

export function readHistoryIds(scope) {
  try {
    const ids = JSON.parse(localStorage.getItem(storageKey(scope)) || '[]');
    return Array.isArray(ids) ? ids.filter(Number.isInteger).slice(0, MAX_HISTORY) : [];
  } catch {
    return [];
  }
}

export function addHistoryId(jobId, scope) {
  const ids = [jobId, ...readHistoryIds(scope).filter((id) => id !== jobId)].slice(0, MAX_HISTORY);
  localStorage.setItem(storageKey(scope), JSON.stringify(ids));
  return ids;
}

export function clearHistoryIds(scope) {
  localStorage.removeItem(storageKey(scope));
}
