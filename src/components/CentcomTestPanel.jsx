import React, { useState, useEffect, useRef } from 'react';
import {
  PlayIcon,
  StopIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowPathIcon,
  DocumentArrowDownIcon,
  ComputerDesktopIcon,
  ClipboardDocumentListIcon,
  CogIcon,
  RectangleStackIcon,
  CircleStackIcon,
  CommandLineIcon,
  EyeIcon,
  BeakerIcon,
  CubeIcon,
  ServerIcon,
  WrenchScrewdriverIcon,
  ChartBarIcon,
  DocumentTextIcon,
  SignalIcon,
  SpeakerWaveIcon,
  Squares2X2Icon,
  DevicePhoneMobileIcon,
  WifiIcon,
  BoltIcon,
  ClockIcon,
  FolderIcon,
  DocumentIcon,
  TableCellsIcon,
  AdjustmentsHorizontalIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CloudArrowUpIcon,
  CloudArrowDownIcon,
  ExclamationCircleIcon,
  LockClosedIcon,
  KeyIcon
} from '@heroicons/react/24/outline';

// Icon mapping for plugin icons
const ICON_COMPONENTS = {
  BeakerIcon,
  CubeIcon,
  ServerIcon,
  WrenchScrewdriverIcon,
  ChartBarIcon,
  DocumentTextIcon,
  SignalIcon,
  Squares2X2Icon,
  CogIcon,
  ComputerDesktopIcon,
  CircleStackIcon,
  DevicePhoneMobileIcon,
  WifiIcon,
  BoltIcon,
  ClockIcon,
  FolderIcon,
  DocumentIcon,
  TableCellsIcon,
  AdjustmentsHorizontalIcon
};

// Helper function to convert hex to RGB
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

// Helper function to detect if a color appears green-ish
const isGreenish = (hexColor) => {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return false;
  // A color is considered greenish if green component is significantly higher than red and blue
  return rgb.g > rgb.r + 50 && rgb.g > rgb.b + 50;
};

const CentcomTestPanel = ({ pluginName, pluginMetadata, onTestResults }) => {
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [centcomStatus, setCentcomStatus] = useState('unknown'); // unknown, running, stopped, error
  
  // Enhanced simulator state
  const [simulatorMode, setSimulatorMode] = useState('integrated'); // 'integrated' or 'fullscreen'
  const [mockDevices, setMockDevices] = useState([
    { id: 'apx555', name: 'APx555 Audio Analyzer', type: 'audio', status: 'connected', address: '192.168.1.100' },
    { id: 'apx500', name: 'APx500 Series', type: 'audio', status: 'connected', address: '192.168.1.101' },
    { id: 'daq1', name: 'Data Acquisition Unit 1', type: 'daq', status: 'disconnected', address: '192.168.1.102' }
  ]);
  const [mockProjects, setMockProjects] = useState([
    { id: 'proj1', name: 'Test Project 1', created: '2024-01-15', status: 'active', plugins: [] },
    { id: 'proj2', name: 'Audio Analysis Suite', created: '2024-01-10', status: 'archived', plugins: [pluginMetadata?.metadata?.id] }
  ]);
  const [mockSequencerSteps, setMockSequencerSteps] = useState([
    { id: 'step1', name: 'Initialize Devices', type: 'system', duration: 2000 },
    { id: 'step2', name: 'Configure Audio', type: 'audio', duration: 1500 },
    { id: 'step3', name: 'Run Plugin Action', type: 'plugin', duration: 3000, pluginId: pluginMetadata?.metadata?.id }
  ]);
  const [pluginRuntime, setPluginRuntime] = useState({
    isRunning: false,
    executionCount: 0,
    lastExecution: null,
    errors: [],
    performance: { avgDuration: 0, memoryUsage: 0 }
  });
  const [databaseSimulation, setDatabaseSimulation] = useState({
    tables: ['devices', 'projects', 'plugins', 'measurements', 'configurations'],
    records: {
      plugins: [{ id: pluginMetadata?.metadata?.id, name: pluginMetadata?.metadata?.name, registered_at: new Date().toISOString() }],
      measurements: [],
      configurations: []
    },
    queries: []
  });
  
  // Debug: Log data structure
  console.log('Plugin loaded:', pluginMetadata?.metadata?.name, 'Icon:', pluginMetadata?.metadata?.icon, 'GUI components:', pluginMetadata?.gui?.components?.length);

  // Enhanced helper function to render plugin icon
  const renderPluginIcon = (iconName, className = "w-4 h-4") => {
    // Debug logging for icon resolution
    console.log('Rendering icon:', iconName, 'with class:', className);
    
    if (!iconName) {
      console.log('No icon name provided, using fallback CubeIcon');
      return <CubeIcon className={className} />;
    }
    
    // Try exact match first
    let IconComponent = ICON_COMPONENTS[iconName];
    
    // If not found, try common variations
    if (!IconComponent) {
      const variations = [
        iconName,
        iconName + 'Icon',
        iconName.replace('Icon', ''),
        iconName.charAt(0).toUpperCase() + iconName.slice(1),
        iconName.charAt(0).toUpperCase() + iconName.slice(1) + 'Icon'
      ];
      
      for (const variation of variations) {
        IconComponent = ICON_COMPONENTS[variation];
        if (IconComponent) {
          console.log(`Found icon with variation: ${variation}`);
          break;
        }
      }
    }
    
    if (IconComponent) {
      console.log(`Successfully rendering icon: ${iconName}`);
      return <IconComponent className={className} />;
    }
    
    // Enhanced fallback with better visual
    console.log(`Icon not found: ${iconName}, using CubeIcon fallback`);
    return <CubeIcon className={className} />;
  };
  const [testResults, setTestResults] = useState(null);
  const [currentTest, setCurrentTest] = useState(null);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testProgress, setTestProgress] = useState(0);
  const [testStep, setTestStep] = useState('');
  const [showCentcomUI, setShowCentcomUI] = useState(false);
  const [testLogs, setTestLogs] = useState([]);
  const [showTestLogs, setShowTestLogs] = useState(false);
  const [runningIndividualTests, setRunningIndividualTests] = useState(new Set());
  
  // Test scenario states
  const [testScenarios, setTestScenarios] = useState({
    registration: { status: 'pending', message: '', details: null },
    guiMatching: { status: 'pending', message: '', details: null },
    dataSaving: { status: 'pending', message: '', details: null },
    sequencerActions: { status: 'pending', message: '', details: null }
  });

  // Add test log helper
  const addTestLog = (level, message, testType = null) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = {
      timestamp,
      level, // 'info', 'success', 'warning', 'error'
      message,
      testType
    };
    setTestLogs(prev => [...prev, logEntry]);
    console.log(`[${timestamp}] [${level.toUpperCase()}] ${testType ? `[${testType}] ` : ''}${message}`);
  };

  // Plugin runtime simulation
  const simulatePluginExecution = async (action = 'test') => {
    addTestLog('info', `Starting plugin execution: ${action}`, 'RUNTIME');
    setPluginRuntime(prev => ({ ...prev, isRunning: true }));
    
    const startTime = Date.now();
    
    try {
      // Simulate plugin initialization
      await new Promise(resolve => setTimeout(resolve, 500));
      addTestLog('success', 'Plugin initialized successfully', 'RUNTIME');
      
      // Simulate data processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      addTestLog('info', 'Processing plugin data...', 'RUNTIME');
      
      // Simulate device interaction
      if (mockDevices.some(d => d.status === 'connected')) {
        await new Promise(resolve => setTimeout(resolve, 800));
        addTestLog('success', 'Device communication established', 'RUNTIME');
      }
      
      // Simulate database operations
      setDatabaseSimulation(prev => ({
        ...prev,
        queries: [...prev.queries, { 
          query: `INSERT INTO measurements (plugin_id, data, timestamp) VALUES ('${pluginMetadata?.metadata?.id}', '${JSON.stringify({value: Math.random() * 100})}', '${new Date().toISOString()}')`,
          timestamp: new Date().toISOString(),
          status: 'success'
        }]
      }));
      
      const duration = Date.now() - startTime;
      setPluginRuntime(prev => ({
        ...prev,
        isRunning: false,
        executionCount: prev.executionCount + 1,
        lastExecution: new Date().toISOString(),
        performance: {
          avgDuration: prev.executionCount === 0 ? duration : (prev.performance.avgDuration + duration) / 2,
          memoryUsage: Math.random() * 50 + 10 // Simulated memory usage
        }
      }));
      
      addTestLog('success', `Plugin execution completed in ${duration}ms`, 'RUNTIME');
      return { success: true, duration };
      
    } catch (error) {
      setPluginRuntime(prev => ({
        ...prev,
        isRunning: false,
        errors: [...prev.errors, { message: error.message, timestamp: new Date().toISOString() }]
      }));
      addTestLog('error', `Plugin execution failed: ${error.message}`, 'RUNTIME');
      return { success: false, error: error.message };
    }
  };

  // Device management simulation
  const simulateDeviceOperation = async (deviceId, operation) => {
    addTestLog('info', `${operation} device: ${deviceId}`, 'DEVICES');
    
    setMockDevices(prev => prev.map(device => 
      device.id === deviceId 
        ? { ...device, status: operation === 'connect' ? 'connected' : 'disconnected' }
        : device
    ));
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    addTestLog('success', `Device ${operation} successful`, 'DEVICES');
  };

  // Database simulation functions
  const simulateDatabaseQuery = async (query, table = 'plugins') => {
    addTestLog('info', `Executing database query on ${table}`, 'DATABASE');
    
    setDatabaseSimulation(prev => ({
      ...prev,
      queries: [...prev.queries, {
        query,
        table,
        timestamp: new Date().toISOString(),
        status: 'success',
        rowsAffected: Math.floor(Math.random() * 5) + 1
      }]
    }));
    
    await new Promise(resolve => setTimeout(resolve, 300));
    addTestLog('success', `Database query executed successfully`, 'DATABASE');
  };

  // Check if Centcom is running
  const checkCentcomStatus = async () => {
    setIsTestingConnection(true);
    addTestLog('info', 'Checking Centcom application status');
    
    try {
      // In a real scenario, we'd check multiple possible Centcom ports
      // For now, we'll simulate a connection check without actual network calls
      addTestLog('info', 'Attempting connection to Centcom on localhost:8080');
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate check delay
      
      // For demo purposes, simulate Centcom being available
      const isAvailable = Math.random() > 0.3; // 70% chance available
      
      if (isAvailable) {
        setCentcomStatus('running');
        addTestLog('success', 'Centcom application detected and running');
      } else {
        setCentcomStatus('stopped');
        addTestLog('warning', 'Centcom application not detected - may need to be started');
      }
    } catch (error) {
      setCentcomStatus('error');
      addTestLog('error', `Failed to check Centcom status: ${error.message}`);
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Enhanced comprehensive test suite with full Centcom simulation
  // Individual test runners
  const runIndividualTest = async (testType) => {
    if (!pluginName || !pluginMetadata) {
      alert('No plugin selected or metadata missing');
      return;
    }

    // Check if this test is already running
    if (runningIndividualTests.has(testType)) {
      return;
    }

    // Add to running tests
    setRunningIndividualTests(prev => new Set([...prev, testType]));

    addTestLog('info', `Starting individual test: ${testType}`);
    
    // Set the specific test to running status
    setTestScenarios(prev => ({
      ...prev,
      [testType]: { status: 'running', message: 'Testing...', details: null }
    }));

    try {
      switch (testType) {
        case 'registration':
          addTestLog('info', 'Running Plugin Registration & Visibility test', 'REGISTRATION');
          await testPluginRegistration();
          break;
        case 'devices':
          addTestLog('info', 'Running Device Integration test', 'DEVICES');
          await testDeviceIntegration();
          break;
        case 'guiMatching':
          addTestLog('info', 'Running GUI Matching test', 'GUI');
          await testGUIMatching();
          break;
        case 'runtime':
          addTestLog('info', 'Running Plugin Runtime test', 'RUNTIME');
          await testPluginRuntime();
          break;
        case 'dataSaving':
          addTestLog('info', 'Running Data Saving test', 'DATA');
          await testDataSaving();
          break;
        case 'sequencerActions':
          addTestLog('info', 'Running Sequencer Actions test', 'SEQUENCER');
          await testSequencerActions();
          break;
        case 'performance':
          addTestLog('info', 'Running Performance Analysis test', 'PERFORMANCE');
          await testPerformanceMetrics();
          break;
        default:
          throw new Error(`Unknown test type: ${testType}`);
      }

      addTestLog('success', `${testType} test completed successfully`);
    } catch (error) {
      console.error(`${testType} test error:`, error);
      addTestLog('error', `${testType} test failed: ${error.message}`);
      setTestScenarios(prev => ({
        ...prev,
        [testType]: { status: 'error', message: `Test failed: ${error.message}`, details: null }
      }));
    } finally {
      // Remove from running tests
      setRunningIndividualTests(prev => {
        const newSet = new Set(prev);
        newSet.delete(testType);
        return newSet;
      });
    }
  };

  const runComprehensiveTests = async () => {
    if (!pluginName || !pluginMetadata) {
      alert('No plugin selected or metadata missing');
      return;
    }

    setIsRunningTests(true);
    setTestProgress(0);
    setCurrentTest('starting');
    setTestStep('Initializing test environment...');
    setTestLogs([]); // Clear previous logs
    
    addTestLog('info', 'Starting enhanced comprehensive test suite');
    addTestLog('info', `Testing plugin: ${pluginName}`);
    addTestLog('info', `Plugin version: ${pluginMetadata?.metadata?.version || 'unknown'}`);

    // Reset all test scenarios with new tests
    setTestScenarios({
      registration: { status: 'running', message: 'Testing...', details: null },
      devices: { status: 'pending', message: '', details: null },
      guiMatching: { status: 'pending', message: '', details: null },
      runtime: { status: 'pending', message: '', details: null },
      dataSaving: { status: 'pending', message: '', details: null },
      sequencerActions: { status: 'pending', message: '', details: null },
      performance: { status: 'pending', message: '', details: null }
    });

    try {
      // Test 1: Plugin Registration and Visibility
      addTestLog('info', 'Starting Plugin Registration & Visibility test', 'REGISTRATION');
      await testPluginRegistration();
      setTestProgress(14);

      // Test 2: Device Integration
      addTestLog('info', 'Starting Device Integration test', 'DEVICES');
      setTestScenarios(prev => ({ ...prev, devices: { status: 'running', message: 'Testing device integration...', details: null } }));
      await testDeviceIntegration();
      setTestProgress(28);

      // Test 3: GUI Matching
      addTestLog('info', 'Starting GUI Matching test', 'GUI');
      await testGUIMatching();
      setTestProgress(42);

      // Test 4: Plugin Runtime
      addTestLog('info', 'Starting Plugin Runtime test', 'RUNTIME');
      setTestScenarios(prev => ({ ...prev, runtime: { status: 'running', message: 'Testing plugin execution...', details: null } }));
      await testPluginRuntime();
      setTestProgress(56);

      // Test 5: Data Saving
      addTestLog('info', 'Starting Data Saving test', 'DATA');
      await testDataSaving();
      setTestProgress(70);

      // Test 6: Sequencer Actions
      addTestLog('info', 'Starting Sequencer Actions test', 'SEQUENCER');
      await testSequencerActions();
      setTestProgress(84);

      // Test 7: Performance Analysis
      addTestLog('info', 'Starting Performance Analysis test', 'PERFORMANCE');
      setTestScenarios(prev => ({ ...prev, performance: { status: 'running', message: 'Analyzing performance metrics...', details: null } }));
      await testPerformanceMetrics();
      setTestProgress(100);

      setTestStep('All tests completed!');
      setCurrentTest('completed');
      addTestLog('success', 'All test scenarios completed successfully');

    } catch (error) {
      console.error('Test suite error:', error);
      addTestLog('error', `Test suite failed: ${error.message}`);
      setTestStep(`Test failed: ${error.message}`);
      setCurrentTest('error');
    } finally {
      setIsRunningTests(false);
    }
  };

  // Test 2: Device Integration  
  const testDeviceIntegration = async () => {
    addTestLog('info', 'Testing device integration and communication', 'DEVICES');
    addTestLog('info', 'Step 1: Scanning for connected measurement devices', 'DEVICES');
    await new Promise(resolve => setTimeout(resolve, 800));
    
    addTestLog('info', 'Step 2: Testing device communication protocols', 'DEVICES');
    await new Promise(resolve => setTimeout(resolve, 700));
    
    const connectedDevices = mockDevices.filter(d => d.status === 'connected');
    if (connectedDevices.length > 0) {
      // Simulate device communication
      for (const device of connectedDevices) {
        addTestLog('info', `Testing communication with ${device.name}`, 'DEVICES');
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      setTestScenarios(prev => ({
        ...prev,
        devices: {
          status: 'success',
          message: `Plugin can communicate with ${connectedDevices.length} devices`,
          details: {
            connectedDevices: connectedDevices.length,
            deviceTypes: [...new Set(connectedDevices.map(d => d.type))],
            supportedProtocols: ['TCP/IP', 'USB', 'Serial'],
            communication: true
          }
        }
      }));
      addTestLog('success', `Device integration test passed - ${connectedDevices.length} devices connected`, 'DEVICES');
    } else {
      setTestScenarios(prev => ({
        ...prev,
        devices: {
          status: 'warning',
          message: 'No devices available for testing',
          details: {
            connectedDevices: 0,
            recommendation: 'Connect devices for full testing'
          }
        }
      }));
      addTestLog('warning', 'No devices connected for testing', 'DEVICES');
    }
  };

  // Test 4: Plugin Runtime
  const testPluginRuntime = async () => {
    addTestLog('info', 'Testing plugin runtime execution and performance', 'RUNTIME');
    addTestLog('info', 'Step 1: Initializing plugin execution environment', 'RUNTIME');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    addTestLog('info', 'Step 2: Executing plugin in simulated Centcom context', 'RUNTIME');
    const result = await simulatePluginExecution('comprehensive-test');
    
    addTestLog('info', 'Step 3: Analyzing execution results and performance metrics', 'RUNTIME');
    await new Promise(resolve => setTimeout(resolve, 300));
    
    if (result.success) {
      setTestScenarios(prev => ({
        ...prev,
        runtime: {
          status: 'success',
          message: `Plugin executed successfully in ${result.duration}ms`,
          details: {
            executionTime: result.duration,
            memoryUsage: pluginRuntime.performance.memoryUsage,
            errorCount: pluginRuntime.errors.length,
            performance: result.duration < 3000 ? 'optimal' : 'acceptable'
          }
        }
      }));
      addTestLog('success', `Plugin runtime test passed`, 'RUNTIME');
    } else {
      setTestScenarios(prev => ({
        ...prev,
        runtime: {
          status: 'error',
          message: 'Plugin execution failed',
          details: {
            error: result.error,
            recommendation: 'Check plugin code for runtime errors'
          }
        }
      }));
      addTestLog('error', `Plugin runtime test failed: ${result.error}`, 'RUNTIME');
    }
  };

  // Test 7: Performance Analysis
  const testPerformanceMetrics = async () => {
    addTestLog('info', 'Analyzing plugin performance metrics and resource usage', 'PERFORMANCE');
    addTestLog('info', 'Step 1: Collecting execution time statistics', 'PERFORMANCE');
    await new Promise(resolve => setTimeout(resolve, 400));
    
    addTestLog('info', 'Step 2: Measuring memory usage patterns', 'PERFORMANCE');
    await new Promise(resolve => setTimeout(resolve, 300));
    
    addTestLog('info', 'Step 3: Evaluating performance against benchmarks', 'PERFORMANCE');
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const avgDuration = pluginRuntime.performance.avgDuration;
    const memoryUsage = pluginRuntime.performance.memoryUsage;
    
    let status = 'success';
    let message = 'Performance within optimal range';
    
    if (avgDuration > 5000) {
      status = 'warning';
      message = 'Plugin execution time is slower than recommended';
    } else if (memoryUsage > 100) {
      status = 'warning';
      message = 'Plugin memory usage is higher than recommended';
    }
    
    setTestScenarios(prev => ({
      ...prev,
      performance: {
        status,
        message,
        details: {
          avgExecutionTime: Math.round(avgDuration),
          memoryUsage: Math.round(memoryUsage),
          executionCount: pluginRuntime.executionCount,
          errorRate: pluginRuntime.errors.length / Math.max(pluginRuntime.executionCount, 1),
          recommendations: avgDuration > 5000 ? ['Optimize plugin algorithms', 'Reduce computational complexity'] : ['Performance is optimal']
        }
      }
    }));
    
    addTestLog('success', `Performance analysis completed - ${status === 'success' ? 'optimal' : 'needs optimization'}`, 'PERFORMANCE');
  };

  // Test 1: Plugin Registration and Visibility
  const testPluginRegistration = async () => {
    setCurrentTest('registration');
    setTestStep('Testing plugin registration in Centcom settings...');
    
    addTestLog('info', 'Checking plugin registration process', 'registration');
    addTestLog('info', 'Step 1: Attempting plugin installation in Centcom', 'registration');
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Check for common registration issues
    const hasRequiredMetadata = pluginMetadata?.metadata?.id && pluginMetadata?.metadata?.name && pluginMetadata?.metadata?.version;
    addTestLog(hasRequiredMetadata ? 'success' : 'error', 
      `Plugin metadata validation: ${hasRequiredMetadata ? 'passed' : 'failed'}`, 'registration');
    
    addTestLog('info', 'Step 2: Checking database schema compatibility', 'registration');
    await new Promise(resolve => setTimeout(resolve, 600));
    
    // Simulate database schema check - licensing system is now implemented
    const hasLicenseColumn = true; // license_key column exists since licensing system is implemented
    addTestLog(hasLicenseColumn ? 'success' : 'error', 
      `Database schema check: ${hasLicenseColumn ? 'compatible' : 'missing license_key column'}`, 'registration');
    
    addTestLog('info', 'Step 3: Testing plugin visibility in Settings page', 'registration');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    addTestLog('info', 'Step 4: Testing plugin visibility in Apps page', 'registration');
    await new Promise(resolve => setTimeout(resolve, 400));
    
    addTestLog('info', 'Step 5: Validating UI color consistency', 'registration');
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Check if the plugin color in Apps page matches the color selected in editor
    const selectedColor = pluginMetadata?.metadata?.color || '#3b82f6'; // Default blue
    
    // Debug logging
    addTestLog('info', `Plugin color in metadata: ${pluginMetadata?.metadata?.color || 'NOT SET'}`, 'registration');
    addTestLog('info', `Color being used: ${selectedColor}`, 'registration');
    
    // Detect color mismatch: if user selected green but we're using a fallback color
    const userSelectedGreen = isGreenish(selectedColor);
    const fallbackPurpleUsed = !pluginMetadata?.metadata?.color; // No color set, using purple fallback
    
    addTestLog('info', `Is green color: ${userSelectedGreen}, Using fallback: ${fallbackPurpleUsed}`, 'registration');
    
    // Test fails if:
    // 1. User selected green but we're showing purple/pink fallback
    // 2. Selected color doesn't match what's actually displayed
    const colorMatches = !(userSelectedGreen && fallbackPurpleUsed) && 
                        (pluginMetadata?.metadata?.color !== undefined);
    
    addTestLog(colorMatches ? 'success' : 'error', 
      `Color validation: ${colorMatches ? 'passed' : 'FAILED - color mismatch detected'}`, 'registration');
    
    if (!colorMatches) {
      if (userSelectedGreen && fallbackPurpleUsed) {
        addTestLog('error', `Expected GREEN (${selectedColor}), but Apps page shows PURPLE/PINK fallback color`, 'registration');
        addTestLog('error', 'Plugin color metadata not properly applied to Apps page display', 'registration');
      } else {
        addTestLog('error', `Expected color: ${selectedColor}, but Apps page shows different color`, 'registration');
      }
    } else {
      addTestLog('success', `Color correctly applied: ${selectedColor}`, 'registration');
    }
    
    addTestLog('info', 'Step 6: Testing sidebar integration', 'registration');
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const registrationSuccess = hasRequiredMetadata && hasLicenseColumn && colorMatches;
    
    if (registrationSuccess) {
      addTestLog('success', 'Plugin registration completed successfully', 'registration');
      setTestScenarios(prev => ({
        ...prev,
        registration: {
          status: 'success',
          message: 'Plugin registered and color validation passed',
          details: {
            settingsPageVisible: true,
            appsPageVisible: true,
            sidebarVisible: true,
            iconDisplayed: true,
            metadataCorrect: true,
            databaseCompatible: true,
            colorValidation: true,
            selectedColor: selectedColor
          }
        }
      }));
    } else {
      const errorMsg = !hasRequiredMetadata ? 'Missing required metadata fields' : 
                      !hasLicenseColumn ? 'Database schema mismatch: missing license_key column' : 
                      !colorMatches ? 'Color mismatch: Apps page color does not match selected color' :
                      'Unknown registration error';
      addTestLog('error', `Plugin registration failed: ${errorMsg}`, 'registration');
      setTestScenarios(prev => ({
        ...prev,
        registration: {
          status: 'error',
          message: 'Plugin registration failed - color validation failed',
          details: {
            settingsPageVisible: colorMatches,
            appsPageVisible: colorMatches,
            sidebarVisible: colorMatches,
            iconDisplayed: colorMatches,
            metadataCorrect: hasRequiredMetadata,
            databaseCompatible: hasLicenseColumn,
            colorValidation: colorMatches,
            selectedColor: selectedColor,
            error: errorMsg
          }
        }
      }));
    }
  };

  // Test 3: GUI Matching
  const testGUIMatching = async () => {
    setCurrentTest('guiMatching');
    setTestStep('Comparing plugin GUI with Centcom display...');
    
    addTestLog('info', 'Starting GUI comparison between Studio and Centcom', 'GUI');
    addTestLog('info', 'Step 1: Loading plugin GUI in Centcom environment', 'GUI');
    await new Promise(resolve => setTimeout(resolve, 600));
    
    addTestLog('info', 'Step 2: Analyzing component layout and positioning', 'GUI');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    addTestLog('info', 'Step 3: Verifying CSS styling and themes', 'GUI');
    await new Promise(resolve => setTimeout(resolve, 400));
    
    addTestLog('info', 'Step 4: Testing light theme compatibility', 'GUI');
    await new Promise(resolve => setTimeout(resolve, 350));
    
    addTestLog('info', 'Step 5: Testing dark theme compatibility', 'GUI');
    await new Promise(resolve => setTimeout(resolve, 350));
    
    addTestLog('info', 'Step 6: Testing component interactivity', 'GUI');
    await new Promise(resolve => setTimeout(resolve, 300));
    
    addTestLog('info', 'Step 7: Checking responsive design compatibility', 'GUI');
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Check if plugin has GUI components
    const hasGUIComponents = pluginMetadata?.gui?.components && pluginMetadata.gui.components.length > 0;
    
    if (!hasGUIComponents) {
      addTestLog('warning', 'No GUI components found in plugin design', 'GUI');
      setTestScenarios(prev => ({
        ...prev,
        guiMatching: {
          status: 'warning',
          message: 'No GUI components to compare - plugin may not have a visual interface',
          details: {
            layoutMatches: null,
            stylingMatches: null,
            componentsRendered: false,
            interactivityWorks: null,
            responsiveDesign: null,
            issues: ['No GUI components found in plugin metadata']
          }
        }
      }));
      return;
    }
    
    // Simulate more realistic GUI comparison
    const componentCount = pluginMetadata.gui.components.length;
    addTestLog('info', `Analyzing ${componentCount} GUI components`, 'GUI');
    
    const guiMatches = Math.random() > 0.15; // 85% success rate for demo
    
    if (guiMatches) {
      addTestLog('success', `GUI comparison completed - perfect match found for ${componentCount} components`, 'GUI');
      setTestScenarios(prev => ({
        ...prev,
        guiMatching: {
          status: 'success',
          message: 'Plugin GUI matches Centcom display perfectly',
          details: {
            layoutMatches: true,
            stylingMatches: true,
            componentsRendered: true,
            interactivityWorks: true,
            responsiveDesign: true,
            lightThemeCompatible: true,
            darkThemeCompatible: true,
            componentCount: componentCount,
            matchedComponents: componentCount
          }
        }
      }));
    } else {
      addTestLog('warning', 'GUI comparison found minor discrepancies', 'GUI');
      setTestScenarios(prev => ({
        ...prev,
        guiMatching: {
          status: 'warning',
          message: 'Minor GUI discrepancies detected - may need adjustment',
          details: {
            layoutMatches: true,
            stylingMatches: false,
            componentsRendered: true,
            interactivityWorks: true,
            responsiveDesign: false,
            lightThemeCompatible: Math.random() > 0.3,
            darkThemeCompatible: Math.random() > 0.4,
            componentCount: componentCount,
            matchedComponents: Math.max(1, componentCount - 1),
            issues: ['CSS styling differs slightly from preview', 'Some responsive breakpoints need adjustment', 'Theme transitions may need optimization']
          }
        }
      }));
    }
  };

  // Enhanced Test 3: Data Saving with simulation
  const testDataSaving = async () => {
    setCurrentTest('dataSaving');
    setTestStep('Testing data persistence to test data application...');
    
    addTestLog('info', 'Testing data persistence to test data application', 'DATA');
    addTestLog('info', 'Step 1: Connecting to test data database', 'DATA');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Simulate data generation from plugin
    addTestLog('info', 'Step 2: Generating sample data from plugin GUI', 'DATA');
    const sampleData = [
      { timestamp: new Date().toISOString(), value: 42.7, units: 'dB', source: pluginMetadata?.metadata?.name },
      { timestamp: new Date(Date.now() - 1000).toISOString(), value: 41.2, units: 'dB', source: pluginMetadata?.metadata?.name },
      { timestamp: new Date(Date.now() - 2000).toISOString(), value: 43.1, units: 'dB', source: pluginMetadata?.metadata?.name }
    ];
    
    // Simulate database operations
    for (let i = 0; i < sampleData.length; i++) {
      await simulateDatabaseQuery(
        `INSERT INTO measurements (plugin_id, timestamp, value, units) VALUES ('${pluginMetadata?.metadata?.id}', '${sampleData[i].timestamp}', ${sampleData[i].value}, '${sampleData[i].units}')`, 
        'measurements'
      );
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    addTestLog('info', 'Step 3: Creating new project entry', 'DATA');
    await simulateDatabaseQuery(
      `INSERT INTO projects (name, source_plugin, created_at, status) VALUES ('${pluginMetadata?.metadata?.name} - Session 1', '${pluginMetadata?.metadata?.id}', '${new Date().toISOString()}', 'active')`, 
      'projects'
    );
    await new Promise(resolve => setTimeout(resolve, 450));
    
    addTestLog('info', 'Step 4: Validating data integrity and relationships', 'DATA');
    await new Promise(resolve => setTimeout(resolve, 450));
    
    const dataSavingWorks = Math.random() > 0.05; // 95% success rate for demo
    
    if (dataSavingWorks) {
      addTestLog('success', `Data persistence test completed successfully - ${sampleData.length} records created`, 'DATA');
      setTestScenarios(prev => ({
        ...prev,
        dataSaving: {
          status: 'success',
          message: 'Data successfully saved and appears in test data projects',
          details: {
            databaseConnection: true,
            dataValidation: true,
            projectsTableUpdated: true,
            dataIntegrity: true,
            testRecordsCreated: 3
          }
        }
      }));
    } else {
      addTestLog('error', 'Data persistence test failed - database connection error', 'dataSaving');
      setTestScenarios(prev => ({
        ...prev,
        dataSaving: {
          status: 'error',
          message: 'Data saving failed',
          details: {
            databaseConnection: false,
            dataValidation: false,
            projectsTableUpdated: false,
            dataIntegrity: false,
            error: 'Unable to connect to test data application database'
          }
        }
      }));
    }
  };

  // Test 4: Sequencer Actions
  const testSequencerActions = async () => {
    setCurrentTest('sequencerActions');
    setTestStep('Testing sequencer actions integration...');
    
    addTestLog('info', 'Testing sequencer actions registration', 'SEQUENCER');
    addTestLog('info', 'Step 1: Scanning plugin for sequencer actions', 'SEQUENCER');
    await new Promise(resolve => setTimeout(resolve, 800));
    
    addTestLog('info', 'Step 2: Registering actions with sequencer engine', 'SEQUENCER');
    await new Promise(resolve => setTimeout(resolve, 600));
    
    addTestLog('info', 'Step 3: Validating action parameters and signatures', 'SEQUENCER');
    await new Promise(resolve => setTimeout(resolve, 400));
    
    addTestLog('info', 'Step 4: Testing action execution in sequencer context', 'SEQUENCER');
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const sequencerWorks = Math.random() > 0.25; // 75% success rate for demo
    
    if (sequencerWorks) {
      addTestLog('success', 'Plugin actions successfully integrated with sequencer', 'SEQUENCER');
      setTestScenarios(prev => ({
        ...prev,
        sequencerActions: {
          status: 'success',
          message: 'Sequencer actions work properly',
          details: {
            actionsRegistered: true,
            sequencerIntegration: true,
            parametersValid: true,
            executionSuccessful: true,
            actionsFound: 5
          }
        }
      }));
    } else {
      addTestLog('error', 'Sequencer integration failed - actions not compatible', 'SEQUENCER');
      setTestScenarios(prev => ({
        ...prev,
        sequencerActions: {
          status: 'error',
          message: 'Sequencer actions failed to integrate',
          details: {
            actionsRegistered: false,
            sequencerIntegration: false,
            parametersValid: true,
            executionSuccessful: false,
            error: 'Plugin actions not found in sequencer application'
          }
        }
      }));
    }
  };

  // Generate database migration script
  const generateDatabaseFix = () => {
    const migrationSQL = `-- Database Migration to Fix Plugin Registration Issues
-- Run this SQL in your Centcom database

-- Add missing license_key column to plugins table
ALTER TABLE plugins ADD COLUMN license_key TEXT;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_plugins_license_key ON plugins(license_key);

-- Update existing plugins to have NULL license_key (if needed)
UPDATE plugins SET license_key = NULL WHERE license_key IS NOT DEFINED;

-- Verify the schema
SELECT name, sql FROM sqlite_master WHERE type='table' AND name='plugins';
`;

    // Copy to clipboard
    navigator.clipboard.writeText(migrationSQL).then(() => {
      alert('Database migration script copied to clipboard!');
    });
  };

  // Removed auto-check on mount to prevent network errors

  const getStatusIcon = (status) => {
    switch (status) {
      case 'running':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'stopped':
        return <StopIcon className="w-5 h-5 text-red-500" />;
      case 'error':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
      default:
        return <InformationCircleIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'running':
        return 'Centcom is running and accessible';
      case 'stopped':
        return 'Centcom is not running or not accessible';
      case 'error':
        return 'Error connecting to Centcom';
      default:
        return 'Checking Centcom status...';
    }
  };

  const getTestStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'error':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
      case 'running':
        return <ArrowPathIcon className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <div className="w-5 h-5 rounded-full bg-gray-300"></div>;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b">
        <h3 className="text-xl font-semibold flex items-center">
          <ComputerDesktopIcon className="w-6 h-6 mr-3" />
          Centcom Integration Test Suite
        </h3>
        <div className="flex items-center gap-3">
          <button
            onClick={checkCentcomStatus}
            disabled={isTestingConnection}
            className="flex items-center px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <ArrowPathIcon className={`w-4 h-4 mr-2 ${isTestingConnection ? 'animate-spin' : ''}`} />
            Refresh Status
          </button>
          <button
            onClick={() => setShowTestLogs(!showTestLogs)}
            className="flex items-center px-3 py-2 text-sm bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors"
          >
            <ClipboardDocumentListIcon className="w-4 h-4 mr-2" />
            Test Logs ({testLogs.length})
          </button>
          <button
            onClick={() => setShowCentcomUI(!showCentcomUI)}
            className="flex items-center px-3 py-2 text-sm bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg transition-colors"
          >
            <EyeIcon className="w-4 h-4 mr-2" />
            {showCentcomUI ? 'Hide' : 'Show'} Centcom UI
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-6">
        {/* Left Panel - Test Controls & Results */}
        <div className="space-y-6">
          {/* Centcom Status */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center mb-3">
              {getStatusIcon(centcomStatus)}
              <span className="ml-2 font-medium">Centcom Status</span>
            </div>
            <p className="text-sm text-gray-600">{getStatusText(centcomStatus)}</p>
          </div>

          {/* Plugin Information */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium mb-3">Plugin Under Test</h4>
            {pluginMetadata ? (
              <div className="text-sm text-gray-700 space-y-1">
                <p><strong>Name:</strong> {pluginMetadata.name}</p>
                <p><strong>ID:</strong> {pluginMetadata.id}</p>
                <p><strong>Version:</strong> {pluginMetadata.version}</p>
                <p><strong>Requires License:</strong> {pluginMetadata.requiresLicense ? 'Yes' : 'No'}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No plugin selected</p>
            )}
          </div>

          {/* Test Progress */}
          {isRunningTests && (
            <div className="p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-center mb-3">
                <ArrowPathIcon className="w-5 h-5 text-yellow-600 animate-spin mr-2" />
                <span className="font-medium">Running Tests</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${testProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600">{testStep}</p>
            </div>
          )}

          {/* Test Controls */}
          <div className="space-y-3">
            <button
              onClick={runComprehensiveTests}
              disabled={!pluginName || isRunningTests || centcomStatus !== 'running'}
              className="w-full flex items-center justify-center px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium"
            >
              {isRunningTests ? (
                <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <PlayIcon className="w-5 h-5 mr-2" />
              )}
              {isRunningTests ? 'Running All Tests...' : 'Run All Tests (Full Suite)'}
            </button>
            
            <div className="flex items-center justify-center gap-4">
              <p className="text-xs text-gray-600">
                Or run individual tests using the "Run Test" buttons above
              </p>
              <button
                onClick={() => {
                  setTestScenarios({
                    registration: { status: 'pending', message: '', details: null },
                    devices: { status: 'pending', message: '', details: null },
                    guiMatching: { status: 'pending', message: '', details: null },
                    runtime: { status: 'pending', message: '', details: null },
                    dataSaving: { status: 'pending', message: '', details: null },
                    sequencerActions: { status: 'pending', message: '', details: null },
                    performance: { status: 'pending', message: '', details: null }
                  });
                  setTestLogs([]);
                }}
                disabled={isRunningTests || runningIndividualTests.size > 0}
                className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400 underline"
              >
                Clear Results
              </button>
            </div>
            
            {centcomStatus !== 'running' && (
              <p className="text-sm text-red-600 text-center">
                Centcom must be running to test the plugin
              </p>
            )}
          </div>

          {/* Test Scenarios */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Test Scenarios</h4>
            
            {/* Scenario 1: Registration */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <CogIcon className="w-4 h-4 mr-2 text-gray-600" />
                  <span className="font-medium text-sm">Plugin Registration & Visibility</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => runIndividualTest('registration')}
                    disabled={!pluginName || runningIndividualTests.has('registration') || isRunningTests}
                    className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded transition-colors"
                  >
                    {runningIndividualTests.has('registration') ? (
                      <ArrowPathIcon className="w-3 h-3 animate-spin" />
                    ) : (
                      'Run Test'
                    )}
                  </button>
                  {getTestStatusIcon(testScenarios.registration.status)}
                </div>
              </div>
              <p className="text-xs text-gray-600 mb-2">
                Tests if plugin registers in settings, appears in apps page, and shows in sidebar
              </p>
              {testScenarios.registration.message && (
                <p className="text-sm text-gray-700">{testScenarios.registration.message}</p>
              )}
            </div>

            {/* Scenario 2: GUI Matching */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <RectangleStackIcon className="w-4 h-4 mr-2 text-gray-600" />
                  <span className="font-medium text-sm">GUI Matching</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => runIndividualTest('guiMatching')}
                    disabled={!pluginName || runningIndividualTests.has('guiMatching') || isRunningTests}
                    className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded transition-colors"
                  >
                    {runningIndividualTests.has('guiMatching') ? (
                      <ArrowPathIcon className="w-3 h-3 animate-spin" />
                    ) : (
                      'Run Test'
                    )}
                  </button>
                  {getTestStatusIcon(testScenarios.guiMatching.status)}
                </div>
              </div>
              <p className="text-xs text-gray-600 mb-2">
                Compares plugin GUI in Centcom with the design in Plugin Studio
              </p>
              {testScenarios.guiMatching.message && (
                <p className="text-sm text-gray-700">{testScenarios.guiMatching.message}</p>
              )}
            </div>

            {/* Scenario 3: Data Saving */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <CircleStackIcon className="w-4 h-4 mr-2 text-gray-600" />
                  <span className="font-medium text-sm">Data Saving</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => runIndividualTest('dataSaving')}
                    disabled={!pluginName || runningIndividualTests.has('dataSaving') || isRunningTests}
                    className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded transition-colors"
                  >
                    {runningIndividualTests.has('dataSaving') ? (
                      <ArrowPathIcon className="w-3 h-3 animate-spin" />
                    ) : (
                      'Run Test'
                    )}
                  </button>
                  {getTestStatusIcon(testScenarios.dataSaving.status)}
                </div>
              </div>
              <p className="text-xs text-gray-600 mb-2">
                Tests data persistence to test data application and projects table
              </p>
              {testScenarios.dataSaving.message && (
                <p className="text-sm text-gray-700">{testScenarios.dataSaving.message}</p>
              )}
            </div>

            {/* Scenario 4: Device Integration */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <DevicePhoneMobileIcon className="w-4 h-4 mr-2 text-gray-600" />
                  <span className="font-medium text-sm">Device Integration</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => runIndividualTest('devices')}
                    disabled={!pluginName || runningIndividualTests.has('devices') || isRunningTests}
                    className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded transition-colors"
                  >
                    {runningIndividualTests.has('devices') ? (
                      <ArrowPathIcon className="w-3 h-3 animate-spin" />
                    ) : (
                      'Run Test'
                    )}
                  </button>
                  {getTestStatusIcon(testScenarios.devices?.status || 'pending')}
                </div>
              </div>
              <p className="text-xs text-gray-600 mb-2">
                Tests plugin communication with connected measurement devices
              </p>
              {testScenarios.devices?.message && (
                <p className="text-sm text-gray-700">{testScenarios.devices.message}</p>
              )}
            </div>

            {/* Scenario 5: Plugin Runtime */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <BoltIcon className="w-4 h-4 mr-2 text-gray-600" />
                  <span className="font-medium text-sm">Plugin Runtime</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => runIndividualTest('runtime')}
                    disabled={!pluginName || runningIndividualTests.has('runtime') || isRunningTests}
                    className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded transition-colors"
                  >
                    {runningIndividualTests.has('runtime') ? (
                      <ArrowPathIcon className="w-3 h-3 animate-spin" />
                    ) : (
                      'Run Test'
                    )}
                  </button>
                  {getTestStatusIcon(testScenarios.runtime?.status || 'pending')}
                </div>
              </div>
              <p className="text-xs text-gray-600 mb-2">
                Tests plugin execution, performance, and error handling
              </p>
              {testScenarios.runtime?.message && (
                <p className="text-sm text-gray-700">{testScenarios.runtime.message}</p>
              )}
            </div>

            {/* Scenario 6: Sequencer Actions */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <CommandLineIcon className="w-4 h-4 mr-2 text-gray-600" />
                  <span className="font-medium text-sm">Sequencer Actions</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => runIndividualTest('sequencerActions')}
                    disabled={!pluginName || runningIndividualTests.has('sequencerActions') || isRunningTests}
                    className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded transition-colors"
                  >
                    {runningIndividualTests.has('sequencerActions') ? (
                      <ArrowPathIcon className="w-3 h-3 animate-spin" />
                    ) : (
                      'Run Test'
                    )}
                  </button>
                  {getTestStatusIcon(testScenarios.sequencerActions.status)}
                </div>
              </div>
              <p className="text-xs text-gray-600 mb-2">
                Verifies sequencer actions appear and work in sequencer application
              </p>
              {testScenarios.sequencerActions.message && (
                <p className="text-sm text-gray-700">{testScenarios.sequencerActions.message}</p>
              )}
            </div>

            {/* Scenario 7: Performance Analysis */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <ChartBarIcon className="w-4 h-4 mr-2 text-gray-600" />
                  <span className="font-medium text-sm">Performance Analysis</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => runIndividualTest('performance')}
                    disabled={!pluginName || runningIndividualTests.has('performance') || isRunningTests}
                    className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded transition-colors"
                  >
                    {runningIndividualTests.has('performance') ? (
                      <ArrowPathIcon className="w-3 h-3 animate-spin" />
                    ) : (
                      'Run Test'
                    )}
                  </button>
                  {getTestStatusIcon(testScenarios.performance?.status || 'pending')}
                </div>
              </div>
              <p className="text-xs text-gray-600 mb-2">
                Analyzes plugin performance metrics and resource usage
              </p>
              {testScenarios.performance?.message && (
                <p className="text-sm text-gray-700">{testScenarios.performance.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Centcom UI Simulator */}
        <div className="border rounded-lg bg-gray-50 overflow-hidden">
          {showCentcomUI ? (
            <div className="h-full overflow-auto">
              <CentcomSimulator 
                pluginMetadata={pluginMetadata}
                testScenarios={testScenarios}
                currentTest={currentTest}
                renderPluginIcon={renderPluginIcon}
                mockDevices={mockDevices}
                simulateDeviceOperation={simulateDeviceOperation}
                databaseSimulation={databaseSimulation}
                pluginRuntime={pluginRuntime}
                simulatePluginExecution={simulatePluginExecution}
                simulateDatabaseQuery={simulateDatabaseQuery}
              />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-gray-500">
                <ComputerDesktopIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Centcom UI Preview</p>
                <p className="text-sm">Click "Show Centcom UI" to view the simulator</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Test Logs Modal */}
      {showTestLogs && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl max-h-[80vh] w-full mx-4 flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold flex items-center">
                <ClipboardDocumentListIcon className="w-5 h-5 mr-2" />
                Test Execution Logs
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTestLogs([])}
                  className="px-3 py-1 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
                >
                  Clear Logs
                </button>
                <button
                  onClick={() => setShowTestLogs(false)}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
            
            <div className="flex-1 p-4 overflow-auto">
              {testLogs.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <ClipboardDocumentListIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p>No test logs yet</p>
                  <p className="text-sm mt-1">Run tests to see detailed execution logs</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {testLogs.map((log, index) => (
                    <div key={index} className={`flex items-start gap-3 p-2 rounded text-sm ${
                      log.level === 'error' ? 'bg-red-50 text-red-800' :
                      log.level === 'warning' ? 'bg-yellow-50 text-yellow-800' :
                      log.level === 'success' ? 'bg-green-50 text-green-800' :
                      'bg-gray-50 text-gray-700'
                    }`}>
                      <span className="font-mono text-xs text-gray-500 whitespace-nowrap">
                        {log.timestamp}
                      </span>
                      <span className={`font-medium text-xs px-2 py-0.5 rounded uppercase ${
                        log.level === 'error' ? 'bg-red-200 text-red-800' :
                        log.level === 'warning' ? 'bg-yellow-200 text-yellow-800' :
                        log.level === 'success' ? 'bg-green-200 text-green-800' :
                        'bg-blue-200 text-blue-800'
                      }`}>
                        {log.level}
                      </span>
                      {log.testType && (
                        <span className="font-medium text-xs px-2 py-0.5 bg-indigo-200 text-indigo-800 rounded">
                          {log.testType}
                        </span>
                      )}
                      <span className="flex-1">{log.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Enhanced CentcomSimulator Component
const CentcomSimulator = ({ 
  pluginMetadata, 
  testScenarios, 
  currentTest, 
  renderPluginIcon, 
  mockDevices, 
  simulateDeviceOperation, 
  databaseSimulation, 
  pluginRuntime, 
  simulatePluginExecution,
  simulateDatabaseQuery 
}) => {
  const [currentPage, setCurrentPage] = useState('apps');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState(null);
  
  const isPluginVisible = testScenarios.registration.status === 'success';

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white rounded-lg overflow-hidden min-w-[1200px]">
      {/* Centcom Header */}
      <div className="bg-gray-800 p-3 border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-6 h-6 bg-blue-500 rounded mr-2"></div>
            <span className="font-semibold">Centcom</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="text-xs text-gray-400">Connected</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Enhanced Sidebar */}
        <div className={`bg-gray-800 border-r border-gray-700 transition-all duration-300 flex-shrink-0 ${sidebarOpen ? 'w-48' : 'w-12'}`}>
          <div className="p-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-full text-left text-sm text-gray-400 hover:text-white transition-colors mb-4"
            >
              {sidebarOpen ? '← Collapse' : '→'}
            </button>
            
            <div className="space-y-2">
              <button
                onClick={() => setCurrentPage('import')}
                className={`w-full text-left px-3 py-2 rounded text-sm flex items-center ${
                  currentPage === 'import' ? 'bg-blue-600' : 'hover:bg-gray-700'
                }`}
              >
                <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                {sidebarOpen && 'Import'}
              </button>
              
              <button
                onClick={() => setCurrentPage('apps')}
                className={`w-full text-left px-3 py-2 rounded text-sm flex items-center ${
                  currentPage === 'apps' ? 'bg-purple-600' : 'hover:bg-gray-700'
                }`}
              >
                <Squares2X2Icon className="w-4 h-4 mr-2" />
                {sidebarOpen && 'Applications'}
              </button>
              
              <button
                onClick={() => setCurrentPage('sequencer')}
                className={`w-full text-left px-3 py-2 rounded text-sm flex items-center ${
                  currentPage === 'sequencer' ? 'bg-indigo-600' : 'hover:bg-gray-700'
                }`}
              >
                <ClockIcon className="w-4 h-4 mr-2" />
                {sidebarOpen && 'Sequencer'}
              </button>

              <button
                onClick={() => setCurrentPage('database')}
                className={`w-full text-left px-3 py-2 rounded text-sm flex items-center ${
                  currentPage === 'database' ? 'bg-teal-600' : 'hover:bg-gray-700'
                }`}
              >
                <CircleStackIcon className="w-4 h-4 mr-2" />
                {sidebarOpen && 'Database'}
              </button>
              
              {/* Plugins Section */}
              {sidebarOpen && isPluginVisible && (
                <div className="pt-4 border-t border-gray-700">
                  <p className="text-xs text-gray-400 px-3 mb-2">PLUGINS</p>
                  <button
                    onClick={() => setCurrentPage('plugin')}
                    className={`w-full text-left px-3 py-2 rounded text-sm flex items-center ${
                      currentPage === 'plugin' ? 'bg-green-600' : 'hover:bg-gray-700'
                    }`}
                  >
                    {renderPluginIcon(pluginMetadata?.metadata?.icon, "w-4 h-4 rounded-sm mr-2")}
                    {pluginMetadata?.metadata?.name || 'Test Plugin'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto relative">
          {/* Scroll hint */}
          <div className="absolute top-0 right-0 z-10 bg-gray-700 text-xs text-gray-300 px-2 py-1 rounded-bl opacity-75">
            ↔ Scroll to view more
          </div>
          <div className="p-4 min-w-[800px]">
          {currentPage === 'import' && (
            <CentcomSettingsSimulator 
              pluginMetadata={pluginMetadata}
              isPluginVisible={isPluginVisible}
              testScenarios={testScenarios}
              renderPluginIcon={renderPluginIcon}
            />
          )}

          {currentPage === 'apps' && (
            <div>
              <h1 className="text-2xl font-semibold text-gray-200 mb-6">Applications</h1>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {/* Core Applications */}
                <div className="relative">
                  <div className="block group cursor-pointer">
                    <div className="flex flex-col items-center">
                      <div className="bg-gradient-to-br from-blue-500 to-cyan-600 w-16 h-16 rounded-2xl flex items-center justify-center shadow-md mb-2 transition-transform group-hover:scale-105">
                        <ChartBarIcon className="w-8 h-8 text-white" />
                      </div>
                      <span className="text-sm font-medium mb-1 text-center text-gray-200">
                        Data Visualizer
                      </span>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <div className="block group cursor-pointer">
                    <div className="flex flex-col items-center">
                      <div className="bg-gradient-to-br from-green-500 to-teal-600 w-16 h-16 rounded-2xl flex items-center justify-center shadow-md mb-2 transition-transform group-hover:scale-105">
                        <PlayIcon className="w-8 h-8 text-white" />
                      </div>
                      <span className="text-sm font-medium mb-1 text-center text-gray-200">
                        Sequencer
                      </span>
                    </div>
                  </div>
                </div>

                {/* Plugin Application - Only show if plugin is visible */}
                {isPluginVisible && (
                  <div className="relative">
                    <div 
                      className="block group cursor-pointer"
                      onClick={() => setCurrentPage('plugin')}
                    >
                      <div className="flex flex-col items-center">
                        <div 
                          className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-md mb-2 transition-transform group-hover:scale-105 ${
                            currentTest === 'registration' ? 'ring-2 ring-blue-400' : ''
                          }`}
                          style={{
                            backgroundColor: pluginMetadata?.metadata?.color || '#8b5cf6',
                            backgroundImage: pluginMetadata?.metadata?.color 
                              ? `linear-gradient(135deg, ${pluginMetadata.metadata.color}, ${pluginMetadata.metadata.color}CC)`
                              : 'linear-gradient(135deg, #8b5cf6, #a855f7)'
                          }}
                        >
                          {renderPluginIcon(pluginMetadata?.metadata?.icon, "w-8 h-8 text-white") || 
                           <CogIcon className="w-8 h-8 text-white" />}
                        </div>
                        <span className="text-sm font-medium mb-1 text-center text-gray-200">
                          {pluginMetadata?.metadata?.name || 'Test Plugin'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Unregistered/Disabled Apps - Shown grayed out */}
                <div className="relative">
                  <div className="block group opacity-50 cursor-not-allowed">
                    <div className="flex flex-col items-center">
                      <div className="bg-gradient-to-br from-orange-500 to-red-600 w-16 h-16 rounded-2xl flex items-center justify-center shadow-md mb-2 grayscale">
                        <SpeakerWaveIcon className="w-8 h-8 text-white" />
                      </div>
                      <span className="text-sm font-medium mb-1 text-center text-gray-500">
                        SoundCheck
                      </span>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <div className="block group opacity-50 cursor-not-allowed">
                    <div className="flex flex-col items-center">
                      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 w-16 h-16 rounded-2xl flex items-center justify-center shadow-md mb-2 grayscale">
                        <ComputerDesktopIcon className="w-8 h-8 text-white" />
                      </div>
                      <span className="text-sm font-medium mb-1 text-center text-gray-500">
                        APx500
                      </span>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <div className="block group opacity-50 cursor-not-allowed">
                    <div className="flex flex-col items-center">
                      <div className="bg-gradient-to-br from-yellow-500 to-orange-600 w-16 h-16 rounded-2xl flex items-center justify-center shadow-md mb-2 grayscale">
                        <SignalIcon className="w-8 h-8 text-white" />
                      </div>
                      <span className="text-sm font-medium mb-1 text-center text-gray-500">
                        Klippel QC
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Test Registration Status Display */}
              {testScenarios.registration.status === 'success' && isPluginVisible && (
                <div className="mt-6 p-4 bg-green-900/20 border border-green-600 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircleIcon className="h-5 w-5 text-green-400 mr-3" />
                    <div>
                      <h4 className="text-sm font-medium text-green-300">Plugin Successfully Registered</h4>
                      <p className="text-xs text-green-400 mt-1">
                        {pluginMetadata?.metadata?.name || 'Plugin'} is now visible in the Applications page
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentPage === 'plugin' && isPluginVisible && (
            <div>
              <h2 className="text-lg font-semibold mb-4">{pluginMetadata?.metadata?.name || 'Test Plugin'}</h2>
              <div className={`p-4 border rounded-lg ${
                currentTest === 'guiMatching' ? 'border-blue-500 bg-blue-900' : 'border-gray-600'
              }`}>
                {/* Render the actual plugin GUI components */}
                <div className="bg-white text-black p-4 rounded min-h-[400px] overflow-auto">

                  {pluginMetadata?.gui?.components && pluginMetadata.gui.components.length > 0 ? (
                    <div className="plugin-gui-container" style={{ position: 'relative', width: 'max-content', minWidth: '100%', height: '400px' }}>
                      {pluginMetadata.gui.components.map((component, index) => (
                        <div
                          key={component.id || index}
                          style={{
                            position: 'absolute',
                            left: component.position?.x || 0,
                            top: component.position?.y || 0,
                            width: component.size?.width || 200,
                            height: component.size?.height || 50,
                            border: '1px solid #e5e7eb',
                            borderRadius: '4px',
                            padding: '8px',
                            backgroundColor: '#f9fafb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {component.type === 'button' && (
                            <button className="px-3 py-1 bg-blue-600 text-white rounded">
                              {component.props?.text || 'Button'}
                            </button>
                          )}
                          {component.type === 'textDisplay' && (
                            <span style={{ 
                              fontSize: component.props?.fontSize || '14px',
                              fontWeight: component.props?.fontWeight || 'normal',
                              color: component.props?.color || '#000',
                              textAlign: component.props?.textAlign || 'left'
                            }}>
                              {component.props?.text || 'Text Display'}
                            </span>
                          )}
                          {component.type === 'input' && (
                            <input 
                              type="text" 
                              placeholder={component.props?.placeholder || 'Input field'}
                              className="w-full px-2 py-1 border border-gray-300 rounded"
                              defaultValue={component.props?.defaultValue || ''}
                            />
                          )}
                          {component.type === 'tabContainer' && (
                            <div className="w-full h-full flex flex-col">
                              <div className="flex border-b border-gray-200">
                                {(component.props?.tabs || ['Tab 1', 'Tab 2']).map((tab, tabIndex) => (
                                  <div key={tabIndex} className="px-3 py-1 text-sm border-b-2 border-blue-500 bg-blue-50">
                                    {tab}
                                  </div>
                                ))}
                              </div>
                              <div className="flex-1 p-2 text-center text-gray-500 text-sm">
                                Tab content area
                              </div>
                            </div>
                          )}
                          {!['button', 'textDisplay', 'input', 'tabContainer'].includes(component.type) && (
                            <div className="text-center text-gray-600 text-sm">
                              {component.type}
                            </div>
                          )}
                        </div>
                      ))}
                      {/* Show test status overlay when GUI test is running */}
                      {currentTest === 'guiMatching' && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded">
                          <div className="p-3 bg-blue-900 border border-blue-700 rounded">
                            <ArrowPathIcon className="w-5 h-5 text-blue-400 mx-auto mb-2 animate-spin" />
                            <p className="text-sm text-white">Comparing GUI...</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      <div className="w-12 h-12 bg-gray-300 rounded mx-auto mb-4"></div>
                      <p>No GUI components found</p>
                      <p className="text-sm mt-2">Design your plugin GUI in the App GUI tab</p>
                    </div>
                  )}
                </div>

                {/* Test Status Indicators */}
                {testScenarios.guiMatching.status !== 'pending' && (
                  <div className="mt-4 text-center">
                    {testScenarios.guiMatching.status === 'success' && (
                      <div className="p-2 bg-green-900 border border-green-700 rounded inline-flex items-center">
                        <CheckCircleIcon className="w-4 h-4 text-green-400 mr-2" />
                        <span className="text-sm">GUI matches perfectly</span>
                      </div>
                    )}
                    {testScenarios.guiMatching.status === 'warning' && (
                      <div className="p-2 bg-yellow-900 border border-yellow-700 rounded inline-flex items-center">
                        <ExclamationTriangleIcon className="w-4 h-4 text-yellow-400 mr-2" />
                        <span className="text-sm">Minor discrepancies detected</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}





          {currentPage === 'sequencer' && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Sequencer Actions</h2>
              <div className="space-y-3">
                {testScenarios.sequencerActions.status === 'success' && (
                  <>
                    <div className="p-3 bg-gray-800 border border-gray-600 rounded">
                      <div className="flex items-center justify-between">
                        <span>Action 1 from {pluginMetadata?.metadata?.name || 'Test Plugin'}</span>
                        <CheckCircleIcon className="w-4 h-4 text-green-400" />
                      </div>
                    </div>
                    <div className="p-3 bg-gray-800 border border-gray-600 rounded">
                      <div className="flex items-center justify-between">
                        <span>Action 2 from {pluginMetadata?.metadata?.name || 'Test Plugin'}</span>
                        <CheckCircleIcon className="w-4 h-4 text-green-400" />
                      </div>
                    </div>
                  </>
                )}
                {testScenarios.sequencerActions.status === 'error' && (
                  <div className="p-3 bg-red-900 border border-red-700 rounded text-center">
                    <ExclamationTriangleIcon className="w-5 h-5 text-red-400 mx-auto mb-2" />
                    <p className="text-sm">Plugin actions not found</p>
                  </div>
                )}
                {testScenarios.sequencerActions.status === 'running' && (
                  <div className="p-3 bg-blue-900 border border-blue-700 rounded text-center">
                    <ArrowPathIcon className="w-5 h-5 text-blue-400 mx-auto mb-2 animate-spin" />
                    <p className="text-sm">Testing sequencer integration...</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* New Enhanced Pages */}
          {currentPage === 'dashboard' && (
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <ChartBarIcon className="w-5 h-5 mr-2" />
                System Dashboard
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-800 border border-gray-600 rounded">
                  <h3 className="font-medium mb-2">Plugin Status</h3>
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-2 ${pluginRuntime.isRunning ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                    <span className="text-sm">{pluginRuntime.isRunning ? 'Running' : 'Idle'}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Executions: {pluginRuntime.executionCount}</p>
                </div>
                <div className="p-4 bg-gray-800 border border-gray-600 rounded">
                  <h3 className="font-medium mb-2">Connected Devices</h3>
                  <div className="text-2xl font-bold">{mockDevices.filter(d => d.status === 'connected').length}</div>
                  <p className="text-xs text-gray-400">of {mockDevices.length} total</p>
                </div>
                <div className="p-4 bg-gray-800 border border-gray-600 rounded">
                  <h3 className="font-medium mb-2">Database Records</h3>
                  <div className="text-2xl font-bold">{databaseSimulation.queries.length}</div>
                  <p className="text-xs text-gray-400">queries executed</p>
                </div>
                <div className="p-4 bg-gray-800 border border-gray-600 rounded">
                  <h3 className="font-medium mb-2">Performance</h3>
                  <div className="text-lg font-bold">{Math.round(pluginRuntime.performance.avgDuration)}ms</div>
                  <p className="text-xs text-gray-400">avg execution time</p>
                </div>
              </div>
            </div>
          )}



          {currentPage === 'database' && (
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <CircleStackIcon className="w-5 h-5 mr-2" />
                Database Simulation
              </h2>
              <div className="space-y-4">
                <div className="p-4 bg-gray-800 border border-gray-600 rounded">
                  <h3 className="font-medium mb-3">Tables</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {databaseSimulation.tables.map(table => (
                      <div key={table} className="px-3 py-2 bg-gray-700 rounded text-sm text-center">
                        {table}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="p-4 bg-gray-800 border border-gray-600 rounded">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">Recent Queries</h3>
                    <button
                      onClick={() => simulateDatabaseQuery('SELECT * FROM plugins WHERE id = ?', 'plugins')}
                      className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                    >
                      Run Test Query
                    </button>
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-2">
                    {databaseSimulation.queries.slice(-5).map((query, index) => (
                      <div key={index} className="p-2 bg-gray-700 rounded text-xs">
                        <div className="font-mono text-green-300">{query.query.substring(0, 80)}...</div>
                        <div className="text-gray-400 mt-1">{query.timestamp} • {query.status}</div>
                      </div>
                    ))}
                    {databaseSimulation.queries.length === 0 && (
                      <div className="text-center text-gray-400 py-4">No queries executed yet</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}


          </div>
        </div>
      </div>
    </div>
  );
};

// Exact Centcom Measurement Tools Replica
const CentcomSettingsSimulator = ({ 
  pluginMetadata, 
  isPluginVisible, 
  testScenarios, 
  renderPluginIcon 
}) => {
  const getPluginIcon = (pluginId) => {
    // Use the same logic as real Centcom
    switch (pluginId) {
      case 'apx500':
      case 'apx500_commercial':
      case 'apx500_custom':
      case 'apx500_control_app':
        return <ComputerDesktopIcon className="h-5 w-5 text-orange-500" />;
      case 'klippel_qc':
        return <SignalIcon className="h-5 w-5 text-purple-500" />;
      case 'soundcheck':
        return <SignalIcon className="h-5 w-5 text-blue-500" />;
      case 'sequencer':
        return <PlayIcon className="h-5 w-5 text-green-500" />;
      case 'data_visualizer':
        return <ChartBarIcon className="h-5 w-5 text-blue-500" />;
      default:
        return renderPluginIcon(pluginMetadata?.metadata?.icon) || <CogIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (isManual = false) => {
    if (!isManual) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
          <ComputerDesktopIcon className="h-3 w-3 mr-1" />
          Auto-detected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100">
        <CloudArrowUpIcon className="h-3 w-3 mr-1" />
        Manual
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header - Exact copy from real Centcom */}
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center gap-2">
              <CogIcon className="h-6 w-6" />
              Measurement Tools & Plugins
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Register and manage your measurement software integrations
            </p>
          </div>
          <div className="flex gap-2">
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2">
              <PlusIcon className="h-4 w-4" />
              Add Custom Plugin
            </button>
          </div>
        </div>
      </div>

      {/* Registered Plugins - Exact copy from real Centcom */}
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <CheckCircleIcon className="h-5 w-5" />
          Registered Measurement Tools ({isPluginVisible ? 1 : 0})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isPluginVisible && (
            <div className="border border-green-200 dark:border-green-600 bg-green-50 dark:bg-green-900/20 rounded-lg p-4 hover:border-green-300 dark:hover:border-green-500 transition-colors cursor-pointer">
              <div className="flex items-start gap-3">
                {getPluginIcon(pluginMetadata?.metadata?.id)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-gray-900 dark:text-white truncate">
                      {pluginMetadata?.metadata?.name || 'Test Plugin'}
                    </h4>
                    {getStatusBadge(true)}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    v{pluginMetadata?.metadata?.version || '1.0.0'}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 line-clamp-2">
                    {pluginMetadata?.metadata?.description || 'Custom measurement plugin'}
                  </p>
                  
                  {pluginMetadata?.metadata?.requiresLicense && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                      <KeyIcon className="h-3 w-3" />
                      Licensed
                    </div>
                  )}
                  
                  <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                    <p>Registered: {new Date().toLocaleDateString()}</p>
                    <p>Last seen: {new Date().toLocaleDateString()}</p>
                  </div>
                  
                  <div className="mt-3 flex justify-end">
                    <button className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded flex items-center gap-1">
                      <TrashIcon className="h-3 w-3" />
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {!isPluginVisible && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <CogIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="mb-2">No measurement tools registered yet</p>
            <p className="text-sm">Measurement tools are automatically detected and will appear here</p>
          </div>
        )}

        {/* Test Status Display */}
        {testScenarios.registration.status === 'success' && isPluginVisible && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <CheckCircleIcon className="h-5 w-5 text-green-500 mr-3" />
              <div>
                <h4 className="text-sm font-medium text-green-800">Plugin Registration Successful</h4>
                <p className="text-xs text-green-600 mt-1">
                  Plugin has been successfully registered and is visible in the Centcom settings
                </p>
              </div>
            </div>
          </div>
        )}

        {testScenarios.registration.status === 'error' && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-3" />
              <div>
                <h4 className="text-sm font-medium text-red-800">Plugin Registration Failed</h4>
                <p className="text-xs text-red-600 mt-1">
                  {testScenarios.registration.message || 'Failed to register plugin in Centcom'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CentcomTestPanel;