'use strict';

/* =========================================================
   ECOSCAN — SCANNER ENGINE
   Capa de abstracción para el análisis de imágenes.

   Permite cambiar el "cerebro" del escaneo sin tocar la UI:
     - demo      → heurística local (sin red, activo por defecto)
     - gemini    → Google Gemini Vision (requiere endpoint /api/analyze)
     - roboflow  → modelo de visión Roboflow (requiere endpoint)
     - tfjs      → modelo TensorFlow.js en el dispositivo

   Todos los proveedores devuelven la MISMA forma de resultado:
     { ok:true, materialId, confidence, source }  |  { ok:false, reason }

   Para activar IA real más adelante, basta con:
     1. Implementar el endpoint correspondiente.
     2. Llamar ScannerEngine.setMode('gemini').
   ========================================================= */

const ScannerEngine = (() => {

  const VALID_MATERIALS = [
    'plastic', 'glass', 'paper', 'cardboard',
    'metal', 'organic', 'electronic', 'hazardous'
  ];

  const config = {
    mode: 'demo',            // demo | gemini | roboflow | tfjs
    endpoint: '/api/analyze', // usado por proveedores remotos
    minLatencyMs: 1400,      // mínimo para que la UI "respire"
    fallbackToDemo: true     // si la IA real falla, usa demo
  };

  /* ---------- Utilidades de imagen ---------- */

  /* Carga un dataURL en un <img> y devuelve una promesa. */
  function _loadImage(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  /* Extrae características de color/brillo de una imagen (muestreo). */
  async function _extractFeatures(dataUrl) {
    try {
      const img = await _loadImage(dataUrl);
      const size = 48;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, size, size);
      const { data } = ctx.getImageData(0, 0, size, size);

      let r = 0, g = 0, b = 0, n = 0;
      let lumaSum = 0, lumaSqSum = 0;
      for (let i = 0; i < data.length; i += 4) {
        const pr = data[i], pg = data[i + 1], pb = data[i + 2];
        r += pr; g += pg; b += pb; n++;
        const luma = 0.299 * pr + 0.587 * pg + 0.114 * pb;
        lumaSum += luma;
        lumaSqSum += luma * luma;
      }
      r /= n; g /= n; b /= n;
      const meanLuma = lumaSum / n;
      const variance = Math.max(0, lumaSqSum / n - meanLuma * meanLuma);
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const saturation = max === 0 ? 0 : (max - min) / max;

      return {
        r, g, b,
        brightness: meanLuma / 255,      // 0..1
        contrast: Math.sqrt(variance) / 128, // ~0..1
        saturation,                       // 0..1
        warmth: (r - b) / 255             // -1..1
      };
    } catch {
      return null;
    }
  }

  /* ---------- Proveedor DEMO (heurística local) ---------- */

  /* Asigna pesos a cada material según las características visuales.
     No es un clasificador real: es una simulación coherente y educativa
     que reacciona a la imagen para sentirse "viva". */
  function _demoClassify(features) {
    if (!features) return _weightedPick(_uniformWeights());

    const { brightness, saturation, warmth, contrast } = features;
    const w = {
      plastic: 1, glass: 1, paper: 1, cardboard: 1,
      metal: 1, organic: 1, electronic: 1, hazardous: 1
    };

    // Tonos cálidos/marrones → cartón / orgánico
    if (warmth > 0.08) { w.cardboard += 1.6; w.organic += 1.1; w.paper += 0.6; }
    // Verdes saturados → orgánico / vidrio
    if (features.g > features.r && features.g > features.b) { w.organic += 1.4; w.glass += 0.9; }
    // Muy brillante y poco saturado → papel / plástico claro
    if (brightness > 0.62 && saturation < 0.25) { w.paper += 1.5; w.plastic += 0.8; }
    // Oscuro con alto contraste → electrónico / peligroso
    if (brightness < 0.4 && contrast > 0.35) { w.electronic += 1.5; w.hazardous += 1.0; }
    // Gris metálico (baja saturación, brillo medio) → metal
    if (saturation < 0.2 && brightness >= 0.4 && brightness <= 0.62) { w.metal += 1.6; }
    // Azulado → plástico
    if (features.b > features.r && features.b > features.g) { w.plastic += 1.4; }
    // Alta saturación general → plástico / peligroso (colores vivos)
    if (saturation > 0.45) { w.plastic += 0.8; w.hazardous += 0.6; }

    return _weightedPick(w);
  }

  function _uniformWeights() {
    const w = {};
    VALID_MATERIALS.forEach(m => { w[m] = 1; });
    return w;
  }

  function _weightedPick(weights) {
    const entries = Object.entries(weights);
    const total = entries.reduce((s, [, v]) => s + v, 0);
    let roll = Math.random() * total;
    for (const [mat, v] of entries) {
      roll -= v;
      if (roll <= 0) return mat;
    }
    return entries[0][0];
  }

  /* Confianza simulada: base alta + ruido, ligada al peso ganador. */
  function _demoConfidence(features) {
    const base = 80;
    const clarity = features ? (features.contrast * 12 + features.saturation * 6) : 6;
    const noise = Math.random() * 8;
    return Math.max(72, Math.min(98, Math.round(base + clarity + noise)));
  }

  async function _runDemo(dataUrl) {
    const features = await _extractFeatures(dataUrl);
    const materialId = _demoClassify(features);
    const confidence = _demoConfidence(features);
    return { ok: true, materialId, confidence, source: 'demo' };
  }

  /* ---------- Proveedores remotos (preparados) ---------- */

  async function _runRemote(dataUrl, provider) {
    try {
      const res = await fetch(config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, image: dataUrl })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const materialId = String(json.materialId || json.material || '').toLowerCase();
      if (!VALID_MATERIALS.includes(materialId)) throw new Error('material inválido');
      const confidence = Math.max(0, Math.min(100, Math.round(json.confidence ?? 85)));
      return { ok: true, materialId, confidence, source: provider };
    } catch (err) {
      if (config.fallbackToDemo) {
        const demo = await _runDemo(dataUrl);
        return { ...demo, source: `${provider}_fallback` };
      }
      return { ok: false, reason: 'engine_error', message: err.message };
    }
  }

  /* ---------- API pública ---------- */

  /* Garantiza una latencia mínima para una UX consistente. */
  async function analyze(dataUrl) {
    const started = Date.now();
    let result;

    switch (config.mode) {
      case 'gemini':
      case 'roboflow':
        result = await _runRemote(dataUrl, config.mode);
        break;
      case 'tfjs':
        // Reservado para un modelo on-device; por ahora usa demo.
        result = await _runDemo(dataUrl);
        result.source = 'tfjs_pending';
        break;
      case 'demo':
      default:
        result = await _runDemo(dataUrl);
    }

    const elapsed = Date.now() - started;
    if (elapsed < config.minLatencyMs) {
      await new Promise(r => setTimeout(r, config.minLatencyMs - elapsed));
    }
    return result;
  }

  function setMode(mode) {
    if (['demo', 'gemini', 'roboflow', 'tfjs'].includes(mode)) {
      config.mode = mode;
    }
    return config.mode;
  }

  function getMode() { return config.mode; }
  function configure(opts) { Object.assign(config, opts || {}); }

  return { analyze, setMode, getMode, configure, VALID_MATERIALS };
})();
