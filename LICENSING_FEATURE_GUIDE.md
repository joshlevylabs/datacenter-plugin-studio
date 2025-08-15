# Plugin Licensing System - Complete Implementation Guide

## Overview

This document describes the comprehensive licensing system implemented for the Plugin Development Studio. The system provides cryptographically secure license generation, validation, and management for plugin developers.

## Features Implemented

### 🔐 Core Licensing Features
- **Cryptographic Security**: RSA-2048/4096 and ECDSA-P256/P384 support
- **License Tiers**: Multiple pricing tiers with customizable features
- **Remote Validation**: Server-based license validation with offline support
- **Feature Gating**: Granular control over plugin features
- **License Stacking**: Support for multiple licenses to unlock additional features
- **Trial Periods**: Configurable trial periods for each tier
- **Expiration Control**: Time-based and perpetual licenses

### 🛠 Developer Tools
- **Visual Configuration**: Comprehensive UI for license setup
- **Key Generation**: Built-in cryptographic key pair generation
- **Validation Testing**: Real-time license validation in the studio
- **Build Integration**: Automatic inclusion of licensing data in .lycplugin files

## File Structure

```
src/
├── components/
│   ├── LicensingPanel.jsx          # Main licensing configuration UI
│   └── LicensingPanel.css          # Styling for licensing panel
├── lib/
│   ├── licensing.ts                # Core licensing system
│   └── studio.ts                   # Updated with license validation
└── App.tsx                         # Updated to include licensing tab

src-tauri/
├── src/
│   └── main.rs                     # Backend license validation commands
└── Cargo.toml                      # Added crypto dependencies
```

## Usage Guide

### For Plugin Developers

#### 1. Enable Licensing
1. Open your plugin in the Plugin Development Studio
2. Navigate to the "Licensing" tab
3. Check "Enable Licensing System"
4. Choose whether to require licenses or make them optional

#### 2. Configure License Tiers
1. Click "Add Tier" to create a new license tier
2. Configure:
   - **Tier Name**: e.g., "Basic", "Pro", "Enterprise"
   - **Price**: Cost in your chosen currency
   - **Duration**: Perpetual, or time-based (days/months/years)
   - **Max Users**: Maximum concurrent users
   - **Description**: Tier description for customers
   - **Trial Days**: Free trial period
   - **Stackable**: Whether licenses can be combined

#### 3. Define Features
1. Add plugin features that can be licensed
2. Mark features as "required" (free) or "premium" (paid)
3. Features will be checked against user licenses at runtime

#### 4. Advanced Configuration
1. **Remote Validation**: Configure server endpoint for license checks
2. **Cryptography**: Generate RSA/ECDSA key pairs for signing
3. **License Server**: Set up your license distribution server

#### 5. Build and Deploy
1. Build your plugin normally - licensing configuration is automatically included
2. The .lycplugin file will contain all licensing metadata
3. Centcom will enforce licensing when the plugin is loaded

### For End Users (Plugin Consumers)

#### License Installation
When using a licensed plugin in Centcom:
1. The plugin will prompt for a license key if required
2. Enter the license key provided by the plugin developer
3. The plugin will validate the license and enable appropriate features

#### Feature Access
- Free features work without a license
- Premium features require a valid license
- Trial periods allow temporary access to paid features
- Offline usage is supported for a configurable period

## Technical Implementation

### License Generation
```typescript
const licensingSystem = new LicensingSystem(pluginId, licenseConfig);

const license = await licensingSystem.generateLicense({
  pluginId: 'my-plugin',
  tierId: 'pro-tier',
  userId: 'user123',
  userEmail: 'user@example.com'
});

console.log(license.key); // LYC-<base64-encoded-license>
```

### License Validation
```typescript
const validation = await licensingSystem.validateLicense(licenseKey);

if (validation.valid) {
  console.log('License is valid');
  console.log('Enabled features:', validation.features);
} else {
  console.log('License errors:', validation.errors);
}
```

### Feature Checking
```typescript
const hasFeature = await licensingSystem.isFeatureEnabled(
  licenseKey, 
  'advanced-analytics'
);

if (hasFeature) {
  // Enable advanced analytics
} else {
  // Show upgrade prompt
}
```

## Security Features

### Cryptographic Security
- **RSA-2048/4096**: Industry-standard public key cryptography
- **ECDSA-P256/P384**: Elliptic curve signatures for smaller keys
- **SHA-256/384/512**: Secure hash algorithms for integrity
- **Base64 Encoding**: Safe transport encoding for license keys

### Anti-Tampering
- **Digital Signatures**: All licenses are cryptographically signed
- **Payload Integrity**: License data cannot be modified without detection
- **Clock Skew Protection**: Prevents future-dated licenses
- **Plugin ID Binding**: Licenses are tied to specific plugins

### Remote Control
- **License Revocation**: Instantly disable licenses remotely
- **Usage Monitoring**: Track license usage and violations
- **Offline Limits**: Control how long licenses work offline
- **Server Validation**: Regular server check-ins for active licenses

## Best Practices

### For Plugin Developers

1. **Start Simple**: Begin with basic licensing and add complexity as needed
2. **Clear Tiers**: Make license tiers clearly differentiated
3. **Generous Trials**: Offer meaningful trial periods
4. **Offline Support**: Allow reasonable offline usage
5. **Error Handling**: Provide clear messages for license issues

### Security Recommendations

1. **Key Protection**: Store private keys securely
2. **Server Security**: Use HTTPS for all license operations
3. **Regular Updates**: Keep cryptographic libraries updated
4. **Audit Logging**: Log all license operations
5. **Backup Keys**: Maintain secure backups of signing keys

## API Reference

### LicensingSystem Class

#### Constructor
```typescript
new LicensingSystem(pluginId: string, config: LicenseConfig)
```

#### Methods
- `generateLicense(request: LicenseGenerationRequest): Promise<License>`
- `validateLicense(licenseKey: string): Promise<LicenseValidationResult>`
- `isFeatureEnabled(licenseKey: string, featureId: string): Promise<boolean>`
- `generateKeyPair(): Promise<{publicKey: string, privateKey: string}>`
- `revokeLicense(licenseKey: string, reason?: string): Promise<boolean>`

### Tauri Commands

#### Backend Commands Available
- `generate_license_keys(algorithm, keySize)`
- `sign_license(payload, privateKey, algorithm, hashAlgorithm)`
- `verify_license_signature(payload, signature, publicKey, algorithm, hashAlgorithm)`
- `validate_plugin_license(pluginId, licenseKey)`
- `check_feature_access(pluginId, licenseKey, featureId)`

## License Schema

### Complete License Configuration
```json
{
  "licensing": {
    "enabled": true,
    "requiresLicense": true,
    "allowOffline": true,
    "maxOfflineDays": 7,
    "remoteValidation": {
      "enabled": true,
      "endpoint": "https://api.yourcompany.com/validate",
      "checkInterval": 24
    },
    "tiers": [
      {
        "id": "basic",
        "name": "Basic",
        "price": 29.99,
        "currency": "USD",
        "duration": "perpetual",
        "maxUsers": 1,
        "features": ["basic-feature-1", "basic-feature-2"],
        "description": "Basic functionality",
        "trialDays": 14,
        "stackable": false
      }
    ],
    "features": [
      {
        "id": "basic-feature-1",
        "name": "Basic Analytics",
        "description": "View basic analytics",
        "required": false,
        "premium": false
      }
    ],
    "cryptography": {
      "algorithm": "RSA-2048",
      "keySize": 2048,
      "hashAlgorithm": "SHA-256",
      "publicKey": "-----BEGIN PUBLIC KEY-----...",
      "privateKey": "-----BEGIN PRIVATE KEY-----..."
    },
    "licenseServer": {
      "url": "https://license.yourcompany.com",
      "apiKey": "your-api-key",
      "allowSelfSigned": false
    }
  }
}
```

## Integration Examples

### Basic Plugin with Licensing
```jsx
import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api';

const MyPlugin = () => {
  const [licensed, setLicensed] = useState(false);
  const [features, setFeatures] = useState([]);

  useEffect(() => {
    checkLicense();
  }, []);

  const checkLicense = async () => {
    const licenseKey = localStorage.getItem('plugin-license');
    if (licenseKey) {
      const result = await invoke('validate_plugin_license', {
        pluginId: 'my-plugin',
        licenseKey
      });
      
      setLicensed(result.valid);
      if (result.valid) {
        // Get available features
        setFeatures(['basic', 'premium']); // Based on license
      }
    }
  };

  const renderBasicFeature = () => (
    <div>Basic feature available to all users</div>
  );

  const renderPremiumFeature = () => {
    if (!licensed || !features.includes('premium')) {
      return <div>Premium feature - License required</div>;
    }
    
    return <div>Premium feature content</div>;
  };

  return (
    <div>
      <h1>My Plugin</h1>
      {renderBasicFeature()}
      {renderPremiumFeature()}
    </div>
  );
};
```

## Troubleshooting

### Common Issues

1. **License Validation Fails**
   - Check plugin ID matches license
   - Verify license hasn't expired
   - Confirm network connectivity for remote validation

2. **Features Not Unlocking**
   - Verify feature IDs match configuration
   - Check license tier includes required features
   - Confirm license is still valid

3. **Key Generation Errors**
   - Ensure Tauri backend is running
   - Check cryptographic dependencies are installed
   - Verify sufficient entropy for key generation

### Debug Mode

Enable debug logging by setting `localStorage.setItem('licensing-debug', 'true')` in the browser console.

## Future Enhancements

### Planned Features
- **Hardware Fingerprinting**: Bind licenses to specific machines
- **Usage Analytics**: Detailed license usage tracking
- **Automatic Updates**: License renewal and update mechanisms
- **Multi-Platform Support**: Cross-platform license sharing
- **Enterprise Features**: Bulk licensing and management tools

## Support

For issues with the licensing system:
1. Check this documentation first
2. Review the debug logs
3. Test with a fresh license key
4. Contact the plugin developer for licensing issues
5. Report bugs to the Plugin Development Studio team

---

*This licensing system provides enterprise-grade security and flexibility for plugin monetization while maintaining ease of use for both developers and end users.*