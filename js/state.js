/* ═══════════════════════════════════════════════════════════════
   STATE.JS — Single-User Profile System
   Hunter System v5.0
   Handles: localStorage, defaultState, save/load, reset+penalty
   No multi-user. No login/logout. One hunter per instance.
═══════════════════════════════════════════════════════════════ */

'use strict';

const LS_KEY              = 'rpg_hunter_v5';
const LS_RESET_LOCK_KEY   = 'rpg_hunter_reset_lock';
const RESET_COOLDOWN_MS   = 24 * 60 * 60 * 1000; // 24 hours

/* ── State bounds for validation ────────────────────────── */
const STATE_BOUNDS = {
  xp: { min: 0, max: 10000 },
  gold: { min: 0, max: 5000 },
  level: { min: 1, max: 5 },
  loginStreak: { min: 0, max: 365 },
  questsCompletedTotal: { min: 0, max: 10000 },
  sRankTodayCount: { min: 0, max: 100 },
  critHitsTotal: { min: 0, max: 10000 },
  gatesOpenedTotal: { min: 0, max: 1000 },
  dungeonDaysCompleted: { min: 0, max: 7 }
};

/* ── Generate simple integrity hash ─────────────────────── */
function hashState(state) {
  const str = JSON.stringify({
    hunter: state.hunter,
    xp: state.xp,
    gold: state.gold,
    level: state.level,
    rank: state.rank,
    streak: state.loginStreak
  });
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/* ── XSS helper ─────────────────────────────────────────── */
function escapeHTML(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

/* ── Default game state ──────────────────────────────────── */
function defaultState() {
  return {
    v:          5,
    hunter:     '',          // set once at first-contact
    xp:         12,          // endowed progress start
    gold:       5,           // starter gold
    level:      1,
    rank:       'K',
    loginStreak:      0,
    todayLoggedIn:    false,
    lastLoginDate:    null,  // ISO date string YYYY-MM-DD
    resetCount:       0,
    lastResetAt:      null,
    ownsSword:        false,
    ownsArmor:        false,
    ownsStreakShield: false,
    forestDungeonUnlocked:  false,
    dungeonEntered:         false,
    dungeonDaysCompleted:   0,
    quests:               [],
    xpHistory:            [],
    unlockedAchievements: {},
    questsCompletedTotal: 0,
    sRankTodayCount:      0,
    critHitsTotal:        0,
    gatesOpenedTotal:     0,
    gatesTriggered:       {},
    pendingGate:          false,
    onboardingDismissed:  false,
    
    // Visual Engine v6.0 — Momentum & Session Tracking
      sessionStartTime:     null,
      lastActionTime:       null,
      questsCompletedThisSession: 0,
      sessionXPGained:      0,
      peakCombo:            0,
      adaptiveDifficulty:   1.0,  // 0.5-1.5 scale based on performance
      
      // Real-Time Adaptive Engine (Phase 1)
      tasksAddedThisSession: 0,
      timeBetweenQuests:    [],   // Store last 5 durations (ms)
      lastQuestCompletionTime: null,
      consecutiveRapidCompletions: 0,
      systemMode:           'Neutral', // 'Neutral', 'Pressure', 'Recovery'
      sessionIntensity:     0,   // 0 to 100
      totalSessionIdleTime: 0,
      lastIdleNudgeTime:    null
    };
}

/* ── Validate and clamp numeric value ──────────────────── */
function clampValue(key, value, defaultValue) {
  const bounds = STATE_BOUNDS[key];
  if (!bounds) return typeof value === 'number' && !isNaN(value) ? value : defaultValue;
  if (typeof value !== 'number' || isNaN(value)) return defaultValue;
  return Math.max(bounds.min, Math.min(bounds.max, value));
}

/* ── Validate timestamp sanity ──────────────────────────── */
function validateTimestamp(ts) {
  if (!ts || typeof ts !== 'string') return null;
  const date = new Date(ts);
  const now = Date.now();
  const minDate = new Date('2024-01-01').getTime();
  // Reject future dates (more than 1 day ahead) and dates before 2024
  if (isNaN(date.getTime()) || date.getTime() > now + 86400000 || date.getTime() < minDate) {
    return null;
  }
  return ts;
}

/* ── Load profile from localStorage ─────────────────────── */
function loadProfile() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || typeof d !== 'object' || !d.hunter) return null;
    const def = defaultState();
    // Validate hunter name (sanity check)
    const hunter = typeof d.hunter === 'string' ? d.hunter.trim() : '';
    if (!hunter || hunter.length > 50 || !/^[a-zA-Z0-9_\- ]+$/.test(hunter)) {
      console.warn('Invalid hunter name in save, using default');
      return null;
    }
    // Merge saved data onto defaults with bounds validation
    return Object.assign({}, def, {
      v:            5,
      hunter:       hunter,
      xp:           clampValue('xp', d.xp, def.xp),
      gold:         clampValue('gold', d.gold, def.gold),
      level:        clampValue('level', d.level, def.level),
      rank:         ['K','M','A','S'].includes(d.rank) ? d.rank : def.rank,
      loginStreak:  clampValue('loginStreak', d.loginStreak, def.loginStreak),
      todayLoggedIn:typeof d.todayLoggedIn=== 'boolean' ? d.todayLoggedIn      : def.todayLoggedIn,
      lastLoginDate:validateTimestamp(d.lastLoginDate) || def.lastLoginDate,
      resetCount:   clampValue('resetCount', d.resetCount, def.resetCount),
      lastResetAt:  validateTimestamp(d.lastResetAt),
      ownsSword:        !!d.ownsSword,
      ownsArmor:        !!d.ownsArmor,
      ownsStreakShield:  !!d.ownsStreakShield,
      forestDungeonUnlocked: !!d.forestDungeonUnlocked,
      dungeonEntered:        !!d.dungeonEntered,
      dungeonDaysCompleted:  clampValue('dungeonDaysCompleted', d.dungeonDaysCompleted, 0),
      quests:               Array.isArray(d.quests) ? d.quests.slice(0, 100) : [], // Limit quests
      xpHistory:            Array.isArray(d.xpHistory) ? d.xpHistory.slice(-100) : [], // Keep last 100
      unlockedAchievements: (d.unlockedAchievements && typeof d.unlockedAchievements==='object') ? d.unlockedAchievements : {},
      questsCompletedTotal: clampValue('questsCompletedTotal', d.questsCompletedTotal, 0),
      sRankTodayCount:      clampValue('sRankTodayCount', d.sRankTodayCount, 0),
      critHitsTotal:        clampValue('critHitsTotal', d.critHitsTotal, 0),
      gatesOpenedTotal:     clampValue('gatesOpenedTotal', d.gatesOpenedTotal, 0),
      gatesTriggered: (d.gatesTriggered && typeof d.gatesTriggered==='object') ? d.gatesTriggered : {},
      pendingGate: typeof d.pendingGate==='boolean' ? d.pendingGate : false,
      onboardingDismissed: typeof d.onboardingDismissed==='boolean' ? d.onboardingDismissed : false,
      
      // Visual Engine v6.0 fields
      sessionStartTime: d.sessionStartTime || new Date().toISOString(),
      lastActionTime: d.lastActionTime || null,
      questsCompletedThisSession: clampValue('questsCompletedThisSession', d.questsCompletedThisSession, 0),
      sessionXPGained: clampValue('sessionXPGained', d.sessionXPGained, 0),
      peakCombo: clampValue('peakCombo', d.peakCombo, 0),
      adaptiveDifficulty: typeof d.adaptiveDifficulty === 'number' ? d.adaptiveDifficulty : 1.0,

      // Real-Time Adaptive Engine fields
      tasksAddedThisSession: clampValue('tasksAddedThisSession', d.tasksAddedThisSession, 0),
      timeBetweenQuests: Array.isArray(d.timeBetweenQuests) ? d.timeBetweenQuests.slice(-5) : [],
      lastQuestCompletionTime: d.lastQuestCompletionTime || null,
      consecutiveRapidCompletions: clampValue('consecutiveRapidCompletions', d.consecutiveRapidCompletions, 0),
      systemMode: ['Neutral', 'Pressure', 'Recovery'].includes(d.systemMode) ? d.systemMode : 'Neutral',
      sessionIntensity: clampValue('sessionIntensity', d.sessionIntensity, 0),
      totalSessionIdleTime: clampValue('totalSessionIdleTime', d.totalSessionIdleTime, 0),
      lastIdleNudgeTime: d.lastIdleNudgeTime || null,
      
      _integrity: d._integrity // Preserve for export
    });
  } catch(e) { return null; }
}

/* ── Save profile to localStorage ───────────────────────── */
function saveProfile(state) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
    flashSaveIndicator();
  } catch(e) {
    ui.showToast('⚠ Storage full — export your save first!', 'error');
    // Emergency cleanup to prevent permanent corruption
    if (state.xpHistory && state.xpHistory.length > 50) state.xpHistory = state.xpHistory.slice(-50);
    if (state.quests && state.quests.length > 50) state.quests = state.quests.filter(q => !q.completed && !q.failed).slice(0, 50);
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch(e2) {}
  }
}

/* ── Reset: penalty calculation ─────────────────────────── */
function canReset(state) {
  if (!state || !state.lastResetAt) return { ok: true };
  const elapsed = Date.now() - new Date(state.lastResetAt).getTime();
  if (elapsed < RESET_COOLDOWN_MS) {
    const h = Math.ceil((RESET_COOLDOWN_MS - elapsed) / 3600000);
    return { ok: false, hoursLeft: h };
  }
  return { ok: true };
}

function getPenalty(state) {
  if (!state) return { xpKept: 0, goldKept: 0, xpLossPct: 50, goldLossPct: 50, isHarsh: false };
  const xpPct   = state.resetCount === 0 ? 0.50 : 0.75;
  const goldPct = state.resetCount === 0 ? 0.50 : 1.00;
  return {
    xpKept:      Math.floor((state.xp || 0)   * (1 - xpPct)),
    goldKept:    Math.floor((state.gold || 0) * (1 - goldPct)),
    xpLossPct:   xpPct   * 100,
    goldLossPct: goldPct * 100,
    isHarsh:     state.resetCount > 0
  };
}

function executeReset(state, newName) {
  if (!state) state = {};
  const penalty = getPenalty(state);
  const fresh   = defaultState();
  return Object.assign(fresh, {
    hunter:      (newName || state.hunter || 'Hunter').trim(),
    xp:          penalty.xpKept,
    gold:        penalty.goldKept,
    resetCount:  (state.resetCount || 0) + 1,
    lastResetAt: new Date().toISOString()
  });
}

/* ── Export / Import ─────────────────────────────────────── */
function exportData(state) {
  if (!state || !state.hunter) { ui.showToast('No save data to export.','warn'); return; }
  try {
    // Bundle images alongside game state if images.js is loaded
    const payload = Object.assign({}, state);
    if (typeof exportImageBundle === 'function') {
      const imgs = exportImageBundle();
      if (Object.keys(imgs).length) payload._images = imgs;
    }
    // Add integrity hash
    payload._integrity = hashState(payload);
    payload._exportedAt = new Date().toISOString();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = 'hunter_' + state.hunter.replace(/[^a-zA-Z0-9_\-]/g,'_') + '_backup.json';
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
    ui.showToast('Save exported (includes your images).','success');
  } catch(e) { ui.showToast('Export failed.','error'); }
}

function importData(evt, onSuccess) {
  const file = evt.target.files && evt.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (typeof parsed !== 'object' || !parsed.hunter || typeof parsed.xp === 'undefined') {
        ui.showToast('Invalid save file.','error'); return;
      }
      // Validate hunter name on import
      if (!parsed.hunter || parsed.hunter.length > 50 || !/^[a-zA-Z0-9_\- ]+$/.test(parsed.hunter)) {
        ui.showToast('Invalid hunter name in save file.','error'); return;
      }
      // Verify integrity hash if present (warn but don't block if mismatch - might be edited legitimately)
      if (parsed._integrity) {
        const expectedHash = hashState(parsed);
        if (parsed._integrity !== expectedHash) {
          ui.showToast('Warning: Save file may have been modified.','warn');
          console.warn('Integrity mismatch:', parsed._integrity, '!=', expectedHash);
        }
      }
      // Restore images if bundled in backup
      if (parsed._images && typeof importImageBundle === 'function') {
        importImageBundle(parsed._images);
      }
      // Strip non-state fields before applying
      const cleanState = Object.assign({}, parsed);
      delete cleanState._images;
      delete cleanState._integrity;
      delete cleanState._exportedAt;
      // Apply bounds validation to imported state
      cleanState.xp = clampValue('xp', cleanState.xp, 12);
      cleanState.gold = clampValue('gold', cleanState.gold, 5);
      cleanState.level = clampValue('level', cleanState.level, 1);
      cleanState.loginStreak = clampValue('loginStreak', cleanState.loginStreak, 0);
      if (onSuccess) onSuccess(cleanState);
      ui.showToast('Save imported. Welcome back, ' + escapeHTML(parsed.hunter) + '.','success');
    } catch(_) { ui.showToast('Import failed — file corrupted.','error'); }
    evt.target.value = '';
  };
  reader.readAsText(file);
}

/* ── Save indicator flash ────────────────────────────────── */
let _saveTimer = null;
function flashSaveIndicator() {
  const el = document.getElementById('save-indicator');
  if (!el) return;
  el.classList.add('show');
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => el.classList.remove('show'), 1800);
}

/* ── Multi-tab warning ───────────────────────────────────── */
window.addEventListener('storage', e => {
  if (e.key === LS_KEY) {
    ui.showToast('⚠ Save updated in another tab — refresh to sync.','warn');
  }
});

/* ── Auto-save on page hide ──────────────────────────────── */
window.addEventListener('beforeunload', () => {
  if (window.G && G.state && G.state.hunter) saveProfile(G.state);
});
