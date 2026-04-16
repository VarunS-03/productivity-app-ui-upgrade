/* ═══════════════════════════════════════════════════════════════
   ENGINE.JS — Core Game Logic
   Hunter System v5.0
   Handles: quests, XP, gold, levels, ranks, dungeon, shop, achievements, gates
   Rule: NEVER touches DOM directly — calls ui.* for all rendering
═══════════════════════════════════════════════════════════════ */

'use strict';

/* ── Tier reward table ───────────────────────────────────── */
const TIER_REWARDS = {
  E: { xp: 8,  gold: 3  },
  N: { xp: 12, gold: 6  },
  H: { xp: 20, gold: 12 },
  S: { xp: 35, gold: 20 }
};

/* ── Level thresholds ────────────────────────────────────── */
const LEVEL_THRESHOLDS = [0, 100, 250, 450, 700];
// level 1=0xp, level2=100, level3=250, level4=450, level5=700

/* ── Rank thresholds ─────────────────────────────────────── */
const RANK_ORDER = ['K','M','A','S'];

/* ── Bonus gate milestones ───────────────────────────────── */
const GATE_THRESHOLDS = [50, 100, 200, 350, 500, 750, 1000];

const GATE_REWARDS = [
  { label:'+20 XP Bonus',    apply: s => { s.xp   = round(s.xp   + 20); } },
  { label:'+15 Gold Bonus',  apply: s => { s.gold  = round(s.gold + 15); } },
  { label:'+30 XP Surge',    apply: s => { s.xp   = round(s.xp   + 30); } },
  { label:'+25 Gold Windfall',apply:s => { s.gold  = round(s.gold + 25); } },
  { label:'+1 Streak Day',   apply: s => { s.loginStreak = Math.max(0, s.loginStreak + 1); } },
  { label:'+50 XP Awakening',apply: s => { s.xp   = round(s.xp   + 50); } },
];

/* ── Achievements definition ─────────────────────────────── */
const ACHIEVEMENTS = [
  { id:'first_quest',   icon:'⚔',  name:'First Blood',     desc:'Complete your first quest',        hidden:false, check: s => s.questsCompletedTotal >= 1  },
  { id:'ten_quests',    icon:'◈',   name:'Veteran Hunter',  desc:'Complete 10 quests total',         hidden:false, check: s => s.questsCompletedTotal >= 10 },
  { id:'streak_7',      icon:'▲',   name:'Week Warrior',    desc:'Maintain a 7-day login streak',    hidden:false, check: s => s.loginStreak >= 7           },
  { id:'rank_M',        icon:'◆',   name:'Mana Awakened',   desc:'Reach Rank M',                     hidden:false, check: s => RANK_ORDER.indexOf(s.rank) >= 1 },
  { id:'rank_A',        icon:'⬡',   name:'Shadow Sovereign',desc:'Reach Rank A',                     hidden:false, check: s => RANK_ORDER.indexOf(s.rank) >= 2 },
  { id:'gold_100',      icon:'◇',   name:'Gold Hoarder',    desc:'Accumulate 100 Gold',              hidden:false, check: s => s.gold >= 100                },
  { id:'level_3',       icon:'↑',   name:'Power Surge',     desc:'Reach Level 3',                    hidden:false, check: s => s.level >= 3                 },
  { id:'crit_hit',      icon:'!',   name:'Lucky Strike',    desc:'Trigger a Critical Hit',           hidden:false, check: s => s.critHitsTotal >= 1         },
  { id:'dungeon_enter', icon:'▶',   name:'Dungeon Raider',  desc:'Enter the Forest Dungeon',         hidden:false, check: s => s.dungeonEntered             },
  { id:'gate_opened',   icon:'○',   name:'Gate Walker',     desc:'Open your first Bonus Gate',       hidden:false, check: s => s.gatesOpenedTotal >= 1      },
  { id:'shadow_monarch',icon:'?',   name:'Shadow Monarch',  desc:'???',                              hidden:true,  check: s => s.level >= 5 && s.loginStreak >= 7 },
  { id:'arise',         icon:'?',   name:'ARISE',           desc:'???',                              hidden:true,  check: s => s.sRankTodayCount >= 3       },
];

/* ── Skill tree node definitions ─────────────────────────── */
const SKILL_NODES = [
  { id:'sn-1', req:1, label:'Swift',  icon:'↯', con:'sc-1' },
  { id:'sn-2', req:2, label:'Strike', icon:'◈', con:'sc-2' },
  { id:'sn-3', req:3, label:'Guard',  icon:'◆', con:'sc-3' },
  { id:'sn-4', req:4, label:'Mana',   icon:'◇', con:'sc-4' },
  { id:'sn-5', req:5, label:'Shadow', icon:'⬡', con:null   },
];

/* ── Util ────────────────────────────────────────────────── */
function round(n) { return Math.round(n * 100) / 100; }
function todayISO() { return new Date().toISOString().split('T')[0]; }

function getNextBestActionPlan(s) {
  const activeQuests = s.quests.filter(q => !q.completed && !q.failed).length;
  const failedQuests = s.quests.filter(q => q.failed).length;
  const dungeonUnlocked = s.level >= 5 && ['M', 'A', 'S'].includes(s.rank);
  const actions = [];

  actions.push({
    action: 'login',
    score: !s.todayLoggedIn ? 100 : -999,
    title: 'Start your day with Daily Login',
    copy: 'Logging in activates all productivity systems and protects your streak.',
    meta: '+5 to +15 XP instantly from login bonus',
    cta: '⚡ DAILY LOGIN'
  });
  actions.push({
    action: 'claim_gate',
    score: s.pendingGate ? 95 : -999,
    title: 'Claim your pending Bonus Gate',
    copy: 'You already unlocked a reward. Claiming now converts momentum into power.',
    meta: 'Guaranteed bonus reward waiting',
    cta: '◆ CLAIM GATE'
  });
  actions.push({
    action: 'create_quest',
    score: s.todayLoggedIn && activeQuests === 0 ? 85 : -999,
    title: 'Create your first quest',
    copy: 'Set one clear mission so the system can start tracking your progress.',
    meta: '+8 XP minimum from one completed E-tier quest',
    cta: '+ ADD QUEST'
  });
  actions.push({
    action: 'complete_quest',
    score: s.todayLoggedIn && activeQuests > 0 ? 80 + Math.min(activeQuests * 3, 12) : -999,
    title: 'Complete one active quest',
    copy: 'Finishing an objective right now gives immediate XP, gold, and confidence.',
    meta: activeQuests + ' active quest' + (activeQuests > 1 ? 's' : '') + ' available',
    cta: 'OPEN QUESTS'
  });
  actions.push({
    action: 'enter_dungeon',
    score: dungeonUnlocked && !s.dungeonEntered ? 62 : -999,
    title: 'Enter the Forest Dungeon',
    copy: 'Dungeon progression unlocks higher-pressure goals and stronger identity loops.',
    meta: '3-day chain available',
    cta: 'ENTER DUNGEON'
  });
  actions.push({
    action: 'end_day',
    score: s.todayLoggedIn && activeQuests === 0 && failedQuests === 0 ? 45 : -999,
    title: 'Close your day cleanly',
    copy: 'No pending quests left. End day now to keep your system state organized.',
    meta: 'No penalty risk detected',
    cta: '☽ END OF DAY'
  });
  actions.push({
    action: 'open_quests',
    score: 10,
    title: 'Open quest board',
    copy: 'Review your quest board and choose your next mission.',
    meta: 'Build momentum with one clear objective',
    cta: 'OPEN QUESTS'
  });

  return actions.sort((a, b) => b.score - a.score)[0];
}

/* ── Global state reference (set by main.js) ─────────────── */
// All engine functions mutate G.state and call ui.* functions
// G = { state, save }  set by main.js after profile load

/* ════════════════════════════════════════════════════════════
   DAILY LOGIN
════════════════════════════════════════════════════════════ */
function dailyLogin() {
  const s = G.state;
  if (!s) { ui.showToast('System not initialized.','error'); return; }
  if (s.todayLoggedIn) { ui.showToast('Already logged in today.','warn'); return; }

  // ANTICIPATION: Visual charge-up before processing
  const loginBtn = document.getElementById('login-btn');
  
  if (window.VisualEngine && loginBtn) {
    VisualEngine.triggerAnticipation(loginBtn, 'primary', () => {
      _executeDailyLogin(s);
    });
  } else {
    _executeDailyLogin(s);
  }
}

function _executeDailyLogin(s) {
  // Defensive: validate streak bounds
  if (typeof s.loginStreak !== 'number' || isNaN(s.loginStreak)) s.loginStreak = 0;
  s.loginStreak = Math.max(0, Math.min(365, s.loginStreak + 1));

  s.todayLoggedIn   = true;
  s.lastLoginDate   = todayISO();
  s.sRankTodayCount = 0; // reset daily S-rank counter

  // Initialize new session
  startSession();

  // Defensive: ensure XP is valid
  if (typeof s.xp !== 'number' || isNaN(s.xp)) s.xp = 0;
  s.xp = Math.max(0, Math.min(10000, s.xp));

  // Login bonus XP (with variable randomization for dopamine optimization)
  const baseBonus = 5 + Math.floor(Math.random() * 11);
  const streakMultiplier = Math.min(2, 1 + (s.loginStreak * 0.05)); // Up to 2x for streaks
  const bonusXP = round(baseBonus * streakMultiplier);
  s.xp = round(s.xp + bonusXP);
  s.xp = Math.min(10000, s.xp); // Cap after adding

  pushXPHistory(bonusXP, false, 'Daily Login bonus (streak x' + streakMultiplier.toFixed(1) + ')');

  G.save();
  ui.applyState(s);
  ui.startEODTimer();
  
  // Particle burst on login
  if (window.VisualEngine) {
    const header = document.getElementById('header-hunter-name');
    if (header) {
      const rect = header.getBoundingClientRect();
      VisualEngine.spawnBurst(rect.left + rect.width/2, rect.top + rect.height, 25, {
        type: 'mana',
        colors: ['#9900ff', '#ff00cc', '#6600ff'],
        spread: 180,
        speed: 2
      });
    }
  }
  
  checkLevelUp();
  checkRankUp();
  checkAchievements();

  ui.showSysModal('DAILY LOGIN',
    '<div>Cause: <span class="hl">Daily Login</span></div>' +
    '<div>Effect: <span class="hl-green">+' + bonusXP + ' XP</span> bonus granted</div>' +
    (s.loginStreak > 1 ? '<div>Streak Bonus: <span class="hl">x' + streakMultiplier.toFixed(1) + '</span></div>' : '') +
    '<div>Streak: <span class="hl">' + s.loginStreak + ' day' + (s.loginStreak > 1 ? 's' : '') + '</span></div><br>' +
    '<div class="hl sys-green-text" style="font-size:11px;letter-spacing:0.2em;">DO YOUR BEST, HUNTER.</div>'
  );
}

/* ════════════════════════════════════════════════════════════
   QUEST FUNCTIONS
════════════════════════════════════════════════════════════ */
function addQuest(sourceInputId) {
  const s = G.state;
  if (!s) { ui.showToast('System not initialized.','error'); return; }
  if (!s.todayLoggedIn) { ui.showToast('System: Daily Login required.','warn'); return; }
  const preferredId = sourceInputId || '';
  const candidates = [
    preferredId,
    'quest-name-input-hq',
    'quest-name-input'
  ].filter(Boolean);
  let activeInput = null;
  let name = '';
  for (const id of candidates) {
    const el = document.getElementById(id);
    const value = el ? el.value.trim() : '';
    if (value) {
      activeInput = el;
      name = value;
      break;
    }
  }
  if (!name) { ui.showToast('Enter a mission objective.','warn'); return; }
  s.quests.push({ name, completed:false, failed:false, tier: G.selectedTier });
  
  // Phase 1-5: Notify Adaptive Engine
  if (window.AdaptiveEngine) AdaptiveEngine.recordTaskAdded();

  if (activeInput) activeInput.value = '';
  const qInput = document.getElementById('quest-name-input');
  const hqInput = document.getElementById('quest-name-input-hq');
  if (qInput && qInput !== activeInput) qInput.value = '';
  if (hqInput && hqInput !== activeInput) hqInput.value = '';
  G.save();
  ui.renderQuests(s);
  ui.updateMissionControl?.(s);
  ui.showToast('Cause: Registered quest. Effect: Mission added to active board.','info');
}

function addQuestHQ() {
  addQuest('quest-name-input-hq');
}

function updateHunterName() {
  const s = G.state;
  if (!s) return;
  const input = document.getElementById('hunter-name-input-inline');
  const next = input ? input.value.trim() : '';
  if (!next) { ui.showToast('Enter a hunter designation first.','warn'); return; }
  if (!/^[a-zA-Z0-9_\- ]+$/.test(next)) {
    ui.showToast('Letters, numbers, spaces, _ and - only.','warn');
    return;
  }
  s.hunter = next;
  G.save();
  ui.applyState(s);
  if (input) input.value = '';
  ui.showToast('Designation updated. System profile synced.','success');
}

function useTemplate(questName) {
  const s = G.state;
  if (!s) { ui.showToast('System not initialized.','error'); return; }
  if (!s.todayLoggedIn) { ui.showToast('System: Daily Login required.','warn'); return; }
  if (!Array.isArray(s.quests)) s.quests = [];
  s.quests.push({ name: questName.trim(), completed:false, failed:false, tier: G.selectedTier });
  
  // Phase 1-5: Notify Adaptive Engine
  if (window.AdaptiveEngine) AdaptiveEngine.recordTaskAdded();

  G.save();
  ui.renderQuests(s);
  ui.showToast('Cause: Template selected. Effect: Mission added to active board.','info');
}

function completeQuest(i) {
  const s = G.state;
  if (!s) { ui.showToast('System not initialized.','error'); return; }
  // Defensive: validate index and quest existence
  if (!Array.isArray(s.quests) || i < 0 || i >= s.quests.length) {
    ui.showToast('Invalid quest reference.','error'); return;
  }
  const quest = s.quests[i];
  if (!quest || quest.completed || quest.failed) return;

  // Get the quest row element for anticipation animation
  const questRow = document.querySelector('.quest-row[data-index="' + i + '"]');
  
  // Calculate rewards early for anticipation
  const tier    = (['E','N','H','S'].indexOf(quest.tier) !== -1) ? quest.tier : 'N';
  const rew     = TIER_REWARDS[tier];
  
  // Phase 3: Invisible Difficulty Scaling
  let critChance = 0.25;
  let xpMultiplier = 1.0;
  if (window.AdaptiveEngine) {
    const scale = AdaptiveEngine.getDifficultyScaling(s);
    critChance = Math.max(0.05, Math.min(0.5, critChance + scale.critBonus));
    xpMultiplier = scale.xpMult;
  }
  
  const isCrit  = Math.random() < critChance;
  
  // Shadow Infusion integration: Scales Crit Multiplier infinitely
  const baseCritMult = 2.0;
  const infusionMult = s.shadowInfusionLevel ? (s.shadowInfusionLevel * 0.1) : 0;
  const activeCritMult = baseCritMult + infusionMult;
  
  const xpGain  = Math.round((isCrit ? rew.xp * activeCritMult : rew.xp) * xpMultiplier);
  const gldGain = isCrit ? Math.round(rew.gold * activeCritMult) : rew.gold;

  // Record action for combo system BEFORE processing
  const comboState = window.VisualEngine ? VisualEngine.recordAction('quest', isCrit ? 2 : 1) : { multiplier: 1 };
  const finalXpGain = Math.round(xpGain * comboState.multiplier);
  const finalGldGain = Math.round(gldGain * comboState.multiplier);

  // ANTICIPATION PHASE: Apply visual charge-up before reward
  if (window.VisualEngine && questRow) {
    VisualEngine.triggerAnticipation(questRow, isCrit ? 'crit' : 'quest', () => {
      // REWARD PHASE: Execute after anticipation delay
      _executeQuestReward(s, quest, i, tier, finalXpGain, finalGldGain, isCrit, comboState);
    });
  } else {
    // Fallback: Immediate execution if visual engine not available
    _executeQuestReward(s, quest, i, tier, finalXpGain, finalGldGain, isCrit, comboState);
  }
}

// Separated reward execution for anticipation timing
function _executeQuestReward(s, quest, i, tier, xpGain, gldGain, isCrit, comboState) {
  // Defensive: ensure XP/Gold are valid before adding
  if (typeof s.xp !== 'number' || isNaN(s.xp)) s.xp = 0;
  if (typeof s.gold !== 'number' || isNaN(s.gold)) s.gold = 0;
  s.xp = Math.max(0, Math.min(10000, s.xp));
  s.gold = Math.max(0, Math.min(5000, s.gold));

  quest.completed = true;
  s.xp   = round(Math.min(10000, s.xp + xpGain));
  s.gold = round(Math.min(5000, s.gold + gldGain));
  s.questsCompletedTotal = Math.min(10000, (s.questsCompletedTotal || 0) + 1);
  if (isCrit) s.critHitsTotal = Math.min(10000, (s.critHitsTotal || 0) + 1);
  if (tier === 'S') s.sRankTodayCount = Math.min(100, (s.sRankTodayCount || 0) + 1);

  // Session tracking (Visual Engine v6.0)
  s.lastActionTime = new Date().toISOString();
  s.questsCompletedThisSession = (s.questsCompletedThisSession || 0) + 1;
  s.sessionXPGained = (s.sessionXPGained || 0) + xpGain;
  if (comboState.count > (s.peakCombo || 0)) s.peakCombo = comboState.count;
  
  // Adaptive difficulty: adjust based on session performance
  _updateAdaptiveDifficulty(s);

  // Phase 1-5: Notify Adaptive Engine
  if (window.AdaptiveEngine) AdaptiveEngine.recordTaskCompleted(i, isCrit);

  pushXPHistory(xpGain, isCrit, tier + '-tier quest completion' + (comboState.multiplier > 1 ? ' (x' + comboState.multiplier + ' combo)' : ''));
  G.save();
  
  // Update momentum bar display
  _updateMomentumBarDisplay(comboState.momentum);

  // Visual effects
  ui.spawnXPFloat(xpGain, isCrit);
  ui.questCompleteAnim(i);
  if (isCrit) ui.triggerCritHit();
  ui.triggerQuestClearFlash();
  ui.updateStatDisplays(s);

  // Particle burst from XP/Gold displays
  if (window.VisualEngine) {
    const xpEl = document.getElementById('xp-display');
    const goldEl = document.getElementById('gold-display');
    if (xpEl) {
      const rect = xpEl.getBoundingClientRect();
      VisualEngine.spawnBurst(rect.left + rect.width/2, rect.top + rect.height/2, 15, {
        type: 'xp',
        colors: ['#66ff00', '#00ff88', '#aaff00'],
        spread: 100,
        speed: 1.5
      });
    }
    if (goldEl && gldGain > 0) {
      const rect = goldEl.getBoundingClientRect();
      VisualEngine.spawnBurst(rect.left + rect.width/2, rect.top + rect.height/2, 12, {
        type: 'gold',
        colors: ['#ffd700', '#ffaa00', '#ffee88'],
        spread: 80,
        speed: 1.2
      });
    }
  }

  // Show combo feedback if active
  if (comboState.multiplier > 1) {
    ui.showToast('◈ COMBO x' + comboState.multiplier + '! +' + xpGain + ' XP', 'success');
  }

  // Check for random reward event
  if (window.VisualEngine) {
    const rewardEvent = VisualEngine.checkRandomReward('quest_complete');
    if (rewardEvent) {
      // Apply event multiplier to this reward retroactively
      const bonusXP = Math.round(xpGain * (rewardEvent.multiplier - 1));
      if (bonusXP > 0) {
        s.xp = round(Math.min(10000, s.xp + bonusXP));
        setTimeout(() => {
          ui.showToast('◈ ' + rewardEvent.name + ' BONUS: +' + bonusXP + ' XP', 'success');
          ui.spawnXPFloat(bonusXP, true);
        }, 1500);
      }
    }
  }

  checkLevelUp();
  checkRankUp();
  checkBonusGate();
  checkAchievements();

  ui.showSysModal(
    isCrit ? '◈ CRITICAL STRIKE' : '◈ QUEST COMPLETE',
    isCrit
      ? '<div>CRITICAL STRIKE!</div><br>' +
        '<div>Cause: Quest complete + Critical proc</div>' +
        '<div>Effect: <span class="hl-green">+' + xpGain + ' XP (x2)</span></div>' +
        '<div>Effect: <span class="hl-gold">+' + gldGain + ' Gold (x2)</span></div>' +
        (comboState.multiplier > 1 ? '<div>Combo: <span class="hl">x' + comboState.multiplier + '</span></div><br>' : '<br>') +
        '<div class="hl" style="font-size:11px;">Shadow power awakened.</div>'
      : '<div>Cause: ' + tier + '-tier objective completed</div>' +
        '<div>Effect: <span class="hl-green">+' + xpGain + ' XP</span></div>' +
        '<div>Effect: <span class="hl-gold">+' + gldGain + ' Gold</span></div>' +
        (comboState.multiplier > 1 ? '<div>Combo: <span class="hl">x' + comboState.multiplier + '</span></div><br>' : '<br>') +
        '<div style="font-size:11px;color:var(--text-2);margin-top:8px;">[' + escapeHTML(tier) + '] tier applied.</div>'
  );
}

function failQuest(i) {
  const s = G.state;
  if (!s) { ui.showToast('System not initialized.','error'); return; }
  // Defensive: validate index and quest existence
  if (!Array.isArray(s.quests) || i < 0 || i >= s.quests.length) {
    ui.showToast('Invalid quest reference.','error'); return;
  }
  const quest = s.quests[i];
  if (!quest || quest.completed || quest.failed) return;

  quest.failed = true;
  G.save();
  ui.renderQuests(s);
  ui.showToast('Cause: Quest marked failed. Effect: End-of-day penalty risk increased.','error');
}

/* ════════════════════════════════════════════════════════════
   END OF DAY
════════════════════════════════════════════════════════════ */
function endOfDay() {
  const s = G.state;
  if (!s) { ui.showToast('System not initialized.','error'); return; }
  const origXP = s.xp || 0, origGold = s.gold || 0;
  let failed = 0;
  if (Array.isArray(s.quests)) {
    s.quests.forEach(q => { if (q.failed) failed++; });
  }

  let penaltyRate = -0.005 * failed;
  
  // Arsenal Integration: Armor (+1) reduces EOD penalty by 50%
  if (s.ownsArmor) {
    penaltyRate = penaltyRate / 2;
  }
  
  s.xp   = Math.max(0, round(s.xp   * (1 + penaltyRate)));
  s.gold = Math.max(0, round(s.gold * (1 + penaltyRate)));

  if (failed > 0) pushXPHistory(round(s.xp - origXP), false, 'End-of-day failed quest penalty' + (s.ownsArmor ? ' (Armor Mitigated)' : ''));
  if (s.dungeonEntered && s.dungeonDaysCompleted < 3) s.dungeonDaysCompleted++;

  G.save();
  ui.updateStatDisplays(s);
  ui.updateShopDisplay(s);
  ui.updateDungeonProgressBar(s);
  checkLevelUp();
  checkRankUp();
  checkAchievements();

  ui.showEODSummary({
    origXP, origGold, failed,
    penalty: (penaltyRate * 100).toFixed(1),
    finalXP: s.xp, finalGold: s.gold
  });
}

function endDaySimulation() {
  const s = G.state;
  if (!s) { ui.showToast('System not initialized.','error'); return; }
  s.todayLoggedIn = false;
  s.quests = [];
  G.save();
  ui.applyState(s);
  ui.showToast('Cause: New Day Simulation. Effect: Daily status reset for planning.','info');
}

/* ════════════════════════════════════════════════════════════
   LEVEL + RANK
════════════════════════════════════════════════════════════ */
function checkLevelUp() {
  const s = G.state;
  // Defensive: ensure XP is within valid bounds
  if (typeof s.xp !== 'number' || isNaN(s.xp)) s.xp = 0;
  s.xp = Math.max(0, Math.min(10000, s.xp));

  const prevLevel = s.level;
  if      (s.xp >= 700) s.level = 5;
  else if (s.xp >= 450) s.level = 4;
  else if (s.xp >= 250) s.level = 3;
  else if (s.xp >= 100) s.level = 2;
  else                   s.level = 1;

  // Ensure level is always valid
  s.level = Math.max(1, Math.min(5, s.level));

  if (s.level > prevLevel) {
    G.save();
    ui.triggerLevelUp(s.level);
  }
  ui.updateXPBar(s);
  ui.updateSkillTree(s);
  ui.updateQuickStats(s);
}

function checkRankUp() {
  const s = G.state;
  // Defensive: ensure values are valid
  if (typeof s.xp !== 'number' || isNaN(s.xp)) s.xp = 0;
  if (typeof s.gold !== 'number' || isNaN(s.gold)) s.gold = 0;
  s.xp = Math.max(0, Math.min(10000, s.xp));
  s.gold = Math.max(0, Math.min(5000, s.gold));

  const prevRank  = s.rank;
  const prevOrder = RANK_ORDER.indexOf(prevRank);

  if      (s.xp >= 1000 && s.gold >= 100) s.rank = 'A';
  else if (s.xp >= 500  && s.gold >= 50)  s.rank = 'M';
  else                                      s.rank = 'K';

  const newOrder = RANK_ORDER.indexOf(s.rank);
  if (newOrder > prevOrder) {
    G.save();
    ui.triggerRankUp(s.rank, prevRank);
    ui.showToast('Cause: XP + Gold thresholds met. Effect: Rank promoted to ' + s.rank + '.', 'success');
  }
  ui.updateRankHex(s);
  ui.updateDungeonStatus(s);
  ui.updateGoldBar(s);
  ui.updateQuickStats(s);
}

/* ════════════════════════════════════════════════════════════
   BONUS GATE
════════════════════════════════════════════════════════════ */
let _pendingGateReward = null;

function checkBonusGate() {
  const s = G.state;
  if (!s) return;
  if (!s.gatesTriggered) s.gatesTriggered = {};
  for (let i = 0; i < GATE_THRESHOLDS.length; i++) {
    const thr = GATE_THRESHOLDS[i];
    if ((s.xp || 0) >= thr && !s.gatesTriggered[thr]) {
      s.gatesTriggered[thr] = true;
      s.pendingGate = true;
      G.save();
      ui.showBonusGateIndicator('XP milestone ' + thr + ' reached');
      break;
    }
  }
}

function triggerBonusGate() {
  const s = G.state;
  if (!s || !s.pendingGate) return;
  const idx = Math.floor(Math.random() * GATE_REWARDS.length);
  _pendingGateReward = GATE_REWARDS[idx];
  ui.showBonusGatePanel(_pendingGateReward.label);
  s.pendingGate = false;
  G.save();
}

function openGate() {
  const s = G.state;
  if (!s || !_pendingGateReward) return;
  const rewardLabel = _pendingGateReward.label; // capture before nullify
  _pendingGateReward.apply(s);
  pushXPHistory(0, false, 'Bonus Gate reward: ' + rewardLabel);
  s.gatesOpenedTotal++;
  _pendingGateReward = null;
  G.save();
  ui.closeBonusGatePanel({ label: rewardLabel }); // pass captured label
  ui.updateStatDisplays(s);
  checkLevelUp();
  checkRankUp();
  checkAchievements();
}

/* ════════════════════════════════════════════════════════════
   ACHIEVEMENTS
════════════════════════════════════════════════════════════ */
function checkAchievements() {
  const s = G.state;
  if (!s) return;
  if (!s.unlockedAchievements) s.unlockedAchievements = {};
  let anyNew = false;
  ACHIEVEMENTS.forEach(a => {
    if (!s.unlockedAchievements[a.id] && a.check(s)) {
      s.unlockedAchievements[a.id] = true;
      anyNew = true;
      ui.showToast(
        a.hidden ? '◈ CLASSIFIED TITLE UNLOCKED: ' + a.name : '◈ Title Unlocked: ' + a.name,
        'success'
      );
      if (a.hidden) ui.triggerHiddenAchievementReveal(a);
    }
  });
  if (anyNew) G.save();
  ui.renderAchievements(s);
}

/* ════════════════════════════════════════════════════════════
   SHOP / ARSENAL
════════════════════════════════════════════════════════════ */
function buyItem(item) {
  const s = G.state;
  if (!s) { ui.showToast('System not initialized.','error'); return; }
  
  // Base items
  const items = {
    sword:  { cost:50,  key:'ownsSword',        icon:'⚔', name:'Shadow Blade +1' },
    armor:  { cost:75,  key:'ownsArmor',         icon:'◆', name:'Monarch Armor +1' },
    shield: { cost:30,  key:'ownsStreakShield',   icon:'◇', name:'Streak Shield'   }
  };
  
  if (item === 'shadow_infusion') {
    // Infinite Scaling Sink: Shadow Infusion
    s.shadowInfusionLevel = s.shadowInfusionLevel || 0;
    
    // Exponential cost scaling: 100, 150, 225, 337, 506...
    const cost = Math.floor(100 * Math.pow(1.5, s.shadowInfusionLevel));
    
    if (s.gold < cost) {
      ui.showToast('Cause: Not enough gold. Effect: Infusion failed. Need ' + cost + ' Gold.','error');
      return;
    }
    
    s.gold -= cost;
    s.shadowInfusionLevel++;
    G.save();
    
    ui.updateStatDisplays(s);
    ui.updateShopDisplay(s);
    
    ui.showSysModal('SHADOW INFUSION',
      '<div>Cause: Essence consumed</div>' +
      '<div>Effect: Base Momentum multiplier permanently increased</div><br>' +
      '<div class="hl">⬡ Infusion Level ' + s.shadowInfusionLevel + '</div><br>' +
      '<div>Gold spent: <span class="hl-gold">' + cost + '</span></div>'
    );
    return;
  }

  const cfg = items[item];
  if (!cfg) return;
  if (s[cfg.key]) { ui.showToast('Cause: Item already owned. Effect: Purchase blocked.','warn'); return; }
  if (s.gold < cfg.cost) { ui.showToast('Cause: Not enough gold. Effect: Purchase blocked. Need ' + cfg.cost + '.','error'); return; }

  s.gold -= cfg.cost;
  s[cfg.key] = true;
  G.save();
  ui.updateStatDisplays(s);
  ui.updateShopDisplay(s);
  checkRankUp();

  ui.showSysModal('ACQUISITION',
    '<div>Cause: Shop purchase confirmed</div>' +
    '<div>Effect: Item equipped immediately</div><br>' +
    '<div class="hl">' + cfg.icon + ' ' + escapeHTML(cfg.name) + '</div><br>' +
    '<div>Gold spent: <span class="hl-gold">' + cfg.cost + '</span></div>'
  );
}

/* ════════════════════════════════════════════════════════════
   DUNGEON
════════════════════════════════════════════════════════════ */
function startForestDungeon() {
  const s = G.state;
  if (!s) { ui.showToast('System not initialized.','error'); return; }
  s.dungeonEntered = true;
  G.save();
  checkAchievements();
  ui.updateDungeonProgressBar(s);

  document.getElementById('forest-quest-list')?.classList.add('show');
  document.getElementById('boss-silhouette')?.classList.add('show');

  ui.showSysModal('DUNGEON ENTERED',
    '<div>Forest Dungeon — <span class="hl">ACTIVE</span></div><br>' +
    '<div>A 3-day chain awaits.</div>' +
    '<div>The Forest Guardian stirs.</div><br>' +
    '<div class="hl-red" style="font-size:11px;letter-spacing:0.2em;">TREAD CAREFULLY, HUNTER.</div>'
  );
}

/* ════════════════════════════════════════════════════════════
   TIER SELECTOR
════════════════════════════════════════════════════════════ */
function selectTier(tier) {
  G.selectedTier = tier;
  document.querySelectorAll('.tier-btn').forEach(b => {
    b.classList.toggle('active-tier', b.dataset.tier === tier);
  });
}

/* ════════════════════════════════════════════════════════════
   RESET PROFILE
════════════════════════════════════════════════════════════ */
function initiateReset() {
  const s     = G.state;
  if (!s) { ui.showToast('System not initialized.','error'); return; }
  const check = canReset(s);

  if (!check.ok) {
    ui.showSysModal('RESET LOCKED',
      '<div class="hl-red">Cooldown active.</div><br>' +
      '<div>Next reset available in <span class="hl">' + check.hoursLeft + 'h</span>.</div><br>' +
      '<div style="font-size:11px;color:var(--text-2);">The System does not forgive impatience.</div>'
    );
    return;
  }

  const pen = getPenalty(s);
  ui.showResetConfirmModal(s, pen);
}

function confirmReset(newName) {
  if (!G.state) { ui.showToast('System not initialized.','error'); return; }
  const fresh = executeReset(G.state, newName || G.state.hunter || 'Hunter');
  G.state = fresh;
  G.save();
  ui.applyState(fresh);
  ui.closeSysModal();
  ui.showToast('Profile reset. The System watches.','warn');
}

/* ════════════════════════════════════════════════════════════
   ADAPTIVE DIFFICULTY & MOMENTUM SYSTEM (Visual Engine v6.0)
════════════════════════════════════════════════════════════ */
function _updateAdaptiveDifficulty(s) {
  // Calculate difficulty based on session performance
  // More quests completed = slightly higher difficulty (more rewarding)
  // Long breaks = lower difficulty (easier to restart)
  
  const sessionQuests = s.questsCompletedThisSession || 0;
  const sessionXP = s.sessionXPGained || 0;
  
  // Base calculation: 1.0 + (quests / 20) + (sessionXP / 500)
  // Cap between 0.5 (easy) and 1.5 (challenging)
  let difficulty = 1.0 + (sessionQuests * 0.02) + (sessionXP * 0.001);
  difficulty = Math.max(0.5, Math.min(1.5, difficulty));
  
  s.adaptiveDifficulty = round(difficulty);
  
  // Visual feedback when difficulty changes significantly
  if (difficulty >= 1.3 && sessionQuests > 5) {
    ui.showToast('◈ Session Intensity: HIGH — Bonus rewards active', 'success');
  }
}

function _updateMomentumBarDisplay(momentum) {
  const bar = document.getElementById('momentum-bar');
  const fill = bar?.querySelector('.momentum-fill');
  
  if (!bar || !fill) return;
  
  // Show bar when momentum exists
  if (momentum > 0.1) {
    bar.classList.add('visible');
    fill.style.width = (momentum * 100) + '%';
    
    // Color shift based on momentum level
    if (momentum > 0.8) {
      fill.style.background = 'linear-gradient(90deg, #ff0040, #ff6600, #ffcc00, #66ff00)';
    } else if (momentum > 0.5) {
      fill.style.background = 'linear-gradient(90deg, #ff6600, #ffcc00)';
    } else {
      fill.style.background = 'linear-gradient(90deg, #ffcc00, #66ff00)';
    }
  } else {
    bar.classList.remove('visible');
  }
}

/* ════════════════════════════════════════════════════════════
   SESSION MANAGEMENT
════════════════════════════════════════════════════════════ */
function startSession() {
  const s = G.state;
  if (!s) return;
  
  s.sessionStartTime = new Date().toISOString();
  s.questsCompletedThisSession = 0;
  s.sessionXPGained = 0;
  s.peakCombo = 0;
  s.adaptiveDifficulty = 1.0;
  G.save();
}

function getSessionStats() {
  const s = G.state;
  if (!s || !s.sessionStartTime) return null;
  
  const start = new Date(s.sessionStartTime);
  const now = new Date();
  const duration = Math.floor((now - start) / 60000); // minutes
  
  return {
    durationMinutes: duration,
    questsCompleted: s.questsCompletedThisSession || 0,
    xpGained: s.sessionXPGained || 0,
    peakCombo: s.peakCombo || 0,
    difficulty: s.adaptiveDifficulty || 1.0,
    efficiency: duration > 0 ? ((s.questsCompletedThisSession || 0) / duration).toFixed(2) : 0
  };
}

/* ════════════════════════════════════════════════════════════
   XP HISTORY
════════════════════════════════════════════════════════════ */
function pushXPHistory(delta, isCrit, reason) {
  const s = G.state;
  if (!s) return;
  if (!Array.isArray(s.xpHistory)) s.xpHistory = [];
  s.xpHistory.push({ d: delta, crit: !!isCrit, reason: reason || 'System update' });
  if (s.xpHistory.length > 5) s.xpHistory.shift();
  ui.renderXPHistory(s);
}
