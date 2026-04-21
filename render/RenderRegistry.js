/**
 * RenderRegistry.js
 * Registry for renderable components and their properties
 * Maps components to their visual representations
 */

// Using global window.COMPONENTS

const RENDER_PROPERTIES = Object.freeze({
  [COMPONENTS.FOCUS_ANCHOR]: {
    zIndex: 1000,
    alwaysOnTop: true,
    requiresTransparency: true,
    renderPass: 'foreground'
  },
  [COMPONENTS.MOMENTUM_BAR]: {
    zIndex: 100,
    alwaysOnTop: false,
    requiresTransparency: false,
    renderPass: 'background'
  },
  [COMPONENTS.INSTABILITY_INDICATOR]: {
    zIndex: 500,
    alwaysOnTop: false,
    requiresTransparency: true,
    renderPass: 'overlay'
  },
  [COMPONENTS.SPRINT_RING]: {
    zIndex: 200,
    alwaysOnTop: false,
    requiresTransparency: true,
    renderPass: 'background'
  },
  [COMPONENTS.TASK_COUNTER]: {
    zIndex: 150,
    alwaysOnTop: false,
    requiresTransparency: false,
    renderPass: 'background'
  },
  [COMPONENTS.FLOW_AURA]: {
    zIndex: 50,
    alwaysOnTop: false,
    requiresTransparency: true,
    renderPass: 'background'
  },
  [COMPONENTS.DECAY_WARNING]: {
    zIndex: 400,
    alwaysOnTop: false,
    requiresTransparency: true,
    renderPass: 'overlay'
  },
  [COMPONENTS.MODE_BADGE]: {
    zIndex: 120,
    alwaysOnTop: false,
    requiresTransparency: false,
    renderPass: 'background'
  }
});

const RENDER_PASS_ORDER = Object.freeze([
  'background',
  'overlay',
  'foreground'  // Focus Anchor always last
]);

class RenderRegistry {
  constructor() {
    this._customRenderers = new Map();
  }

  /**
   * Get render properties for a component
   * @param {string} componentName - Component identifier
   * @returns {Object} Render properties
   */
  getProperties(componentName) {
    return RENDER_PROPERTIES[componentName] || {
      zIndex: 0,
      alwaysOnTop: false,
      requiresTransparency: false,
      renderPass: 'background'
    };
  }

  /**
   * Check if component is Focus Anchor (special handling)
   * @param {string} componentName - Component identifier
   * @returns {boolean} True if Focus Anchor
   */
  isFocusAnchor(componentName) {
    return componentName === COMPONENTS.FOCUS_ANCHOR;
  }

  /**
   * Sort components by render pass and z-index
   * @param {Array} components - Unsorted component list
   * @returns {Array} Sorted components (Focus Anchor last)
   */
  sortForRender(components) {
    return components.sort((a, b) => {
      const propsA = this.getProperties(a.name);
      const propsB = this.getProperties(b.name);

      // Focus Anchor always goes last
      if (this.isFocusAnchor(a.name)) return 1;
      if (this.isFocusAnchor(b.name)) return -1;

      // Sort by render pass order
      const passIndexA = RENDER_PASS_ORDER.indexOf(propsA.renderPass);
      const passIndexB = RENDER_PASS_ORDER.indexOf(propsB.renderPass);

      if (passIndexA !== passIndexB) {
        return passIndexA - passIndexB;
      }

      // Within same pass, sort by z-index
      return propsA.zIndex - propsB.zIndex;
    });
  }

  /**
   * Register a custom renderer for a component
   * @param {string} componentName - Component to override
   * @param {Function} renderer - Custom render function
   */
  registerCustomRenderer(componentName, renderer) {
    this._customRenderers.set(componentName, renderer);
  }

  /**
   * Get custom renderer if registered
   * @param {string} componentName - Component identifier
   * @returns {Function|null} Custom renderer or null
   */
  getCustomRenderer(componentName) {
    return this._customRenderers.get(componentName) || null;
  }

  /**
   * Get all components for a specific render pass
   * @param {Array} components - All components
   * @param {string} pass - Render pass name
   * @returns {Array} Filtered and sorted components
   */
  getForPass(components, pass) {
    return components.filter(c => {
      const props = this.getProperties(c.name);
      return props.renderPass === pass;
    });
  }

  /**
   * Extract Focus Anchor from component list
   * @param {Array} components - All components
   * @returns {Object|null} Focus Anchor or null
   */
  extractFocusAnchor(components) {
    return components.find(c => this.isFocusAnchor(c.name)) || null;
  }

  /**
   * Get all components except Focus Anchor
   * @param {Array} components - All components
   * @returns {Array} Components without Focus Anchor
   */
  withoutFocusAnchor(components) {
    return components.filter(c => !this.isFocusAnchor(c.name));
  }
}

window.RenderRegistry = RenderRegistry;
window.RENDER_PROPERTIES = RENDER_PROPERTIES;
window.RENDER_PASS_ORDER = RENDER_PASS_ORDER;
