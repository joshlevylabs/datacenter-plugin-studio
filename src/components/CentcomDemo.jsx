import React, { useState, useEffect } from 'react';
import LicenseManager from './LicenseManager.jsx';
import { 
  HomeIcon,
  CogIcon,
  KeyIcon,
  PuzzlePieceIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

/**
 * Demo Centcom Application
 * Shows how the License Manager integrates into the main Centcom app
 */
const CentcomDemo = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [installedPlugins, setInstalledPlugins] = useState([
    {
      id: 'measurement-analyzer',
      name: 'Measurement Analyzer Pro',
      version: '2.1.0',
      description: 'Advanced measurement analysis and reporting',
      licensing: {
        enabled: true,
        requiresLicense: true,
        tiers: [
          {
            id: 'basic',
            name: 'Basic',
            price: 49.99,
            currency: 'USD',
            duration: 'perpetual',
            features: ['basic-analysis', 'export-csv'],
            description: 'Basic analysis features'
          },
          {
            id: 'pro',
            name: 'Professional',
            price: 149.99,
            currency: 'USD',
            duration: 'perpetual',
            features: ['basic-analysis', 'export-csv', 'advanced-reporting', 'api-access'],
            description: 'Professional features with advanced reporting'
          },
          {
            id: 'enterprise',
            name: 'Enterprise',
            price: 499.99,
            currency: 'USD',
            duration: 'perpetual',
            features: ['basic-analysis', 'export-csv', 'advanced-reporting', 'api-access', 'multi-user', 'priority-support'],
            description: 'Enterprise features with multi-user support'
          }
        ],
        licenseServer: {
          url: 'https://licenses.measurement-tools.com',
          apiKey: 'demo-key-123'
        }
      }
    },
    {
      id: 'data-visualizer',
      name: 'Data Visualizer',
      version: '1.5.2',
      description: 'Interactive data visualization and charting',
      licensing: {
        enabled: true,
        requiresLicense: false,
        tiers: [
          {
            id: 'free',
            name: 'Free',
            price: 0,
            currency: 'USD',
            duration: 'perpetual',
            features: ['basic-charts'],
            description: 'Basic charting functionality'
          },
          {
            id: 'premium',
            name: 'Premium',
            price: 29.99,
            currency: 'USD',
            duration: 'perpetual',
            features: ['basic-charts', 'advanced-charts', 'export-options', 'real-time'],
            description: 'Premium charts with real-time updates'
          }
        ]
      }
    },
    {
      id: 'automation-suite',
      name: 'Automation Suite',
      version: '3.0.1',
      description: 'Complete test automation and sequencing',
      licensing: {
        enabled: true,
        requiresLicense: true,
        tiers: [
          {
            id: 'trial',
            name: 'Trial',
            price: 0,
            currency: 'USD',
            duration: 'days',
            durationValue: 30,
            features: ['basic-automation'],
            description: '30-day trial with basic automation',
            trialDays: 30
          },
          {
            id: 'standard',
            name: 'Standard',
            price: 199.99,
            currency: 'USD',
            duration: 'perpetual',
            features: ['basic-automation', 'advanced-sequences', 'reporting'],
            description: 'Standard automation features'
          },
          {
            id: 'pro',
            name: 'Professional',
            price: 499.99,
            currency: 'USD',
            duration: 'perpetual',
            features: ['basic-automation', 'advanced-sequences', 'reporting', 'custom-scripts', 'api-control'],
            description: 'Professional automation with scripting'
          }
        ]
      }
    }
  ]);

  const handleLicenseUpdate = (pluginId, licenseKey, validation) => {
    console.log('License updated for plugin:', pluginId, validation);
    // In a real app, this would update the plugin's license status
    // and potentially reload the plugin or update its available features
  };

  const renderDashboard = () => (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Centcom Dashboard
        </h1>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {installedPlugins.length} plugins installed
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <PuzzlePieceIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Installed Plugins</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {installedPlugins.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <KeyIcon className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Licensed</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {installedPlugins.filter(p => p.licensing?.enabled).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <ChartBarIcon className="h-8 w-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {installedPlugins.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <CogIcon className="h-8 w-8 text-orange-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Updates Available</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">2</p>
            </div>
          </div>
        </div>
      </div>

      {/* Installed Plugins Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Installed Plugins
        </h2>
        <div className="space-y-4">
          {installedPlugins.map(plugin => (
            <div key={plugin.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <PuzzlePieceIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{plugin.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Version {plugin.version} • {plugin.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {plugin.licensing?.enabled ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    <KeyIcon className="h-3 w-3 mr-1" />
                    Licensed
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                    Free
                  </span>
                )}
                <button className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400">
                  Configure
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* License Management Quick Access */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100">
              License Management
            </h3>
            <p className="text-blue-700 dark:text-blue-300 mt-1">
              Manage licenses for your installed plugins, upgrade tiers, and start trials.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('licenses')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <KeyIcon className="h-4 w-4 mr-2" />
            Manage Licenses
          </button>
        </div>
      </div>
    </div>
  );

  const renderPlugins = () => (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
        Plugin Management
      </h1>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <p className="text-gray-600 dark:text-gray-400">
          Plugin installation, updates, and configuration would be managed here.
        </p>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
        Application Settings
      </h1>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <p className="text-gray-600 dark:text-gray-400">
          General application settings, preferences, and configuration options.
        </p>
      </div>
    </div>
  );

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: HomeIcon },
    { id: 'plugins', label: 'Plugins', icon: PuzzlePieceIcon },
    { id: 'licenses', label: 'License Manager', icon: KeyIcon },
    { id: 'settings', label: 'Settings', icon: CogIcon }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Centcom
                </h1>
              </div>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Demo Application
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex">
          {/* Sidebar Navigation */}
          <nav className="w-64 mr-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <ul className="space-y-2">
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <li key={tab.id}>
                      <button
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                          activeTab === tab.id
                            ? 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100'
                            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                        }`}
                      >
                        <Icon className="h-5 w-5 mr-3" />
                        {tab.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </nav>

          {/* Main Content */}
          <div className="flex-1">
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'plugins' && renderPlugins()}
            {activeTab === 'licenses' && (
              <LicenseManager
                installedPlugins={installedPlugins}
                onLicenseUpdate={handleLicenseUpdate}
              />
            )}
            {activeTab === 'settings' && renderSettings()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CentcomDemo;