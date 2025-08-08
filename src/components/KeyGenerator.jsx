import React, { useEffect, useState } from 'react';
import './KeyGenerator.css';

/**
 * Component for generating cryptographic keys for plugin licensing
 */
const KeyGenerator = ({ requiresLicense = false, onToggleRequiresLicense, onKeysGenerated }) => {
  const [algorithm, setAlgorithm] = useState('rsa');
  const [modulusLength, setModulusLength] = useState(2048);
  const [isGenerating, setIsGenerating] = useState(false);
  const [keys, setKeys] = useState(null);
  const [error, setError] = useState('');
  const [isLicenseRequired, setIsLicenseRequired] = useState(!!requiresLicense);

  useEffect(() => {
    setIsLicenseRequired(!!requiresLicense);
  }, [requiresLicense]);
  
  // Available key algorithms
  const algorithms = [
    { value: 'rsa', label: 'RSA' },
    { value: 'ec', label: 'Elliptic Curve' }
  ];
  
  // Available key sizes
  const keySizes = [
    { value: 1024, label: '1024 bits (weak)' },
    { value: 2048, label: '2048 bits (recommended)' },
    { value: 4096, label: '4096 bits (strong)' }
  ];
  
  // Handle key generation
  const handleGenerateKeys = async () => {
    setIsGenerating(true);
    setError('');
    setKeys(null);
    
    try {
      // Call API to generate keys
      const response = await fetch('http://localhost:3030/api/generate-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ algorithm, modulusLength })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setKeys(data.keys);
        if (onKeysGenerated) {
          onKeysGenerated(data.keys);
        }
      } else {
        setError(data.error || 'Failed to generate keys');
      }
    } catch (err) {
      setError(`Key generation failed: ${err.message}`);
      console.error('Key generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggle = async (e) => {
    const next = e.target.checked;
    setIsLicenseRequired(next);
    try {
      if (onToggleRequiresLicense) {
        await onToggleRequiresLicense(next);
      }
    } catch (err) {
      setError(`Failed to update license requirement: ${err.message}`);
      // revert UI if API failed
      setIsLicenseRequired(!next);
    }
  };
  
  // Copy key to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        alert('Copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy:', err);
      });
  };
  
  return (
    <div className="key-generator">
      <h3>License Security</h3>
      <div className="license-toggle">
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={isLicenseRequired}
            onChange={handleToggle}
          />
          <span>Require license to load/register this plugin</span>
        </label>
        {!isLicenseRequired && (
          <div className="license-info disabled">
            Licensing is disabled. Users can load this plugin without a license.
          </div>
        )}
      </div>
      <p className="key-description">
        Generate cryptographic keys for plugin license validation.
        Store your private key securely and add the public key to your plugin.
      </p>
      
      <div className={`key-options ${!isLicenseRequired ? 'dimmed' : ''}`}>
        <div className="form-group">
          <label htmlFor="algorithm">Algorithm</label>
          <select 
            id="algorithm"
            value={algorithm}
            onChange={(e) => setAlgorithm(e.target.value)}
            disabled={isGenerating || !isLicenseRequired}
          >
            {algorithms.map(alg => (
              <option key={alg.value} value={alg.value}>{alg.label}</option>
            ))}
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="keySize">Key Size</label>
          <select 
            id="keySize"
            value={modulusLength}
            onChange={(e) => setModulusLength(Number(e.target.value))}
            disabled={isGenerating || !isLicenseRequired}
          >
            {keySizes.map(size => (
              <option key={size.value} value={size.value}>{size.label}</option>
            ))}
          </select>
        </div>
      </div>
      
      <button 
        className="generate-button" 
        onClick={handleGenerateKeys}
        disabled={isGenerating || !isLicenseRequired}
      >
        {isGenerating ? 'Generating...' : 'Generate New Keys'}
      </button>
      
      {error && <div className="key-error">{error}</div>}
      
      {keys && isLicenseRequired && (
        <div className="key-results">
          <div className="key-result">
            <h4>Public Key</h4>
            <p className="key-hint">Add this to the plugin's license.validation.public_key field</p>
            <div className="key-display">
              <pre>{keys.publicKey}</pre>
              <button 
                className="copy-button" 
                onClick={() => copyToClipboard(keys.publicKey)}
                title="Copy to clipboard"
              >
                Copy
              </button>
            </div>
          </div>
          
          <div className="key-result">
            <h4>Private Key</h4>
            <p className="key-hint">Keep this secure and use it to sign plugin licenses</p>
            <div className="key-display">
              <pre>{keys.privateKey}</pre>
              <button 
                className="copy-button" 
                onClick={() => copyToClipboard(keys.privateKey)}
                title="Copy to clipboard"
              >
                Copy
              </button>
            </div>
          </div>
          
          <div className="key-warning">
            <strong>IMPORTANT:</strong> Store your private key in a secure location. 
            It should never be included in your plugin or shared publicly.
          </div>
        </div>
      )}
    </div>
  );
};

export default KeyGenerator;