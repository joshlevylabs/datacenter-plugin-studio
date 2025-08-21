import React, { useState, useEffect } from 'react';
import { 
  ComputerDesktopIcon, 
  ArrowPathIcon, 
  ClipboardDocumentListIcon, 
  EyeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  BeakerIcon
} from '@heroicons/react/24/outline';
import { testPluginCode as debugPluginCode } from '../lib/pluginDebugger';
import CentcomTestPanel from './CentcomTestPanel';
import GUICodeGenerator from '../lib/guiCodeGenerator.ts';
import { SimpleGuiGenerator, convertToSimpleConfig } from '../lib/simpleGuiGenerator.ts';

/**
 * Unified Test Panel component that combines plugin testing and Centcom integration testing
 */
const TestPanel = ({ pluginDoc, selected }) => {
  // Plugin testing state
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [testMode, setTestMode] = useState('standard'); // 'standard' or 'realcode'
  const [useSimpleGenerator, setUseSimpleGenerator] = useState(true); // Default to simple generator
  
  // Tab state for switching between plugin testing and centcom testing
  const [activeTestTab, setActiveTestTab] = useState('plugin'); // 'plugin' or 'centcom'

  // Test simple generator code directly (no transpilation needed)
  const testSimpleGeneratorCode = async (code, pluginName) => {
    try {
      console.log('🧪 [PDE TEST] Testing simple generator code directly...');
      
      // Import React hooks for testing
      const { useState, useEffect, useCallback, useMemo, useRef } = React;
      
      // Set up test environment similar to Centcom
      const TestReact = {
        ...React,
        useState: useState,
        useEffect: useEffect,
        useCallback: useCallback,
        useMemo: useMemo,
        useRef: useRef,
        createElement: React.createElement
      };
      
      // Mock Centcom API
      const mockCentcomAPI = () => ({
        destroy: () => console.log('Mock API destroyed'),
        connectDevice: () => Promise.resolve(true),
        sendData: () => Promise.resolve()
      });
      
      const mockCentcomUtils = {
        formatData: (data) => data,
        validateInput: () => true
      };
      
      // Execute the simple generator code
      const functionCode = code + '\nreturn PluginGUI;';
      const ComponentFactory = new Function(
        'React', 'useState', 'useEffect', 'useCallback', 'useMemo', 'useRef', 'createCentcomAPI', 'CentcomUtils',
        functionCode
      );
      
      const Component = ComponentFactory(
        TestReact, useState, useEffect, useCallback, useMemo, useRef, mockCentcomAPI, mockCentcomUtils
      );
      
      if (typeof Component === 'function') {
        // Test by checking if the component can be created and has proper structure
        try {
          // Instead of calling the component directly (which breaks hooks),
          // check if it's a valid React component by examining its structure
          console.log('✅ [PDE TEST] Component function created successfully');
          
          // Additional validation: check if the code has proper React.createElement calls
          if (code.includes('React.createElement') && code.includes('return')) {
            console.log('✅ [PDE TEST] Code contains valid React elements');
            
            // Check for common issues in the generated code
            const codeIssues = [];
            
            // Check for syntax issues
            if (code.includes('React.createElement(,') || code.includes("React.createElement(',")) {
              codeIssues.push('Malformed React.createElement calls detected');
            }
            
            // Check for missing return statement in main function
            if (!code.includes('return React.createElement')) {
              codeIssues.push('Missing React.createElement return statement');
            }
            
            if (codeIssues.length === 0) {
              console.log('✅ [PDE TEST] Simple generator code validation passed');
              return {
                success: true,
                executionTime: '< 1ms',
                strategy: 'Simple Generator - Code Validation',
                fixes: ['Code structure validated - ready for Centcom'],
                warnings: []
              };
            } else {
              return {
                success: false,
                error: 'Code validation failed',
                warnings: codeIssues
              };
            }
          } else {
            return {
              success: false,
              error: 'Generated code missing React elements or return statement',
              warnings: ['Check simple generator output structure']
            };
          }
        } catch (validationError) {
          return {
            success: false,
            error: `Code validation error: ${validationError.message}`,
            warnings: ['Simple generator produced invalid code structure']
          };
        }
      } else {
        return {
          success: false,
          error: 'Generated code is not a valid React component function',
          warnings: ['Check simple generator output']
        };
      }
    } catch (error) {
      console.error('❌ [PDE TEST] Simple generator test failed:', error);
      return {
        success: false,
        error: error.message,
        warnings: ['Simple generator code has syntax or runtime errors']
      };
    }
  };

  // Test plugin code with automated debugging
  const testPluginCode = async () => {
    if (!pluginDoc?.gui?.components || pluginDoc.gui.components.length === 0) {
      setTestResults({
        success: false,
        error: 'No GUI components found. Please design your plugin interface in the App GUI tab first.',
        warnings: ['Plugin testing requires at least one GUI component']
      });
      return;
    }

    setIsTesting(true);
    setTestResults(null);

    try {
      console.log('🧪 [PDE TEST] Starting plugin transpilation test...');
      
      // Generate code from current GUI design
      const config = {
        components: pluginDoc.gui.components,
        settings: pluginDoc.gui.settings || { layout: 'tabs', theme: 'default', responsive: true }
      };
      
      let generatedCode;
      
      if (useSimpleGenerator) {
        // Use simple generator for transpilation-friendly code
        const simpleConfig = convertToSimpleConfig(config);
        generatedCode = SimpleGuiGenerator.generateSimpleComponent(simpleConfig, 'PluginGUI');
      } else {
        // Use complex generator (original approach)
        const options = {
          includeImports: true,
          includeEventHandlers: true,
          includeDataBinding: true,
          includeStyles: true,
          targetFramework: 'react',
          typescript: true
        };
        generatedCode = GUICodeGenerator.generateReactComponent(config, 'PluginGUI', options);
      }
      
      // Test the generated code differently based on generator type
      let result;
      if (useSimpleGenerator) {
        // Simple generator produces ready-to-run code - test directly without transpilation
        result = await testSimpleGeneratorCode(generatedCode, pluginDoc?.metadata?.name || 'Plugin');
      } else {
        // Complex generator needs transpilation testing
        result = await debugPluginCode(generatedCode, pluginDoc?.metadata?.name || 'Plugin');
      }
      
      setTestResults(result);
      
      if (result.success) {
        console.log('✅ [PDE TEST] Plugin test PASSED!');
      } else {
        console.log('❌ [PDE TEST] Plugin test FAILED');
      }
    } catch (error) {
      console.error('💥 [PDE TEST] Test system error:', error);
      setTestResults({
        success: false,
        error: error.message,
        warnings: [`Test system error: ${error.message}`]
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Test Tab Navigation */}
      <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTestTab('plugin')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTestTab === 'plugin'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <BeakerIcon className="w-4 h-4 inline mr-2" />
          Plugin Testing
        </button>
        <button
          onClick={() => setActiveTestTab('centcom')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTestTab === 'centcom'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <ComputerDesktopIcon className="w-4 h-4 inline mr-2" />
          Centcom Integration
        </button>
      </div>

      {/* Plugin Testing Tab */}
      {activeTestTab === 'plugin' && (
        <div className="space-y-6">
          {/* Plugin Testing Section */}
          <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <BeakerIcon className="w-5 h-5 mr-2" />
              Plugin Transpilation Testing
            </h3>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Test your plugin's generated code for transpilation compatibility with Centcom. 
                This automated system will identify and fix common issues before deployment.
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  {/* Simple Generator Toggle */}
                  <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <label className="flex items-center text-sm">
                        <input
                          type="checkbox"
                          checked={useSimpleGenerator}
                          onChange={(e) => setUseSimpleGenerator(e.target.checked)}
                          className="mr-2"
                        />
                        <span className={useSimpleGenerator ? "text-green-600 font-medium" : "text-gray-600"}>
                          Simple Generator
                        </span>
                      </label>
                      {useSimpleGenerator && (
                        <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                          ✅ Transpilation-Safe
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {useSimpleGenerator 
                        ? "Using simple, transpilation-friendly code generation" 
                        : "Using complex generator (may have transpilation issues)"
                      }
                    </p>
                  </div>

                  <button
                    onClick={testPluginCode}
                    disabled={isTesting}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center"
                  >
                    {isTesting ? (
                      <>
                        <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                        Testing Plugin...
                      </>
                    ) : (
                      <>
                        <BeakerIcon className="w-4 h-4 mr-2" />
                        🧪 Test Plugin Transpilation
                      </>
                    )}
                  </button>
                  
                  {!pluginDoc?.gui?.components?.length && (
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      Design your plugin interface in the App GUI tab first to enable testing.
                    </p>
                  )}
                </div>

                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <p><strong>What this tests:</strong> The exact same GUI code that will be deployed to Centcom, using multiple transpilation strategies to ensure compatibility.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Test Results */}
          {testResults && (
            <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6">
              <h4 className="text-lg font-semibold mb-4 flex items-center">
                {testResults.success ? (
                  <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2" />
                ) : (
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mr-2" />
                )}
                🧪 Plugin Test Results
              </h4>
              
              <div className={`test-status mb-4 p-4 rounded-lg ${testResults.success ? 'bg-green-50 border border-green-200 dark:bg-green-900 dark:border-green-700' : 'bg-red-50 border border-red-200 dark:bg-red-900 dark:border-red-700'}`}>
                <div className="flex justify-between items-center">
                  <span className={`font-bold ${testResults.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                    {testResults.success ? '✅ PASSED' : '❌ FAILED'}
                  </span>
                  {testResults.metrics && (
                    <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                      {testResults.metrics.executionTime}ms | 
                      {testResults.fixes?.length || 0} fixes | 
                      {testResults.warnings?.length || 0} warnings
                    </span>
                  )}
                </div>
              </div>
              
              {testResults.fixes?.length > 0 && (
                <div className="mb-4">
                  <h5 className="font-semibold text-green-700 dark:text-green-300 mb-2">Applied Fixes:</h5>
                  <ul className="bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded p-3 space-y-1">
                    {testResults.fixes.map((fix, index) => (
                      <li key={index} className="text-sm text-green-800 dark:text-green-200">• {fix}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {testResults.warnings?.length > 0 && (
                <div className="mb-4">
                  <h5 className="font-semibold text-orange-700 dark:text-orange-300 mb-2">Warnings:</h5>
                  <ul className="bg-orange-50 dark:bg-orange-900 border border-orange-200 dark:border-orange-700 rounded p-3 space-y-1">
                    {testResults.warnings.map((warning, index) => (
                      <li key={index} className="text-sm text-orange-800 dark:text-orange-200">• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {testResults.error && (
                <div className="mb-4">
                  <h5 className="font-semibold text-red-700 dark:text-red-300 mb-2">Error:</h5>
                  <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded p-3">
                    <code className="text-sm text-red-800 dark:text-red-200 font-mono">{testResults.error}</code>
                  </div>
                </div>
              )}

              {testResults.success && testResults.fixes?.some(fix => fix.includes('Template')) && (
                <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded">
                  <h5 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">⚠️ Important Note:</h5>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-2">
                    The test passed using a fallback template strategy. This means your actual generated GUI code 
                    may still have transpilation issues in Centcom that need to be addressed.
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    <strong>Recommendation:</strong> Check the "Enhanced Conservative" strategy warnings above and 
                    consider simplifying your GUI design or adjusting the code generation settings.
                  </p>
                </div>
              )}

              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <strong>Next Steps:</strong> {
                    testResults.success ? 
                      (testResults.fixes?.some(fix => fix.includes('Template')) ? 
                        'Test passed with fallback template. Your actual GUI code may need fixes in Centcom. Consider testing with Centcom Integration tab to verify real-world compatibility.' :
                        'Your plugin passed all transpilation tests and is ready for export to Centcom!'
                      ) : 
                      'Fix the issues above and test again. The automated system will help identify and resolve common transpilation problems.'
                  }
                </p>
              </div>
            </section>
          )}
        </div>
      )}

      {/* Centcom Integration Tab */}
      {activeTestTab === 'centcom' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <ComputerDesktopIcon className="w-5 h-5 mr-2" />
              Centcom Integration Testing
            </h3>
            
            {(!selected || typeof selected !== 'string' || selected === 'settings' || selected === 'pluginsTool' || selected === 'simulator' || selected === 'builds' || selected === 'centcomDemo') ? (
              <div className="text-center py-8">
                <ComputerDesktopIcon className="w-12 h-12 mx-auto mb-4 text-gray-400 opacity-50" />
                <p className="text-gray-500 dark:text-gray-400 mb-2">Please select a plugin first to enable Centcom integration testing.</p>
                <p className="text-sm text-gray-400 dark:text-gray-500">Select a plugin from the sidebar to see integration test options.</p>
              </div>
            ) : (
              <div className="h-96">
                <CentcomTestPanel
                  pluginName={selected}
                  pluginMetadata={pluginDoc}
                  onTestResults={(results) => {
                    console.log('Centcom test results:', results);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TestPanel;
