/* ═══════════════════════════════════════════════════════════════
   UI.JS — All DOM Rendering & Display Functions
   Hunter System v5.0
   Rule: This file OWNS all getElementById/querySelector calls.
   Engine calls ui.* — never touches DOM directly.
═══════════════════════════════════════════════════════════════ */

'use strict';

const ui = (() => {

  /* ── Utility ─────────────────────────────────────────────── */
  function $(id)  { return document.getElementById(id); }
  function $q(sel){ return document.querySelector(sel); }
  function $all(sel){ return document.querySelectorAll(sel); }
  function escHTML(s){ return escapeHTML(s); } // from state.js
  let _currentMissionAction = 'login';

  /* ── Count-up number animation ───────────────────────────── */
  const _rollFrames = {};
  function rollNumber(id, target) {
    const el = $(id);
    if (!el) return;
    const start    = parseFloat(el.textContent) || 0;
    const diff     = target - start;
    if (Math.abs(diff) < 0.01) { el.textContent = target; return; }
    cancelAnimationFrame(_rollFrames[id]);
    let t0 = null;
    const dur = Math.min(600, Math.abs(diff) * 4);
    function step(ts) {
      if (!t0) t0 = ts;
      const p    = Math.min((ts - t0) / dur, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round((start + diff * ease) * 100) / 100;
      if (p < 1) _rollFrames[id] = requestAnimationFrame(step);
      else { el.textContent = target; delete _rollFrames[id]; }
    }
    _rollFrames[id] = requestAnimationFrame(step);
  }

  function bump(id) {
    const el = $(id);
    if (!el) return;
    el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
  }

  /* ══════════════════════════════════════════════════════════
     APPLY STATE — called after load/reset/login
  ══════════════════════════════════════════════════════════ */
  function applyState(s) {
    updateStatDisplays(s);
    updateShopDisplay(s);
    updateDungeonStatus(s);
    renderQuests(s);
    renderXPHistory(s);
    renderAchievements(s);
    updateSkillTree(s);
    updateQuickStats(s);
    updateXPBar(s);
    updateGoldBar(s);
    updateStreakBar(s);
    updateRankHex(s);
    updatePowerLevel(s);
    updateShadowCounter(s);
    checkStreakDanger(s);
    updateMissionControl(s);
    updateOnboardingChecklist(s);
    updateHQStateVisibility(s);
    updateTabLocks(s);
    updateSectionSignals(s);

    const lb   = $('login-btn');
    const edb  = $('end-day-btn');
    const edsb = $('end-day-sim-btn');
    const hs   = $('header-status');
    const hst  = $('header-streak');

    if (s.todayLoggedIn) {
      if (lb)   { lb.disabled = true; lb.textContent = '✓ LOGGED IN'; }
      if (edb)  edb.disabled = false;
      if (edsb) edsb.disabled = false;
      if (hs)   { hs.textContent = 'SYSTEM ONLINE'; hs.style.color = 'var(--sys-green)'; }
      if (hst)  hst.textContent = 'STREAK: ' + s.loginStreak + 'D';
      startEODTimer();
    } else {
      if (lb)   { lb.disabled = false; lb.textContent = '⚡ DAILY LOGIN'; }
      if (edb)  edb.disabled = true;
      if (edsb) edsb.disabled = true;
      if (hs)   { hs.textContent = 'AWAKEN TO BEGIN'; hs.style.color = ''; }
      if (hst)  hst.textContent = '';
      const eod = $('eod-countdown');
      if (eod) eod.style.display = 'none';
    }

    const hn = $('header-hunter-name');
    if (hn) hn.textContent = s.hunter ? '[ ' + s.hunter.toUpperCase() + ' ]' : '';

    if (s.pendingGate) showBonusGateIndicator('Pending gate reward awaits');
  }

  function setHeaderStatus(text, online) {
    const el = $('header-status');
    if (!el) return;
    el.textContent = text;
    el.style.color = online ? 'var(--sys-green)' : '';
  }

  /* ══════════════════════════════════════════════════════════
     STAT DISPLAYS
  ══════════════════════════════════════════════════════════ */
  function updateStatDisplays(s) {
    rollNumber('xp-display',   s.xp);
    rollNumber('gold-display', s.gold);
    bump('xp-display'); bump('gold-display');
    updateXPBar(s);
    updateGoldBar(s);
    updateStreakBar(s);
    updateRankHex(s);
    updateQuickStats(s);
    updatePowerLevel(s);
    updateShadowCounter(s);
    updateSkillTree(s);
    updateProfileCard(s);
    checkStreakDanger(s);
  }

  function updateXPBar(s) {
    const floors = [0, 0, 100, 250, 450, 700];
    const ceils  = [0, 100, 250, 450, 700, 700];
    const lvl    = Math.max(1, Math.min(s.level, 5));
    const floor  = floors[lvl];
    const ceil   = ceils[lvl];
    const pct    = ceil > floor ? Math.min(100, Math.max(0, ((s.xp - floor) / (ceil - floor)) * 100)) : 100;
    const fill   = $('xp-bar-fill');
    const text   = $('xp-progress-text');
    const toNext = $('xp-to-next');
    if (fill) fill.style.width = pct + '%';
    if (text) text.textContent = s.xp + ' / ' + ceil;
    if (toNext) toNext.innerHTML = '<span>' + Math.max(0, ceil - s.xp) + '</span> XP to Level ' + Math.min(s.level + 1, 5);
  }

  function updateGoldBar(s) {
    const goldGoal = s.rank === 'K' ? 50 : s.rank === 'M' ? 100 : 200;
    const pct      = Math.min(100, (s.gold / goldGoal) * 100);
    const fill     = $('gold-bar-fill');
    const text     = $('gold-progress-text');
    if (fill) fill.style.width = pct + '%';
    if (text) text.textContent = s.gold + ' / ' + goldGoal;
  }

  function updateStreakBar(s) {
    const segs = $all('.streak-seg');
    const days = Math.min(s.loginStreak, 7);
    segs.forEach((seg, i) => seg.classList.toggle('filled', i < days));
    const prog = $('streak-progress-text');
    if (prog) prog.textContent = s.loginStreak + ' / 7 days';
  }

  function updateRankHex(s) {
    const hex = $('rank-hex-badge');
    if (!hex) return;
    const safe = ['K','M','A','S'].includes(s.rank) ? s.rank : 'K';
    hex.className = 'rank-hex rank-' + safe;
    hex.textContent = safe;
  }

  function updateQuickStats(s) {
    const map = {
      'hsb-xp':     s.xp,
      'hsb-gold':   s.gold,
      'hsb-level':  s.level,
      'hsb-rank':   s.rank,
      'hsb-streak': s.loginStreak,
      'hud-lvl':    s.level,
      'hud-strk':   s.loginStreak
    };
    Object.entries(map).forEach(([id, val]) => { const e = $(id); if (e) e.textContent = val; });
  }

  function updatePowerLevel(s) {
    const power  = Math.round(s.xp * 0.6 + s.gold * 0.3 + s.level * 40 + s.loginStreak * 5);
    const maxPow = 1500;
    const pct    = Math.min(100, (power / maxPow) * 100);
    const fill   = $('power-level-fill');
    const label  = $('power-level-text');
    if (fill)  fill.style.width  = pct + '%';
    if (label) label.textContent = power;
  }

  function updateShadowCounter(s) {
    const el = $('shadow-army-count');
    if (el) el.textContent = s.questsCompletedTotal;
  }

  function updateProfileCard(s) {
    // Update compact hunter card in Profile tab
    const lvlEl = $('profile-lvl');
    const strkEl = $('profile-streak');
    const goldEl = $('profile-gold');
    const nameEl = $('profile-hunter-name');
    const rankEl = $('profile-rank-badge');
    const xpFill = $('profile-xp-fill');
    const nextUnlock = $('profile-next-unlock');

    if (lvlEl) lvlEl.textContent = s.level;
    if (strkEl) strkEl.textContent = s.loginStreak;
    if (goldEl) goldEl.textContent = s.gold;
    if (nameEl) nameEl.textContent = s.hunter ? s.hunter.toUpperCase() : 'HUNTER';
    if (rankEl) rankEl.textContent = s.rank || 'K';

    // Update XP bar
    if (xpFill) {
      const floors = [0, 0, 100, 250, 450, 700];
      const ceils  = [0, 100, 250, 450, 700, 700];
      const lvl = Math.max(1, Math.min(s.level, 5));
      const floor = floors[lvl];
      const ceil = ceils[lvl];
      const pct = ceil > floor ? Math.min(100, Math.max(0, ((s.xp - floor) / (ceil - floor)) * 100)) : 100;
      xpFill.style.width = pct + '%';
    }

    // Update next unlock text
    if (nextUnlock) {
      const unlocks = [
        { level: 2, name: 'Strike ability' },
        { level: 3, name: 'Guard ability' },
        { level: 4, name: 'Mana ability' },
        { level: 5, name: 'Shadow ability' }
      ];
      const next = unlocks.find(u => u.level > s.level);
      if (next) {
        const floors = [0, 0, 100, 250, 450, 700];
        const needed = floors[next.level] - s.xp;
        nextUnlock.textContent = next.name + ' unlocks at Level ' + next.level + ' — ' + needed + ' XP away';
      } else {
        nextUnlock.textContent = 'All abilities unlocked. Max level reached.';
      }
    }
  }

  function updateMissionControl(s) {
    const title = $('next-action-title');
    const copy = $('next-action-copy');
    const meta = $('next-action-meta');
    const btn = $('next-action-btn-label');
    if (!title || !copy || !meta || !btn) return;

    if (typeof getNextBestActionPlan === 'function') {
      const plan = getNextBestActionPlan(s);
      _currentMissionAction = plan.action;
      title.textContent = plan.title;
      copy.textContent = plan.copy;
      meta.textContent = plan.meta;
      btn.textContent = plan.cta;
      return;
    }

    _currentMissionAction = s.todayLoggedIn ? 'open_quests' : 'login';
    title.textContent = s.todayLoggedIn ? 'SYSTEM ALERT: PENDING MISSIONS' : 'SYSTEM OFFLINE: INITIATE DAILY LOGIN';
    copy.textContent = s.todayLoggedIn
      ? 'Immediate action required. Complete active missions to increase Hunter Rank.'
      : 'Connect to the system to unlock daily objectives and prevent penalty sequences.';
    
    // Engagement Hook: Next Best Action / Near-miss psychology
    const floors = [0, 0, 100, 250, 450, 700];
    const lvl = Math.max(1, Math.min(s.level, 5));
    const xpNeeded = floors[lvl] - s.xp;
    
    let hookMsg = s.todayLoggedIn ? 'Clear objectives to earn rewards.' : '+15 XP granted upon activation.';
    if (s.todayLoggedIn && xpNeeded > 0 && xpNeeded <= 30) {
      hookMsg = `ONLY ${xpNeeded} XP AWAY FROM LEVEL UP.`;
      meta.style.color = 'var(--sys-green)';
      meta.style.fontWeight = 'bold';
    } else {
      meta.style.color = '';
      meta.style.fontWeight = '';
    }
    
    meta.textContent = hookMsg;
    btn.textContent = s.todayLoggedIn ? 'EXECUTE MISSIONS' : '⚡ DAILY LOGIN';
  }

  function updateHQStateVisibility(s) {
    const page = $('page-hq');
    if (!page) return;
    const awakeningOnly = s.loginStreak === 0 && !s.todayLoggedIn;
    page.classList.toggle('hq-awakening', awakeningOnly);
    const renameInput = $('hunter-name-input-inline');
    if (renameInput && !renameInput.value) {
      renameInput.value = s.hunter || '';
    }
  }

  function updateOnboardingChecklist(s) {
    const panel = $('onboarding-panel');
    const s1 = $('onb-step-login');
    const s2 = $('onb-step-add');
    const s3 = $('onb-step-complete');
    if (!panel || !s1 || !s2 || !s3) return;

    s1.classList.toggle('done', s.todayLoggedIn || s.loginStreak > 0);
    s2.classList.toggle('done', s.quests.length > 0 || s.questsCompletedTotal > 0);
    s3.classList.toggle('done', s.questsCompletedTotal > 0);

    const shouldHide = s.onboardingDismissed || s.questsCompletedTotal > 0 || s.level >= 2;
    panel.classList.toggle('hidden', shouldHide);
  }

  function updateTabLocks(s) {
    const dungeonTab = $('tab-dungeon');
    const arsenalTab = $('tab-arsenal');
    if (dungeonTab) {
      const unlocked = s.level >= 5 && ['M', 'A', 'S'].includes(s.rank);
      dungeonTab.classList.toggle('tab-locked', !unlocked);
    }
    if (arsenalTab) {
      const unlocked = s.todayLoggedIn || s.questsCompletedTotal > 0;
      arsenalTab.classList.toggle('tab-locked', !unlocked);
    }
  }

  /* ── Streak danger (loss aversion) ──────────────────────── */
  function checkStreakDanger(s) {
    const danger = s.loginStreak > 0 && !s.todayLoggedIn;
    $q('.streak-bar-row')?.classList.toggle('streak-danger', danger);
    $('header-streak')?.classList.toggle('at-risk', danger);
    $('monarch-hud')?.classList.toggle('danger-state', danger);
    const prog = $('streak-progress-text');
    if (prog && danger) prog.textContent = '⚠ STREAK AT RISK — ' + s.loginStreak + 'd';
  }

  /* ── Skill tree ──────────────────────────────────────────── */
  function updateSkillTree(s) {
    SKILL_NODES.forEach(n => {
      const el = $(n.id);
      if (!el) return;
      el.classList.remove('locked','active','mastered');
      if      (s.level >= n.req + 1) el.classList.add('mastered');
      else if (s.level >= n.req)     el.classList.add('active');
      else                           el.classList.add('locked');
      if (n.con) {
        const con = $(n.con);
        if (con) con.classList.toggle('lit', s.level >= n.req);
      }
    });
  }

  /* ── Shop ────────────────────────────────────────────────── */
  function updateShopDisplay(s) {
    const goldEl = $('shop-gold-display');
    if (goldEl) goldEl.textContent = s.gold;

    _setItem('sword-item',  'buy-sword-btn',  s.ownsSword,        '✓ EQUIPPED',  'ACQUIRE');
    _setItem('armor-item',  'buy-armor-btn',  s.ownsArmor,         '✓ EQUIPPED',  'ACQUIRE');
    _setItem('streak-shield-item','buy-shield-btn', s.ownsStreakShield, '✓ SHIELDED', 'ACQUIRE');
    
    // Infinite Shadow Infusion Updates
    const infBtn = $('buy-infusion-btn');
    const infCostDisplay = $('infusion-cost-display');
    const infLvlDisplay = $('infusion-lvl-display');
    
    if (infBtn && infCostDisplay && infLvlDisplay) {
      const level = s.shadowInfusionLevel || 0;
      const nextCost = Math.floor(100 * Math.pow(1.5, level));
      
      infLvlDisplay.textContent = level;
      infCostDisplay.innerHTML = nextCost + ' <span style="font-size:12px;font-family:var(--font-mono);">GOLD</span>';
      
      if (s.gold < nextCost) {
        infBtn.disabled = true;
        infBtn.classList.remove('sys-btn-primary');
      } else {
        infBtn.disabled = false;
        infBtn.classList.add('sys-btn-primary');
      }
    }
  }

  function _setItem(cardId, btnId, owned, ownedText, freeText) {
    const card = $(cardId), btn = $(btnId);
    if (!card || !btn) return;
    card.classList.toggle('owned', owned);
    btn.disabled   = owned;
    btn.textContent = owned ? ownedText : freeText;
  }

  /* ── Dungeon ─────────────────────────────────────────────── */
  function updateDungeonStatus(s) {
    const unlocked = s.level >= 5 && (s.rank === 'M' || s.rank === 'A');
    const card   = $('forest-dungeon');
    const badge  = $('forest-status');
    const req    = $('forest-requirements');
    const btn    = $('start-forest-btn');
    const portal = $('gate-portal');
    if (!card) return;

    if (unlocked) {
      card.classList.remove('locked-d'); card.classList.add('active-d');
      if (badge)  { badge.className = 'dungeon-status-badge dsb-active'; badge.textContent = '⬡ ACTIVE'; }
      if (req)    req.style.display = 'none';
      if (btn)    btn.style.display = 'inline-flex';
      if (portal) portal.classList.remove('locked');
    } else {
      card.classList.remove('active-d'); card.classList.add('locked-d');
      if (badge)  { badge.className = 'dungeon-status-badge dsb-locked'; badge.textContent = '⬡ LOCKED'; }
      if (req)    req.style.display = 'block';
      if (btn)    btn.style.display = 'none';
      if (portal) portal.classList.add('locked');
    }
    updateDungeonProgressBar(s);
  }

  function updateDungeonProgressBar(s) {
    const wrap = $('dungeon-progress-wrap');
    const fill = $('dungeon-prog-fill');
    const text = $('dungeon-prog-text');
    const bossHp = $('boss-hp-fill');
    if (!s.forestDungeonUnlocked && !s.dungeonEntered) { if (wrap) wrap.style.display = 'none'; return; }
    if (wrap) wrap.style.display = 'block';
    const pct = (s.dungeonDaysCompleted / 3) * 100;
    if (fill) fill.style.width = pct + '%';
    if (text) text.textContent = s.dungeonDaysCompleted + ' / 3 DAYS';
    if (bossHp) bossHp.style.width = Math.max(0, 100 - pct) + '%';
  }

  /* ══════════════════════════════════════════════════════════
     QUEST RENDERING
  ══════════════════════════════════════════════════════════ */
  function renderQuests(s) {
    const list = $('quest-list');
    if (!list) return;
    list.innerHTML = '';

    if (!s.quests.length) {
      list.innerHTML = '<div class="quest-empty">No quests yet. Add your first mission to start earning XP.</div>';
      return;
    }

    s.quests.forEach((q, i) => {
      const tier = (['E','N','H','S'].includes(q.tier)) ? q.tier : 'N';
      const row  = document.createElement('div');
      row.className = 'quest-row tier-' + tier +
        (q.completed ? ' done' : q.failed ? ' failed' : '');
      row.dataset.index = i;

      // Crit anticipation flicker — only on active quests
      const flickerSyms = ['◇◇◇','◈◇◇','◈◈◇','◇◈◇','◈◈◈'];
      const flicker = !q.completed && !q.failed
        ? flickerSyms[Math.floor(Math.random() * flickerSyms.length)]
        : '';

      row.innerHTML =
        '<span class="quest-check ' + (q.completed ? 'done' : q.failed ? 'fail-icon' : '') + '">' +
          (q.completed ? '◈' : q.failed ? '✗' : '◇') +
        '</span>' +
        '<span class="q-tier-tag qtag-' + tier + '">' + tier + '</span>' +
        '<span class="q-name">' + escHTML(q.name) + '</span>' +
        (flicker ? '<span class="quest-crit-indicator" title="Critical hit chance">' + flicker + '</span>' : '') +
        (!q.completed && !q.failed
          ? '<div class="q-actions">' +
              '<button class="q-btn q-complete" data-action="completeQuest" data-index="' + i + '"><span>✓ COMPLETE</span></button>' +
              '<button class="q-btn q-fail"     data-action="failQuest"     data-index="' + i + '"><span>✗ FAIL</span></button>' +
            '</div>'
          : ''
        );
      list.appendChild(row);
    });
  }

  function questCompleteAnim(i) {
    const rows = $all('.quest-row');
    // Find the row with matching index
    const row = document.querySelector('.quest-row[data-index="' + i + '"]');
    if (row) {
      row.classList.add('completing');
      row.addEventListener('animationend', () => {
        row.classList.remove('completing');
        row.classList.add('done');
      }, { once: true });
    }
  }

  /* ══════════════════════════════════════════════════════════
     XP HISTORY
  ══════════════════════════════════════════════════════════ */
  function renderXPHistory(s) {
    const list = $('xp-history-list');
    if (!list) return;
    if (!s.xpHistory.length) {
      list.innerHTML = '<span class="xp-hist-empty">No XP changes yet. Complete a quest to generate your first record.</span>'; return;
    }
    list.innerHTML = '';
    s.xpHistory.forEach(entry => {
      const d      = typeof entry === 'object' ? entry.d    : entry;
      const isCrit = typeof entry === 'object' ? entry.crit : false;
      const reason = typeof entry === 'object' ? (entry.reason || 'System adjustment') : 'System adjustment';
      const row = document.createElement('div');
      row.className = 'xp-hist-row';
      const badge  = document.createElement('span');
      badge.className = 'xp-hist-badge ' + (isCrit ? 'crit' : d >= 0 ? 'pos' : 'neg');
      badge.textContent = (d >= 0 ? '+' : '') + d + (isCrit ? ' ★' : '');
      const reasonEl = document.createElement('span');
      reasonEl.className = 'xp-hist-reason';
      reasonEl.textContent = reason;
      row.appendChild(badge);
      row.appendChild(reasonEl);
      list.appendChild(row);
    });
  }

  /* ══════════════════════════════════════════════════════════
     ACHIEVEMENTS
  ══════════════════════════════════════════════════════════ */
  function renderAchievements(s) {
    const grid = $('achievements-grid');
    if (!grid) return;
    grid.innerHTML = '';
    ACHIEVEMENTS.forEach(a => {
      const unlocked = !!s.unlockedAchievements[a.id];
      const badge    = document.createElement('div');
      badge.className = 'ach-badge' + (unlocked ? ' unlocked' : '');

      if (a.hidden && !unlocked) {
        badge.innerHTML =
          '<span class="ach-icon dim">?</span>' +
          '<span class="ach-info">' +
            '<span class="ach-name">[ CLASSIFIED ]</span>' +
            '<span class="ach-desc">Condition unknown</span>' +
          '</span>';
      } else {
        badge.innerHTML =
          '<span class="ach-icon">' + a.icon + '</span>' +
          '<span class="ach-info">' +
            '<span class="ach-name">' + escHTML(a.name) + '</span>' +
            '<span class="ach-desc">' + escHTML(a.desc) + '</span>' +
          '</span>';
      }
      grid.appendChild(badge);
    });
  }

  function triggerHiddenAchievementReveal(a) {
    // Full dramatic modal for hidden unlocks
    showSysModal(
      '◈ CLASSIFIED UNLOCK',
      '<div class="hl" style="font-size:1.4em;letter-spacing:0.3em;">' + escHTML(a.icon) + '</div><br>' +
      '<div class="hl">' + escHTML(a.name) + '</div><br>' +
      '<div>' + escHTML(a.desc) + '</div><br>' +
      '<div class="hl-green" style="font-size:11px;letter-spacing:0.2em;">HUNTER DESIGNATION UPDATED.</div>'
    );
  }

  /* ══════════════════════════════════════════════════════════
     MODALS
  ══════════════════════════════════════════════════════════ */
  let _modalCb = null;

  function showSysModal(tag, bodyHTML, cb) {
    const tagEl  = $('sys-modal-tag');
    const bodyEl = $('sys-modal-body');
    const bd     = $('sys-modal-backdrop');
    if (tagEl)  tagEl.textContent = tag;
    if (bodyEl) bodyEl.innerHTML  = bodyHTML;
    if (bd)     bd.classList.add('show');
    _modalCb = cb || null;
  }

  function closeSysModal() {
    $('sys-modal-backdrop')?.classList.remove('show');
    if (_modalCb) { _modalCb(); _modalCb = null; }
  }

  function showResetConfirmModal(s, pen) {
    let newNameField = '';
    showSysModal(
      '⚠ PROFILE RESET',
      '<div class="hl-red">WARNING — PENALTY APPLIES</div><br>' +
      '<div>XP lost: <span class="hl-red">' + pen.xpLossPct + '%</span> → ' + pen.xpKept + ' kept</div>' +
      '<div>Gold lost: <span class="hl-red">' + pen.goldLossPct + '%</span> → ' + pen.goldKept + ' kept</div>' +
      '<div>Level reset to 1</div><div>All items forfeited</div>' +
      (pen.isHarsh ? '<div class="hl-red" style="margin-top:8px;">SECOND RESET — 75% PENALTY</div>' : '') + '<br>' +
      '<div style="margin-bottom:8px;">New hunter name (or keep current):</div>' +
      '<input id="reset-name-input" class="sys-input" placeholder="' + escHTML(s.hunter) + '" style="margin-bottom:12px;"/>' +
      '<div class="modal-btn-row">' +
        '<button class="sys-btn sys-btn-danger" data-action="confirmReset"><span>CONFIRM RESET</span></button>' +
        '<button class="sys-btn" data-action="closeSysModal"><span>CANCEL</span></button>' +
      '</div>'
    );
  }

  function showBonusGatePanel(rewardLabel) {
    const panel = $('bonus-gate-panel');
    const box   = $('gate-reward-box');
    const btn   = $('gate-open-btn');
    if (box)   box.textContent = '[ REWARD PENDING — ENTER GATE ]';
    if (btn)   btn.disabled    = false;
    if (panel) panel.classList.add('show');
    $('bonus-gate-indicator')?.classList.remove('visible');
  }

  function closeBonusGatePanel(reward) {
    const panel = $('bonus-gate-panel');
    const box   = $('gate-reward-box');
    const btn   = $('gate-open-btn');
    if (box)   box.textContent = '◈ ' + (reward?.label || 'Reward applied.');
    if (btn)   btn.disabled    = true;
    setTimeout(() => {
      panel?.classList.remove('show');
      showToast('Gate opened! ' + (box?.textContent || ''), 'success');
    }, 1800);
  }

  function showBonusGateIndicator(reason) {
    const ind = $('bonus-gate-indicator');
    const sub = $('bgi-sub-text');
    if (sub) sub.textContent = reason + ' — tap to claim';
    if (ind) ind.classList.add('visible');
  }

  /* ══════════════════════════════════════════════════════════
     EOD SUMMARY
  ══════════════════════════════════════════════════════════ */
  function showEODSummary(data) {
    const eodPanel = $('end-of-day-summary');
    if (eodPanel) {
      eodPanel.style.display = 'block';
      eodPanel.classList.add('show');
    }
    $('summary-original-xp')  ?.textContent !== undefined && ($('summary-original-xp').textContent   = data.origXP);
    $('summary-original-gold') ?.textContent !== undefined && ($('summary-original-gold').textContent = data.origGold);
    $('summary-failed-count')  ?.textContent !== undefined && ($('summary-failed-count').textContent  = data.failed);
    $('summary-penalty')       ?.textContent !== undefined && ($('summary-penalty').textContent       = data.penalty);
    $('summary-final-xp')      ?.textContent !== undefined && ($('summary-final-xp').textContent      = data.finalXP);
    $('summary-final-gold')    ?.textContent !== undefined && ($('summary-final-gold').textContent     = data.finalGold);
  }

  /* ══════════════════════════════════════════════════════════
     TOASTS
  ══════════════════════════════════════════════════════════ */
  function showToast(msg, type = 'info') {
    const container = $('toast-container');
    if (!container) return;
    const t = document.createElement('div');
    t.className   = 'sl-toast ' + type;
    t.textContent = msg;
    container.appendChild(t);
    setTimeout(() => {
      t.style.animation = 'toastOut 0.3s ease forwards';
      setTimeout(() => t.remove(), 300);
    }, 3200);
  }

  /* ══════════════════════════════════════════════════════════
     LEVEL UP / RANK UP EVENTS
  ══════════════════════════════════════════════════════════ */
  function triggerLevelUp(newLevel) {
    const num = $('lvl-number-display');
    if (num) num.textContent = newLevel;
    const el = $('levelup-event');
    if (el) { el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2800); }
    const sw = $('status-window-main');
    if (sw) { sw.classList.remove('lvl-flash'); void sw.offsetWidth; sw.classList.add('lvl-flash'); }
  }

  function triggerRankUp(newRank, prevRank) {
    const disp = $('rankup-rank-display');
    const prev = $('rankup-prev-rank');
    if (disp) disp.textContent = newRank;
    if (prev) prev.textContent = prevRank + ' → ' + newRank;
    const el = $('rankup-event');
    if (el) { el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 3200); }
    document.body.classList.add('rank-flash');
    setTimeout(() => document.body.classList.remove('rank-flash'), 600);
  }

  /* ══════════════════════════════════════════════════════════
     XP FLOAT PARTICLES
  ══════════════════════════════════════════════════════════ */
  function spawnXPFloat(amount, isCrit) {
    const anchor = $('xp-display');
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const el   = document.createElement('div');
    el.className = 'xp-float' + (isCrit ? ' crit' : '');
    el.textContent = '+' + amount + ' XP' + (isCrit ? ' ★' : '');
    el.style.left = (rect.left + rect.width / 2) + 'px';
    el.style.top  = rect.top + 'px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1100);
  }

  function triggerCritHit() {
    const el = $('crit-overlay');
    if (el) { el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); }
    setTimeout(() => el?.classList.remove('show'), 1300);
  }

  function triggerQuestClearFlash() {
    const flash = document.getElementById('screen-flash');
    if (flash) {
      flash.classList.remove('flash-active');
      void flash.offsetWidth; // trigger reflow
      flash.classList.add('flash-active');
    }
    const hud = $('monarch-hud');
    if (hud) {
      hud.style.boxShadow = 'inset 0 0 150px rgba(189, 0, 255, 0.4)';
      setTimeout(() => hud.style.boxShadow = '', 400);
    }
  }

  /* ══════════════════════════════════════════════════════════
     EOD COUNTDOWN TIMER
  ══════════════════════════════════════════════════════════ */
  let _eodInterval = null;
  function startEODTimer() {
    clearInterval(_eodInterval);
    const el = $('eod-countdown');
    if (!el) return;
    el.style.display = 'inline-block';
    _eodInterval = setInterval(() => {
      const now  = new Date();
      const mid  = new Date(); mid.setHours(24,0,0,0);
      const diff = mid - now;
      if (diff <= 0) { clearInterval(_eodInterval); el.textContent = 'RESET NOW'; return; }
      const h = String(Math.floor(diff / 3600000)).padStart(2,'0');
      const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2,'0');
      const sec = String(Math.floor((diff % 60000)  / 1000)).padStart(2,'0');
      el.textContent = 'RESET IN ' + h + ':' + m + ':' + sec;
      el.classList.toggle('urgent', diff < 3600000);
      $('monarch-hud')?.classList.toggle('danger-state', diff < 3600000);
    }, 1000);
  }

  /* ══════════════════════════════════════════════════════════
     FIRST CONTACT MODAL (single-user setup)
  ══════════════════════════════════════════════════════════ */
  function showFirstContactModal() {
    const bd = $('first-contact-backdrop');
    if (bd) bd.classList.add('show');
  }

  function hideFirstContactModal() {
    const bd = $('first-contact-backdrop');
    if (bd) bd.classList.remove('show');
  }

  function dismissOnboarding() {
    const panel = $('onboarding-panel');
    if (panel) panel.classList.add('hidden');
  }

  function toggleHqSection(section) {
    const root = $('sec-' + section);
    if (!root) return;
    const willExpand = !root.classList.contains('expanded');
    root.classList.toggle('expanded', willExpand);
    const toggle = root.querySelector('.hq-collapse-toggle');
    const icon = root.querySelector('.collapse-icon');
    if (toggle) toggle.setAttribute('aria-expanded', willExpand ? 'true' : 'false');
    if (icon) icon.textContent = willExpand ? '−' : '+';
  }

  function _setSectionMeta(section, text, tone, signal, urgent) {
    const meta = $('meta-' + section);
    const root = $('sec-' + section);
    if (!meta || !root) return;
    meta.textContent = text || '';
    meta.className = 'collapse-meta ' + (tone || 'info') + (text ? '' : ' hidden');
    root.classList.toggle('has-signal', !!signal);
    root.classList.toggle('urgent-pulse', !!urgent);
  }

  function updateSectionSignals(s) {
    const failed = s.quests.filter(q => q.failed).length;
    const hasPenalty = failed > 0;
    const unlockedCount = ACHIEVEMENTS.filter(a => s.unlockedAchievements[a.id]).length;
    const nextSkillLevel = Math.min(5, s.level + 1);
    const remainingSkills = Math.max(0, 5 - s.level);

    if (hasPenalty) {
      _setSectionMeta('activity', failed + ' penalty', 'urgent', true, true);
    } else if (s.xpHistory.length > 0) {
      _setSectionMeta('activity', s.xpHistory.length + ' updates', 'good', true, false);
    } else {
      _setSectionMeta('activity', '', 'info', false, false);
    }

    if (unlockedCount > 0) {
      _setSectionMeta('achievements', unlockedCount + ' unlocked', 'good', true, false);
    } else {
      _setSectionMeta('achievements', '0 unlocked', 'info', false, false);
    }

    if (remainingSkills > 0) {
      _setSectionMeta('skills', 'next L' + nextSkillLevel, 'warn', true, false);
    } else {
      _setSectionMeta('skills', 'maxed', 'good', true, false);
    }

    _setSectionMeta('data', 'careful', 'warn', true, false);
  }

  function getCurrentMissionAction() {
    return _currentMissionAction;
  }

  /* Return public API */
  return {
    applyState, updateStatDisplays, updateXPBar, updateGoldBar,
    updateStreakBar, updateRankHex, updateQuickStats, updatePowerLevel,
    updateShadowCounter, updateProfileCard, updateSkillTree, updateShopDisplay,
    updateDungeonStatus, updateDungeonProgressBar, checkStreakDanger,
    renderQuests, questCompleteAnim, renderXPHistory, renderAchievements,
    triggerHiddenAchievementReveal, showSysModal, closeSysModal,
    showResetConfirmModal, showBonusGatePanel, closeBonusGatePanel,
    showBonusGateIndicator, showEODSummary, showToast,
    triggerLevelUp, triggerRankUp, spawnXPFloat, triggerCritHit,
    triggerQuestClearFlash, startEODTimer, rollNumber, bump,
    showFirstContactModal, hideFirstContactModal, dismissOnboarding,
    toggleHqSection, getCurrentMissionAction, updateMissionControl
  };
})();
