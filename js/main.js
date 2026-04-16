/* ═══════════════════════════════════════════════════════════════
   MAIN.JS — Initialisation, Canvas, Cursor, Events
   Hunter System v5.0
   Entry point. Wires everything together.
═══════════════════════════════════════════════════════════════ */

'use strict';

/* ── Global game object ──────────────────────────────────── */
window.G = {
  state:        null,
  selectedTier: 'E',
  save() { saveProfile(this.state); }
};

/* ── Operation locks for atomic actions ──────────────────── */
const _operationLocks = new Set();
const _debounceTimers = new Map();

function withLock(operationKey, fn, errorMsg = 'Operation in progress...') {
  if (_operationLocks.has(operationKey)) {
    ui.showToast(errorMsg, 'warn');
    return undefined;
  }
  _operationLocks.add(operationKey);
  try {
    const result = fn();
    return result;
  } finally {
    // Release lock after save completes or animation finishes
    setTimeout(() => _operationLocks.delete(operationKey), 500);
  }
}

function debounced(key, fn, delay = 300) {
  clearTimeout(_debounceTimers.get(key));
  _debounceTimers.set(key, setTimeout(fn, delay));
}

function isDebounced(key, delay = 300) {
  if (_debounceTimers.has(key)) return true;
  _debounceTimers.set(key, setTimeout(() => _debounceTimers.delete(key), delay));
  return false;
}

/* ══════════════════════════════════════════════════════════
   DOM READY — INIT SEQUENCE
══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initCanvas();
  initCursor();
  initRipple();
  initEventDelegation();
  initTabs();
  initEnergyStreaks();
  initEquipTilt();
  initParallax();
  initImageDropZones();   // drag-drop image system
  loadAllImages();        // restore saved images from localStorage

  // Initialize Adaptive Engine (Phase 1-5)
  if (window.AdaptiveEngine) {
    AdaptiveEngine.init();
  }

  // Dev mode: show NEW DAY SIM button if ?dev=1 in URL
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('dev') === '1') {
    const simBtn = document.getElementById('end-day-sim-btn');
    if (simBtn) simBtn.style.display = 'inline-flex';
  }

  // Quest enter key
  document.getElementById('quest-name-input')
    ?.addEventListener('keydown', e => { if (e.key === 'Enter') addQuest('quest-name-input'); });
  document.getElementById('quest-name-input-hq')
    ?.addEventListener('keydown', e => { if (e.key === 'Enter') addQuestHQ(); });
  document.getElementById('hunter-name-input-inline')
    ?.addEventListener('keydown', e => { if (e.key === 'Enter') updateHunterName(); });

  // First contact or returning hunter
  const saved = loadProfile();
  if (!saved || !saved.hunter) {
    // Always initialize G.state with default even for new users
    // This prevents null reference errors when buttons are clicked before registration
    G.state = saved || (typeof defaultState === 'function' ? defaultState() : { hunter: '', todayLoggedIn: false, quests: [], xp: 12, gold: 5, level: 1, rank: 'K', loginStreak: 0 });
    ui.showFirstContactModal();
  } else {
    G.state = saved;
    ui.applyState(G.state);
    checkStreakReset();
  }

  // Awakening intro auto-skip
  setTimeout(skipAwakening, 3500);
});

/* ── Daily streak reset check ────────────────────────────── */
function checkStreakReset() {
  const s = G.state;
  if (!s || !s.lastLoginDate) return;
  const today     = new Date().toISOString().split('T')[0];
  const lastLogin = s.lastLoginDate;
  const diff      = (new Date(today) - new Date(lastLogin)) / 86400000;

  if (diff >= 2) {
    // Missed at least one full day
    if (s.ownsStreakShield && s.loginStreak > 0) {
      // Shield absorbs one miss
      s.ownsStreakShield = false;
      G.save();
      ui.showToast('Streak Shield activated! Streak preserved.','warn');
    } else if (s.loginStreak > 0) {
      const lost = s.loginStreak;
      s.loginStreak = 0;
      s.todayLoggedIn = false;
      G.save();
      ui.applyState(s);
      ui.showSysModal('STREAK BROKEN',
        '<div class="hl-red">You missed a day.</div><br>' +
        '<div>Streak of <span class="hl-red">' + lost + ' days</span> lost.</div><br>' +
        '<div style="font-size:11px;color:var(--text-2);">The System records your absence.</div>'
      );
    }
  } else if (diff >= 1 && s.todayLoggedIn) {
    // New day — reset todayLoggedIn flag
    s.todayLoggedIn = false;
    G.save();
    ui.applyState(s);
  }
}

/* ══════════════════════════════════════════════════════════
   FIRST CONTACT — single user setup
══════════════════════════════════════════════════════════ */
function submitFirstContact() {
  const input = document.getElementById('first-contact-input');
  const err   = document.getElementById('first-contact-error');
  const name  = input ? input.value.trim() : '';

  if (!name) { if (err) err.textContent = 'Enter a Hunter Designation.'; return; }
  if (!/^[a-zA-Z0-9_\- ]+$/.test(name)) {
    if (err) err.textContent = 'Letters, numbers, spaces, _ and - only.'; return;
  }

  const state    = defaultState();
  state.hunter   = name;
  G.state        = state;
  G.save();
  ui.hideFirstContactModal();
  ui.applyState(state);

  ui.showSysModal('HUNTER REGISTERED',
    '<div>Designation confirmed:</div><br>' +
    '<div class="hl" style="font-size:1.3em;letter-spacing:0.25em;">' + escapeHTML(name.toUpperCase()) + '</div><br>' +
    '<div>Your journey begins now.</div><br>' +
    '<div class="hl-green" style="font-size:11px;letter-spacing:0.3em;">ARISE, HUNTER.</div>'
  );
}

/* ══════════════════════════════════════════════════════════
   EVENT DELEGATION — no inline onclick anywhere
══════════════════════════════════════════════════════════ */
function initEventDelegation() {
  document.body.addEventListener('click', e => {
    const el     = e.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action;

    // Debounce all actions to prevent rapid-click exploits
    if (isDebounced('action:' + action, 250)) {
      e.stopPropagation();
      return;
    }

    const index  = el.dataset.index !== undefined ? parseInt(el.dataset.index) : undefined;
    const tier   = el.dataset.tier;
    const item   = el.dataset.item;
    const tmpl   = el.dataset.template;

    const map = {
      // Daily / system — with locks for critical operations
      dailyLogin: () => withLock('dailyLogin', () => {
        console.log('[Flow] CLICKED: Daily Login button');
        dailyLogin();
        
        const targetTab = 'quests';
        console.log(`[Flow] CALLING switchTab('${targetTab}')`);
        switchTab(targetTab);
        
        // Hard enforcement loop
        setTimeout(() => {
          const visibleTab = document.getElementById('page-' + targetTab);
          
          if (!visibleTab || window.getComputedStyle(visibleTab).visibility === 'hidden' || window.getComputedStyle(visibleTab).opacity === '0') {
            console.warn(`[Flow Fallback] FORCING QUEST TAB VISIBILITY (CSS or JS failed)`);
            
            // Override completely
            document.querySelectorAll('.page').forEach(p => {
              p.classList.remove('active');
              p.style.display = 'none';
              p.style.visibility = 'hidden';
              p.style.opacity = '0';
            });
            
            visibleTab.classList.add('active');
            visibleTab.style.display = 'block';
            visibleTab.style.visibility = 'visible';
            visibleTab.style.opacity = '1';
            visibleTab.style.transform = 'translateY(0)';
            
            document.querySelectorAll('.tab-btn').forEach(b => {
              b.classList.toggle('active', b.dataset.tab === targetTab);
            });
            
            window.currentTab = targetTab;
          } else {
            console.log(`[Flow] Confirmed ${targetTab} tab is visible.`);
          }
        }, 500);
      }, 'Login already in progress...'),
      endOfDay:   () => withLock('endOfDay', endOfDay, 'End of day processing...'),
      endDaySimulation: () => withLock('endDaySim', endDaySimulation, 'Simulation running...'),
      skipAwakening,
      // Quests — with locks for operations that modify state
      addQuest:      () => withLock('addQuest', () => addQuest(), 'Adding quest...'),
      addQuestHQ:    () => withLock('addQuest', () => {
        addQuestHQ();
        switchTab('quests');
      }, 'Adding quest...'),
      completeQuest: () => withLock('completeQuest', () => completeQuest(index), 'Processing completion...'),
      failQuest:     () => withLock('failQuest', () => failQuest(index), 'Processing...'),
      selectTier:    () => selectTier(tier),
      useTemplate:   () => useTemplate(tmpl),
      takeNextAction,
      quickAddQuest,
      switchTab:     () => switchTab(el.dataset.targetTab),
      dismissOnboarding,
      toggleSection: () => ui.toggleHqSection(el.dataset.section),
      // Gates
      triggerBonusGate,
      openGate,
      // Shop — with lock for purchase
      buyItem: () => withLock('buyItem', () => buyItem(item), 'Processing purchase...'),
      // Dungeon
      startForestDungeon,
      // Data
      exportData:  () => exportData(G.state),
      importTrigger: () => document.getElementById('import-file-input')?.click(),
      // Modal
      closeSysModal: ui.closeSysModal,
      // Reset — with lock to prevent double reset
      initiateReset,
      confirmReset:  () => withLock('confirmReset', () => {
        const newName = document.getElementById('reset-name-input')?.value.trim() || G.state.hunter;
        confirmReset(newName);
      }, 'Reset in progress...'),
      // First contact
      submitFirstContact,
      updateHunterName,
    };

    if (map[action]) {
      e.stopPropagation();
      try {
        // Critical: Verify G.state is initialized before any action
        if (!G.state && action !== 'submitFirstContact' && action !== 'skipAwakening') {
          ui.showToast('System not initialized. Please register first.','error');
          ui.showFirstContactModal();
          return;
        }
        map[action](el);
      } catch (err) {
        console.error('Action failed:', action, err);
        ui.showToast('System error: ' + (err.message || 'Unknown error'),'error');
      }
    }
  });
}

/* ══════════════════════════════════════════════════════════
   TAB NAVIGATION
══════════════════════════════════════════════════════════ */
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
  // Activate default node
  switchTab('hq');
}

function switchTab(id) {
  if (id === 'dungeon') {
    const s = G.state;
    if (s && !(s.level >= 5 && ['M', 'A', 'S'].includes(s.rank))) {
      ui.showToast('Dungeon unlocks at Level 5 and Rank M.', 'warn');
      return;
    }
  }

  const next = document.getElementById('page-' + id);
  if (!next) {
    console.error(`[Navigation] Failed to switch tab: target page (#page-${id}) missing.`);
    return;
  }

  console.log(`[Navigation] EXECUTING switchTab to: ${id}`);

  // 1. Force the spatial canvas container to behave properly
  const canvas = document.getElementById('spatial-canvas');
  if (canvas) {
    // Completely remove the old transform logic
    canvas.style.transform = 'none';
    canvas.style.display = 'block'; // Ensure it's not trying to use CSS Grid anymore
  }

  // 2. Update button active states
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === id);
  });
  
  // 3. Transition logic: Slide current out, next in
  const currentActive = document.querySelector('.page.active');
  if (currentActive && currentActive !== next) {
    currentActive.classList.add('tab-exit');
    currentActive.classList.remove('active');
    
    // Hard hide previous after animation
    setTimeout(() => {
      currentActive.classList.remove('tab-exit');
      currentActive.style.display = 'none';
    }, 450);
  }
  
  // 4. Ensure the target page is visible and active
  next.classList.remove('tab-exit');
  next.classList.add('active');
  
  // 5. Hard enforce visibility immediately, stripping any inherited styles
  next.style.display = 'block';
  next.style.visibility = 'visible';
  next.style.opacity = '1';
  next.style.transform = 'translateY(0)';
  next.style.zIndex = '10'; // Force to top layer
  
  // 6. Clean up styles on others to prevent stacking issues
  document.querySelectorAll('.page').forEach(p => {
    if (p !== next && !p.classList.contains('tab-exit')) {
      p.style.display = 'none'; // HARD hide inactive tabs
      p.style.visibility = 'hidden';
      p.style.opacity = '0';
      p.style.zIndex = '1';
      p.classList.remove('active');
    }
  });
  
  // Reset scroll position for the new tab
  next.scrollTop = 0;
  
  // Store current tab in global state for fallback tracking
  window.currentTab = id;
  console.log(`[Navigation] SUCCESS: Displayed #page-${id}`);
}

function quickAddQuest() {
  switchTab('quests');
  const input = document.getElementById('quest-name-input');
  if (input) {
    setTimeout(() => input.focus(), 150);
  }
}

function takeNextAction() {
  const s = G.state;
  if (!s) return;
  const action = typeof ui.getCurrentMissionAction === 'function'
    ? ui.getCurrentMissionAction()
    : (s.todayLoggedIn ? 'open_quests' : 'login');

  if (action === 'login') {
    withLock('dailyLogin', () => {
      console.log('[Flow] Daily Login initiated');
      dailyLogin();
      
      // Guaranteed execution flow
      const targetTab = 'quests';
      switchTab(targetTab);
      
      // Fallback enforcement
      setTimeout(() => {
        if (window.currentTab !== targetTab) {
          console.warn(`[Flow Fallback] Enforcing navigation to ${targetTab}`);
          switchTab(targetTab);
        } else {
          console.log(`[Flow] Successfully navigated to ${targetTab}`);
        }
      }, 450);
      
    }, 'Login already in progress...');
    return;
  }
  if (action === 'claim_gate') { triggerBonusGate(); return; }
  if (action === 'enter_dungeon') { switchTab('dungeon'); return; }
  if (action === 'end_day') { endOfDay(); return; }

  if (action === 'create_quest' || action === 'complete_quest' || action === 'open_quests') {
    switchTab('quests');
    const input = document.getElementById('quest-name-input');
    if (input && action === 'create_quest') setTimeout(() => input.focus(), 150);
  }
}

function dismissOnboarding() {
  if (!G.state) return;
  G.state.onboardingDismissed = true;
  G.save();
  ui.dismissOnboarding();
}

/* ══════════════════════════════════════════════════════════
   AWAKENING INTRO
══════════════════════════════════════════════════════════ */
function skipAwakening() {
  const o = document.getElementById('awakening-overlay');
  if (!o) return;
  o.classList.add('fade-out');
  setTimeout(() => o.style.display = 'none', 800);
}

/* ══════════════════════════════════════════════════════════
   CANVAS — Magic Circle Background
   Throttled to 30fps for APK performance
══════════════════════════════════════════════════════════ */
function initCanvas() {
  const c = document.getElementById('bg-canvas');
  if (!c) return;
  const ctx  = c.getContext('2d');
  const runes = ['ᚠ','ᚢ','ᚦ','ᚨ','ᚱ','ᚲ','ᚷ','ᚹ','ᚺ','ᚾ','ᛁ','ᛃ','ᛇ','ᛈ','ᛉ','ᛊ','ᛏ','ᛒ','ᛖ','ᛗ','ᛚ','ᛜ','ᛞ','ᛟ'];
  let W, H, t = 0, lastFrame = 0;
  const FPS_CAP = 30, FRAME_MS = 1000 / FPS_CAP;

  // Reduced to 30 particles for APK performance
  const pts = Array.from({ length: 30 }, () => ({
    x:  Math.random() * 1600,
    y:  Math.random() * 900,
    r:  Math.random() * 1.4 + 0.3,
    vx: (Math.random() - 0.5) * 0.2,
    vy: (Math.random() - 0.5) * 0.2,
    a:  Math.random() * 0.5 + 0.1,
    col: Math.random() > 0.6 ? '102,0,204' : Math.random() > 0.5 ? '153,0,255' : '204,0,255'
  }));

  function resize() { W = c.width = window.innerWidth; H = c.height = window.innerHeight; }
  window.addEventListener('resize', resize); resize();

  function drawMagicCircle(cx, cy, baseR, rot) {
    const radii = [baseR*0.25, baseR*0.45, baseR*0.65, baseR*0.85, baseR];
    radii.forEach((r, i) => {
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2);
      const a = [0.12,0.08,0.15,0.08,0.12][i];
      ctx.strokeStyle = i%2===0 ? `rgba(102,0,204,${a})` : `rgba(109,0,212,${a})`;
      ctx.lineWidth = i===4 ? 1.2 : 0.7; ctx.stroke();
    });
    for (let i = 0; i < 12; i++) {
      const a = (i/12)*Math.PI*2 + rot;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a)*radii[0], cy + Math.sin(a)*radii[0]);
      ctx.lineTo(cx + Math.cos(a)*radii[4], cy + Math.sin(a)*radii[4]);
      ctx.strokeStyle = 'rgba(102,0,204,0.06)'; ctx.lineWidth = 0.5; ctx.stroke();
    }
    ctx.save(); ctx.translate(cx, cy);
    runes.forEach((r, i) => {
      const angle = (i/runes.length)*Math.PI*2 + rot*0.5;
      ctx.fillStyle = 'rgba(102,0,204,0.22)';
      ctx.font = Math.max(9, baseR*0.04) + 'px serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(r, Math.cos(angle)*baseR*0.92, Math.sin(angle)*baseR*0.92);
    });
    ctx.restore();
    for (let n = 0; n < 2; n++) {
      ctx.beginPath();
      for (let i = 0; i <= 6; i++) {
        const a = (i/6)*Math.PI*2 + rot*(n===0?1:-1) + (n===0?0:Math.PI/6), r2 = baseR*0.38;
        i===0 ? ctx.moveTo(cx+Math.cos(a)*r2, cy+Math.sin(a)*r2)
              : ctx.lineTo(cx+Math.cos(a)*r2, cy+Math.sin(a)*r2);
      }
      ctx.strokeStyle = `rgba(${n===0?'102,0,204':'109,0,212'},0.18)`;
      ctx.lineWidth = 0.8; ctx.stroke();
    }
    const g = ctx.createRadialGradient(cx,cy,0,cx,cy,baseR*0.12);
    g.addColorStop(0,'rgba(102,0,204,0.3)'); g.addColorStop(1,'rgba(102,0,204,0)');
    ctx.beginPath(); ctx.arc(cx,cy,baseR*0.12,0,Math.PI*2); ctx.fillStyle=g; ctx.fill();
  }

  function draw(ts) {
    requestAnimationFrame(draw);
    if (ts - lastFrame < FRAME_MS) return;
    lastFrame = ts;
    ctx.clearRect(0, 0, W, H);
    t += 0.004;
    drawMagicCircle(W*0.82, H*0.65, Math.min(W,H)*0.4, t);
    drawMagicCircle(W*0.12, H*0.2,  Math.min(W,H)*0.14, -t*1.4);
    pts.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(${p.col},${p.a})`; ctx.fill();
    });
  }
  requestAnimationFrame(draw);
}

/* ══════════════════════════════════════════════════════════
   CURSOR — Diamond ring + dot + trail
   Disabled automatically on touch devices
══════════════════════════════════════════════════════════ */
function initCursor() {
  if (window.matchMedia('(hover: none)').matches) return;
  const ring  = document.getElementById('cursor-ring');
  const dot   = document.getElementById('cursor-dot');
  const trail = document.getElementById('cursor-trail-container');
  if (!ring || !dot) return;

  let mx = -300, my = -300, rx = -300, ry = -300, lastTrail = 0, ready = false;

  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    dot.style.left = mx + 'px'; dot.style.top = my + 'px';
    if (!ready) { ready = true; document.body.classList.add('cursor-ready'); }
    spawnTrail(mx, my);
    // Tab proximity glow
    document.querySelectorAll('.tab-btn').forEach(btn => {
      const r = btn.getBoundingClientRect();
      const dist = Math.hypot(mx - (r.left + r.width/2), my - (r.top + r.height/2));
      btn.classList.toggle('cursor-near', dist < 80);
    });
  });

  (function animRing() {
    rx += (mx - rx) * 0.13; ry += (my - ry) * 0.13;
    ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
    requestAnimationFrame(animRing);
  })();

  const HOVER_SEL = 'button,a,[data-action],input,select,.quest-row,.tab-btn,.tier-btn,.ach-badge,.template-btn,.equip-card';
  document.body.addEventListener('mouseover', e => {
    if (e.target.closest(HOVER_SEL)) document.body.classList.add('cur-hover');
  });
  document.body.addEventListener('mouseout', e => {
    if (e.target.closest(HOVER_SEL)) document.body.classList.remove('cur-hover');
  });
  document.addEventListener('mousedown', () => document.body.classList.add('cur-click'));
  document.addEventListener('mouseup',   () => setTimeout(() => document.body.classList.remove('cur-click'), 120));
  document.addEventListener('mouseleave', () => { ring.style.opacity='0'; dot.style.opacity='0'; });
  document.addEventListener('mouseenter', () => { ring.style.opacity='1'; dot.style.opacity='1'; });

  function spawnTrail(x, y) {
    const now = Date.now();
    if (now - lastTrail < 45 || !trail) return;
    lastTrail = now;
    const p = document.createElement('div');
    p.className = 'cursor-trail';
    const s = 2 + Math.random() * 3;
    p.style.cssText = `left:${x+(Math.random()-0.5)*6}px;top:${y+(Math.random()-0.5)*6}px;width:${s}px;height:${s}px;`;
    trail.appendChild(p);
    setTimeout(() => p.remove(), 500);
  }
}

/* ══════════════════════════════════════════════════════════
   RIPPLE — touch + click feedback
══════════════════════════════════════════════════════════ */
function initRipple() {
  const SEL = 'button,.quest-row,.tab-btn,.ach-badge,.template-btn,.equip-card,.tier-btn';
  document.body.addEventListener('pointerdown', e => {
    const el = e.target.closest(SEL);
    if (!el) return;
    el.classList.add('ripple-surface');
    const rect   = el.getBoundingClientRect();
    const size   = Math.max(rect.width, rect.height) * 2;
    const ripple = document.createElement('span');
    ripple.className    = 'tap-ripple';
    ripple.style.width  = size + 'px';
    ripple.style.height = size + 'px';
    ripple.style.left   = (e.clientX - rect.left - size/2) + 'px';
    ripple.style.top    = (e.clientY - rect.top  - size/2) + 'px';
    el.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });
}

/* ══════════════════════════════════════════════════════════
   ENERGY STREAKS (ambient decorative)
══════════════════════════════════════════════════════════ */
function initEnergyStreaks() {
  const layer = document.getElementById('streaks-layer');
  if (!layer) return;
  for (let i = 0; i < 6; i++) {
    const streak = document.createElement('div');
    streak.className = 'energy-streak';
    streak.style.cssText =
      `width:${80+Math.random()*160}px;` +
      `top:${Math.random()*100}vh;` +
      `animation-duration:${10+Math.random()*14}s;` +
      `animation-delay:${Math.random()*18}s;`;
    layer.appendChild(streak);
  }
}

/* ══════════════════════════════════════════════════════════
   EQUIP CARD 3D TILT
══════════════════════════════════════════════════════════ */
function initEquipTilt() {
  document.querySelectorAll('.equip-card').forEach(card => {
    const shine = card.querySelector('.card-shine');
    card.addEventListener('mousemove', e => {
      const r  = card.getBoundingClientRect();
      const x  = (e.clientX - r.left) / r.width  - 0.5;
      const y  = (e.clientY - r.top)  / r.height - 0.5;
      card.style.transform = `perspective(600px) rotateX(${y*-10}deg) rotateY(${x*10}deg) translateY(-3px)`;
      if (shine) { shine.style.setProperty('--mx',((e.clientX-r.left)/r.width*100).toFixed(1)+'%'); shine.style.setProperty('--my',((e.clientY-r.top)/r.height*100).toFixed(1)+'%'); }
    });
    card.addEventListener('mouseleave', () => {
      card.style.transition = 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)';
      card.style.transform  = '';
      setTimeout(() => card.style.transition = '', 350);
    });
  });
}

/* ══════════════════════════════════════════════════════════
   PARALLAX DEPTH
══════════════════════════════════════════════════════════ */
function initParallax() {
  document.addEventListener('mousemove', e => {
    const cx = e.clientX / window.innerWidth  - 0.5;
    const cy = e.clientY / window.innerHeight - 0.5;
    document.querySelector('.hunter-silhouette')
      ?.style.setProperty('transform', `translate(${-cx*10}px,${-cy*6}px)`);
  });
}

/* ── Import file input handler ───────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const importInput = document.getElementById('import-file-input');
  if (importInput) {
    importInput.addEventListener('change', e => {
      importData(e, parsed => {
        G.state = loadProfile() || defaultState();
        // Apply imported data
        Object.assign(G.state, parsed);
        G.save();
        ui.applyState(G.state);
      });
    });
  }
});
