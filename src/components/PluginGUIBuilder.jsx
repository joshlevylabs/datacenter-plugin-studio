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
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  RectangleStackIcon,
  SunIcon,
  MoonIcon,
  RectangleGroupIcon,
  ViewfinderCircleIcon,
  AdjustmentsHorizontalIcon,
  MagnifyingGlassIcon,
  Square3Stack3DIcon as SnapIcon,
  ChatBubbleLeftRightIcon,
  PlusCircleIcon,
  XMarkIcon,
  PencilIcon,
  CodeBracketIcon as CodeIcon,
  RectangleStackIcon as CanvasIcon
} from '@heroicons/react/24/outline';
import { AUTOMATION_COMPONENT_LIBRARY, AUTOMATION_CATEGORIES, renderAutomationComponent } from './AutomationComponentLibrary.jsx';
import { DATA_VISUALIZER_TEMPLATE, DATA_VISUALIZER_COMPONENTS, BASIC_APP_TEMPLATE, BASIC_APP_COMPONENTS } from './DataVisualizerTemplate.jsx';
import GUICodeGenerator from '../lib/guiCodeGenerator.ts';
import { SimpleGuiGenerator, convertToSimpleConfig } from '../lib/simpleGuiGenerator.ts';
import { GUIValidator } from '../lib/guiValidation.ts';
import AppGenie from './AppGenie.jsx';

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
  // Note: guiComponents will be derived from active tab
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [draggedComponent, setDraggedComponent] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [canvasTheme, setCanvasTheme] = useState('light');
  const [guiSettings, setGuiSettings] = useState(pluginDoc?.gui?.settings || {
    layout: 'tabs',
    theme: 'default',
    responsive: true
  });
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  // Always use simple generator for safe transpilation
  const useSimpleGenerator = true;

  const [validationResult, setValidationResult] = useState(null);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 800, height: 600 });
  const [sidebarTab, setSidebarTab] = useState('components'); // 'components' or 'properties'
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize, setGridSize] = useState(20);
  const [showSnapGuides, setShowSnapGuides] = useState(true);
  
  // Dropdown states
  const [showSizeDropdown, setShowSizeDropdown] = useState(false);
  const [showSnapDropdown, setShowSnapDropdown] = useState(false);
  const [isAppGenieMinimized, setIsAppGenieMinimized] = useState(false);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [clipboardComponent, setClipboardComponent] = useState(null);
  const [showElementsPanel, setShowElementsPanel] = useState(false);
  
  // Tab system state
  const [tabs, setTabs] = useState([
    { id: 'tab-1', name: 'Main', components: pluginDoc?.gui?.components || [] }
  ]);
  const [activeTabId, setActiveTabId] = useState('tab-1');
  
  // Code/GUI view toggle
  const [viewMode, setViewMode] = useState('gui'); // 'gui' or 'code'
  const [rawCode, setRawCode] = useState('');

  // Handle adding components from App Genie (add to existing, don't replace)
  const handleComponentsGenerated = (newComponents) => {
    const currentComponents = getCurrentTabComponents();
    updateCurrentTabComponents([...currentComponents, ...newComponents]);
  };

  // Tab management functions
  const addNewTab = () => {
    const newTabId = `tab-${Date.now()}`;
    const newTab = {
      id: newTabId,
      name: `Tab ${tabs.length + 1}`,
      components: []
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTabId);
  };

  const deleteTab = (tabId) => {
    if (tabs.length <= 1) return; // Don't delete last tab
    setTabs(prev => prev.filter(tab => tab.id !== tabId));
    if (activeTabId === tabId) {
      setActiveTabId(tabs[0].id);
    }
  };

  const renameTab = (tabId, newName) => {
    setTabs(prev => prev.map(tab => 
      tab.id === tabId ? { ...tab, name: newName } : tab
    ));
  };

  const getCurrentTabComponents = () => {
    const currentTab = tabs.find(tab => tab.id === activeTabId);
    return currentTab ? currentTab.components : [];
  };

  const updateCurrentTabComponents = (newComponents) => {
    setTabs(prev => prev.map(tab => 
      tab.id === activeTabId ? { ...tab, components: newComponents } : tab
    ));
  };

  // Derived state: get components for current active tab
  const guiComponents = getCurrentTabComponents();

  // Code/GUI view management
  const switchToCodeView = () => {
    // Generate code from current tab components
    const currentComponents = getCurrentTabComponents();
    const config = convertToSimpleConfig({ components: currentComponents, settings: guiSettings });
    const generatedCode = SimpleGuiGenerator.generateSimpleComponent(config, 'PluginGUI');
    setRawCode(generatedCode);
    setViewMode('code');
  };

  const switchToGUIView = () => {
    // Parse code back to components (basic implementation)
    setViewMode('gui');
  };

  const updateRawCode = (newCode) => {
    setRawCode(newCode);
    // TODO: Parse code back to components when switching back to GUI view
  };

  // Handle keyboard shortcuts and dropdown closing
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.relative')) {
        setShowSizeDropdown(false);
        setShowSnapDropdown(false);
      }
    };

    const handleKeyDown = (e) => {
      // Only handle shortcuts when not typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      if (selectedComponent) {
        // Copy/Paste controls
        if (e.ctrlKey) {
          switch (e.key) {
            case 'c':
              e.preventDefault();
              copyComponent(selectedComponent);
              break;
            case 'v':
              e.preventDefault();
              pasteComponent();
              break;
            case ']':
              e.preventDefault();
              moveForward(selectedComponent);
              break;
            case '[':
              e.preventDefault();
              moveBackward(selectedComponent);
              break;
          }
        }
        
        if (e.ctrlKey && e.shiftKey) {
          switch (e.key) {
            case '}':
            case ']':
              e.preventDefault();
              moveToFront(selectedComponent);
              break;
            case '{':
            case '[':
              e.preventDefault();
              moveToBack(selectedComponent);
              break;
          }
        }

        // Delete
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          deleteComponent(selectedComponent);
        }
      }
      
      // Allow paste even without selection
      if (e.ctrlKey && e.key === 'v' && !selectedComponent) {
        e.preventDefault();
        pasteComponent();
      }
    };

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedComponent, guiComponents]);
  
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [dragOverCanvas, setDragOverCanvas] = useState(false);

  // Snap to grid helper function
  const snapValueToGrid = (value) => {
    if (!snapToGrid) return value;
    return Math.round(value / gridSize) * gridSize;
  };

  // Calculate alignment guides
  const getAlignmentGuides = (component, allComponents) => {
    if (!showSnapGuides) return [];
    
    const guides = [];
    const componentCenterX = component.x + component.width / 2;
    const componentCenterY = component.y + component.height / 2;
    
    allComponents.forEach(other => {
      if (other.id === component.id) return;
      
      const otherCenterX = other.x + other.width / 2;
      const otherCenterY = other.y + other.height / 2;
      
      // Horizontal alignment
      if (Math.abs(componentCenterY - otherCenterY) < 5) {
        guides.push({
          type: 'horizontal',
          position: otherCenterY,
          start: Math.min(component.x, other.x),
          end: Math.max(component.x + component.width, other.x + other.width)
        });
      }
      
      // Vertical alignment
      if (Math.abs(componentCenterX - otherCenterX) < 5) {
        guides.push({
          type: 'vertical',
          position: otherCenterX,
          start: Math.min(component.y, other.y),
          end: Math.max(component.y + component.height, other.y + other.height)
        });
      }
    });
    
    return guides;
  };

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
      size: { width: 200, height: 50 },
      zIndex: guiComponents.length
    };

    console.log('Creating new component:', newComponent);
    updateCurrentTabComponents([...getCurrentTabComponents(), newComponent]);
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
    updateCurrentTabComponents(getCurrentTabComponents().filter(comp => comp.id !== componentId));
    if (selectedComponent === componentId) {
      setSelectedComponent(null);
    }
  };

  // Layer management functions
  const moveToFront = (componentId) => {
    const maxZ = Math.max(...guiComponents.map(c => c.zIndex || 0));
    updateCurrentTabComponents(getCurrentTabComponents().map(comp => 
      comp.id === componentId 
        ? { ...comp, zIndex: maxZ + 1 }
        : comp
    ));
  };

  const moveToBack = (componentId) => {
    const minZ = Math.min(...guiComponents.map(c => c.zIndex || 0));
    updateCurrentTabComponents(getCurrentTabComponents().map(comp => 
      comp.id === componentId 
        ? { ...comp, zIndex: Math.max(0, minZ - 1) }
        : comp
    ));
  };

  const moveForward = (componentId) => {
    const component = guiComponents.find(c => c.id === componentId);
    if (!component) return;
    
    const currentZ = component.zIndex || 0;
    const nextZ = Math.min(...guiComponents.filter(c => (c.zIndex || 0) > currentZ).map(c => c.zIndex || 0));
    
    if (nextZ !== Infinity) {
      updateCurrentTabComponents(getCurrentTabComponents().map(comp => {
        if (comp.id === componentId) {
          return { ...comp, zIndex: nextZ + 0.1 };
        } else if (comp.zIndex === nextZ) {
          return { ...comp, zIndex: currentZ };
        }
        return comp;
      }));
    }
  };

  const moveBackward = (componentId) => {
    const component = guiComponents.find(c => c.id === componentId);
    if (!component) return;
    
    const currentZ = component.zIndex || 0;
    const prevZ = Math.max(...guiComponents.filter(c => (c.zIndex || 0) < currentZ).map(c => c.zIndex || 0));
    
    if (prevZ !== -Infinity && prevZ >= 0) {
      updateCurrentTabComponents(getCurrentTabComponents().map(comp => {
        if (comp.id === componentId) {
          return { ...comp, zIndex: prevZ - 0.1 };
        } else if (comp.zIndex === prevZ) {
          return { ...comp, zIndex: currentZ };
        }
        return comp;
      }));
    }
  };

  // Copy/Paste functions
  const copyComponent = (componentId) => {
    const component = guiComponents.find(c => c.id === componentId);
    if (component) {
      setClipboardComponent({ ...component });
      console.log('Component copied to clipboard:', component.type);
    }
  };

  const pasteComponent = () => {
    if (!clipboardComponent) return;
    
    const maxZ = Math.max(...guiComponents.map(c => c.zIndex || 0));
    const newComponent = {
      ...clipboardComponent,
      id: generateId(),
      position: { 
        x: clipboardComponent.position.x + 20, 
        y: clipboardComponent.position.y + 20 
      },
      zIndex: maxZ + 1
    };
    
    updateCurrentTabComponents([...getCurrentTabComponents(), newComponent]);
    setSelectedComponent(newComponent.id);
    console.log('Component pasted:', newComponent.type);
  };

  // Add element to canvas from elements panel
  const addElementToCanvas = (type, text) => {
    const maxZ = Math.max(...guiComponents.map(c => c.zIndex || 0));
    const newComponent = {
      id: generateId(),
      type: type,
      text: text,
      props: getDefaultPropsForType(type),
      position: { x: 200, y: 200 },
      size: getSizeForType(type),
      zIndex: maxZ + 1
    };
    
    updateCurrentTabComponents([...getCurrentTabComponents(), newComponent]);
    setSelectedComponent(newComponent.id);
    setSidebarTab('properties'); // Auto-open properties for new element
    setShowElementsPanel(false); // Close elements panel
    console.log('Element added to canvas:', type);
  };

  // Get default props for element type
  const getDefaultPropsForType = (type) => {
    const defaults = {
      button: { className: '', style: {}, onClick: '' },
      input: { className: '', style: {}, placeholder: 'Enter text...', type: 'text' },
      text: { className: '', style: {}, content: 'Text content' },
      title: { className: '', style: {}, level: 'h2' },
      container: { className: '', style: {} },
      separator: { className: '', style: {}, orientation: 'horizontal' },
      select: { className: '', style: {}, options: ['Option 1', 'Option 2', 'Option 3'] },
      checkbox: { className: '', style: {}, checked: false, label: 'Checkbox' },
      tabs: { className: '', style: {}, tabs: ['Tab 1', 'Tab 2'] }
    };
    return defaults[type] || {};
  };

  // Get default size for element type
  const getSizeForType = (type) => {
    const sizes = {
      button: { width: 120, height: 40 },
      input: { width: 200, height: 40 },
      text: { width: 150, height: 30 },
      title: { width: 200, height: 40 },
      container: { width: 300, height: 200 },
      separator: { width: 200, height: 2 },
      select: { width: 180, height: 40 },
      checkbox: { width: 100, height: 30 },
      tabs: { width: 300, height: 200 }
    };
    return sizes[type] || { width: 100, height: 40 };
  };

  // Update component properties
  const updateComponentProps = (componentId, newProps) => {
    updateCurrentTabComponents(getCurrentTabComponents().map(comp => 
      comp.id === componentId ? { ...comp, props: { ...comp.props, ...newProps } } : comp
    ));
  };

  // Move component
  const moveComponent = (componentId, newPosition) => {
    updateCurrentTabComponents(getCurrentTabComponents().map(comp => 
      comp.id === componentId ? { ...comp, position: newPosition } : comp
    ));
  };

  // Resize component
  const resizeComponent = (componentId, newSize) => {
    updateCurrentTabComponents(getCurrentTabComponents().map(comp => 
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

  // Save with confirmation modal
  const handleSaveWithConfirmation = async () => {
    await saveGUI();
    setShowSaveConfirmation(true);
    // Auto-hide after 2 seconds
    setTimeout(() => setShowSaveConfirmation(false), 2000);
  };

  // Generate code from GUI design
  const generateCode = () => {
    const config = {
      components: guiComponents,
      settings: guiSettings
    };
    
    let code;
    
    if (useSimpleGenerator) {
      // Use simple generator for transpilation-friendly code
      const simpleConfig = convertToSimpleConfig(config);
      code = SimpleGuiGenerator.generateSimpleComponent(simpleConfig, 'PluginGUI');
    } else {
      // Use complex generator (original approach)
      const options = {
        includeImports: true,
        includeEventHandlers: true,
        includeDataBinding: true,
        includeStyles: true,
        targetFramework: 'react',
        typescript: true
      };
      code = GUICodeGenerator.generateReactComponent(config, 'PluginGUI', options);
    }
    
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
    updateCurrentTabComponents(template.components);
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
    updateCurrentTabComponents(template.components);
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
      updateCurrentTabComponents([]);
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
    const { id, type, props, position, size, zIndex = 0 } = component;
    const isSelected = selectedComponent === id;

    const handleComponentClick = (e) => {
      e.stopPropagation();
      if (!previewMode) {
        setSelectedComponent(id);
        // Explicitly set sidebar to 'components' to prevent properties panel from showing
        setSidebarTab('components');
      }
    };

    const handleComponentRightClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!previewMode) {
        setSelectedComponent(id);
        setSidebarTab('properties'); // Switch to properties tab on right-click
      }
    };

    const handleComponentMouseDown = (e) => {
      if (previewMode) return;
      
      e.stopPropagation();
      setSelectedComponent(id);
      // Don't auto-switch to properties on mouse down
      
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
          onContextMenu={handleComponentRightClick}
          onMouseDown={handleComponentMouseDown}
          style={{
            position: 'absolute',
            left: position.x,
            top: position.y,
            width: size.width,
            height: size.height,
            cursor: previewMode ? 'default' : 'move',
            zIndex: zIndex
          }}
        >
          {renderAutomationComponent(component, isSelected, previewMode, deleteComponent)}
        </div>
      );
    }

    // Build theme-aware component styles
    const getThemeAwareStyle = () => {
      const baseStyle = {
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        border: isSelected ? '2px solid #3b82f6' : `1px solid ${props.lightBorderColor || props.borderColor || '#d1d5db'}`,
        borderRadius: '4px',
        padding: '8px',
        cursor: previewMode ? 'default' : 'move',
        boxShadow: isSelected ? '0 0 0 3px rgba(59, 130, 246, 0.1)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s ease',
        zIndex: zIndex
      };

      // Apply theme-aware colors based on canvas theme
      if (canvasTheme === 'dark') {
        baseStyle.backgroundColor = props.darkBackgroundColor || props.backgroundColor || '#374151';
        baseStyle.color = props.darkTextColor || props.textColor || '#f9fafb';
        baseStyle.borderColor = isSelected ? '#3b82f6' : (props.darkBorderColor || props.borderColor || '#4b5563');
      } else {
        baseStyle.backgroundColor = props.lightBackgroundColor || props.backgroundColor || '#ffffff';
        baseStyle.color = props.lightTextColor || props.textColor || '#111827';
        baseStyle.borderColor = isSelected ? '#3b82f6' : (props.lightBorderColor || props.borderColor || '#d1d5db');
      }

      return baseStyle;
    };

    const componentStyle = getThemeAwareStyle();

    switch (type) {
      case 'button':
        return (
          <div
            key={id}
            style={componentStyle}
            onClick={handleComponentClick}
            onContextMenu={handleComponentRightClick}
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
            onContextMenu={handleComponentRightClick}
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
            onContextMenu={handleComponentRightClick}
            onMouseDown={handleComponentMouseDown}
            className="gui-component"
          >
            <div className="w-full">
              {props.label && <label className="block text-sm font-medium mb-1">{props.label}</label>}
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                {(props.options || ['Option 1', 'Option 2', 'Option 3']).map((option, index) => (
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
            onContextMenu={handleComponentRightClick}
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
            onContextMenu={handleComponentRightClick}
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
            onContextMenu={handleComponentRightClick}
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
            onContextMenu={handleComponentRightClick}
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
            onContextMenu={handleComponentRightClick}
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

      case 'title':
        return (
          <div
            key={id}
            style={componentStyle}
            onClick={handleComponentClick}
            onContextMenu={handleComponentRightClick}
            onMouseDown={handleComponentMouseDown}
            className="gui-component"
          >
            <h2 className="text-xl font-bold text-gray-800">
              {props.text}
            </h2>
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

      case 'text':
        return (
          <div
            key={id}
            style={componentStyle}
            onClick={handleComponentClick}
            onContextMenu={handleComponentRightClick}
            onMouseDown={handleComponentMouseDown}
            className="gui-component"
          >
            <p className="text-sm text-gray-600">
              {props.text}
            </p>
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

      case 'container':
        return (
          <div
            key={id}
            style={{...componentStyle, minHeight: '60px'}}
            onClick={handleComponentClick}
            onContextMenu={handleComponentRightClick}
            onMouseDown={handleComponentMouseDown}
            className="gui-component border-2 border-dashed border-gray-300"
          >
            <div className="p-4 text-sm text-gray-500 text-center">
              {props.text || 'Container Area'}
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
            onContextMenu={handleComponentRightClick}
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
           <div className="flex items-center space-x-4">
             <h3 className="text-lg font-semibold">🎨 App Studio</h3>
             
             {/* View Mode Toggle */}
             <div className="flex items-center bg-gray-100 rounded-lg p-1">
               <button
                 onClick={() => setViewMode('gui')}
                 className={`flex items-center space-x-1 px-3 py-1 rounded text-sm transition-colors ${
                   viewMode === 'gui' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                 }`}
               >
                 <CanvasIcon className="w-4 h-4" />
                 <span>GUI</span>
               </button>
               <button
                 onClick={switchToCodeView}
                 className={`flex items-center space-x-1 px-3 py-1 rounded text-sm transition-colors ${
                   viewMode === 'code' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                 }`}
               >
                 <CodeIcon className="w-4 h-4" />
                 <span>Code</span>
               </button>
             </div>
           </div>
          
          <div className="flex space-x-2">
            <button
              onClick={generateCode}
              className="px-3 py-1 bg-purple-600 text-white rounded text-sm"
            >
              <CodeBracketIcon className="w-4 h-4 inline mr-1" />
              Export Code
            </button>
            <button
              onClick={handleSaveWithConfirmation}
              className="px-3 py-1 bg-green-600 text-white rounded text-sm"
            >
              💾 Save
            </button>
          </div>
        </div>

      </div>

      {/* Tab System */}
      <div className="tab-system border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center space-x-1">
            {tabs.map((tab) => (
              <div key={tab.id} className="relative group">
                <button
                  onClick={() => setActiveTabId(tab.id)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-t-lg text-sm transition-colors ${
                    activeTabId === tab.id
                      ? 'bg-white text-gray-900 border-l border-r border-t border-gray-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <span>{tab.name}</span>
                  <span className="text-xs text-gray-400">({tab.components.length})</span>
                  {tabs.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTab(tab.id);
                      }}
                      className="ml-1 p-1 hover:bg-gray-200 rounded"
                    >
                      <XMarkIcon className="w-3 h-3" />
                    </button>
                  )}
                </button>
              </div>
            ))}
            <button
              onClick={addNewTab}
              className="flex items-center space-x-1 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded text-sm"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Add Tab</span>
            </button>
          </div>
          
          {/* Tab Actions */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">
              Active: {tabs.find(t => t.id === activeTabId)?.name}
            </span>
          </div>
        </div>
      </div>

      {/* Split Layout: Properties (left) + Canvas (center) + App Genie (right) */}
      <div className="gui-builder-split-layout">
        {/* Left Side: Properties Panel or Elements Panel */}
        {((selectedComponent && sidebarTab === 'properties') || showElementsPanel) && (
          <div className="properties-panel">
            {showElementsPanel ? (
              <>
                <div className="properties-header">
                  <h3 className="text-lg font-semibold">🧩 Add Elements</h3>
                  <button
                    onClick={() => setShowElementsPanel(false)}
                    className="text-gray-400 hover:text-gray-600"
                    title="Close Elements Panel"
                  >
                    ×
                  </button>
                </div>
                <div className="elements-panel-content">
                  <div className="space-y-4 p-4">
                    
                    {/* Basic Elements */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">📝 Basic Elements</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => addElementToCanvas('button', 'Button')}
                          className="flex items-center space-x-2 p-2 border border-gray-300 rounded hover:bg-gray-50 text-sm"
                        >
                          <Squares2X2Icon className="w-4 h-4" />
                          <span>Button</span>
                        </button>
                        <button 
                          onClick={() => addElementToCanvas('input', 'Input Field')}
                          className="flex items-center space-x-2 p-2 border border-gray-300 rounded hover:bg-gray-50 text-sm"
                        >
                          <DocumentTextIcon className="w-4 h-4" />
                          <span>Input</span>
                        </button>
                        <button 
                          onClick={() => addElementToCanvas('text', 'Text')}
                          className="flex items-center space-x-2 p-2 border border-gray-300 rounded hover:bg-gray-50 text-sm"
                        >
                          <DocumentTextIcon className="w-4 h-4" />
                          <span>Text</span>
                        </button>
                        <button 
                          onClick={() => addElementToCanvas('title', 'Title')}
                          className="flex items-center space-x-2 p-2 border border-gray-300 rounded hover:bg-gray-50 text-sm"
                        >
                          <DocumentTextIcon className="w-4 h-4" />
                          <span>Title</span>
                        </button>
                      </div>
                    </div>

                    {/* Layout Elements */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">📐 Layout</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => addElementToCanvas('container', 'Container')}
                          className="flex items-center space-x-2 p-2 border border-gray-300 rounded hover:bg-gray-50 text-sm"
                        >
                          <RectangleStackIcon className="w-4 h-4" />
                          <span>Container</span>
                        </button>
                        <button 
                          onClick={() => addElementToCanvas('separator', 'Separator')}
                          className="flex items-center space-x-2 p-2 border border-gray-300 rounded hover:bg-gray-50 text-sm"
                        >
                          <ArrowsRightLeftIcon className="w-4 h-4" />
                          <span>Separator</span>
                        </button>
                      </div>
                    </div>

                    {/* Form Elements */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">📋 Form Elements</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => addElementToCanvas('select', 'Dropdown')}
                          className="flex items-center space-x-2 p-2 border border-gray-300 rounded hover:bg-gray-50 text-sm"
                        >
                          <ChevronDownIcon className="w-4 h-4" />
                          <span>Dropdown</span>
                        </button>
                        <button 
                          onClick={() => addElementToCanvas('checkbox', 'Checkbox')}
                          className="flex items-center space-x-2 p-2 border border-gray-300 rounded hover:bg-gray-50 text-sm"
                        >
                          <CheckCircleIcon className="w-4 h-4" />
                          <span>Checkbox</span>
                        </button>
                      </div>
                    </div>

                    {/* Navigation */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">🧭 Navigation</h4>
                      <div className="grid grid-cols-1 gap-2">
                        <button 
                          onClick={() => addElementToCanvas('tabs', 'Tab Container')}
                          className="flex items-center space-x-2 p-2 border border-gray-300 rounded hover:bg-gray-50 text-sm"
                        >
                          <TableCellsIcon className="w-4 h-4" />
                          <span>Tabs</span>
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="properties-header">
                  <h3 className="text-lg font-semibold">🔧 Properties</h3>
                  <button
                    onClick={() => setSelectedComponent(null)}
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
            )}
          </div>
        )}

        {/* Center: Interactive Canvas or Code Editor */}
        <div className={`canvas-section ${isAppGenieMinimized ? 'expanded' : ''}`}>
          
          {viewMode === 'gui' ? (
            /* GUI View: Canvas */
            <>
          <div>
          {/* Icon-Only Toolbar */}
          <div className="icon-toolbar bg-gray-50 border-b border-gray-300 px-4 py-2">
            <div className="flex items-center justify-center space-x-2">
              
              {/* Add Elements */}
              <button
                onClick={() => setShowElementsPanel(!showElementsPanel)}
                className={`p-2 rounded transition-colors ${
                  showElementsPanel ? 'bg-green-100 hover:bg-green-200' : 'hover:bg-gray-200'
                }`}
                title="Add Elements"
              >
                <PlusCircleIcon className={`w-5 h-5 ${showElementsPanel ? 'text-green-600' : 'text-gray-700'}`} />
              </button>

              <div className="w-px h-6 bg-gray-300"></div>

              {/* Size Tool with Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowSizeDropdown(!showSizeDropdown)}
                  className={`p-2 rounded hover:bg-gray-200 transition-colors ${showSizeDropdown ? 'bg-blue-100' : ''}`}
                  title="Canvas Size"
                >
                  <AdjustmentsHorizontalIcon className="w-5 h-5 text-gray-700" />
                </button>
                {showSizeDropdown && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg p-3 z-50 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <label className="text-xs font-medium text-gray-600">Size:</label>
                      <input
                        type="number"
                        value={canvasDimensions.width}
                        onChange={(e) => setCanvasDimensions(prev => ({ ...prev, width: parseInt(e.target.value) || 800 }))}
                        className="w-16 px-2 py-1 text-xs border border-gray-300 rounded"
                        min="400"
                        max="2000"
                        step="50"
                      />
                      <span className="text-gray-400">×</span>
                      <input
                        type="number"
                        value={canvasDimensions.height}
                        onChange={(e) => setCanvasDimensions(prev => ({ ...prev, height: parseInt(e.target.value) || 600 }))}
                        className="w-16 px-2 py-1 text-xs border border-gray-300 rounded"
                        min="300"
                        max="1500"
                        step="50"
                      />
                      <span className="text-xs text-gray-500">px</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="w-px h-6 bg-gray-300"></div>

              {/* Zoom Out */}
              <button
                onClick={zoomOut}
                className="p-2 rounded hover:bg-gray-200 transition-colors"
                title="Zoom Out"
              >
                <MagnifyingGlassMinusIcon className="w-5 h-5 text-gray-700" />
              </button>

              {/* Zoom In */}
              <button
                onClick={zoomIn}
                className="p-2 rounded hover:bg-gray-200 transition-colors"
                title="Zoom In"
              >
                <MagnifyingGlassPlusIcon className="w-5 h-5 text-gray-700" />
              </button>

              {/* Zoom Fit */}
              <button
                onClick={resetZoom}
                className="p-2 rounded hover:bg-gray-200 transition-colors"
                title="Fit to Window"
              >
                <MagnifyingGlassIcon className="w-5 h-5 text-gray-700" />
              </button>

              <div className="w-px h-6 bg-gray-300"></div>

              {/* Theme Mode Toggle */}
              <button
                onClick={() => setCanvasTheme(canvasTheme === 'light' ? 'dark' : 'light')}
                className={`p-2 rounded transition-colors ${
                  canvasTheme === 'dark' ? 'bg-blue-100 hover:bg-blue-200' : 'hover:bg-gray-200'
                }`}
                title={`Switch to ${canvasTheme === 'light' ? 'Dark' : 'Light'} Theme`}
              >
                {canvasTheme === 'light' ? 
                  <MoonIcon className="w-5 h-5 text-gray-700" /> : 
                  <SunIcon className="w-5 h-5 text-blue-600" />
                }
              </button>

              <div className="w-px h-6 bg-gray-300"></div>

              {/* AI Chat Toggle */}
              <button
                onClick={() => setIsAiChatOpen(!isAiChatOpen)}
                className={`p-2 rounded transition-colors ${
                  isAiChatOpen ? 'bg-purple-100 hover:bg-purple-200' : 'hover:bg-gray-200'
                }`}
                title="AI Chat Assistant"
              >
                <ChatBubbleLeftRightIcon className={`w-5 h-5 ${isAiChatOpen ? 'text-purple-600' : 'text-gray-700'}`} />
              </button>

              <div className="w-px h-6 bg-gray-300"></div>

              {/* Snaps Tool with Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowSnapDropdown(!showSnapDropdown)}
                  className={`p-2 rounded hover:bg-gray-200 transition-colors ${showSnapDropdown ? 'bg-blue-100' : ''}`}
                  title="Snap Settings"
                >
                  <SnapIcon className="w-5 h-5 text-gray-700" />
                </button>
                {showSnapDropdown && (
                  <div className="absolute top-full right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg p-3 z-50 whitespace-nowrap">
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={snapToGrid}
                          onChange={(e) => setSnapToGrid(e.target.checked)}
                          className="rounded"
                        />
                        <span className="text-sm">Snap to Grid</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showSnapGuides}
                          onChange={(e) => setShowSnapGuides(e.target.checked)}
                          className="rounded"
                        />
                        <span className="text-sm">Show Guides</span>
                      </label>
                      <div className="pt-2 border-t border-gray-200">
                        <label className="block text-xs text-gray-600 mb-1">Grid Size:</label>
                        <select
                          value={gridSize}
                          onChange={(e) => setGridSize(parseInt(e.target.value))}
                          className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                        >
                          <option value={10}>10px</option>
                          <option value={20}>20px</option>
                          <option value={25}>25px</option>
                          <option value={50}>50px</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Interactive Canvas */}
          <div className={`canvas-container flex-1 overflow-auto ${canvasTheme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <div
              ref={canvasRef}
              className={`gui-canvas ${dragOverCanvas ? 'drag-over' : ''} ${previewMode ? 'preview-mode' : ''} theme-${canvasTheme}`}
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
                borderRadius: previewMode ? '8px' : '4px',
                margin: '20px'
              }}
            >
              {guiComponents.length === 0 && (
                <div className="empty-canvas">
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <div className="text-6xl mb-4">🧞‍♂️</div>
                    <p className="text-lg font-medium mb-2">Ready to create magic!</p>
                    <p className="text-sm text-center max-w-md">
                      Tell the App Genie what kind of application you want to build using the chat on the right →
                    </p>
                  </div>
                </div>
              )}
              
              {previewMode && guiComponents.length > 0 && (
                <div className="absolute top-2 right-2 bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                  Preview Mode
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

        {/* AI Chat Container - Separate from App Genie */}
        {isAiChatOpen && (
          <div className="ai-chat-container">
            <div className="ai-chat-header">
              <h3 className="text-lg font-semibold text-purple-700">🤖 AI Assistant</h3>
              <button
                onClick={() => setIsAiChatOpen(false)}
                className="text-gray-400 hover:text-gray-600"
                title="Close AI Chat"
              >
                ×
              </button>
            </div>
            <div className="ai-chat-content">
              <AppGenie 
                pluginDoc={pluginDoc}
                onUpdateApp={onUpdateGUI}
                onPreviewApp={() => setPreviewMode(true)}
                onComponentsGenerated={handleComponentsGenerated}
                currentComponents={guiComponents}
                onMinimizeChange={setIsAppGenieMinimized}
                chatOnly={true}
              />
            </div>
          </div>
        )}
            </>
          ) : (
            /* Code View: Code Editor */
            <div className="code-editor-container flex-1 flex flex-col">
              <div className="code-editor-header bg-gray-800 text-white p-3 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CodeIcon className="w-5 h-5" />
                  <span className="font-medium">Raw Code Editor</span>
                  <span className="text-xs text-gray-400">({tabs.find(t => t.id === activeTabId)?.name})</span>
                </div>
                <button
                  onClick={switchToGUIView}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                >
                  Switch to GUI
                </button>
              </div>
              <div className="flex-1 relative">
                <textarea
                  value={rawCode}
                  onChange={(e) => updateRawCode(e.target.value)}
                  className="w-full h-full p-4 font-mono text-sm bg-gray-900 text-green-400 border-0 resize-none focus:outline-none"
                  placeholder="// Your plugin code will appear here when switching from GUI view..."
                  style={{ minHeight: '400px' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Side: App Genie Sidebar (simplified without chat) */}
        <div className={`app-genie-sidebar ${isAppGenieMinimized ? 'minimized' : ''}`}>
          <AppGenie 
            pluginDoc={pluginDoc}
            onUpdateApp={onUpdateGUI}
            onPreviewApp={() => setPreviewMode(true)}
            onComponentsGenerated={handleComponentsGenerated}
            currentComponents={guiComponents}
            onMinimizeChange={setIsAppGenieMinimized}
          />
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

      {/* Save Confirmation Modal */}
      {showSaveConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4 flex flex-col items-center">
            <div className="text-green-600 mb-4">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">App Saved Successfully!</h3>
            <p className="text-sm text-gray-600 text-center mb-4">
              Your GUI configuration has been saved. You can return to this tab anytime to continue editing.
            </p>
            <button
              onClick={() => setShowSaveConfirmation(false)}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Continue Editing
            </button>
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
      case 'checkbox':
        return (
          <input
            type="checkbox"
            checked={propValue || false}
            onChange={(e) => handlePropChange(propName, e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
        );
      case 'select':
        return (
          <select
            value={propValue || ''}
            onChange={(e) => handlePropChange(propName, e.target.value)}
            className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
          >
            <option value="">Choose...</option>
            {propName === 'variant' && (
              <>
                <option value="primary">Primary</option>
                <option value="secondary">Secondary</option>
                <option value="danger">Danger</option>
              </>
            )}
          </select>
        );
      case 'number':
        return (
          <input
            type="number"
            value={propValue || ''}
            onChange={(e) => handlePropChange(propName, parseInt(e.target.value) || 0)}
            className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
          />
        );
      case 'color':
        return (
          <div className="flex items-center space-x-2">
            <input
              type="color"
              value={propValue || '#3b82f6'}
              onChange={(e) => handlePropChange(propName, e.target.value)}
              className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
            />
            <input
              type="text"
              value={propValue || '#3b82f6'}
              onChange={(e) => handlePropChange(propName, e.target.value)}
              placeholder="#3b82f6"
              className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs font-mono"
            />
          </div>
        );
      default:
        return (
          <input
            type="text"
            value={propValue || ''}
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
          
          if (propName === 'disabled' || propName === 'required' || propName === 'checked') {
            propType = 'checkbox';
          } else if (propName === 'variant') {
            propType = 'select';
          } else if (propName === 'value' || propName === 'max') {
            propType = 'number';
          } else if (propName.includes('color') || propName.includes('Color') || propName === 'backgroundColor' || propName === 'textColor' || propName === 'borderColor' || propName.includes('lightBackgroundColor') || propName.includes('lightTextColor') || propName.includes('lightBorderColor') || propName.includes('darkBackgroundColor') || propName.includes('darkTextColor') || propName.includes('darkBorderColor')) {
            propType = 'color';
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

      {/* Color & Styling */}
      <div className="property-section">
        <h5 className="property-section-title">Colors & Theme</h5>
        
        {/* Light Theme Colors */}
        <div className="mb-4 p-3 bg-gray-50 rounded border">
          <h6 className="text-xs font-semibold text-gray-700 mb-2 flex items-center">
            ☀️ Light Theme Colors
          </h6>
          
          {/* Light Background Color */}
          <div className="property-field mb-2">
            <label className="property-label text-xs">Background</label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={props.lightBackgroundColor || (type === 'button' ? '#3b82f6' : '#ffffff')}
                onChange={(e) => handlePropChange('lightBackgroundColor', e.target.value)}
                className="w-6 h-6 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={props.lightBackgroundColor || ''}
                onChange={(e) => handlePropChange('lightBackgroundColor', e.target.value)}
                placeholder="Auto"
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs font-mono"
              />
            </div>
          </div>

          {/* Light Text Color */}
          <div className="property-field mb-2">
            <label className="property-label text-xs">Text</label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={props.lightTextColor || (type === 'button' ? '#ffffff' : '#111827')}
                onChange={(e) => handlePropChange('lightTextColor', e.target.value)}
                className="w-6 h-6 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={props.lightTextColor || ''}
                onChange={(e) => handlePropChange('lightTextColor', e.target.value)}
                placeholder="Auto"
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs font-mono"
              />
            </div>
          </div>

          {/* Light Border Color */}
          <div className="property-field">
            <label className="property-label text-xs">Border</label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={props.lightBorderColor || '#d1d5db'}
                onChange={(e) => handlePropChange('lightBorderColor', e.target.value)}
                className="w-6 h-6 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={props.lightBorderColor || ''}
                onChange={(e) => handlePropChange('lightBorderColor', e.target.value)}
                placeholder="Auto"
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs font-mono"
              />
            </div>
          </div>
        </div>

        {/* Dark Theme Colors */}
        <div className="mb-4 p-3 bg-gray-800 rounded border">
          <h6 className="text-xs font-semibold text-white mb-2 flex items-center">
            🌙 Dark Theme Colors
          </h6>
          
          {/* Dark Background Color */}
          <div className="property-field mb-2">
            <label className="property-label text-xs text-gray-300">Background</label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={props.darkBackgroundColor || (type === 'button' ? '#60a5fa' : '#374151')}
                onChange={(e) => handlePropChange('darkBackgroundColor', e.target.value)}
                className="w-6 h-6 border border-gray-500 rounded cursor-pointer"
              />
              <input
                type="text"
                value={props.darkBackgroundColor || ''}
                onChange={(e) => handlePropChange('darkBackgroundColor', e.target.value)}
                placeholder="Auto"
                className="flex-1 px-2 py-1 border border-gray-500 rounded text-xs font-mono bg-gray-700 text-white"
              />
            </div>
          </div>

          {/* Dark Text Color */}
          <div className="property-field mb-2">
            <label className="property-label text-xs text-gray-300">Text</label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={props.darkTextColor || (type === 'button' ? '#1f2937' : '#f9fafb')}
                onChange={(e) => handlePropChange('darkTextColor', e.target.value)}
                className="w-6 h-6 border border-gray-500 rounded cursor-pointer"
              />
              <input
                type="text"
                value={props.darkTextColor || ''}
                onChange={(e) => handlePropChange('darkTextColor', e.target.value)}
                placeholder="Auto"
                className="flex-1 px-2 py-1 border border-gray-500 rounded text-xs font-mono bg-gray-700 text-white"
              />
            </div>
          </div>

          {/* Dark Border Color */}
          <div className="property-field">
            <label className="property-label text-xs text-gray-300">Border</label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={props.darkBorderColor || '#4b5563'}
                onChange={(e) => handlePropChange('darkBorderColor', e.target.value)}
                className="w-6 h-6 border border-gray-500 rounded cursor-pointer"
              />
              <input
                type="text"
                value={props.darkBorderColor || ''}
                onChange={(e) => handlePropChange('darkBorderColor', e.target.value)}
                placeholder="Auto"
                className="flex-1 px-2 py-1 border border-gray-500 rounded text-xs font-mono bg-gray-700 text-white"
              />
            </div>
          </div>
        </div>

        {/* Theme Mode Override */}
        <div className="property-field">
          <label className="property-label">Theme Mode</label>
          <select
            value={props.themeMode || 'auto'}
            onChange={(e) => handlePropChange('themeMode', e.target.value)}
            className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
          >
            <option value="auto">Auto (Follow System)</option>
            <option value="light">Light Only</option>
            <option value="dark">Dark Only</option>
          </select>
        </div>
      </div>

      {/* Button Script Configuration */}
      {type === 'button' && (
        <div className="property-section">
          <h5 className="property-section-title">Button Actions</h5>
          <div className="property-field">
            <label className="property-label">Script Function</label>
            <textarea
              value={props.onClickScript || ''}
              onChange={(e) => handlePropChange('onClickScript', e.target.value)}
              placeholder="// Enter JavaScript code to execute when button is clicked&#10;// Example:&#10;// fetch('/api/start-analysis', { method: 'POST' })&#10;//   .then(response => console.log('Analysis started'));"
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm font-mono"
              rows="6"
            />
          </div>
          <div className="property-field">
            <label className="property-label">Import Dependencies</label>
            <input
              type="text"
              value={props.scriptDependencies || ''}
              onChange={(e) => handlePropChange('scriptDependencies', e.target.value)}
              placeholder="myScript.js, utils/helper.js"
              className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Comma-separated list of script files to include with the plugin
            </p>
          </div>
        </div>
      )}

      {/* File Input Configuration */}
      {type === 'input' && props.type !== 'text' && (
        <div className="property-section">
          <h5 className="property-section-title">File Input Settings</h5>
          <div className="property-field">
            <label className="property-label">Accepted File Types</label>
            <input
              type="text"
              value={props.accept || ''}
              onChange={(e) => handlePropChange('accept', e.target.value)}
              placeholder=".csv,.txt,.json"
              className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
            />
          </div>
          <div className="property-field">
            <label className="property-label">Processing Script</label>
            <textarea
              value={props.fileProcessingScript || ''}
              onChange={(e) => handlePropChange('fileProcessingScript', e.target.value)}
              placeholder="// Script to process uploaded file&#10;// file parameter contains the uploaded file&#10;// Return processed data"
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm font-mono"
              rows="4"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PluginGUIBuilder;
