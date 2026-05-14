'use strict';

const Storage = (() => {
  const KEYS = {
    history: 'ecoscan_history',
    stats:   'ecoscan_stats',
    streak:  'ecoscan_streak',
    prefs:   'ecoscan_prefs'
  };

  const MAX_HISTORY = 50;

  function _safe(fn, fallback = null) {
    try { return fn(); }
    catch { return fallback; }
  }

  function _get(key, fallback = null) {
    return _safe(() => {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : fallback;
    }, fallback);
  }

  function _set(key, value) {
    return _safe(() => { localStorage.setItem(key, JSON.stringify(value)); return true; }, false);
  }

  function getStats() {
    return _get(KEYS.stats, { scanned: 0, recycled: 0 });
  }

  function incrementStats(materialId) {
    const stats = getStats();
    stats.scanned++;
    if (materialId !== 'hazardous') stats.recycled++;
    _set(KEYS.stats, stats);
    return stats;
  }

  function getStreak() {
    const data = _get(KEYS.streak, { count: 0, lastDate: null });
    const today = new Date().toDateString();
    if (data.lastDate === today) return data.count;
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (data.lastDate === yesterday) return data.count;
    return 0;
  }

  function updateStreak() {
    const today = new Date().toDateString();
    const data  = _get(KEYS.streak, { count: 0, lastDate: null });
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (data.lastDate === today) return data.count;
    if (data.lastDate === yesterday) {
      data.count++;
    } else {
      data.count = 1;
    }
    data.lastDate = today;
    _set(KEYS.streak, data);
    return data.count;
  }

  function getHistory() {
    return _get(KEYS.history, []);
  }

  function addToHistory(entry) {
    const hist = getHistory();
    hist.unshift({
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      materialId: entry.materialId,
      materialName: entry.materialName,
      binName: entry.binName,
      icon: entry.icon,
      bgColor: entry.bgColor,
      confidence: entry.confidence,
      timestamp: new Date().toISOString()
    });
    if (hist.length > MAX_HISTORY) hist.splice(MAX_HISTORY);
    _set(KEYS.history, hist);
  }

  function clearHistory() {
    _set(KEYS.history, []);
    _set(KEYS.stats, { scanned: 0, recycled: 0 });
    _set(KEYS.streak, { count: 0, lastDate: null });
  }

  function isAvailable() {
    try {
      const k = '__ecoscan_test__';
      localStorage.setItem(k, '1');
      localStorage.removeItem(k);
      return true;
    } catch { return false; }
  }

  return { getStats, incrementStats, getStreak, updateStreak, getHistory, addToHistory, clearHistory, isAvailable };
})();
