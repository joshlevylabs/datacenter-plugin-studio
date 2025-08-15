/**
 * License Storage and Management System
 * Handles local storage, validation, and synchronization of plugin licenses
 */

import { invoke } from '@tauri-apps/api/core';

export interface StoredLicense {
  pluginId: string;
  licenseKey: string;
  installedAt: string;
  lastValidated: string;
  validation: LicenseValidationResult;
  details?: LicenseDetails;
  userEmail?: string;
  source: 'manual' | 'purchase' | 'trial' | 'upgrade';
}

export interface LicenseDetails {
  id: string;
  pluginId: string;
  tierId: string;
  tierName: string;
  userId: string;
  userEmail: string;
  issuedAt: string;
  expiresAt?: string;
  features: string[];
  maxUsers: number;
  metadata: Record<string, any>;
}

export interface LicenseValidationResult {
  valid: boolean;
  expired: boolean;
  revoked: boolean;
  features: string[];
  errors: string[];
  lastChecked: string;
  nextCheck?: string;
  offlineDaysUsed: number;
  remainingTrialDays?: number;
  required?: boolean;
}

export interface LicenseUpgrade {
  fromTier: string;
  toTier: string;
  pluginId: string;
  upgradeKey: string;
  price: number;
  currency: string;
  purchaseUrl?: string;
}

/**
 * License Storage Manager
 */
export class LicenseStorageManager {
  private static instance: LicenseStorageManager;
  private licenses: Map<string, StoredLicense> = new Map();
  private validationCache: Map<string, LicenseValidationResult> = new Map();
  private lastSyncTime: string | null = null;

  private constructor() {
    this.loadFromStorage();
  }

  static getInstance(): LicenseStorageManager {
    if (!LicenseStorageManager.instance) {
      LicenseStorageManager.instance = new LicenseStorageManager();
    }
    return LicenseStorageManager.instance;
  }

  /**
   * Load licenses from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('plugin_licenses');
      if (stored) {
        const data = JSON.parse(stored);
        this.licenses = new Map(Object.entries(data.licenses || {}));
        this.lastSyncTime = data.lastSync || null;
      }
    } catch (error) {
      console.error('Failed to load licenses from storage:', error);
    }
  }

  /**
   * Save licenses to localStorage
   */
  private saveToStorage(): void {
    try {
      const data = {
        licenses: Object.fromEntries(this.licenses),
        lastSync: this.lastSyncTime,
        version: '1.0'
      };
      localStorage.setItem('plugin_licenses', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save licenses to storage:', error);
    }
  }

  /**
   * Install or update a license
   */
  async installLicense(
    pluginId: string, 
    licenseKey: string, 
    source: 'manual' | 'purchase' | 'trial' | 'upgrade' = 'manual',
    userEmail?: string
  ): Promise<StoredLicense> {
    // Validate the license first
    const validation = await this.validateLicense(pluginId, licenseKey);
    
    if (!validation.valid) {
      throw new Error(`License validation failed: ${validation.errors.join(', ')}`);
    }

    // Get license details
    const details = await this.decodeLicense(licenseKey);

    // Create stored license record
    const storedLicense: StoredLicense = {
      pluginId,
      licenseKey,
      installedAt: new Date().toISOString(),
      lastValidated: validation.lastChecked,
      validation,
      details,
      userEmail: userEmail || details?.userEmail,
      source
    };

    // Store the license
    this.licenses.set(pluginId, storedLicense);
    this.validationCache.set(pluginId, validation);
    this.saveToStorage();

    // Update last sync time
    this.lastSyncTime = new Date().toISOString();

    return storedLicense;
  }

  /**
   * Remove a license
   */
  removeLicense(pluginId: string): boolean {
    const removed = this.licenses.delete(pluginId);
    this.validationCache.delete(pluginId);
    
    if (removed) {
      this.saveToStorage();
    }
    
    return removed;
  }

  /**
   * Get a stored license
   */
  getLicense(pluginId: string): StoredLicense | null {
    return this.licenses.get(pluginId) || null;
  }

  /**
   * Get all stored licenses
   */
  getAllLicenses(): StoredLicense[] {
    return Array.from(this.licenses.values());
  }

  /**
   * Get licenses by status
   */
  getLicensesByStatus(status: 'valid' | 'expired' | 'invalid' | 'trial'): StoredLicense[] {
    return this.getAllLicenses().filter(license => {
      switch (status) {
        case 'valid':
          return license.validation.valid && !license.validation.expired;
        case 'expired':
          return license.validation.expired;
        case 'invalid':
          return !license.validation.valid;
        case 'trial':
          return license.validation.remainingTrialDays !== undefined && 
                 license.validation.remainingTrialDays > 0;
        default:
          return false;
      }
    });
  }

  /**
   * Validate a license key
   */
  async validateLicense(pluginId: string, licenseKey: string): Promise<LicenseValidationResult> {
    try {
      const result = await invoke<any>('validate_plugin_license', {
        pluginId,
        licenseKey
      });

      // Convert Tauri result to our interface
      const validation: LicenseValidationResult = {
        valid: result.valid || false,
        expired: result.expired || false,
        revoked: result.revoked || false,
        features: result.features || [],
        errors: result.error ? [result.error] : [],
        lastChecked: new Date().toISOString(),
        offlineDaysUsed: 0
      };

      return validation;
    } catch (error) {
      return {
        valid: false,
        expired: false,
        revoked: false,
        features: [],
        errors: [error.message || 'Validation failed'],
        lastChecked: new Date().toISOString(),
        offlineDaysUsed: 0
      };
    }
  }

  /**
   * Decode license to get details
   */
  async decodeLicense(licenseKey: string): Promise<LicenseDetails | null> {
    try {
      if (!licenseKey.startsWith('LYC-')) {
        return null;
      }

      const encoded = licenseKey.substring(4);
      const decoded = atob(encoded);
      const licenseData = JSON.parse(decoded);

      return licenseData.payload as LicenseDetails;
    } catch (error) {
      console.error('Failed to decode license:', error);
      return null;
    }
  }

  /**
   * Refresh validation for a specific license
   */
  async refreshLicense(pluginId: string): Promise<LicenseValidationResult | null> {
    const license = this.getLicense(pluginId);
    if (!license) {
      return null;
    }

    const validation = await this.validateLicense(pluginId, license.licenseKey);
    
    // Update stored license
    license.validation = validation;
    license.lastValidated = validation.lastChecked;
    this.licenses.set(pluginId, license);
    this.validationCache.set(pluginId, validation);
    this.saveToStorage();

    return validation;
  }

  /**
   * Refresh all licenses
   */
  async refreshAllLicenses(): Promise<{ success: number; failed: number; results: Array<{ pluginId: string; success: boolean; error?: string }> }> {
    const results: Array<{ pluginId: string; success: boolean; error?: string }> = [];
    let success = 0;
    let failed = 0;

    for (const [pluginId] of this.licenses) {
      try {
        await this.refreshLicense(pluginId);
        results.push({ pluginId, success: true });
        success++;
      } catch (error) {
        results.push({ pluginId, success: false, error: error.message });
        failed++;
      }
    }

    this.lastSyncTime = new Date().toISOString();
    this.saveToStorage();

    return { success, failed, results };
  }

  /**
   * Check if a feature is enabled for a plugin
   */
  async isFeatureEnabled(pluginId: string, featureId: string): Promise<boolean> {
    const license = this.getLicense(pluginId);
    
    if (!license || !license.validation.valid) {
      return false;
    }

    return license.validation.features.includes(featureId);
  }

  /**
   * Get plugin license status summary
   */
  getLicenseStatus(pluginId: string): {
    hasLicense: boolean;
    isValid: boolean;
    isExpired: boolean;
    isRevoked: boolean;
    isTrial: boolean;
    daysUntilExpiry?: number;
    trialDaysRemaining?: number;
    tierName?: string;
    features: string[];
  } {
    const license = this.getLicense(pluginId);
    
    if (!license) {
      return {
        hasLicense: false,
        isValid: false,
        isExpired: false,
        isRevoked: false,
        isTrial: false,
        features: []
      };
    }

    const { validation, details } = license;
    let daysUntilExpiry: number | undefined;
    
    if (details?.expiresAt) {
      const expiryDate = new Date(details.expiresAt);
      const now = new Date();
      daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    return {
      hasLicense: true,
      isValid: validation.valid,
      isExpired: validation.expired,
      isRevoked: validation.revoked,
      isTrial: validation.remainingTrialDays !== undefined && validation.remainingTrialDays > 0,
      daysUntilExpiry,
      trialDaysRemaining: validation.remainingTrialDays,
      tierName: details?.tierName,
      features: validation.features
    };
  }

  /**
   * Get licenses expiring soon
   */
  getLicensesExpiringSoon(days: number = 30): StoredLicense[] {
    return this.getAllLicenses().filter(license => {
      if (!license.details?.expiresAt) {
        return false; // Perpetual license
      }

      const expiryDate = new Date(license.details.expiresAt);
      const now = new Date();
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      return daysUntilExpiry <= days && daysUntilExpiry > 0;
    });
  }

  /**
   * Get trial licenses
   */
  getTrialLicenses(): StoredLicense[] {
    return this.getAllLicenses().filter(license => 
      license.validation.remainingTrialDays !== undefined && 
      license.validation.remainingTrialDays > 0
    );
  }

  /**
   * Export licenses for backup
   */
  exportLicenses(): string {
    const exportData = {
      licenses: Array.from(this.licenses.values()),
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import licenses from backup
   */
  async importLicenses(jsonData: string): Promise<{ imported: number; skipped: number; errors: string[] }> {
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    try {
      const importData = JSON.parse(jsonData);
      
      if (!importData.licenses || !Array.isArray(importData.licenses)) {
        throw new Error('Invalid import format');
      }

      for (const license of importData.licenses) {
        try {
          // Validate license structure
          if (!license.pluginId || !license.licenseKey) {
            errors.push(`Skipping invalid license: missing pluginId or licenseKey`);
            skipped++;
            continue;
          }

          // Check if license already exists
          if (this.licenses.has(license.pluginId)) {
            errors.push(`Skipping ${license.pluginId}: license already exists`);
            skipped++;
            continue;
          }

          // Install the license
          await this.installLicense(
            license.pluginId, 
            license.licenseKey, 
            license.source || 'manual',
            license.userEmail
          );
          imported++;
        } catch (error) {
          errors.push(`Failed to import license for ${license.pluginId}: ${error.message}`);
          skipped++;
        }
      }

      return { imported, skipped, errors };
    } catch (error) {
      return { imported: 0, skipped: 0, errors: [`Import failed: ${error.message}`] };
    }
  }

  /**
   * Clear all licenses (with confirmation)
   */
  clearAllLicenses(): boolean {
    this.licenses.clear();
    this.validationCache.clear();
    this.lastSyncTime = null;
    
    try {
      localStorage.removeItem('plugin_licenses');
      return true;
    } catch (error) {
      console.error('Failed to clear licenses from storage:', error);
      return false;
    }
  }

  /**
   * Get license statistics
   */
  getStatistics(): {
    total: number;
    valid: number;
    expired: number;
    trial: number;
    expiringSoon: number;
    lastSync: string | null;
  } {
    const all = this.getAllLicenses();
    const valid = this.getLicensesByStatus('valid');
    const expired = this.getLicensesByStatus('expired');
    const trial = this.getLicensesByStatus('trial');
    const expiringSoon = this.getLicensesExpiringSoon(30);

    return {
      total: all.length,
      valid: valid.length,
      expired: expired.length,
      trial: trial.length,
      expiringSoon: expiringSoon.length,
      lastSync: this.lastSyncTime
    };
  }
}

// Export singleton instance
export const licenseStorage = LicenseStorageManager.getInstance();

// Utility functions
export const LicenseUtils = {
  /**
   * Format license key for display
   */
  formatLicenseKey(licenseKey: string, maskLength: number = 20): string {
    if (!licenseKey || licenseKey.length <= 8) {
      return licenseKey;
    }

    const start = licenseKey.substring(0, 4);
    const end = licenseKey.substring(licenseKey.length - 4);
    const middle = '•'.repeat(Math.min(maskLength, licenseKey.length - 8));

    return `${start}${middle}${end}`;
  },

  /**
   * Get license status color
   */
  getStatusColor(license: StoredLicense): 'green' | 'yellow' | 'red' | 'gray' {
    if (!license.validation.valid) {
      return 'red';
    }
    
    if (license.validation.expired) {
      return 'red';
    }

    // Check if expiring soon
    if (license.details?.expiresAt) {
      const daysUntilExpiry = Math.ceil(
        (new Date(license.details.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysUntilExpiry <= 7) {
        return 'red';
      } else if (daysUntilExpiry <= 30) {
        return 'yellow';
      }
    }

    return 'green';
  },

  /**
   * Get human-readable license status
   */
  getStatusText(license: StoredLicense): string {
    if (!license.validation.valid) {
      return 'Invalid';
    }

    if (license.validation.expired) {
      return 'Expired';
    }

    if (license.validation.remainingTrialDays !== undefined && license.validation.remainingTrialDays > 0) {
      return `Trial (${license.validation.remainingTrialDays} days left)`;
    }

    if (license.details?.expiresAt) {
      const daysUntilExpiry = Math.ceil(
        (new Date(license.details.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysUntilExpiry <= 0) {
        return 'Expired';
      } else if (daysUntilExpiry <= 7) {
        return `Expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}`;
      } else if (daysUntilExpiry <= 30) {
        return `Expires in ${Math.ceil(daysUntilExpiry / 7)} week${Math.ceil(daysUntilExpiry / 7) === 1 ? '' : 's'}`;
      }
    }

    return 'Valid';
  }
};

export default LicenseStorageManager;