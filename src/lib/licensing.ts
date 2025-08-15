/**
 * Comprehensive licensing system for plugin development studio
 * Provides cryptographic license generation, validation, and management
 */

import { invoke } from '@tauri-apps/api/core';

// Types for licensing system
export interface LicenseConfig {
  enabled: boolean;
  requiresLicense: boolean;
  allowOffline: boolean;
  maxOfflineDays: number;
  remoteValidation: RemoteValidationConfig;
  tiers: LicenseTier[];
  cryptography: CryptographyConfig;
  features: PluginFeature[];
  licenseServer: LicenseServerConfig;
}

export interface RemoteValidationConfig {
  enabled: boolean;
  endpoint: string;
  publicKey: string;
  checkInterval: number; // hours
}

export interface LicenseTier {
  id: string;
  name: string;
  price: number;
  currency: string;
  duration: 'perpetual' | 'days' | 'months' | 'years';
  durationValue: number;
  maxUsers: number;
  features: string[];
  description: string;
  trialDays: number;
  stackable: boolean;
}

export interface PluginFeature {
  id: string;
  name: string;
  description: string;
  required: boolean;
  premium: boolean;
}

export interface CryptographyConfig {
  algorithm: 'RSA-2048' | 'RSA-4096' | 'ECDSA-P256' | 'ECDSA-P384';
  keySize: number;
  hashAlgorithm: 'SHA-256' | 'SHA-384' | 'SHA-512';
  publicKey?: string;
  privateKey?: string;
  generated?: string;
}

export interface LicenseServerConfig {
  url: string;
  apiKey: string;
  allowSelfSigned: boolean;
}

export interface License {
  id: string;
  key: string;
  pluginId: string;
  tierId: string;
  userId: string;
  userEmail: string;
  issuedAt: string;
  expiresAt?: string;
  features: string[];
  maxUsers: number;
  signature: string;
  revoked: boolean;
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
}

export interface LicenseGenerationRequest {
  pluginId: string;
  tierId: string;
  userId: string;
  userEmail: string;
  customFeatures?: string[];
  customExpiration?: string;
  metadata?: Record<string, any>;
}

/**
 * Core licensing class with cryptographic operations
 */
export class LicensingSystem {
  private config: LicenseConfig;
  private pluginId: string;

  constructor(pluginId: string, config: LicenseConfig) {
    this.pluginId = pluginId;
    this.config = config;
  }

  /**
   * Generate a cryptographically secure license
   */
  async generateLicense(request: LicenseGenerationRequest): Promise<License> {
    try {
      // Get the tier configuration
      const tier = this.config.tiers.find(t => t.id === request.tierId);
      if (!tier) {
        throw new Error(`License tier ${request.tierId} not found`);
      }

      // Calculate expiration date
      let expiresAt: string | undefined;
      if (tier.duration !== 'perpetual') {
        const now = new Date();
        switch (tier.duration) {
          case 'days':
            now.setDate(now.getDate() + tier.durationValue);
            break;
          case 'months':
            now.setMonth(now.getMonth() + tier.durationValue);
            break;
          case 'years':
            now.setFullYear(now.getFullYear() + tier.durationValue);
            break;
        }
        expiresAt = now.toISOString();
      }

      // Create license payload
      const licensePayload = {
        id: this.generateLicenseId(),
        pluginId: request.pluginId,
        tierId: request.tierId,
        userId: request.userId,
        userEmail: request.userEmail,
        issuedAt: new Date().toISOString(),
        expiresAt,
        features: request.customFeatures || tier.features || [],
        maxUsers: tier.maxUsers,
        metadata: {
          tierName: tier.name,
          tierPrice: tier.price,
          tierCurrency: tier.currency,
          stackable: tier.stackable,
          ...request.metadata
        }
      };

      // Generate cryptographic signature
      const signature = await this.signLicense(licensePayload);

      // Create license key (base64 encoded payload + signature)
      const licenseKey = await this.encodeLicense(licensePayload, signature);

      const license: License = {
        ...licensePayload,
        key: licenseKey,
        signature,
        revoked: false
      };

      return license;
    } catch (error) {
      throw new Error(`Failed to generate license: ${error.message}`);
    }
  }

  /**
   * Validate a license key
   */
  async validateLicense(licenseKey: string): Promise<LicenseValidationResult> {
    try {
      // Check if licensing is enabled
      if (!this.config.enabled || !this.config.requiresLicense) {
        return {
          valid: true,
          expired: false,
          revoked: false,
          features: [],
          errors: [],
          lastChecked: new Date().toISOString(),
          offlineDaysUsed: 0
        };
      }

      // Decode and verify license
      const { payload, signature } = await this.decodeLicense(licenseKey);
      
      // Verify cryptographic signature
      const signatureValid = await this.verifySignature(payload, signature);
      if (!signatureValid) {
        return {
          valid: false,
          expired: false,
          revoked: false,
          features: [],
          errors: ['Invalid license signature'],
          lastChecked: new Date().toISOString(),
          offlineDaysUsed: 0
        };
      }

      // Check basic validity
      const license = payload as License;
      const now = new Date();
      const issuedAt = new Date(license.issuedAt);
      const expiresAt = license.expiresAt ? new Date(license.expiresAt) : null;

      const errors: string[] = [];
      let expired = false;
      let revoked = false;

      // Check if expired
      if (expiresAt && now > expiresAt) {
        expired = true;
        errors.push('License has expired');
      }

      // Check if issued in the future (clock skew protection)
      if (issuedAt > now) {
        errors.push('License issued in the future');
      }

      // Check plugin ID match
      if (license.pluginId !== this.pluginId) {
        errors.push('License not valid for this plugin');
      }

      // Remote validation if enabled
      if (this.config.remoteValidation.enabled) {
        try {
          const remoteResult = await this.performRemoteValidation(licenseKey);
          if (remoteResult.revoked) {
            revoked = true;
            errors.push('License has been revoked');
          }
        } catch (error) {
          // Handle offline mode
          if (this.config.allowOffline) {
            const offlineDays = await this.getOfflineDays(licenseKey);
            if (offlineDays > this.config.maxOfflineDays) {
              errors.push(`Offline usage limit exceeded (${offlineDays}/${this.config.maxOfflineDays} days)`);
            }
          } else {
            errors.push('Unable to validate license remotely and offline mode is disabled');
          }
        }
      }

      const valid = errors.length === 0 && !expired && !revoked;

      return {
        valid,
        expired,
        revoked,
        features: license.features || [],
        errors,
        lastChecked: new Date().toISOString(),
        offlineDaysUsed: await this.getOfflineDays(licenseKey),
        remainingTrialDays: await this.getRemainingTrialDays(license)
      };
    } catch (error) {
      return {
        valid: false,
        expired: false,
        revoked: false,
        features: [],
        errors: [`License validation failed: ${error.message}`],
        lastChecked: new Date().toISOString(),
        offlineDaysUsed: 0
      };
    }
  }

  /**
   * Check if a specific feature is enabled by the license
   */
  async isFeatureEnabled(licenseKey: string, featureId: string): Promise<boolean> {
    try {
      const validation = await this.validateLicense(licenseKey);
      if (!validation.valid) {
        // Check if it's a free feature
        const feature = this.config.features.find(f => f.id === featureId);
        return feature?.required || false;
      }
      return validation.features.includes(featureId);
    } catch {
      return false;
    }
  }

  /**
   * Generate RSA or ECDSA key pair
   */
  async generateKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
    try {
      // Call Tauri backend to generate keys
      const result = await invoke<{ publicKey: string; privateKey: string }>('generate_license_keys', {
        algorithm: this.config.cryptography.algorithm,
        keySize: this.config.cryptography.keySize
      });
      
      return result;
    } catch (error) {
      // Fallback to Web Crypto API for demo purposes
      console.warn('Tauri key generation failed, using fallback:', error);
      return this.generateKeyPairFallback();
    }
  }

  /**
   * Sign license payload with private key
   */
  private async signLicense(payload: any): Promise<string> {
    try {
      if (!this.config.cryptography.privateKey) {
        throw new Error('Private key not configured');
      }

      const payloadJson = JSON.stringify(payload, Object.keys(payload).sort());
      
      // Call Tauri backend for signing
      const signature = await invoke<string>('sign_license', {
        payload: payloadJson,
        privateKey: this.config.cryptography.privateKey,
        algorithm: this.config.cryptography.algorithm,
        hashAlgorithm: this.config.cryptography.hashAlgorithm
      });

      return signature;
    } catch (error) {
      throw new Error(`Failed to sign license: ${error.message}`);
    }
  }

  /**
   * Verify license signature with public key
   */
  private async verifySignature(payload: any, signature: string): Promise<boolean> {
    try {
      if (!this.config.cryptography.publicKey) {
        throw new Error('Public key not configured');
      }

      const payloadJson = JSON.stringify(payload, Object.keys(payload).sort());
      
      // Call Tauri backend for verification
      const isValid = await invoke<boolean>('verify_license_signature', {
        payload: payloadJson,
        signature,
        publicKey: this.config.cryptography.publicKey,
        algorithm: this.config.cryptography.algorithm,
        hashAlgorithm: this.config.cryptography.hashAlgorithm
      });

      return isValid;
    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  }

  /**
   * Encode license payload and signature into a license key
   */
  private async encodeLicense(payload: any, signature: string): Promise<string> {
    const licenseData = {
      payload,
      signature,
      version: '1.0',
      algorithm: this.config.cryptography.algorithm
    };

    const json = JSON.stringify(licenseData);
    const encoded = btoa(json);
    
    // Add prefix to identify license format
    return `LYC-${encoded}`;
  }

  /**
   * Decode license key into payload and signature
   */
  private async decodeLicense(licenseKey: string): Promise<{ payload: any; signature: string }> {
    if (!licenseKey.startsWith('LYC-')) {
      throw new Error('Invalid license key format');
    }

    const encoded = licenseKey.substring(4);
    const json = atob(encoded);
    const licenseData = JSON.parse(json);

    if (!licenseData.payload || !licenseData.signature) {
      throw new Error('Invalid license data structure');
    }

    return {
      payload: licenseData.payload,
      signature: licenseData.signature
    };
  }

  /**
   * Perform remote license validation
   */
  private async performRemoteValidation(licenseKey: string): Promise<{ revoked: boolean }> {
    if (!this.config.remoteValidation.endpoint) {
      throw new Error('Remote validation endpoint not configured');
    }

    const response = await fetch(this.config.remoteValidation.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.licenseServer.apiKey}`
      },
      body: JSON.stringify({
        licenseKey,
        pluginId: this.pluginId
      })
    });

    if (!response.ok) {
      throw new Error(`Remote validation failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  }

  /**
   * Get number of days used in offline mode
   */
  private async getOfflineDays(licenseKey: string): Promise<number> {
    try {
      const lastOnlineCheck = localStorage.getItem(`license_check_${licenseKey}`);
      if (!lastOnlineCheck) {
        // First time, store current time
        localStorage.setItem(`license_check_${licenseKey}`, new Date().toISOString());
        return 0;
      }

      const lastCheck = new Date(lastOnlineCheck);
      const now = new Date();
      const diffMs = now.getTime() - lastCheck.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      return Math.max(0, diffDays);
    } catch {
      return 0;
    }
  }

  /**
   * Get remaining trial days for license
   */
  private async getRemainingTrialDays(license: License): Promise<number | undefined> {
    const tier = this.config.tiers.find(t => t.id === license.tierId);
    if (!tier || tier.trialDays === 0) {
      return undefined;
    }

    const issuedAt = new Date(license.issuedAt);
    const now = new Date();
    const elapsedMs = now.getTime() - issuedAt.getTime();
    const elapsedDays = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
    
    return Math.max(0, tier.trialDays - elapsedDays);
  }

  /**
   * Generate unique license ID
   */
  private generateLicenseId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    return `lic_${timestamp}_${random}`;
  }

  /**
   * Fallback key generation using Web Crypto API (for demo)
   */
  private async generateKeyPairFallback(): Promise<{ publicKey: string; privateKey: string }> {
    try {
      // Generate ECDSA key pair using Web Crypto API
      const keyPair = await window.crypto.subtle.generateKey(
        {
          name: 'ECDSA',
          namedCurve: 'P-256'
        },
        true,
        ['sign', 'verify']
      );

      const publicKey = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
      const privateKey = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

      return {
        publicKey: this.arrayBufferToBase64(publicKey),
        privateKey: this.arrayBufferToBase64(privateKey)
      };
    } catch (error) {
      throw new Error(`Fallback key generation failed: ${error.message}`);
    }
  }

  /**
   * Convert ArrayBuffer to base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Revoke a license remotely
   */
  async revokeLicense(licenseKey: string, reason?: string): Promise<boolean> {
    try {
      if (!this.config.licenseServer.url) {
        throw new Error('License server not configured');
      }

      const response = await fetch(`${this.config.licenseServer.url}/revoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.licenseServer.apiKey}`
        },
        body: JSON.stringify({
          licenseKey,
          reason: reason || 'Manual revocation'
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to revoke license:', error);
      return false;
    }
  }

  /**
   * Get license usage statistics
   */
  async getLicenseStats(licenseKey: string): Promise<any> {
    try {
      const { payload } = await this.decodeLicense(licenseKey);
      const license = payload as License;
      
      return {
        tierId: license.tierId,
        features: license.features,
        issuedAt: license.issuedAt,
        expiresAt: license.expiresAt,
        maxUsers: license.maxUsers,
        metadata: license.metadata
      };
    } catch (error) {
      throw new Error(`Failed to get license stats: ${error.message}`);
    }
  }
}

/**
 * Utility functions for license management
 */
export const LicenseUtils = {
  /**
   * Validate license configuration
   */
  validateLicenseConfig(config: LicenseConfig): string[] {
    const errors: string[] = [];

    if (config.enabled && config.requiresLicense) {
      if (config.tiers.length === 0) {
        errors.push('At least one license tier must be defined');
      }

      config.tiers.forEach((tier, index) => {
        if (!tier.name) {
          errors.push(`Tier ${index + 1}: Name is required`);
        }
        if (tier.price < 0) {
          errors.push(`Tier ${index + 1}: Price cannot be negative`);
        }
        if (tier.duration !== 'perpetual' && tier.durationValue <= 0) {
          errors.push(`Tier ${index + 1}: Duration value must be positive`);
        }
      });

      if (config.remoteValidation.enabled && !config.remoteValidation.endpoint) {
        errors.push('Remote validation endpoint is required when remote validation is enabled');
      }
    }

    return errors;
  },

  /**
   * Generate default license configuration
   */
  generateDefaultConfig(): LicenseConfig {
    return {
      enabled: false,
      requiresLicense: false,
      allowOffline: true,
      maxOfflineDays: 7,
      remoteValidation: {
        enabled: false,
        endpoint: '',
        publicKey: '',
        checkInterval: 24
      },
      tiers: [],
      cryptography: {
        algorithm: 'RSA-2048',
        keySize: 2048,
        hashAlgorithm: 'SHA-256'
      },
      features: [],
      licenseServer: {
        url: '',
        apiKey: '',
        allowSelfSigned: false
      }
    };
  },

  /**
   * Format license for display
   */
  formatLicenseKey(licenseKey: string): string {
    if (!licenseKey) return '';
    
    // Remove prefix
    const key = licenseKey.startsWith('LYC-') ? licenseKey.substring(4) : licenseKey;
    
    // Format in groups of 4
    return key.match(/.{1,4}/g)?.join('-') || key;
  },

  /**
   * Mask license key for display
   */
  maskLicenseKey(licenseKey: string): string {
    if (!licenseKey || licenseKey.length < 8) return licenseKey;
    
    const start = licenseKey.substring(0, 4);
    const end = licenseKey.substring(licenseKey.length - 4);
    const middle = '*'.repeat(Math.max(0, licenseKey.length - 8));
    
    return `${start}${middle}${end}`;
  }
};

export default LicensingSystem;