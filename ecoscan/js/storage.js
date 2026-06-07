'use strict';

const Storage = (() => {
  const KEYS = {
    history: 'ecoscan_history',
    stats:   'ecoscan_stats',
    streak:  'ecoscan_streak',
    prefs:   'ecoscan_prefs',
    progress:'ecoscan_progress',   // xp, level, achievements, impacto
    activity:'ecoscan_activity'    // registro por día para desafíos
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

  /* === STATS (compatibilidad con versión anterior) === */
  function getStats() {
    return _get(KEYS.stats, { scanned: 0, recycled: 0, byMaterial: {} });
  }

  function incrementStats(materialId) {
    const stats = getStats();
    stats.scanned++;
    if (materialId !== 'hazardous') stats.recycled++;
    stats.byMaterial = stats.byMaterial || {};
    stats.byMaterial[materialId] = (stats.byMaterial[materialId] || 0) + 1;
    _set(KEYS.stats, stats);
    return stats;
  }

  /* === STREAK === */
  function getStreak() {
    const data = _get(KEYS.streak, { count: 0, lastDate: null, best: 0 });
    const today = new Date().toDateString();
    if (data.lastDate === today) return data.count;
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (data.lastDate === yesterday) return data.count;
    return 0;
  }

  function getBestStreak() {
    const data = _get(KEYS.streak, { count: 0, lastDate: null, best: 0 });
    return data.best || data.count || 0;
  }

  function updateStreak() {
    const today = new Date().toDateString();
    const data  = _get(KEYS.streak, { count: 0, lastDate: null, best: 0 });
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (data.lastDate === today) {
      data.best = Math.max(data.best || 0, data.count);
      _set(KEYS.streak, data);
      return data.count;
    }
    if (data.lastDate === yesterday) {
      data.count++;
    } else {
      data.count = 1;
    }
    data.lastDate = today;
    data.best = Math.max(data.best || 0, data.count);
    _set(KEYS.streak, data);
    return data.count;
  }

  /* === PROGRESO (XP, nivel, logros, impacto) === */
  function getProgress() {
    return _get(KEYS.progress, {
      xp: 0,
      level: 1,
      achievements: [],
      impact: { co2: 0, water: 0, trees: 0, energy: 0 }
    });
  }

  function addXP(amount) {
    const p = getProgress();
    p.xp = (p.xp || 0) + amount;
    _set(KEYS.progress, p);
    return p.xp;
  }

  function addImpact(delta) {
    const p = getProgress();
    p.impact = p.impact || { co2: 0, water: 0, trees: 0, energy: 0 };
    p.impact.co2   += delta.co2   || 0;
    p.impact.water += delta.water || 0;
    p.impact.trees += delta.trees || 0;
    p.impact.energy += delta.energy || 0;
    _set(KEYS.progress, p);
    return p.impact;
  }

  function getImpact() {
    return getProgress().impact || { co2: 0, water: 0, trees: 0, energy: 0 };
  }

  function getUnlockedAchievements() {
    return getProgress().achievements || [];
  }

  function unlockAchievements(ids) {
    if (!ids || !ids.length) return;
    const p = getProgress();
    p.achievements = Array.from(new Set([...(p.achievements || []), ...ids]));
    _set(KEYS.progress, p);
  }

  function setLevel(level) {
    const p = getProgress();
    p.level = level;
    _set(KEYS.progress, p);
  }

  /* === ACTIVIDAD POR DÍA (para desafíos) === */
  function recordActivity(materialId) {
    const today = new Date().toDateString();
    const week = _weekKey(new Date());
    const data = _get(KEYS.activity, { days: {}, weeks: {} });
    data.days = data.days || {};
    data.weeks = data.weeks || {};

    if (!data.days[today]) data.days[today] = { count: 0, types: [] };
    data.days[today].count++;
    if (!data.days[today].types.includes(materialId)) data.days[today].types.push(materialId);

    if (!data.weeks[week]) data.weeks[week] = { count: 0, types: [] };
    data.weeks[week].count++;
    if (!data.weeks[week].types.includes(materialId)) data.weeks[week].types.push(materialId);

    /* Limpieza: conserva sólo 14 días y 8 semanas */
    _prune(data.days, 14);
    _prune(data.weeks, 8);

    _set(KEYS.activity, data);
    return data;
  }

  function getActivitySnapshot() {
    const today = new Date().toDateString();
    const week = _weekKey(new Date());
    const data = _get(KEYS.activity, { days: {}, weeks: {} });
    const day = (data.days || {})[today] || { count: 0, types: [] };
    const wk = (data.weeks || {})[week] || { count: 0, types: [] };
    return {
      scansToday: day.count,
      typesToday: day.types.length,
      scansWeek: wk.count,
      typesWeek: wk.types.length
    };
  }

  function _prune(obj, keep) {
    const keys = Object.keys(obj);
    if (keys.length <= keep) return;
    keys.slice(0, keys.length - keep).forEach((k) => delete obj[k]);
  }

  function _weekKey(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - dayNum + 3);
    const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
    const week = 1 + Math.round(((d - firstThursday) / 86400000 - 3) / 7);
    return `${d.getUTCFullYear()}-W${week}`;
  }

  /* === HISTORIAL === */
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
    /* Borra historial y stats visibles, conserva logros y XP ganados. */
    _set(KEYS.history, []);
    _set(KEYS.stats, { scanned: 0, recycled: 0, byMaterial: {} });
    _set(KEYS.streak, { count: 0, lastDate: null, best: getBestStreak() });
  }

  function resetAll() {
    Object.values(KEYS).forEach((k) => _safe(() => localStorage.removeItem(k)));
  }

  function isAvailable() {
    try {
      const k = '__ecoscan_test__';
      localStorage.setItem(k, '1');
      localStorage.removeItem(k);
      return true;
    } catch { return false; }
  }

  return {
    getStats, incrementStats,
    getStreak, getBestStreak, updateStreak,
    getProgress, addXP, addImpact, getImpact,
    getUnlockedAchievements, unlockAchievements, setLevel,
    recordActivity, getActivitySnapshot,
    getHistory, addToHistory, clearHistory, resetAll, isAvailable
  };
})();
