'use strict';

(function EcoScanApp() {

  let currentMaterial = null;
  let currentConfidence = 0;
  let currentSource = 'demo';
  let lastGainedXP = 0;
  let cancelAnalysis  = null;
  let savedThisResult = false;
  let deferredInstallPrompt = null;

  function init() {
    UI.init();
    bindEvents();
    registerServiceWorker();
    setupInstallPrompt();
    setupOfflineIndicator();
    startSplash();
  }

  function startSplash() {
    UI.showScreen('splash');
    setTimeout(() => {
      UI.showScreen('home');
      UI.updateStats();
    }, 2400);
  }

  function bindEvents() {
    on('btn-scan',        'click', () => goToScan());
    on('btn-back-scan',   'click', () => leaveScanner());
    on('btn-back-result', 'click', () => { UI.showScreen('home', { back: true }); UI.updateStats(); });
    on('btn-scan-again',  'click', () => goToScan());
    on('btn-save-result', 'click', () => saveCurrentResult());
    on('btn-capture',     'click', () => captureAndAnalyze());
    on('btn-gallery',     'click', () => document.getElementById('gallery-input')?.click());
    on('btn-flip',        'click', () => flipCamera());
    on('btn-torch',       'click', () => handleTorch());
    on('btn-retry-camera','click', () => initCamera());
    on('btn-go-scan',     'click', () => goToScan());
    on('btn-clear-history','click', () => confirmClearHistory());
    on('btn-share',       'click', () => shareResult());
    on('btn-stats',       'click', () => goToDashboard());
    on('btn-share-impact','click', () => shareImpact());
    on('level-widget',    'click', () => goToDashboard());
    on('btn-all-challenges', 'click', () => goToDashboard());
    on('btn-celebration-close', 'click', () => UI.hideCelebration());
    on('celebration-backdrop',  'click', () => UI.hideCelebration());
    on('btn-install',         'click', () => triggerInstall());
    on('btn-install-dismiss', 'click', () => dismissInstall());

    const galleryInput = document.getElementById('gallery-input');
    if (galleryInput) {
      galleryInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) analyzeFile(file);
        e.target.value = '';
      });
    }

    document.querySelectorAll('.nav-item[data-screen]').forEach(btn => {
      btn.addEventListener('click', () => {
        const screen = btn.dataset.screen;
        if (screen === 'scan') { goToScan(); return; }
        if (screen === 'history') UI.renderHistory();
        if (screen === 'dashboard') { goToDashboard(); return; }
        UI.showScreen(screen);
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') UI.hideCelebration();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') Scanner.stopCamera();
    });
  }

  function on(id, event, handler) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, handler);
  }

  function goToDashboard() {
    UI.showScreen('dashboard');
    UI.renderDashboard();
  }

  async function goToScan() {
    UI.showScreen('scan');
    await initCamera();
  }

  async function initCamera() {
    if (!Scanner.hasCamera()) {
      UI.showCameraError(true);
      return;
    }
    const videoEl = document.getElementById('camera-feed');
    const result  = await Scanner.startCamera(videoEl);
    if (!result.ok) {
      UI.showCameraError(true);
      const msgs = {
        permission: 'Sin acceso a la cámara. Permite el permiso en tu navegador y recarga.',
        no_camera:  'No se encontró cámara disponible en este dispositivo.',
        unknown:    'No se pudo iniciar la cámara. Usa la galería para subir una imagen.'
      };
      UI.showToast(msgs[result.reason] || msgs.unknown, 'error', 5000);
    } else {
      UI.showCameraError(false);
    }
  }

  function leaveScanner() {
    if (cancelAnalysis) { cancelAnalysis(); cancelAnalysis = null; }
    Scanner.stopCamera();
    UI.showProcessing(false);
    UI.showScreen('home', { back: true });
    UI.updateStats();
  }

  async function flipCamera() {
    const videoEl = document.getElementById('camera-feed');
    await Scanner.flipCamera(videoEl);
  }

  async function handleTorch() {
    const btn    = document.getElementById('btn-torch');
    const active = await Scanner.toggleTorch();
    if (btn) {
      btn.setAttribute('aria-pressed', String(active));
      btn.title = active ? 'Desactivar linterna' : 'Activar linterna';
    }
    if (!active && btn && btn.getAttribute('aria-pressed') === 'false') {
      // sin capacidad de torch en muchos equipos; no molestar al usuario
    }
  }

  function captureAndAnalyze() {
    const videoEl  = document.getElementById('camera-feed');
    const canvasEl = document.getElementById('camera-canvas');
    if (!videoEl || !canvasEl) return;

    const imageData = Scanner.captureFrame(videoEl, canvasEl);
    if (!imageData) {
      UI.showToast('No se pudo capturar imagen. Asegúrate de que la cámara esté activa.', 'error');
      return;
    }

    UI.showProcessing(true);
    cancelAnalysis = Scanner.analyzeImage(imageData, handleAnalysisResult);
  }

  function analyzeFile(file) {
    UI.showProcessing(true);
    cancelAnalysis = null;
    Scanner.analyzeFile(file, (result) => {
      if (!result.ok) {
        UI.showProcessing(false);
        const msgs = {
          not_image: 'El archivo seleccionado no es una imagen válida.',
          too_large: 'La imagen es demasiado grande. Usa una imagen menor a 10 MB.',
          read_error: 'No se pudo leer el archivo.'
        };
        UI.showToast(msgs[result.reason] || 'Error al procesar la imagen.', 'error');
        return;
      }
      handleAnalysisResult(result);
    });
  }

  function handleAnalysisResult(result) {
    cancelAnalysis = null;
    UI.showProcessing(false);
    Scanner.stopCamera();

    if (!result.ok || !result.material) {
      UI.showToast('No se pudo identificar el material. Intenta de nuevo.', 'error');
      return;
    }

    currentMaterial = result.material;
    currentConfidence = result.confidence;
    currentSource = result.source || 'demo';
    savedThisResult = false;

    /* === Persistencia base === */
    Storage.incrementStats(result.material.id);
    const prevStreak = Storage.getStreak();
    const newStreak  = Storage.updateStreak();
    Storage.recordActivity(result.material.id);

    /* === Impacto ambiental === */
    Storage.addImpact(Gamification.computeImpactDelta(result.material.id));

    /* === XP === */
    let gained = Gamification.xpForScan();
    if (newStreak > prevStreak) gained += Gamification.xpForStreak();
    lastGainedXP = gained;

    const prevLevel = Gamification.getLevelInfo(Storage.getProgress().xp || 0).level;
    const newXP = Storage.addXP(gained);
    const newLevelInfo = Gamification.getLevelInfo(newXP);
    Storage.setLevel(newLevelInfo.level);

    /* === Logros === */
    const snapshot = buildSnapshot(newLevelInfo.level);
    const newlyUnlocked = Gamification.evaluateAchievements(snapshot, Storage.getUnlockedAchievements());
    if (newlyUnlocked.length) {
      Storage.unlockAchievements(newlyUnlocked.map(a => a.id));
    }

    /* === Desafíos: detecta completados y otorga su recompensa === */
    const challengeSnapshot = buildChallengeSnapshot();
    const challenges = Gamification.getActiveChallenges();
    const completedChallenges = Gamification.evaluateChallenges(
      challenges, challengeSnapshot, Storage.getClaimedChallenges()
    );
    if (completedChallenges.length) {
      const rewardXP = completedChallenges.reduce((sum, c) => sum + (c.reward || 0), 0);
      Storage.addXP(rewardXP);
      Storage.claimChallenges(completedChallenges.map(c => c.key));
      gained += rewardXP;
      lastGainedXP = gained;
    }

    /* Recalcula nivel tras sumar recompensas de desafíos. */
    const finalXP = Storage.getProgress().xp || 0;
    const finalLevelInfo = Gamification.getLevelInfo(finalXP);
    Storage.setLevel(finalLevelInfo.level);

    UI.showResult(result.material, result.confidence, gained);

    /* === Celebraciones encadenadas === */
    const leveledUp = finalLevelInfo.level > prevLevel;
    setTimeout(() => {
      if (leveledUp) {
        UI.showCelebration({
          icon: '🚀',
          eyebrow: '¡Subiste de nivel!',
          title: `Nivel ${finalLevelInfo.level}`,
          desc: finalLevelInfo.title
        });
      } else if (completedChallenges.length) {
        const c = completedChallenges[0];
        UI.showCelebration({
          icon: c.icon || '🎯',
          eyebrow: '¡Desafío completado!',
          title: c.title,
          desc: `+${c.reward} XP de recompensa`
        });
      } else if (newlyUnlocked.length) {
        const a = newlyUnlocked[0];
        UI.showCelebration({
          icon: a.icon,
          eyebrow: '¡Logro desbloqueado!',
          title: a.name,
          desc: a.desc
        });
      } else {
        UI.fireConfetti();
      }
    }, 900);
  }

  function buildSnapshot(level) {
    const stats = Storage.getStats();
    const impact = Storage.getImpact();
    return {
      scanned: stats.scanned,
      recycled: stats.recycled,
      byMaterial: stats.byMaterial || {},
      bestStreak: Storage.getBestStreak(),
      co2: impact.co2,
      water: impact.water,
      trees: impact.trees,
      energy: impact.energy,
      savedCount: Storage.getHistory().length,
      level
    };
  }

  /* Snapshot para desafíos: actividad diaria/semanal + mejor racha. */
  function buildChallengeSnapshot() {
    const activity = Storage.getActivitySnapshot();
    return {
      ...activity,
      bestStreak: Storage.getBestStreak()
    };
  }

  function saveCurrentResult() {
    if (!currentMaterial) return;
    if (savedThisResult) {
      UI.showToast('Este resultado ya está en tu historial.', 'info');
      return;
    }
    Storage.addToHistory({
      materialId:   currentMaterial.id,
      materialName: currentMaterial.name,
      binName:      currentMaterial.bin.name,
      icon:         currentMaterial.icon,
      bgColor:      currentMaterial.bgColor,
      confidence:   currentConfidence,
      recyclable:   currentMaterial.id !== 'hazardous',
      co2Saved:     Gamification.computeImpactDelta(currentMaterial.id).co2,
      source:       currentSource
    });
    Storage.addXP(Gamification.xpForSave());
    savedThisResult = true;
    UI.showToast('Guardado en tu historial. +5 XP', 'success');

    /* Re-evalúa logros que dependen de guardados (p. ej. Archivista). */
    const levelNow = Gamification.getLevelInfo(Storage.getProgress().xp || 0).level;
    const snapshot = buildSnapshot(levelNow);
    const newly = Gamification.evaluateAchievements(snapshot, Storage.getUnlockedAchievements());
    if (newly.length) {
      Storage.unlockAchievements(newly.map(a => a.id));
      const a = newly[0];
      setTimeout(() => UI.showCelebration({
        icon: a.icon, eyebrow: '¡Logro desbloqueado!', title: a.name, desc: a.desc
      }), 400);
    }
  }

  function confirmClearHistory() {
    if (!confirm('¿Borrar tu historial y estadísticas? Tus logros, nivel e impacto se conservarán.')) return;
    Storage.clearHistory();
    UI.renderHistory();
    UI.updateStats();
    UI.showToast('Historial eliminado.', 'info');
  }

  async function shareResult() {
    if (!currentMaterial) return;
    const text = `Identifiqué un residuo con EcoScan: ${currentMaterial.name}. Va en el ${currentMaterial.bin.name}. ¡Recicla correctamente! ♻️`;
    await shareText(text);
  }

  async function shareImpact() {
    const impact = Storage.getImpact();
    const info = Gamification.getLevelInfo(Storage.getProgress().xp || 0);
    const text = `Con EcoScan soy nivel ${info.level} (${info.title}) y ya evité ${impact.co2.toFixed(1)} kg de CO₂ reciclando. ♻️🌍 ¡Únete!`;
    await shareText(text);
  }

  async function shareText(text) {
    if (navigator.share) {
      try { await navigator.share({ title: 'EcoScan', text, url: window.location.href }); } catch { }
    } else if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        UI.showToast('Copiado al portapapeles.', 'success');
      } catch {
        UI.showToast('No se pudo compartir en este navegador.', 'error');
      }
    }
  }

  /* === PWA: Service Worker === */
  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => { /* silencioso */ });
    });
  }

  /* === PWA: Install prompt === */
  function setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      if (sessionStorage.getItem('ecoscan_install_dismissed') === '1') return;
      const banner = document.getElementById('install-banner');
      if (banner) {
        setTimeout(() => {
          banner.hidden = false;
          requestAnimationFrame(() => banner.classList.add('show'));
        }, 4000);
      }
    });
    window.addEventListener('appinstalled', () => {
      dismissInstall();
      UI.showToast('¡EcoScan instalada! 🌿', 'success');
    });
  }

  async function triggerInstall() {
    if (!deferredInstallPrompt) { dismissInstall(); return; }
    deferredInstallPrompt.prompt();
    try { await deferredInstallPrompt.userChoice; } catch { }
    deferredInstallPrompt = null;
    dismissInstall();
  }

  function dismissInstall() {
    const banner = document.getElementById('install-banner');
    if (!banner) return;
    banner.classList.remove('show');
    sessionStorage.setItem('ecoscan_install_dismissed', '1');
    setTimeout(() => { banner.hidden = true; }, 280);
  }

  /* === PWA: Offline indicator === */
  function setupOfflineIndicator() {
    const indicator = document.getElementById('offline-indicator');
    const update = () => {
      if (!indicator) return;
      if (navigator.onLine) {
        indicator.classList.remove('show');
        setTimeout(() => { indicator.hidden = true; }, 280);
      } else {
        indicator.hidden = false;
        requestAnimationFrame(() => indicator.classList.add('show'));
      }
    };
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    if (!navigator.onLine) update();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
