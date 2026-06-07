'use strict';

const UI = (() => {
  let currentScreen = null;
  const screens = {};

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
      setTimeout(() => prev.classList.remove('slide-out'), 320);
    }

    next.classList.add('active');
    next.scrollTop = 0;
    currentScreen = next;

    document.querySelectorAll('.nav-item[data-screen]').forEach(btn => {
      const screen = btn.dataset.screen;
      const isCurrent = screen === name;
      btn.classList.toggle('active', isCurrent);
      btn.setAttribute('aria-current', isCurrent ? 'page' : 'false');
    });
  }

  function getCurrentScreenName() {
    if (!currentScreen) return null;
    return currentScreen.id.replace('screen-', '');
  }

  /* === RESULTADO === */
  function showResult(material, confidence, gained) {
    const pct = Math.min(100, Math.max(0, Math.round(confidence)));

    setText('result-type-name', material.name);
    setHTML('result-icon', material.icon);

    const iconWrap = document.getElementById('result-icon-wrap');
    if (iconWrap) iconWrap.style.background = `${material.color}30`;

    const header = document.getElementById('result-header');
    const hero   = document.getElementById('result-hero');
    if (header) header.style.background = material.color;
    if (hero)   hero.style.background   = material.color;

    const fill  = document.getElementById('conf-fill');
    const pctEl = document.getElementById('conf-pct');
    if (fill) { fill.style.width = '0%'; setTimeout(() => { fill.style.width = pct + '%'; }, 120); }
    if (pctEl) {
      let v = 0;
      const step = Math.max(1, Math.round(pct / 24));
      const t = setInterval(() => {
        v = Math.min(pct, v + step);
        pctEl.textContent = v + '%';
        if (v >= pct) clearInterval(t);
      }, 28);
    }

    const binIcon   = document.getElementById('bin-icon');
    const binColor  = document.getElementById('bin-color-name');
    const binDescEl = document.getElementById('bin-desc');
    if (binIcon)  binIcon.textContent  = material.bin.icon;
    if (binColor) binColor.textContent = material.bin.name;
    if (binDescEl) binDescEl.textContent = material.bin.description;

    const stepsList = document.getElementById('steps-list');
    if (stepsList) {
      stepsList.innerHTML = material.steps.map((step, i) =>
        `<li style="animation-delay:${i * 70}ms"><span class="step-num" aria-hidden="true">${i + 1}</span><span>${escapeHTML(step)}</span></li>`
      ).join('');
    }

    const impactEl = document.getElementById('impact-text');
    if (impactEl) impactEl.textContent = material.impact;

    /* XP pop */
    const xpPop = document.getElementById('xp-pop');
    if (xpPop && gained) {
      xpPop.textContent = `+${gained} XP`;
      xpPop.classList.remove('show');
      void xpPop.offsetWidth;
      xpPop.classList.add('show');
    }

    showScreen('result');
  }

  /* === HOME === */
  function updateStats() {
    const stats  = Storage.getStats();
    const streak = Storage.getStreak();
    animateCount('stat-scanned', stats.scanned);
    animateCount('stat-recycled', stats.recycled);
    animateCount('stat-streak', streak);
    updateLevelWidget();
    renderHomeChallenge();
  }

  function updateLevelWidget() {
    const progress = Storage.getProgress();
    const info = Gamification.getLevelInfo(progress.xp || 0);
    setText('home-level-badge', info.level);
    setText('home-level-title', info.title);
    setText('home-level-xp', `${info.xp} XP`);
    const fill = document.getElementById('home-xp-fill');
    if (fill) fill.style.width = info.progress + '%';
    setText('home-level-next', info.next
      ? `${info.xpForNext} XP para ${info.next.title}`
      : '¡Nivel máximo alcanzado!');
  }

  function renderHomeChallenge() {
    const wrap = document.getElementById('home-daily-challenge');
    if (!wrap) return;
    const challenges = Gamification.getActiveChallenges();
    const daily = challenges.find(c => c.type === 'daily');
    if (!daily) return;
    const snap = Storage.getActivitySnapshot();
    const merged = { ...snap, bestStreak: Storage.getBestStreak() };
    wrap.innerHTML = challengeMarkup(daily, merged);
  }

  function animateCount(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    const current = parseInt(el.textContent, 10) || 0;
    if (current === target) { el.textContent = target; return; }
    const diff  = target - current;
    const steps = Math.min(Math.abs(diff), 24);
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

  /* === DASHBOARD === */
  function renderDashboard() {
    const progress = Storage.getProgress();
    const xp = progress.xp || 0;
    const info = Gamification.getLevelInfo(xp);

    setText('dash-level-num', info.level);
    setText('dash-level-title', info.title);
    setText('dash-level-xp', `${xp} XP`);
    setText('dash-level-next', info.next
      ? `${info.xpForNext} XP para alcanzar “${info.next.title}”`
      : 'Has alcanzado el nivel máximo. ¡Eres una leyenda!');

    const dashFill = document.getElementById('dash-xp-fill');
    if (dashFill) setTimeout(() => { dashFill.style.width = info.progress + '%'; }, 80);

    const ring = document.getElementById('level-ring-fill');
    if (ring) {
      const circumference = 213.6;
      const offset = circumference - (circumference * info.progress) / 100;
      setTimeout(() => { ring.style.strokeDashoffset = offset; }, 80);
    }

    renderImpact();
    renderChallenges();
    renderAchievements();
  }

  function renderImpact() {
    const impact = Storage.getImpact();
    animateImpact('impact-co2', impact.co2, 'co2');
    animateImpact('impact-water', impact.water, 'water');
    animateImpact('impact-trees', impact.trees, 'trees');
    animateImpact('impact-energy', impact.energy, 'energy');
  }

  function animateImpact(id, value, unit) {
    const el = document.getElementById(id);
    if (!el) return;
    let v = 0;
    const target = value || 0;
    const steps = 24;
    const inc = target / steps;
    let i = 0;
    const tick = () => {
      v += inc;
      i++;
      el.textContent = Gamification.formatImpact(i < steps ? v : target, unit);
      if (i < steps) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function challengeMarkup(ch, snap) {
    const value = snap[ch.metric] || 0;
    const done = value >= ch.goal;
    const pct = Math.min(100, Math.round((value / ch.goal) * 100));
    const periodLabel = ch.type === 'daily' ? 'Diario' : 'Semanal';
    return `
      <div class="challenge-row ${done ? 'done' : ''}" role="listitem">
        <div class="challenge-emoji" aria-hidden="true">${done ? '✅' : ch.icon}</div>
        <div class="challenge-body">
          <div class="challenge-top">
            <span class="challenge-title">${escapeHTML(ch.title)}</span>
            <span class="challenge-tag">${periodLabel}</span>
          </div>
          <div class="challenge-prog">
            <div class="challenge-bar" aria-hidden="true"><div class="challenge-bar-fill" style="width:${pct}%"></div></div>
            <span class="challenge-count">${Math.min(value, ch.goal)}/${ch.goal}</span>
          </div>
        </div>
        <span class="challenge-reward">+${ch.reward}<small>XP</small></span>
      </div>`;
  }

  function renderChallenges() {
    const listEl = document.getElementById('challenges-list');
    if (!listEl) return;
    const challenges = Gamification.getActiveChallenges();
    const snap = { ...Storage.getActivitySnapshot(), bestStreak: Storage.getBestStreak() };
    listEl.innerHTML = challenges.map(c => challengeMarkup(c, snap)).join('');
  }

  function renderAchievements() {
    const grid = document.getElementById('achievements-grid');
    if (!grid) return;
    const all = Gamification.getAllAchievements();
    const unlocked = new Set(Storage.getUnlockedAchievements());
    setText('achievements-count', `${unlocked.size} / ${all.length}`);
    grid.innerHTML = all.map(a => {
      const isUnlocked = unlocked.has(a.id);
      return `
        <div class="badge ${isUnlocked ? 'unlocked' : 'locked'}" role="listitem"
             tabindex="0" aria-label="${escapeAttr(a.name)}: ${escapeAttr(a.desc)}${isUnlocked ? ', desbloqueado' : ', bloqueado'}">
          <span class="badge-icon" aria-hidden="true">${isUnlocked ? a.icon : '🔒'}</span>
          <span class="badge-name">${escapeHTML(a.name)}</span>
          <span class="badge-desc">${escapeHTML(a.desc)}</span>
        </div>`;
    }).join('');
  }

  /* === HISTORIAL === */
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
    listEl.innerHTML = history.map((item, i) => {
      const date = new Date(item.timestamp);
      const dateStr = date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
      return `
        <li class="history-item" data-id="${escapeAttr(item.id)}" style="animation-delay:${Math.min(i, 8) * 45}ms">
          <div class="history-icon" style="background:${escapeAttr(item.bgColor || '#E8F5E9')}" aria-hidden="true">${item.icon || '♻️'}</div>
          <div class="history-info">
            <div class="history-type">${escapeHTML(item.materialName)}</div>
            <div class="history-date">${escapeHTML(dateStr)}</div>
          </div>
          <span class="history-bin" style="background:${escapeAttr(item.bgColor || '#E8F5E9')};color:#263238">${escapeHTML(item.binName || '—')}</span>
        </li>`;
    }).join('');
  }

  /* === CELEBRACIÓN === */
  function showCelebration({ icon, eyebrow, title, desc }) {
    const modal = document.getElementById('celebration-modal');
    if (!modal) return;
    setText('celebration-icon', icon || '🎉');
    setText('celebration-eyebrow', eyebrow || '');
    setText('celebration-title', title || '');
    setText('celebration-desc', desc || '');
    modal.hidden = false;
    requestAnimationFrame(() => modal.classList.add('show'));
    fireConfetti();
    const closeBtn = document.getElementById('btn-celebration-close');
    if (closeBtn) closeBtn.focus();
  }

  function hideCelebration() {
    const modal = document.getElementById('celebration-modal');
    if (!modal) return;
    modal.classList.remove('show');
    setTimeout(() => { modal.hidden = true; }, 280);
  }

  /* === CONFETTI (canvas, ligero, respeta reduced-motion) === */
  function fireConfetti() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = document.getElementById('app').getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const colors = ['#2E7D32', '#43A047', '#A5D6A7', '#1565C0', '#FFCA28', '#E65100'];
    const N = 90;
    const parts = [];
    for (let i = 0; i < N; i++) {
      parts.push({
        x: rect.width / 2 + (Math.random() - 0.5) * 80,
        y: rect.height / 3,
        vx: (Math.random() - 0.5) * 9,
        vy: Math.random() * -11 - 4,
        size: Math.random() * 7 + 4,
        color: colors[(Math.random() * colors.length) | 0],
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        life: 1
      });
    }

    let frame = 0;
    function draw() {
      ctx.clearRect(0, 0, rect.width, rect.height);
      let alive = false;
      parts.forEach(p => {
        p.vy += 0.32;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.life -= 0.011;
        if (p.life > 0 && p.y < rect.height + 30) {
          alive = true;
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.life);
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
          ctx.restore();
        }
      });
      frame++;
      if (alive && frame < 160) {
        requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, rect.width, rect.height);
      }
    }
    requestAnimationFrame(draw);
  }

  /* === TOAST === */
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

  return {
    init, showScreen, getCurrentScreenName,
    showResult, updateStats, updateLevelWidget,
    renderDashboard, renderHistory,
    showCelebration, hideCelebration, fireConfetti,
    showToast, showCameraError, showProcessing
  };
})();
