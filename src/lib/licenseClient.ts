/**
 * License Server Client
 * Handles communication with license servers for purchasing, upgrading, and managing licenses
 */

import { licenseStorage, StoredLicense, LicenseDetails } from './licenseStorage';

export interface LicenseServerConfig {
  url: string;
  apiKey: string;
  allowSelfSigned?: boolean;
}

export interface PurchaseRequest {
  pluginId: string;
  tierId: string;
  userEmail: string;
  userName?: string;
  billingAddress?: BillingAddress;
  paymentMethod?: PaymentMethod;
  couponCode?: string;
}

export interface UpgradeRequest {
  pluginId: string;
  currentLicenseKey: string;
  targetTierId: string;
  userEmail: string;
}

export interface BillingAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface PaymentMethod {
  type: 'card' | 'paypal' | 'stripe' | 'external';
  token?: string;
  details?: Record<string, any>;
}

export interface PurchaseResponse {
  success: boolean;
  licenseKey?: string;
  orderId?: string;
  paymentUrl?: string;
  error?: string;
  requiresPayment?: boolean;
  amount?: number;
  currency?: string;
}

export interface UpgradeResponse {
  success: boolean;
  newLicenseKey?: string;
  upgradeId?: string;
  paymentUrl?: string;
  error?: string;
  creditAmount?: number;
  paymentRequired?: number;
  currency?: string;
}

export interface LicenseServerInfo {
  name: string;
  version: string;
  supportedPlugins: string[];
  paymentMethods: string[];
  features: string[];
}

export interface TrialRequest {
  pluginId: string;
  userEmail: string;
  userName?: string;
  trialDays?: number;
}

/**
 * License Server Client Class
 */
export class LicenseServerClient {
  private baseUrl: string;
  private apiKey: string;
  private allowSelfSigned: boolean;

  constructor(config: LicenseServerConfig) {
    this.baseUrl = config.url.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = config.apiKey;
    this.allowSelfSigned = config.allowSelfSigned || false;
  }

  /**
   * Make authenticated API request
   */
  private async apiRequest<T>(
    endpoint: string, 
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      'User-Agent': 'Centcom-LicenseClient/1.0'
    };

    const config: RequestInit = {
      method,
      headers,
      mode: 'cors'
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      config.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text() as any;
      }
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Unable to connect to license server. Please check your internet connection.');
      }
      throw error;
    }
  }

  /**
   * Get server information
   */
  async getServerInfo(): Promise<LicenseServerInfo> {
    return this.apiRequest<LicenseServerInfo>('/info');
  }

  /**
   * Purchase a new license
   */
  async purchaseLicense(request: PurchaseRequest): Promise<PurchaseResponse> {
    try {
      const response = await this.apiRequest<PurchaseResponse>('/purchase', 'POST', request);
      
      // If license was issued immediately, install it
      if (response.success && response.licenseKey) {
        await licenseStorage.installLicense(
          request.pluginId,
          response.licenseKey,
          'purchase',
          request.userEmail
        );
      }

      return response;
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Purchase failed'
      };
    }
  }

  /**
   * Start trial license
   */
  async startTrial(request: TrialRequest): Promise<PurchaseResponse> {
    try {
      const response = await this.apiRequest<PurchaseResponse>('/trial', 'POST', request);
      
      // Install trial license if issued
      if (response.success && response.licenseKey) {
        await licenseStorage.installLicense(
          request.pluginId,
          response.licenseKey,
          'trial',
          request.userEmail
        );
      }

      return response;
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Trial activation failed'
      };
    }
  }

  /**
   * Upgrade existing license
   */
  async upgradeLicense(request: UpgradeRequest): Promise<UpgradeResponse> {
    try {
      const response = await this.apiRequest<UpgradeResponse>('/upgrade', 'POST', request);
      
      // If upgrade was successful, install new license
      if (response.success && response.newLicenseKey) {
        await licenseStorage.installLicense(
          request.pluginId,
          response.newLicenseKey,
          'upgrade',
          request.userEmail
        );
      }

      return response;
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Upgrade failed'
      };
    }
  }

  /**
   * Validate license with server
   */
  async validateLicense(pluginId: string, licenseKey: string): Promise<{
    valid: boolean;
    revoked: boolean;
    expires?: string;
    features: string[];
    error?: string;
  }> {
    try {
      return await this.apiRequest('/validate', 'POST', {
        pluginId,
        licenseKey
      });
    } catch (error) {
      return {
        valid: false,
        revoked: false,
        features: [],
        error: error.message || 'Validation failed'
      };
    }
  }

  /**
   * Revoke a license
   */
  async revokeLicense(pluginId: string, licenseKey: string, reason?: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      return await this.apiRequest('/revoke', 'POST', {
        pluginId,
        licenseKey,
        reason: reason || 'User requested'
      });
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Revocation failed'
      };
    }
  }

  /**
   * Get available tiers for a plugin
   */
  async getPluginTiers(pluginId: string): Promise<{
    success: boolean;
    tiers?: Array<{
      id: string;
      name: string;
      price: number;
      currency: string;
      description: string;
      features: string[];
      trialDays: number;
    }>;
    error?: string;
  }> {
    try {
      const response = await this.apiRequest(`/plugins/${pluginId}/tiers`);
      return { success: true, ...response };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to fetch tiers'
      };
    }
  }

  /**
   * Get user's purchase history
   */
  async getPurchaseHistory(userEmail: string): Promise<{
    success: boolean;
    purchases?: Array<{
      orderId: string;
      pluginId: string;
      tierId: string;
      licenseKey: string;
      purchaseDate: string;
      amount: number;
      currency: string;
      status: 'active' | 'expired' | 'revoked';
    }>;
    error?: string;
  }> {
    try {
      const response = await this.apiRequest(`/users/${encodeURIComponent(userEmail)}/purchases`);
      return { success: true, ...response };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to fetch purchase history'
      };
    }
  }

  /**
   * Transfer license to another user
   */
  async transferLicense(
    licenseKey: string,
    fromEmail: string,
    toEmail: string,
    transferReason?: string
  ): Promise<{
    success: boolean;
    newLicenseKey?: string;
    error?: string;
  }> {
    try {
      return await this.apiRequest('/transfer', 'POST', {
        licenseKey,
        fromEmail,
        toEmail,
        reason: transferReason || 'User transfer'
      });
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Transfer failed'
      };
    }
  }

  /**
   * Get license usage statistics
   */
  async getLicenseUsage(licenseKey: string): Promise<{
    success: boolean;
    usage?: {
      activeUsers: number;
      maxUsers: number;
      lastUsed: string;
      usageHistory: Array<{
        date: string;
        users: number;
        features: string[];
      }>;
    };
    error?: string;
  }> {
    try {
      const response = await this.apiRequest('/usage', 'POST', { licenseKey });
      return { success: true, ...response };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to fetch usage data'
      };
    }
  }
}

/**
 * License Purchase Manager
 * High-level interface for license operations
 */
export class LicensePurchaseManager {
  private clients: Map<string, LicenseServerClient> = new Map();

  /**
   * Add a license server
   */
  addServer(serverId: string, config: LicenseServerConfig): void {
    this.clients.set(serverId, new LicenseServerClient(config));
  }

  /**
   * Remove a license server
   */
  removeServer(serverId: string): boolean {
    return this.clients.delete(serverId);
  }

  /**
   * Get available servers
   */
  getServers(): string[] {
    return Array.from(this.clients.keys());
  }

  /**
   * Auto-detect license server for a plugin
   */
  private getServerForPlugin(pluginId: string, pluginLicensing?: any): LicenseServerClient | null {
    // Try to get server from plugin metadata
    if (pluginLicensing?.licenseServer?.url) {
      const config: LicenseServerConfig = {
        url: pluginLicensing.licenseServer.url,
        apiKey: pluginLicensing.licenseServer.apiKey,
        allowSelfSigned: pluginLicensing.licenseServer.allowSelfSigned
      };
      return new LicenseServerClient(config);
    }

    // Try first available server as fallback
    const servers = Array.from(this.clients.values());
    return servers.length > 0 ? servers[0] : null;
  }

  /**
   * Purchase license for a plugin
   */
  async purchasePluginLicense(
    pluginId: string,
    tierId: string,
    userEmail: string,
    pluginLicensing?: any,
    options?: {
      userName?: string;
      billingAddress?: BillingAddress;
      paymentMethod?: PaymentMethod;
      couponCode?: string;
    }
  ): Promise<PurchaseResponse> {
    const client = this.getServerForPlugin(pluginId, pluginLicensing);
    
    if (!client) {
      return {
        success: false,
        error: 'No license server configured for this plugin'
      };
    }

    const request: PurchaseRequest = {
      pluginId,
      tierId,
      userEmail,
      userName: options?.userName,
      billingAddress: options?.billingAddress,
      paymentMethod: options?.paymentMethod,
      couponCode: options?.couponCode
    };

    return client.purchaseLicense(request);
  }

  /**
   * Start trial for a plugin
   */
  async startPluginTrial(
    pluginId: string,
    userEmail: string,
    pluginLicensing?: any,
    options?: {
      userName?: string;
      trialDays?: number;
    }
  ): Promise<PurchaseResponse> {
    const client = this.getServerForPlugin(pluginId, pluginLicensing);
    
    if (!client) {
      return {
        success: false,
        error: 'No license server configured for this plugin'
      };
    }

    const request: TrialRequest = {
      pluginId,
      userEmail,
      userName: options?.userName,
      trialDays: options?.trialDays
    };

    return client.startTrial(request);
  }

  /**
   * Upgrade plugin license
   */
  async upgradePluginLicense(
    pluginId: string,
    targetTierId: string,
    userEmail: string,
    pluginLicensing?: any
  ): Promise<UpgradeResponse> {
    const client = this.getServerForPlugin(pluginId, pluginLicensing);
    
    if (!client) {
      return {
        success: false,
        error: 'No license server configured for this plugin'
      };
    }

    const currentLicense = licenseStorage.getLicense(pluginId);
    if (!currentLicense) {
      return {
        success: false,
        error: 'No current license found to upgrade'
      };
    }

    const request: UpgradeRequest = {
      pluginId,
      currentLicenseKey: currentLicense.licenseKey,
      targetTierId,
      userEmail
    };

    return client.upgradeLicense(request);
  }

  /**
   * Get available tiers for a plugin
   */
  async getPluginTiers(pluginId: string, pluginLicensing?: any): Promise<{
    success: boolean;
    tiers?: any[];
    error?: string;
  }> {
    const client = this.getServerForPlugin(pluginId, pluginLicensing);
    
    if (!client) {
      // Fallback to plugin metadata if available
      if (pluginLicensing?.tiers) {
        return {
          success: true,
          tiers: pluginLicensing.tiers
        };
      }
      
      return {
        success: false,
        error: 'No license server configured for this plugin'
      };
    }

    return client.getPluginTiers(pluginId);
  }

  /**
   * Open purchase page in browser
   */
  async openPurchasePage(
    pluginId: string,
    tierId: string,
    userEmail: string,
    pluginLicensing?: any
  ): Promise<boolean> {
    try {
      const baseUrl = pluginLicensing?.licenseServer?.url || 'https://licenses.example.com';
      const params = new URLSearchParams({
        plugin: pluginId,
        tier: tierId,
        email: userEmail,
        source: 'centcom'
      });

      const url = `${baseUrl}/purchase?${params.toString()}`;
      
      // Use Tauri's shell plugin to open URL
      await window.__TAURI__?.invoke('open_url', { url });
      return true;
    } catch (error) {
      console.error('Failed to open purchase page:', error);
      // Fallback to window.open
      try {
        window.open(url, '_blank');
        return true;
      } catch {
        return false;
      }
    }
  }
}

// Export singleton instance
export const licensePurchaseManager = new LicensePurchaseManager();

// Utility functions for license operations
export const LicenseClientUtils = {
  /**
   * Format price for display
   */
  formatPrice(amount: number, currency: string): string {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.toUpperCase()
      }).format(amount);
    } catch {
      return `${currency.toUpperCase()} ${amount.toFixed(2)}`;
    }
  },

  /**
   * Validate email format
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Generate purchase reference
   */
  generatePurchaseRef(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `PUR-${timestamp}-${random}`.toUpperCase();
  },

  /**
   * Calculate upgrade pricing
   */
  calculateUpgradePrice(
    currentTierPrice: number,
    targetTierPrice: number,
    daysUsed: number,
    totalDays: number
  ): number {
    const remainingValue = currentTierPrice * ((totalDays - daysUsed) / totalDays);
    const upgradePrice = targetTierPrice - remainingValue;
    return Math.max(0, upgradePrice);
  }
};

export default LicenseServerClient;