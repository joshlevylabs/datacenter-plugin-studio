import React, { useState } from 'react';
import './VersionEditor.css';

/**
 * Version Editor component for managing plugin version numbers
 */
const VersionEditor = ({ currentVersion, onUpdateVersion }) => {
  const [version, setVersion] = useState(currentVersion || '1.0.0');
  const [isValid, setIsValid] = useState(true);
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  
  // Parse version into parts for easier editing
  const parsedVersion = version.split('.');
  const major = parseInt(parsedVersion[0]) || 0;
  const minor = parseInt(parsedVersion[1]) || 0;
  const patch = parseInt(parsedVersion[2]) || 0;
  
  // Validate version format
  const validateVersion = (value) => {
    const regex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
    const valid = regex.test(value);
    setIsValid(valid);
    setError(valid ? '' : 'Version must be in format: X.Y.Z (e.g. 1.0.0)');
    return valid;
  };
  
  // Handle version input change
  const handleVersionChange = (e) => {
    const value = e.target.value;
    setVersion(value);
    validateVersion(value);
  };
  
  // Handle version increment
  const incrementVersion = (type) => {
    let newMajor = major;
    let newMinor = minor;
    let newPatch = patch;
    
    switch (type) {
      case 'major':
        newMajor += 1;
        newMinor = 0;
        newPatch = 0;
        break;
      case 'minor':
        newMinor += 1;
        newPatch = 0;
        break;
      case 'patch':
        newPatch += 1;
        break;
      default:
        break;
    }
    
    const newVersion = `${newMajor}.${newMinor}.${newPatch}`;
    setVersion(newVersion);
    setIsValid(true);
    setError('');
  };
  
  // Handle update button click
  const handleUpdate = async () => {
    if (!isValid) return;
    
    setIsBusy(true);
    try {
      await onUpdateVersion(version);
    } catch (error) {
      setError(`Failed to update version: ${error.message}`);
    } finally {
      setIsBusy(false);
    }
  };
  
  return (
    <div className="version-editor">
      <div className="version-input-container">
        <label htmlFor="version-input">Plugin Version</label>
        <input
          id="version-input"
          type="text"
          value={version}
          onChange={handleVersionChange}
          placeholder="1.0.0"
          className={!isValid ? 'invalid' : ''}
        />
      </div>
      
      <div className="version-actions">
        <div className="version-buttons">
          <button 
            onClick={() => incrementVersion('major')}
            title="Increment major version (breaking changes)"
            className="btn-major"
          >
            Major +
          </button>
          <button 
            onClick={() => incrementVersion('minor')}
            title="Increment minor version (new features)"
            className="btn-minor"
          >
            Minor +
          </button>
          <button 
            onClick={() => incrementVersion('patch')}
            title="Increment patch version (bug fixes)"
            className="btn-patch"
          >
            Patch +
          </button>
        </div>
        
        <button 
          onClick={handleUpdate}
          disabled={!isValid || isBusy}
          className="btn-update"
        >
          {isBusy ? 'Updating...' : 'Update Version'}
        </button>
      </div>
      
      {error && <div className="version-error">{error}</div>}
      
      <div className="version-help">
        <p><strong>Version Format:</strong> MAJOR.MINOR.PATCH</p>
        <ul>
          <li><strong>MAJOR</strong>: Breaking changes</li>
          <li><strong>MINOR</strong>: New features (backwards compatible)</li>
          <li><strong>PATCH</strong>: Bug fixes (backwards compatible)</li>
        </ul>
      </div>
    </div>
  );
};

export default VersionEditor;