/**
 * ComponentManager.js
 * Manages all visual components based on current mode and state
 * Handles component lifecycle and layer assignment
 */

// Using global window.MODES

const COMPONENTS = Object.freeze({
  FOCUS_ANCHOR: 'focus_anchor',
  MOMENTUM_BAR: 'momentum_bar',
  INSTABILITY_INDICATOR: 'instability_indicator',
  SPRINT_RING: 'sprint_ring',
  TASK_COUNTER: 'task_counter',
  FLOW_AURA: 'flow_aura',
  DECAY_WARNING: 'decay_warning',
  MODE_BADGE: 'mode_badge'
});

const LAYER_ORDER = Object.freeze({
  [COMPONENTS.FOCUS_ANCHOR]: 0,      // Layer 0 but RENDERED LAST (special override)
  [COMPONENTS.MODE_BADGE]: 1,
  [COMPONENTS.MOMENTUM_BAR]: 2,
  [COMPONENTS.SPRINT_RING]: 3,
  [COMPONENTS.TASK_COUNTER]: 4,
  [COMPONENTS.INSTABILITY_INDICATOR]: 5,
  [COMPONENTS.DECAY_WARNING]: 6,
  [COMPONENTS.FLOW_AURA]: 7
});

const MODE_COMPONENTS = Object.freeze({
  [MODES.IDLE]: [COMPONENTS.FOCUS_ANCHOR, COMPONENTS.MODE_BADGE, COMPONENTS.DECAY_WARNING],
  [MODES.FOCUS]: [COMPONENTS.FOCUS_ANCHOR, COMPONENTS.MODE_BADGE, COMPONENTS.MOMENTUM_BAR, COMPONENTS.TASK_COUNTER, COMPONENTS.FLOW_AURA],
  [MODES.BURST]: [COMPONENTS.FOCUS_ANCHOR, COMPONENTS.MODE_BADGE, COMPONENTS.MOMENTUM_BAR, COMPONENTS.SPRINT_RING, COMPONENTS.TASK_COUNTER],
  [MODES.HYBRID]: [COMPONENTS.FOCUS_ANCHOR, COMPONENTS.MODE_BADGE, COMPONENTS.MOMENTUM_BAR, COMPONENTS.SPRINT_RING, COMPONENTS.TASK_COUNTER, COMPONENTS.FLOW_AURA],
  [MODES.CRITICAL]: [COMPONENTS.FOCUS_ANCHOR, COMPONENTS.MODE_BADGE, COMPONENTS.INSTABILITY_INDICATOR, COMPONENTS.DECAY_WARNING],
  [MODES.RECOVERY]: [COMPONENTS.FOCUS_ANCHOR, COMPONENTS.MODE_BADGE, COMPONENTS.MOMENTUM_BAR, COMPONENTS.DECAY_WARNING]
});

class ComponentManager {
  constructor() {
    this._activeComponents = new Map();
    this._componentStates = new Map();
  }

  destroy() {
    this._activeComponents.clear();
    this._componentStates.clear();
  }

  /**
   * Arbitrate components based on modeData
   * @param {Object} modeData - Contains dominant_mode and underlying_states
   * @returns {Object} Component configuration
   */
  arbitrate(modeData) {
    const dominant_mode = modeData.dominant_mode;
    const state = modeData.underlying_states;
    const requiredComponents = MODE_COMPONENTS[dominant_mode] || MODE_COMPONENTS[MODES.IDLE];
    this._updateComponentSet(requiredComponents, state, dominant_mode);

    const activeComponents = this.getActiveComponents();
    const total = activeComponents.reduce((sum, c) => sum + (c.opacity || 0), 0);
    const threshold = 3;

    return {
      dominant_mode,
      components: activeComponents,
      total_intensity: total,
      dampening_applied: (total > threshold),
      generated_at: performance.now()
    };
  }

  _updateComponentSet(required, state, mode) {
    const current = new Set(this._activeComponents.keys());
    const requiredSet = new Set(required);

    // Remove obsolete
    for (const name of current) {
      if (!requiredSet.has(name)) {
        this._deactivateComponent(name);
      }
    }

    // Add new
    for (const name of requiredSet) {
      if (!current.has(name)) {
        this._activateComponent(name, state, mode);
      } else {
        this._updateComponent(name, state, mode);
      }
    }
  }

  _activateComponent(name, state, mode) {
    const layer = LAYER_ORDER[name] ?? 99;
    const componentState = this._computeComponentState(name, state, mode);
    
    this._activeComponents.set(name, {
      name,
      layer,
      activatedAt: performance.now(),
      visible: true,
      opacity: 0
    });
    
    this._componentStates.set(name, componentState);
  }

  _deactivateComponent(name) {
    this._activeComponents.delete(name);
    this._componentStates.delete(name);
  }

  _updateComponent(name, state, mode) {
    const componentState = this._computeComponentState(name, state, mode);
    this._componentStates.set(name, componentState);
  }

  _computeComponentState(name, state, mode) {
    switch (name) {
      case COMPONENTS.FOCUS_ANCHOR:
        return {
          mode,
          intensity: state.momentum.score / 100,
          active: state.tasks.inProgress > 0 || state.sprint.active
        };
      
      case COMPONENTS.MOMENTUM_BAR:
        return {
          value: state.momentum.score,
          peak: state.momentum.peak,
          trend: state.momentum.trend
        };
      
      case COMPONENTS.INSTABILITY_INDICATOR:
        return {
          level: state.instability.level,
          source: state.instability.source,
          critical: state.instability.level >= 70
        };
      
      case COMPONENTS.SPRINT_RING:
        return {
          active: state.sprint.active,
          progress: state.sprint.duration > 0 
            ? (performance.now() - state.sprint.startTime) / state.sprint.duration 
            : 0,
          intensity: state.sprint.intensity
        };
      
      case COMPONENTS.TASK_COUNTER:
        return {
          completed: state.tasks.completed,
          pending: state.tasks.pending,
          inProgress: state.tasks.inProgress,
          velocity: state.tasks.completionVelocity
        };
      
      case COMPONENTS.FLOW_AURA:
        return {
          depth: state.flow.depth,
          active: state.flow.depth >= 50,
          duration: performance.now() - state.flow.entryTime
        };
      
      case COMPONENTS.DECAY_WARNING:
        return {
          idleTime: state.decay.idleTime,
          rate: state.decay.rate,
          show: state.decay.idleTime > 30000
        };
      
      case COMPONENTS.MODE_BADGE:
        return {
          mode,
          duration: this._getModeDuration(mode)
        };
      
      default:
        return {};
    }
  }

  _getModeDuration(mode) {
    // Track mode duration through component activation time
    for (const [name, data] of this._activeComponents) {
      if (name === COMPONENTS.MODE_BADGE && data.activatedAt) {
        return performance.now() - data.activatedAt;
      }
    }
    return 0;
  }

  getActiveComponents() {
    const components = [];
    for (const [name, data] of this._activeComponents) {
      components.push({
        ...data,
        state: this._componentStates.get(name) || {}
      });
    }
    
    // Sort by layer (lower layer = further back)
    // Focus Anchor is layer 0 but rendered separately LAST
    return components.sort((a, b) => a.layer - b.layer);
  }

  updateComponentOpacity(name, opacity) {
    const component = this._activeComponents.get(name);
    if (component) {
      component.opacity = Math.max(0, Math.min(1, opacity));
    }
  }
}

window.ComponentManager = ComponentManager;
window.COMPONENTS = COMPONENTS;
window.LAYER_ORDER = LAYER_ORDER;
window.MODE_COMPONENTS = MODE_COMPONENTS;
