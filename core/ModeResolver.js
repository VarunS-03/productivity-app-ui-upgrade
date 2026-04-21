/**
 * ModeResolver.js
 * Dominant interpretation layer - resolves mode from state
 * Pure function - deterministic output for given input
 */

const MODES = Object.freeze({
  IDLE: 'idle',
  FOCUS: 'focus',
  BURST: 'burst',
  HYBRID: 'hybrid',
  CRITICAL: 'critical',
  RECOVERY: 'recovery'
});

const THRESHOLDS = Object.freeze({
  MOMENTUM_LOW: 30,
  MOMENTUM_MEDIUM: 60,
  MOMENTUM_HIGH: 85,
  INSTABILITY_CRITICAL: 70,
  INSTABILITY_HIGH: 50,
  INSTABILITY_MEDIUM: 25,
  SPRINT_ACTIVE_MIN: 1,
  FLOW_ENTRY_DEPTH: 50
});

/**
 * Resolve mode from current state
 * @param {Object} state - Current immutable state
 * @returns {string} Resolved mode
 */
function resolveMode(state) {
  const { momentum, instability, sprint, flow, decay, tasks } = state;

  // Critical: Instability takes precedence
  if (instability.level >= THRESHOLDS.INSTABILITY_CRITICAL) {
    return MODES.CRITICAL;
  }

  // Recovery: High instability + low momentum
  if (instability.level >= THRESHOLDS.INSTABILITY_HIGH && momentum.score < THRESHOLDS.MOMENTUM_MEDIUM) {
    return MODES.RECOVERY;
  }

  // Burst: Active sprint OR high momentum + high velocity
  if (sprint.active && sprint.intensity > 0.7) {
    return MODES.BURST;
  }

  if (momentum.score >= THRESHOLDS.MOMENTUM_HIGH && tasks.completionVelocity > 5) {
    return MODES.BURST;
  }

  // Hybrid: Medium-high momentum + active tasks
  if (momentum.score >= THRESHOLDS.MOMENTUM_MEDIUM && tasks.inProgress > 0) {
    return MODES.HYBRID;
  }

  // Focus: Deep flow OR high momentum
  if (flow.depth >= THRESHOLDS.FLOW_ENTRY_DEPTH || momentum.score >= THRESHOLDS.MOMENTUM_HIGH) {
    return MODES.FOCUS;
  }

  // Idle: Low momentum + no active work
  if (momentum.score < THRESHOLDS.MOMENTUM_LOW && tasks.inProgress === 0 && !sprint.active) {
    return MODES.IDLE;
  }

  // Default to focus for any active work
  if (tasks.inProgress > 0 || tasks.pending > 0) {
    return MODES.FOCUS;
  }

  return MODES.IDLE;
}

/**
 * Get mode priority for escalation comparison
 * @param {string} mode - Mode string
 * @returns {number} Priority value (higher = more urgent)
 */
function getModePriority(mode) {
  const priorities = {
    [MODES.CRITICAL]: 100,
    [MODES.RECOVERY]: 90,
    [MODES.BURST]: 80,
    [MODES.HYBRID]: 60,
    [MODES.FOCUS]: 50,
    [MODES.IDLE]: 10
  };
  return priorities[mode] || 0;
}

/**
 * Check if mode transition is escalation
 * @param {string} from - Current mode
 * @param {string} to - Target mode
 * @returns {boolean} True if escalation
 */
function isEscalation(from, to) {
  return getModePriority(to) > getModePriority(from);
}

/**
 * Check if mode transition is de-escalation
 * @param {string} from - Current mode
 * @param {string} to - Target mode
 * @returns {boolean} True if de-escalation
 */
function isDeescalation(from, to) {
  return getModePriority(to) < getModePriority(from);
}

const ModeResolver = {
  resolve(state) {
    const dominant_mode = resolveMode(state);
    return {
      dominant_mode: dominant_mode,
      underlying_states: {
        flow: state.flow,
        sprint: state.sprint,
        momentum: state.momentum,
        instability: state.instability,
        tasks: state.tasks,
        decay: state.decay,
        archetype: state.archetype,
        interrupt: state.interrupt
      },
      visual_dominance: this._getDominanceConfig(dominant_mode, state)
    };
  },

  _getDominanceConfig(mode, state) {
    const configs = {
      critical: { layer: 5, opacity: 1.0, urgent: true },
      burst: { layer: 4, opacity: 0.95, urgent: false },
      hybrid: { layer: 3, opacity: 0.9, urgent: false },
      focus: { layer: 2, opacity: 0.85, urgent: false },
      recovery: { layer: 1, opacity: 0.8, urgent: true },
      idle: { layer: 0, opacity: 0.7, urgent: false }
    };
    return configs[mode] || configs.idle;
  }
};

window.MODES = MODES;
window.THRESHOLDS = THRESHOLDS;
window.resolveMode = resolveMode;
window.getModePriority = getModePriority;
window.isEscalation = isEscalation;
window.isDeescalation = isDeescalation;
window.ModeResolver = ModeResolver;
