import React from 'react';
import {
  ChartBarIcon,
  PresentationChartLineIcon,
  TableCellsIcon,
  AdjustmentsHorizontalIcon,
  FunnelIcon,
  CalculatorIcon,
  DocumentArrowDownIcon,
  PlayIcon,
  ArrowPathIcon,
  EyeIcon,
  TagIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  InformationCircleIcon,
  SignalIcon
} from '@heroicons/react/24/outline';

// Data Visualizer Template Components matching the Centcom Analytics application
export const DATA_VISUALIZER_TEMPLATE = {
  name: 'Data Visualizer',
  description: 'Complete data visualization interface matching Centcom Analytics application',
  components: [
    {
      id: 'chart_display',
      type: 'chartDisplay',
      props: {
        title: 'Main Chart Area',
        chartType: 'line',
        height: 400,
        showLegend: true,
        legendPosition: 'right',
        autoScale: true,
        gridLines: true,
        backgroundColor: '#ffffff'
      },
      position: { x: 20, y: 80 },
      size: { width: 600, height: 450 }
    },
    {
      id: 'data_table',
      type: 'dataTable',
      props: {
        title: 'Data Table',
        columns: ['Name', 'Value', 'Unit', 'Status'],
        sortable: true,
        filterable: true,
        exportable: true,
        pageSize: 10,
        showPagination: true
      },
      position: { x: 640, y: 80 },
      size: { width: 380, height: 300 }
    },
    {
      id: 'series_controls',
      type: 'seriesControls',
      props: {
        title: 'Series Controls',
        allowRename: true,
        allowColorChange: true,
        allowVisibilityToggle: true,
        contextNaming: false
      },
      position: { x: 640, y: 400 },
      size: { width: 380, height: 200 }
    },
    {
      id: 'filter_panel',
      type: 'filterPanel',
      props: {
        title: 'Active Filters',
        allowMultipleFilters: true,
        filterTypes: ['equals', 'contains', 'range', 'greater_than', 'less_than'],
        quickFilters: true
      },
      position: { x: 20, y: 550 },
      size: { width: 200, height: 250 }
    },
    {
      id: 'limits_panel',
      type: 'limitsPanel',
      props: {
        title: 'Control Limits',
        upperLimits: [],
        lowerLimits: [],
        autoGenerate: true,
        sigmaLevel: 3,
        showOnChart: true
      },
      position: { x: 240, y: 550 },
      size: { width: 200, height: 250 }
    },
    {
      id: 'statistics_panel',
      type: 'statisticsPanel',
      props: {
        title: 'Statistics',
        showMean: true,
        showStdDev: true,
        showMinMax: true,
        showCount: true,
        showPercentiles: true,
        realTimeUpdate: true
      },
      position: { x: 460, y: 550 },
      size: { width: 200, height: 250 }
    },
    {
      id: 'chart_controls',
      type: 'chartControls',
      props: {
        title: 'Chart Settings',
        chartTypes: ['line', 'scatter', 'bar', 'histogram'],
        zoomControls: true,
        panControls: true,
        resetView: true,
        exportChart: true
      },
      position: { x: 680, y: 550 },
      size: { width: 200, height: 250 }
    },
    {
      id: 'data_source',
      type: 'dataSource',
      props: {
        title: 'Data Source',
        sourceType: 'measurement',
        connectionStatus: 'connected',
        autoRefresh: true,
        refreshInterval: 5000
      },
      position: { x: 900, y: 550 },
      size: { width: 180, height: 120 }
    },
    {
      id: 'export_controls',
      type: 'exportControls',
      props: {
        title: 'Export Options',
        formats: ['CSV', 'Excel', 'PDF', 'PNG', 'SVG'],
        includeMetadata: true,
        includeCharts: true
      },
      position: { x: 900, y: 680 },
      size: { width: 180, height: 120 }
    }
  ],
  settings: {
    title: 'Data Visualizer',
    theme: 'light',
    layout: 'dashboard',
    responsive: true,
    realTimeUpdates: true
  }
};

// Individual component definitions for the Data Visualizer template
export const DATA_VISUALIZER_COMPONENTS = {
  'Chart Display': {
    type: 'chartDisplay',
    icon: ChartBarIcon,
    defaultProps: {
      title: 'Chart Display',
      chartType: 'line',
      height: 400,
      showLegend: true,
      legendPosition: 'right',
      autoScale: true,
      gridLines: true,
      backgroundColor: '#ffffff',
      onDataUpdate: 'handleDataUpdate',
      onSeriesSelect: 'handleSeriesSelect'
    },
    category: 'Data Visualization'
  },
  'Data Table': {
    type: 'dataTable',
    icon: TableCellsIcon,
    defaultProps: {
      title: 'Data Table',
      columns: ['Name', 'Value', 'Unit', 'Status'],
      sortable: true,
      filterable: true,
      exportable: true,
      pageSize: 10,
      showPagination: true,
      onRowSelect: 'handleRowSelect',
      onSort: 'handleSort'
    },
    category: 'Data Visualization'
  },
  'Series Controls': {
    type: 'seriesControls',
    icon: AdjustmentsHorizontalIcon,
    defaultProps: {
      title: 'Series Controls',
      allowRename: true,
      allowColorChange: true,
      allowVisibilityToggle: true,
      contextNaming: false,
      onSeriesRename: 'handleSeriesRename',
      onColorChange: 'handleColorChange',
      onVisibilityToggle: 'handleVisibilityToggle'
    },
    category: 'Data Visualization'
  },
  'Filter Panel': {
    type: 'filterPanel',
    icon: FunnelIcon,
    defaultProps: {
      title: 'Active Filters',
      allowMultipleFilters: true,
      filterTypes: ['equals', 'contains', 'range', 'greater_than', 'less_than'],
      quickFilters: true,
      onFilterAdd: 'handleFilterAdd',
      onFilterRemove: 'handleFilterRemove',
      onFilterApply: 'handleFilterApply'
    },
    category: 'Data Visualization'
  },
  'Limits Panel': {
    type: 'limitsPanel',
    icon: ArrowPathIcon,
    defaultProps: {
      title: 'Control Limits',
      upperLimits: [],
      lowerLimits: [],
      autoGenerate: true,
      sigmaLevel: 3,
      showOnChart: true,
      onLimitAdd: 'handleLimitAdd',
      onLimitRemove: 'handleLimitRemove',
      onAutoGenerate: 'handleAutoGenerateLimits'
    },
    category: 'Data Visualization'
  },
  'Statistics Panel': {
    type: 'statisticsPanel',
    icon: CalculatorIcon,
    defaultProps: {
      title: 'Statistics',
      showMean: true,
      showStdDev: true,
      showMinMax: true,
      showCount: true,
      showPercentiles: true,
      realTimeUpdate: true,
      onStatisticSelect: 'handleStatisticSelect'
    },
    category: 'Data Visualization'
  },
  'Chart Controls': {
    type: 'chartControls',
    icon: Cog6ToothIcon,
    defaultProps: {
      title: 'Chart Settings',
      chartTypes: ['line', 'scatter', 'bar', 'histogram'],
      zoomControls: true,
      panControls: true,
      resetView: true,
      exportChart: true,
      onChartTypeChange: 'handleChartTypeChange',
      onZoom: 'handleZoom',
      onPan: 'handlePan',
      onReset: 'handleResetView',
      onExport: 'handleExportChart'
    },
    category: 'Data Visualization'
  },
  'Data Source': {
    type: 'dataSource',
    icon: PlayIcon,
    defaultProps: {
      title: 'Data Source',
      sourceType: 'measurement',
      connectionStatus: 'connected',
      autoRefresh: true,
      refreshInterval: 5000,
      onConnect: 'handleConnect',
      onDisconnect: 'handleDisconnect',
      onRefresh: 'handleRefresh'
    },
    category: 'Data Visualization'
  },
  'Export Controls': {
    type: 'exportControls',
    icon: DocumentArrowDownIcon,
    defaultProps: {
      title: 'Export Options',
      formats: ['CSV', 'Excel', 'PDF', 'PNG', 'SVG'],
      includeMetadata: true,
      includeCharts: true,
      onExport: 'handleExport',
      onFormatChange: 'handleFormatChange'
    },
    category: 'Data Visualization'
  },
  'Comparison View': {
    type: 'comparisonView',
    icon: PresentationChartLineIcon,
    defaultProps: {
      title: 'Measurement Comparison',
      overlayMode: 'separate',
      normalizeData: false,
      showDifferences: true,
      highlightOutliers: true,
      onComparisonModeChange: 'handleComparisonModeChange',
      onNormalizationToggle: 'handleNormalizationToggle'
    },
    category: 'Data Visualization'
  },
  'Metadata Viewer': {
    type: 'metadataViewer',
    icon: TagIcon,
    defaultProps: {
      title: 'Metadata',
      expandedSections: ['Device Info', 'Test Configuration'],
      searchable: true,
      exportable: true,
      onSectionToggle: 'handleSectionToggle',
      onMetadataExport: 'handleMetadataExport'
    },
    category: 'Data Visualization'
  },
  'Live Monitor': {
    type: 'liveMonitor',
    icon: EyeIcon,
    defaultProps: {
      title: 'Live Data Monitor',
      updateInterval: 1000,
      bufferSize: 1000,
      autoScale: true,
      showTimestamp: true,
      pauseOnHover: true,
      onPause: 'handlePause',
      onResume: 'handleResume',
      onClear: 'handleClear'
    },
    category: 'Data Visualization'
  }
};

// Basic Application Template with Title, Description, and Tabs
export const BASIC_APP_TEMPLATE = {
  name: 'Basic Application',
  description: 'Simple application layout with title, description, and tabbed interface',
  components: [
    // Header Section
    {
      id: 'app_title',
      type: 'textDisplay',
      props: {
        text: 'My Plugin Application',
        fontSize: '24px',
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#1f2937'
      },
      position: { x: 20, y: 20 },
      size: { width: 760, height: 40 }
    },
    {
      id: 'app_description',
      type: 'textDisplay',
      props: {
        text: 'This application provides essential functionality for device control and monitoring. Configure settings and manage your devices through the tabs below.',
        fontSize: '14px',
        fontWeight: 'normal',
        textAlign: 'center',
        color: '#6b7280'
      },
      position: { x: 20, y: 70 },
      size: { width: 760, height: 50 }
    },
    
    // Tab Container
    {
      id: 'main_tabs',
      type: 'tabContainer',
      props: {
        tabs: ['General', 'Controls', 'Settings'],
        activeTab: 0,
        tabStyle: 'horizontal',
        showBorder: true
      },
      position: { x: 20, y: 140 },
      size: { width: 760, height: 450 }
    },
    
    // General Tab Components
    {
      id: 'device_info',
      type: 'infoPanel',
      props: {
        title: 'Device Information',
        showIcon: true,
        iconType: 'info',
        backgroundColor: '#f9fafb'
      },
      position: { x: 40, y: 200 },
      size: { width: 350, height: 120 }
    },
    {
      id: 'connection_status',
      type: 'statusIndicator',
      props: {
        label: 'Connection Status',
        status: 'connected',
        showStatusText: true,
        colors: {
          connected: '#10b981',
          disconnected: '#ef4444',
          connecting: '#f59e0b'
        }
      },
      position: { x: 410, y: 200 },
      size: { width: 320, height: 60 }
    },
    {
      id: 'device_metrics',
      type: 'metricsDisplay',
      props: {
        title: 'Device Metrics',
        metrics: [
          { label: 'Temperature', value: '25°C', status: 'normal' },
          { label: 'Voltage', value: '12.5V', status: 'normal' },
          { label: 'Current', value: '2.1A', status: 'warning' }
        ],
        layout: 'grid'
      },
      position: { x: 410, y: 280 },
      size: { width: 320, height: 140 }
    },
    {
      id: 'recent_activity',
      type: 'activityLog',
      props: {
        title: 'Recent Activity',
        maxEntries: 5,
        showTimestamp: true,
        autoRefresh: true
      },
      position: { x: 40, y: 340 },
      size: { width: 350, height: 180 }
    },
    
    // Controls Tab Components
    {
      id: 'device_controls',
      type: 'controlPanel',
      props: {
        title: 'Device Controls',
        layout: 'vertical',
        showLabels: true
      },
      position: { x: 40, y: 200 },
      size: { width: 240, height: 320 }
    },
    {
      id: 'power_button',
      type: 'button',
      props: {
        text: 'Power On/Off',
        variant: 'primary',
        size: 'large',
        disabled: false,
        onClick: 'handlePowerToggle'
      },
      position: { x: 300, y: 200 },
      size: { width: 180, height: 50 }
    },
    {
      id: 'reset_button',
      type: 'button',
      props: {
        text: 'Reset Device',
        variant: 'secondary',
        size: 'medium',
        disabled: false,
        onClick: 'handleReset'
      },
      position: { x: 500, y: 200 },
      size: { width: 140, height: 40 }
    },
    {
      id: 'output_level',
      type: 'slider',
      props: {
        label: 'Output Level',
        min: 0,
        max: 100,
        value: 75,
        step: 1,
        showValue: true,
        unit: '%',
        onChange: 'handleOutputChange'
      },
      position: { x: 300, y: 270 },
      size: { width: 340, height: 60 }
    },
    {
      id: 'frequency_input',
      type: 'input',
      props: {
        label: 'Frequency (Hz)',
        placeholder: '1000',
        type: 'number',
        required: false,
        value: '1000',
        onChange: 'handleFrequencyChange'
      },
      position: { x: 300, y: 350 },
      size: { width: 160, height: 70 }
    },
    {
      id: 'waveform_select',
      type: 'select',
      props: {
        label: 'Waveform',
        options: ['Sine', 'Square', 'Triangle', 'Sawtooth'],
        value: 'Sine',
        onChange: 'handleWaveformChange'
      },
      position: { x: 480, y: 350 },
      size: { width: 160, height: 70 }
    },
    {
      id: 'enable_output',
      type: 'toggle',
      props: {
        label: 'Enable Output',
        checked: true,
        onChange: 'handleOutputToggle'
      },
      position: { x: 300, y: 450 },
      size: { width: 200, height: 40 }
    },
    
    // Settings Tab Components
    {
      id: 'general_settings',
      type: 'settingsGroup',
      props: {
        title: 'General Settings',
        collapsible: false
      },
      position: { x: 40, y: 200 },
      size: { width: 340, height: 200 }
    },
    {
      id: 'device_name',
      type: 'input',
      props: {
        label: 'Device Name',
        placeholder: 'Enter device name',
        type: 'text',
        required: true,
        value: 'My Device',
        onChange: 'handleDeviceNameChange'
      },
      position: { x: 60, y: 240 },
      size: { width: 300, height: 60 }
    },
    {
      id: 'auto_connect',
      type: 'toggle',
      props: {
        label: 'Auto Connect on Startup',
        checked: false,
        onChange: 'handleAutoConnectChange'
      },
      position: { x: 60, y: 320 },
      size: { width: 250, height: 40 }
    },
    {
      id: 'advanced_settings',
      type: 'settingsGroup',
      props: {
        title: 'Advanced Settings',
        collapsible: true,
        collapsed: false
      },
      position: { x: 400, y: 200 },
      size: { width: 340, height: 280 }
    },
    {
      id: 'timeout_setting',
      type: 'input',
      props: {
        label: 'Connection Timeout (ms)',
        placeholder: '5000',
        type: 'number',
        required: false,
        value: '5000',
        onChange: 'handleTimeoutChange'
      },
      position: { x: 420, y: 240 },
      size: { width: 300, height: 60 }
    },
    {
      id: 'debug_mode',
      type: 'toggle',
      props: {
        label: 'Enable Debug Mode',
        checked: false,
        onChange: 'handleDebugModeChange'
      },
      position: { x: 420, y: 320 },
      size: { width: 200, height: 40 }
    },
    {
      id: 'log_level',
      type: 'select',
      props: {
        label: 'Log Level',
        options: ['Error', 'Warning', 'Info', 'Debug'],
        value: 'Info',
        onChange: 'handleLogLevelChange'
      },
      position: { x: 420, y: 380 },
      size: { width: 200, height: 70 }
    },
    {
      id: 'save_settings',
      type: 'button',
      props: {
        text: 'Save Settings',
        variant: 'primary',
        size: 'medium',
        disabled: false,
        onClick: 'handleSaveSettings'
      },
      position: { x: 640, y: 380 },
      size: { width: 120, height: 40 }
    }
  ],
  settings: {
    title: 'Basic Application',
    theme: 'light',
    layout: 'tabbed',
    responsive: true,
    tabNavigation: true
  }
};

// Additional components for the Basic App Template
export const BASIC_APP_COMPONENTS = {
  'Text Display': {
    type: 'textDisplay',
    icon: DocumentTextIcon,
    defaultProps: {
      text: 'Sample Text',
      fontSize: '16px',
      fontWeight: 'normal',
      textAlign: 'left',
      color: '#374151'
    },
    category: 'Basic'
  },
  'Tab Container': {
    type: 'tabContainer',
    icon: TableCellsIcon,
    defaultProps: {
      tabs: ['Tab 1', 'Tab 2', 'Tab 3'],
      activeTab: 0,
      tabStyle: 'horizontal',
      showBorder: true,
      onTabChange: 'handleTabChange'
    },
    category: 'Basic'
  },
  'Info Panel': {
    type: 'infoPanel',
    icon: InformationCircleIcon,
    defaultProps: {
      title: 'Information',
      showIcon: true,
      iconType: 'info',
      backgroundColor: '#f9fafb',
      borderColor: '#e5e7eb'
    },
    category: 'Basic'
  },
  'Status Indicator': {
    type: 'statusIndicator',
    icon: SignalIcon,
    defaultProps: {
      label: 'Status',
      status: 'normal',
      showStatusText: true,
      colors: {
        normal: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444'
      }
    },
    category: 'Basic'
  },
  'Metrics Display': {
    type: 'metricsDisplay',
    icon: ChartBarIcon,
    defaultProps: {
      title: 'Metrics',
      metrics: [
        { label: 'Value 1', value: '100', status: 'normal' },
        { label: 'Value 2', value: '75', status: 'warning' }
      ],
      layout: 'list'
    },
    category: 'Basic'
  },
  'Activity Log': {
    type: 'activityLog',
    icon: DocumentTextIcon,
    defaultProps: {
      title: 'Activity Log',
      maxEntries: 10,
      showTimestamp: true,
      autoRefresh: false,
      onClear: 'handleClearLog'
    },
    category: 'Basic'
  },
  'Control Panel': {
    type: 'controlPanel',
    icon: AdjustmentsHorizontalIcon,
    defaultProps: {
      title: 'Controls',
      layout: 'horizontal',
      showLabels: true,
      groupControls: false
    },
    category: 'Basic'
  },
  'Settings Group': {
    type: 'settingsGroup',
    icon: Cog6ToothIcon,
    defaultProps: {
      title: 'Settings',
      collapsible: true,
      collapsed: false,
      showBorder: true
    },
    category: 'Basic'
  },
  'Slider': {
    type: 'slider',
    icon: AdjustmentsHorizontalIcon,
    defaultProps: {
      label: 'Slider',
      min: 0,
      max: 100,
      value: 50,
      step: 1,
      showValue: true,
      unit: '',
      onChange: 'handleSliderChange'
    },
    category: 'Basic'
  }
};

// Template application functions
export const applyDataVisualizerTemplate = () => {
  return DATA_VISUALIZER_TEMPLATE;
};

export const applyBasicAppTemplate = () => {
  return BASIC_APP_TEMPLATE;
};