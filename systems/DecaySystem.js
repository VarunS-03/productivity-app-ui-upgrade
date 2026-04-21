/**
 * DecaySystem.js
 * Manages system decay during idle periods
 * Tracks idle time and calculates decay rates
 */

// Using global window.CONFIG
const TIMING = window.CONFIG?.TIMING || { IDLE_THRESHOLD: 30000 };

class DecaySystem {
  constructor(stateEngine) {
    this._stateEngine = stateEngine;
    this._lastActivity = performance.now();
    this._idleTime = 0;
    this._decayRate = 0;
    this._isIdle = false;
    this._idleStartTime = 0;
  }

  /**
   * Update decay state based on current activity
   * @param {Object} currentState - Current system state
   * @returns {Object} Decay state updates
   */
  update(currentState) {
    const now = performance.now();
    const { tasks, momentum, sprint } = currentState;

    // Check for activity
    const hasActivity = this._detectActivity(tasks, sprint);

    if (hasActivity) {
      this._lastActivity = now;
      this._idleTime = 0;
      this._isIdle = false;
      this._idleStartTime = 0;
      this._decayRate = 0;
    } else {
      // Calculate idle time
      this._idleTime = now - this._lastActivity;
      
      if (!this._isIdle && this._idleTime >= TIMING.IDLE_THRESHOLD) {
        this._isIdle = true;
        this._idleStartTime = now;
      }

      // Calculate decay rate based on idle duration
      this._decayRate = this._calculateDecayRate(momentum.score);
    }

    return {
      decay: {
        rate: this._decayRate,
        lastActivity: this._lastActivity,
        idleTime: this._idleTime,
        isIdle: this._isIdle,
        idleDuration: this._isIdle ? now - this._idleStartTime : 0
      }
    };
  }

  _detectActivity(tasks, sprint) {
    // Active if:
    // - Tasks in progress
    // - Recent task completion
    // - Active sprint
    const now = performance.now();
    const recentCompletion = tasks.lastCompletionTime > 0 && 
      (now - tasks.lastCompletionTime) < 5000;

    return tasks.inProgress > 0 || recentCompletion || sprint.active;
  }

  _calculateDecayRate(momentumScore) {
    if (!this._isIdle) return 0;

    // Gradual decay curves based on idle duration
    const idleMinutes = this._idleTime / 60000;

    // Higher momentum decays faster (momentum is fragile)
    const momentumFactor = 1 + (momentumScore / 40);

    // Non-linear acceleration: slow start, rapid after 5 minutes
    let acceleration;
    if (idleMinutes < 1) {
      acceleration = 0.5; // Grace period
    } else if (idleMinutes < 5) {
      acceleration = 1 + (idleMinutes * 0.2); // Gradual ramp
    } else {
      acceleration = 2 + (idleMinutes * 0.3); // Rapid decay
    }
    acceleration = Math.min(5, acceleration); // Cap at 5x

    // Base rate: points per minute
    const baseRate = 1.0;

    return baseRate * acceleration * momentumFactor;
  }

  /**
   * Record manual activity
   */
  recordActivity() {
    this._lastActivity = performance.now();
    this._idleTime = 0;
    this._isIdle = false;
    this._idleStartTime = 0;
    this._decayRate = 0;
  }

  /**
   * Get current idle time in milliseconds
   * @returns {number}
   */
  getIdleTime() {
    return this._idleTime;
  }

  /**
   * Check if system is currently idle
   * @returns {boolean}
   */
  isIdle() {
    return this._isIdle;
  }

  /**
   * Get current decay rate
   * @returns {number}
   */
  getDecayRate() {
    return this._decayRate;
  }

  /**
   * Force idle state (for testing)
   * @param {number} duration - Idle duration in ms
   */
  forceIdle(duration) {
    this._lastActivity = performance.now() - duration;
    this._idleTime = duration;
    this._isIdle = duration >= TIMING.IDLE_THRESHOLD;
    if (this._isIdle) {
      this._idleStartTime = performance.now() - (duration - TIMING.IDLE_THRESHOLD);
    }
  }

  /**
   * Reset decay system
   */
  reset() {
    this._lastActivity = performance.now();
    this._idleTime = 0;
    this._decayRate = 0;
    this._isIdle = false;
    this._idleStartTime = 0;
  }
}

window.DecaySystem = DecaySystem;
