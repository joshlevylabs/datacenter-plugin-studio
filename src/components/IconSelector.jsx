import React, { useState } from 'react';
import {
  CpuChipIcon,
  BeakerIcon,
  ChartBarIcon,
  DocumentIcon,
  SpeakerWaveIcon,
  CameraIcon,
  WrenchScrewdriverIcon,
  CommandLineIcon,
  CircleStackIcon,
  ServerIcon
} from '@heroicons/react/24/outline';

const AVAILABLE_ICONS = {
  CpuChipIcon: CpuChipIcon,
  BeakerIcon: BeakerIcon,
  ChartBarIcon: ChartBarIcon,
  DocumentIcon: DocumentIcon,
  SpeakerWaveIcon: SpeakerWaveIcon,
  CameraIcon: CameraIcon,
  WrenchScrewdriverIcon: WrenchScrewdriverIcon,
  CommandLineIcon: CommandLineIcon,
  CircleStackIcon: CircleStackIcon,
  ServerIcon: ServerIcon
};

const IconSelector = ({ selectedIcon, onSelectIcon }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const handleSelectIcon = (iconName) => {
    onSelectIcon(iconName);
    setIsOpen(false);
  };
  
  const SelectedIconComponent = AVAILABLE_ICONS[selectedIcon] || BeakerIcon;
  
  return (
    <div className="icon-selector">
      <div className="icon-selector-header">
        <h3>Plugin Icon</h3>
        <p>Choose an icon for your plugin</p>
      </div>
      
      <div className="icon-preview" onClick={() => setIsOpen(!isOpen)}>
        <SelectedIconComponent className="current-icon" />
        <span className="icon-name">{selectedIcon}</span>
      </div>
      
      {isOpen && (
        <div className="icon-grid">
          {Object.entries(AVAILABLE_ICONS).map(([name, Icon]) => (
            <div 
              key={name} 
              className={`icon-option ${selectedIcon === name ? 'selected' : ''}`}
              onClick={() => handleSelectIcon(name)}
            >
              <Icon className="icon" />
              <span className="icon-label">{name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default IconSelector;