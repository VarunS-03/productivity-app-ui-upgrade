/**
 * StateEngine.js
 * Single source of truth - immutable state container
 */

class StateEngine {
  constructor() {
    this._state = this._createInitialState();
    this._listeners = new Set();
  }

  _createInitialState() {
    return Object.freeze({
      // Core state
      timestamp: performance.now(),
      
      // Task state
      tasks: {
        completed: 0,
        pending: 0,
        inProgress: 0,
        lastCompletionTime: 0,
        completionVelocity: 0
      },
      
      // Sprint state
      sprint: {
        active: false,
        startTime: 0,
        duration: 0,
        taskCount: 0,
        intensity: 0
      },
      
      // Momentum state
      momentum: {
        score: 0,
        trend: 'stable',
        peak: 0,
        baseline: 100
      },
      
      // Instability state
      instability: {
        level: 0,
        source: null,
        spikeTime: 0,
        decayRate: 0.1
      },
      
      // Decay state
      decay: {
        rate: 0,
        lastActivity: performance.now(),
        idleTime: 0
      },
      
      // Timer state
      timer: {
        active: false,
        remaining: 0,
        duration: 0,
        type: null
      },
      
      // Flow state
      flow: {
        depth: 0,
        entryTime: 0,
        interruptions: 0
      }
    });
  }

  getState() {
    return this._state;
  }

  tick() {
    return this._state;
  }

  update(updates) {
    const newState = this._mergeState(this._state, updates);
    this._state = Object.freeze(newState);
    this._notifyListeners();
    return this._state;
  }

  _mergeState(current, updates) {
    return Object.freeze({
      ...current,
      ...updates,
      timestamp: performance.now(),
      tasks: updates.tasks ? Object.freeze({ ...current.tasks, ...updates.tasks }) : current.tasks,
      sprint: updates.sprint ? Object.freeze({ ...current.sprint, ...updates.sprint }) : current.sprint,
      momentum: updates.momentum ? Object.freeze({ ...current.momentum, ...updates.momentum }) : current.momentum,
      instability: updates.instability ? Object.freeze({ ...current.instability, ...updates.instability }) : current.instability,
      decay: updates.decay ? Object.freeze({ ...current.decay, ...updates.decay }) : current.decay,
      timer: updates.timer ? Object.freeze({ ...current.timer, ...updates.timer }) : current.timer,
      flow: updates.flow ? Object.freeze({ ...current.flow, ...updates.flow }) : current.flow
    });
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  _notifyListeners() {
    this._listeners.forEach(listener => {
      try {
        listener(this._state);
      } catch (error) {
        console.error('State listener error:', error);
      }
    });
  }
}

window.StateEngine = StateEngine;
