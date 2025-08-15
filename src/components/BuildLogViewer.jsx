import React, { useState, useEffect, useRef } from 'react';
import {
  DocumentTextIcon,
  XMarkIcon,
  ArrowDownIcon,
  ClipboardDocumentIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

const BuildLogViewer = ({ isOpen, onClose, buildLogs, buildStatus }) => {
  const [autoScroll, setAutoScroll] = useState(true);
  const logContainerRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Auto-scroll to bottom when new logs are added
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [buildLogs, autoScroll]);

  const handleScroll = () => {
    if (!logContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
    setAutoScroll(isAtBottom);
  };

  const scrollToBottom = () => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
      setAutoScroll(true);
    }
  };

  const copyLogsToClipboard = () => {
    const logText = buildLogs.join('\n');
    navigator.clipboard.writeText(logText).then(() => {
      // Could add a toast notification here
    });
  };

  const filteredLogs = buildLogs.filter(log =>
    searchTerm ? log.toLowerCase().includes(searchTerm.toLowerCase()) : true
  );

  const getStatusIcon = () => {
    switch (buildStatus) {
      case 'building':
        return <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse" />;
      case 'success':
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      case 'error':
        return <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />;
      default:
        return <InformationCircleIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  const getLogLineType = (line) => {
    if (line.includes('ERROR') || line.includes('error:') || line.includes('Error:')) {
      return 'error';
    }
    if (line.includes('WARNING') || line.includes('warning:') || line.includes('Warning:')) {
      return 'warning';
    }
    if (line.includes('SUCCESS') || line.includes('success:') || line.includes('✅')) {
      return 'success';
    }
    if (line.includes('Building') || line.includes('Compiling') || line.includes('Installing')) {
      return 'info';
    }
    return 'default';
  };

  const getLogLineStyle = (type) => {
    switch (type) {
      case 'error':
        return 'text-red-400 bg-red-900/20';
      case 'warning':
        return 'text-yellow-400 bg-yellow-900/20';
      case 'success':
        return 'text-green-400 bg-green-900/20';
      case 'info':
        return 'text-blue-400 bg-blue-900/20';
      default:
        return 'text-gray-300';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-4/5 h-4/5 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <DocumentTextIcon className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold">Build Logs</h2>
            {getStatusIcon()}
            <span className="text-sm text-gray-600 capitalize">{buildStatus}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Search */}
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded text-sm w-48"
            />
            
            {/* Copy logs */}
            <button
              onClick={copyLogsToClipboard}
              className="p-2 text-gray-600 hover:text-gray-800 rounded"
              title="Copy logs to clipboard"
            >
              <ClipboardDocumentIcon className="w-4 h-4" />
            </button>
            
            {/* Scroll to bottom */}
            <button
              onClick={scrollToBottom}
              className="p-2 text-gray-600 hover:text-gray-800 rounded"
              title="Scroll to bottom"
            >
              <ArrowDownIcon className="w-4 h-4" />
            </button>
            
            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-gray-800 rounded"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Auto-scroll indicator */}
        {!autoScroll && (
          <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-yellow-700">
                Auto-scroll disabled. New logs may not be visible.
              </span>
              <button
                onClick={scrollToBottom}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Scroll to latest
              </button>
            </div>
          </div>
        )}

        {/* Log content */}
        <div className="flex-1 overflow-hidden">
          <div
            ref={logContainerRef}
            onScroll={handleScroll}
            className="h-full overflow-y-auto bg-gray-900 p-4 font-mono text-sm"
          >
            {filteredLogs.length === 0 ? (
              <div className="text-gray-500 text-center mt-8">
                {searchTerm ? 'No logs match your search.' : 'No build logs available.'}
              </div>
            ) : (
              filteredLogs.map((line, index) => {
                const lineType = getLogLineType(line);
                const lineStyle = getLogLineStyle(lineType);
                
                return (
                  <div
                    key={index}
                    className={`py-1 px-2 rounded mb-1 ${lineStyle}`}
                    style={{ wordBreak: 'break-all' }}
                  >
                    <span className="text-gray-500 mr-2">
                      {String(index + 1).padStart(3, '0')}
                    </span>
                    {line}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {filteredLogs.length} lines {searchTerm && `(filtered from ${buildLogs.length})`}
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="flex items-center text-sm text-gray-600">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="mr-2"
              />
              Auto-scroll
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuildLogViewer;