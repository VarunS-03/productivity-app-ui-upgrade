/**
 * MomentumSystem.js
 * Calculates momentum score based on activity patterns
 * Tracks trend and peak values
 */

// Using global window.CONFIG
const MOMENTUM = window.CONFIG?.MOMENTUM || { BASELINE: 100, DECAY_RATE_IDLE: 0.5, BOOST_PER_TASK: 5 };
const THRESHOLDS = window.CONFIG?.THRESHOLDS || { MOMENTUM_LOW: 30, MOMENTUM_MEDIUM: 60, MOMENTUM_HIGH: 85 };

const MOMENTUM_ZONES = Object.freeze({
  LOW: 'low',       // 0-30
  MEDIUM: 'medium', // 30-60
  HIGH: 'high',     // 60-85
  BURN: 'burn'      // 85-100
});

class MomentumSystem {
  constructor(stateEngine) {
    this._stateEngine = stateEngine;
    this._score = MOMENTUM.BASELINE;
    this._peak = MOMENTUM.BASELINE;
    this._trend = 'stable';
    this._zone = MOMENTUM_ZONES.LOW;
    this._history = [];
    this._lastUpdate = performance.now();
    this._burnTimer = 0;
  }

  /**
   * Update momentum based on current state
   * @param {Object} currentState - Current system state
   * @returns {Object} Momentum state updates
   */
  update(currentState) {
    const now = performance.now();
    const deltaTime = (now - this._lastUpdate) / 1000;
    this._lastUpdate = now;

    const { tasks, sprint, flow, decay, collapse } = currentState;

    // Handle collapse trigger from InstabilitySystem
    if (collapse?.trigger) {
      this._score = Math.max(this._score - 30, 10);
    }

    // Calculate natural decay
    const decayRate = this._calculateDecayRate(tasks, decay);

    // Calculate gains (non-linear based on current zone)
    const gain = this._calculateGain(tasks, sprint, flow);

    // Burn state handling
    const wasBurn = this._zone === MOMENTUM_ZONES.BURN;
    this._updateZone();
    const isBurn = this._zone === MOMENTUM_ZONES.BURN;

    // Burn boosts performance but adds instability (handled by InstabilitySystem)
    let burnBonus = 0;
    if (isBurn) {
      this._burnTimer += deltaTime;
      burnBonus = 2; // Extra gain during burn
    } else {
      this._burnTimer = 0;
    }

    // Apply changes
    this._score = Math.max(0, Math.min(100,
      this._score - (decayRate * deltaTime) + gain + burnBonus
    ));

    // Update peak
    if (this._score > this._peak) {
      this._peak = this._score;
    }

    // Update trend
    this._updateTrend();

    // Update history
    this._updateHistory(now);

    return {
      momentum: {
        score: Math.round(this._score),
        peak: Math.round(this._peak),
        trend: this._trend,
        zone: this._zone,
        inBurn: isBurn,
        burnDuration: this._burnTimer,
        baseline: MOMENTUM.BASELINE
      }
    };
  }

  _updateZone() {
    if (this._score >= THRESHOLDS.MOMENTUM_HIGH) {
      this._zone = MOMENTUM_ZONES.BURN;
    } else if (this._score >= THRESHOLDS.MOMENTUM_MEDIUM) {
      this._zone = MOMENTUM_ZONES.HIGH;
    } else if (this._score >= THRESHOLDS.MOMENTUM_LOW) {
      this._zone = MOMENTUM_ZONES.MEDIUM;
    } else {
      this._zone = MOMENTUM_ZONES.LOW;
    }
  }

  _calculateDecayRate(tasks, decay) {
    // Idle decay when no activity
    if (tasks.inProgress === 0 && tasks.pending === 0) {
      return MOMENTUM.DECAY_RATE_IDLE;
    }
    
    // Slow decay during active work
    return MOMENTUM.DECAY_RATE_ACTIVE;
  }

  _calculateGain(tasks, sprint, flow) {
    // Non-linear scaling based on current zone
    const zoneMultipliers = {
      [MOMENTUM_ZONES.LOW]: 0.5,      // Slow gain when low
      [MOMENTUM_ZONES.MEDIUM]: 1.0,   // Normal gain
      [MOMENTUM_ZONES.HIGH]: 1.5,     // Faster gain
      [MOMENTUM_ZONES.BURN]: 2.0      // Aggressive gain (but risky)
    };
    const multiplier = zoneMultipliers[this._zone] || 1.0;

    let gain = 0;

    // Task completion boost
    if (tasks.completionVelocity > 0) {
      gain += Math.min(MOMENTUM.BOOST_MAX,
        tasks.completionVelocity * MOMENTUM.BOOST_PER_TASK * multiplier
      );
    }

    // Sprint bonus (enhanced by flow)
    if (sprint.active) {
      const flowBoost = flow.stage === 'active' ? 1.5 : 1.0;
      gain += 2 * sprint.intensity * flowBoost * multiplier;
    }

    // Flow bonus (progressive)
    if (flow.stage === 'active') {
      gain += (1 + (flow.depth / 100)) * multiplier;
    } else if (flow.stage === 'building') {
      gain += 0.5 * multiplier;
    }

    return gain;
  }

  _updateTrend() {
    if (this._history.length < 2) {
      this._trend = 'stable';
      return;
    }

    const recent = this._history.slice(-5);
    const oldest = recent[0];
    const newest = recent[recent.length - 1];
    const change = newest.score - oldest.score;

    if (change > 5) {
      this._trend = 'rising';
    } else if (change < -5) {
      this._trend = 'falling';
    } else {
      this._trend = 'stable';
    }
  }

  _updateHistory(now) {
    this._history.push({
      timestamp: now,
      score: this._score
    });

    // Keep last 30 seconds
    const cutoff = now - 30000;
    this._history = this._history.filter(h => h.timestamp >= cutoff);
  }

  /**
   * Get current momentum score
   * @returns {number}
   */
  getScore() {
    return this._score;
  }

  /**
   * Get momentum trend
   * @returns {string}
   */
  getTrend() {
    return this._trend;
  }

  /**
   * Get peak momentum value
   * @returns {number}
   */
  getPeak() {
    return this._peak;
  }

  /**
   * Manually boost momentum
   * @param {number} amount - Amount to boost
   */
  boost(amount) {
    this._score = Math.min(100, this._score + amount);
    if (this._score > this._peak) {
      this._peak = this._score;
    }
  }

  /**
   * Manually reduce momentum
   * @param {number} amount - Amount to reduce
   */
  reduce(amount) {
    this._score = Math.max(0, this._score - amount);
  }

  /**
   * Reset momentum system
   */
  reset() {
    this._score = MOMENTUM.BASELINE;
    this._peak = MOMENTUM.BASELINE;
    this._trend = 'stable';
    this._history = [];
    this._lastUpdate = performance.now();
  }
}

window.MomentumSystem = MomentumSystem;
