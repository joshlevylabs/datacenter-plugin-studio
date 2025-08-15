/**
 * Centcom API Integration Library
 * Provides standardized interfaces for plugin developers to interact with
 * the Centcom application database and device ecosystem
 */

export interface CentcomDevice {
  id: string;
  name: string;
  type: 'USB' | 'WiFi' | 'Bluetooth' | 'Serial' | 'Ethernet';
  status: 'connected' | 'disconnected' | 'error' | 'connecting';
  capabilities: string[];
  metadata: Record<string, any>;
  lastSeen: Date;
}

export interface CentcomMeasurement {
  id: string;
  deviceId: string;
  timestamp: Date;
  type: string;
  value: any;
  units?: string;
  metadata: Record<string, any>;
  tags: string[];
}

export interface CentcomProject {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  devices: string[];
  measurements: string[];
  reports: string[];
  metadata: Record<string, any>;
}

export interface CentcomReport {
  id: string;
  projectId: string;
  name: string;
  type: 'summary' | 'detailed' | 'comparison' | 'trend';
  generatedAt: Date;
  data: any;
  format: 'PDF' | 'CSV' | 'JSON' | 'HTML';
  metadata: Record<string, any>;
}

export interface CentcomSequence {
  id: string;
  name: string;
  steps: CentcomSequenceStep[];
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  repeatCount: number;
  currentStep: number;
  metadata: Record<string, any>;
}

export interface CentcomSequenceStep {
  id: string;
  name: string;
  type: 'device_command' | 'measurement' | 'delay' | 'condition' | 'data_processing';
  parameters: Record<string, any>;
  timeout: number;
  onSuccess?: string;
  onError?: string;
}

/**
 * Main Centcom API Class
 * Provides methods for plugin developers to interact with Centcom services
 */
export class CentcomAPI {
  private static instance: CentcomAPI;
  private pluginId: string;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(pluginId: string) {
    this.pluginId = pluginId;
  }

  static getInstance(pluginId: string): CentcomAPI {
    if (!CentcomAPI.instance) {
      CentcomAPI.instance = new CentcomAPI(pluginId);
    }
    return CentcomAPI.instance;
  }

  // Device Management
  async getDevices(): Promise<CentcomDevice[]> {
    try {
      const response = await fetch('/api/centcom/devices', {
        headers: {
          'X-Plugin-ID': this.pluginId,
          'Content-Type': 'application/json'
        }
      });
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch devices:', error);
      throw new CentcomAPIError('Failed to fetch devices', error);
    }
  }

  async getDevice(deviceId: string): Promise<CentcomDevice | null> {
    try {
      const response = await fetch(`/api/centcom/devices/${deviceId}`, {
        headers: {
          'X-Plugin-ID': this.pluginId,
          'Content-Type': 'application/json'
        }
      });
      if (response.status === 404) return null;
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch device:', error);
      throw new CentcomAPIError('Failed to fetch device', error);
    }
  }

  async connectDevice(deviceId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/centcom/devices/${deviceId}/connect`, {
        method: 'POST',
        headers: {
          'X-Plugin-ID': this.pluginId,
          'Content-Type': 'application/json'
        }
      });
      const result = await response.json();
      this.emit('device:connected', { deviceId, ...result });
      return result.success;
    } catch (error) {
      console.error('Failed to connect device:', error);
      throw new CentcomAPIError('Failed to connect device', error);
    }
  }

  async disconnectDevice(deviceId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/centcom/devices/${deviceId}/disconnect`, {
        method: 'POST',
        headers: {
          'X-Plugin-ID': this.pluginId,
          'Content-Type': 'application/json'
        }
      });
      const result = await response.json();
      this.emit('device:disconnected', { deviceId, ...result });
      return result.success;
    } catch (error) {
      console.error('Failed to disconnect device:', error);
      throw new CentcomAPIError('Failed to disconnect device', error);
    }
  }

  async sendDeviceCommand(deviceId: string, command: string, parameters: any = {}): Promise<any> {
    try {
      const response = await fetch(`/api/centcom/devices/${deviceId}/command`, {
        method: 'POST',
        headers: {
          'X-Plugin-ID': this.pluginId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ command, parameters })
      });
      const result = await response.json();
      this.emit('device:command', { deviceId, command, parameters, result });
      return result;
    } catch (error) {
      console.error('Failed to send device command:', error);
      throw new CentcomAPIError('Failed to send device command', error);
    }
  }

  // Data Management
  async saveMeasurement(measurement: Omit<CentcomMeasurement, 'id'>): Promise<string> {
    try {
      const response = await fetch('/api/centcom/measurements', {
        method: 'POST',
        headers: {
          'X-Plugin-ID': this.pluginId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...measurement,
          timestamp: measurement.timestamp.toISOString()
        })
      });
      const result = await response.json();
      this.emit('measurement:saved', result);
      return result.id;
    } catch (error) {
      console.error('Failed to save measurement:', error);
      throw new CentcomAPIError('Failed to save measurement', error);
    }
  }

  async getMeasurements(filters: {
    deviceId?: string;
    type?: string;
    startDate?: Date;
    endDate?: Date;
    tags?: string[];
    limit?: number;
  } = {}): Promise<CentcomMeasurement[]> {
    try {
      const params = new URLSearchParams();
      if (filters.deviceId) params.append('deviceId', filters.deviceId);
      if (filters.type) params.append('type', filters.type);
      if (filters.startDate) params.append('startDate', filters.startDate.toISOString());
      if (filters.endDate) params.append('endDate', filters.endDate.toISOString());
      if (filters.tags) params.append('tags', filters.tags.join(','));
      if (filters.limit) params.append('limit', filters.limit.toString());

      const response = await fetch(`/api/centcom/measurements?${params}`, {
        headers: {
          'X-Plugin-ID': this.pluginId,
          'Content-Type': 'application/json'
        }
      });
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch measurements:', error);
      throw new CentcomAPIError('Failed to fetch measurements', error);
    }
  }

  async deleteMeasurement(measurementId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/centcom/measurements/${measurementId}`, {
        method: 'DELETE',
        headers: {
          'X-Plugin-ID': this.pluginId,
          'Content-Type': 'application/json'
        }
      });
      const result = await response.json();
      this.emit('measurement:deleted', { measurementId });
      return result.success;
    } catch (error) {
      console.error('Failed to delete measurement:', error);
      throw new CentcomAPIError('Failed to delete measurement', error);
    }
  }

  // Project Management
  async getProjects(): Promise<CentcomProject[]> {
    try {
      const response = await fetch('/api/centcom/projects', {
        headers: {
          'X-Plugin-ID': this.pluginId,
          'Content-Type': 'application/json'
        }
      });
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      throw new CentcomAPIError('Failed to fetch projects', error);
    }
  }

  async createProject(project: Omit<CentcomProject, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const response = await fetch('/api/centcom/projects', {
        method: 'POST',
        headers: {
          'X-Plugin-ID': this.pluginId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(project)
      });
      const result = await response.json();
      this.emit('project:created', result);
      return result.id;
    } catch (error) {
      console.error('Failed to create project:', error);
      throw new CentcomAPIError('Failed to create project', error);
    }
  }

  async addMeasurementToProject(projectId: string, measurementId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/centcom/projects/${projectId}/measurements`, {
        method: 'POST',
        headers: {
          'X-Plugin-ID': this.pluginId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ measurementId })
      });
      const result = await response.json();
      this.emit('project:measurement-added', { projectId, measurementId });
      return result.success;
    } catch (error) {
      console.error('Failed to add measurement to project:', error);
      throw new CentcomAPIError('Failed to add measurement to project', error);
    }
  }

  // Report Generation
  async generateReport(projectId: string, reportConfig: {
    name: string;
    type: 'summary' | 'detailed' | 'comparison' | 'trend';
    format: 'PDF' | 'CSV' | 'JSON' | 'HTML';
    parameters: Record<string, any>;
  }): Promise<string> {
    try {
      const response = await fetch(`/api/centcom/projects/${projectId}/reports`, {
        method: 'POST',
        headers: {
          'X-Plugin-ID': this.pluginId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reportConfig)
      });
      const result = await response.json();
      this.emit('report:generated', result);
      return result.id;
    } catch (error) {
      console.error('Failed to generate report:', error);
      throw new CentcomAPIError('Failed to generate report', error);
    }
  }

  async getReport(reportId: string): Promise<CentcomReport | null> {
    try {
      const response = await fetch(`/api/centcom/reports/${reportId}`, {
        headers: {
          'X-Plugin-ID': this.pluginId,
          'Content-Type': 'application/json'
        }
      });
      if (response.status === 404) return null;
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch report:', error);
      throw new CentcomAPIError('Failed to fetch report', error);
    }
  }

  // Sequence Management
  async createSequence(sequence: Omit<CentcomSequence, 'id' | 'status' | 'currentStep'>): Promise<string> {
    try {
      const response = await fetch('/api/centcom/sequences', {
        method: 'POST',
        headers: {
          'X-Plugin-ID': this.pluginId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sequence)
      });
      const result = await response.json();
      this.emit('sequence:created', result);
      return result.id;
    } catch (error) {
      console.error('Failed to create sequence:', error);
      throw new CentcomAPIError('Failed to create sequence', error);
    }
  }

  async startSequence(sequenceId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/centcom/sequences/${sequenceId}/start`, {
        method: 'POST',
        headers: {
          'X-Plugin-ID': this.pluginId,
          'Content-Type': 'application/json'
        }
      });
      const result = await response.json();
      this.emit('sequence:started', { sequenceId, ...result });
      return result.success;
    } catch (error) {
      console.error('Failed to start sequence:', error);
      throw new CentcomAPIError('Failed to start sequence', error);
    }
  }

  async stopSequence(sequenceId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/centcom/sequences/${sequenceId}/stop`, {
        method: 'POST',
        headers: {
          'X-Plugin-ID': this.pluginId,
          'Content-Type': 'application/json'
        }
      });
      const result = await response.json();
      this.emit('sequence:stopped', { sequenceId, ...result });
      return result.success;
    } catch (error) {
      console.error('Failed to stop sequence:', error);
      throw new CentcomAPIError('Failed to stop sequence', error);
    }
  }

  // Real-time Data Streaming
  async subscribeToDevice(deviceId: string, callback: (data: any) => void): Promise<void> {
    try {
      const ws = new WebSocket(`ws://localhost:8080/api/centcom/devices/${deviceId}/stream?pluginId=${this.pluginId}`);
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        callback(data);
        this.emit('device:data', { deviceId, data });
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.emit('device:stream-error', { deviceId, error });
      };

      // Store WebSocket reference for cleanup
      if (!this.eventListeners.has('websockets')) {
        this.eventListeners.set('websockets', []);
      }
      this.eventListeners.get('websockets')!.push(ws);

    } catch (error) {
      console.error('Failed to subscribe to device:', error);
      throw new CentcomAPIError('Failed to subscribe to device', error);
    }
  }

  // Event Management
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Cleanup
  destroy(): void {
    // Close all WebSocket connections
    const websockets = this.eventListeners.get('websockets') || [];
    websockets.forEach((ws: any) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });

    // Clear all event listeners
    this.eventListeners.clear();
  }
}

/**
 * Custom error class for Centcom API errors
 */
export class CentcomAPIError extends Error {
  public originalError?: any;

  constructor(message: string, originalError?: any) {
    super(message);
    this.name = 'CentcomAPIError';
    this.originalError = originalError;
  }
}

/**
 * Utility functions for plugin developers
 */
export const CentcomUtils = {
  /**
   * Format a measurement value with units
   */
  formatMeasurement(measurement: CentcomMeasurement): string {
    const value = typeof measurement.value === 'number' 
      ? measurement.value.toFixed(2) 
      : measurement.value;
    return measurement.units ? `${value} ${measurement.units}` : value.toString();
  },

  /**
   * Calculate time difference between measurements
   */
  timeDifference(measurement1: CentcomMeasurement, measurement2: CentcomMeasurement): number {
    return Math.abs(measurement1.timestamp.getTime() - measurement2.timestamp.getTime());
  },

  /**
   * Group measurements by device
   */
  groupMeasurementsByDevice(measurements: CentcomMeasurement[]): Record<string, CentcomMeasurement[]> {
    return measurements.reduce((groups, measurement) => {
      if (!groups[measurement.deviceId]) {
        groups[measurement.deviceId] = [];
      }
      groups[measurement.deviceId].push(measurement);
      return groups;
    }, {} as Record<string, CentcomMeasurement[]>);
  },

  /**
   * Calculate basic statistics for numeric measurements
   */
  calculateStatistics(measurements: CentcomMeasurement[]): {
    count: number;
    mean: number;
    median: number;
    min: number;
    max: number;
    stdDev: number;
  } {
    const values = measurements
      .map(m => m.value)
      .filter(v => typeof v === 'number') as number[];

    if (values.length === 0) {
      return { count: 0, mean: 0, median: 0, min: 0, max: 0, stdDev: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];
    
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return {
      count: values.length,
      mean,
      median,
      min: Math.min(...values),
      max: Math.max(...values),
      stdDev
    };
  }
};

// Export a factory function for easy initialization
export const createCentcomAPI = (pluginId: string): CentcomAPI => {
  return CentcomAPI.getInstance(pluginId);
};