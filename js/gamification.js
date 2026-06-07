'use strict';

/* =========================================
   ECOSCAN — MOTOR DE GAMIFICACIÓN E IMPACTO
   Niveles, XP, logros, desafíos e impacto ambiental
   ========================================= */

const Gamification = (() => {

  /* === IMPACTO AMBIENTAL POR MATERIAL (por unidad escaneada) === */
  /* Valores aproximados y educativos, no cifras oficiales. */
  const IMPACT_PER_SCAN = {
    plastic:    { co2: 0.08, water: 2.0,  trees: 0,     energy: 0.5 },
    glass:      { co2: 0.30, water: 0.5,  trees: 0,     energy: 0.3 },
    paper:      { co2: 0.05, water: 26.0, trees: 0.017, energy: 0.2 },
    cardboard:  { co2: 0.06, water: 15.0, trees: 0.012, energy: 0.2 },
    metal:      { co2: 0.50, water: 1.0,  trees: 0,     energy: 0.9 },
    organic:    { co2: 0.12, water: 0.3,  trees: 0,     energy: 0.1 },
    electronic: { co2: 1.20, water: 5.0,  trees: 0,     energy: 1.5 },
    hazardous:  { co2: 0.40, water: 10.0, trees: 0,     energy: 0.4 }
  };

  /* === SISTEMA DE NIVELES === */
  const XP_PER_SCAN = 10;
  const XP_PER_SAVE = 5;
  const XP_PER_STREAK_DAY = 15;

  const LEVELS = [
    { level: 1,  title: 'Aprendiz verde',     min: 0    },
    { level: 2,  title: 'Reciclador novato',  min: 50   },
    { level: 3,  title: 'Eco-explorador',     min: 130  },
    { level: 4,  title: 'Guardián del barrio', min: 260 },
    { level: 5,  title: 'Defensor ambiental', min: 450  },
    { level: 6,  title: 'Eco-experto',        min: 720  },
    { level: 7,  title: 'Maestro del reciclaje', min: 1100 },
    { level: 8,  title: 'Héroe del planeta',  min: 1600 },
    { level: 9,  title: 'Leyenda EcoScan',    min: 2300 },
    { level: 10, title: 'Embajador del planeta', min: 3200 }
  ];

  /* === LOGROS === */
  const ACHIEVEMENTS = [
    { id: 'first_scan',  icon: '🌱', name: 'Eco Novato',         desc: 'Tu primer escaneo',            check: (s) => s.scanned >= 1 },
    { id: 'scan_10',     icon: '🔍', name: 'Explorador',         desc: '10 residuos escaneados',       check: (s) => s.scanned >= 10 },
    { id: 'scan_25',     icon: '🧭', name: 'Investigador',       desc: '25 residuos escaneados',       check: (s) => s.scanned >= 25 },
    { id: 'scan_50',     icon: '♻️', name: 'Reciclador serio',   desc: '50 residuos escaneados',       check: (s) => s.scanned >= 50 },
    { id: 'scan_100',    icon: '🏆', name: 'Centenario',         desc: '100 residuos escaneados',      check: (s) => s.scanned >= 100 },
    { id: 'scan_250',    icon: '🌟', name: 'Protector del Planeta', desc: '250 residuos escaneados',  check: (s) => s.scanned >= 250 },
    { id: 'streak_3',    icon: '🔥', name: 'En racha',           desc: '3 días consecutivos',          check: (s) => s.bestStreak >= 3 },
    { id: 'streak_7',    icon: '⚡', name: 'Semana perfecta',    desc: '7 días consecutivos',          check: (s) => s.bestStreak >= 7 },
    { id: 'streak_30',   icon: '👑', name: 'Imparable',          desc: '30 días consecutivos',         check: (s) => s.bestStreak >= 30 },
    { id: 'types_4',     icon: '🧩', name: 'Aprendiz versátil',  desc: 'Escanea 4 materiales distintos', check: (s) => Object.keys(s.byMaterial || {}).length >= 4 },
    { id: 'all_types',   icon: '🌈', name: 'Coleccionista',      desc: 'Escanea los 8 materiales',     check: (s) => Object.keys(s.byMaterial || {}).length >= 8 },
    { id: 'saved_5',     icon: '📚', name: 'Archivista',         desc: 'Guarda 5 resultados',          check: (s) => (s.savedCount || 0) >= 5 },
    { id: 'co2_1',       icon: '🌍', name: 'Aire limpio',        desc: 'Evita 1 kg de CO₂',            check: (s) => s.co2 >= 1 },
    { id: 'co2_10',      icon: '🌳', name: 'Pulmón verde',       desc: 'Evita 10 kg de CO₂',           check: (s) => s.co2 >= 10 },
    { id: 'water_100',   icon: '💧', name: 'Guardián del agua',  desc: 'Ahorra 100 litros de agua',    check: (s) => (s.water || 0) >= 100 },
    { id: 'energy_20',   icon: '⚡', name: 'Eficiencia total',   desc: 'Ahorra 20 kWh de energía',     check: (s) => (s.energy || 0) >= 20 },
    { id: 'level_5',     icon: '⭐', name: 'Mitad del camino',   desc: 'Alcanza el nivel 5',           check: (s) => s.level >= 5 },
    { id: 'level_10',    icon: '💎', name: 'Élite EcoScan',      desc: 'Alcanza el nivel 10',          check: (s) => s.level >= 10 }
  ];

  /* === DESAFÍOS === */
  const CHALLENGE_POOL = {
    daily: [
      { id: 'd_scan_3',  icon: '🎯', title: 'Escanea 3 residuos hoy',        goal: 3,  metric: 'scansToday',     reward: 30 },
      { id: 'd_scan_5',  icon: '🎯', title: 'Escanea 5 residuos hoy',        goal: 5,  metric: 'scansToday',     reward: 50 },
      { id: 'd_types_2', icon: '🧩', title: 'Identifica 2 materiales distintos hoy', goal: 2, metric: 'typesToday', reward: 40 }
    ],
    weekly: [
      { id: 'w_scan_15', icon: '📅', title: 'Escanea 15 residuos esta semana', goal: 15, metric: 'scansWeek',  reward: 120 },
      { id: 'w_types_5', icon: '🌈', title: 'Identifica 5 materiales esta semana', goal: 5, metric: 'typesWeek', reward: 100 },
      { id: 'w_streak_5', icon: '🔥', title: 'Mantén una racha de 5 días',     goal: 5,  metric: 'bestStreak', reward: 150 }
    ]
  };

  /* === NIVELES === */
  function getLevelInfo(xp) {
    let current = LEVELS[0];
    for (const l of LEVELS) {
      if (xp >= l.min) current = l;
    }
    const next = LEVELS.find((l) => l.min > xp) || null;
    const floor = current.min;
    const ceil = next ? next.min : current.min;
    const span = ceil - floor || 1;
    const progress = next ? Math.min(100, Math.round(((xp - floor) / span) * 100)) : 100;
    return {
      level: current.level,
      title: current.title,
      xp,
      next,
      xpIntoLevel: xp - floor,
      xpForNext: next ? next.min - xp : 0,
      progress
    };
  }

  /* === IMPACTO === */
  function computeImpactDelta(materialId) {
    return IMPACT_PER_SCAN[materialId] || { co2: 0.1, water: 1, trees: 0, energy: 0.3 };
  }

  /* === XP === */
  function xpForScan()  { return XP_PER_SCAN; }
  function xpForSave()  { return XP_PER_SAVE; }
  function xpForStreak() { return XP_PER_STREAK_DAY; }

  /* === LOGROS: devuelve los recién desbloqueados === */
  function evaluateAchievements(snapshot, unlockedIds) {
    const unlocked = new Set(unlockedIds || []);
    const newly = [];
    for (const a of ACHIEVEMENTS) {
      if (!unlocked.has(a.id) && a.check(snapshot)) {
        newly.push(a);
      }
    }
    return newly;
  }

  function getAllAchievements() { return ACHIEVEMENTS; }

  /* === DESAFÍOS: selección determinista por fecha === */
  function _hashDate(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return h;
  }

  function getActiveChallenges() {
    const now = new Date();
    const dayKey = now.toDateString();
    const week = _getWeekKey(now);

    const daily = CHALLENGE_POOL.daily[_hashDate(dayKey) % CHALLENGE_POOL.daily.length];
    const weekly = CHALLENGE_POOL.weekly[_hashDate(week) % CHALLENGE_POOL.weekly.length];

    return [
      { ...daily, type: 'daily', period: dayKey },
      { ...weekly, type: 'weekly', period: week }
    ];
  }

  function _getWeekKey(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - dayNum + 3);
    const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
    const week = 1 + Math.round(((d - firstThursday) / 86400000 - 3) / 7);
    return `${d.getUTCFullYear()}-W${week}`;
  }

  /* === DESAFÍOS: progreso y evaluación de recompensas === */

  /* Valor actual de la métrica de un desafío a partir del snapshot de actividad. */
  function getChallengeValue(challenge, snapshot) {
    const v = (snapshot || {})[challenge.metric];
    return typeof v === 'number' ? v : 0;
  }

  /* Progreso 0..100 y estado de completado de un desafío. */
  function getChallengeProgress(challenge, snapshot) {
    const value = getChallengeValue(challenge, snapshot);
    const goal = challenge.goal || 1;
    const ratio = Math.min(1, value / goal);
    return {
      value: Math.min(value, goal),
      goal,
      percent: Math.round(ratio * 100),
      completed: value >= goal
    };
  }

  /* Devuelve los desafíos recién completados (no reclamados aún).
     Cada uno incluye su `key` única por periodo para evitar dobles recompensas. */
  function evaluateChallenges(challenges, snapshot, claimedKeys) {
    const claimed = new Set(claimedKeys || []);
    const newlyCompleted = [];
    for (const ch of (challenges || [])) {
      const key = `${ch.id}_${ch.period}`;
      const value = getChallengeValue(ch, snapshot);
      if (value >= (ch.goal || 1) && !claimed.has(key)) {
        newlyCompleted.push({ ...ch, key });
      }
    }
    return newlyCompleted;
  }

  function formatImpact(value, unit) {
    if (unit === 'co2' || unit === 'energy') {
      return value >= 1 ? `${value.toFixed(1)}` : value.toFixed(2);
    }
    if (unit === 'water') {
      return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : Math.round(value).toString();
    }
    if (unit === 'trees') {
      return value < 1 ? value.toFixed(2) : value.toFixed(1);
    }
    return String(value);
  }

  return {
    XP_PER_SCAN, XP_PER_SAVE, XP_PER_STREAK_DAY,
    getLevelInfo, computeImpactDelta,
    xpForScan, xpForSave, xpForStreak,
    evaluateAchievements, getAllAchievements,
    getActiveChallenges, formatImpact,
    getChallengeValue, getChallengeProgress, evaluateChallenges,
    LEVELS
  };
})();
