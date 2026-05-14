'use strict';

const Scanner = (() => {
  let stream = null;
  let facingMode = 'environment';
  let torchActive = false;
  let analysisTimeout = null;

  const ANALYSIS_DELAY_MS = 2200;

  async function startCamera(videoEl) {
    await stopCamera();
    const constraints = {
      video: {
        facingMode: { ideal: facingMode },
        width:  { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    };

    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      videoEl.srcObject = stream;
      await new Promise((res, rej) => {
        videoEl.onloadedmetadata = res;
        videoEl.onerror = rej;
      });
      await videoEl.play();
      return { ok: true };
    } catch (err) {
      const code = err.name;
      if (code === 'NotAllowedError' || code === 'PermissionDeniedError') {
        return { ok: false, reason: 'permission' };
      }
      if (code === 'NotFoundError' || code === 'DevicesNotFoundError') {
        return { ok: false, reason: 'no_camera' };
      }
      return { ok: false, reason: 'unknown', message: err.message };
    }
  }

  async function stopCamera() {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
    torchActive = false;
  }

  async function flipCamera(videoEl) {
    facingMode = facingMode === 'environment' ? 'user' : 'environment';
    return startCamera(videoEl);
  }

  async function toggleTorch() {
    if (!stream) return false;
    const track = stream.getVideoTracks()[0];
    if (!track) return false;
    const caps = track.getCapabilities ? track.getCapabilities() : {};
    if (!caps.torch) return false;
    try {
      torchActive = !torchActive;
      await track.applyConstraints({ advanced: [{ torch: torchActive }] });
      return torchActive;
    } catch { return false; }
  }

  function captureFrame(videoEl, canvasEl) {
    if (!videoEl || videoEl.readyState < 2) return null;
    const w = videoEl.videoWidth  || 640;
    const h = videoEl.videoHeight || 480;
    canvasEl.width  = w;
    canvasEl.height = h;
    const ctx = canvasEl.getContext('2d');
    ctx.drawImage(videoEl, 0, 0, w, h);
    return canvasEl.toDataURL('image/jpeg', 0.85);
  }

  function analyzeImage(_imageDataUrl, callback) {
    clearTimeout(analysisTimeout);
    analysisTimeout = setTimeout(() => {
      const scenario = getRandomScenario();
      const material = getMaterialById(scenario.material);
      callback({ ok: true, material, confidence: scenario.confidence });
    }, ANALYSIS_DELAY_MS);
    return () => clearTimeout(analysisTimeout);
  }

  function analyzeFile(file, callback) {
    if (!file || !file.type.startsWith('image/')) {
      callback({ ok: false, reason: 'not_image' });
      return;
    }
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      callback({ ok: false, reason: 'too_large' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => analyzeImage(e.target.result, callback);
    reader.onerror = () => callback({ ok: false, reason: 'read_error' });
    reader.readAsDataURL(file);
  }

  function hasCamera() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  return { startCamera, stopCamera, flipCamera, toggleTorch, captureFrame, analyzeImage, analyzeFile, hasCamera };
})();
