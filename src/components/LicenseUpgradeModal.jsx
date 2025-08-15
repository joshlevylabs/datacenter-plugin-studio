import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  ArrowUpIcon,
  CreditCardIcon,
  CheckIcon,
  ClockIcon,
  StarIcon,
  ShieldCheckIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { licensePurchaseManager, LicenseClientUtils } from '../lib/licenseClient';
import { licenseStorage } from '../lib/licenseStorage';

/**
 * License Upgrade Modal Component
 * Handles license upgrades, downgrades, and renewals
 */
const LicenseUpgradeModal = ({ 
  isOpen, 
  onClose, 
  plugin, 
  currentLicense,
  onUpgradeComplete 
}) => {
  const [selectedTier, setSelectedTier] = useState(null);
  const [upgradeDetails, setUpgradeDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('select'); // 'select', 'confirm', 'payment', 'complete'
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [agreesToTerms, setAgreesToTerms] = useState(false);

  useEffect(() => {
    if (currentLicense?.details?.userEmail) {
      setUserEmail(currentLicense.details.userEmail);
    }
  }, [currentLicense]);

  useEffect(() => {
    if (selectedTier && currentLicense) {
      calculateUpgradeDetails();
    }
  }, [selectedTier, currentLicense]);

  const calculateUpgradeDetails = () => {
    if (!selectedTier || !currentLicense?.details) return;

    const currentTier = plugin.licensing.tiers.find(t => t.id === currentLicense.details.tierId);
    if (!currentTier) return;

    // Calculate upgrade pricing
    const isUpgrade = selectedTier.price > currentTier.price;
    const priceDifference = selectedTier.price - currentTier.price;
    
    // Calculate pro-rated credit if current license has time remaining
    let creditAmount = 0;
    if (currentLicense.details.expiresAt && currentTier.duration !== 'perpetual') {
      const now = new Date();
      const expires = new Date(currentLicense.details.expiresAt);
      const issued = new Date(currentLicense.details.issuedAt);
      
      const totalDays = Math.ceil((expires.getTime() - issued.getTime()) / (1000 * 60 * 60 * 24));
      const daysUsed = Math.ceil((now.getTime() - issued.getTime()) / (1000 * 60 * 60 * 24));
      const daysRemaining = Math.max(0, totalDays - daysUsed);
      
      if (daysRemaining > 0) {
        creditAmount = (currentTier.price * daysRemaining) / totalDays;
      }
    }

    const finalPrice = Math.max(0, priceDifference - creditAmount);

    setUpgradeDetails({
      currentTier,
      targetTier: selectedTier,
      isUpgrade,
      priceDifference,
      creditAmount,
      finalPrice,
      savings: creditAmount > 0 ? creditAmount : 0,
      immediate: finalPrice === 0
    });
  };

  const getAvailableTiers = () => {
    if (!plugin.licensing?.tiers || !currentLicense?.details) {
      return plugin.licensing?.tiers || [];
    }

    // Return all tiers except the current one
    return plugin.licensing.tiers.filter(tier => 
      tier.id !== currentLicense.details.tierId
    );
  };

  const handleTierSelect = (tier) => {
    setSelectedTier(tier);
    setError('');
  };

  const handleContinue = () => {
    if (!selectedTier) {
      setError('Please select a tier to continue');
      return;
    }

    if (!userEmail || !LicenseClientUtils.isValidEmail(userEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    setStep('confirm');
  };

  const handleConfirmUpgrade = async () => {
    if (!agreesToTerms) {
      setError('Please agree to the terms and conditions');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await licensePurchaseManager.upgradePluginLicense(
        plugin.id,
        selectedTier.id,
        userEmail,
        plugin.licensing
      );

      if (result.success) {
        if (result.newLicenseKey) {
          // Upgrade completed immediately
          setStep('complete');
          if (onUpgradeComplete) {
            onUpgradeComplete(result.newLicenseKey);
          }
        } else if (result.paymentUrl) {
          // Redirect to payment
          setStep('payment');
          window.open(result.paymentUrl, '_blank');
        }
      } else {
        setError(result.error || 'Upgrade failed');
      }
    } catch (err) {
      setError(`Upgrade failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTrial = async (tier) => {
    setLoading(true);
    setError('');

    try {
      const result = await licensePurchaseManager.startPluginTrial(
        plugin.id,
        userEmail || 'trial@example.com',
        plugin.licensing,
        {
          userName: userName || 'Trial User',
          trialDays: tier.trialDays || 30
        }
      );

      if (result.success && result.licenseKey) {
        setStep('complete');
        if (onUpgradeComplete) {
          onUpgradeComplete(result.licenseKey);
        }
      } else {
        setError(result.error || 'Trial activation failed');
      }
    } catch (err) {
      setError(`Trial activation failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderTierCard = (tier) => {
    const isCurrentTier = currentLicense?.details?.tierId === tier.id;
    const isSelected = selectedTier?.id === tier.id;
    const isTrial = tier.name.toLowerCase().includes('trial') || tier.trialDays > 0;
    const isUpgrade = currentLicense?.details && tier.price > (plugin.licensing.tiers.find(t => t.id === currentLicense.details.tierId)?.price || 0);

    return (
      <div
        key={tier.id}
        className={`relative border rounded-lg p-6 cursor-pointer transition-all ${
          isSelected
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : isCurrentTier
            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        }`}
        onClick={() => !isCurrentTier && handleTierSelect(tier)}
      >
        {isCurrentTier && (
          <div className="absolute -top-3 left-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              <CheckIcon className="h-3 w-3 mr-1" />
              Current
            </span>
          </div>
        )}

        {tier.name.toLowerCase().includes('pro') && (
          <div className="absolute -top-3 right-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
              <StarIcon className="h-3 w-3 mr-1" />
              Popular
            </span>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {tier.name}
          </h3>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {LicenseClientUtils.formatPrice(tier.price, tier.currency)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {tier.duration === 'perpetual' ? 'one-time' : `per ${tier.duration.slice(0, -1)}`}
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {tier.description}
        </p>

        {/* Features */}
        <div className="space-y-2 mb-6">
          {tier.features?.slice(0, 4).map((feature, index) => {
            const featureObj = plugin.licensing.features?.find(f => f.id === feature);
            return (
              <div key={index} className="flex items-center text-sm">
                <CheckIcon className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">
                  {featureObj?.name || feature}
                </span>
              </div>
            );
          })}
          {tier.features?.length > 4 && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              +{tier.features.length - 4} more features
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {!isCurrentTier && (
          <div className="space-y-2">
            {isTrial && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartTrial(tier);
                }}
                disabled={loading}
                className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                <ClockIcon className="h-4 w-4 mr-2" />
                Start {tier.trialDays || 30}-Day Trial
              </button>
            )}
            
            {tier.price > 0 && (
              <button
                className={`w-full inline-flex items-center justify-center px-4 py-2 border text-sm font-medium rounded-md ${
                  isSelected
                    ? 'border-transparent text-white bg-blue-600 hover:bg-blue-700'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {isUpgrade ? (
                  <>
                    <ArrowUpIcon className="h-4 w-4 mr-2" />
                    Upgrade to {tier.name}
                  </>
                ) : (
                  <>
                    <CreditCardIcon className="h-4 w-4 mr-2" />
                    {isSelected ? 'Selected' : `Get ${tier.name}`}
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderSelectStep = () => (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Choose Your License Tier
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Select a tier that best fits your needs. You can upgrade or downgrade at any time.
        </p>
      </div>

      {/* User Information */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <h4 className="font-medium text-gray-900 dark:text-white mb-3">User Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-200"
              placeholder="your@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-200"
              placeholder="Your Name"
            />
          </div>
        </div>
      </div>

      {/* Available Tiers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {getAvailableTiers().map(renderTierCard)}
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          onClick={handleContinue}
          disabled={!selectedTier || loading}
          className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </div>
  );

  const renderConfirmStep = () => (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Confirm Your Upgrade
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Review your upgrade details before proceeding.
        </p>
      </div>

      {upgradeDetails && (
        <div className="space-y-6">
          {/* Upgrade Summary */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <ArrowUpIcon className="h-5 w-5 text-blue-600 mr-2" />
              <h4 className="font-medium text-blue-900 dark:text-blue-100">
                {upgradeDetails.isUpgrade ? 'License Upgrade' : 'License Change'}
              </h4>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-blue-700 dark:text-blue-300">From:</p>
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  {upgradeDetails.currentTier.name}
                </p>
              </div>
              <div>
                <p className="text-blue-700 dark:text-blue-300">To:</p>
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  {upgradeDetails.targetTier.name}
                </p>
              </div>
            </div>
          </div>

          {/* Pricing Breakdown */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Pricing Breakdown</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  {upgradeDetails.targetTier.name} License
                </span>
                <span className="text-gray-900 dark:text-white">
                  {LicenseClientUtils.formatPrice(upgradeDetails.targetTier.price, upgradeDetails.targetTier.currency)}
                </span>
              </div>
              {upgradeDetails.creditAmount > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <span>Credit from current license</span>
                  <span>
                    -{LicenseClientUtils.formatPrice(upgradeDetails.creditAmount, upgradeDetails.currentTier.currency)}
                  </span>
                </div>
              )}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between font-medium">
                <span className="text-gray-900 dark:text-white">Total</span>
                <span className="text-gray-900 dark:text-white">
                  {LicenseClientUtils.formatPrice(upgradeDetails.finalPrice, upgradeDetails.targetTier.currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Feature Comparison */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">New Features</h4>
            <div className="space-y-2">
              {upgradeDetails.targetTier.features?.filter(f => 
                !upgradeDetails.currentTier.features?.includes(f)
              ).map((feature, index) => {
                const featureObj = plugin.licensing.features?.find(f => f.id === feature);
                return (
                  <div key={index} className="flex items-center text-sm">
                    <CheckIcon className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">
                      {featureObj?.name || feature}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Terms Agreement */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="terms"
              checked={agreesToTerms}
              onChange={(e) => setAgreesToTerms(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="terms" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              I agree to the{' '}
              <a href="#" className="text-blue-600 hover:text-blue-800 dark:text-blue-400">
                terms and conditions
              </a>{' '}
              and{' '}
              <a href="#" className="text-blue-600 hover:text-blue-800 dark:text-blue-400">
                privacy policy
              </a>
            </label>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mt-6">
        <button
          onClick={() => setStep('select')}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Back
        </button>
        <button
          onClick={handleConfirmUpgrade}
          disabled={!agreesToTerms || loading}
          className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Processing...' : 
           upgradeDetails?.immediate ? 'Upgrade Now' : 'Proceed to Payment'}
        </button>
      </div>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="text-center">
      <div className="mb-6">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900">
          <CheckIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
          Upgrade Complete!
        </h3>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Your license has been successfully upgraded to {selectedTier?.name}.
        </p>
      </div>

      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
        <div className="flex items-center">
          <InformationCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
          <p className="text-sm text-green-800 dark:text-green-200">
            Your new features are now available. The plugin may need to be restarted to apply all changes.
          </p>
        </div>
      </div>

      <button
        onClick={onClose}
        className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
      >
        Done
      </button>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-auto mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Upgrade License - {plugin?.name}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Version {plugin?.version}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
                <p className="text-red-800 dark:text-red-200">{error}</p>
              </div>
            </div>
          )}

          {/* Step Content */}
          {step === 'select' && renderSelectStep()}
          {step === 'confirm' && renderConfirmStep()}
          {step === 'complete' && renderCompleteStep()}
          {step === 'payment' && (
            <div className="text-center py-8">
              <CreditCardIcon className="h-12 w-12 mx-auto text-blue-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Complete Your Payment
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                A payment window has been opened. Complete your purchase and return here.
              </p>
              <button
                onClick={() => setStep('complete')}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
              >
                Payment Complete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LicenseUpgradeModal;