'use strict';

const UI = (() => {
  let currentScreen = null;
  const screens = {};
  let toastTimer = null;

  function init() {
    document.querySelectorAll('.screen').forEach(el => {
      screens[el.id.replace('screen-', '')] = el;
    });
  }

  function showScreen(name, { back = false } = {}) {
    const next = screens[name];
    if (!next || next === currentScreen) return;

    if (currentScreen) {
      currentScreen.classList.remove('active');
      if (back) currentScreen.classList.add('slide-out');
      const prev = currentScreen;
      setTimeout(() => prev.classList.remove('slide-out'), 300);
    }

    next.classList.add('active');
    next.scrollTop = 0;
    currentScreen = next;

    document.querySelectorAll('.nav-item').forEach(btn => {
      const screen = btn.dataset.screen;
      const isCurrent = screen === name;
      btn.classList.toggle('active', isCurrent);
      btn.setAttribute('aria-current', isCurrent ? 'page' : 'false');
    });
  }

  function showResult(material, confidence) {
    const pct = Math.min(100, Math.max(0, Math.round(confidence)));

    setText('result-type-name', material.name);
    setHTML('result-icon', material.icon);

    const iconWrap = document.getElementById('result-icon-wrap');
    if (iconWrap) {
      iconWrap.style.background = `${material.color}30`;
    }

    const header = document.getElementById('result-header');
    const hero   = document.getElementById('result-hero');
    if (header) header.style.background = material.color;
    if (hero)   hero.style.background   = material.color;

    const fill = document.getElementById('conf-fill');
    const pctEl = document.getElementById('conf-pct');
    if (fill) { fill.style.width = '0%'; setTimeout(() => { fill.style.width = pct + '%'; }, 50); }
    if (pctEl) pctEl.textContent = pct + '%';

    const binIcon    = document.getElementById('bin-icon');
    const binColor   = document.getElementById('bin-color-name');
    const binDescEl  = document.getElementById('bin-desc');
    if (binIcon)  binIcon.textContent  = material.bin.icon;
    if (binColor) binColor.textContent = material.bin.name;
    if (binDescEl) binDescEl.textContent = material.bin.description;

    const stepsList = document.getElementById('steps-list');
    if (stepsList) {
      stepsList.innerHTML = material.steps.map((step, i) =>
        `<li><span class="step-num" aria-hidden="true">${i + 1}</span><span>${escapeHTML(step)}</span></li>`
      ).join('');
    }

    const impactEl = document.getElementById('impact-text');
    if (impactEl) impactEl.textContent = material.impact;

    showScreen('result');
  }

  function updateStats() {
    const stats  = Storage.getStats();
    const streak = Storage.getStreak();
    animateCount('stat-scanned', stats.scanned);
    animateCount('stat-recycled', stats.recycled);
    animateCount('stat-streak', streak);
  }

  function animateCount(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    const current = parseInt(el.textContent, 10) || 0;
    if (current === target) return;
    const diff  = target - current;
    const steps = Math.min(Math.abs(diff), 20);
    const step  = diff / steps;
    let count = current;
    let i = 0;
    const tick = () => {
      count += step;
      i++;
      el.textContent = Math.round(i < steps ? count : target);
      if (i < steps) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function renderHistory() {
    const history = Storage.getHistory();
    const listEl  = document.getElementById('history-list');
    const emptyEl = document.getElementById('history-empty');
    if (!listEl || !emptyEl) return;

    if (history.length === 0) {
      emptyEl.hidden = false;
      listEl.innerHTML = '';
      return;
    }

    emptyEl.hidden = true;
    listEl.innerHTML = history.map(item => {
      const date = new Date(item.timestamp);
      const dateStr = date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
      return `
        <li class="history-item" data-id="${escapeAttr(item.id)}">
          <div class="history-icon" style="background:${escapeAttr(item.bgColor || '#E8F5E9')}" aria-hidden="true">${item.icon || '♻️'}</div>
          <div class="history-info">
            <div class="history-type">${escapeHTML(item.materialName)}</div>
            <div class="history-date">${escapeHTML(dateStr)}</div>
          </div>
          <span class="history-bin" style="background:${escapeAttr(item.bgColor || '#E8F5E9')};color:#263238">${escapeHTML(item.binName || '—')}</span>
        </li>`;
    }).join('');
  }

  function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-8px)';
      toast.style.transition = 'opacity .2s, transform .2s';
      setTimeout(() => toast.remove(), 200);
    }, duration);
  }

  function showCameraError(show) {
    const errEl  = document.getElementById('camera-error');
    const feedEl = document.getElementById('camera-feed');
    const ctrl   = document.querySelector('.scan-controls');
    if (!errEl) return;
    errEl.hidden = !show;
    if (feedEl) feedEl.style.visibility = show ? 'hidden' : 'visible';
    if (ctrl)   ctrl.style.display = show ? 'none' : 'flex';
  }

  function showProcessing(show) {
    const el = document.getElementById('scan-processing');
    if (el) el.hidden = !show;
    const hint = document.getElementById('scan-hint');
    if (hint) hint.style.visibility = show ? 'hidden' : 'visible';
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function setHTML(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  function escapeHTML(str) {
    const d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
  }

  function escapeAttr(str) {
    return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  return { init, showScreen, showResult, updateStats, renderHistory, showToast, showCameraError, showProcessing };
})();
