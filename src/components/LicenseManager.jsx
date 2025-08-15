import React, { useState, useEffect } from 'react';
import { 
  KeyIcon, 
  ShieldCheckIcon, 
  ClockIcon, 
  CogIcon,
  PlusIcon,
  TrashIcon,
  ArrowUpIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  CreditCardIcon,
  DocumentTextIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowPathIcon,
  CloudIcon,
  DevicePhoneMobileIcon
} from '@heroicons/react/24/outline';
import './LicenseManager.css';

/**
 * License Manager Component for Centcom Users
 * Manages licenses for installed plugins including upgrades, trials, and purchases
 */
const LicenseManager = ({ installedPlugins = [], onLicenseUpdate }) => {
  const [licenses, setLicenses] = useState({});
  const [pluginLicenses, setPluginLicenses] = useState({});
  const [selectedPlugin, setSelectedPlugin] = useState(null);
  const [showLicenseInput, setShowLicenseInput] = useState(false);
  const [newLicenseKey, setNewLicenseKey] = useState('');
  const [showLicenseKey, setShowLicenseKey] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  // Load licenses on component mount
  useEffect(() => {
    loadLicenses();
  }, [installedPlugins]);

  // Load all licenses from storage and validate them
  const loadLicenses = async () => {
    setLoading(true);
    try {
      const licenseData = {};
      const pluginLicenseData = {};

      for (const plugin of installedPlugins) {
        // Load stored license for this plugin
        const storedLicense = localStorage.getItem(`license_${plugin.id}`);
        if (storedLicense) {
          // Validate the license
          const validation = await validateLicense(plugin.id, storedLicense);
          licenseData[plugin.id] = {
            key: storedLicense,
            validation,
            plugin: plugin
          };

          // Get license details
          if (validation.valid) {
            const details = await getLicenseDetails(storedLicense);
            pluginLicenseData[plugin.id] = details;
          }
        } else {
          // Check if plugin requires license
          if (plugin.licensing?.enabled && plugin.licensing?.requiresLicense) {
            licenseData[plugin.id] = {
              key: null,
              validation: { valid: false, required: true },
              plugin: plugin
            };
          }
        }
      }

      setLicenses(licenseData);
      setPluginLicenses(pluginLicenseData);
    } catch (err) {
      setError(`Failed to load licenses: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Validate a license key
  const validateLicense = async (pluginId, licenseKey) => {
    try {
      const result = await window.__TAURI__.invoke('validate_plugin_license', {
        pluginId,
        licenseKey
      });
      return result;
    } catch (error) {
      return {
        valid: false,
        error: error.message,
        expired: false,
        revoked: false,
        features: [],
        errors: [error.message],
        lastChecked: new Date().toISOString(),
        offlineDaysUsed: 0
      };
    }
  };

  // Get detailed license information
  const getLicenseDetails = async (licenseKey) => {
    try {
      // Decode license to get details
      if (!licenseKey.startsWith('LYC-')) return null;
      
      const encoded = licenseKey.substring(4);
      const decoded = atob(encoded);
      const licenseData = JSON.parse(decoded);
      
      return licenseData.payload;
    } catch (error) {
      console.error('Failed to decode license:', error);
      return null;
    }
  };

  // Install/Update a license
  const installLicense = async (pluginId, licenseKey) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validate the new license
      const validation = await validateLicense(pluginId, licenseKey);
      
      if (validation.valid) {
        // Store the license
        localStorage.setItem(`license_${pluginId}`, licenseKey);
        
        // Update state
        const plugin = installedPlugins.find(p => p.id === pluginId);
        setLicenses(prev => ({
          ...prev,
          [pluginId]: {
            key: licenseKey,
            validation,
            plugin
          }
        }));

        // Get license details
        const details = await getLicenseDetails(licenseKey);
        if (details) {
          setPluginLicenses(prev => ({
            ...prev,
            [pluginId]: details
          }));
        }

        setSuccess('License installed successfully!');
        setNewLicenseKey('');
        setShowLicenseInput(false);

        // Notify parent component
        if (onLicenseUpdate) {
          onLicenseUpdate(pluginId, licenseKey, validation);
        }
      } else {
        setError(`License validation failed: ${validation.errors?.join(', ') || 'Invalid license'}`);
      }
    } catch (err) {
      setError(`Failed to install license: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Remove a license
  const removeLicense = async (pluginId) => {
    if (window.confirm('Are you sure you want to remove this license?')) {
      localStorage.removeItem(`license_${pluginId}`);
      
      setLicenses(prev => {
        const updated = { ...prev };
        if (updated[pluginId]) {
          updated[pluginId] = {
            ...updated[pluginId],
            key: null,
            validation: { valid: false, required: true }
          };
        }
        return updated;
      });

      setPluginLicenses(prev => {
        const updated = { ...prev };
        delete updated[pluginId];
        return updated;
      });

      setSuccess('License removed successfully');

      // Notify parent component
      if (onLicenseUpdate) {
        onLicenseUpdate(pluginId, null, { valid: false });
      }
    }
  };

  // Refresh license validation
  const refreshLicense = async (pluginId) => {
    const licenseData = licenses[pluginId];
    if (licenseData?.key) {
      setLoading(true);
      try {
        const validation = await validateLicense(pluginId, licenseData.key);
        setLicenses(prev => ({
          ...prev,
          [pluginId]: {
            ...prev[pluginId],
            validation
          }
        }));
        setSuccess('License refreshed successfully');
      } catch (err) {
        setError(`Failed to refresh license: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
  };

  // Get available upgrade tiers for a plugin
  const getUpgradeTiers = (plugin, currentLicense) => {
    if (!plugin.licensing?.tiers) return [];
    
    const currentTierId = currentLicense?.tierId;
    return plugin.licensing.tiers.filter(tier => tier.id !== currentTierId);
  };

  // Purchase/Upgrade license (placeholder for actual implementation)
  const purchaseLicense = async (plugin, tier) => {
    // This would integrate with your payment/license server
    const purchaseUrl = `${plugin.licensing?.licenseServer?.url || 'https://licenses.example.com'}/purchase?plugin=${plugin.id}&tier=${tier.id}`;
    window.open(purchaseUrl, '_blank');
  };

  // Render license status badge
  const renderLicenseStatus = (licenseData) => {
    if (!licenseData) return null;

    const { validation } = licenseData;
    
    if (validation.valid) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          <CheckCircleIcon className="h-3 w-3 mr-1" />
          Valid
        </span>
      );
    } else if (validation.expired) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
          <ClockIcon className="h-3 w-3 mr-1" />
          Expired
        </span>
      );
    } else if (validation.revoked) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
          <XCircleIcon className="h-3 w-3 mr-1" />
          Revoked
        </span>
      );
    } else if (validation.required) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
          <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
          Required
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
          <XCircleIcon className="h-3 w-3 mr-1" />
          Invalid
        </span>
      );
    }
  };

  // Render overview tab
  const renderOverview = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <ShieldCheckIcon className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Valid Licenses</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {Object.values(licenses).filter(l => l.validation?.valid).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <ClockIcon className="h-8 w-8 text-yellow-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Expiring Soon</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {Object.values(pluginLicenses).filter(l => {
                  if (!l.expiresAt) return false;
                  const daysUntilExpiry = Math.ceil((new Date(l.expiresAt) - new Date()) / (1000 * 60 * 60 * 24));
                  return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
                }).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Requires License</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {Object.values(licenses).filter(l => l.validation?.required && !l.validation?.valid).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <DevicePhoneMobileIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Trial Licenses</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {Object.values(pluginLicenses).filter(l => 
                  l.metadata?.tierName?.toLowerCase().includes('trial') ||
                  (l.expiresAt && new Date(l.expiresAt) > new Date() && 
                   Math.ceil((new Date(l.expiresAt) - new Date(l.issuedAt)) / (1000 * 60 * 60 * 24)) <= 30)
                ).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Recent License Activity</h3>
        <div className="space-y-3">
          {Object.values(licenses).slice(0, 5).map((licenseData, index) => (
            <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {licenseData.validation?.valid ? (
                    <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircleIcon className="h-5 w-5 text-red-500" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {licenseData.plugin?.name || licenseData.plugin?.id}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {licenseData.validation?.valid ? 'License valid' : 'License issue detected'}
                  </p>
                </div>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(licenseData.validation?.lastChecked || new Date()).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Render plugins tab
  const renderPlugins = () => (
    <div className="space-y-4">
      {installedPlugins.map(plugin => {
        const licenseData = licenses[plugin.id];
        const licenseDetails = pluginLicenses[plugin.id];
        
        return (
          <div key={plugin.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                    <CogIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {plugin.name || plugin.id}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Version {plugin.version || '1.0.0'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {renderLicenseStatus(licenseData)}
                <button
                  onClick={() => refreshLicense(plugin.id)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  title="Refresh license"
                >
                  <ArrowPathIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* License Details */}
            {licenseData?.key && licenseDetails ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">License Tier</p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {licenseDetails.metadata?.tierName || 'Unknown'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expires</p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {licenseDetails.expiresAt ? 
                      new Date(licenseDetails.expiresAt).toLocaleDateString() : 
                      'Never'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Users</p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {licenseDetails.maxUsers || 1}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Features</p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {licenseDetails.features?.length || 0} enabled
                  </p>
                </div>
              </div>
            ) : null}

            {/* License Key */}
            {licenseData?.key && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">License Key</p>
                  <button
                    onClick={() => setShowLicenseKey(prev => ({ ...prev, [plugin.id]: !prev[plugin.id] }))}
                    className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400"
                  >
                    {showLicenseKey[plugin.id] ? (
                      <>
                        <EyeSlashIcon className="h-3 w-3 inline mr-1" />
                        Hide
                      </>
                    ) : (
                      <>
                        <EyeIcon className="h-3 w-3 inline mr-1" />
                        Show
                      </>
                    )}
                  </button>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-md p-3 font-mono text-xs break-all">
                  {showLicenseKey[plugin.id] ? 
                    licenseData.key : 
                    licenseData.key.replace(/./g, '•')
                  }
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {!licenseData?.key || !licenseData.validation?.valid ? (
                  <button
                    onClick={() => {
                      setSelectedPlugin(plugin);
                      setShowLicenseInput(true);
                    }}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <KeyIcon className="h-4 w-4 mr-2" />
                    {licenseData?.key ? 'Update License' : 'Install License'}
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setSelectedPlugin(plugin);
                      setShowLicenseInput(true);
                    }}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <ArrowUpIcon className="h-4 w-4 mr-2" />
                    Update License
                  </button>
                )}

                {plugin.licensing?.enabled && plugin.licensing?.tiers?.length > 0 && (
                  <button
                    onClick={() => purchaseLicense(plugin, plugin.licensing.tiers[0])}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <CreditCardIcon className="h-4 w-4 mr-2" />
                    Purchase
                  </button>
                )}
              </div>

              {licenseData?.key && (
                <button
                  onClick={() => removeLicense(plugin.id)}
                  className="text-red-600 hover:text-red-800 dark:text-red-400 text-sm"
                >
                  Remove License
                </button>
              )}
            </div>

            {/* Upgrade Options */}
            {licenseData?.validation?.valid && plugin.licensing?.tiers && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Available Upgrades
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {getUpgradeTiers(plugin, licenseDetails).map(tier => (
                    <div key={tier.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-gray-900 dark:text-white">{tier.name}</h5>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {tier.currency} {tier.price}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                        {tier.description}
                      </p>
                      <button
                        onClick={() => purchaseLicense(plugin, tier)}
                        className="w-full inline-flex items-center justify-center px-3 py-1 border border-transparent text-xs font-medium rounded text-blue-600 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300"
                      >
                        Upgrade
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {installedPlugins.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <CogIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p>No plugins installed</p>
          <p className="text-sm">Install plugins to manage their licenses</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="license-manager max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">License Manager</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage licenses for your installed plugins
          </p>
        </div>
        <button
          onClick={loadLicenses}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
                          <ArrowPathIcon className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh All
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
            <p className="text-green-800 dark:text-green-200">{success}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: ChartBarIcon },
            { id: 'plugins', label: 'Plugins', icon: CogIcon },
            { id: 'settings', label: 'Settings', icon: InformationCircleIcon }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'plugins' && renderPlugins()}
      {activeTab === 'settings' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">License Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Auto-refresh licenses</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Automatically check license status on startup</p>
              </div>
              <input type="checkbox" defaultChecked className="h-4 w-4 text-blue-600 rounded" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Offline grace period</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Days to allow offline usage</p>
              </div>
              <input type="number" defaultValue="7" className="w-20 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm" />
            </div>
          </div>
        </div>
      )}

      {/* License Input Modal */}
      {showLicenseInput && selectedPlugin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {licenses[selectedPlugin.id]?.key ? 'Update' : 'Install'} License for {selectedPlugin.name}
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                License Key
              </label>
              <textarea
                value={newLicenseKey}
                onChange={(e) => setNewLicenseKey(e.target.value)}
                rows="4"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-200"
                placeholder="Paste your license key here..."
              />
            </div>

            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setShowLicenseInput(false);
                  setSelectedPlugin(null);
                  setNewLicenseKey('');
                  setError('');
                  setSuccess('');
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => installLicense(selectedPlugin.id, newLicenseKey)}
                disabled={!newLicenseKey.trim() || loading}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Installing...' : 'Install'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LicenseManager;