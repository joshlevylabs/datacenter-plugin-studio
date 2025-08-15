import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  PlusIcon,
  TrashIcon,
  EyeIcon,
  CodeBracketIcon,
  CogIcon,
  Squares2X2Icon,
  ChartBarIcon,
  DevicePhoneMobileIcon,
  TableCellsIcon,
  PhotoIcon,
  DocumentTextIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  ArrowsUpDownIcon,
  ArrowsRightLeftIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  Square3Stack3DIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { AUTOMATION_COMPONENT_LIBRARY, AUTOMATION_CATEGORIES, renderAutomationComponent } from './AutomationComponentLibrary.jsx';
import { DATA_VISUALIZER_TEMPLATE, DATA_VISUALIZER_COMPONENTS, BASIC_APP_TEMPLATE, BASIC_APP_COMPONENTS } from './DataVisualizerTemplate.jsx';
import GUICodeGenerator from '../lib/guiCodeGenerator.ts';
import { GUIValidator } from '../lib/guiValidation.ts';
import './PluginGUIBuilder.css';

// Merge basic components with automation components
const BASIC_COMPONENT_LIBRARY = {
  'Button': {
    type: 'button',
    icon: Squares2X2Icon,
    defaultProps: {
      text: 'Button',
      variant: 'primary',
      size: 'medium',
      disabled: false,
      onClick: 'handleButtonClick'
    },
    category: 'Basic'
  },
  'Input': {
    type: 'input',
    icon: DocumentTextIcon,
    defaultProps: {
      label: 'Input Field',
      placeholder: 'Enter text...',
      type: 'text',
      required: false,
      value: '',
      onChange: 'handleInputChange'
    },
    category: 'Basic'
  },
  'Select': {
    type: 'select',
    icon: ChevronDownIcon,
    defaultProps: {
      label: 'Select',
      options: ['Option 1', 'Option 2', 'Option 3'],
      value: '',
      onChange: 'handleSelectChange'
    },
    category: 'Basic'
  },
  'Toggle Switch': {
    type: 'toggle',
    icon: ArrowsUpDownIcon,
    defaultProps: {
      label: 'Toggle',
      checked: false,
      onChange: 'handleToggleChange'
    },
    category: 'Basic'
  }
};

// Component Library - Merged basic, automation, data visualization, and basic app components
const COMPONENT_LIBRARY = { 
  ...BASIC_COMPONENT_LIBRARY, 
  ...AUTOMATION_COMPONENT_LIBRARY,
  ...DATA_VISUALIZER_COMPONENTS,
  ...BASIC_APP_COMPONENTS
};

// Component categories for organization
const COMPONENT_CATEGORIES = ['All', 'Basic', 'Data Visualization', ...AUTOMATION_CATEGORIES.slice(1)];

const PluginGUIBuilder = ({ pluginDoc, onUpdateGUI }) => {
  const [guiComponents, setGuiComponents] = useState(pluginDoc?.gui?.components || []);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [draggedComponent, setDraggedComponent] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [guiSettings, setGuiSettings] = useState(pluginDoc?.gui?.settings || {
    layout: 'tabs',
    theme: 'default',
    responsive: true
  });
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [validationResult, setValidationResult] = useState(null);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 800, height: 600 });
  const [sidebarTab, setSidebarTab] = useState('components'); // 'components' or 'properties'
  
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [dragOverCanvas, setDragOverCanvas] = useState(false);

  // Drop handler (defined before using it anywhere that might create TDZ issues)
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOverCanvas(false);
    
    console.log('Drop event triggered!');
    
    // Try to get drag data from dataTransfer first (more reliable)
    let componentInfo = null;
    try {
      const dragData = e.dataTransfer.getData('text/plain');
      if (dragData) {
        componentInfo = JSON.parse(dragData);
        console.log('Retrieved from dataTransfer:', componentInfo);
      }
    } catch (err) {
      console.error('Error parsing drag data:', err);
    }
    
    // Fallback to state if dataTransfer fails
    if (!componentInfo) {
      componentInfo = draggedComponent;
      console.log('Using dragged component state:', componentInfo);
    }
    
    if (!componentInfo) {
      console.log('No component information found');
      return;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newComponent = {
      id: generateId(),
      type: componentInfo.data.type,
      props: { ...componentInfo.data.defaultProps },
      position: { x: Math.max(0, x - 100), y: Math.max(0, y - 50) },
      size: { width: 200, height: 50 }
    };

    console.log('Creating new component:', newComponent);
    setGuiComponents(prev => [...prev, newComponent]);
    setSelectedComponent(newComponent.id);
    setDraggedComponent(null);
  }, []);

  // Keep a ref to the latest handleDrop to avoid TDZ and stale closures
  const handleDropRef = useRef(handleDrop);
  useEffect(() => {
    handleDropRef.current = handleDrop;
  }, [handleDrop]);

  // Native DnD fallback listeners to ensure events fire in all environments (e.g., Tauri WebView)
  // Disabled for now - using mouse-based drag instead
  /*
  useEffect(() => {
    const canvasEl = canvasRef.current;
    const containerEl = containerRef.current;
    if (!canvasEl && !containerEl) return;

    const nativeDragOver = (e) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
      console.log('Native dragover');
      setDragOverCanvas(true);
    };

    const nativeDragEnter = (e) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
      console.log('Native dragenter');
      setDragOverCanvas(true);
    };

    const nativeDragLeave = (e) => {
      e.preventDefault();
      console.log('Native dragleave');
      setDragOverCanvas(false);
    };

    const nativeDrop = (e) => {
      e.preventDefault();
      console.log('Native drop');
      if (handleDropRef.current) {
        handleDropRef.current(e);
      }
    };

    const targets = [canvasEl, containerEl].filter(Boolean);
    targets.forEach((el) => {
      el.addEventListener('dragover', nativeDragOver);
      el.addEventListener('dragenter', nativeDragEnter);
      el.addEventListener('dragleave', nativeDragLeave);
      el.addEventListener('drop', nativeDrop);
    });

    return () => {
      targets.forEach((el) => {
        el.removeEventListener('dragover', nativeDragOver);
        el.removeEventListener('dragenter', nativeDragEnter);
        el.removeEventListener('dragleave', nativeDragLeave);
        el.removeEventListener('drop', nativeDrop);
      });
    };
  }, [canvasRef, containerRef]);
  */

  // Generate unique ID for components
  const generateId = () => `component_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Handle drag start from component library - DISABLED (using mouse events instead)
  /*
  const handleDragStart = (e, componentType, componentData) => {
    console.log('Drag started:', componentType, componentData);
    console.log('DataTransfer available:', !!e.dataTransfer);
    setDraggedComponent({ type: componentType, data: componentData });
    
    // Set drag data for better browser compatibility
    try {
      e.dataTransfer.setData('text/plain', JSON.stringify({
        type: componentType,
        data: componentData
      }));
      e.dataTransfer.effectAllowed = 'copy';
      
      // Create a simple drag image
      const dragImage = document.createElement('div');
      dragImage.innerHTML = componentType;
      dragImage.style.padding = '8px';
      dragImage.style.backgroundColor = '#3b82f6';
      dragImage.style.color = 'white';
      dragImage.style.borderRadius = '4px';
      dragImage.style.position = 'absolute';
      dragImage.style.top = '-1000px';
      document.body.appendChild(dragImage);
      
      e.dataTransfer.setDragImage(dragImage, 0, 0);
      
      // Clean up drag image after a delay
      setTimeout(() => {
        document.body.removeChild(dragImage);
      }, 0);
      
      console.log('DataTransfer data set successfully');
    } catch (err) {
      console.error('Error setting drag data:', err);
    }
  };
  */

  // Handle drop on canvas
  // const handleDrop = useCallback((e) => {
  //   e.preventDefault();
  //   setDragOverCanvas(false);
    
  //   console.log('Drop event triggered!');
    
  //   // Try to get drag data from dataTransfer first (more reliable)
  //   let componentInfo = null;
  //   try {
  //     const dragData = e.dataTransfer.getData('text/plain');
  //     if (dragData) {
  //       componentInfo = JSON.parse(dragData);
  //       console.log('Retrieved from dataTransfer:', componentInfo);
  //     }
  //   } catch (err) {
  //     console.error('Error parsing drag data:', err);
  //   }
    
  //   // Fallback to state if dataTransfer fails
  //   if (!componentInfo) {
  //     componentInfo = draggedComponent;
  //     console.log('Using dragged component state:', componentInfo);
  //   }
    
  //   if (!componentInfo) {
  //     console.log('No component information found');
  //     return;
  //   }

  //   const rect = canvasRef.current.getBoundingClientRect();
  //   const x = e.clientX - rect.left;
  //   const y = e.clientY - rect.top;

  //   const newComponent = {
  //     id: generateId(),
  //     type: componentInfo.data.type,
  //     props: { ...componentInfo.data.defaultProps },
  //     position: { x: Math.max(0, x - 100), y: Math.max(0, y - 50) },
  //     size: { width: 200, height: 50 }
  //   };

  //   console.log('Creating new component:', newComponent);
  //   setGuiComponents(prev => [...prev, newComponent]);
  //   setSelectedComponent(newComponent.id);
  //   setDraggedComponent(null);
  // }, []); // Remove draggedComponent dependency to prevent recreation

  // Handle drag over canvas
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    console.log('Drag over canvas');
    setDragOverCanvas(true);
  };

  // Handle drag leave canvas
  const handleDragLeave = (e) => {
    e.preventDefault();
    console.log('Drag leave canvas');
    setDragOverCanvas(false);
  };

  // Handle drag enter canvas
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    console.log('Drag enter canvas');
    setDragOverCanvas(true);
  };

  // Delete selected component
  const deleteComponent = (componentId) => {
    setGuiComponents(prev => prev.filter(comp => comp.id !== componentId));
    if (selectedComponent === componentId) {
      setSelectedComponent(null);
    }
  };

  // Update component properties
  const updateComponentProps = (componentId, newProps) => {
    setGuiComponents(prev => prev.map(comp => 
      comp.id === componentId ? { ...comp, props: { ...comp.props, ...newProps } } : comp
    ));
  };

  // Move component
  const moveComponent = (componentId, newPosition) => {
    setGuiComponents(prev => prev.map(comp => 
      comp.id === componentId ? { ...comp, position: newPosition } : comp
    ));
  };

  // Resize component
  const resizeComponent = (componentId, newSize) => {
    setGuiComponents(prev => prev.map(comp => 
      comp.id === componentId ? { ...comp, size: newSize } : comp
    ));
  };

  // Save GUI configuration
  const saveGUI = async () => {
    const guiConfig = {
      components: guiComponents,
      settings: guiSettings,
      version: '1.0',
      lastModified: new Date().toISOString()
    };
    
    if (onUpdateGUI) {
      await onUpdateGUI(guiConfig);
    }
  };

  // Generate code from GUI design
  const generateCode = () => {
    const config = {
      components: guiComponents,
      settings: guiSettings
    };
    
    const options = {
      includeImports: true,
      includeEventHandlers: true,
      includeDataBinding: true,
      includeStyles: true,
      targetFramework: 'react',
      typescript: true
    };
    
    const code = GUICodeGenerator.generateReactComponent(config, 'PluginGUI', options);
    setGeneratedCode(code);
    setShowCodeModal(true);
  };

  // Copy code to clipboard
  const copyCodeToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
      // Could show a toast notification here
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  // Validate GUI configuration
  const validateGUI = () => {
    const config = {
      components: guiComponents,
      settings: guiSettings
    };
    
    const result = GUIValidator.validateGUI(config);
    setValidationResult(result);
    setShowValidationModal(true);
  };

  // Apply Data Visualizer template
  const applyDataVisualizerTemplate = () => {
    const template = DATA_VISUALIZER_TEMPLATE;
    
    // Clear existing components and apply template
    setGuiComponents(template.components);
    setGuiSettings(template.settings);
    setSelectedComponent(null);
    
    // Save the updated GUI
    saveGUI();
    
    setShowTemplateModal(false);
    
    console.log('Applied Data Visualizer template');
  };

  // Apply Basic App template
  const applyBasicAppTemplate = () => {
    const template = BASIC_APP_TEMPLATE;
    
    // Clear existing components and apply template
    setGuiComponents(template.components);
    setGuiSettings(template.settings);
    setSelectedComponent(null);
    
    // Save the updated GUI
    saveGUI();
    
    setShowTemplateModal(false);
    
    console.log('Applied Basic App template');
  };

  // Clear all components
  const clearAllComponents = () => {
    if (window.confirm('Are you sure you want to clear all components? This action cannot be undone.')) {
      setGuiComponents([]);
      setSelectedComponent(null);
      saveGUI();
    }
  };

  // Canvas zoom functions
  const zoomIn = () => {
    setCanvasZoom(prev => Math.min(prev + 0.1, 2));
  };

  const zoomOut = () => {
    setCanvasZoom(prev => Math.max(prev - 0.1, 0.3));
  };

  const resetZoom = () => {
    setCanvasZoom(1);
    setCanvasOffset({ x: 0, y: 0 });
  };

  // Render component in canvas
  const renderComponent = (component) => {
    const { id, type, props, position, size } = component;
    const isSelected = selectedComponent === id;

    const handleComponentClick = (e) => {
      e.stopPropagation();
      if (!previewMode) {
        setSelectedComponent(id);
        setSidebarTab('properties'); // Auto-switch to properties tab
      }
    };

    const handleComponentMouseDown = (e) => {
      if (previewMode) return;
      
      e.stopPropagation();
      setSelectedComponent(id);
      setSidebarTab('properties'); // Auto-switch to properties tab
      
      const startX = e.clientX;
      const startY = e.clientY;
      const startPosX = position.x;
      const startPosY = position.y;
      let isDragging = false;
      
      const handleMouseMove = (moveEvent) => {
        const distance = Math.sqrt(
          Math.pow(moveEvent.clientX - startX, 2) + 
          Math.pow(moveEvent.clientY - startY, 2)
        );
        
        if (distance > 5 && !isDragging) {
          isDragging = true;
          console.log('Component drag started:', id);
        }
        
        if (isDragging) {
          const deltaX = moveEvent.clientX - startX;
          const deltaY = moveEvent.clientY - startY;
          const newX = Math.max(0, startPosX + deltaX);
          const newY = Math.max(0, startPosY + deltaY);
          
          moveComponent(id, { x: newX, y: newY });
        }
      };
      
      const handleMouseUp = () => {
        if (isDragging) {
          console.log('Component drag ended:', id);
        }
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };

    // Check if this is an automation component
    if (AUTOMATION_COMPONENT_LIBRARY[Object.keys(AUTOMATION_COMPONENT_LIBRARY).find(key => 
      AUTOMATION_COMPONENT_LIBRARY[key].type === type
    )]) {
      return (
        <div 
          onClick={handleComponentClick}
          onMouseDown={handleComponentMouseDown}
          style={{
            position: 'absolute',
            left: position.x,
            top: position.y,
            width: size.width,
            height: size.height,
            cursor: previewMode ? 'default' : 'move'
          }}
        >
          {renderAutomationComponent(component, isSelected, previewMode, deleteComponent)}
        </div>
      );
    }

    // Render basic components
    const componentStyle = {
      position: 'absolute',
      left: position.x,
      top: position.y,
      width: size.width,
      height: size.height,
      border: isSelected ? '2px solid #3b82f6' : '1px solid #d1d5db',
      backgroundColor: '#ffffff',
      borderRadius: '4px',
      padding: '8px',
      cursor: previewMode ? 'default' : 'move',
      boxShadow: isSelected ? '0 0 0 3px rgba(59, 130, 246, 0.1)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    };

    switch (type) {
      case 'button':
        return (
          <div
            key={id}
            style={componentStyle}
            onClick={handleComponentClick}
            onMouseDown={handleComponentMouseDown}
            className="gui-component"
          >
            <button 
              className={`px-4 py-2 rounded ${props.variant === 'primary' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}
              disabled={props.disabled}
            >
              {props.text}
            </button>
            {isSelected && !previewMode && (
              <button
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteComponent(id);
                }}
              >
                ×
              </button>
            )}
          </div>
        );

      case 'input':
        return (
          <div
            key={id}
            style={componentStyle}
            onClick={handleComponentClick}
            onMouseDown={handleComponentMouseDown}
            className="gui-component"
          >
            <div className="w-full">
              {props.label && <label className="block text-sm font-medium mb-1">{props.label}</label>}
              <input
                type={props.type}
                placeholder={props.placeholder}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                required={props.required}
              />
            </div>
            {isSelected && !previewMode && (
              <button
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteComponent(id);
                }}
              >
                ×
              </button>
            )}
          </div>
        );

      case 'select':
        return (
          <div
            key={id}
            style={componentStyle}
            onClick={handleComponentClick}
            onMouseDown={handleComponentMouseDown}
            className="gui-component"
          >
            <div className="w-full">
              {props.label && <label className="block text-sm font-medium mb-1">{props.label}</label>}
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                {props.options.map((option, index) => (
                  <option key={index} value={option}>{option}</option>
                ))}
              </select>
            </div>
            {isSelected && !previewMode && (
              <button
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteComponent(id);
                }}
              >
                ×
              </button>
            )}
          </div>
        );

      case 'toggle':
        return (
          <div
            key={id}
            style={componentStyle}
            onClick={handleComponentClick}
            onMouseDown={handleComponentMouseDown}
            className="gui-component"
          >
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={props.checked}
                className="mr-2 rounded"
                readOnly
              />
              <label className="text-sm font-medium">{props.label}</label>
            </div>
            {isSelected && !previewMode && (
              <button
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteComponent(id);
                }}
              >
                ×
              </button>
            )}
          </div>
        );

      case 'textDisplay':
        return (
          <div
            key={id}
            style={componentStyle}
            onClick={handleComponentClick}
            onMouseDown={handleComponentMouseDown}
            className="gui-component"
          >
            <div 
              style={{
                fontSize: props.fontSize || '16px',
                fontWeight: props.fontWeight || 'normal',
                textAlign: props.textAlign || 'left',
                color: props.color || '#374151',
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: props.textAlign === 'center' ? 'center' : props.textAlign === 'right' ? 'flex-end' : 'flex-start'
              }}
            >
              {props.text || 'Text Display'}
            </div>
            {isSelected && !previewMode && (
              <button
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteComponent(id);
                }}
              >
                ×
              </button>
            )}
          </div>
        );

      case 'tabContainer':
        return (
          <div
            key={id}
            style={componentStyle}
            onClick={handleComponentClick}
            onMouseDown={handleComponentMouseDown}
            className="gui-component"
          >
            <div className="w-full h-full flex flex-col">
              {/* Tab Headers */}
              <div className="flex border-b border-gray-200">
                {(props.tabs || ['Tab 1', 'Tab 2', 'Tab 3']).map((tab, index) => (
                  <button
                    key={`tab-${index}`}
                    className={`px-4 py-2 text-sm font-medium border-b-2 ${
                      (props.activeTab || 0) === index 
                        ? 'border-blue-500 text-blue-600' 
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              {/* Tab Content */}
              <div className="flex-1 p-4 overflow-hidden">
                <div className="text-center text-gray-500">
                  {(props.tabs || ['Tab 1', 'Tab 2', 'Tab 3'])[props.activeTab || 0]} Content
                </div>
              </div>
            </div>
            {isSelected && !previewMode && (
              <button
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteComponent(id);
                }}
              >
                ×
              </button>
            )}
          </div>
        );

      case 'infoPanel':
        return (
          <div
            key={id}
            style={{
              ...componentStyle,
              backgroundColor: props.backgroundColor || '#f9fafb',
              borderColor: props.borderColor || '#e5e7eb'
            }}
            onClick={handleComponentClick}
            onMouseDown={handleComponentMouseDown}
            className="gui-component"
          >
            <div className="w-full h-full p-2">
              <div className="flex items-center">
                {props.showIcon && (
                  <InformationCircleIcon className="w-5 h-5 text-blue-500 mr-2" />
                )}
                <h4 className="font-medium text-gray-900">{props.title || 'Information'}</h4>
              </div>
              <p className="text-sm text-gray-600 mt-1">Panel content goes here</p>
            </div>
            {isSelected && !previewMode && (
              <button
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteComponent(id);
                }}
              >
                ×
              </button>
            )}
          </div>
        );

      case 'statusIndicator':
        const statusColors = props.colors || {
          normal: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444'
        };
        const currentColor = statusColors[props.status] || statusColors.normal;
        
        return (
          <div
            key={id}
            style={componentStyle}
            onClick={handleComponentClick}
            onMouseDown={handleComponentMouseDown}
            className="gui-component"
          >
            <div className="flex items-center w-full">
              <div 
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: currentColor }}
              ></div>
              <span className="text-sm">{props.label || 'Status'}</span>
              {props.showStatusText && (
                <span className="text-xs text-gray-500 ml-2">
                  {props.status || 'normal'}
                </span>
              )}
            </div>
            {isSelected && !previewMode && (
              <button
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteComponent(id);
                }}
              >
                ×
              </button>
            )}
          </div>
        );

      default:
        return (
          <div
            key={id}
            style={componentStyle}
            onClick={handleComponentClick}
            onMouseDown={handleComponentMouseDown}
            className="gui-component"
          >
            <div className="text-center">
              <div className="text-sm font-medium">{type}</div>
              <div className="text-xs text-gray-500">Component</div>
            </div>
            {isSelected && !previewMode && (
              <button
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteComponent(id);
                }}
              >
                ×
              </button>
            )}
          </div>
        );
    }
  };

  // Filter components by category
  const filteredComponents = activeCategory === 'All' 
    ? Object.entries(COMPONENT_LIBRARY)
    : Object.entries(COMPONENT_LIBRARY).filter(([_, data]) => data.category === activeCategory);

  return (
    <div className="plugin-gui-builder">
      {/* Header */}
      <div className="gui-builder-header">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Plugin GUI Builder</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className={`px-3 py-1 rounded text-sm ${previewMode ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              <EyeIcon className="w-4 h-4 inline mr-1" />
              {previewMode ? 'Exit Preview' : 'Preview'}
            </button>
            <button
              onClick={validateGUI}
              className="px-3 py-1 bg-orange-600 text-white rounded text-sm"
            >
              Validate
            </button>
            <button
              onClick={() => setShowTemplateModal(true)}
              className="px-3 py-1 bg-indigo-600 text-white rounded text-sm"
            >
              <Square3Stack3DIcon className="w-4 h-4 inline mr-1" />
              Templates
            </button>
            <button
              onClick={generateCode}
              className="px-3 py-1 bg-purple-600 text-white rounded text-sm"
            >
              <CodeBracketIcon className="w-4 h-4 inline mr-1" />
              Generate Code
            </button>
            <button
              onClick={saveGUI}
              className="px-3 py-1 bg-green-600 text-white rounded text-sm"
            >
              Save GUI
            </button>

          </div>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Drag components from the library to the canvas or double-click to add them
        </p>
      </div>

      <div className="gui-builder-content">
        {/* Tabbed Sidebar */}
        <div className="sidebar-container">
          {/* Tab Headers */}
          <div className="sidebar-tabs">
            <button
              onClick={() => setSidebarTab('components')}
              className={`sidebar-tab ${sidebarTab === 'components' ? 'active' : ''}`}
            >
              <Square3Stack3DIcon className="w-4 h-4 inline mr-1" />
              Components
            </button>
            <button
              onClick={() => setSidebarTab('properties')}
              className={`sidebar-tab ${sidebarTab === 'properties' ? 'active' : ''}`}
              disabled={!selectedComponent}
            >
              <CogIcon className="w-4 h-4 inline mr-1" />
              Properties
            </button>
          </div>

          {/* Tab Content */}
          <div className="sidebar-content">
            {sidebarTab === 'components' && (
              <div className="component-library">
                <div className="library-header">
                  <h4 className="font-medium">Component Library</h4>
                  
                  {/* Category Filter */}
                  <div className="category-tabs">
                    {COMPONENT_CATEGORIES.map(category => (
                      <button
                        key={category}
                        onClick={() => setActiveCategory(category)}
                        className={`category-tab ${activeCategory === category ? 'active' : ''}`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="component-grid">
                  {filteredComponents.map(([name, data]) => {
                    const IconComponent = data.icon;
                    return (
                      <div
                        key={name}
                        className="component-item"
                        onMouseDown={(e) => {
                        e.preventDefault(); // Prevent text selection during drag
                        
                        const startX = e.clientX;
                        const startY = e.clientY;
                        let isDragging = false;
                        
                        const handleMouseMove = (moveEvent) => {
                          const distance = Math.sqrt(
                            Math.pow(moveEvent.clientX - startX, 2) + 
                            Math.pow(moveEvent.clientY - startY, 2)
                          );
                          
                          if (distance > 5 && !isDragging) {
                            isDragging = true;
                            console.log('Mouse drag started for:', name);
                            setDraggedComponent({ type: name, data: data });
                          }
                          
                          if (isDragging) {
                            // Check if mouse is over canvas area
                            const canvasEl = canvasRef.current;
                            const containerEl = containerRef.current;
                            if (canvasEl || containerEl) {
                              const rect = (canvasEl || containerEl).getBoundingClientRect();
                              const isOverCanvas = (
                                moveEvent.clientX >= rect.left &&
                                moveEvent.clientX <= rect.right &&
                                moveEvent.clientY >= rect.top &&
                                moveEvent.clientY <= rect.bottom
                              );
                              
                              setDragOverCanvas(isOverCanvas);
                            }
                          }
                        };
                        
                        const handleMouseUp = (upEvent) => {
                          if (isDragging) {
                            console.log('Mouse drag ended for:', name);
                            
                            // Check if we're over the canvas
                            const canvasEl = canvasRef.current;
                            const containerEl = containerRef.current;
                            if (canvasEl || containerEl) {
                              const rect = (canvasEl || containerEl).getBoundingClientRect();
                              const isOverCanvas = (
                                upEvent.clientX >= rect.left &&
                                upEvent.clientX <= rect.right &&
                                upEvent.clientY >= rect.top &&
                                upEvent.clientY <= rect.bottom
                              );
                              
                              if (isOverCanvas) {
                                console.log('Creating component via mouse drop');
                                const x = upEvent.clientX - rect.left;
                                const y = upEvent.clientY - rect.top;
                                
                                const newComponent = {
                                  id: generateId(),
                                  type: data.type,
                                  props: { ...data.defaultProps },
                                  position: { x: Math.max(0, x - 50), y: Math.max(0, y - 25) },
                                  size: { width: 200, height: 50 }
                                };
                                
                                // Add component immediately
                                setGuiComponents(prev => [...prev, newComponent]);
                                setSelectedComponent(newComponent.id);
                                setSidebarTab('properties'); // Auto-switch to properties tab
                                
                                // Save GUI state
                                saveGUI();
                              }
                            }
                          }
                          
                          // Clean up drag state
                          setDraggedComponent(null);
                          setDragOverCanvas(false);
                          
                          document.removeEventListener('mousemove', handleMouseMove);
                          document.removeEventListener('mouseup', handleMouseUp);
                        };
                        
                        document.addEventListener('mousemove', handleMouseMove);
                        document.addEventListener('mouseup', handleMouseUp);
                      }}
                        onDoubleClick={() => {
                          // Alternative: double-click to add component to center of canvas
                          console.log('Double-click add component:', name);
                          const newComponent = {
                            id: generateId(),
                            type: data.type,
                            props: { ...data.defaultProps },
                            position: { x: 100, y: 100 },
                            size: { width: 200, height: 50 }
                          };
                          setGuiComponents(prev => [...prev, newComponent]);
                          setSelectedComponent(newComponent.id);
                          setSidebarTab('properties'); // Auto-switch to properties tab
                        }}
                      >
                        <IconComponent className="component-icon" />
                        <span className="component-name">{name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {sidebarTab === 'properties' && (
              <div className="properties-panel-content">
                {selectedComponent ? (
                  <>
                    <div className="panel-header">
                      <h4 className="font-medium">Properties</h4>
                      <button
                        onClick={() => {
                          setSelectedComponent(null);
                          setSidebarTab('components');
                        }}
                        className="text-gray-400 hover:text-gray-600"
                        title="Close Properties"
                      >
                        ×
                      </button>
                    </div>

                    <PropertyEditor
                      component={guiComponents.find(c => c.id === selectedComponent)}
                      onUpdateProps={(newProps) => updateComponentProps(selectedComponent, newProps)}
                    />
                  </>
                ) : (
                  <div className="no-selection">
                    <CogIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm text-center">
                      Select a component to edit its properties
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Canvas Area */}
        <div 
          ref={containerRef}
          className="canvas-area"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onMouseEnter={() => console.log('Mouse entered canvas area')}
          onMouseLeave={() => console.log('Mouse left canvas area')}
        >
          <div className="canvas-header flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Canvas ({guiComponents.length} components)
              </span>
              <div className="flex items-center space-x-2 text-xs">
                <label className="text-gray-500">Size:</label>
                <input
                  type="number"
                  value={canvasDimensions.width}
                  onChange={(e) => setCanvasDimensions(prev => ({ ...prev, width: parseInt(e.target.value) || 800 }))}
                  className="w-16 px-1 py-1 border border-gray-300 rounded text-xs"
                  min="400"
                  max="2000"
                  step="50"
                />
                <span className="text-gray-400">×</span>
                <input
                  type="number"
                  value={canvasDimensions.height}
                  onChange={(e) => setCanvasDimensions(prev => ({ ...prev, height: parseInt(e.target.value) || 600 }))}
                  className="w-16 px-1 py-1 border border-gray-300 rounded text-xs"
                  min="300"
                  max="1500"
                  step="50"
                />
                <span className="text-gray-400">px</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={zoomOut}
                className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
                title="Zoom Out"
              >
                −
              </button>
              <span className="text-xs text-gray-600 min-w-[3rem] text-center">
                {Math.round(canvasZoom * 100)}%
              </span>
              <button
                onClick={zoomIn}
                className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
                title="Zoom In"
              >
                +
              </button>
              <button
                onClick={resetZoom}
                className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
                title="Reset Zoom"
              >
                Fit
              </button>
            </div>
          </div>
          
          <div
            ref={canvasRef}
            className={`gui-canvas ${dragOverCanvas ? 'drag-over' : ''} ${previewMode ? 'preview-mode' : ''}`}
            onClick={() => !previewMode && setSelectedComponent(null)}
            style={{
              transform: `scale(${canvasZoom}) translate(${canvasOffset.x}px, ${canvasOffset.y}px)`,
              transformOrigin: 'top left',
              transition: 'transform 0.1s ease-out',
              width: `${canvasDimensions.width}px`,
              height: `${canvasDimensions.height}px`,
              minWidth: `${canvasDimensions.width}px`,
              minHeight: `${canvasDimensions.height}px`,
              backgroundColor: previewMode ? '#f8fafc' : '#ffffff',
              border: previewMode ? '2px solid #3b82f6' : '1px solid #e5e7eb',
              borderRadius: previewMode ? '8px' : '4px'
            }}
          >
            {guiComponents.length === 0 && !dragOverCanvas && (
              <div className="empty-canvas">
                <Squares2X2Icon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">
                  {previewMode ? 'No components to preview' : 'Drag components here to start building your GUI'}
                </p>
                {!previewMode && (
                  <p className="text-gray-400 text-xs mt-2">
                    Or double-click any component in the library to add it
                  </p>
                )}
              </div>
            )}
            
            {previewMode && guiComponents.length > 0 && (
              <div className="absolute top-2 right-2 bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                Preview Mode
              </div>
            )}
            
            {dragOverCanvas && (
              <div className="drop-indicator">
                <PlusIcon className="w-8 h-8 text-blue-500" />
                <span className="text-blue-500 ml-2">Drop component here</span>
              </div>
            )}

            {guiComponents.map((component) => (
              <React.Fragment key={component.id}>
                {renderComponent(component)}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Code Generation Modal */}
      {showCodeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl max-h-[80vh] w-full mx-4 flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">Generated React Component</h3>
              <div className="flex space-x-2">
                <button
                  onClick={copyCodeToClipboard}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                >
                  Copy Code
                </button>
                <button
                  onClick={() => setShowCodeModal(false)}
                  className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <pre className="bg-gray-50 p-4 rounded text-sm overflow-auto">
                <code>{generatedCode}</code>
              </pre>
            </div>
            <div className="p-4 border-t bg-gray-50">
              <p className="text-sm text-gray-600">
                <strong>Usage:</strong> Copy this code and paste it into your plugin's main component file. 
                Make sure to install the required dependencies and update the Centcom API integration as needed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Validation Results Modal */}
      {showValidationModal && validationResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-3xl max-h-[80vh] w-full mx-4 flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold flex items-center">
                {validationResult.isValid ? (
                  <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2" />
                ) : (
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mr-2" />
                )}
                GUI Validation Results
              </h3>
              <button
                onClick={() => setShowValidationModal(false)}
                className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm"
              >
                Close
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-4">
              <div className={`mb-4 p-3 rounded ${validationResult.isValid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="font-semibold">
                  Status: {validationResult.isValid ? '✅ Valid Configuration' : '❌ Issues Found'}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {validationResult.errors.length} errors, {validationResult.warnings.length} warnings, {validationResult.suggestions.length} suggestions
                </div>
              </div>

              {validationResult.errors.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold text-red-700 mb-2 flex items-center">
                    <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                    Errors ({validationResult.errors.length})
                  </h4>
                  <div className="space-y-2">
                    {validationResult.errors.map((error, index) => (
                      <div key={index} className="bg-red-50 border border-red-200 rounded p-3">
                        <div className="font-medium text-red-800">{error.message}</div>
                        {error.componentId && (
                          <div className="text-sm text-red-600 mt-1">Component: {error.componentId}</div>
                        )}
                        <div className="text-xs text-red-500 mt-1">Code: {error.code}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {validationResult.warnings.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold text-yellow-700 mb-2 flex items-center">
                    ⚠️ Warnings ({validationResult.warnings.length})
                  </h4>
                  <div className="space-y-2">
                    {validationResult.warnings.map((warning, index) => (
                      <div key={index} className="bg-yellow-50 border border-yellow-200 rounded p-3">
                        <div className="font-medium text-yellow-800">{warning.message}</div>
                        {warning.componentId && (
                          <div className="text-sm text-yellow-600 mt-1">Component: {warning.componentId}</div>
                        )}
                        <div className="text-xs text-yellow-500 mt-1">Code: {warning.code}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {validationResult.suggestions.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold text-blue-700 mb-2 flex items-center">
                    💡 Suggestions ({validationResult.suggestions.length})
                  </h4>
                  <div className="space-y-2">
                    {validationResult.suggestions.map((suggestion, index) => (
                      <div key={index} className="bg-blue-50 border border-blue-200 rounded p-3">
                        <div className="font-medium text-blue-800">{suggestion.message}</div>
                        {suggestion.componentId && (
                          <div className="text-sm text-blue-600 mt-1">Component: {suggestion.componentId}</div>
                        )}
                        <div className="text-xs text-blue-500 mt-1">Code: {suggestion.code}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {validationResult.isValid && validationResult.warnings.length === 0 && validationResult.suggestions.length === 0 && (
                <div className="text-center py-8">
                  <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-green-700 mb-2">Perfect Configuration!</h3>
                  <p className="text-gray-600">Your GUI design follows all best practices and has no issues.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Template Selection Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl max-h-[80vh] w-full mx-4 flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold flex items-center">
                <Square3Stack3DIcon className="w-5 h-5 text-indigo-500 mr-2" />
                GUI Templates
              </h3>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm"
              >
                Close
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-6">
              <div className="grid gap-6">
                {/* Data Visualizer Template */}
                <div className="border border-gray-200 rounded-lg p-6 hover:border-indigo-300 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <ChartBarIcon className="w-8 h-8 text-indigo-500 mr-3" />
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">Data Visualizer</h4>
                        <p className="text-sm text-gray-600">Complete data visualization interface matching Centcom Analytics</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={applyDataVisualizerTemplate}
                        className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                      >
                        Apply Template
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Includes:</h5>
                      <ul className="space-y-1">
                        <li>• Interactive Chart Display</li>
                        <li>• Data Table with Filtering</li>
                        <li>• Series Controls</li>
                        <li>• Real-time Statistics</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Features:</h5>
                      <ul className="space-y-1">
                        <li>• Control Limits</li>
                        <li>• Export Controls</li>
                        <li>• Live Data Monitor</li>
                        <li>• Metadata Viewer</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded">
                    <div className="flex items-center">
                      <ExclamationTriangleIcon className="w-4 h-4 text-amber-500 mr-2" />
                      <p className="text-sm text-amber-700">
                        Applying this template will replace all existing components. Make sure to save your current work first.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Basic Application Template */}
                <div className="border border-gray-200 rounded-lg p-6 hover:border-green-300 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <TableCellsIcon className="w-8 h-8 text-green-500 mr-3" />
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">Basic Application</h4>
                        <p className="text-sm text-gray-600">Simple layout with title, description, and tabbed interface</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={applyBasicAppTemplate}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                      >
                        Apply Template
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Includes:</h5>
                      <ul className="space-y-1">
                        <li>• Title & Description Headers</li>
                        <li>• Three-Tab Layout</li>
                        <li>• General Information Panel</li>
                        <li>• Status Indicators</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Features:</h5>
                      <ul className="space-y-1">
                        <li>• Device Controls</li>
                        <li>• Settings Management</li>
                        <li>• Form Inputs & Toggles</li>
                        <li>• Activity Logging</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                    <div className="flex items-center">
                      <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                      <p className="text-sm text-green-700">
                        Perfect starter template for most plugin applications with clean organization.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Coming Soon Templates */}
                <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <CogIcon className="w-8 h-8 text-gray-400 mr-3" />
                      <div>
                        <h4 className="text-lg font-semibold text-gray-500">More Templates Coming Soon</h4>
                        <p className="text-sm text-gray-400">Device Control Dashboard, Form Builder, Report Generator</p>
                      </div>
                    </div>
                    <button
                      disabled
                      className="px-4 py-2 bg-gray-300 text-gray-500 rounded cursor-not-allowed"
                    >
                      Coming Soon
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-between items-center">
                <button
                  onClick={clearAllComponents}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                  Clear All Components
                </button>
                <div className="text-sm text-gray-600">
                  Templates help you get started quickly with pre-configured component layouts
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Property Editor Component
const PropertyEditor = ({ component, onUpdateProps }) => {
  if (!component) return null;

  const { type, props } = component;

  const handlePropChange = (propName, value) => {
    onUpdateProps({ [propName]: value });
  };

  const renderPropertyField = (propName, propValue, propType = 'text') => {
    switch (propType) {
      case 'select':
        return (
          <select
            value={propValue}
            onChange={(e) => handlePropChange(propName, e.target.value)}
            className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
          >
            {propName === 'variant' && (
              <>
                <option value="primary">Primary</option>
                <option value="secondary">Secondary</option>
              </>
            )}
            {propName === 'chartType' && (
              <>
                <option value="line">Line</option>
                <option value="bar">Bar</option>
                <option value="pie">Pie</option>
                <option value="scatter">Scatter</option>
              </>
            )}
          </select>
        );
      
      case 'checkbox':
        return (
          <input
            type="checkbox"
            checked={propValue}
            onChange={(e) => handlePropChange(propName, e.target.checked)}
            className="rounded border-gray-300"
          />
        );
      
      case 'number':
        return (
          <input
            type="number"
            value={propValue}
            onChange={(e) => handlePropChange(propName, parseInt(e.target.value))}
            className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
          />
        );
      
      default:
        return (
          <input
            type="text"
            value={propValue}
            onChange={(e) => handlePropChange(propName, e.target.value)}
            className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
          />
        );
    }
  };

  return (
    <div className="property-editor">
      <div className="property-section">
        <h5 className="property-section-title">Component: {type}</h5>
        
        {Object.entries(props).map(([propName, propValue]) => {
          let propType = 'text';
          
          // Determine field type based on property name and value
          if (propName === 'disabled' || propName === 'required' || propName === 'checked' || propName === 'showValue') {
            propType = 'checkbox';
          } else if (propName === 'variant' || propName === 'chartType') {
            propType = 'select';
          } else if (propName === 'value' || propName === 'max' || propName === 'pageSize') {
            propType = 'number';
          }

          return (
            <div key={propName} className="property-field">
              <label className="property-label">
                {propName.charAt(0).toUpperCase() + propName.slice(1)}
              </label>
              {renderPropertyField(propName, propValue, propType)}
            </div>
          );
        })}
      </div>

      <div className="property-section">
        <h5 className="property-section-title">Events</h5>
        <div className="property-field">
          <label className="property-label">On Click Handler</label>
          <input
            type="text"
            placeholder="handleClick"
            className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
          />
        </div>
        <div className="property-field">
          <label className="property-label">On Change Handler</label>
          <input
            type="text"
            placeholder="handleChange"
            className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
          />
        </div>
      </div>

      <div className="property-section">
        <h5 className="property-section-title">Data Binding</h5>
        <div className="property-field">
          <label className="property-label">Data Source</label>
          <input
            type="text"
            placeholder="dataVariable"
            className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
          />
        </div>
        <div className="property-field">
          <label className="property-label">Update Trigger</label>
          <select className="w-full px-3 py-1 border border-gray-300 rounded text-sm">
            <option value="manual">Manual</option>
            <option value="realtime">Real-time</option>
            <option value="interval">Interval</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default PluginGUIBuilder;