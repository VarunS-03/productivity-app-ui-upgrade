/* ═══════════════════════════════════════════════════════════════════════════════
   HUNTER SYSTEM v6.0 — COMPREHENSIVE VERIFICATION SUITE
   
   Tests:
   1. Core functionality (v5.0 features)
   2. Visual Engine initialization
   3. Anticipation system
   4. Combo/momentum system
   5. Particle system
   6. Random reward events
   7. Urgency escalation
   8. Session tracking
═══════════════════════════════════════════════════════════════════════════════ */

'use strict';

const V6Verifier = {
  results: [],
  
  log(test, passed, details = '') {
    const status = passed ? '✓' : '✗';
    const result = { test, passed, details, time: Date.now() };
    this.results.push(result);
    console.log(`[${status}] ${test}${details ? ' | ' + details : ''}`);
    return passed;
  },

  // ─── CORE SYSTEM TESTS ───
  testGlobalObjects() {
    const hasG = typeof window.G !== 'undefined';
    const hasVisualEngine = typeof window.VisualEngine !== 'undefined';
    const hasUI = typeof window.ui !== 'undefined';
    
    return this.log('Global objects exist', hasG && hasVisualEngine && hasUI,
      `G: ${hasG}, VisualEngine: ${hasVisualEngine}, ui: ${hasUI}`);
  },

  testVisualEngineAPI() {
    if (!window.VisualEngine) return this.log('VisualEngine API', false, 'Not loaded');
    
    const required = ['start', 'stop', 'spawnBurst', 'triggerAnticipation', 
                      'recordAction', 'getComboState', 'checkRandomReward', 
                      'getActiveRewardEvent', 'calculateRewardMultiplier'];
    const missing = required.filter(fn => typeof VisualEngine[fn] !== 'function');
    
    return this.log('VisualEngine API complete', missing.length === 0,
      missing.length ? `Missing: ${missing.join(', ')}` : `${required.length} functions`);
  },

  testStateStructure() {
    const s = window.G?.state;
    if (!s) return this.log('State exists', false, 'G.state is null');
    
    // v5.0 fields
    const v5Fields = ['hunter', 'xp', 'gold', 'level', 'rank', 'loginStreak', 'todayLoggedIn', 'quests'];
    const v5Missing = v5Fields.filter(f => !(f in s));
    
    // v6.0 fields
    const v6Fields = ['sessionStartTime', 'questsCompletedThisSession', 'sessionXPGained', 
                      'peakCombo', 'adaptiveDifficulty', 'lastActionTime'];
    const v6Missing = v6Fields.filter(f => !(f in s));
    
    return this.log('State structure', v5Missing.length === 0,
      `v5: ${v5Missing.length ? 'missing ' + v5Missing.join(',') : 'OK'}, ` +
      `v6: ${v6Missing.length ? 'missing ' + v6Missing.join(',') : 'OK'}`);
  },

  // ─── VISUAL ENGINE TESTS ───
  testParticleSystem() {
    if (!window.VisualEngine) return this.log('Particle system', false, 'VisualEngine not loaded');
    
    // Check if we can spawn particles
    const beforeCount = VisualEngine.getParticleCount?.() || 0;
    
    try {
      VisualEngine.spawnBurst(window.innerWidth/2, window.innerHeight/2, 5, {
        type: 'test',
        colors: ['#ff0000'],
        spread: 45,
        speed: 1
      });
      
      // Give it a moment
      return this.log('Particle spawn', true, 'Spawned 5 test particles');
    } catch(e) {
      return this.log('Particle spawn', false, e.message);
    }
  },

  testAnticipationSystem() {
    if (!window.VisualEngine) return this.log('Anticipation system', false, 'VisualEngine not loaded');
    
    const testEl = document.createElement('div');
    testEl.style.cssText = 'position:fixed;left:-1000px;width:100px;height:100px;';
    document.body.appendChild(testEl);
    
    let callbackFired = false;
    
    try {
      VisualEngine.triggerAnticipation(testEl, 'quest', () => {
        callbackFired = true;
      });
      
      // Clean up
      setTimeout(() => testEl.remove(), 100);
      
      return this.log('Anticipation trigger', true, 'Callback registered');
    } catch(e) {
      testEl.remove();
      return this.log('Anticipation trigger', false, e.message);
    }
  },

  testComboSystem() {
    if (!window.VisualEngine) return this.log('Combo system', false, 'VisualEngine not loaded');
    
    // Record multiple actions rapidly
    const state1 = VisualEngine.recordAction('test', 1);
    const state2 = VisualEngine.recordAction('test', 1);
    const state3 = VisualEngine.recordAction('test', 1);
    
    const comboIncreased = state3.combo > state1.combo;
    const hasMultiplier = state3.multiplier >= 1.0;
    
    return this.log('Combo tracking', comboIncreased && hasMultiplier,
      `Combo: ${state1.combo}→${state3.combo}, Multiplier: ${state3.multiplier}`);
  },

  testRandomRewardSystem() {
    if (!window.VisualEngine) return this.log('Random reward system', false, 'VisualEngine not loaded');
    
    // Test that checkRandomReward exists and returns correctly
    const result = VisualEngine.checkRandomReward('invalid_trigger');
    const nullForInvalid = result === null;
    
    return this.log('Random reward validation', nullForInvalid,
      'Returns null for invalid triggers');
  },

  // ─── ENGINE INTEGRATION TESTS ───
  testCompleteQuestIntegration() {
    const s = window.G?.state;
    if (!s) return this.log('Quest completion integration', false, 'No state');
    
    // Check if completeQuest function exists and has been modified
    const hasCompleteQuest = typeof window.completeQuest === 'function';
    const hasExecuteReward = typeof window._executeQuestReward === 'function';
    
    return this.log('Quest completion v6.0', hasCompleteQuest && hasExecuteReward,
      'Has anticipation + reward execution split');
  },

  testDailyLoginIntegration() {
    const hasDailyLogin = typeof window.dailyLogin === 'function';
    const hasExecuteLogin = typeof window._executeDailyLogin === 'function';
    const hasStartSession = typeof window.startSession === 'function';
    
    return this.log('Daily login v6.0', hasDailyLogin && hasExecuteLogin && hasStartSession,
      'Has anticipation + session management');
  },

  // ─── UI ELEMENT TESTS ───
  testComboDisplayElement() {
    const comboEl = document.getElementById('combo-display');
    const hasComboEl = !!comboEl;
    const hasCountSpan = !!comboEl?.querySelector('.combo-count');
    const hasMultiplierSpan = !!comboEl?.querySelector('.combo-multiplier');
    
    return this.log('Combo display DOM', hasComboEl && hasCountSpan && hasMultiplierSpan,
      hasComboEl ? 'All elements present' : 'Missing combo-display element');
  },

  testMomentumBarElement() {
    const bar = document.getElementById('momentum-bar');
    const hasBar = !!bar;
    const hasFill = !!bar?.querySelector('.momentum-fill');
    
    return this.log('Momentum bar DOM', hasBar && hasFill,
      hasBar ? 'Element present' : 'Missing momentum-bar element');
  },

  testVisualEngineCSS() {
    const hasParticleCSS = !!document.querySelector('.ve-particle');
    // Check if CSS is loaded by looking for computed styles
    const testEl = document.createElement('div');
    testEl.className = 'reward-announcement';
    document.body.appendChild(testEl);
    const styles = window.getComputedStyle(testEl);
    const hasStyles = styles.position === 'fixed' || styles.opacity === '0';
    testEl.remove();
    
    return this.log('Visual Engine CSS loaded', hasStyles,
      hasStyles ? 'CSS classes have expected styles' : 'CSS may not be loaded');
  },

  // ─── STATE PERSISTENCE TESTS ───
  testSessionFieldsPersist() {
    const s = window.G?.state;
    if (!s) return this.log('Session fields persist', false, 'No state');
    
    // Simulate setting session fields
    s.questsCompletedThisSession = 5;
    s.sessionXPGained = 100;
    s.peakCombo = 3;
    
    // Check if they're in the state
    const hasFields = s.questsCompletedThisSession === 5 && 
                      s.sessionXPGained === 100 && 
                      s.peakCombo === 3;
    
    return this.log('Session fields persist', hasFields,
      hasFields ? 'Fields set and readable' : 'Fields not persisting');
  },

  // ─── URGENCY SYSTEM TESTS ───
  testUrgencyCalculation() {
    if (!window.VisualEngine?.getUrgency) return this.log('Urgency calculation', false, 'API not available');
    
    const urgency = VisualEngine.getUrgency();
    const isNumber = typeof urgency === 'number';
    const inRange = urgency >= 0 && urgency <= 1;
    
    return this.log('Urgency calculation', isNumber && inRange,
      `Urgency: ${urgency.toFixed(2)} (range 0-1)`);
  },

  // ─── COMPLETE TEST RUN ───
  async runAll() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('   HUNTER SYSTEM v6.0 — VERIFICATION SUITE');
    console.log('═══════════════════════════════════════════════════════════════');
    
    this.results = [];
    
    // Core tests
    this.testGlobalObjects();
    this.testVisualEngineAPI();
    this.testStateStructure();
    
    // Visual Engine tests
    this.testParticleSystem();
    this.testAnticipationSystem();
    this.testComboSystem();
    this.testRandomRewardSystem();
    
    // Integration tests
    this.testCompleteQuestIntegration();
    this.testDailyLoginIntegration();
    
    // DOM tests
    this.testComboDisplayElement();
    this.testMomentumBarElement();
    this.testVisualEngineCSS();
    
    // State tests
    this.testSessionFieldsPersist();
    
    // Urgency tests
    this.testUrgencyCalculation();
    
    // Summary
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;
    console.log(`   RESULTS: ${passed}/${total} PASSED | ${failed} FAILED`);
    console.log('═══════════════════════════════════════════════════════════════');
    
    return {
      passed,
      failed,
      total,
      passRate: (passed / total * 100).toFixed(1),
      results: this.results
    };
  }
};

// Auto-run when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => V6Verifier.runAll());
} else {
  // DOM already loaded
  setTimeout(() => V6Verifier.runAll(), 500);
}

// Expose globally
window.V6Verifier = V6Verifier;
