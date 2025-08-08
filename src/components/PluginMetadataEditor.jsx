import React, { useState } from 'react';
import './PluginMetadataEditor.css';

/**
 * Component for editing basic plugin metadata like name, description, etc.
 */
const PluginMetadataEditor = ({ metadata, onUpdateMetadata, hideName = false }) => {
  const [name, setName] = useState(metadata?.name || '');
  const [description, setDescription] = useState(metadata?.description || '');
  const [author, setAuthor] = useState(metadata?.author || '');
  const [category, setCategory] = useState(metadata?.category || 'Measurement Tools');
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');
  
  // Available categories
  const categories = [
    'Measurement Tools',
    'Analysis Tools',
    'Data Processing',
    'Hardware Interface',
    'Utility',
    'Testing',
    'Development'
  ];
  
  // Handle form submission
  const handleUpdate = async (e) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Plugin name is required');
      return;
    }
    
    setIsBusy(true);
    setError('');
    
    try {
      const updatedMetadata = {
        name: name.trim(),
        description: description.trim(),
        author: author.trim(),
        category: category
      };
      
      await onUpdateMetadata(updatedMetadata);
    } catch (err) {
      setError(`Failed to update metadata: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };
  
  // Handle individual field updates
  const handleFieldUpdate = async (field, value) => {
    if (isBusy) return;
    
    try {
      const updatedMetadata = { [field]: value };
      await onUpdateMetadata(updatedMetadata);
    } catch (err) {
      setError(`Failed to update ${field}: ${err.message}`);
    }
  };
  
  return (
    <div className="metadata-editor">
      <form onSubmit={handleUpdate}>
        {!hideName && (
          <div className="form-group">
            <label htmlFor="plugin-name">Plugin Name *</label>
            <input
              id="plugin-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => handleFieldUpdate('name', name.trim())}
              placeholder="Enter plugin name"
              required
            />
          </div>
        )}
        
        <div className="form-group">
          <label htmlFor="plugin-description">Description</label>
          <textarea
            id="plugin-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => handleFieldUpdate('description', description.trim())}
            placeholder="Brief description of what this plugin does"
            rows="3"
          />
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="plugin-author">Author</label>
            <input
              id="plugin-author"
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              onBlur={() => handleFieldUpdate('author', author.trim())}
              placeholder="Plugin author name"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="plugin-category">Category</label>
            <select
              id="plugin-category"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                handleFieldUpdate('category', e.target.value);
              }}
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
        
        {error && <div className="metadata-error">{error}</div>}
        
        <div className="form-actions">
          <button 
            type="submit" 
            disabled={isBusy || !name.trim()}
            className="btn-update"
          >
            {isBusy ? 'Updating...' : 'Update Metadata'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PluginMetadataEditor;