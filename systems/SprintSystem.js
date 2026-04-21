/**
 * SprintSystem.js
 * Manages sprint state, duration, and intensity
 * Handles sprint start, progress, and completion
 */

// Using global window.CONFIG
const TIMING = window.CONFIG?.TIMING || { SPRINT_MIN_DURATION: 60000 };
const THRESHOLDS = window.CONFIG?.THRESHOLDS || { SPRINT_INTENSITY_LOW: 0.3 };

const SPRINT_STATES = Object.freeze({
  IDLE: 'idle',
  ACTIVE: 'active',
  COOLDOWN: 'cooldown',
  COLLAPSED: 'collapsed'
});

class SprintSystem {
  constructor(stateEngine) {
    this._stateEngine = stateEngine;
    this._state = SPRINT_STATES.IDLE;
    this._startTime = 0;
    this._plannedDuration = 0;
    this._taskCount = 0;
    this._intensity = 0;
    this._cooldownEndTime = 0;
    this._overloadTriggered = false;
  }

  /**
   * Update sprint state
   * @param {Object} currentState - Current system state
   * @returns {Object} Sprint state updates
   */
  update(currentState) {
    const now = performance.now();
    const { instability, momentum, collapse } = currentState;

    // Handle collapse trigger from InstabilitySystem
    if (collapse?.trigger && this._state === SPRINT_STATES.ACTIVE) {
      return this._collapseSprint();
    }

    // Handle cooldown expiration
    if (this._state === SPRINT_STATES.COOLDOWN && now >= this._cooldownEndTime) {
      this._state = SPRINT_STATES.IDLE;
    }

    // Check for overload (high instability during sprint)
    if (this._state === SPRINT_STATES.ACTIVE) {
      const isOverloaded = instability.level >= THRESHOLDS.INSTABILITY_HIGH;
      const highMomentumRisk = momentum.score > THRESHOLDS.MOMENTUM_HIGH;

      if (isOverloaded && highMomentumRisk && !this._overloadTriggered) {
        this._overloadTriggered = true;
        return this._collapseSprint();
      }
    }

    // If sprint is active, check for completion
    if (this._state === SPRINT_STATES.ACTIVE) {
      const elapsed = now - this._startTime;
      const remaining = Math.max(0, this._plannedDuration - elapsed);
      const progress = elapsed / this._plannedDuration;

      // Calculate dynamic intensity based on task velocity
      this._intensity = this._calculateIntensity(currentState.tasks, progress);

      // Check for sprint completion
      if (remaining <= 0) {
        return this._completeSprint();
      }

      return {
        sprint: {
          active: true,
          state: this._state,
          startTime: this._startTime,
          duration: this._plannedDuration,
          remaining,
          progress,
          taskCount: this._taskCount,
          intensity: this._intensity,
          overloadRisk: instability.level >= THRESHOLDS.INSTABILITY_MEDIUM
        }
      };
    }

    // No active sprint - return state-appropriate structure
    const isCooldown = this._state === SPRINT_STATES.COOLDOWN;
    const isCollapsed = this._state === SPRINT_STATES.COLLAPSED;

    return {
      sprint: {
        active: false,
        state: this._state,
        startTime: 0,
        duration: 0,
        remaining: isCooldown ? this._cooldownEndTime - now : 0,
        progress: 0,
        taskCount: this._taskCount,
        intensity: 0,
        cooldownActive: isCooldown,
        collapsed: isCollapsed
      }
    };
  }

  _calculateIntensity(tasks, progress) {
    const velocityFactor = Math.min(1, tasks.completionVelocity / THRESHOLDS.TASK_VELOCITY_BURST);
    const taskFactor = Math.min(1, tasks.inProgress / 3);
    
    // Intensity peaks in middle of sprint
    const progressCurve = 1 - Math.abs(progress - 0.5) * 2;
    
    return Math.min(1, (velocityFactor * 0.4 + taskFactor * 0.4 + progressCurve * 0.2));
  }

  /**
   * Start a new sprint
   * @param {number} duration - Sprint duration in milliseconds
   */
  startSprint(duration = TIMING.SPRINT_MIN_DURATION) {
    if (this._state !== SPRINT_STATES.IDLE) return null;

    this._state = SPRINT_STATES.ACTIVE;
    this._startTime = performance.now();
    this._plannedDuration = Math.max(TIMING.SPRINT_MIN_DURATION, duration);
    this._taskCount = 0;
    this._intensity = THRESHOLDS.SPRINT_INTENSITY_LOW;
    this._overloadTriggered = false;

    return {
      sprint: {
        active: true,
        state: this._state,
        startTime: this._startTime,
        duration: this._plannedDuration,
        remaining: this._plannedDuration,
        progress: 0,
        taskCount: 0,
        intensity: this._intensity,
        overloadRisk: false
      }
    };
  }

  /**
   * Complete the current sprint
   */
  endSprint() {
    if (this._state !== SPRINT_STATES.ACTIVE) return null;
    return this._completeSprint();
  }

  _completeSprint() {
    const now = performance.now();
    const COOLDOWN_DURATION = 30000; // 30 second cooldown

    this._state = SPRINT_STATES.COOLDOWN;
    this._cooldownEndTime = now + COOLDOWN_DURATION;
    this._startTime = 0;
    this._plannedDuration = 0;
    this._intensity = 0;
    this._overloadTriggered = false;

    return {
      sprint: {
        active: false,
        state: this._state,
        startTime: 0,
        duration: 0,
        remaining: COOLDOWN_DURATION,
        progress: 1,
        taskCount: this._taskCount,
        intensity: 0,
        completedAt: now,
        cooldownActive: true
      }
    };
  }

  /**
   * Collapse sprint due to overload (high instability + high momentum)
   */
  _collapseSprint() {
    const now = performance.now();
    const COLLAPSE_COOLDOWN = 60000; // 60 second penalty cooldown

    this._state = SPRINT_STATES.COLLAPSED;
    this._cooldownEndTime = now + COLLAPSE_COOLDOWN;
    this._startTime = 0;
    this._plannedDuration = 0;
    this._intensity = 0;

    return {
      sprint: {
        active: false,
        state: this._state,
        startTime: 0,
        duration: 0,
        remaining: COLLAPSE_COOLDOWN,
        progress: 1,
        taskCount: this._taskCount,
        intensity: 0,
        collapsedAt: now,
        collapsed: true,
        cooldownActive: true
      }
    };
  }

  /**
   * Force collapse sprint (called by InstabilitySystem)
   */
  forceCollapse() {
    if (this._state === SPRINT_STATES.ACTIVE) {
      return this._collapseSprint();
    }
    return null;
  }

  /**
   * Record a task completion during sprint
   */
  recordTask() {
    if (this._state === SPRINT_STATES.ACTIVE) {
      this._taskCount++;
    }
  }

  /**
   * Check if sprint is currently active
   * @returns {boolean}
   */
  isActive() {
    return this._state === SPRINT_STATES.ACTIVE;
  }

  /**
   * Get current sprint state
   * @returns {string}
   */
  getState() {
    return this._state;
  }

  /**
   * Get sprint progress (0-1)
   * @returns {number}
   */
  getProgress() {
    if (this._state !== SPRINT_STATES.ACTIVE) return 0;
    const elapsed = performance.now() - this._startTime;
    return Math.min(1, elapsed / this._plannedDuration);
  }

  /**
   * Get remaining time in milliseconds
   * @returns {number}
   */
  getRemaining() {
    if (this._state === SPRINT_STATES.ACTIVE) {
      const elapsed = performance.now() - this._startTime;
      return Math.max(0, this._plannedDuration - elapsed);
    }
    if (this._state === SPRINT_STATES.COOLDOWN || this._state === SPRINT_STATES.COLLAPSED) {
      return Math.max(0, this._cooldownEndTime - performance.now());
    }
    return 0;
  }

  /**
   * Reset sprint system
   */
  reset() {
    this._state = SPRINT_STATES.IDLE;
    this._startTime = 0;
    this._plannedDuration = 0;
    this._taskCount = 0;
    this._intensity = 0;
    this._cooldownEndTime = 0;
    this._overloadTriggered = false;
  }
}

window.SprintSystem = SprintSystem;
