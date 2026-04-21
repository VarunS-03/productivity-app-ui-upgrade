/**
 * InstabilitySystem.js
 * Tracks and manages system instability
 * Handles spike detection and decay
 */

// Using global window.CONFIG
const INSTABILITY = window.CONFIG?.INSTABILITY || { SOURCES: { INTERRUPTION: 30 }, DECAY_RATE_SLOW: 0.05 };
const THRESHOLDS = window.CONFIG?.THRESHOLDS || { INSTABILITY_CRITICAL: 70, INSTABILITY_HIGH: 50, INSTABILITY_MEDIUM: 25 };

const INSTABILITY_STATES = Object.freeze({
  NONE: 'none',       // 0-10
  WARNING: 'warning', // 10-50
  CRITICAL: 'critical', // 50-70
  COLLAPSE: 'collapse', // 70+
  RESIDUAL: 'residual'  // Post-collapse recovery
});

class InstabilitySystem {
  constructor(stateEngine) {
    this._stateEngine = stateEngine;
    this._level = 0;
    this._state = INSTABILITY_STATES.NONE;
    this._source = null;
    this._spikeTime = 0;
    this._decayRate = INSTABILITY.DECAY_RATE_SLOW;
    this._spikeHistory = [];
    this._lastUpdate = performance.now();
    this._collapseTime = 0;
    this._residualEndTime = 0;
    this._failureImpactMultiplier = 1.0;

  }

  /**
   * Update instability state
   * @param {Object} currentState - Current system state
   * @returns {Object} Instability state updates
   */
  update(currentState) {
    const now = performance.now();
    const deltaTime = (now - this._lastUpdate) / 1000;
    this._lastUpdate = now;
    const { momentum, sprint } = currentState;

    // Residual state handling
    if (this._state === INSTABILITY_STATES.RESIDUAL) {
      if (now >= this._residualEndTime) {
        this._state = INSTABILITY_STATES.NONE;
        this._level = 0;
        this._failureImpactMultiplier = 1.0;
      } else {
        // Slow recovery from residual
        this._level = Math.max(0, this._level - (INSTABILITY.DECAY_RATE_SLOW * deltaTime * 5));
      }
    } else {
      // Active instability increases from high momentum + sprint pressure
      if (momentum.zone === 'burn' && sprint.active) {
        this._level += 0.5 * deltaTime; // Accumulate during burn+sprint
      }

      // Apply natural decay
      if (this._level > 0) {
        this._level = Math.max(0, this._level - (this._decayRate * deltaTime * 10));
      }
    }

    // Update state based on level
    this._updateState(now);

    // Update source if instability dropped
    if (this._level < THRESHOLDS.INSTABILITY_LOW) {
      this._source = null;
    }

    // Determine decay rate based on level
    this._decayRate = this._level > THRESHOLDS.INSTABILITY_HIGH
      ? INSTABILITY.DECAY_RATE_FAST
      : INSTABILITY.DECAY_RATE_SLOW;

    // Check for collapse trigger
    const collapseEffects = this._checkCollapse();

    return {
      instability: {
        level: Math.round(this._level),
        state: this._state,
        source: this._source,
        spikeTime: this._spikeTime,
        decayRate: this._decayRate,
        isCritical: this._state === INSTABILITY_STATES.CRITICAL || this._state === INSTABILITY_STATES.COLLAPSE,
        isHigh: this._level >= THRESHOLDS.INSTABILITY_HIGH,
        failureImpact: this._failureImpactMultiplier,
        inResidual: this._state === INSTABILITY_STATES.RESIDUAL
      },
      ...collapseEffects
    };
  }

  _updateState(now) {
    const prevState = this._state;

    if (this._level >= THRESHOLDS.INSTABILITY_CRITICAL) {
      this._state = INSTABILITY_STATES.COLLAPSE;
      if (prevState !== INSTABILITY_STATES.COLLAPSE) {
        this._collapseTime = now;
        this._triggerCollapse();
      }
    } else if (this._level >= THRESHOLDS.INSTABILITY_HIGH) {
      this._state = INSTABILITY_STATES.CRITICAL;
      this._failureImpactMultiplier = 1.5; // 50% increased failure impact
    } else if (this._level >= THRESHOLDS.INSTABILITY_MEDIUM) {
      this._state = INSTABILITY_STATES.WARNING;
      this._failureImpactMultiplier = 1.0;
    } else {
      this._state = INSTABILITY_STATES.NONE;
      this._failureImpactMultiplier = 1.0;
    }
  }

  _triggerCollapse() {
    // Enter residual state - other systems react to collapse flag in state
    this._state = INSTABILITY_STATES.RESIDUAL;
    this._residualEndTime = performance.now() + 30000; // 30s residual
    this._level = 30; // Stay at warning level during residual
  }

  _checkCollapse() {
    // Return collapse trigger flag for other systems to read
    const triggerCollapse = this._state === INSTABILITY_STATES.COLLAPSE ||
      (this._state === INSTABILITY_STATES.RESIDUAL &&
       performance.now() - this._residualEndTime < 100); // Flag set only on transition

    return {
      collapse: {
        trigger: triggerCollapse,
        active: this._state === INSTABILITY_STATES.COLLAPSE,
        residual: this._state === INSTABILITY_STATES.RESIDUAL
      }
    };
  }

  /**
   * Trigger an instability spike
   * @param {string} source - Source of instability
   * @param {number} magnitude - Optional magnitude override
   */
  spike(source, magnitude = null) {
    const sourceWeight = INSTABILITY.SOURCES[source] || 10;
    const spikeAmount = magnitude !== null ? magnitude : sourceWeight;
    
    this._level = Math.min(100, this._level + spikeAmount);
    this._source = source;
    this._spikeTime = performance.now();
    
    this._spikeHistory.push({
      timestamp: this._spikeTime,
      source,
      level: this._level
    });

    // Prune old spikes
    const cutoff = this._spikeTime - 60000;
    this._spikeHistory = this._spikeHistory.filter(s => s.timestamp >= cutoff);
  }

  /**
   * Trigger interruption spike
   */
  interruption() {
    this.spike('INTERRUPTION');
  }

  /**
   * Trigger error spike
   */
  error() {
    this.spike('ERROR');
  }

  /**
   * Trigger timeout spike
   */
  timeout() {
    this.spike('TIMEOUT');
  }

  /**
   * Trigger overload spike
   */
  overload() {
    this.spike('OVERLOAD');
  }

  /**
   * Trigger external spike
   */
  external() {
    this.spike('EXTERNAL');
  }

  /**
   * Get current instability level
   * @returns {number}
   */
  getLevel() {
    return this._level;
  }

  /**
   * Get current instability source
   * @returns {string|null}
   */
  getSource() {
    return this._source;
  }

  /**
   * Check if currently in critical state
   * @returns {boolean}
   */
  isCritical() {
    return this._level >= THRESHOLDS.INSTABILITY_CRITICAL;
  }

  /**
   * Check if currently in high instability
   * @returns {boolean}
   */
  isHigh() {
    return this._level >= THRESHOLDS.INSTABILITY_HIGH;
  }

  /**
   * Get spike history
   * @returns {Array}
   */
  getHistory() {
    return [...this._spikeHistory];
  }

  /**
   * Force set instability level (for testing)
   * @param {number} level - New level
   */
  setLevel(level) {
    this._level = Math.max(0, Math.min(100, level));
    if (this._level === 0) {
      this._source = null;
    }
  }

  /**
   * Reset instability system
   */
  reset() {
    this._level = 0;
    this._source = null;
    this._spikeTime = 0;
    this._decayRate = INSTABILITY.DECAY_RATE_SLOW;
    this._spikeHistory = [];
    this._lastUpdate = performance.now();
  }
}

window.InstabilitySystem = InstabilitySystem;
