import React, { useState, useRef, useEffect } from 'react';
import { 
  SparklesIcon, 
  PaperAirplaneIcon, 
  EyeIcon, 
  CodeBracketIcon,
  RocketLaunchIcon,
  LightBulbIcon,
  ComputerDesktopIcon,
  FolderIcon,
  ChartBarIcon,
  WrenchScrewdriverIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MinusIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { SimpleGuiGenerator, convertToSimpleConfig } from '../lib/simpleGuiGenerator.ts';

/**
 * App Genie - AI-powered application builder
 * Creates applications through natural language conversation
 */
const AppGenie = ({ pluginDoc, onUpdateApp, onPreviewApp, onComponentsGenerated, currentComponents, onMinimizeChange, chatOnly = false }) => {
  const [conversation, setConversation] = useState([
    {
      type: 'assistant',
      message: "👋 Hi! I'm your App Genie. I'll help you create powerful applications for controlling programs, analyzing data, and automating tasks. What kind of app would you like to build?",
      timestamp: new Date()
    }
  ]);
  
  const [userInput, setUserInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentApp, setCurrentApp] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);
  
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  // App templates for different use cases
  const appTemplates = [
    {
      id: 'data-analyzer',
      name: 'Data Analyzer Controller',
      description: 'Control and monitor data analysis programs',
      icon: ChartBarIcon,
      prompt: 'Create a data analyzer controller with file input, analysis controls, and results display'
    },
    {
      id: 'file-manager',
      name: 'File Manager',
      description: 'Organize and manage files and folders',
      icon: FolderIcon,
      prompt: 'Create a file manager with folder navigation, file operations, and search capabilities'
    },
    {
      id: 'device-monitor',
      name: 'Device Monitor',
      description: 'Monitor and control connected devices',
      icon: ComputerDesktopIcon,
      prompt: 'Create a device monitoring dashboard with status indicators and control buttons'
    },
    {
      id: 'custom-tool',
      name: 'Custom Tool',
      description: 'Build any custom application',
      icon: WrenchScrewdriverIcon,
      prompt: 'Help me create a custom application for my specific needs'
    }
  ];

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  // Handle template selection
  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    handleUserMessage(template.prompt);
  };

  // Handle user message
  const handleUserMessage = async (message = userInput) => {
    if (!message.trim()) return;

    // Add user message to conversation
    const newConversation = [...conversation, {
      type: 'user',
      message: message.trim(),
      timestamp: new Date()
    }];
    setConversation(newConversation);
    setUserInput('');
    setIsGenerating(true);

    // Simulate AI processing (in real implementation, this would call an AI service)
    setTimeout(() => {
      const aiResponse = generateAIResponse(message, newConversation);
      setConversation(prev => [...prev, {
        type: 'assistant',
        message: aiResponse.message,
        timestamp: new Date(),
        app: aiResponse.app
      }]);
      
      if (aiResponse.app) {
        setCurrentApp(aiResponse.app);
      }
      
      setIsGenerating(false);
    }, 1500);
  };

  // Helper function to extract text content from user message
  const extractElementText = (message, elementType) => {
    // Look for quoted text or text after element type
    const patterns = [
      new RegExp(`${elementType}[\\s"']*[:\\s]*["']([^"']+)["']`, 'i'),
      new RegExp(`["']([^"']+)["'][\\s]*${elementType}`, 'i'),
      new RegExp(`${elementType}[\\s]+(?:that says?|with text|labeled)\\s+["']?([^"'\\n]+)["']?`, 'i'),
      new RegExp(`add\\s+[\\w\\s]*${elementType}[\\s]+["']?([^"'\\n]+)["']?`, 'i')
    ];
    
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1] && match[1].trim()) {
        return match[1].trim();
      }
    }
    
    return null;
  };

  // Generate AI response and app (simplified for demo)
  const generateAIResponse = (userMessage, conversation) => {
    const lowerMessage = userMessage.toLowerCase();
    
    // Detect simple element requests first
    if (lowerMessage.includes('add') && (lowerMessage.includes('button') || lowerMessage.includes('btn'))) {
      const buttonText = extractElementText(userMessage, 'button') || 'New Button';
      addDirectElement('button', buttonText);
      return {
        message: `✅ Added a button "${buttonText}" to your canvas! You can move it around and customize its properties by selecting it.`,
        app: null
      };
    } else if (lowerMessage.includes('add') && (lowerMessage.includes('input') || lowerMessage.includes('field') || lowerMessage.includes('textbox'))) {
      const placeholder = extractElementText(userMessage, 'input') || 'Enter text...';
      addDirectElement('input', placeholder);
      return {
        message: `✅ Added an input field "${placeholder}" to your canvas! Select it to customize placeholder text and styling.`,
        app: null
      };
    } else if (lowerMessage.includes('add') && (lowerMessage.includes('title') || lowerMessage.includes('heading') || lowerMessage.includes('header'))) {
      const titleText = extractElementText(userMessage, 'title') || 'Title';
      addDirectElement('title', titleText);
      return {
        message: `✅ Added a title "${titleText}" to your canvas! You can edit the text and adjust the styling.`,
        app: null
      };
    } else if (lowerMessage.includes('add') && (lowerMessage.includes('text') || lowerMessage.includes('label'))) {
      const textContent = extractElementText(userMessage, 'text') || 'Text content';
      addDirectElement('text', textContent);
      return {
        message: `✅ Added text "${textContent}" to your canvas! Select it to modify the content and appearance.`,
        app: null
      };
    } else if (lowerMessage.includes('add') && (lowerMessage.includes('container') || lowerMessage.includes('card') || lowerMessage.includes('box'))) {
      addDirectElement('container', 'Container');
      return {
        message: `✅ Added a container/card to your canvas! Use it to group other elements together.`,
        app: null
      };
    }
    
    // Detect intent and generate appropriate response
    else if (lowerMessage.includes('data') || lowerMessage.includes('analyzer') || lowerMessage.includes('analysis')) {
      return {
        message: "🔬 Perfect! I'll create a Data Analyzer Controller for you. This app will have file input controls, analysis parameters, progress monitoring, and results display. Here's your application:",
        app: generateDataAnalyzerApp()
      };
    } else if (lowerMessage.includes('file') || lowerMessage.includes('folder') || lowerMessage.includes('manager')) {
      return {
        message: "📁 Great choice! I'll build a File Manager application with navigation, file operations, and search. Here's your app:",
        app: generateFileManagerApp()
      };
    } else if (lowerMessage.includes('device') || lowerMessage.includes('monitor') || lowerMessage.includes('control')) {
      return {
        message: "💻 Excellent! I'll create a Device Monitor with real-time status, control buttons, and alerts. Here's your application:",
        app: generateDeviceMonitorApp()
      };
    } else if (lowerMessage.includes('custom') || lowerMessage.includes('specific')) {
      return {
        message: "🛠️ I'd love to help you create a custom application! Can you tell me more about what specific functionality you need? For example:\n\n• What programs or scripts do you want to control?\n• What kind of data do you need to display?\n• What actions should users be able to perform?",
        app: null
      };
    } else {
      return {
        message: "🤔 I'd be happy to help you create an application! Here are some popular options:\n\n🔬 **Data Analyzer Controller** - Control analysis programs\n📁 **File Manager** - Organize and manage files\n💻 **Device Monitor** - Monitor connected devices\n🛠️ **Custom Tool** - Build something specific\n\nWhich type interests you, or describe what you'd like to build in your own words!",
        app: null
      };
    }
  };

  // Generate different types of apps
  const generateDataAnalyzerApp = () => ({
    name: "Data Analyzer Controller",
    description: "Control and monitor data analysis programs",
    components: [
      { id: 'title', type: 'title', text: 'Data Analyzer Controller' },
      { id: 'file-input', type: 'input', text: 'Select Data File', style: { marginBottom: '10px' } },
      { id: 'analysis-type', type: 'select', text: 'Analysis Type', options: ['Statistical Analysis', 'Trend Analysis', 'Data Validation'], style: { marginBottom: '10px' } },
      { id: 'start-btn', type: 'button', text: 'Start Analysis' },
      { id: 'progress', type: 'text', text: 'Progress: Ready to start' },
      { id: 'results', type: 'container', text: 'Results will appear here' }
    ]
  });

  const generateFileManagerApp = () => ({
    name: "File Manager",
    description: "Organize and manage files and folders",
    components: [
      { id: 'title', type: 'title', text: 'File Manager' },
      { id: 'path', type: 'text', text: 'Current Path: /' },
      { id: 'search', type: 'input', text: 'Search files...', style: { marginBottom: '10px' } },
      { id: 'new-folder', type: 'button', text: 'New Folder' },
      { id: 'upload', type: 'button', text: 'Upload File' },
      { id: 'file-list', type: 'container', text: 'File list will appear here' }
    ]
  });

  const generateDeviceMonitorApp = () => ({
    name: "Device Monitor",
    description: "Monitor and control connected devices",
    components: [
      { id: 'title', type: 'title', text: 'Device Monitor' },
      { id: 'status', type: 'text', text: 'Status: 3 devices connected' },
      { id: 'refresh', type: 'button', text: 'Refresh Devices' },
      { id: 'device-list', type: 'container', text: 'Device list and controls' },
      { id: 'alerts', type: 'text', text: 'All systems normal' }
    ]
  });

  // Generate live preview code
  const generatePreviewCode = () => {
    if (!currentApp) return '';
    
    const simpleConfig = {
      title: currentApp.name,
      components: currentApp.components.map(comp => ({
        id: comp.id,
        type: comp.type,
        text: comp.text,
        style: comp.style || {}
      }))
    };
    
    return SimpleGuiGenerator.generateSimpleComponent(simpleConfig, 'PluginGUI');
  };

  // Add direct element to canvas
  const addDirectElement = (type, text) => {
    const newComponent = {
      id: `component_${Date.now()}`,
      type: type,
      props: {
        text: text.replace(/^[^\s]+\s/, ''), // Remove emoji prefix
        style: {}
      },
      position: { 
        x: 50 + Math.random() * 100, // Slight randomization to avoid overlap
        y: 50 + Math.random() * 100 
      },
      size: { 
        width: type === 'button' ? 120 : type === 'input' ? 200 : type === 'title' ? 250 : 180,
        height: type === 'input' ? 40 : type === 'title' ? 50 : type === 'container' ? 100 : 30
      }
    };
    
    // Add directly to canvas
    if (onComponentsGenerated) {
      onComponentsGenerated([newComponent]);
    }
  };

  // Save app to plugin and update canvas
  const saveAppToPlugin = () => {
    if (!currentApp) return;
    
    // Convert App Genie components to canvas components
    const canvasComponents = currentApp.components.map((comp, index) => ({
      id: `component_${Date.now()}_${index}`,
      type: comp.type,
      props: {
        text: comp.text,
        ...comp.options ? { options: comp.options } : {},
        ...comp.style ? { style: comp.style } : {}
      },
      position: { x: 50 + (index * 20), y: 50 + (index * 80) },
      size: { width: 200, height: 50 }
    }));
    
    // Update canvas immediately
    if (onComponentsGenerated) {
      onComponentsGenerated(canvasComponents);
    }
    
    const guiConfig = {
      components: canvasComponents,
      settings: { layout: 'flex', theme: 'default', responsive: true }
    };
    
    onUpdateApp({
      ...pluginDoc,
      metadata: {
        ...pluginDoc.metadata,
        name: currentApp.name,
        description: currentApp.description
      },
      gui: guiConfig
    });
  };

  // Chat-only mode for separate AI chat container
  if (chatOnly) {
    return (
      <div className="h-full flex flex-col">
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {conversation.map((msg, index) => (
            <div key={index} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 rounded-lg ${
                msg.type === 'user' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                <span className="text-xs opacity-70 mt-1 block">
                  {msg.timestamp.toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
          {isGenerating && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-800 p-3 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                  <span className="text-sm">Generating...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Chat Input */}
        <div className="border-t p-4">
          <div className="flex space-x-2">
            <input
              ref={inputRef}
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !isGenerating && handleSendMessage()}
              placeholder="Describe the app you want to create..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              disabled={isGenerating}
            />
            <button
              onClick={handleSendMessage}
              disabled={isGenerating || !userInput.trim()}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <PaperAirplaneIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col bg-white transition-all duration-300 ${isMinimized ? 'w-12' : ''}`}>
      {/* Sidebar Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-3">
        <div className="flex items-center justify-between">
          <div className={`flex items-center space-x-2 ${isMinimized ? 'hidden' : ''}`}>
            <SparklesIcon className="w-5 h-5" />
            <h2 className="text-lg font-bold">App Genie</h2>
          </div>
          <button
            onClick={() => {
              const newMinimized = !isMinimized;
              setIsMinimized(newMinimized);
              if (onMinimizeChange) {
                onMinimizeChange(newMinimized);
              }
            }}
            className="p-1 rounded hover:bg-white hover:bg-opacity-20 transition-colors flex-shrink-0"
            title={isMinimized ? 'Expand App Genie' : 'Minimize App Genie'}
          >
            {isMinimized ? (
              <ChevronRightIcon className="w-4 h-4" />
            ) : (
              <ChevronLeftIcon className="w-4 h-4" />
            )}
          </button>
        </div>
        {!isMinimized && <p className="text-xs opacity-90 mt-1">AI Assistant</p>}
      </div>

      {/* App Genie Content - Hidden when minimized */}
      {!isMinimized && (
        <>
          {/* Quick Element Toolbar */}
          <div className="p-3 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-medium mb-2 text-gray-700">Quick Elements:</h3>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => addDirectElement('button', '🔘 Button')}
                className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 rounded transition-colors"
                title="Add Button"
              >
                🔘 Button
              </button>
              <button
                onClick={() => addDirectElement('input', '📝 Input')}
                className="px-2 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-800 rounded transition-colors"
                title="Add Input Field"
              >
                📝 Input
              </button>
              <button
                onClick={() => addDirectElement('title', '📊 Title')}
                className="px-2 py-1 text-xs bg-purple-100 hover:bg-purple-200 text-purple-800 rounded transition-colors"
                title="Add Title"
              >
                📊 Title
              </button>
              <button
                onClick={() => addDirectElement('text', '📄 Text')}
                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 rounded transition-colors"
                title="Add Text"
              >
                📄 Text
              </button>
              <button
                onClick={() => addDirectElement('container', '📦 Card')}
                className="px-2 py-1 text-xs bg-orange-100 hover:bg-orange-200 text-orange-800 rounded transition-colors"
                title="Add Container/Card"
              >
                📦 Card
              </button>
            </div>
          </div>

          {/* Quick Templates */}
          <div className="p-3 border-b border-gray-200">
        <h3 className="text-sm font-medium mb-2 text-gray-700">Quick Start:</h3>
        <div className="grid grid-cols-2 gap-2">
          {appTemplates.map(template => (
            <button
              key={template.id}
              onClick={() => handleTemplateSelect(template)}
              className="p-2 bg-gray-50 hover:bg-gray-100 rounded transition-colors text-left"
            >
              <template.icon className="w-4 h-4 mb-1 text-blue-600" />
              <div className="text-xs font-medium text-gray-900">{template.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {conversation.map((message, index) => (
          <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-3xl p-3 rounded-lg ${
              message.type === 'user' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
            }`}>
              <div className="whitespace-pre-wrap">{message.message}</div>
              {message.app && (
                <div className="mt-3 p-3 bg-white dark:bg-gray-700 rounded border">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">{message.app.name}</h4>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setShowPreview(!showPreview)}
                        className="px-2 py-1 bg-blue-600 text-white rounded text-xs"
                      >
                        <EyeIcon className="w-3 h-3 inline mr-1" />
                        Preview
                      </button>
                      <button
                        onClick={saveAppToPlugin}
                        className="px-2 py-1 bg-green-600 text-white rounded text-xs"
                      >
                        <RocketLaunchIcon className="w-3 h-3 inline mr-1" />
                        Add to Canvas
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{message.app.description}</p>
                  <div className="mt-2 text-xs text-gray-500">
                    Components: {message.app.components.length} • Ready for Centcom ✅
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isGenerating && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-gray-600 dark:text-gray-400">App Genie is thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-gray-200">
        <div className="flex space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleUserMessage()}
            placeholder="Describe your app..."
            className="flex-1 px-2 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => handleUserMessage()}
            disabled={!userInput.trim() || isGenerating}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded transition-colors"
          >
            <PaperAirplaneIcon className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-1 text-xs text-gray-500">
          💡 "Create a data analyzer" or "Build a file manager"
        </div>
      </div>

      {/* Live Preview Modal */}
      {showPreview && currentApp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Live Preview: {currentApp.name}</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              {/* Visual Preview */}
              <div className="border border-gray-200 dark:border-gray-700 rounded p-4">
                <h4 className="font-medium mb-3">Visual Preview</h4>
                <div className="space-y-2">
                  {currentApp.components.map(comp => (
                    <div key={comp.id} className="p-2 border rounded text-sm">
                      <span className="font-medium">{comp.type}:</span> {comp.text}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Generated Code */}
              <div className="border border-gray-200 dark:border-gray-700 rounded p-4">
                <h4 className="font-medium mb-3">Generated Code</h4>
                <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-x-auto">
                  {generatePreviewCode()}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};

export default AppGenie;
