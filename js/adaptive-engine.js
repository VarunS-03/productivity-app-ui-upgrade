/* ═══════════════════════════════════════════════════════════════
   ADAPTIVE ENGINE v1.0 — REAL-TIME BEHAVIORAL TRACKING
   Phase 1-5 Implementation
═══════════════════════════════════════════════════════════════ */

'use strict';

window.AdaptiveEngine = (function() {
  
  // Phase 1: Real-Time Signal Variables & Thresholds
  const CONFIG = {
    // Thresholds
    IDLE_TIME_MS: 60000,         // 60 seconds
    RAPID_COMPLETION_MS: 30000,  // 30 seconds between tasks is "rapid"
    SLOW_COMPLETION_MS: 300000,  // 5 minutes between tasks is "slow"
    MAX_NUDGES_PER_SESSION: 5,   // Safety Constraint (Phase 5)
    NUDGE_COOLDOWN_MS: 120000,   // 2 minutes between nudges
    
    // UI Colors for Personality Layer (Phase 4)
    COLORS: {
      Neutral: 'var(--primary)',
      Pressure: '#ff3366', // Aggressive red
      Recovery: '#00e6e6'  // Soothing cyan
    }
  };

  let _nudgeCount = 0;
  let _lastNudgeTime = 0;
  let _idleTimer = null;
  let _active = false;

  // Initialize engine on app load
  function init() {
    _active = true;
    _startIdleTracking();
    
    // Attach listeners for any click/keypress to reset idle
    document.addEventListener('click', _resetIdle);
    document.addEventListener('keypress', _resetIdle);
    
    console.log('[System] Adaptive Engine Initialized. Real-Time Tracking Active.');
  }

  function _resetIdle() {
    if (!_active || !G.state || !G.state.todayLoggedIn) return;
    
    const now = Date.now();
    G.state.lastActionTime = new Date(now).toISOString();
    
    clearTimeout(_idleTimer);
    _idleTimer = setTimeout(_handleIdleTimeout, CONFIG.IDLE_TIME_MS);
  }

  function _startIdleTracking() {
    clearTimeout(_idleTimer);
    _idleTimer = setTimeout(_handleIdleTimeout, CONFIG.IDLE_TIME_MS);
  }

  // Phase 2: Live Response - Idle
  function _handleIdleTimeout() {
    if (!_active || !G.state || !G.state.todayLoggedIn) return;
    const activeQuests = G.state.quests.filter(q => !q.completed && !q.failed).length;
    
    if (activeQuests > 0) {
      _triggerNudge('Idle', 'System: One more task to maintain momentum.', 'warn');
    } else {
      _triggerNudge('Idle', 'System: Awaiting new directives. Add a quest.', 'info');
    }
  }

  // Phase 5: Safety Constraints
  function _canNudge() {
    const now = Date.now();
    if (_nudgeCount >= CONFIG.MAX_NUDGES_PER_SESSION) return false;
    if (now - _lastNudgeTime < CONFIG.NUDGE_COOLDOWN_MS) return false;
    return true;
  }

  function _triggerNudge(type, message, typeClass='info') {
    if (!_canNudge()) return;
    _nudgeCount++;
    _lastNudgeTime = Date.now();
    
    // Modify message based on System Mode
    const finalMsg = _applyPersonality(message);
    
    if (window.ui && window.ui.showToast) {
      window.ui.showToast(finalMsg, typeClass);
    }
    
    console.log(`[Adaptive Engine] Triggered Nudge: ${type}`);
  }

  // Phase 4: Personality Layer
  function _applyPersonality(baseMessage) {
    const mode = G.state ? G.state.systemMode : 'Neutral';
    
    if (mode === 'Pressure') {
      document.documentElement.style.setProperty('--primary', CONFIG.COLORS.Pressure);
      document.documentElement.style.setProperty('--primary-glow', 'rgba(255, 51, 102, 0.4)');
      return `[URGENT] ${baseMessage.toUpperCase()} DO NOT STALL.`;
    } 
    else if (mode === 'Recovery') {
      document.documentElement.style.setProperty('--primary', CONFIG.COLORS.Recovery);
      document.documentElement.style.setProperty('--primary-glow', 'rgba(0, 230, 230, 0.4)');
      return `[Support] ${baseMessage} Take it one step at a time.`;
    }
    
    // Neutral
    document.documentElement.style.setProperty('--primary', '#66ff00');
    document.documentElement.style.setProperty('--primary-glow', 'rgba(102, 255, 0, 0.3)');
    return baseMessage;
  }

  function _evaluateSystemMode(s) {
    // Decide if user is performing high (Pressure) or struggling (Recovery)
    const activeQuests = s.quests.filter(q => !q.completed && !q.failed).length;
    const completed = s.questsCompletedThisSession;
    const rapidCount = s.consecutiveRapidCompletions;
    
    if (rapidCount >= 3 || s.peakCombo >= 3) {
      if (s.systemMode !== 'Pressure') {
        s.systemMode = 'Pressure';
        _triggerNudge('ModeSwitch', 'High performance detected. Pressure Mode engaged.');
      }
    } 
    else if (s.tasksAddedThisSession > 0 && completed === 0 && activeQuests >= 4) {
      if (s.systemMode !== 'Recovery') {
        s.systemMode = 'Recovery';
        _triggerNudge('ModeSwitch', 'Task overload detected. Recovery Mode engaged.');
      }
    } 
    else {
      s.systemMode = 'Neutral';
    }
    
    _applyPersonality(''); // Update CSS variables silently
  }

  // Called when a task is added
  function recordTaskAdded() {
    if (!G.state) return;
    G.state.tasksAddedThisSession++;
    
    // Phase 2: Rapid add but no complete -> Suggest simplifying
    const activeQuests = G.state.quests.filter(q => !q.completed && !q.failed).length;
    if (G.state.tasksAddedThisSession >= 4 && G.state.questsCompletedThisSession === 0 && activeQuests >= 4) {
      _triggerNudge('Overload', 'System: High task volume detected. Consider splitting large tasks into smaller E-tier tasks.', 'warn');
    }
    
    _evaluateSystemMode(G.state);
    _resetIdle();
  }

  // Called when a task is completed
  function recordTaskCompleted(questIndex, isCrit) {
    if (!G.state) return;
    const now = Date.now();
    const s = G.state;
    
    // Calculate time since last quest
    if (s.lastQuestCompletionTime) {
      const duration = now - new Date(s.lastQuestCompletionTime).getTime();
      s.timeBetweenQuests.push(duration);
      if (s.timeBetweenQuests.length > 5) s.timeBetweenQuests.shift();
      
      // Phase 2: Live Response - Rapid completion
      if (duration <= CONFIG.RAPID_COMPLETION_MS) {
        s.consecutiveRapidCompletions++;
        if (s.consecutiveRapidCompletions === 2) {
          _triggerNudge('Momentum', 'Momentum Burn Active! Double XP window open.', 'success');
          // Apply a temporary 10-second buff in VisualEngine if available
          if (window.VisualEngine && typeof VisualEngine.activateMomentumBurn === 'function') {
            VisualEngine.activateMomentumBurn();
          }
        }
      } else {
        s.consecutiveRapidCompletions = 0;
        // Phase 2: Slow down after 1 task -> highlight easiest
        if (duration >= CONFIG.SLOW_COMPLETION_MS) {
          _triggerNudge('Slowdown', 'Pace dropping. Highlighting optimal next target.', 'info');
          _highlightEasiestTask();
        }
      }
    } else {
      s.consecutiveRapidCompletions = 1;
    }
    
    s.lastQuestCompletionTime = new Date(now).toISOString();
    
    _evaluateSystemMode(s);
    _resetIdle();
    
    return getDifficultyScaling(s);
  }

  // Phase 2: Highlight easiest task
  function _highlightEasiestTask() {
    if (!G.state) return;
    const activeIndices = [];
    G.state.quests.forEach((q, i) => {
      if (!q.completed && !q.failed) activeIndices.push({i, tier: q.tier});
    });
    
    if (activeIndices.length === 0) return;
    
    // Sort by E -> N -> H -> S
    const tierWeights = { 'E': 1, 'N': 2, 'H': 3, 'S': 4 };
    activeIndices.sort((a, b) => tierWeights[a.tier] - tierWeights[b.tier]);
    
    const easiestIndex = activeIndices[0].i;
    const row = document.querySelector(`.quest-row[data-index="${easiestIndex}"]`);
    if (row) {
      row.style.boxShadow = '0 0 15px var(--primary)';
      row.style.borderColor = 'var(--primary)';
      setTimeout(() => {
        row.style.boxShadow = '';
        row.style.borderColor = '';
      }, 5000);
    }
  }

  // Phase 3: Invisible Difficulty Scaling
  // Adjusts XP and Crit probability based on tracking
  function getDifficultyScaling(s) {
    let xpMult = 1.0;
    let critBonus = 0.0; // Added to base 0.25
    
    if (s.systemMode === 'Pressure') {
      // Harder to crit, but more XP when you do
      critBonus = -0.05; 
      xpMult = 1.2;
    } else if (s.systemMode === 'Recovery') {
      // Easier to crit to boost morale
      critBonus = 0.15;
      xpMult = 1.1; // Small pity boost
    } else {
      // Neutral - check time between quests for micro adjustments
      const avgTime = s.timeBetweenQuests.length > 0 
        ? s.timeBetweenQuests.reduce((a,b)=>a+b,0) / s.timeBetweenQuests.length 
        : 0;
        
      if (avgTime > 0 && avgTime < CONFIG.RAPID_COMPLETION_MS) {
        // Doing great, slight nerf to keep in flow (prevent OP scaling)
        critBonus = -0.02;
      } else if (avgTime > CONFIG.SLOW_COMPLETION_MS) {
        // Struggling, slight buff
        critBonus = 0.05;
      }
    }
    
    // Arsenal Integration: Sword (+1) provides persistent scaling buffs
    if (s.ownsSword) {
      critBonus += 0.05; // +5% flat Crit Chance
      xpMult += 0.1;     // +0.1x flat XP Multiplier
    }
    
    return { xpMult, critBonus };
  }

  return {
    init,
    recordTaskAdded,
    recordTaskCompleted,
    getDifficultyScaling
  };

})();
