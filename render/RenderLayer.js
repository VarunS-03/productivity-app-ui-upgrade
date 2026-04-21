/**
 * RenderLayer.js
 * PURE render pipeline - NO logic, only rendering
 * Critical: Focus Anchor rendered LAST regardless of layer
 */

// Using global window.COMPONENTS

class RenderLayer {
  constructor(canvas, container) {
    this._canvas = canvas;
    this._container = container;
    this._ctx = canvas ? canvas.getContext('2d') : null;
    this._domElements = new Map();
    this._renderStats = {
      lastFrameTime: 0,
      frameCount: 0,
      fps: 0
    };
  }

  destroy() {
    this._domElements.forEach(el => el.remove());
    this._domElements.clear();
  }

  /**
   * Main render entry point (draw alias)
   * @param {Object} componentConfig - Component configuration from ComponentManager
   * @param {Object} transitionState - Current transition state
   */
  draw(componentConfig, transitionState) {
    const components = componentConfig.components || [];
    const focusAnchor = components.find(c => c.name === 'focus_anchor') || null;
    const mode = transitionState.to_mode || transitionState.from_mode || 'idle';
    this.render(components, focusAnchor, mode);
  }

  /**
   * Main render entry point
   * @param {Array} components - All active components (sorted by layer)
   * @param {Object} focusAnchor - Focus anchor component (special override)
   * @param {string} currentMode - Current system mode
   */
  render(components, focusAnchor, currentMode) {
    const now = performance.now();
    this._updateStats(now);

    // Clear
    this._clear();

    // Phase 1: Render all components EXCEPT focus_anchor by layer order
    for (const component of components) {
      if (component.name !== COMPONENTS.FOCUS_ANCHOR) {
        this._renderComponent(component, currentMode);
      }
    }

    // Phase 2: Render Focus Anchor LAST (foreground override)
    if (focusAnchor) {
      this._renderFocusAnchor(focusAnchor, currentMode);
    }

    this._renderStats.lastFrameTime = now;
  }

  _clear() {
    if (this._ctx) {
      this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    }
  }

  _renderComponent(component, mode) {
    const { name, layer, opacity, state } = component;

    // Skip if not visible
    if (opacity <= 0) return;

    switch (name) {
      case COMPONENTS.MOMENTUM_BAR:
        this._renderMomentumBar(state, opacity, mode);
        break;
      case COMPONENTS.INSTABILITY_INDICATOR:
        this._renderInstabilityIndicator(state, opacity, mode);
        break;
      case COMPONENTS.SPRINT_RING:
        this._renderSprintRing(state, opacity, mode);
        break;
      case COMPONENTS.TASK_COUNTER:
        this._renderTaskCounter(state, opacity, mode);
        break;
      case COMPONENTS.FLOW_AURA:
        this._renderFlowAura(state, opacity, mode);
        break;
      case COMPONENTS.DECAY_WARNING:
        this._renderDecayWarning(state, opacity, mode);
        break;
      case COMPONENTS.MODE_BADGE:
        this._renderModeBadge(state, opacity, mode);
        break;
    }
  }

  /**
   * Focus Anchor - SPECIAL FOREGROUND OVERRIDE
   * Always rendered last, always on top
   */
  _renderFocusAnchor(focusAnchor, mode) {
    const { state, opacity } = focusAnchor;
    const { intensity, active } = state;

    if (this._ctx) {
      const centerX = this._canvas.width / 2;
      const centerY = this._canvas.height / 2;
      
      // Base size varies with intensity
      const baseSize = 60 + (intensity * 40);
      const pulse = 1 + (Math.sin(performance.now() / 300) * 0.05 * intensity);
      const size = baseSize * pulse;

      // Glow effect (multiple passes for intensity)
      const glowIntensity = active ? 0.6 + (intensity * 0.4) : 0.3;
      const glowColor = this._getAnchorColor(mode, intensity);

      // Outer glow
      for (let i = 3; i >= 0; i--) {
        this._ctx.beginPath();
        this._ctx.arc(centerX, centerY, size + (i * 15), 0, Math.PI * 2);
        this._ctx.fillStyle = this._withAlpha(glowColor, glowIntensity * 0.1 * opacity);
        this._ctx.fill();
      }

      // Core circle
      this._ctx.beginPath();
      this._ctx.arc(centerX, centerY, size, 0, Math.PI * 2);
      this._ctx.fillStyle = this._withAlpha(this._getAnchorFill(mode), opacity);
      this._ctx.fill();

      // Border
      this._ctx.beginPath();
      this._ctx.arc(centerX, centerY, size, 0, Math.PI * 2);
      this._ctx.strokeStyle = this._withAlpha(glowColor, 0.8 * opacity);
      this._ctx.lineWidth = 3;
      this._ctx.stroke();

      // Inner indicator
      if (active) {
        this._ctx.beginPath();
        this._ctx.arc(centerX, centerY, size * 0.4, 0, Math.PI * 2);
        this._ctx.fillStyle = this._withAlpha(glowColor, 0.6 * opacity);
        this._ctx.fill();
      }
    }

    // DOM fallback
    this._ensureDomElement('focus-anchor', el => {
      el.style.cssText = `
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        width: ${120 + (intensity * 80)}px;
        height: ${120 + (intensity * 80)}px;
        border-radius: 50%;
        background: radial-gradient(circle, ${this._getAnchorFill(mode)} 30%, transparent 70%);
        border: 3px solid ${this._getAnchorColor(mode, intensity)};
        opacity: ${opacity};
        pointer-events: auto;
        z-index: 1000;
        box-shadow: 0 0 ${30 + (intensity * 40)}px ${this._getAnchorColor(mode, intensity)};
      `;
    });
  }

  _renderMomentumBar(state, opacity, mode) {
    const { value, peak, trend } = state;
    
    if (this._ctx) {
      const x = 20;
      const y = this._canvas.height - 40;
      const width = 200;
      const height = 16;

      // Background
      this._ctx.fillStyle = this._withAlpha('#1a1a2e', 0.6 * opacity);
      this._ctx.fillRect(x, y, width, height);

      // Fill
      const fillWidth = (value / 100) * width;
      const color = trend === 'rising' ? '#4ade80' : trend === 'falling' ? '#f87171' : '#60a5fa';
      
      this._ctx.fillStyle = this._withAlpha(color, 0.8 * opacity);
      this._ctx.fillRect(x, y, fillWidth, height);

      // Peak marker
      const peakX = x + (peak / 100) * width;
      this._ctx.fillStyle = this._withAlpha('#ffffff', 0.5 * opacity);
      this._ctx.fillRect(peakX - 1, y - 2, 2, height + 4);
    }
  }

  _renderInstabilityIndicator(state, opacity, mode) {
    const { level, critical } = state;

    if (this._ctx) {
      const x = this._canvas.width - 100;
      const y = 30;

      // Warning triangle
      const size = 30 + (level / 100) * 20;
      const jitter = critical ? (Math.random() - 0.5) * 4 : 0;

      this._ctx.beginPath();
      this._ctx.moveTo(x + jitter, y - size / 2);
      this._ctx.lineTo(x - size / 2 + jitter, y + size / 2);
      this._ctx.lineTo(x + size / 2 + jitter, y + size / 2);
      this._ctx.closePath();

      this._ctx.fillStyle = this._withAlpha(critical ? '#ef4444' : '#f59e0b', 0.8 * opacity);
      this._ctx.fill();

      // Warning text
      this._ctx.fillStyle = this._withAlpha('#ffffff', opacity);
      this._ctx.font = 'bold 14px sans-serif';
      this._ctx.fillText(critical ? 'CRITICAL' : 'WARNING', x - 30, y + size + 15);
    }
  }

  _renderSprintRing(state, opacity, mode) {
    const { active, progress, intensity } = state;

    if (this._ctx && active) {
      const centerX = this._canvas.width / 2;
      const centerY = this._canvas.height / 2;
      const radius = 100;
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + (progress * Math.PI * 2);

      // Ring background
      this._ctx.beginPath();
      this._ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      this._ctx.strokeStyle = this._withAlpha('#334155', 0.4 * opacity);
      this._ctx.lineWidth = 8;
      this._ctx.stroke();

      // Progress arc
      this._ctx.beginPath();
      this._ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      this._ctx.strokeStyle = this._withAlpha('#22d3ee', 0.9 * opacity);
      this._ctx.lineWidth = 8;
      this._ctx.stroke();
    }
  }

  _renderTaskCounter(state, opacity, mode) {
    const { completed, pending, inProgress, velocity } = state;

    if (this._ctx) {
      const x = 20;
      const y = 30;

      this._ctx.fillStyle = this._withAlpha('#ffffff', opacity);
      this._ctx.font = '16px sans-serif';
      this._ctx.fillText(`✓ ${completed}  ○ ${pending}  → ${inProgress}`, x, y);

      // Velocity indicator
      if (velocity > 0) {
        this._ctx.fillStyle = this._withAlpha('#4ade80', opacity);
        this._ctx.fillText(`(${velocity.toFixed(1)}/min)`, x + 150, y);
      }
    }
  }

  _renderFlowAura(state, opacity, mode) {
    const { depth, duration } = state;

    if (this._ctx && depth > 0) {
      const centerX = this._canvas.width / 2;
      const centerY = this._canvas.height / 2;
      const baseRadius = 150;
      const pulsing = 1 + (Math.sin(duration / 500) * 0.1);
      const radius = baseRadius * pulsing;

      // Aura rings
      for (let i = 0; i < 3; i++) {
        const ringOpacity = (depth / 100) * (0.3 - i * 0.1) * opacity;
        this._ctx.beginPath();
        this._ctx.arc(centerX, centerY, radius + (i * 30), 0, Math.PI * 2);
        this._ctx.strokeStyle = this._withAlpha('#a78bfa', ringOpacity);
        this._ctx.lineWidth = 2;
        this._ctx.stroke();
      }
    }
  }

  _renderDecayWarning(state, opacity, mode) {
    const { idleTime, show } = state;

    if (this._ctx && show) {
      const seconds = Math.floor(idleTime / 1000);
      const x = this._canvas.width / 2;
      const y = this._canvas.height - 60;

      // Pulsing warning
      const pulse = 0.5 + (Math.sin(performance.now() / 200) * 0.5);
      const warningOpacity = opacity * pulse;

      this._ctx.fillStyle = this._withAlpha('#f87171', warningOpacity);
      this._ctx.font = 'bold 18px sans-serif';
      this._ctx.textAlign = 'center';
      this._ctx.fillText(`⚠ IDLE: ${seconds}s`, x, y);
      this._ctx.textAlign = 'left';
    }
  }

  _renderModeBadge(state, opacity, mode) {
    const { duration } = state;

    if (this._ctx) {
      const x = this._canvas.width - 120;
      const y = this._canvas.height - 30;

      // Badge background
      const color = this._getModeColor(mode);
      this._ctx.fillStyle = this._withAlpha(color, 0.2 * opacity);
      this._ctx.fillRect(x, y - 20, 100, 26);

      this._ctx.fillStyle = this._withAlpha(color, 0.8 * opacity);
      this._ctx.fillRect(x, y - 20, 4, 26);

      // Mode text
      this._ctx.fillStyle = this._withAlpha('#ffffff', opacity);
      this._ctx.font = 'bold 14px sans-serif';
      this._ctx.fillText(mode.toUpperCase(), x + 10, y - 4);

      // Duration
      const seconds = Math.floor(duration / 1000);
      this._ctx.font = '12px sans-serif';
      this._ctx.fillStyle = this._withAlpha('#94a3b8', opacity);
      this._ctx.fillText(`${seconds}s`, x + 10 + mode.length * 9, y - 4);
    }
  }

  _ensureDomElement(id, updater) {
    if (!this._container) return;

    let el = this._domElements.get(id);
    if (!el) {
      el = document.createElement('div');
      el.id = `render-${id}`;
      this._container.appendChild(el);
      this._domElements.set(id, el);
    }
    updater(el);
  }

  _getAnchorColor(mode, intensity) {
    const colors = {
      idle: '#94a3b8',
      focus: '#60a5fa',
      burst: '#4ade80',
      hybrid: '#a78bfa',
      critical: '#ef4444',
      recovery: '#f59e0b'
    };
    return colors[mode] || colors.idle;
  }

  _getAnchorFill(mode) {
    const fills = {
      idle: 'rgba(30, 41, 59, 0.8)',
      focus: 'rgba(37, 99, 235, 0.3)',
      burst: 'rgba(34, 197, 94, 0.3)',
      hybrid: 'rgba(139, 92, 246, 0.3)',
      critical: 'rgba(220, 38, 38, 0.4)',
      recovery: 'rgba(245, 158, 11, 0.3)'
    };
    return fills[mode] || fills.idle;
  }

  _getModeColor(mode) {
    return this._getAnchorColor(mode, 1);
  }

  _withAlpha(color, alpha) {
    if (color.startsWith('#')) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    if (color.startsWith('rgba')) {
      return color.replace(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/, `rgba($1, $2, $3, ${alpha})`);
    }
    if (color.startsWith('rgb')) {
      return color.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
    }
    return color;
  }

  _updateStats(now) {
    this._renderStats.frameCount++;
    if (now - this._renderStats.lastFrameTime >= 1000) {
      this._renderStats.fps = this._renderStats.frameCount;
      this._renderStats.frameCount = 0;
    }
  }

  getStats() {
    return { ...this._renderStats };
  }
}

window.RenderLayer = RenderLayer;
