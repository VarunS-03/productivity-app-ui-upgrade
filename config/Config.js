/**
 * Config.js
 * System configuration constants and thresholds
 * Immutable configuration object
 */

const CONFIG = Object.freeze({
  // Timing constants
  TIMING: Object.freeze({
    STABILITY_BUFFER: 200,        // Anti-jitter buffer (ms)
    DEESCALATION_MIN: 100,        // Minimum de-escalation time (ms)
    DEESCALATION_MAX: 500,        // Maximum de-escalation time (ms)
    OPACITY_TRANSITION: 150,      // Component fade duration (ms)
    FPS_MIN: 30,                  // Minimum acceptable FPS
    FPS_CRITICAL: 15,             // Critical FPS threshold
    IDLE_THRESHOLD: 30000,        // Idle time before decay (ms)
    DECAY_INTERVAL: 1000,        // Decay calculation interval (ms)
    SPRINT_MIN_DURATION: 60000,  // Minimum sprint length (ms)
    FLOW_ENTRY_TIME: 300000      // Time to enter flow state (ms)
  }),

  // Thresholds
  THRESHOLDS: Object.freeze({
    MOMENTUM_LOW: 30,
    MOMENTUM_MEDIUM: 60,
    MOMENTUM_HIGH: 85,
    MOMENTUM_PEAK: 95,
    
    INSTABILITY_CRITICAL: 70,
    INSTABILITY_HIGH: 50,
    INSTABILITY_MEDIUM: 25,
    INSTABILITY_LOW: 10,
    
    FLOW_DEPTH_ENTRY: 50,
    FLOW_DEPTH_DEEP: 80,
    
    SPRINT_ACTIVE_MIN: 1,
    SPRINT_INTENSITY_LOW: 0.3,
    SPRINT_INTENSITY_HIGH: 0.7,
    
    TASK_VELOCITY_HIGH: 5,
    TASK_VELOCITY_BURST: 10
  }),

  // Dampening factors
  DAMPENING: Object.freeze({
    INTENSITY_LOW: 0.3,
    INTENSITY_MEDIUM: 0.6,
    INTENSITY_HIGH: 1.0,
    VELOCITY_THRESHOLD: 5,
    SPAM_WINDOW: 1000,
    MOMENTUM_SENSITIVITY: 0.5
  }),

  // Momentum calculation
  MOMENTUM: Object.freeze({
    BASELINE: 100,
    DECAY_RATE_IDLE: 0.5,
    DECAY_RATE_ACTIVE: 0.1,
    BOOST_PER_TASK: 5,
    BOOST_MAX: 50,
    RECOVERY_RATE: 2
  }),

  // Instability sources and weights
  INSTABILITY: Object.freeze({
    SOURCES: Object.freeze({
      INTERRUPTION: 30,
      ERROR: 25,
      TIMEOUT: 20,
      OVERLOAD: 15,
      EXTERNAL: 10
    }),
    DECAY_RATE_SLOW: 0.05,
    DECAY_RATE_FAST: 0.15
  }),

  // Render settings
  RENDER: Object.freeze({
    CANVAS_SCALE: window.devicePixelRatio || 1,
    ANTI_ALIAS: true,
    USE_REQUEST_ANIMATION_FRAME: true,
    MAX_LAYERS: 8,
    BLEND_MODE: 'source-over'
  }),

  // System modes
  MODES: Object.freeze({
    IDLE: 'idle',
    FOCUS: 'focus',
    BURST: 'burst',
    HYBRID: 'hybrid',
    CRITICAL: 'critical',
    RECOVERY: 'recovery'
  }),

  // Mode priorities (higher = more urgent)
  MODE_PRIORITIES: Object.freeze({
    CRITICAL: 100,
    RECOVERY: 90,
    BURST: 80,
    HYBRID: 60,
    FOCUS: 50,
    IDLE: 10
  }),

  // Components
  COMPONENTS: Object.freeze({
    FOCUS_ANCHOR: 'focus_anchor',
    MOMENTUM_BAR: 'momentum_bar',
    INSTABILITY_INDICATOR: 'instability_indicator',
    SPRINT_RING: 'sprint_ring',
    TASK_COUNTER: 'task_counter',
    FLOW_AURA: 'flow_aura',
    DECAY_WARNING: 'decay_warning',
    MODE_BADGE: 'mode_badge'
  }),

  // Layer order (0 = Focus Anchor, but rendered LAST)
  LAYER_ORDER: Object.freeze({
    FOCUS_ANCHOR: 0,
    MODE_BADGE: 1,
    MOMENTUM_BAR: 2,
    SPRINT_RING: 3,
    TASK_COUNTER: 4,
    INSTABILITY_INDICATOR: 5,
    DECAY_WARNING: 6,
    FLOW_AURA: 7
  }),

  // Debug options
  DEBUG: Object.freeze({
    LOG_STATE_CHANGES: false,
    LOG_MODE_TRANSITIONS: true,
    LOG_RENDER_STATS: false,
    SHOW_FPS: true,
    ENABLE_PROFILING: false
  })
});

window.CONFIG = CONFIG;
