'use strict';

(function EcoScanApp() {

  let currentMaterial = null;
  let cancelAnalysis  = null;

  function init() {
    UI.init();
    bindEvents();
    startSplash();
  }

  function startSplash() {
    UI.showScreen('splash');
    setTimeout(() => {
      UI.showScreen('home');
      UI.updateStats();
    }, 2600);
  }

  function bindEvents() {
    on('btn-scan',       'click', () => goToScan());
    on('btn-back-scan',  'click', () => leaveScanner());
    on('btn-back-result','click', () => { UI.showScreen('home', { back: true }); UI.updateStats(); });
    on('btn-scan-again', 'click', () => goToScan());
    on('btn-save-result','click', () => saveCurrentResult());
    on('btn-capture',    'click', () => captureAndAnalyze());
    on('btn-gallery',    'click', () => document.getElementById('gallery-input')?.click());
    on('btn-flip',       'click', () => flipCamera());
    on('btn-torch',      'click', () => handleTorch());
    on('btn-retry-camera','click', () => initCamera());
    on('btn-go-scan',    'click', () => goToScan());
    on('btn-clear-history','click', () => confirmClearHistory());
    on('btn-share',      'click', () => shareResult());
    on('btn-stats',      'click', () => UI.showScreen('history'));

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
        UI.showScreen(screen);
      });
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') Scanner.stopCamera();
    });
  }

  function on(id, event, handler) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, handler);
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
    Storage.incrementStats(result.material.id);
    Storage.updateStreak();
    UI.showResult(result.material, result.confidence);
  }

  function saveCurrentResult() {
    if (!currentMaterial) return;
    const stats = Storage.getStats();
    Storage.addToHistory({
      materialId:   currentMaterial.id,
      materialName: currentMaterial.name,
      binName:      currentMaterial.bin.name,
      icon:         currentMaterial.icon,
      bgColor:      currentMaterial.bgColor,
      confidence:   90
    });
    UI.showToast('Guardado en tu historial.', 'success');
  }

  function confirmClearHistory() {
    if (!confirm('¿Estás seguro de que quieres borrar todo tu historial y estadísticas?')) return;
    Storage.clearHistory();
    UI.renderHistory();
    UI.updateStats();
    UI.showToast('Historial eliminado.', 'info');
  }

  async function shareResult() {
    if (!currentMaterial) return;
    const text = `Identifiqué un residuo con EcoScan: ${currentMaterial.name}. Va en el ${currentMaterial.bin.name}. ¡Recicla correctamente! ♻️`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'EcoScan', text, url: window.location.href });
      } catch { }
    } else if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        UI.showToast('Resultado copiado al portapapeles.', 'success');
      } catch {
        UI.showToast('No se pudo compartir en este navegador.', 'error');
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
