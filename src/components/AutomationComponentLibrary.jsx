import React from 'react';
import {
  DevicePhoneMobileIcon,
  WifiIcon,
  RadioIcon,
  PresentationChartLineIcon,
  TableCellsIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  CogIcon,
  BoltIcon,
  CloudIcon,
  CircleStackIcon,
  CpuChipIcon,
  SignalIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  DocumentChartBarIcon,
  ChartBarIcon,
  Square3Stack3DIcon,
} from '@heroicons/react/24/outline';

// Enhanced component library with automation and device-specific components
export const AUTOMATION_COMPONENT_LIBRARY = {
  // Device Connection Components
  'Device Connector': {
    type: 'deviceConnector',
    icon: DevicePhoneMobileIcon,
    defaultProps: {
      deviceType: 'Generic Device',
      connectionType: 'USB',
      autoConnect: false,
      retryAttempts: 3,
      status: 'disconnected',
      onConnect: 'handleDeviceConnect',
      onDisconnect: 'handleDeviceDisconnect'
    },
    category: 'Device Control'
  },
  
  'WiFi Controller': {
    type: 'wifiController',
    icon: WifiIcon,
    defaultProps: {
      ssid: '',
      signalStrength: 0,
      ipAddress: '',
      autoConnect: true,
      onNetworkChange: 'handleNetworkChange'
    },
    category: 'Device Control'
  },
  
  'Bluetooth Manager': {
    type: 'bluetoothManager',
    icon: RadioIcon,
    defaultProps: {
      pairedDevices: [],
      scanning: false,
      autoConnect: true,
      onDeviceFound: 'handleDeviceFound',
      onPairDevice: 'handlePairDevice'
    },
    category: 'Device Control'
  },

  // Data Acquisition Components
  'Sensor Monitor': {
    type: 'sensorMonitor',
    icon: SignalIcon,
    defaultProps: {
      sensorName: 'Temperature Sensor',
      units: '°C',
      currentValue: 0,
      minValue: -50,
      maxValue: 150,
      precision: 2,
      updateInterval: 1000,
      onValueChange: 'handleSensorUpdate'
    },
    category: 'Data Acquisition'
  },
  
  'Data Logger': {
    type: 'dataLogger',
    icon: CircleStackIcon,
    defaultProps: {
      isLogging: false,
      logInterval: 1000,
      maxEntries: 1000,
      dataSource: 'sensorData',
      exportFormat: 'CSV',
      onStartLogging: 'handleStartLogging',
      onStopLogging: 'handleStopLogging'
    },
    category: 'Data Acquisition'
  },

  'Real-time Chart': {
    type: 'realtimeChart',
    icon: PresentationChartLineIcon,
    defaultProps: {
      title: 'Live Data',
      dataPoints: 100,
      updateInterval: 500,
      yAxisLabel: 'Value',
      xAxisLabel: 'Time',
      chartType: 'line',
      showGrid: true,
      dataSource: 'liveData'
    },
    category: 'Visualization'
  },

  // Automation Control Components
  'Sequence Controller': {
    type: 'sequenceController',
    icon: PlayIcon,
    defaultProps: {
      sequenceName: 'Automation Sequence',
      steps: [],
      currentStep: 0,
      isRunning: false,
      repeatCount: 1,
      onStart: 'handleSequenceStart',
      onStop: 'handleSequenceStop',
      onStepComplete: 'handleStepComplete'
    },
    category: 'Automation'
  },
  
  'Timer Control': {
    type: 'timerControl',
    icon: ClockIcon,
    defaultProps: {
      duration: 60,
      remaining: 0,
      isRunning: false,
      autoReset: false,
      showProgress: true,
      onStart: 'handleTimerStart',
      onStop: 'handleTimerStop',
      onComplete: 'handleTimerComplete'
    },
    category: 'Automation'
  },
  
  'Process Monitor': {
    type: 'processMonitor',
    icon: CpuChipIcon,
    defaultProps: {
      processName: 'Data Processing',
      status: 'idle',
      progress: 0,
      throughput: 0,
      errorsCount: 0,
      warningsCount: 0,
      onStart: 'handleProcessStart',
      onStop: 'handleProcessStop'
    },
    category: 'Automation'
  },

  // Data Analysis Components
  'Statistical Panel': {
    type: 'statisticalPanel',
    icon: DocumentChartBarIcon,
    defaultProps: {
      dataSource: 'analysisData',
      showMean: true,
      showMedian: true,
      showStdDev: true,
      showMinMax: true,
      precision: 3,
      updateFrequency: 'realtime'
    },
    category: 'Analysis'
  },
  
  'Comparison Chart': {
    type: 'comparisonChart',
    icon: PresentationChartLineIcon,
    defaultProps: {
      title: 'Data Comparison',
      datasets: ['Dataset 1', 'Dataset 2'],
      chartType: 'bar',
      showLegend: true,
      enableZoom: true,
      dataSource: 'comparisonData'
    },
    category: 'Analysis'
  },
  
  'Report Generator': {
    type: 'reportGenerator',
    icon: Square3Stack3DIcon,
    defaultProps: {
      templateName: 'Standard Report',
      includeCharts: true,
      includeRawData: false,
      format: 'PDF',
      autoGenerate: false,
      onGenerate: 'handleGenerateReport'
    },
    category: 'Analysis'
  },

  // System Integration Components
  'Centcom Sync': {
    type: 'centcomSync',
    icon: CloudIcon,
    defaultProps: {
      syncInterval: 30000,
      autoSync: true,
      lastSync: null,
      dataTypes: ['measurements', 'devices', 'reports'],
      onSync: 'handleCentcomSync',
      onError: 'handleSyncError'
    },
    category: 'Integration'
  },
  
  'API Connector': {
    type: 'apiConnector',
    icon: BoltIcon,
    defaultProps: {
      endpoint: '',
      method: 'GET',
      headers: {},
      requestInterval: 5000,
      autoRequest: false,
      responseMapping: {},
      onResponse: 'handleApiResponse',
      onError: 'handleApiError'
    },
    category: 'Integration'
  },

  // Status and Feedback Components
  'Status Indicator': {
    type: 'statusIndicator',
    icon: CheckCircleIcon,
    defaultProps: {
      status: 'unknown',
      label: 'System Status',
      showIcon: true,
      showText: true,
      statusMapping: {
        'connected': { color: 'green', text: 'Connected' },
        'disconnected': { color: 'red', text: 'Disconnected' },
        'error': { color: 'red', text: 'Error' },
        'warning': { color: 'yellow', text: 'Warning' }
      }
    },
    category: 'Feedback'
  },
  
  'Alert Panel': {
    type: 'alertPanel',
    icon: ExclamationTriangleIcon,
    defaultProps: {
      alerts: [],
      maxAlerts: 10,
      autoHide: true,
      hideDelay: 5000,
      showTimestamp: true,
      filterLevel: 'all',
      onDismiss: 'handleDismissAlert'
    },
    category: 'Feedback'
  },
  
  'Progress Tracker': {
    type: 'progressTracker',
    icon: ArrowPathIcon,
    defaultProps: {
      steps: ['Step 1', 'Step 2', 'Step 3'],
      currentStep: 0,
      showPercentage: true,
      showStepNames: true,
      orientation: 'horizontal'
    },
    category: 'Feedback'
  }
};

// Component categories for organization
export const AUTOMATION_CATEGORIES = [
  'All',
  'Device Control',
  'Data Acquisition', 
  'Automation',
  'Visualization',
  'Analysis',
  'Integration',
  'Feedback'
];

// Enhanced component renderer for automation components
export const renderAutomationComponent = (component, isSelected, isPreview, onDelete) => {
  const { id, type, props, position, size } = component;

  const componentStyle = {
    position: 'absolute',
    left: position.x,
    top: position.y,
    width: size.width,
    height: size.height,
    border: isSelected ? '2px solid #3b82f6' : '1px solid #d1d5db',
    backgroundColor: '#ffffff',
    borderRadius: '6px',
    padding: '12px',
    cursor: isPreview ? 'default' : 'move',
    boxShadow: isSelected ? '0 0 0 3px rgba(59, 130, 246, 0.1)' : '0 2px 4px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  };

  const renderComponentContent = () => {
    switch (type) {
      case 'deviceConnector':
        return (
          <div className="device-connector">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm">{props.deviceType}</h4>
              <div className={`w-3 h-3 rounded-full ${props.status === 'connected' ? 'bg-green-500' : 'bg-red-500'}`}></div>
            </div>
            <div className="text-xs text-gray-600 mb-2">
              Connection: {props.connectionType}
            </div>
            <button className={`w-full py-1 px-2 text-xs rounded ${props.status === 'connected' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
              {props.status === 'connected' ? 'Disconnect' : 'Connect'}
            </button>
          </div>
        );

      case 'sensorMonitor':
        return (
          <div className="sensor-monitor">
            <div className="text-sm font-medium mb-1">{props.sensorName}</div>
            <div className="text-2xl font-bold text-blue-600 mb-1">
              {props.currentValue.toFixed(props.precision)} {props.units}
            </div>
            <div className="text-xs text-gray-500">
              Range: {props.minValue} - {props.maxValue} {props.units}
            </div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: `${((props.currentValue - props.minValue) / (props.maxValue - props.minValue)) * 100}%` }}
              ></div>
            </div>
          </div>
        );

      case 'realtimeChart':
        return (
          <div className="realtime-chart">
            <h4 className="font-medium text-sm mb-2">{props.title}</h4>
            <div className="flex-1 bg-gray-50 border border-gray-200 rounded flex items-center justify-center">
              <PresentationChartLineIcon className="w-8 h-8 text-gray-400" />
              <span className="ml-2 text-gray-500 text-xs">Live {props.chartType} Chart</span>
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {props.dataPoints} points • {props.updateInterval}ms refresh
            </div>
          </div>
        );

      case 'sequenceController':
        return (
          <div className="sequence-controller">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm">{props.sequenceName}</h4>
              <div className={`w-3 h-3 rounded-full ${props.isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
            </div>
            <div className="text-xs text-gray-600 mb-2">
              Step {props.currentStep + 1} of {props.steps.length || 1}
            </div>
            <div className="flex space-x-1">
              <button className="flex-1 py-1 px-2 text-xs bg-green-100 text-green-700 rounded">
                <PlayIcon className="w-3 h-3 inline mr-1" />Start
              </button>
              <button className="flex-1 py-1 px-2 text-xs bg-red-100 text-red-700 rounded">
                <StopIcon className="w-3 h-3 inline mr-1" />Stop
              </button>
            </div>
          </div>
        );

      case 'dataLogger':
        return (
          <div className="data-logger">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm">Data Logger</h4>
              <div className={`w-3 h-3 rounded-full ${props.isLogging ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`}></div>
            </div>
            <div className="text-xs text-gray-600 mb-2">
              Interval: {props.logInterval}ms • Max: {props.maxEntries}
            </div>
            <button className={`w-full py-1 px-2 text-xs rounded ${props.isLogging ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              {props.isLogging ? 'Stop Logging' : 'Start Logging'}
            </button>
          </div>
        );

      case 'centcomSync':
        return (
          <div className="centcom-sync">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm">Centcom Sync</h4>
              <CloudIcon className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-xs text-gray-600 mb-2">
              Auto-sync: {props.autoSync ? 'Enabled' : 'Disabled'}
            </div>
            <div className="text-xs text-gray-500">
              Last sync: {props.lastSync || 'Never'}
            </div>
            <button className="w-full mt-2 py-1 px-2 text-xs bg-blue-100 text-blue-700 rounded">
              Sync Now
            </button>
          </div>
        );

      case 'statusIndicator':
        return (
          <div className="status-indicator">
            <div className="flex items-center justify-center h-full">
              {props.showIcon && (
                <div className={`w-4 h-4 rounded-full mr-2 ${
                  props.statusMapping[props.status]?.color === 'green' ? 'bg-green-500' :
                  props.statusMapping[props.status]?.color === 'red' ? 'bg-red-500' :
                  props.statusMapping[props.status]?.color === 'yellow' ? 'bg-yellow-500' :
                  'bg-gray-500'
                }`}></div>
              )}
              {props.showText && (
                <div className="text-center">
                  <div className="text-sm font-medium">{props.label}</div>
                  <div className="text-xs text-gray-600">
                    {props.statusMapping[props.status]?.text || props.status}
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center">
            <div className="text-sm font-medium">{type}</div>
            <div className="text-xs text-gray-500">Automation Component</div>
          </div>
        );
    }
  };

  return (
    <div
      key={id}
      style={componentStyle}
      className="automation-component"
    >
      {renderComponentContent()}
      {isSelected && !isPreview && (
        <button
          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(id);
          }}
        >
          ×
        </button>
      )}
    </div>
  );
};

export default {
  AUTOMATION_COMPONENT_LIBRARY,
  AUTOMATION_CATEGORIES,
  renderAutomationComponent
};