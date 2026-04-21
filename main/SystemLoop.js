/**
 * SystemLoop.js
 * Main system loop - orchestrates all subsystems
 * STATE → MODE RESOLVER → COMPONENT MANAGER → TRANSITION MANAGER → RENDER
 */

// All dependencies loaded via global script tags

class SystemLoop {
  constructor(canvas, container) {
    // Core
    this._stateEngine = new StateEngine();
    this._componentManager = new ComponentManager();
    this._transitionManager = new TransitionManager();
    this._renderLayer = new RenderLayer(canvas, container);
    this._renderRegistry = new RenderRegistry();

    // Subsystems
    this._flowSystem = new FlowSystem(this._stateEngine);
    this._sprintSystem = new SprintSystem(this._stateEngine);
    this._momentumSystem = new MomentumSystem(this._stateEngine);
    this._instabilitySystem = new InstabilitySystem(this._stateEngine);
    this._decaySystem = new DecaySystem(this._stateEngine);
    this._timerSystem = new TimerSystem(this._stateEngine);

    // Loop state
    this._running = false;
    this._animationFrame = null;
    this._lastLoopTime = 0;
    this._frameInterval = 1000 / 60; // 60 FPS target
    this._fps = 60;

    // Debug
    this._debug = CONFIG.DEBUG;
  }

  /**
   * Start the system loop
   */
  start() {
    if (this._running) return;
    
    this._running = true;
    this._lastLoopTime = performance.now();
    this._loop();
  }

  /**
   * Stop the system loop
   */
  stop() {
    this._running = false;
    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
      this._animationFrame = null;
    }
  }

  /**
   * Destroy system and cleanup
   */
  destroy() {
    this.stop();
    this._componentManager.destroy();
    this._transitionManager.destroy();
    this._renderLayer.destroy();
  }

  /**
   * Main system loop
   */
  _loop() {
    if (!this._running) return;

    const now = performance.now();
    const deltaTime = now - this._lastLoopTime;

    // FPS limiting
    if (deltaTime >= this._frameInterval) {
      this._lastLoopTime = now - (deltaTime % this._frameInterval);
      this._fps = 1000 / deltaTime;

      this._update(now, deltaTime);
    }

    this._animationFrame = requestAnimationFrame(() => this._loop());
  }

  /**
   * Single update cycle: STATE → MODE → COMPONENTS → TRANSITION → RENDER
   */
  _update(now, deltaTime) {
    // STEP 5 FINAL FIX:
    // SystemLoop fully passive — no subsystem interaction

    const state = this._stateEngine.tick();
    const modeData = ModeResolver.resolve(state);
    const componentConfig = this._componentManager.arbitrate(modeData);
    const transitionState = this._transitionManager.update(modeData);
    this._renderLayer.draw(componentConfig, transitionState);

    // Debug output
    if (this._debug.LOG_RENDER_STATS && state.timestamp % 1000 < 20) {
      console.log(`[System] FPS: ${Math.round(this._fps)}, Mode: ${transitionState.to_mode}`);
    }
  }

  /**
   * Update all subsystems and collect state changes
   */
  _updateSubsystems(currentState) {
    // === STEP 5 FINAL FIX: DISABLED DUPLICATE SYSTEM UPDATES ===
    // NOTE: Systems are updated exclusively in visual-engine.js (_tick)
    // All system.update() calls removed to prevent double-updates and race conditions

    return {};
  }

  // ============ PUBLIC API ============

  /**
   * Complete a task
   */
  taskCompleted() {
    const now = performance.now();
    const state = this._stateEngine.getState();
    
    this._stateEngine.update({
      tasks: {
        completed: state.tasks.completed + 1,
        lastCompletionTime: now
      }
    });

    // Record in sprint if active
    if (this._sprintSystem.isActive()) {
      this._sprintSystem.recordTask();
    }

    // Boost momentum
    this._momentumSystem.boost(5);

    // Record activity
    this._decaySystem.recordActivity();
  }

  /**
   * Start a new task
   */
  taskStarted() {
    const state = this._stateEngine.getState();
    this._stateEngine.update({
      tasks: {
        inProgress: state.tasks.inProgress + 1
      }
    });
    this._decaySystem.recordActivity();
  }

  /**
   * End a task (cancelled/abandoned)
   */
  taskEnded() {
    const state = this._stateEngine.getState();
    this._stateEngine.update({
      tasks: {
        inProgress: Math.max(0, state.tasks.inProgress - 1)
      }
    });
    this._decaySystem.recordActivity();
  }

  /**
   * Start a sprint
   * @param {number} duration - Sprint duration in ms (default 60s)
   */
  startSprint(duration = 60000) {
    const sprintState = this._sprintSystem.startSprint(duration);
    if (sprintState) {
      this._stateEngine.update(sprintState);
    }
  }

  /**
   * End the current sprint
   */
  endSprint() {
    const sprintState = this._sprintSystem.endSprint();
    if (sprintState) {
      this._stateEngine.update(sprintState);
    }
  }

  /**
   * Trigger instability spike
   * @param {string} source - Source of instability
   */
  triggerInstability(source = 'EXTERNAL') {
    this._instabilitySystem.spike(source);
  }

  /**
   * Record interruption
   */
  recordInterruption() {
    this._flowSystem.recordInterruption();
    this._instabilitySystem.interruption();
  }

  /**
   * Get current system state
   * @returns {Object}
   */
  getState() {
    return this._stateEngine.getState();
  }

  /**
   * Get current mode
   * @returns {string}
   */
  getMode() {
    return this._transitionManager.getCurrentMode();
  }

  /**
   * Get render stats
   * @returns {Object}
   */
  getStats() {
    return {
      fps: Math.round(this._fps),
      ...this._renderLayer.getStats()
    };
  }

  /**
   * Subscribe to state changes
   * @param {Function} listener
   */
  subscribe(listener) {
    return this._stateEngine.subscribe(listener);
  }

  /**
   * Reset entire system
   */
  reset() {
    this._flowSystem.reset();
    this._sprintSystem.reset();
    this._momentumSystem.reset();
    this._instabilitySystem.reset();
    this._decaySystem.reset();
    this._timerSystem.reset();
  }

  /**
   * Set FPS limit
   * @param {number} fps - Target FPS
   */
  setTargetFps(fps) {
    this._frameInterval = 1000 / fps;
  }
}

window.SystemLoop = SystemLoop;
