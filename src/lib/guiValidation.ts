/**
 * GUI Validation System
 * Validates GUI configurations and components for correctness and best practices
 */

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: ValidationSuggestion[];
}

interface ValidationError {
  type: 'error';
  componentId?: string;
  message: string;
  severity: 'critical' | 'high' | 'medium';
  code: string;
}

interface ValidationWarning {
  type: 'warning';
  componentId?: string;
  message: string;
  code: string;
}

interface ValidationSuggestion {
  type: 'suggestion';
  componentId?: string;
  message: string;
  action?: string;
  code: string;
}

interface GUIComponent {
  id: string;
  type: string;
  props: Record<string, any>;
  position: { x: number; y: number };
  size: { width: number; height: number };
}

interface GUIConfiguration {
  components: GUIComponent[];
  settings: {
    layout: string;
    theme: string;
    responsive: boolean;
  };
}

export class GUIValidator {
  private static readonly VALIDATION_RULES = {
    // Component-specific validation rules
    COMPONENT_RULES: {
      deviceConnector: {
        requiredProps: ['deviceType', 'connectionType'],
        validConnectionTypes: ['USB', 'WiFi', 'Bluetooth', 'Serial', 'Ethernet'],
        maxInstances: 5
      },
      sensorMonitor: {
        requiredProps: ['sensorName', 'units', 'minValue', 'maxValue'],
        maxInstances: 10
      },
      dataLogger: {
        requiredProps: ['logInterval', 'maxEntries'],
        minLogInterval: 100,
        maxLogInterval: 60000,
        maxInstances: 3
      },
      sequenceController: {
        requiredProps: ['sequenceName'],
        maxInstances: 2
      },
      realtimeChart: {
        requiredProps: ['title', 'dataSource'],
        maxInstances: 5
      }
    },

    // Layout validation rules
    LAYOUT_RULES: {
      minComponentSize: { width: 100, height: 50 },
      maxComponentSize: { width: 800, height: 600 },
      minSpacing: 10,
      maxComponents: 20,
      canvasSize: { width: 1200, height: 800 }
    },

    // Performance rules
    PERFORMANCE_RULES: {
      maxRealTimeComponents: 3,
      maxDataSources: 5,
      maxEventHandlers: 15
    }
  };

  /**
   * Validate complete GUI configuration
   */
  static validateGUI(config: GUIConfiguration): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    // Validate configuration structure
    this.validateConfigStructure(config, result);

    // Validate individual components
    config.components.forEach(component => {
      this.validateComponent(component, config, result);
    });

    // Validate layout and positioning
    this.validateLayout(config.components, result);

    // Validate performance implications
    this.validatePerformance(config, result);

    // Validate accessibility
    this.validateAccessibility(config, result);

    // Validate user experience
    this.validateUserExperience(config, result);

    // Set overall validation status
    result.isValid = result.errors.length === 0;

    return result;
  }

  /**
   * Validate configuration structure
   */
  private static validateConfigStructure(config: GUIConfiguration, result: ValidationResult): void {
    if (!config.components || !Array.isArray(config.components)) {
      result.errors.push({
        type: 'error',
        message: 'Invalid configuration: components must be an array',
        severity: 'critical',
        code: 'INVALID_STRUCTURE'
      });
      return;
    }

    if (!config.settings) {
      result.errors.push({
        type: 'error',
        message: 'Invalid configuration: settings are required',
        severity: 'critical',
        code: 'MISSING_SETTINGS'
      });
    }

    if (config.components.length === 0) {
      result.warnings.push({
        type: 'warning',
        message: 'No components defined in the GUI',
        code: 'EMPTY_GUI'
      });
    }

    if (config.components.length > this.VALIDATION_RULES.LAYOUT_RULES.maxComponents) {
      result.errors.push({
        type: 'error',
        message: `Too many components (${config.components.length}). Maximum allowed: ${this.VALIDATION_RULES.LAYOUT_RULES.maxComponents}`,
        severity: 'high',
        code: 'TOO_MANY_COMPONENTS'
      });
    }
  }

  /**
   * Validate individual component
   */
  private static validateComponent(
    component: GUIComponent, 
    config: GUIConfiguration, 
    result: ValidationResult
  ): void {
    // Check required fields
    if (!component.id) {
      result.errors.push({
        type: 'error',
        message: 'Component missing required ID',
        severity: 'critical',
        code: 'MISSING_ID'
      });
      return;
    }

    if (!component.type) {
      result.errors.push({
        type: 'error',
        componentId: component.id,
        message: 'Component missing required type',
        severity: 'critical',
        code: 'MISSING_TYPE'
      });
      return;
    }

    // Check for duplicate IDs
    const duplicateIds = config.components.filter(c => c.id === component.id);
    if (duplicateIds.length > 1) {
      result.errors.push({
        type: 'error',
        componentId: component.id,
        message: `Duplicate component ID: ${component.id}`,
        severity: 'high',
        code: 'DUPLICATE_ID'
      });
    }

    // Validate component-specific rules
    const rules = this.VALIDATION_RULES.COMPONENT_RULES[component.type as keyof typeof this.VALIDATION_RULES.COMPONENT_RULES];
    if (rules) {
      this.validateComponentRules(component, rules, config, result);
    }

    // Validate component size and position
    this.validateComponentGeometry(component, result);

    // Validate component properties
    this.validateComponentProps(component, result);
  }

  /**
   * Validate component-specific rules
   */
  private static validateComponentRules(
    component: GUIComponent,
    rules: any,
    config: GUIConfiguration,
    result: ValidationResult
  ): void {
    // Check required properties
    if (rules.requiredProps) {
      rules.requiredProps.forEach((prop: string) => {
        if (!component.props[prop]) {
          result.errors.push({
            type: 'error',
            componentId: component.id,
            message: `Missing required property: ${prop}`,
            severity: 'medium',
            code: 'MISSING_REQUIRED_PROP'
          });
        }
      });
    }

    // Check maximum instances
    if (rules.maxInstances) {
      const instanceCount = config.components.filter(c => c.type === component.type).length;
      if (instanceCount > rules.maxInstances) {
        result.warnings.push({
          type: 'warning',
          componentId: component.id,
          message: `Too many ${component.type} components (${instanceCount}). Recommended maximum: ${rules.maxInstances}`,
          code: 'TOO_MANY_INSTANCES'
        });
      }
    }

    // Component-specific validations
    switch (component.type) {
      case 'deviceConnector':
        if (component.props.connectionType && 
            !rules.validConnectionTypes.includes(component.props.connectionType)) {
          result.errors.push({
            type: 'error',
            componentId: component.id,
            message: `Invalid connection type: ${component.props.connectionType}`,
            severity: 'medium',
            code: 'INVALID_CONNECTION_TYPE'
          });
        }
        break;

      case 'dataLogger':
        if (component.props.logInterval) {
          const interval = parseInt(component.props.logInterval);
          if (interval < rules.minLogInterval || interval > rules.maxLogInterval) {
            result.warnings.push({
              type: 'warning',
              componentId: component.id,
              message: `Log interval ${interval}ms is outside recommended range (${rules.minLogInterval}-${rules.maxLogInterval}ms)`,
              code: 'INVALID_LOG_INTERVAL'
            });
          }
        }
        break;

      case 'sensorMonitor':
        if (component.props.minValue && component.props.maxValue) {
          if (component.props.minValue >= component.props.maxValue) {
            result.errors.push({
              type: 'error',
              componentId: component.id,
              message: 'Minimum value must be less than maximum value',
              severity: 'medium',
              code: 'INVALID_RANGE'
            });
          }
        }
        break;
    }
  }

  /**
   * Validate component geometry
   */
  private static validateComponentGeometry(component: GUIComponent, result: ValidationResult): void {
    const { minComponentSize, maxComponentSize, canvasSize } = this.VALIDATION_RULES.LAYOUT_RULES;

    // Check component size
    if (component.size.width < minComponentSize.width || 
        component.size.height < minComponentSize.height) {
      result.warnings.push({
        type: 'warning',
        componentId: component.id,
        message: `Component is too small (${component.size.width}x${component.size.height}). Minimum size: ${minComponentSize.width}x${minComponentSize.height}`,
        code: 'COMPONENT_TOO_SMALL'
      });
    }

    if (component.size.width > maxComponentSize.width || 
        component.size.height > maxComponentSize.height) {
      result.warnings.push({
        type: 'warning',
        componentId: component.id,
        message: `Component is very large (${component.size.width}x${component.size.height}). Consider splitting into smaller components`,
        code: 'COMPONENT_TOO_LARGE'
      });
    }

    // Check component position
    if (component.position.x < 0 || component.position.y < 0) {
      result.errors.push({
        type: 'error',
        componentId: component.id,
        message: 'Component position cannot be negative',
        severity: 'medium',
        code: 'NEGATIVE_POSITION'
      });
    }

    if (component.position.x + component.size.width > canvasSize.width ||
        component.position.y + component.size.height > canvasSize.height) {
      result.warnings.push({
        type: 'warning',
        componentId: component.id,
        message: 'Component extends beyond canvas boundaries',
        code: 'OUTSIDE_CANVAS'
      });
    }
  }

  /**
   * Validate component properties
   */
  private static validateComponentProps(component: GUIComponent, result: ValidationResult): void {
    // Check for empty or invalid property values
    Object.entries(component.props).forEach(([key, value]) => {
      if (value === '' || value === null || value === undefined) {
        result.warnings.push({
          type: 'warning',
          componentId: component.id,
          message: `Property '${key}' is empty or undefined`,
          code: 'EMPTY_PROPERTY'
        });
      }

      // Validate specific property types
      if (key.includes('interval') || key.includes('timeout') || key.includes('delay')) {
        const numValue = parseInt(value);
        if (isNaN(numValue) || numValue <= 0) {
          result.errors.push({
            type: 'error',
            componentId: component.id,
            message: `Property '${key}' must be a positive number`,
            severity: 'medium',
            code: 'INVALID_NUMBER'
          });
        }
      }

      if (key.includes('color') || key.includes('Color')) {
        if (typeof value === 'string' && !this.isValidColor(value)) {
          result.warnings.push({
            type: 'warning',
            componentId: component.id,
            message: `Property '${key}' may not be a valid color value`,
            code: 'INVALID_COLOR'
          });
        }
      }
    });
  }

  /**
   * Validate layout and positioning
   */
  private static validateLayout(components: GUIComponent[], result: ValidationResult): void {
    const { minSpacing } = this.VALIDATION_RULES.LAYOUT_RULES;

    // Check for overlapping components
    for (let i = 0; i < components.length; i++) {
      for (let j = i + 1; j < components.length; j++) {
        const comp1 = components[i];
        const comp2 = components[j];

        if (this.componentsOverlap(comp1, comp2)) {
          result.warnings.push({
            type: 'warning',
            componentId: comp1.id,
            message: `Component overlaps with ${comp2.id}`,
            code: 'COMPONENT_OVERLAP'
          });
        } else if (this.componentsNearby(comp1, comp2, minSpacing)) {
          result.suggestions.push({
            type: 'suggestion',
            componentId: comp1.id,
            message: `Consider adding more spacing between ${comp1.id} and ${comp2.id}`,
            code: 'INSUFFICIENT_SPACING'
          });
        }
      }
    }

    // Check for balanced layout
    this.validateLayoutBalance(components, result);
  }

  /**
   * Validate performance implications
   */
  private static validatePerformance(config: GUIConfiguration, result: ValidationResult): void {
    const { maxRealTimeComponents, maxDataSources, maxEventHandlers } = this.VALIDATION_RULES.PERFORMANCE_RULES;

    // Count real-time components
    const realTimeComponents = config.components.filter(c => 
      c.type === 'realtimeChart' || c.type === 'sensorMonitor' || c.type === 'dataLogger'
    );

    if (realTimeComponents.length > maxRealTimeComponents) {
      result.warnings.push({
        type: 'warning',
        message: `Too many real-time components (${realTimeComponents.length}). This may impact performance`,
        code: 'TOO_MANY_REALTIME_COMPONENTS'
      });
    }

    // Check data source usage
    const dataSources = new Set();
    config.components.forEach(component => {
      if (component.props.dataSource) {
        dataSources.add(component.props.dataSource);
      }
    });

    if (dataSources.size > maxDataSources) {
      result.warnings.push({
        type: 'warning',
        message: `Many different data sources (${dataSources.size}). Consider consolidating data sources`,
        code: 'TOO_MANY_DATA_SOURCES'
      });
    }

    // Check event handlers
    const eventHandlers = config.components.reduce((count, component) => {
      return count + Object.keys(component.props).filter(key => 
        key.startsWith('on') || key.includes('handler') || key.includes('Handler')
      ).length;
    }, 0);

    if (eventHandlers > maxEventHandlers) {
      result.suggestions.push({
        type: 'suggestion',
        message: `Consider consolidating event handlers for better performance (${eventHandlers} handlers found)`,
        code: 'TOO_MANY_EVENT_HANDLERS'
      });
    }
  }

  /**
   * Validate accessibility
   */
  private static validateAccessibility(config: GUIConfiguration, result: ValidationResult): void {
    config.components.forEach(component => {
      // Check for missing labels
      if (['input', 'select', 'toggle'].includes(component.type) && !component.props.label) {
        result.warnings.push({
          type: 'warning',
          componentId: component.id,
          message: 'Interactive component should have a label for accessibility',
          code: 'MISSING_LABEL'
        });
      }

      // Check for poor color contrast (simplified check)
      if (component.props.color === component.props.backgroundColor) {
        result.warnings.push({
          type: 'warning',
          componentId: component.id,
          message: 'Text and background colors appear to be the same',
          code: 'POOR_CONTRAST'
        });
      }

      // Check for very small components that might be hard to interact with
      if (component.size.width < 44 || component.size.height < 44) {
        if (['button', 'toggle', 'input', 'select'].includes(component.type)) {
          result.warnings.push({
            type: 'warning',
            componentId: component.id,
            message: 'Interactive component may be too small for easy interaction (recommended minimum: 44x44px)',
            code: 'SMALL_INTERACTIVE_ELEMENT'
          });
        }
      }
    });
  }

  /**
   * Validate user experience
   */
  private static validateUserExperience(config: GUIConfiguration, result: ValidationResult): void {
    // Check for logical component grouping
    const deviceComponents = config.components.filter(c => c.type.includes('device') || c.type.includes('Device'));
    const dataComponents = config.components.filter(c => c.type.includes('data') || c.type.includes('Data'));

    if (deviceComponents.length > 0 && dataComponents.length > 0) {
      // Check if device and data components are logically grouped
      result.suggestions.push({
        type: 'suggestion',
        message: 'Consider grouping related device and data components together for better user experience',
        code: 'IMPROVE_GROUPING'
      });
    }

    // Check for workflow consistency
    const hasConnector = config.components.some(c => c.type === 'deviceConnector');
    const hasDataLogger = config.components.some(c => c.type === 'dataLogger');
    const hasVisualization = config.components.some(c => c.type === 'realtimeChart' || c.type === 'statisticalPanel');

    if (hasDataLogger && !hasConnector) {
      result.warnings.push({
        type: 'warning',
        message: 'Data logger present but no device connector. Users may not be able to acquire data',
        code: 'INCOMPLETE_WORKFLOW'
      });
    }

    if ((hasConnector || hasDataLogger) && !hasVisualization) {
      result.suggestions.push({
        type: 'suggestion',
        message: 'Consider adding data visualization components to help users understand their data',
        code: 'MISSING_VISUALIZATION'
      });
    }
  }

  // Helper methods
  private static componentsOverlap(comp1: GUIComponent, comp2: GUIComponent): boolean {
    return !(comp1.position.x + comp1.size.width <= comp2.position.x ||
             comp2.position.x + comp2.size.width <= comp1.position.x ||
             comp1.position.y + comp1.size.height <= comp2.position.y ||
             comp2.position.y + comp2.size.height <= comp1.position.y);
  }

  private static componentsNearby(comp1: GUIComponent, comp2: GUIComponent, minSpacing: number): boolean {
    const distance = Math.sqrt(
      Math.pow(comp1.position.x - comp2.position.x, 2) + 
      Math.pow(comp1.position.y - comp2.position.y, 2)
    );
    return distance < minSpacing && !this.componentsOverlap(comp1, comp2);
  }

  private static validateLayoutBalance(components: GUIComponent[], result: ValidationResult): void {
    if (components.length < 3) return;

    // Calculate center of mass
    const totalArea = components.reduce((sum, comp) => sum + (comp.size.width * comp.size.height), 0);
    const centerX = components.reduce((sum, comp) => 
      sum + (comp.position.x + comp.size.width / 2) * (comp.size.width * comp.size.height), 0
    ) / totalArea;
    const centerY = components.reduce((sum, comp) => 
      sum + (comp.position.y + comp.size.height / 2) * (comp.size.width * comp.size.height), 0
    ) / totalArea;

    // Check if layout is heavily weighted to one side
    const canvasCenter = { x: 600, y: 400 }; // Assuming 1200x800 canvas
    const distanceFromCenter = Math.sqrt(
      Math.pow(centerX - canvasCenter.x, 2) + Math.pow(centerY - canvasCenter.y, 2)
    );

    if (distanceFromCenter > 200) {
      result.suggestions.push({
        type: 'suggestion',
        message: 'Layout appears unbalanced. Consider redistributing components for better visual balance',
        code: 'UNBALANCED_LAYOUT'
      });
    }
  }

  private static isValidColor(color: string): boolean {
    // Simple color validation - can be enhanced
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color) ||
           /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/.test(color) ||
           /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[01]?\.?\d*\s*\)$/.test(color) ||
           ['red', 'green', 'blue', 'white', 'black', 'gray', 'yellow', 'orange', 'purple', 'pink', 'brown'].includes(color.toLowerCase());
  }

  /**
   * Generate validation report in human-readable format
   */
  static generateValidationReport(result: ValidationResult): string {
    const report = [];

    report.push('=== GUI Validation Report ===\n');
    report.push(`Overall Status: ${result.isValid ? '✅ VALID' : '❌ INVALID'}\n`);

    if (result.errors.length > 0) {
      report.push('🚨 ERRORS:');
      result.errors.forEach(error => {
        const component = error.componentId ? ` [${error.componentId}]` : '';
        report.push(`  • ${error.message}${component} (${error.code})`);
      });
      report.push('');
    }

    if (result.warnings.length > 0) {
      report.push('⚠️  WARNINGS:');
      result.warnings.forEach(warning => {
        const component = warning.componentId ? ` [${warning.componentId}]` : '';
        report.push(`  • ${warning.message}${component} (${warning.code})`);
      });
      report.push('');
    }

    if (result.suggestions.length > 0) {
      report.push('💡 SUGGESTIONS:');
      result.suggestions.forEach(suggestion => {
        const component = suggestion.componentId ? ` [${suggestion.componentId}]` : '';
        report.push(`  • ${suggestion.message}${component} (${suggestion.code})`);
      });
      report.push('');
    }

    if (result.isValid && result.warnings.length === 0 && result.suggestions.length === 0) {
      report.push('🎉 Perfect! Your GUI configuration is excellent with no issues found.');
    }

    return report.join('\n');
  }
}

export default GUIValidator;