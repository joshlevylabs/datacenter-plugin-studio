import React, { useState, useEffect } from 'react';
import { 
  KeyIcon, 
  ShieldCheckIcon, 
  ClockIcon, 
  CogIcon,
  PlusIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CpuChipIcon,
  ServerIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import './LicensingPanel.css';

/**
 * Comprehensive licensing configuration panel for plugin developers
 */
const LicensingPanel = ({ pluginDoc, onUpdatePlugin }) => {
  const [licensing, setLicensing] = useState(pluginDoc?.licensing || {
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
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [activeSection, setActiveSection] = useState('basic');
  const [validationErrors, setValidationErrors] = useState({});

  // Update parent when licensing changes
  useEffect(() => {
    const updatedPlugin = {
      ...pluginDoc,
      licensing: licensing
    };
    onUpdatePlugin(updatedPlugin);
  }, [licensing]);

  // Validate configuration
  const validateConfig = () => {
    const errors = {};

    if (licensing.enabled && licensing.requiresLicense) {
      if (licensing.remoteValidation.enabled && !licensing.remoteValidation.endpoint) {
        errors.endpoint = 'Remote validation endpoint is required';
      }

      if (licensing.tiers.length === 0) {
        errors.tiers = 'At least one license tier must be defined';
      }

      licensing.tiers.forEach((tier, index) => {
        if (!tier.name) {
          errors[`tier_${index}_name`] = 'Tier name is required';
        }
        if (!tier.price && tier.price !== 0) {
          errors[`tier_${index}_price`] = 'Tier price is required';
        }
      });
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Update licensing configuration
  const updateLicensing = (updates) => {
    setLicensing(prev => ({ ...prev, ...updates }));
  };

  // Add new license tier
  const addTier = () => {
    const newTier = {
      id: `tier_${Date.now()}`,
      name: '',
      price: 0,
      currency: 'USD',
      duration: 'perpetual',
      durationValue: 0,
      maxUsers: 1,
      features: [],
      description: '',
      trialDays: 0,
      stackable: false
    };

    updateLicensing({
      tiers: [...licensing.tiers, newTier]
    });
  };

  // Remove license tier
  const removeTier = (index) => {
    const newTiers = licensing.tiers.filter((_, i) => i !== index);
    updateLicensing({ tiers: newTiers });
  };

  // Update specific tier
  const updateTier = (index, updates) => {
    const newTiers = licensing.tiers.map((tier, i) => 
      i === index ? { ...tier, ...updates } : tier
    );
    updateLicensing({ tiers: newTiers });
  };

  // Add feature to licensing
  const addFeature = () => {
    const feature = {
      id: `feature_${Date.now()}`,
      name: '',
      description: '',
      required: false,
      premium: false
    };

    updateLicensing({
      features: [...licensing.features, feature]
    });
  };

  // Remove feature
  const removeFeature = (index) => {
    const newFeatures = licensing.features.filter((_, i) => i !== index);
    updateLicensing({ features: newFeatures });
  };

  // Update specific feature
  const updateFeature = (index, updates) => {
    const newFeatures = licensing.features.map((feature, i) => 
      i === index ? { ...feature, ...updates } : feature
    );
    updateLicensing({ features: newFeatures });
  };

  // Generate license keys (placeholder - would be implemented in backend)
  const generateKeys = () => {
    // This would typically call a backend service
    console.log('Generating RSA key pair...');
    // For demo purposes, show that keys are being generated
    updateLicensing({
      cryptography: {
        ...licensing.cryptography,
        publicKey: `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
-----END PUBLIC KEY-----`,
        privateKey: `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEA...
-----END PRIVATE KEY-----`,
        generated: new Date().toISOString()
      }
    });
  };

  const renderBasicSettings = () => (
    <div className="space-y-6">
      {/* Enable Licensing */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="enable-licensing"
            checked={licensing.enabled}
            onChange={(e) => updateLicensing({ enabled: e.target.checked })}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="enable-licensing" className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Enable Licensing System
          </label>
        </div>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Turn on licensing features for your plugin
        </p>
      </div>

      {licensing.enabled && (
        <>
          {/* Require License */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="require-license"
                checked={licensing.requiresLicense}
                onChange={(e) => updateLicensing({ requiresLicense: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="require-license" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Require Valid License to Use Plugin
              </label>
            </div>

            {/* Offline Usage */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <input
                  type="checkbox"
                  id="allow-offline"
                  checked={licensing.allowOffline}
                  onChange={(e) => updateLicensing({ allowOffline: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="allow-offline" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Allow Offline Usage
                </label>
              </div>

              {licensing.allowOffline && (
                <div className="ml-7">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Maximum Offline Days
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={licensing.maxOfflineDays}
                    onChange={(e) => updateLicensing({ maxOfflineDays: parseInt(e.target.value) || 7 })}
                    className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 dark:text-gray-200"
                  />
                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">days</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderLicenseTiers = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">License Tiers</h4>
        <button
          onClick={addTier}
          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300"
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          Add Tier
        </button>
      </div>

      {licensing.tiers.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <KeyIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No license tiers defined yet</p>
          <p className="text-sm">Add a tier to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {licensing.tiers.map((tier, index) => (
            <div key={tier.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h5 className="font-medium text-gray-900 dark:text-gray-100">
                  Tier {index + 1}
                </h5>
                <button
                  onClick={() => removeTier(index)}
                  className="text-red-600 hover:text-red-800 dark:text-red-400"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tier Name
                  </label>
                  <input
                    type="text"
                    value={tier.name}
                    onChange={(e) => updateTier(index, { name: e.target.value })}
                    placeholder="e.g., Basic, Pro, Enterprise"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 dark:text-gray-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Price
                  </label>
                  <div className="flex items-center space-x-2">
                    <select
                      value={tier.currency}
                      onChange={(e) => updateTier(index, { currency: e.target.value })}
                      className="px-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 dark:text-gray-200"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="JPY">JPY</option>
                    </select>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={tier.price}
                      onChange={(e) => updateTier(index, { price: parseFloat(e.target.value) || 0 })}
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 dark:text-gray-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Duration
                  </label>
                  <select
                    value={tier.duration}
                    onChange={(e) => updateTier(index, { duration: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 dark:text-gray-200"
                  >
                    <option value="perpetual">Perpetual</option>
                    <option value="days">Days</option>
                    <option value="months">Months</option>
                    <option value="years">Years</option>
                  </select>
                  {tier.duration !== 'perpetual' && (
                    <input
                      type="number"
                      min="1"
                      value={tier.durationValue}
                      onChange={(e) => updateTier(index, { durationValue: parseInt(e.target.value) || 1 })}
                      className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 dark:text-gray-200"
                      placeholder="Duration value"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Max Users
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={tier.maxUsers}
                    onChange={(e) => updateTier(index, { maxUsers: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 dark:text-gray-200"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={tier.description}
                    onChange={(e) => updateTier(index, { description: e.target.value })}
                    rows="2"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 dark:text-gray-200"
                    placeholder="Describe this license tier..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Trial Days
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={tier.trialDays}
                    onChange={(e) => updateTier(index, { trialDays: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 dark:text-gray-200"
                  />
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id={`stackable-${index}`}
                    checked={tier.stackable}
                    onChange={(e) => updateTier(index, { stackable: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor={`stackable-${index}`} className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Stackable with other licenses
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderFeatures = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">Plugin Features</h4>
        <button
          onClick={addFeature}
          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300"
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          Add Feature
        </button>
      </div>

      {licensing.features.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <CogIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No features defined yet</p>
          <p className="text-sm">Add features to control access</p>
        </div>
      ) : (
        <div className="space-y-3">
          {licensing.features.map((feature, index) => (
            <div key={feature.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
              <div className="flex items-center justify-between mb-3">
                <h5 className="font-medium text-gray-900 dark:text-gray-100">
                  Feature {index + 1}
                </h5>
                <button
                  onClick={() => removeFeature(index)}
                  className="text-red-600 hover:text-red-800 dark:text-red-400"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Feature Name
                  </label>
                  <input
                    type="text"
                    value={feature.name}
                    onChange={(e) => updateFeature(index, { name: e.target.value })}
                    placeholder="e.g., Advanced Analytics"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 dark:text-gray-200"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id={`required-${index}`}
                      checked={feature.required}
                      onChange={(e) => updateFeature(index, { required: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor={`required-${index}`} className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Required for basic usage
                    </label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id={`premium-${index}`}
                      checked={feature.premium}
                      onChange={(e) => updateFeature(index, { premium: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor={`premium-${index}`} className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Premium feature
                    </label>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={feature.description}
                    onChange={(e) => updateFeature(index, { description: e.target.value })}
                    rows="2"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 dark:text-gray-200"
                    placeholder="Describe this feature..."
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderAdvancedSettings = () => (
    <div className="space-y-6">
      {/* Remote Validation */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
        <div className="flex items-center space-x-3 mb-3">
          <input
            type="checkbox"
            id="remote-validation"
            checked={licensing.remoteValidation.enabled}
            onChange={(e) => updateLicensing({
              remoteValidation: { ...licensing.remoteValidation, enabled: e.target.checked }
            })}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="remote-validation" className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Enable Remote License Validation
          </label>
        </div>

        {licensing.remoteValidation.enabled && (
          <div className="ml-7 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Validation Endpoint
              </label>
              <input
                type="url"
                value={licensing.remoteValidation.endpoint}
                onChange={(e) => updateLicensing({
                  remoteValidation: { ...licensing.remoteValidation, endpoint: e.target.value }
                })}
                placeholder="https://api.yourcompany.com/license/validate"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 dark:text-gray-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Check Interval (hours)
              </label>
              <input
                type="number"
                min="1"
                max="168"
                value={licensing.remoteValidation.checkInterval}
                onChange={(e) => updateLicensing({
                  remoteValidation: { ...licensing.remoteValidation, checkInterval: parseInt(e.target.value) || 24 }
                })}
                className="w-24 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 dark:text-gray-200"
              />
            </div>
          </div>
        )}
      </div>

      {/* Cryptography Settings */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h5 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Cryptography Settings
        </h5>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Algorithm
            </label>
            <select
              value={licensing.cryptography.algorithm}
              onChange={(e) => updateLicensing({
                cryptography: { ...licensing.cryptography, algorithm: e.target.value }
              })}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 dark:text-gray-200"
            >
              <option value="RSA-2048">RSA-2048</option>
              <option value="RSA-4096">RSA-4096</option>
              <option value="ECDSA-P256">ECDSA-P256</option>
              <option value="ECDSA-P384">ECDSA-P384</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Hash Algorithm
            </label>
            <select
              value={licensing.cryptography.hashAlgorithm}
              onChange={(e) => updateLicensing({
                cryptography: { ...licensing.cryptography, hashAlgorithm: e.target.value }
              })}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 dark:text-gray-200"
            >
              <option value="SHA-256">SHA-256</option>
              <option value="SHA-384">SHA-384</option>
              <option value="SHA-512">SHA-512</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={generateKeys}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <CpuChipIcon className="h-4 w-4 mr-2" />
            Generate Key Pair
          </button>
          {licensing.cryptography.generated && (
            <p className="mt-2 text-xs text-green-600 dark:text-green-400">
              Keys generated on {new Date(licensing.cryptography.generated).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {/* License Server */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h5 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          License Server Configuration
        </h5>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Server URL
            </label>
            <input
              type="url"
              value={licensing.licenseServer.url}
              onChange={(e) => updateLicensing({
                licenseServer: { ...licensing.licenseServer, url: e.target.value }
              })}
              placeholder="https://license.yourcompany.com"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 dark:text-gray-200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              API Key
            </label>
            <div className="flex items-center space-x-2">
              <input
                type={showApiKey ? "text" : "password"}
                value={licensing.licenseServer.apiKey}
                onChange={(e) => updateLicensing({
                  licenseServer: { ...licensing.licenseServer, apiKey: e.target.value }
                })}
                placeholder="Your license server API key"
                className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 dark:text-gray-200"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400"
              >
                {showApiKey ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="allow-self-signed"
              checked={licensing.licenseServer.allowSelfSigned}
              onChange={(e) => updateLicensing({
                licenseServer: { ...licensing.licenseServer, allowSelfSigned: e.target.checked }
              })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="allow-self-signed" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Allow self-signed certificates
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSectionTabs = () => (
    <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
      <nav className="-mb-px flex space-x-8">
        {[
          { id: 'basic', label: 'Basic Settings', icon: CogIcon },
          { id: 'tiers', label: 'License Tiers', icon: KeyIcon },
          { id: 'features', label: 'Features', icon: ShieldCheckIcon },
          { id: 'advanced', label: 'Advanced', icon: ServerIcon }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
              activeSection === id
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
  );

  const renderValidationSummary = () => {
    if (Object.keys(validationErrors).length === 0) return null;

    return (
      <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-2">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
          <h4 className="text-sm font-medium text-red-800 dark:text-red-200">
            Configuration Issues
          </h4>
        </div>
        <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-300 space-y-1">
          {Object.values(validationErrors).map((error, index) => (
            <li key={index}>{error}</li>
          ))}
        </ul>
      </div>
    );
  };

  // Validate on render
  useEffect(() => {
    validateConfig();
  }, [licensing]);

  return (
    <div className="licensing-panel">
      <div className="flex items-center space-x-3 mb-6">
        <KeyIcon className="h-6 w-6 text-blue-600" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          Licensing Configuration
        </h3>
      </div>

      <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <InformationCircleIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">About Plugin Licensing</p>
            <p>
              Configure how users will license your plugin. You can create multiple tiers,
              define features, and set up secure validation. Licensing information will be
              embedded in your .lycplugin file and enforced by the Centcom application.
            </p>
          </div>
        </div>
      </div>

      {renderValidationSummary()}
      {renderSectionTabs()}

      <div className="min-h-[400px]">
        {activeSection === 'basic' && renderBasicSettings()}
        {activeSection === 'tiers' && renderLicenseTiers()}
        {activeSection === 'features' && renderFeatures()}
        {activeSection === 'advanced' && renderAdvancedSettings()}
      </div>
    </div>
  );
};

export default LicensingPanel;