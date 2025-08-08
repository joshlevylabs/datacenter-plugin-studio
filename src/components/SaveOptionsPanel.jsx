import React, { useState } from 'react';
import './SaveOptionsPanel.css';

/**
 * Component for managing plugin save options
 */
const SaveOptionsPanel = ({ metadata, onSavePlugin, onBuildPlugin }) => {
  const [saveMode, setSaveMode] = useState('overwrite'); // 'overwrite' or 'new'
  const [customName, setCustomName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  
  // Generate suggested filename based on metadata
  const generateFilename = () => {
    if (!metadata) return 'plugin-v1.0.0.lycplugin';
    
    const name = metadata.name || 'plugin';
    const version = metadata.version || '1.0.0';
    
    // Clean the name for use in filename
    const cleanName = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim();
    
    return `${cleanName}-v${version}.lycplugin`;
  };
  
  const suggestedFilename = generateFilename();
  
  // Handle save operation
  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    
    try {
      const filename = saveMode === 'new' ? (customName || suggestedFilename) : null;
      
      const result = await onSavePlugin({
        mode: saveMode,
        filename: filename
      });
      
      if (result.success) {
        setSaveMessage({
          type: 'success',
          text: `Plugin saved successfully${filename ? ` as ${filename}` : ''}`
        });
      } else {
        setSaveMessage({
          type: 'error',
          text: result.error || 'Failed to save plugin'
        });
      }
    } catch (error) {
      setSaveMessage({
        type: 'error',
        text: `Save error: ${error.message}`
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Handle build operation
  const handleBuild = async () => {
    try {
      await onBuildPlugin();
    } catch (error) {
      setSaveMessage({
        type: 'error',
        text: `Build error: ${error.message}`
      });
    }
  };
  
  return (
    <div className="save-options-panel">
      <h4>Save Options</h4>
      
      <div className="save-mode-selector">
        <label className="radio-option">
          <input
            type="radio"
            value="overwrite"
            checked={saveMode === 'overwrite'}
            onChange={(e) => setSaveMode(e.target.value)}
          />
          <span>Overwrite existing plugin file</span>
        </label>
        
        <label className="radio-option">
          <input
            type="radio"
            value="new"
            checked={saveMode === 'new'}
            onChange={(e) => setSaveMode(e.target.value)}
          />
          <span>Save as new file</span>
        </label>
      </div>
      
      {saveMode === 'new' && (
        <div className="filename-options">
          <div className="suggested-filename">
            <strong>Suggested filename:</strong> {suggestedFilename}
          </div>
          
          <div className="form-group">
            <label htmlFor="custom-filename">Custom filename (optional):</label>
            <input
              id="custom-filename"
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder={suggestedFilename}
            />
            <small>Leave empty to use suggested filename</small>
          </div>
        </div>
      )}
      
      <div className="save-actions">
        <button 
          className="btn-save" 
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Plugin'}
        </button>
        
        <button 
          className="btn-build" 
          onClick={handleBuild}
          disabled={isSaving}
        >
          Build & Test
        </button>
      </div>
      
      {saveMessage && (
        <div className={`save-message ${saveMessage.type}`}>
          {saveMessage.text}
        </div>
      )}
      
      <div className="save-info">
        <h5>Save Information:</h5>
        <ul>
          <li><strong>Overwrite:</strong> Updates the existing custom-plugin-skeleton.lycplugin file</li>
          <li><strong>New file:</strong> Creates a new .lycplugin file with the specified name</li>
          <li><strong>Filename format:</strong> [plugin-name]-v[version].lycplugin</li>
        </ul>
      </div>
    </div>
  );
};

export default SaveOptionsPanel;