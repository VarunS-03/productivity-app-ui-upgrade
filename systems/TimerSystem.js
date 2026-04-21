/**
 * TimerSystem.js
 * Delta-time based deterministic timer system
 * NO setTimeout - all timers synchronized to system loop
 */

// Using global window.CONFIG
const TIMING = window.CONFIG?.TIMING || {};

class TimerSystem {
  constructor(stateEngine) {
    this._stateEngine = stateEngine;
    this._timers = new Map();
    this._nextId = 1;
  }

  /**
   * Update all active timers
   * @param {Object} currentState - Current system state
   * @returns {Object} Timer state updates (primary timer)
   */
  update(currentState) {
    const now = performance.now();
    const updates = [];

    // Update all timers
    for (const [id, timer] of this._timers) {
      const remaining = Math.max(0, timer.endTime - now);
      const progress = 1 - (remaining / timer.duration);

      if (remaining <= 0 && !timer.completed) {
        timer.completed = true;
        timer.onComplete?.();
        updates.push({ id, status: 'completed' });
      }

      timer.remaining = remaining;
      timer.progress = progress;
    }

    // Get primary (most important) timer
    const primaryTimer = this._getPrimaryTimer();

    return {
      timer: {
        active: primaryTimer !== null,
        remaining: primaryTimer?.remaining || 0,
        duration: primaryTimer?.duration || 0,
        type: primaryTimer?.type || null,
        progress: primaryTimer?.progress || 0,
        id: primaryTimer?.id || null
      }
    };
  }

  _getPrimaryTimer() {
    // Priority: sprint > break > custom
    const priorities = { sprint: 3, break: 2, custom: 1 };
    
    let primary = null;
    let highestPriority = 0;

    for (const timer of this._timers.values()) {
      if (timer.completed) continue;
      
      const priority = priorities[timer.type] || 0;
      if (priority > highestPriority) {
        highestPriority = priority;
        primary = timer;
      }
    }

    return primary;
  }

  /**
   * Start a new timer
   * @param {number} duration - Duration in milliseconds
   * @param {string} type - Timer type (sprint, break, custom)
   * @param {Function} onComplete - Callback when timer completes
   * @returns {number} Timer ID
   */
  startTimer(duration, type = 'custom', onComplete = null) {
    const id = this._nextId++;
    const now = performance.now();

    this._timers.set(id, {
      id,
      type,
      duration,
      remaining: duration,
      startTime: now,
      endTime: now + duration,
      progress: 0,
      completed: false,
      onComplete
    });

    return id;
  }

  /**
   * Stop a specific timer
   * @param {number} id - Timer ID
   * @returns {boolean} True if timer was stopped
   */
  stopTimer(id) {
    return this._timers.delete(id);
  }

  /**
   * Stop all timers of a specific type
   * @param {string} type - Timer type
   */
  stopTimersByType(type) {
    for (const [id, timer] of this._timers) {
      if (timer.type === type) {
        this._timers.delete(id);
      }
    }
  }

  /**
   * Get timer by ID
   * @param {number} id - Timer ID
   * @returns {Object|null}
   */
  getTimer(id) {
    const timer = this._timers.get(id);
    if (!timer) return null;

    return {
      id: timer.id,
      type: timer.type,
      duration: timer.duration,
      remaining: timer.remaining,
      progress: timer.progress,
      completed: timer.completed
    };
  }

  /**
   * Get all active timers
   * @returns {Array}
   */
  getActiveTimers() {
    return Array.from(this._timers.values())
      .filter(t => !t.completed)
      .map(t => ({
        id: t.id,
        type: t.type,
        duration: t.duration,
        remaining: t.remaining,
        progress: t.progress
      }));
  }

  /**
   * Check if any timer is active
   * @returns {boolean}
   */
  hasActiveTimer() {
    for (const timer of this._timers.values()) {
      if (!timer.completed) return true;
    }
    return false;
  }

  /**
   * Get remaining time of primary timer
   * @returns {number}
   */
  getRemaining() {
    const primary = this._getPrimaryTimer();
    return primary?.remaining || 0;
  }

  /**
   * Extend a timer
   * @param {number} id - Timer ID
   * @param {number} additionalTime - Time to add in milliseconds
   */
  extendTimer(id, additionalTime) {
    const timer = this._timers.get(id);
    if (!timer || timer.completed) return;

    timer.endTime += additionalTime;
    timer.duration += additionalTime;
  }

  /**
   * Reset timer system
   */
  reset() {
    this._timers.clear();
    this._nextId = 1;
  }
}

window.TimerSystem = TimerSystem;
