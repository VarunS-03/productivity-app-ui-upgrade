/**
 * TransitionManager.js
 * Manages all transitions with dampening and stability buffer
 * Handles escalations (instant) vs de-escalations (timed)
 */

// Using global window.isEscalation, window.isDeescalation, window.MODES

const TIMING = Object.freeze({
  STABILITY_BUFFER: 200,        // Anti-jitter buffer (ms)
  DEESCALATION_MIN: 100,       // Minimum de-escalation time (ms)
  DEESCALATION_MAX: 500,       // Maximum de-escalation time (ms)
  ESCALATION_INSTANT: 0,       // Escalations are immediate
  OPACITY_TRANSITION: 150      // Component fade (ms)
});

const DAMPENING = Object.freeze({
  INTENSITY_LOW: 0.3,
  INTENSITY_MEDIUM: 0.6,
  INTENSITY_HIGH: 1.0,
  VELOCITY_THRESHOLD: 5,
  SPAM_WINDOW: 1000
});

class TransitionManager {
  constructor() {
    this._currentMode = MODES.IDLE;
    this._targetMode = null;
    this._isTransitioning = false;
    this._transitionStart = 0;
    this._duration = 0;
    this._progress = 0;
    this._lastStateChange = 0;
    this._stateHistory = [];
    this._completionTimestamps = [];
  }

  destroy() {
    // No external dependencies to clean up
  }

  /**
   * Update transition manager with mode_data
   * @param {Object} mode_data - Contains dominant_mode and underlying_states
   * @returns {Object} Transition state
   */
  update(mode_data) {
    const now = performance.now();
    this._lastStateChange = now;

    const dominant_mode = mode_data.dominant_mode;
    const underlying = mode_data.underlying_states;

    // Track completion timestamps for spam detection
    if (underlying && underlying.tasks && underlying.tasks.lastCompletionTime > 0) {
      this._completionTimestamps.push(underlying.tasks.lastCompletionTime);
      this._pruneOldCompletions(now);
    }

    // Update history for intensity calculation
    const momentumScore = underlying && underlying.momentum ? underlying.momentum.score : 0;
    this._stateHistory.push({ timestamp: now, momentum: momentumScore });
    this._pruneOldHistory(now);

    // Determine if transition needed
    const isEsc = isEscalation(this._currentMode, dominant_mode);
    const isDeesc = isDeescalation(this._currentMode, dominant_mode);

    if (this._targetMode !== dominant_mode && (isEsc || isDeesc)) {
      this._targetMode = dominant_mode;
      this._isTransitioning = true;
      this._transitionStart = now;
      this._duration = isEsc ? 0 : this._calculateDampenedDuration(this._calculateIntensity());
    }

    // Calculate progress
    let progress = 0;
    if (this._isTransitioning && this._duration > 0) {
      progress = Math.min(1, (now - this._transitionStart) / this._duration);
      if (progress >= 1) {
        this._currentMode = this._targetMode;
        this._isTransitioning = false;
        progress = 0;
      }
    } else if (this._isTransitioning && this._duration === 0) {
      this._currentMode = this._targetMode;
      this._isTransitioning = false;
      progress = 1;
    }

    return {
      from_mode: this._currentMode,
      to_mode: this._targetMode || this._currentMode,
      is_transitioning: this._isTransitioning,
      progress: progress,
      easing: this._getEasing(this._currentMode, this._targetMode || this._currentMode),
      instant: this._duration === 0
    };
  }

  _getEasing(from, to) {
    if (isEscalation(from, to)) return 'easeOut';
    if (isDeescalation(from, to)) return 'easeIn';
    return 'linear';
  }

  _pruneOldCompletions(now) {
    const cutoff = now - DAMPENING.SPAM_WINDOW;
    this._completionTimestamps = this._completionTimestamps.filter(t => t >= cutoff);
  }

  _pruneOldHistory(now) {
    const cutoff = now - 5000; // Keep 5 seconds
    this._stateHistory = this._stateHistory.filter(h => h.timestamp >= cutoff);
  }

  /**
   * Request mode transition with dampening
   * @param {string} targetMode - Requested mode
   * @returns {Object} Transition decision
   */
  requestTransition(targetMode) {
    const now = performance.now();
    
    if (targetMode === this._currentMode) {
      return { allowed: false, mode: this._currentMode, reason: 'same_mode' };
    }

    const isEsc = isEscalation(this._currentMode, targetMode);
    const intensity = this._calculateIntensity();
    
    // Escalations: Instant but respect stability buffer
    if (isEsc) {
      const timeSinceLastChange = now - this._lastStateChange;
      
      if (timeSinceLastChange < TIMING.STABILITY_BUFFER) {
        return { allowed: false, mode: this._currentMode, reason: 'stability_buffer' };
      }
      
      return this._executeTransition(targetMode, now, TIMING.ESCALATION_INSTANT);
    }
    
    // De-escalations: Timed with intensity-based dampening
    return this._handleDeescalation(targetMode, now, intensity);
  }

  _handleDeescalation(targetMode, now, intensity) {
    // Higher intensity = longer de-escalation (more dampening)
    const dampenedDuration = this._calculateDampenedDuration(intensity);
    
    if (!this._pendingMode) {
      // Start de-escalation timer
      this._pendingMode = targetMode;
      this._transitionStartTime = now;
      
      return {
        allowed: false,
        mode: this._currentMode,
        pending: targetMode,
        remaining: dampenedDuration,
        reason: 'deescalation_timer_started'
      };
    }
    
    if (this._pendingMode !== targetMode) {
      // Reset timer if target changed
      this._pendingMode = targetMode;
      this._transitionStartTime = now;
      
      return {
        allowed: false,
        mode: this._currentMode,
        pending: targetMode,
        remaining: dampenedDuration,
        reason: 'deescalation_target_changed'
      };
    }
    
    const elapsed = now - this._transitionStartTime;
    
    if (elapsed >= dampenedDuration) {
      return this._executeTransition(targetMode, now, dampenedDuration);
    }
    
    return {
      allowed: false,
      mode: this._currentMode,
      pending: targetMode,
      remaining: dampenedDuration - elapsed,
      progress: elapsed / dampenedDuration,
      reason: 'deescalation_in_progress'
    };
  }

  _executeTransition(targetMode, now, duration) {
    const previousMode = this._currentMode;
    this._currentMode = targetMode;
    this._pendingMode = null;
    this._transitionStartTime = 0;
    
    return {
      allowed: true,
      mode: targetMode,
      previousMode,
      duration,
      timestamp: now,
      reason: 'transition_complete'
    };
  }

  _calculateIntensity() {
    const now = performance.now();
    
    // Spam detection
    const completionRate = this._completionTimestamps.length;
    const isSpamming = completionRate > DAMPENING.VELOCITY_THRESHOLD;
    
    // Momentum volatility
    let volatility = 0;
    if (this._stateHistory.length > 1) {
      const deltas = [];
      for (let i = 1; i < this._stateHistory.length; i++) {
        deltas.push(Math.abs(this._stateHistory[i].momentum - this._stateHistory[i - 1].momentum));
      }
      volatility = deltas.reduce((a, b) => a + b, 0) / (deltas.length || 1);
    }
    
    // Combine factors
    if (isSpamming) return DAMPENING.INTENSITY_HIGH;
    if (volatility > 30) return DAMPENING.INTENSITY_MEDIUM;
    return DAMPENING.INTENSITY_LOW;
  }

  _calculateDampenedDuration(intensity) {
    const range = TIMING.DEESCALATION_MAX - TIMING.DEESCALATION_MIN;
    const dampened = TIMING.DEESCALATION_MIN + (range * (1 - intensity));
    return Math.max(TIMING.DEESCALATION_MIN, Math.min(TIMING.DEESCALATION_MAX, dampened));
  }

  getCurrentMode() {
    return this._currentMode;
  }

  getPendingMode() {
    return this._pendingMode;
  }

  /**
   * Calculate opacity for component transitions
   * @param {number} startTime - Transition start timestamp
   * @param {boolean} entering - True if entering, false if exiting
   * @returns {number} Current opacity (0-1)
   */
  calculateOpacity(startTime, entering) {
    const now = performance.now();
    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / TIMING.OPACITY_TRANSITION);
    
    return entering ? progress : 1 - progress;
  }

  /**
   * Get transition timing constants
   * @returns {Object} Timing configuration
   */
  getTiming() {
    return { ...TIMING };
  }
}

window.TransitionManager = TransitionManager;
window.TIMING = TIMING;
window.DAMPENING = DAMPENING;
