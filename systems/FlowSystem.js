/**
 * FlowSystem.js
 * Progressive flow build with stages: inactive → building → active
 * Fragile - failure causes hard drop (active→broken) or soft reset (building→inactive)
 */

// Using global window.CONFIG
const THRESHOLDS = window.CONFIG?.THRESHOLDS || { FLOW_DEPTH_DEEP: 80 };

const FLOW_STAGES = Object.freeze({
  INACTIVE: 'inactive',
  BUILDING: 'building',
  ACTIVE: 'active',
  BROKEN: 'broken'
});

class FlowSystem {
  constructor(stateEngine) {
    this._stateEngine = stateEngine;
    this._stage = FLOW_STAGES.INACTIVE;
    this._successStreak = 0;
    this._lastSuccessTime = 0;
    this._lastUpdateTime = performance.now();
    this._depth = 0;
    this._lastDepth = 0;
  }

  /**
   * Update flow state based on current conditions
   * @param {Object} currentState - Current system state
   * @returns {Object} Flow state updates
   */
  update(currentState) {
    const now = performance.now();
    const deltaTime = (now - this._lastUpdateTime) / 1000;
    this._lastUpdateTime = now;

    const { tasks, sprint, momentum, instability, decay, collapse } = currentState;

    // Check for collapse trigger from InstabilitySystem
    if (collapse?.trigger) {
      this._stage = FLOW_STAGES.BROKEN;
      this._successStreak = 0;
    }

    // Check for success (task completion)
    const hasSuccess = tasks.lastCompletionTime > this._lastSuccessTime;
    const hasFailure = instability.spikeTime > this._lastUpdateTime - 1000;

    // Time decay: if no task for X seconds, degrade flow
    const timeSinceLastTask = now - tasks.lastCompletionTime;
    const DECAY_THRESHOLD = 15000; // 15 seconds

    // State machine transitions (skip if collapse triggered)
    if (!collapse?.trigger) {
      this._updateStage(hasSuccess, hasFailure, timeSinceLastTask, DECAY_THRESHOLD);
    }

    // Calculate depth based on stage
    this._depth = this._calculateDepth(tasks, sprint, momentum, instability);

    // Update tracking
    if (hasSuccess) {
      this._lastSuccessTime = tasks.lastCompletionTime;
      this._successStreak++;
    }

    const stageDepths = {
      [FLOW_STAGES.INACTIVE]: 0,
      [FLOW_STAGES.BUILDING]: Math.min(49, this._depth * 0.5),
      [FLOW_STAGES.ACTIVE]: this._depth,
      [FLOW_STAGES.BROKEN]: 0
    };

    const finalDepth = stageDepths[this._stage] || 0;

    return {
      flow: {
        depth: Math.round(finalDepth),
        stage: this._stage,
        streak: this._successStreak,
        entryTime: this._stage === FLOW_STAGES.ACTIVE ? this._lastSuccessTime : 0,
        interruptions: hasFailure ? 1 : 0,
        inFlow: this._stage === FLOW_STAGES.ACTIVE,
        depthChange: finalDepth - (this._lastDepth || 0)
      }
    };
  }

  _updateStage(hasSuccess, hasFailure, timeSinceLastTask, decayThreshold) {
    switch (this._stage) {
      case FLOW_STAGES.INACTIVE:
        if (hasSuccess) {
          this._stage = FLOW_STAGES.BUILDING;
          this._successStreak = 1;
        }
        break;

      case FLOW_STAGES.BUILDING:
        if (hasFailure) {
          // Soft reset: building → inactive
          this._stage = FLOW_STAGES.INACTIVE;
          this._successStreak = 0;
        } else if (this._successStreak >= 3) {
          // 3+ consecutive successes → active
          this._stage = FLOW_STAGES.ACTIVE;
        } else if (timeSinceLastTask > decayThreshold) {
          // Time decay
          this._stage = FLOW_STAGES.INACTIVE;
          this._successStreak = 0;
        }
        break;

      case FLOW_STAGES.ACTIVE:
        if (hasFailure) {
          // Hard drop: active → broken
          this._stage = FLOW_STAGES.BROKEN;
          this._successStreak = 0;
        } else if (timeSinceLastTask > decayThreshold * 2) {
          // Time decay (slower for active)
          this._stage = FLOW_STAGES.BUILDING;
        }
        break;

      case FLOW_STAGES.BROKEN:
        // Recovery requires 1 success to go back to building
        if (hasSuccess) {
          this._stage = FLOW_STAGES.BUILDING;
          this._successStreak = 1;
        }
        break;
    }
  }

  _calculateDepth(tasks, sprint, momentum, instability) {
    let depth = 0;

    // Base from momentum (0-40 points)
    depth += (momentum.score / 100) * 40;

    // Bonus for sustained activity (0-30 points)
    if (tasks.inProgress > 0) {
      depth += Math.min(30, tasks.inProgress * 10);
    }

    // Sprint bonus (0-20 points)
    if (sprint.active) {
      depth += 10 + (sprint.intensity * 10);
    }

    // Stability bonus (0-10 points)
    if (instability.level < THRESHOLDS.INSTABILITY_LOW) {
      depth += 10;
    } else if (instability.level < THRESHOLDS.INSTABILITY_MEDIUM) {
      depth += 5;
    }

    // Penalty for high instability
    if (instability.level >= THRESHOLDS.INSTABILITY_HIGH) {
      depth *= 0.5;
    }

    return Math.min(100, Math.max(0, depth));
  }

  /**
   * Record an interruption event (external trigger)
   */
  recordInterruption() {
    if (this._stage === FLOW_STAGES.ACTIVE) {
      this._stage = FLOW_STAGES.BROKEN;
      this._successStreak = 0;
    } else if (this._stage === FLOW_STAGES.BUILDING) {
      this._stage = FLOW_STAGES.INACTIVE;
      this._successStreak = 0;
    }
  }

  /**
   * Force break flow (called by InstabilitySystem on collapse)
   */
  forceBreak() {
    this._stage = FLOW_STAGES.BROKEN;
    this._successStreak = 0;
  }

  /**
   * Check if user is in deep flow
   * @returns {boolean}
   */
  isInDeepFlow() {
    return this._stage === FLOW_STAGES.ACTIVE && this._depth >= THRESHOLDS.FLOW_DEPTH_DEEP;
  }

  /**
   * Get current flow stage
   * @returns {string}
   */
  getCurrentStage() {
    return this._stage;
  }

  /**
   * Get current flow depth
   * @returns {number}
   */
  getCurrentDepth() {
    return this._depth;
  }

  /**
   * Reset flow state
   */
  reset() {
    this._stage = FLOW_STAGES.INACTIVE;
    this._successStreak = 0;
    this._lastSuccessTime = 0;
    this._depth = 0;
    this._lastUpdateTime = performance.now();
  }
}

window.FlowSystem = FlowSystem;
