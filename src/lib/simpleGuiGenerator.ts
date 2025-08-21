/**
 * Simple GUI Code Generator
 * Generates transpilation-friendly React component code
 * 
 * DESIGN PRINCIPLES:
 * - No TypeScript annotations
 * - Simple variable names only
 * - Direct React.createElement calls
 * - Minimal complex logic
 * - No dynamic imports/dependencies
 */

interface SimpleGUIComponent {
  id: string;
  type: string;
  text?: string;
  style?: Record<string, string>;
  children?: SimpleGUIComponent[];
}

interface SimpleGUIConfig {
  title: string;
  components: SimpleGUIComponent[];
}

export class SimpleGuiGenerator {
  
  /**
   * Generate simple, transpilation-friendly React component
   */
  static generateSimpleComponent(
    config: SimpleGUIConfig,
    componentName: string = 'PluginGUI'
  ): string {
    
    // Create clean, simple component with minimal complexity
    const code = `
const ${componentName} = function(props) {
  var pluginId = props.pluginId;
  var onDataUpdate = props.onDataUpdate;
  var onError = props.onError;
  
  // Simple state using React hooks
  var loading = React.useState(false)[0];
  var setLoading = React.useState(false)[1];
  var theme = React.useState('light')[0];
  var setTheme = React.useState('light')[1];
  
  // Simple effect for plugin initialization
  React.useEffect(function() {
    console.log('Plugin loaded: ' + (pluginId || 'NO_ID_PROVIDED'));
    if (!pluginId) {
      console.warn('⚠️ Plugin ID not provided to component');
    }
  }, [pluginId]);
  
  // Theme detection effect
  React.useEffect(function() {
    function detectTheme() {
      var isDark = document.documentElement.classList.contains('dark') || 
                   document.body.classList.contains('dark') ||
                   window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(isDark ? 'dark' : 'light');
    }
    
    detectTheme();
    
    // Listen for theme changes
    var observer = new MutationObserver(detectTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    
    return function() {
      observer.disconnect();
    };
  }, []);
  
  // Simple render function
  function renderComponent() {
    // Inject theme CSS variables
    var themeStyles = theme === 'dark' ? {
      '--theme-primary': '#60a5fa',
      '--theme-primary-text': '#1f2937',
      '--theme-text': '#f9fafb',
      '--theme-heading': '#f3f4f6',
      '--theme-border': '#374151',
      '--theme-input-bg': '#374151',
      '--theme-card-bg': '#374151',
      '--theme-card-border': '#4b5563'
    } : {
      '--theme-primary': '#3b82f6',
      '--theme-primary-text': '#ffffff',
      '--theme-text': '#111827',
      '--theme-heading': '#111827',
      '--theme-border': '#d1d5db',
      '--theme-input-bg': '#ffffff',
      '--theme-card-bg': '#f9fafb',
      '--theme-card-border': '#e5e7eb'
    };
    
    var containerStyle = Object.assign({
      padding: 'min(20px, 4vw)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      width: '100%',
      maxWidth: '1200px',
      minHeight: '100%',
      height: 'auto',
      boxSizing: 'border-box',
      backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
      color: theme === 'dark' ? '#f9fafb' : '#111827',
      transition: 'all 0.2s ease',
      overflow: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 'clamp(12px, 2vw, 16px)',
      margin: '0 auto'
    }, themeStyles);
    
    return React.createElement('div', {
      className: 'plugin-container plugin-theme-' + theme,
      style: containerStyle
    }, ${this.generateComponentElements(config.components)});
  }
  
  return renderComponent();
};`.trim();
    
    return code;
  }
  
  /**
   * Generate simple component elements
   */
  private static generateComponentElements(components: SimpleGUIComponent[]): string {
    if (!components || components.length === 0) {
      return `React.createElement('p', null, 'No components configured')`;
    }
    
    const elements = components.map(component => this.generateSingleElement(component));
    
    if (elements.length === 1) {
      return elements[0];
    }
    
    // Multiple elements - wrap in fragment-like structure
    return elements.join(',\n    ');
  }
  
  /**
   * Generate a single element with simple syntax
   */
  private static generateSingleElement(component: SimpleGUIComponent): string {
    const safeId = this.getSafeVariableName(component.id);
    const elementType = this.getHTMLElementType(component.type);
    
    // Build simple props object
    const props = this.buildSimpleProps(component, safeId);
    
    // Handle button clicks separately (can't JSON.stringify functions)
    let propsString = 'null';
    if (Object.keys(props).length > 0) {
      if (component.type === 'button') {
        // Create props object with onClick function
        const propsWithoutClick = { ...props };
        const propsJson = JSON.stringify(propsWithoutClick);
        propsString = propsJson.slice(0, -1) + ', onClick: function() { console.log("Button clicked: ' + safeId + '"); }}';
      } else {
        propsString = JSON.stringify(props);
      }
    }
    
    // Build children (avoid children for self-closing elements)
    let childrenString = '';
    if (component.text && !['input', 'img', 'br', 'hr'].includes(component.type)) {
      childrenString = JSON.stringify(component.text);
    } else if (component.children && component.children.length > 0) {
      const childElements = component.children.map(child => this.generateSingleElement(child));
      childrenString = childElements.join(', ');
    }
    
    if (childrenString) {
      return `React.createElement('${elementType}', ${propsString}, ${childrenString})`;
    } else {
      return `React.createElement('${elementType}', ${propsString})`;
    }
  }
  
  /**
   * Get safe variable name (no special characters)
   */
  private static getSafeVariableName(id: string): string {
    return id.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'element';
  }
  
  /**
   * Map component types to HTML elements
   */
  private static getHTMLElementType(type: string): string {
    const typeMap: Record<string, string> = {
      'button': 'button',
      'input': 'input',
      'text': 'span',
      'title': 'h2',
      'subtitle': 'h3',
      'label': 'label',
      'container': 'div',
      'card': 'div',
      'row': 'div',
      'column': 'div'
    };
    
    return typeMap[type.toLowerCase()] || 'div';
  }
  
  /**
   * Build simple props object with theme support
   */
  private static buildSimpleProps(component: SimpleGUIComponent, safeId: string): Record<string, any> {
    const props: Record<string, any> = {};
    
    // Add className
    props.className = `plugin-${safeId}`;
    
    // Build theme-aware styles
    const baseStyle = { ...component.style };
    
    // Add component-specific theme-aware styling
    switch (component.type.toLowerCase()) {
      case 'button':
        Object.assign(baseStyle, {
          padding: 'clamp(8px, 2vw, 10px) clamp(16px, 4vw, 20px)',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: 'clamp(13px, 2.5vw, 14px)',
          fontWeight: '500',
          transition: 'all 0.2s ease',
          backgroundColor: component.lightBackgroundColor || component.darkBackgroundColor || '#3b82f6',
          color: component.lightTextColor || component.darkTextColor || '#ffffff',
          minWidth: 'clamp(80px, 20vw, 100px)',
          height: '40px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          marginBottom: '8px',
          marginRight: '8px'
        });
        break;
      case 'input':
        Object.assign(baseStyle, {
          padding: '10px 14px',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          fontSize: 'clamp(13px, 2.5vw, 14px)',
          width: '100%',
          maxWidth: 'min(300px, 80vw)',
          height: '40px',
          boxSizing: 'border-box',
          backgroundColor: component.lightBackgroundColor || component.darkBackgroundColor || '#ffffff',
          color: component.lightTextColor || component.darkTextColor || '#111827',
          marginBottom: 'clamp(8px, 2vw, 12px)',
          display: 'block'
        });
        break;
      case 'title':
        Object.assign(baseStyle, {
          fontSize: 'clamp(18px, 4vw, 20px)',
          fontWeight: '600',
          marginBottom: 'clamp(8px, 2vw, 12px)',
          marginTop: '0',
          color: component.lightTextColor || component.darkTextColor || '#111827',
          lineHeight: '1.3',
          display: 'block'
        });
        break;
      case 'text':
      case 'label':
        Object.assign(baseStyle, {
          fontSize: '14px',
          lineHeight: '1.5',
          marginBottom: '8px',
          color: component.lightTextColor || component.darkTextColor || '#374151',
          display: 'block'
        });
        break;
      case 'container':
      case 'card':
        Object.assign(baseStyle, {
          padding: '16px',
          marginBottom: '12px',
          borderRadius: '6px',
          backgroundColor: component.lightBackgroundColor || component.darkBackgroundColor || '#f9fafb',
          border: '1px solid #e5e7eb',
          display: 'block',
          width: '100%',
          boxSizing: 'border-box'
        });
        break;
    }
    
    props.style = baseStyle;
    
    // Add input-specific props
    if (component.type === 'input') {
      props.type = 'text';
      props.placeholder = component.text || 'Enter value...';
      // Use defaultValue instead of value to avoid React warnings
      props.defaultValue = '';
      // Add readOnly to prevent user interaction in demos
      props.readOnly = true;
    }
    
    // Add button-specific props
    if (component.type === 'button') {
      // Note: onClick will be added as a string in the generated code
      // This is handled separately in the element generation
    }
    
    return props;
  }
}

/**
 * Helper function to convert from current complex config to simple config
 */
export function convertToSimpleConfig(complexConfig: any): SimpleGUIConfig {
  return {
    title: complexConfig.title || 'Plugin Interface',
    components: complexConfig.components?.map(convertComponent) || []
  };
}

function convertComponent(comp: any): SimpleGUIComponent {
  return {
    id: comp.id || 'component',
    type: comp.type || 'div',
    text: comp.props?.text || comp.props?.label || comp.props?.children,
    style: comp.props?.style || {},
    children: comp.children?.map(convertComponent) || []
  };
}
