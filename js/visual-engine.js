/* ═══════════════════════════════════════════════════════════════════════════════
   VISUAL ENGINE v6.0 — Real-Time Animation & Particle System
   
   Core Systems:
   - Central animation loop (requestAnimationFrame)
   - Particle burst engine for rewards
   - Anticipation/delay system for dopamine optimization
   - Living ambient effects
   - GPU-accelerated transforms only
   
   Performance: 60 FPS target, automatic throttling
═══════════════════════════════════════════════════════════════════════════════ */

'use strict';

const VisualEngine = (() => {
  
  /* ═══════════════════════════════════════════════════════════════════════
     CONFIGURATION
  ═══════════════════════════════════════════════════════════════════════ */
  const CONFIG = {
    FPS_TARGET: 60,
    FPS_MIN: 30,
    PARTICLE_MAX: 150,
    ANTICIPATION_MIN: 150,
    ANTICIPATION_MAX: 400,
    COMBO_DECAY_MS: 8000,
    MOMENTUM_BUILD_RATE: 0.15,
    MOMENTUM_DECAY_RATE: 0.08
  };

  /* ═══════════════════════════════════════════════════════════════════════
     STATE
  ═══════════════════════════════════════════════════════════════════════ */
  let _running = false;
  let _lastFrame = 0;
  let _frameInterval = 1000 / CONFIG.FPS_TARGET;
  let _currentFPS = CONFIG.FPS_TARGET;
  let _particlePool = [];
  let _activeParticles = [];
  let _ambientEffects = [];
  let _comboCount = 0;
  let _comboTimer = null;
  let _lastActionTime = 0;
  let _momentum = 0; // 0-1 scale
  let _momentumDirection = 0;
  let _activeAnticipations = new Map(); // Track timeouts for cleanup

  let _momentumBurnActive = false;
  let _momentumBurnTimer = null;

  /* ═══════════════════════════════════════════════════════════════════════
     STEP 3: MODE RESOLVER INIT
  ═══════════════════════════════════════════════════════════════════════ */
  window.modeResolver = new ModeResolver();

  /* ═══════════════════════════════════════════════════════════════════════
     STEP 4: COMPONENT MANAGER INIT
  ═══════════════════════════════════════════════════════════════════════ */
  window.componentManager = new ComponentManager();

  // === STEP 5 FIX: SAFE COMPONENT REGISTRATION ===
  window.addEventListener("DOMContentLoaded", () => {
    if (!window.__componentsRegistered) {
      document.querySelectorAll("[data-component]").forEach(el => {
        const name = el.getAttribute("data-component");
        window.componentManager.register(name, el);
      });
      window.__componentsRegistered = true;
    }
  });

  /* ═══════════════════════════════════════════════════════════════════════
     CENTRAL ANIMATION LOOP
  ═══════════════════════════════════════════════════════════════════════ */
  function start() {
    if (_running) return;
    _running = true;
    _lastFrame = performance.now();
    requestAnimationFrame(_tick);
  }

  function stop() {
    _running = false;
  }

  function _tick(now) {
    if (!_running) return;
    
    const delta = now - _lastFrame;
    
    // Adaptive frame skipping for performance
    if (delta < _frameInterval) {
      requestAnimationFrame(_tick);
      return;
    }
    
    _lastFrame = now - (delta % _frameInterval);
    _currentFPS = Math.round(1000 / delta);

    let events = [];

    // Prefer structured event queue
    if (window.SystemEvents && typeof window.SystemEvents.consume === "function") {
      events = window.SystemEvents.consume();
    }

    // Fallback to legacy single event
    if ((!events || events.length === 0) && window.__lastTaskEvent) {
      events = [{
        type: window.__lastTaskEvent,
        payload: {},
        ts: Date.now()
      }];
      window.__lastTaskEvent = null;
    }

    // Accessibility check: Skip expensive physics if reduced motion is enabled
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!prefersReducedMotion) {
      // Update physics and particles only if motion is allowed
      _updateParticles(delta);
    } else {
      // Clear active particles to save memory when motion is disabled
      if (_activeParticles.length > 0) {
        _activeParticles.forEach(p => { p.active = false; p.el.style.display = 'none'; });
        _activeParticles = [];
      }
    }

    // === STEP 5 CORRECTION: SINGLE UPDATE SOURCE ===
    const tickTime = performance.now();
    const baseState = {
      event: null,
      tasks: {
        inProgress: 0,
        lastCompletionTime: tickTime
      },
      flow: {},
      sprint: {},
      momentum: { score: 50 },
      instability: { level: 0 }
    };

    // If multiple events arrived this frame, process sequentially.
    // If none arrived, preserve legacy behavior (single update with event=null).
    const eventBatch = (events && events.length > 0) ? events : [{ type: null, payload: {}, ts: tickTime }];

    let flowState = {};
    let sprintState = {};

    for (let i = 0; i < eventBatch.length; i++) {
      const evt = eventBatch[i];
      baseState.event = evt.type;

      // Single source: FlowSystem update
      const flowResult = window.flowSystem ? window.flowSystem.update(baseState) : { flow: {} };
      flowState = flowResult.flow || {};

      // Single source: SprintSystem update
      const sprintResult = window.sprintSystem ? window.sprintSystem.update(baseState) : { sprint: {} };
      sprintState = sprintResult.sprint || {};
    }

    // Build clean systemState for ModeResolver
    const systemState = {
      flow: flowState,
      sprint: sprintState,
      momentum: {},
      instability: {}
    };

    const resolvedMode = window.modeResolver.resolve(systemState);

    // === STEP 3: APPLY MODE TO UI ===
    if (resolvedMode && resolvedMode.dominant_mode) {
      const mode = resolvedMode.dominant_mode;
      document.body.setAttribute("data-mode", mode);
    }

    // === STEP 5 FIX: HARDENED COMPONENT MANAGER UPDATE ===
    if (window.componentManager && resolvedMode && systemState) {
      window.componentManager.update(resolvedMode, systemState);
    }

    _updateAmbient(delta);
    _updateMomentum(delta);
    _updateLivingElements(now);
    
    requestAnimationFrame(_tick);
  }

  /* ═══════════════════════════════════════════════════════════════════════
     ANTICIPATION SYSTEM (Dopamine Optimization)
     
     Creates delay between action and reward for heightened satisfaction.
     Stages:
     1. Immediate micro-feedback (instant)
     2. Charge-up build (100-200ms)
     3. Hold/tension (50-150ms)
     4. Release burst (reward)
     5. Decay/echo (300-500ms)
  ═══════════════════════════════════════════════════════════════════════ */
  function triggerAnticipation(element, type, callback) {
    const _prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!element || _prefersReducedMotion) {
      if (callback) callback();
      return;
    }

    // Prevent overlapping anticipation on same element
    if (_activeAnticipations.has(element)) {
      return; // Ignore if already charging
    }

    // Add charging class to trigger CSS animations (vibration, glow)
    element.classList.add(`anticipate-${type}`);
    
    // Delay configuration based on type (builds tension)
    let delay = type === 'crit' ? 450 : type === 'primary' ? 300 : 200;
    
    // Setup cleanup and execution
    const execute = () => {
      element.classList.remove(`anticipate-${type}`);
      _activeAnticipations.delete(element);
      
      // Spawn dramatic directional flash right before callback
      const rect = element.getBoundingClientRect();
      if (type === 'crit') {
        spawnBurst(rect.left + rect.width/2, rect.top + rect.height/2, 20, {
          type: 'mana', speed: 4, spread: 360, colors: ['#ffffff', '#00ccff']
        });
      }
      
      if (callback) callback();
    };

    const timeoutId = setTimeout(execute, delay);
    _activeAnticipations.set(element, { timeoutId, execute });
  }
  
  function _cleanupAnticipation(element) {
    if (_activeAnticipations.has(element)) {
      const timeouts = _activeAnticipations.get(element);
      timeouts.forEach(t => clearTimeout(t));
      _activeAnticipations.delete(element);
    }
  }

  function _getAnticipationStages(type) {
    const base = {
      quest: {
        micro: { duration: 80, scale: 0.95, glow: 1.2 },
        charge: { duration: 120, scale: 1.02, brightness: 1.3 },
        hold: 100,
        release: { duration: 400, scale: 1, particleCount: 12 }
      },
      xp: {
        micro: { duration: 60, scale: 1.05 },
        charge: { duration: 100, scale: 1.1, glow: 1.5 },
        hold: 80,
        release: { duration: 600, scale: 1, particleCount: 20 }
      },
      gold: {
        micro: { duration: 60, scale: 1.03 },
        charge: { duration: 90, scale: 1.08, shimmer: true },
        hold: 70,
        release: { duration: 500, scale: 1, particleCount: 15 }
      },
      crit: {
        micro: { duration: 40, scale: 0.9 },
        charge: { duration: 150, scale: 1.15, shake: true },
        hold: 120,
        release: { duration: 800, scale: 1, particleCount: 35 }
      },
      combo: {
        micro: { duration: 50, scale: 1.1 },
        charge: { duration: 80, scale: 1.2, pulse: true },
        hold: 60,
        release: { duration: 700, scale: 1, particleCount: 25 }
      }
    };
    return base[type] || base.quest;
  }

  function _applyMicroFeedback(el, cfg) {
    el.style.transition = 'transform 60ms ease-out';
    el.style.transform = `scale(${cfg.scale})`;
    if (cfg.glow) el.style.filter = `brightness(${cfg.glow})`;
  }

  function _applyCharge(el, cfg) {
    el.style.transition = `transform ${cfg.duration}ms cubic-bezier(0.34, 1.56, 0.64, 1)`;
    el.style.transform = `scale(${cfg.scale})`;
    if (cfg.brightness) el.style.filter = `brightness(${cfg.brightness})`;
    if (cfg.shimmer) el.classList.add('shimmer-active');
    if (cfg.pulse) el.classList.add('pulse-charging');
  }

  function _applyRelease(el, cfg) {
    el.style.transition = `transform ${cfg.duration}ms cubic-bezier(0.22, 1, 0.36, 1)`;
    el.style.transform = `scale(${cfg.scale})`;
    el.style.filter = '';
    el.classList.remove('shimmer-active', 'pulse-charging');
    
    // Spawn reward particles from element position
    const rect = el.getBoundingClientRect();
    spawnBurst(rect.left + rect.width/2, rect.top + rect.height/2, cfg.particleCount, {
      type: 'reward',
      colors: ['#66ff00', '#9900ff', '#ff00cc'],
      spread: 120,
      speed: 2 + _momentum * 2 // Faster with momentum
    });
  }

  function _applyDecay(el) {
    el.style.transition = 'transform 300ms ease-out';
    el.style.transform = '';
  }

  function _randomRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /* ═══════════════════════════════════════════════════════════════════════
     PARTICLE SYSTEM
     
     GPU-friendly particles using transform3d
     Object pooling for performance
  ═══════════════════════════════════════════════════════════════════════ */
  class Particle {
    constructor() {
      this.el = document.createElement('div');
      this.el.className = 've-particle';
      this.active = false;
      this.x = 0;
      this.y = 0;
      this.vx = 0;
      this.vy = 0;
      this.life = 0;
      this.maxLife = 0;
      this.size = 0;
      this.el.style.willChange = 'transform, opacity';
      document.body.appendChild(this.el);
    }
    
    spawn(x, y, config) {
      this.x = x;
      this.y = y;
      this.active = true;
      this.life = 0;
      this.maxLife = config.life || 1000;
      this.size = config.size || 4;
      
      const angle = (Math.random() * config.spread - config.spread/2) * (Math.PI / 180);
      const speed = config.speed * (0.5 + Math.random());
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      
      this.el.style.width = this.size + 'px';
      this.el.style.height = this.size + 'px';
      this.el.style.background = config.colors[Math.floor(Math.random() * config.colors.length)];
      this.el.style.opacity = '1';
      this.el.style.display = 'block';
      this._updateTransform();
    }
    
    update(delta) {
      if (!this.active) return;
      
      this.life += delta;
      const progress = this.life / this.maxLife;
      
      if (progress >= 1) {
        this.active = false;
        this.el.style.display = 'none';
        return;
      }
      
      // Physics
      this.x += this.vx * (delta / 16);
      this.y += this.vy * (delta / 16);
      this.vy += 0.1; // Gravity
      
      // Fade
      const opacity = 1 - (progress * progress); // Ease out
      this.el.style.opacity = opacity.toFixed(2);
      
      this._updateTransform();
    }
    
    _updateTransform() {
      // GPU-accelerated transform
      this.el.style.transform = `translate3d(${this.x.toFixed(1)}px, ${this.y.toFixed(1)}px, 0) scale(${1 - (this.life/this.maxLife) * 0.5})`;
    }
  }

  function initParticlePool() {
    for (let i = 0; i < CONFIG.PARTICLE_MAX; i++) {
      _particlePool.push(new Particle());
    }
  }

  function spawnBurst(x, y, count, config) {
    // Accessibility check: Don't spawn if reduced motion is requested
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    
    // Don't exceed pool
    const actualCount = Math.min(count, _particlePool.filter(p => !p.active).length);
    
    for (let i = 0; i < actualCount; i++) {
      const particle = _particlePool.find(p => !p.active);
      if (particle) {
        // Stagger spawns slightly
        setTimeout(() => {
          particle.spawn(x, y, {
            life: 800 + Math.random() * 600,
            size: 3 + Math.random() * 5,
            ...config
          });
          _activeParticles.push(particle);
        }, i * 15);
      }
    }
  }

  function _updateParticles(delta) {
    _activeParticles = _activeParticles.filter(p => p.active);
    _activeParticles.forEach(p => p.update(delta));
  }

  /* ═══════════════════════════════════════════════════════════════════════
     MOMENTUM & COMBO SYSTEM
     
     Tracks rapid consecutive actions and provides escalating rewards.
     Decays over time, encouraging sustained engagement.
  ═══════════════════════════════════════════════════════════════════════ */
  function recordAction(type, intensity = 1) {
    const now = Date.now();
    const timeSinceLast = now - _lastActionTime;
    _lastActionTime = now;
    
    // Combo logic
    if (timeSinceLast < CONFIG.COMBO_DECAY_MS) {
      _comboCount++;
      _momentum = Math.min(1, _momentum + (CONFIG.MOMENTUM_BUILD_RATE * intensity));
      _momentumDirection = 1;
      
      // Visual combo indicator
      _updateComboDisplay();
      
      // Clear existing decay timer
      if (_comboTimer) clearTimeout(_comboTimer);
      _comboTimer = setTimeout(_decayCombo, CONFIG.COMBO_DECAY_MS);
      
    } else {
      // Combo broken
      _comboCount = 1;
      _momentum = 0.3;
    }
    
    return {
      combo: _comboCount,
      multiplier: _getMultiplier(),
      momentum: _momentum
    };
  }

  function _getMultiplier() {
    let baseMult = 1.0;
    
    // Integrate infinite Shadow Infusion from Economy loop
    const s = window.G?.state;
    if (s && s.shadowInfusionLevel) {
      // Soft scaling: each level adds +0.02x to base momentum multiplier (Level 10 = +0.2x)
      baseMult += (s.shadowInfusionLevel * 0.02);
    }
    
    if (_momentumBurnActive) return baseMult + 1.0; // 2.0 + Infusion
    
    // Scale multiplier based on smooth momentum (0 to 1) instead of strict combo tiers
    // 0 momentum = baseMult, 1 momentum = baseMult + 1.0
    return baseMult + _momentum;
  }

  function activateMomentumBurn() {
    _momentumBurnActive = true;
    if (_momentumBurnTimer) clearTimeout(_momentumBurnTimer);
    
    document.body.classList.add('momentum-burn-active');
    
    _momentumBurnTimer = setTimeout(() => {
      _momentumBurnActive = false;
      document.body.classList.remove('momentum-burn-active');
      const el = document.getElementById('combo-display');
      if (el) el.classList.remove('burn-fx');
    }, 15000);
    
    // UI Feedback
    const el = document.getElementById('combo-display');
    if (el) {
      el.classList.add('burn-fx');
      _updateComboDisplay();
    }
  }

  function _decayCombo() {
    _comboCount = 0;
    _momentumDirection = -1;
    _updateComboDisplay();
    
    // Trigger combo break visual only if momentum burn isn't holding the multiplier
    if (!_momentumBurnActive) {
      const el = document.getElementById('combo-display');
      if (el) {
        el.classList.add('combo-break');
        setTimeout(() => el.classList.remove('combo-break'), 600);
      }
    }
  }

  function _updateMomentum(delta) {
    // Smooth momentum decay
    if (_momentumDirection === -1 && _momentum > 0) {
      _momentum = Math.max(0, _momentum - (CONFIG.MOMENTUM_DECAY_RATE * delta / 16));
    }
  }

  function _updateComboDisplay() {
    const el = document.getElementById('combo-display');
    if (!el) return;
    
    if (_comboCount > 1) {
      el.style.display = 'flex';
      el.querySelector('.combo-count').textContent = _comboCount;
      el.querySelector('.combo-multiplier').textContent = 'x' + _getMultiplier().toFixed(1);
      
      // Pulse animation on combo increase
      el.classList.remove('pulse');
      void el.offsetWidth;
      el.classList.add('pulse');
      
      // Scale based on combo
      const scale = 1 + Math.min(0.5, (_comboCount / 20));
      el.style.transform = `scale(${scale})`;
    } else {
      el.style.display = 'none';
    }
  }

  function getComboState() {
    return {
      count: _comboCount,
      multiplier: _getMultiplier(),
      momentum: _momentum,
      isActive: _comboCount > 0
    };
  }

  /* ═══════════════════════════════════════════════════════════════════════
     AMBIENT LIVING EFFECTS
     
     Background elements that breathe and react to system state
  ═══════════════════════════════════════════════════════════════════════ */
  function _updateAmbient(delta) {
    // Update energy bars with flowing effect
    const energyBars = document.querySelectorAll('.energy-flow');
    energyBars.forEach((bar, i) => {
      const offset = (Date.now() / 50) + (i * 100);
      const intensity = 0.5 + (_momentum * 0.5);
      bar.style.backgroundPosition = `${offset}px 0`;
      bar.style.opacity = intensity;
    });
  }

  function _updateLivingElements(now) {
    // Pulsing glow on critical elements based on urgency
    const urgency = _calculateUrgency();
    const pulseRate = 2000 - (urgency * 1500); // Faster when urgent
    const pulsePhase = (now % pulseRate) / pulseRate;
    const pulseIntensity = 0.5 + Math.sin(pulsePhase * Math.PI * 2) * 0.3 + (urgency * 0.3);
    
    document.documentElement.style.setProperty('--living-pulse', pulseIntensity.toFixed(2));
    
    // Update urgency visuals every 2 seconds
    if (Math.floor(now / 2000) > Math.floor((now - 16) / 2000)) {
      updateUrgencyVisuals();
    }
  }

  function _calculateUrgency() {
    const s = window.G?.state;
    if (!s) return 0;
    
    let urgency = 0;
    
    // Streak danger (highest urgency)
    if (s.loginStreak > 0 && !s.todayLoggedIn) {
      urgency += 0.4;
      // Increase urgency as day progresses
      const hour = new Date().getHours();
      if (hour >= 20) urgency += 0.3; // Evening
      if (hour >= 23) urgency += 0.2; // Late night
    }
    
    // EOD approaching - integrate with countdown if available
    const eodEl = document.getElementById('eod-countdown');
    if (eodEl && eodEl.style.display !== 'none') {
      const text = eodEl.textContent;
      if (text.includes('RESET IN')) {
        // Parse remaining time
        const match = text.match(/(\d+):(\d+):(\d+)/);
        if (match) {
          const hours = parseInt(match[1]);
          if (hours < 1) urgency += 0.4; // Less than 1 hour
          else if (hours < 3) urgency += 0.2; // Less than 3 hours
        }
      }
    }
    
    // Pending quests pressure
    const pending = s.quests?.filter(q => !q.completed && !q.failed).length || 0;
    if (pending > 5) urgency += 0.25;
    else if (pending > 3) urgency += 0.15;
    else if (pending > 0) urgency += 0.05;
    
    // Failed quest pressure
    const failed = s.quests?.filter(q => q.failed).length || 0;
    if (failed > 0) urgency += 0.1 * failed;
    
    return Math.min(1, urgency);
  }

  // Apply urgency classes to key elements
  function updateUrgencyVisuals() {
    const urgency = _calculateUrgency();
    const hud = document.getElementById('monarch-hud');
    
    if (!hud) return;
    
    // Remove existing urgency classes
    hud.classList.remove('urgency-low', 'urgency-medium', 'urgency-high');
    document.body.classList.remove('system-urgent');
    
    // Apply appropriate class
    if (urgency >= 0.6) {
      hud.classList.add('urgency-high');
      document.body.classList.add('system-urgent');
    } else if (urgency >= 0.3) {
      hud.classList.add('urgency-medium');
    } else if (urgency > 0) {
      hud.classList.add('urgency-low');
    }
    
    // Update urgency pulse speed
    const pulseSpeed = 2000 - (urgency * 1500);
    document.documentElement.style.setProperty('--urgency-pulse-speed', pulseSpeed + 'ms');
  }

  /* ═══════════════════════════════════════════════════════════════════════
     MICRO-INTERACTION SYSTEM
     
     Three-stage feedback for every interaction:
     1. Trigger (immediate)
     2. Sustain (hold)
     3. Release (follow-through)
  ═══════════════════════════════════════════════════════════════════════ */
  function attachMicroInteraction(element, type = 'default') {
    if (!element) return;
    
    const configs = {
      default: { trigger: 80, sustain: 0, release: 200, scale: [1, 0.96, 1] },
      primary: { trigger: 60, sustain: 40, release: 300, scale: [1, 0.94, 1.02, 1] },
      destructive: { trigger: 100, sustain: 80, release: 400, scale: [1, 0.9, 1] },
      subtle: { trigger: 40, sustain: 0, release: 150, scale: [1, 0.98, 1] }
    };
    
    const cfg = configs[type] || configs.default;
    
    element.addEventListener('pointerdown', () => {
      element.style.transition = `transform ${cfg.trigger}ms ease-out`;
      element.style.transform = `scale(${cfg.scale[1]})`;
    });
    
    element.addEventListener('pointerup', () => {
      setTimeout(() => {
        element.style.transition = `transform ${cfg.release}ms cubic-bezier(0.34, 1.56, 0.64, 1)`;
        element.style.transform = cfg.scale[2] !== undefined ? `scale(${cfg.scale[2]})` : '';
        
        setTimeout(() => {
          element.style.transform = '';
        }, cfg.release);
      }, cfg.sustain);
    });
    
    element.addEventListener('pointerleave', () => {
      element.style.transition = 'transform 150ms ease-out';
      element.style.transform = '';
    });
  }

  function initMicroInteractions() {
    // Auto-attach to common elements
    setTimeout(() => {
      document.querySelectorAll('.sys-btn, .q-btn, .tier-btn').forEach(el => {
        const type = el.classList.contains('sys-btn-primary') ? 'primary' : 
                     el.classList.contains('q-fail') ? 'destructive' : 'default';
        attachMicroInteraction(el, type);
      });
    }, 500);
  }

  /* ═══════════════════════════════════════════════════════════════════════
     RANDOMIZED REWARD EVENTS (Addiction Engine)
  ═══════════════════════════════════════════════════════════════════════ */
  const REWARD_EVENTS = [
    { id: 'xp_surge', chance: 0.05, multiplier: 1.5, name: 'SHADOW SURGE', duration: 30000, color: '#aaff00' },
    { id: 'gold_windfall', chance: 0.04, multiplier: 2.0, name: 'TREASURE ROOM', duration: 20000, color: '#ffaa00' },
    { id: 'quest_frenzy', chance: 0.02, multiplier: 3.0, name: 'SYSTEM OVERRIDE', duration: 60000, color: '#ff0055' },
    { id: 'lucky_streak', chance: 0.03, multiplier: 1.2, name: 'MONARCH BLESSING', duration: 45000, color: '#00ccff' }
  ];
  
  let _activeRewardEvent = null;
  let _rewardEventTimer = null;

  function checkRandomReward(trigger) {
    if (_activeRewardEvent) return null;
    const validTriggers = ['quest_complete', 'login', 'gate_open', 'achievement'];
    if (!validTriggers.includes(trigger)) return null;
    
    for (const event of REWARD_EVENTS) {
      if (Math.random() < event.chance) {
        _triggerRewardEvent(event);
        return event;
      }
    }
    return null;
  }

  function _triggerRewardEvent(event) {
    _activeRewardEvent = event;
    _showRewardAnnouncement(event);
    _rewardEventTimer = setTimeout(() => _endRewardEvent(), event.duration);
    return event;
  }

  function _showRewardAnnouncement(event) {
    const el = document.createElement('div');
    el.className = 'reward-announcement';
    el.innerHTML = `
      <div class="ra-icon" style="color: ${event.color}">◈</div>
      <div class="ra-name">${event.name}</div>
      <div class="ra-bonus">${event.multiplier ? 'x' + event.multiplier : '+' + (event.critChance * 100) + '% CRIT'}</div>
    `;
    el.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 10000; text-align: center; pointer-events: none;';
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    spawnBurst(window.innerWidth/2, window.innerHeight/2, 40, { type: 'reward', colors: [event.color, '#ffffff'], spread: 360, speed: 3 });
    setTimeout(() => { el.classList.add('fade-out'); setTimeout(() => el.remove(), 500); }, 3000);
  }

  function _endRewardEvent() {
    if (_activeRewardEvent) {
      ui.showToast(_activeRewardEvent.name + ' ended', 'info');
      _activeRewardEvent = null;
    }
    _rewardEventTimer = null;
  }

  function getActiveRewardEvent() { return _activeRewardEvent; }

  function calculateRewardMultiplier(baseAmount) {
    let multiplier = 1.0;
    if (_activeRewardEvent?.multiplier) multiplier *= _activeRewardEvent.multiplier;
    const s = window.G?.state;
    if (s?.adaptiveDifficulty) multiplier *= s.adaptiveDifficulty;
    if (_momentum > 0.5) multiplier *= (1 + (_momentum * 0.2));
    return Math.round(baseAmount * multiplier);
  }

  /* ═══════════════════════════════════════════════════════════════════════
     PUBLIC API
  ═══════════════════════════════════════════════════════════════════════ */
  return {
    // Lifecycle
    start,
    stop,
    
    // Core systems
    initParticlePool,
    initMicroInteractions,
    
    // Anticipation
    triggerAnticipation,
    
    // Particles
    spawnBurst,
    
    // Momentum
    recordAction,
    getComboState,
    activateMomentumBurn,

    // Urgency
    updateUrgencyVisuals,
    getUrgency: _calculateUrgency,
    
    // Randomized Rewards
    checkRandomReward,
    getActiveRewardEvent,
    calculateRewardMultiplier,
    
    // Info
    getFPS: () => _currentFPS,
    getParticleCount: () => _activeParticles.length
  };
})();

// Auto-initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => {
  VisualEngine.initParticlePool();
  VisualEngine.start();
  VisualEngine.initMicroInteractions();
});

// Expose globally for integration
window.VisualEngine = VisualEngine;
