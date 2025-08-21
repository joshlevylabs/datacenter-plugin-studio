/**
 * GUI Code Generator
 * Converts visual GUI designs to React component code for plugins
 */

interface GUIComponent {
  id: string;
  type: string;
  props: Record<string, any>;
  position: { x: number; y: number };
  size: { width: number; height: number };
  children?: GUIComponent[];
}

interface GUIConfiguration {
  components: GUIComponent[];
  settings: {
    layout: 'tabs' | 'grid' | 'flex';
    theme: 'default' | 'dark' | 'light';
    responsive: boolean;
  };
}

interface CodeGenerationOptions {
  includeImports: boolean;
  includeEventHandlers: boolean;
  includeDataBinding: boolean;
  includeStyles: boolean;
  targetFramework: 'react' | 'vue' | 'angular';
  typescript: boolean;
}

export class GUICodeGenerator {
  // Component imports removed - not currently used

  /**
   * Generate complete React component code from GUI configuration
   */
  static generateReactComponent(
    config: GUIConfiguration,
    componentName: string = 'GeneratedPluginComponent',
    options: CodeGenerationOptions = {
      includeImports: true,
      includeEventHandlers: true,
      includeDataBinding: true,
      includeStyles: true,
      targetFramework: 'react',
      typescript: true
    }
  ): string {
    const code = [];

    // Add imports
    if (options.includeImports) {
      code.push(this.generateImports(config, options));
      code.push('');
    }

    // Add TypeScript interfaces if needed
    if (options.typescript) {
      code.push(this.generateTypeScriptInterfaces(config));
      code.push('');
    }

    // Add main component function
    code.push(this.generateComponentFunction(config, componentName, options));

    // Add styles if needed
    if (options.includeStyles) {
      code.push('');
      code.push(this.generateStyles(config));
    }

    // Add export
    code.push('');
    code.push(`export default ${componentName};`);

    return code.join('\n');
  }

  /**
   * Generate import statements
   */
  private static generateImports(config: GUIConfiguration, options: CodeGenerationOptions): string {
    const imports = [];

    // React imports
    const reactImports = ['React', 'useState', 'useEffect'];
    if (options.includeEventHandlers) {
      reactImports.push('useCallback');
    }
    imports.push(`import ${options.typescript ? '{ ' + reactImports.join(', ') + ' }' : 'React, { ' + reactImports.slice(1).join(', ') + ' }'} from 'react';`);

    // Tauri imports
    imports.push("import { invoke } from '@tauri-apps/api';");

    // Heroicons imports
    const usedIcons = this.extractUsedIcons(config);
    if (usedIcons.length > 0) {
      imports.push(`import {\n  ${usedIcons.join(',\n  ')}\n} from '@heroicons/react/24/outline';`);
    }

    // Centcom API imports
    if (options.includeDataBinding) {
      imports.push("import { createCentcomAPI, CentcomUtils } from '../lib/centcomAPI';");
    }

    return imports.join('\n');
  }

  /**
   * Generate TypeScript interfaces
   */
  private static generateTypeScriptInterfaces(config: GUIConfiguration): string {
    const interfaces = [];

    // Generate component props interface
    interfaces.push(`interface ${this.toPascalCase('component')}Props {
  pluginId: string;
  onDataUpdate?: (data: any) => void;
  onError?: (error: string) => void;
}`);

    // Generate state interface
    const stateFields = this.extractStateFields(config);
    if (stateFields.length > 0) {
      interfaces.push(`interface ComponentState {
  ${stateFields.join(';\n  ')};
}`);
    }

    return interfaces.join('\n\n');
  }

  /**
   * Generate main component function
   */
  private static generateComponentFunction(
    config: GUIConfiguration,
    componentName: string,
    options: CodeGenerationOptions
  ): string {
    const code = [];
    const tsAnnotation = options.typescript ? ': React.FC<ComponentProps>' : '';

    // Function declaration
    code.push(`const ${componentName}${tsAnnotation} = ({ pluginId, onDataUpdate, onError }) => {`);

    // State declarations
    code.push(this.generateStateDeclarations(config, options));

    // Effect hooks
    if (options.includeDataBinding) {
      code.push(this.generateEffectHooks(config));
    }

    // Event handlers
    if (options.includeEventHandlers) {
      code.push(this.generateEventHandlers(config, options));
    }

    // Render function
    code.push(this.generateRenderFunction(config, options));

    code.push('};');

    return code.join('\n\n');
  }

  /**
   * Generate state declarations
   */
  private static generateStateDeclarations(config: GUIConfiguration, options: CodeGenerationOptions): string {
    const declarations = [];

    // Component-specific state
    config.components.forEach(component => {
      // Ensure valid component ID
      const safeId = component.id.replace(/[^a-zA-Z0-9_]/g, '').replace(/^[0-9]/, '_$&') || 'component';
      const pascalId = this.toPascalCase(component.id);
      
      switch (component.type) {
        case 'deviceConnector':
          declarations.push(`  const [${safeId}_connected, set${pascalId}_connected] = useState(false);`);
          declarations.push(`  const [${safeId}_status, set${pascalId}_status] = useState('disconnected');`);
          break;
        case 'sensorMonitor':
          declarations.push(`  const [${safeId}_value, set${pascalId}_value] = useState(${component.props.currentValue || 0});`);
          break;
        case 'dataLogger':
          declarations.push(`  const [${safeId}_logging, set${pascalId}_logging] = useState(false);`);
          declarations.push(`  const [${safeId}_data, set${pascalId}_data] = useState([]);`);
          break;
        case 'sequenceController':
          declarations.push(`  const [${safeId}_running, set${pascalId}_running] = useState(false);`);
          declarations.push(`  const [${safeId}_currentStep, set${pascalId}_currentStep] = useState(0);`);
          break;
        case 'realtimeChart':
          declarations.push(`  const [${safeId}_chartData, set${pascalId}_chartData] = useState([]);`);
          break;
      }
    });

    // Common state
    declarations.push('  const [error, setError] = useState(null);');
    declarations.push('  const [loading, setLoading] = useState(false);');

    if (options.includeDataBinding) {
      declarations.push('  const [centcomAPI, setCentcomAPI] = useState(null);');
    }

    return declarations.join('\n');
  }

  /**
   * Generate effect hooks
   */
  private static generateEffectHooks(config: GUIConfiguration): string {
    const effects = [];

    effects.push(`  // Initialize Centcom API
  useEffect(() => {
    const api = createCentcomAPI(pluginId);
    setCentcomAPI(api);
    
    return () => {
      api.destroy();
    };
  }, [pluginId]);`);

    // Device-specific effects
    const deviceComponents = config.components.filter(c => c.type === 'deviceConnector' || c.type === 'sensorMonitor');
    if (deviceComponents.length > 0) {
      effects.push(`  // Device monitoring effects
  useEffect(() => {
    if (!centcomAPI) return;
    
    const subscriptions = [];
    
    ${deviceComponents.map(component => {
      if (component.type === 'sensorMonitor') {
        const pascalId = this.toPascalCase(component.id);
        return `    // Subscribe to ${component.id} sensor data
    centcomAPI.subscribeToDevice('${component.props.deviceId || 'sensor'}', (data) => {
      set${pascalId}_value(data.value);
    });`;
      }
      return '';
    }).filter(Boolean).join('\n')}
    
    return () => {
      subscriptions.forEach(unsubscribe => unsubscribe());
    };
  }, [centcomAPI]);`);
    }

    return effects.join('\n\n');
  }

  /**
   * Generate event handlers
   */
  private static generateEventHandlers(config: GUIConfiguration, _options: CodeGenerationOptions): string {
    const handlers: string[] = [];

    config.components.forEach(component => {
      // Ensure valid component ID for handlers
      const pascalId = this.toPascalCase(component.id);
      
      switch (component.type) {
        case 'deviceConnector':
          handlers.push(`  const handle${pascalId}Connect = useCallback(async () => {
    if (!centcomAPI) return;
    
    try {
      setLoading(true);
      const success = await centcomAPI.connectDevice('${component.props.deviceId || 'device'}');
      if (success) {
        set${pascalId}_connected(true);
        set${pascalId}_status('connected');
      }
    } catch (err) {
      setError(err.message);
      onError?.(err.message);
    } finally {
      setLoading(false);
    }
  }, [centcomAPI, onError]);

  const handle${pascalId}Disconnect = useCallback(async () => {
    if (!centcomAPI) return;
    
    try {
      setLoading(true);
      const success = await centcomAPI.disconnectDevice('${component.props.deviceId || 'device'}');
      if (success) {
        set${pascalId}_connected(false);
        set${pascalId}_status('disconnected');
      }
    } catch (err) {
      setError(err.message);
      onError?.(err.message);
    } finally {
      setLoading(false);
    }
  }, [centcomAPI, onError]);`);
          break;

        case 'dataLogger':
          handlers.push(`  const handle${pascalId}StartLogging = useCallback(async () => {
    if (!centcomAPI) return;
    
    try {
      set${pascalId}_logging(true);
      // Start data logging logic here
    } catch (err) {
      setError(err.message);
      onError?.(err.message);
    }
  }, [centcomAPI, onError]);

  const handle${pascalId}StopLogging = useCallback(async () => {
    try {
      set${pascalId}_logging(false);
      // Stop data logging logic here
    } catch (err) {
      setError(err.message);
      onError?.(err.message);
    }
  }, [onError]);`);
          break;

        case 'sequenceController':
          handlers.push(`  const handle${pascalId}Start = useCallback(async () => {
    if (!centcomAPI) return;
    
    try {
      const sequenceId = await centcomAPI.createSequence({
        name: '${component.props.sequenceName || 'Generated Sequence'}',
        steps: [], // Define your sequence steps here
        repeatCount: ${component.props.repeatCount || 1},
        metadata: {}
      });
      
      const success = await centcomAPI.startSequence(sequenceId);
      if (success) {
        set${pascalId}_running(true);
      }
    } catch (err) {
      setError(err.message);
      onError?.(err.message);
    }
  }, [centcomAPI, onError]);

  const handle${pascalId}Stop = useCallback(async () => {
    try {
      set${pascalId}_running(false);
      set${pascalId}_currentStep(0);
    } catch (err) {
      setError(err.message);
      onError?.(err.message);
    }
  }, [onError]);`);
          break;
      }
    });

    return handlers.join('\n\n');
  }

  /**
   * Generate render function
   */
  private static generateRenderFunction(config: GUIConfiguration, options: CodeGenerationOptions): string {
    const code = [];

    code.push('  return (');
    code.push('    <div className="plugin-gui-container">');

    if (config.settings.layout === 'tabs') {
      code.push(this.generateTabLayout(config, options));
    } else if (config.settings.layout === 'grid') {
      code.push(this.generateGridLayout(config, options));
    } else {
      code.push(this.generateFlexLayout(config, options));
    }

    code.push('    </div>');
    code.push('  );');

    return code.join('\n');
  }

  /**
   * Generate tab layout
   */
  private static generateTabLayout(config: GUIConfiguration, options: CodeGenerationOptions): string {
    const code = [];
    const tabs = this.groupComponentsByCategory(config.components);

    code.push('      {/* Tab Navigation */}');
    code.push('      <div className="tab-navigation">');
    Object.keys(tabs).forEach(tabName => {
      code.push(`        <button className="tab-button">${tabName}</button>`);
    });
    code.push('      </div>');

    code.push('      {/* Tab Content */}');
    Object.entries(tabs).forEach(([tabName, components]) => {
      code.push(`      <div className="tab-content ${tabName.toLowerCase()}-tab">`);
      components.forEach(component => {
        code.push(this.generateComponentJSX(component, options));
      });
      code.push('      </div>');
    });

    return code.join('\n');
  }

  /**
   * Generate grid layout
   */
  private static generateGridLayout(config: GUIConfiguration, options: CodeGenerationOptions): string {
    const code = [];

    code.push('      <div className="grid-layout">');
    config.components.forEach(component => {
      code.push('        <div className="grid-item">');
      code.push(this.generateComponentJSX(component, options));
      code.push('        </div>');
    });
    code.push('      </div>');

    return code.join('\n');
  }

  /**
   * Generate flex layout
   */
  private static generateFlexLayout(config: GUIConfiguration, options: CodeGenerationOptions): string {
    const code = [];

    code.push('      <div className="flex-layout">');
    config.components.forEach(component => {
      code.push(this.generateComponentJSX(component, options));
    });
    code.push('      </div>');

    return code.join('\n');
  }

  /**
   * Generate JSX for individual component
   */
  private static generateComponentJSX(component: GUIComponent, _options: CodeGenerationOptions): string {
    const componentId = component.id;
    const indent = '        ';

    switch (component.type) {
      case 'deviceConnector':
        return `${indent}<div className="device-connector" id="${componentId}">
${indent}  <div className="device-header">
${indent}    <h3>${component.props.deviceType || 'Device'}</h3>
${indent}    <div className={\`status-indicator \${${componentId}_connected ? 'connected' : 'disconnected'}\`} />
${indent}  </div>
${indent}  <div className="device-controls">
${indent}    <button 
${indent}      onClick={${componentId}_connected ? handle${this.toPascalCase(componentId)}Disconnect : handle${this.toPascalCase(componentId)}Connect}
${indent}      disabled={loading}
${indent}    >
${indent}      {${componentId}_connected ? 'Disconnect' : 'Connect'}
${indent}    </button>
${indent}  </div>
${indent}</div>`;

      case 'sensorMonitor':
        return `${indent}<div className="sensor-monitor" id="${componentId}">
${indent}  <div className="sensor-header">
${indent}    <h3>${component.props.sensorName || 'Sensor'}</h3>
${indent}  </div>
${indent}  <div className="sensor-value">
${indent}    <span className="value">{${componentId}_value.toFixed(${component.props.precision || 2})}</span>
${indent}    <span className="units">${component.props.units || ''}</span>
${indent}  </div>
${indent}  <div className="sensor-range">
${indent}    Range: ${component.props.minValue || 0} - ${component.props.maxValue || 100} ${component.props.units || ''}
${indent}  </div>
${indent}</div>`;

      case 'dataLogger':
        return `${indent}<div className="data-logger" id="${componentId}">
${indent}  <div className="logger-header">
${indent}    <h3>Data Logger</h3>
${indent}    <div className={\`status-indicator \${${componentId}_logging ? 'logging' : 'idle'}\`} />
${indent}  </div>
${indent}  <div className="logger-controls">
${indent}    <button 
${indent}      onClick={${componentId}_logging ? handle${this.toPascalCase(componentId)}StopLogging : handle${this.toPascalCase(componentId)}StartLogging}
${indent}      disabled={loading}
${indent}    >
${indent}      {${componentId}_logging ? 'Stop Logging' : 'Start Logging'}
${indent}    </button>
${indent}  </div>
${indent}  <div className="logger-stats">
${indent}    <span>Entries: {${componentId}_data.length}</span>
${indent}    <span>Interval: ${component.props.logInterval || 1000}ms</span>
${indent}  </div>
${indent}</div>`;

      case 'sequenceController':
        return `${indent}<div className="sequence-controller" id="${componentId}">
${indent}  <div className="sequence-header">
${indent}    <h3>${component.props.sequenceName || 'Sequence'}</h3>
${indent}    <div className={\`status-indicator \${${componentId}_running ? 'running' : 'idle'}\`} />
${indent}  </div>
${indent}  <div className="sequence-progress">
${indent}    <span>Step {${componentId}_currentStep + 1} of {${component.props.steps?.length || 1}}</span>
${indent}  </div>
${indent}  <div className="sequence-controls">
${indent}    <button 
${indent}      onClick={handle${this.toPascalCase(componentId)}Start}
${indent}      disabled={loading || ${componentId}_running}
${indent}    >
${indent}      Start
${indent}    </button>
${indent}    <button 
${indent}      onClick={handle${this.toPascalCase(componentId)}Stop}
${indent}      disabled={loading || !${componentId}_running}
${indent}    >
${indent}      Stop
${indent}    </button>
${indent}  </div>
${indent}</div>`;

      case 'realtimeChart':
        return `${indent}<div className="realtime-chart" id="${componentId}">
${indent}  <div className="chart-header">
${indent}    <h3>${component.props.title || 'Chart'}</h3>
${indent}  </div>
${indent}            <div className="chart-container">
${indent}    {/* Chart implementation would go here */}
${indent}    <div className="chart-placeholder">
${indent}      <PresentationChartLineIcon className="chart-icon" />
${indent}      <span>Live ${component.props.chartType || 'line'} Chart</span>
${indent}    </div>
${indent}  </div>
${indent}</div>`;

      case 'button':
        return `${indent}<button 
${indent}  className={\`btn \${${JSON.stringify(component.props.variant || 'primary')}}\`}
${indent}  disabled={${component.props.disabled || false}}
${indent}  onClick={() => {
${indent}    // ${component.props.onClick || 'handleButtonClick'} implementation
${indent}  }}
${indent}>
${indent}  ${component.props.text || 'Button'}
${indent}</button>`;

      case 'input':
        return `${indent}<div className="input-field">
${indent}  {${JSON.stringify(component.props.label)} && <label>${component.props.label}</label>}
${indent}  <input
${indent}    type="${component.props.type || 'text'}"
${indent}    placeholder="${component.props.placeholder || ''}"
${indent}    required={${component.props.required || false}}
${indent}    onChange={(e) => {
${indent}      // ${component.props.onChange || 'handleInputChange'} implementation
${indent}    }}
${indent}  />
${indent}</div>`;

      default:
        return `${indent}<div className="unknown-component" id="${componentId}">
${indent}  <span>Component: ${component.type}</span>
${indent}</div>`;
    }
  }

  /**
   * Generate CSS styles
   */
  private static generateStyles(config: GUIConfiguration): string {
    return `const styles = \`
.plugin-gui-container {
  font-family: system-ui, sans-serif;
  padding: 16px;
  background: ${config.settings.theme === 'dark' ? '#1f2937' : '#ffffff'};
  color: ${config.settings.theme === 'dark' ? '#f3f4f6' : '#1f2937'};
}

.device-connector, .sensor-monitor, .data-logger, .sequence-controller, .realtime-chart {
  border: 1px solid ${config.settings.theme === 'dark' ? '#374151' : '#e5e7eb'};
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  background: ${config.settings.theme === 'dark' ? '#374151' : '#f9fafb'};
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
}

.status-indicator.connected, .status-indicator.logging, .status-indicator.running {
  background-color: #10b981;
  animation: pulse 2s infinite;
}

.status-indicator.disconnected, .status-indicator.idle {
  background-color: #6b7280;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.btn.primary {
  background-color: #3b82f6;
  color: white;
}

.btn.primary:hover {
  background-color: #2563eb;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.chart-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  border: 2px dashed #d1d5db;
  border-radius: 4px;
  background: ${config.settings.theme === 'dark' ? '#1f2937' : '#f9fafb'};
}

.chart-icon {
  width: 48px;
  height: 48px;
  margin-right: 8px;
  color: #6b7280;
}

${config.settings.responsive ? `
@media (max-width: 768px) {
  .plugin-gui-container {
    padding: 8px;
  }
  
  .device-connector, .sensor-monitor, .data-logger, .sequence-controller, .realtime-chart {
    margin-bottom: 8px;
    padding: 12px;
  }
}
` : ''}
\`;

// Inject styles
const styleSheet = document.createElement('style');
styleSheet.type = 'text/css';
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);`;
  }

  // Utility methods
  private static toPascalCase(str: string): string {
    // Clean the string to ensure valid JavaScript identifiers
    const cleaned = str
      .replace(/[^a-zA-Z0-9_]/g, '') // Remove invalid characters
      .replace(/^[0-9]/, '_$&')      // Prefix numbers with underscore
      .replace(/(^\w|_\w)/g, (match) => match.replace('_', '').toUpperCase());
    
    // Ensure we have a valid identifier
    return cleaned || 'Component';
  }

  private static extractUsedIcons(config: GUIConfiguration): string[] {
    const icons = new Set<string>();
    
    config.components.forEach(component => {
      switch (component.type) {
        case 'realtimeChart':
          icons.add('PresentationChartLineIcon');
          break;
        case 'deviceConnector':
          icons.add('DevicePhoneMobileIcon');
          break;
        case 'sequenceController':
          icons.add('PlayIcon');
          icons.add('StopIcon');
          break;
        case 'dataLogger':
          icons.add('CircleStackIcon');
          break;
        // Add more mappings as needed
      }
    });

    return Array.from(icons);
  }

  private static extractStateFields(config: GUIConfiguration): string[] {
    const fields = new Set<string>();
    
    config.components.forEach(component => {
      switch (component.type) {
        case 'deviceConnector':
          fields.add(`${component.id}_connected: boolean`);
          fields.add(`${component.id}_status: string`);
          break;
        case 'sensorMonitor':
          fields.add(`${component.id}_value: number`);
          break;
        case 'dataLogger':
          fields.add(`${component.id}_logging: boolean`);
          fields.add(`${component.id}_data: any[]`);
          break;
        case 'sequenceController':
          fields.add(`${component.id}_running: boolean`);
          fields.add(`${component.id}_currentStep: number`);
          break;
      }
    });

    fields.add('error: string | null');
    fields.add('loading: boolean');

    return Array.from(fields);
  }

  private static groupComponentsByCategory(components: GUIComponent[]): Record<string, GUIComponent[]> {
    const groups: Record<string, GUIComponent[]> = {
      'Device Control': [],
      'Data Acquisition': [],
      'Automation': [],
      'Visualization': []
    };

    components.forEach(component => {
      switch (component.type) {
        case 'deviceConnector':
        case 'wifiController':
        case 'bluetoothManager':
          groups['Device Control'].push(component);
          break;
        case 'sensorMonitor':
        case 'dataLogger':
          groups['Data Acquisition'].push(component);
          break;
        case 'sequenceController':
        case 'timerControl':
        case 'processMonitor':
          groups['Automation'].push(component);
          break;
        case 'realtimeChart':
        case 'statisticalPanel':
        case 'comparisonChart':
          groups['Visualization'].push(component);
          break;
        default:
          groups['Device Control'].push(component);
      }
    });

    // Remove empty groups
    Object.keys(groups).forEach(key => {
      if (groups[key].length === 0) {
        delete groups[key];
      }
    });

    return groups;
  }
}

export default GUICodeGenerator;