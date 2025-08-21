// src/App.tsx
import { useEffect, useMemo, useState } from 'react';
import React from 'react';
import { readTextFile } from '@tauri-apps/plugin-fs';
// opener plugin imported globally in Tauri; no direct import needed here
import {
  createPlugin,
  listPlugins,
  runBuild,
  setWorkspaceRoot,
  getWorkspaceRoot,
  readPlugin,
  savePlugin,
  exportBuiltPluginToDownloads,
  buildSimulatorPreviewHtml,
  openLycpPluginFromDisk,
  validatePluginDoc,
  addBuild,
  makeBuildKey,
  listBuilds,
  deleteBuild,
  readPluginFromPath,
  listPluginKeys,
  deletePlugin,
  getPluginSize,
  formatFileSize,
  getLatestVersion,
  getPluginBuildHistory,
  updatePluginScriptsToESModule,
  installDependencies,
} from './lib/studio';
import PluginMetadataEditor from './components/PluginMetadataEditor.jsx';
import VersionEditor from './components/VersionEditor.jsx';
import LicensingPanel from './components/LicensingPanel.jsx';
// import LicenseManager from './components/LicenseManager.jsx'; // Unused for now
import CentcomDemo from './components/CentcomDemo.jsx';
import PluginGUIBuilder from './components/PluginGUIBuilder.jsx';
import BuildLogViewer from './components/BuildLogViewer.jsx';
import TestPanel from './components/TestPanel.jsx';
import {
  PuzzlePieceIcon,
  Cog6ToothIcon,
  CpuChipIcon,
  BeakerIcon,
  ChartBarIcon,
  DocumentIcon,
  SpeakerWaveIcon,
  CameraIcon,
  WrenchScrewdriverIcon,
  CommandLineIcon,
  CircleStackIcon,
  ServerIcon,
  HomeIcon,
  Square3Stack3DIcon,
  ChartPieIcon,
  PlayIcon,
  UserGroupIcon,
  ArchiveBoxIcon,
  Squares2X2Icon,
  BoltIcon,
  AdjustmentsHorizontalIcon,
  BookmarkIcon,
  BriefcaseIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  CloudIcon,
  CubeIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  KeyIcon,
  LightBulbIcon,
  MagnifyingGlassIcon,
  MapIcon,
  PaperClipIcon,
  PencilSquareIcon,
  PhotoIcon,
  PrinterIcon,
  ShieldCheckIcon,
  SignalIcon,
  StarIcon,
  TagIcon,
  TruckIcon,
  WrenchIcon,
  FolderOpenIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';

function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);
  return {
    theme,
    toggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
    setTheme,
  } as const;
}

export default function App() {
  const [root, setRoot] = useState<string>('');
  const [plugins, setPlugins] = useState<string[]>([]);
  // legacy name state removed (prompt used instead)
  const [selected, setSelected] = useState<string | 'settings' | 'pluginsTool' | 'simulator' | 'builds' | 'centcomDemo' | null>(null);
  const [pluginIconMap, setPluginIconMap] = useState<Record<string, string>>({});
  const [pluginTitleMap, setPluginTitleMap] = useState<Record<string, string>>({});
  const [pluginMetaMap, setPluginMetaMap] = useState<Record<string, any>>({});
  const [pluginDoc, setPluginDoc] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  // message removed from UI; kept logic simplified
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<
    'General' | 'App GUI' | 'App Settings' | 'Sequencer Actions' | 'Licensing' | 'Build Settings' | 'Test'
  >('General');
  const [lastDownloadPath, setLastDownloadPath] = useState<string | null>(null);
  // Simulator state
  const [simPlugin, setSimPlugin] = useState<string | null>(null);
  const [simRunning, setSimRunning] = useState(false);
  const [simLogs, setSimLogs] = useState<string[]>([]);
  const [simReport, setSimReport] = useState<{ ok: boolean; errors: string[]; warnings: string[]; info: string[] } | null>(null);
  const simFrameRef = React.useRef<HTMLIFrameElement | null>(null);
  const [simSourcePath, setSimSourcePath] = useState<string | null>(null);
  const [builds, setBuilds] = useState(() => listBuilds());
  const [selectedBuildKeys, setSelectedBuildKeys] = useState<string[]>([]);
  const buildsHeaderCheckboxRef = React.useRef<HTMLInputElement | null>(null);
  const [simModalOpen, setSimModalOpen] = useState(false);
  // selectedBuildKey not used presently
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
  const [isEditingIcon, setIsEditingIcon] = useState<boolean>(false);
  const [activePlugins, setActivePlugins] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('activePlugins');
      if (!raw) return [];
      const list = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    } catch { return []; }
  });
  // pluginKeys prepared for future use (e.g., copy ID)
  const [pluginKeys, setPluginKeys] = useState<Record<string,string>>({});
  const [pluginSizes, setPluginSizes] = useState<Record<string,number>>({});
  const [pluginVersionMap, setPluginVersionMap] = useState<Record<string,string>>({});
  const [pluginBuildHistoryMap, setPluginBuildHistoryMap] = useState<Record<string,any[]>>({});
  const [editingCell, setEditingCell] = useState<{pluginId: string, column: string} | null>(null);
  const [searchPlugins, setSearchPlugins] = useState('');
  const [searchBuilds, setSearchBuilds] = useState('');
  // Build modal state
  const [buildModalOpen, setBuildModalOpen] = useState(false);
  const [buildName, setBuildName] = useState('');
  const [releaseNotes, setReleaseNotes] = useState('');
  // Build status and notifications
  const [buildStatus, setBuildStatus] = useState<'idle' | 'building' | 'success' | 'error'>('idle');
  const [buildMessage, setBuildMessage] = useState('');
  const [showBuildNotification, setShowBuildNotification] = useState(false);
  const [buildLogs, setBuildLogs] = useState<string[]>([]);
  const [showBuildLogs, setShowBuildLogs] = useState(false);

  const [selectedPluginIds, setSelectedPluginIds] = useState<string[]>([]);
  const pluginsHeaderCheckboxRef = React.useRef<HTMLInputElement | null>(null);
  const pluginMeta = (id: string) => {
    const meta = pluginMetaMap[id] || { id, name: pluginTitleMap[id]||id, version: '1.0.0', description: '', status: 'active', licenseRequired: false, licenseKeyPresent: false, autoDetected: false, installedAt: undefined, lastSeen: undefined, tags: [], route: '', icon: pluginIconMap[id]||'BeakerIcon' };
    return {
      ...meta,
      version: pluginVersionMap[id] || 'NA',
      size: pluginSizes[id] || 0,
      buildHistory: pluginBuildHistoryMap[id] || [],
    };
  };
  const filteredPlugins = (plugins||[]).filter((p)=>{
    if(!searchPlugins) return true;
    const q = searchPlugins.toLowerCase();
    const m = pluginMeta(p);
    return [m.name,m.id,(m.tags||[]).join(' '),m.route,m.description].join(' ').toLowerCase().includes(q);
  });
  const filteredBuilds = (builds||[]).filter((b)=>{
    if(!searchBuilds) return true;
    const q = searchBuilds.toLowerCase();
    return [b.name,b.key,b.filename,b.path,b.version].join(' ').toLowerCase().includes(q);
  });
  useEffect(() => {
    if (!buildsHeaderCheckboxRef.current) return;
    const total = filteredBuilds.length;
    const sel = selectedBuildKeys.length;
    buildsHeaderCheckboxRef.current.indeterminate = sel > 0 && sel < total;
  }, [filteredBuilds.length, selectedBuildKeys]);
  useEffect(() => {
    if (!pluginsHeaderCheckboxRef.current) return;
    const total = filteredPlugins.length;
    const sel = selectedPluginIds.length;
    pluginsHeaderCheckboxRef.current.indeterminate = sel > 0 && sel < total;
  }, [filteredPlugins.length, selectedPluginIds]);
  
  // Auto-refresh when tools are opened
  useEffect(() => {
    if (selected === 'pluginsTool' || selected === 'builds') {
      refresh();
      if (selected === 'builds') {
        setBuilds(listBuilds());
      }
    }
  }, [selected]);
  const defaultPluginOrder = ['checkbox','key','open','icon','name','version','size','status','license','detected','installed','lastSeen','tags','route'];
  const [pluginColumnOrder, setPluginColumnOrder] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('pluginsTableOrder');
      if (raw) return JSON.parse(raw);
    } catch {}
    return defaultPluginOrder;
  });
  const [visiblePluginColumns, setVisiblePluginColumns] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem('pluginsTableCols');
      if (raw) return JSON.parse(raw);
    } catch {}
    return Object.fromEntries(defaultPluginOrder.map((k) => [k, true]));
  });
  const [pluginColumnWidths, setPluginColumnWidths] = useState<Record<string, number>>(() => {
    try {
      const raw = localStorage.getItem('pluginsTableColumnWidths');
      if (raw) return JSON.parse(raw);
    } catch {}
    return {};
  });
  const startResizePlugin = (key: string, e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = pluginColumnWidths[key] || pluginDefaultWidths[key] || 140;
    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX;
      const next = Math.max(50, Math.min(1000, startW + delta)); // Min 50px, Max 1000px
      setPluginColumnWidths((prev) => {
        const updated = { ...prev, [key]: next };
        localStorage.setItem('pluginsTableColumnWidths', JSON.stringify(updated));
        return updated;
      });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };


  // Builds table configuration
  const defaultBuildsOrder = ['checkbox','key','download','name','version','buildName','releaseNotes','buildLogs','filename','path','built'];
  const [buildsColumnOrder, setBuildsColumnOrder] = useState<string[]>(() => {
    try { const raw = localStorage.getItem('buildsTableOrder'); if (raw) return JSON.parse(raw); } catch {}
    return defaultBuildsOrder;
  });
  const [visibleBuildsColumns, setVisibleBuildsColumns] = useState<Record<string, boolean>>(() => {
    try { const raw = localStorage.getItem('buildsTableCols'); if (raw) return JSON.parse(raw); } catch {}
    return Object.fromEntries(defaultBuildsOrder.map((k)=>[k,true]));
  });
  const [buildsColumnWidths, setBuildsColumnWidths] = useState<Record<string, number>>(() => {
    try { const raw = localStorage.getItem('buildsTableColumnWidths'); if (raw) return JSON.parse(raw); } catch {}
    return {};
  });
  const startResizeBuilds = (key: string, e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = buildsColumnWidths[key] || buildsDefaultWidths[key] || 140;
    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX;
      const next = Math.max(50, Math.min(1000, startW + delta)); // Min 50px, Max 1000px
      setBuildsColumnWidths((prev)=>{ const updated={...prev,[key]:next}; localStorage.setItem('buildsTableColumnWidths', JSON.stringify(updated)); return updated; });
    };
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };
  const pluginDefaultWidths: Record<string, number> = {
    checkbox: 40, key: 120, open: 70, icon: 60, name: 320, version: 120, size: 100,
    status: 120, license: 120, detected: 120, installed: 140, lastSeen: 140,
    tags: 150, route: 180,
  };
  const buildsDefaultWidths: Record<string, number> = {
    checkbox: 40, key: 120, download: 90, name: 300, version: 120, buildName: 200,
    releaseNotes: 300, buildLogs: 120, filename: 260, path: 360, built: 160,
  };


  useEffect(() => {
    (async () => {
      const r = await getWorkspaceRoot();
      setRoot(r);
      const list = await listPlugins();
      setPlugins(list);
      setPluginKeys(listPluginKeys(list));
      setActivePlugins((prev) => {
        const next = prev.length === 0 ? list : prev.filter((p) => list.includes(p));
        localStorage.setItem('activePlugins', JSON.stringify(next));
        return next;
      });
      // Preload metadata for each plugin
      const iconEntries: Array<[string, string]> = [];
      const titleEntries: Array<[string, string]> = [];
      const metaEntries: Array<[string, any]> = [];
      for (const p of list) {
        try {
          const file = await readPlugin(p);
          const doc = JSON.parse(file.contents);
          const iconName = doc?.metadata?.icon || 'BeakerIcon';
          iconEntries.push([p, iconName]);
          const title = doc?.metadata?.name || p;
          titleEntries.push([p, title]);
          metaEntries.push([p, {
            id: p,
            name: doc?.metadata?.name || p,
            version: doc?.metadata?.version || '1.0.0',
            description: doc?.metadata?.description || '',
            status: 'active',
            licenseRequired: !!doc?.metadata?.requiresLicense,
            licenseKeyPresent: !!doc?.licensing?.key,
            autoDetected: false,
            installedAt: undefined,
            lastSeen: undefined,
            tags: Array.isArray(doc?.metadata?.tags) ? doc.metadata.tags : [],
            route: doc?.metadata?.route || '',
            icon: iconName,
            installationPath: '',
          }]);
        } catch {
          iconEntries.push([p, 'BeakerIcon']);
          titleEntries.push([p, p]);
          metaEntries.push([p, {
            id: p,
            name: p,
            version: '1.0.0',
            description: '',
            status: 'active',
            licenseRequired: false,
            licenseKeyPresent: false,
            autoDetected: false,
            installedAt: undefined,
            lastSeen: undefined,
            tags: [],
            route: '',
            icon: 'BeakerIcon',
            installationPath: '',
          }]);
        }
      }
      setPluginIconMap(Object.fromEntries(iconEntries));
      setPluginTitleMap(Object.fromEntries(titleEntries));
      setPluginMetaMap(Object.fromEntries(metaEntries));
    })();
  }, []);

  async function refresh() {
    const list = await listPlugins();
    setPlugins(list);
    setPluginKeys(listPluginKeys(list));
    setActivePlugins((prev) => {
      const next = prev.filter((p) => list.includes(p));
      localStorage.setItem('activePlugins', JSON.stringify(next));
      return next;
    });
    const iconEntries: Array<[string, string]> = [];
    const titleEntries: Array<[string, string]> = [];
    const metaEntries: Array<[string, any]> = [];
    for (const p of list) {
      try {
        const file = await readPlugin(p);
        const doc = JSON.parse(file.contents);
        const iconName = doc?.metadata?.icon || 'BeakerIcon';
        iconEntries.push([p, iconName]);
        const title = doc?.metadata?.name || p;
        titleEntries.push([p, title]);
        metaEntries.push([p, {
          id: p,
          name: doc?.metadata?.name || p,
          version: doc?.metadata?.version || '1.0.0',
          description: doc?.metadata?.description || '',
          status: 'active',
          licenseRequired: !!doc?.metadata?.requiresLicense,
          licenseKeyPresent: !!doc?.licensing?.key,
          autoDetected: false,
          installedAt: undefined,
          lastSeen: undefined,
          tags: Array.isArray(doc?.metadata?.tags) ? doc.metadata.tags : [],
          route: doc?.metadata?.route || '',
          icon: iconName,
          installationPath: '',
        }]);
      } catch {
        iconEntries.push([p, 'BeakerIcon']);
        titleEntries.push([p, p]);
        metaEntries.push([p, {
          id: p,
          name: p,
          version: '1.0.0',
          description: '',
          status: 'active',
          licenseRequired: false,
          licenseKeyPresent: false,
          autoDetected: false,
          installedAt: undefined,
          lastSeen: undefined,
          tags: [],
          route: '',
          icon: 'BeakerIcon',
          installationPath: '',
        }]);
      }
    }
    setPluginIconMap(Object.fromEntries(iconEntries));
    setPluginTitleMap(Object.fromEntries(titleEntries));
    setPluginMetaMap(Object.fromEntries(metaEntries));
    
    // Load plugin sizes, versions, and build history
    const sizes: Record<string,number> = {};
    const versions: Record<string,string> = {};
    const buildHistories: Record<string,any[]> = {};
    
    for (const p of list) {
      try {
        sizes[p] = await getPluginSize(p);
        versions[p] = await getLatestVersion(p);
        buildHistories[p] = await getPluginBuildHistory(p);
      } catch {
        sizes[p] = 0;
        versions[p] = 'NA';
        buildHistories[p] = [];
      }
    }
    
    setPluginSizes(sizes);
    setPluginVersionMap(versions);
    setPluginBuildHistoryMap(buildHistories);
  }

  async function openPlugin(name: string) {
    setBusy(true);
    try {
      const file = await readPlugin(name);
      const doc = JSON.parse(file.contents);
      setSelected(name);
      setPluginDoc(doc);
      setActiveTab('General');
      setActivePlugins((prev) => {
        if (prev.includes(name)) return prev;
        const next = [...prev, name];
        localStorage.setItem('activePlugins', JSON.stringify(next));
        return next;
      });
      // sync icon and title map for this plugin
      const iconName = doc?.metadata?.icon || 'BeakerIcon';
      setPluginIconMap((prev) => ({ ...prev, [name]: iconName }));
      const title = doc?.metadata?.name || name;
      setPluginTitleMap((prev) => ({ ...prev, [name]: title }));
    } finally {
      setBusy(false);
    }
  }

  async function persist(doc: any) {
    if (!selected) return;
    await savePlugin(selected, doc);
    setPluginDoc(doc);
  }

  // Function to handle table cell editing of plugin metadata
  async function handleUpdatePluginMetadata(pluginName: string, updates: any) {
    try {
      // Read the current plugin data
      const pluginFile = await readPlugin(pluginName);
      const pluginData = JSON.parse(pluginFile.contents);
      
      // Update the metadata
      const updatedData = {
        ...pluginData,
        metadata: {
          ...pluginData.metadata,
          ...updates
        }
      };
      
      // Save the updated plugin
      await savePlugin(pluginName, updatedData);
      
      // Update local state if this is the currently selected plugin
      if (selected === pluginName) {
        setPluginDoc(updatedData);
      }
      
      // Refresh the plugins list to update the table
      refresh();
    } catch (error) {
      console.error('Failed to update plugin metadata:', error);
    }
  }

  // Function to show build notifications
  function showBuildNotificationMessage(status: 'building' | 'success' | 'error', message: string) {
    setBuildStatus(status);
    setBuildMessage(message);
    setShowBuildNotification(true);
    
    // Add to build logs
    addBuildLog(`[${status.toUpperCase()}] ${message}`);
    
    // Auto-hide success notifications after 5 seconds
    if (status === 'success') {
      setTimeout(() => {
        setShowBuildNotification(false);
      }, 5000);
    }
  }

  const addBuildLog = (log: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const formattedLog = `[${timestamp}] ${log}`;
    setBuildLogs(prev => [...prev, formattedLog]);
    console.log('Added build log:', formattedLog); // Debug logging
  };

  const clearBuildLogs = () => {
    setBuildLogs([]);
  };

  // Function to check if a version already exists in builds
  function versionExists(pluginId: string, version: string): boolean {
    const existingBuilds = listBuilds();
    return existingBuilds.some(build => build.pluginId === pluginId && build.version === version);
  }

  // Function to increment version
  function incrementVersion(version: string): string {
    const parts = version.split('.').map(Number);
    if (parts.length !== 3) return '1.0.1'; // fallback
    parts[2]++; // increment patch version
    return parts.join('.');
  }

  // Function to handle building with name and release notes
  async function handleBuildWithMetadata(buildName: string, releaseNotes: string) {
    if (!selected || typeof selected !== 'string') return;
    
    setBuildStatus('building');
    clearBuildLogs(); // Clear previous build logs
    
    // Track logs locally to ensure they're captured for the BuildRecord
    const currentBuildLogs: string[] = [];
    
    const addLocalBuildLog = (log: string) => {
      const timestamp = new Date().toLocaleTimeString();
      const formattedLog = `[${timestamp}] ${log}`;
      currentBuildLogs.push(formattedLog);
      addBuildLog(log); // Also add to React state for UI
    };
    
    // Add initial build logs
    addLocalBuildLog('=== Build Started ===');
    addLocalBuildLog(`Plugin: ${selected}`);
    addLocalBuildLog(`Build Name: ${buildName || 'Unnamed Build'}`);
    addLocalBuildLog(`Release Notes: ${releaseNotes || 'No release notes'}`);
    
    showBuildNotificationMessage('building', 'Building plugin...');
    
    try {
      // Handle duplicate build name/version
      const file = await readPlugin(selected);
      const doc = JSON.parse(file.contents);
      const meta = doc?.metadata || {};
      const existing = listBuilds().find((b) => b.pluginId === (meta.id || selected) && b.version === (meta.version || '1.0.0'));
      
      if (existing) {
        const choice = prompt(`A build for ${meta.name || selected} v${meta.version || '1.0.0'} exists. Type 'o' to overwrite or enter a new version to append:`, String(meta.version || '1.0.0'));
        if (choice === null) return;
        if (choice.toLowerCase() === 'o') {
          deleteBuild(existing.key);
        } else if (choice && choice !== (meta.version || '1.0.0')) {
          const next = { ...doc, metadata: { ...meta, version: choice } };
          await persist(next);
        }
      }

      // Validate and auto-fix metadata before building
      addLocalBuildLog('Validating plugin metadata...');
      addLocalBuildLog(`Plugin ID: ${doc?.metadata?.id || 'undefined'}`);
      addLocalBuildLog(`Plugin Name: ${doc?.metadata?.name || 'undefined'}`);
      addLocalBuildLog(`Current route: ${doc?.metadata?.route || 'undefined'}`);
      addLocalBuildLog(`Current icon: ${doc?.metadata?.icon || 'undefined'}`);
      
      const validation = await validatePluginDoc(doc);
      if (validation.warnings.length > 0) {
        validation.warnings.forEach(warning => addLocalBuildLog(`WARNING: ${warning}`));
      }
      if (validation.errors.length > 0) {
        validation.errors.forEach(error => addLocalBuildLog(`ERROR: ${error}`));
        throw new Error(`Plugin validation failed: ${validation.errors.join(', ')}`);
      }
      
      // Generate frontend code from GUI components if they exist
      const guiComponents = doc?.gui?.components || [];
      if (guiComponents.length > 0) {
        addLocalBuildLog(`Found ${guiComponents.length} GUI components, generating frontend code...`);
        
        try {
          // Always use Simple Generator for safe transpilation
          const SimpleGuiGeneratorModule = await import('./lib/simpleGuiGenerator.ts');
          const SimpleGuiGenerator = SimpleGuiGeneratorModule.SimpleGuiGenerator;
          const { convertToSimpleConfig } = SimpleGuiGeneratorModule;
          
          const config = {
            components: guiComponents,
            settings: doc?.gui?.settings || { layout: 'tabs', theme: 'default', responsive: true }
          };
          
          // Convert to simple config and generate transpilation-safe code
          const simpleConfig = convertToSimpleConfig(config);
          const generatedCode = SimpleGuiGenerator.generateSimpleComponent(simpleConfig, 'PluginGUI');
          
          // Update the frontend.main with the generated code
          if (!doc.frontend) doc.frontend = {};
          doc.frontend.main = generatedCode;
          
          addLocalBuildLog('Generated React component code from GUI design');
          addLocalBuildLog(`Generated code length: ${generatedCode.length} characters`);
          
        } catch (codeGenError: any) {
          addLocalBuildLog(`WARNING: Failed to generate frontend code: ${codeGenError?.message || String(codeGenError)}`);
          console.error('Code generation error:', codeGenError);
        }
      } else {
        addLocalBuildLog('No GUI components found, using existing frontend code');
      }
      
      // Re-save the plugin with any auto-fixes applied during validation and generated frontend code
      await persist(doc);
      addLocalBuildLog(`Route after validation: ${doc?.metadata?.route || 'undefined'}`);
      addLocalBuildLog(`Icon after validation: ${doc?.metadata?.icon || 'undefined'}`);
      addLocalBuildLog('Plugin metadata validated and saved');
      
      // Debug: Log the full metadata after validation
      console.log('Full metadata after validation:', JSON.stringify(doc?.metadata, null, 2));

      const r = await runBuild(selected);
      
      // Debug: Log the build result
      console.log('Build result:', r);
      console.log('Build stdout:', r.stdout);
      console.log('Build stderr:', r.stderr);
      
      // Add build output to logs
      if (r.stdout) {
        r.stdout.split('\n').forEach(line => {
          if (line.trim()) addLocalBuildLog(`STDOUT: ${line}`);
        });
      }
      if (r.stderr) {
        r.stderr.split('\n').forEach(line => {
          if (line.trim()) addLocalBuildLog(`STDERR: ${line}`);
        });
      }
      
      // Add some default logs even if no output
      if (!r.stdout && !r.stderr) {
        addLocalBuildLog('Build completed with no output captured');
        addLocalBuildLog(`Build success: ${r.success}`);
      }
      
      if (!r.success) {
        console.error('Build failed:', r.stderr || 'Build failed');
        console.error('Build stdout:', r.stdout || 'No stdout');
        
        // Check if this is an ES module error and try to fix it
        const errorText = r.stderr || '';
        if (errorText.includes('require is not defined in ES module scope') || 
            errorText.includes('can use import instead')) {
          console.log('Detected ES module error, attempting to fix scripts...');
          showBuildNotificationMessage('building', 'Fixing ES module scripts...');
          const updateResult = await updatePluginScriptsToESModule(selected);
          if (updateResult.success) {
            console.log('Scripts updated successfully, retrying build...');
            showBuildNotificationMessage('building', 'Scripts updated, retrying build...');
            // Retry the build
            const retryResult = await runBuild(selected);
            if (!retryResult.success) {
              console.error('Build failed after script update:', retryResult.stderr || 'Build failed');
              console.error('Retry build stdout:', retryResult.stdout || 'No stdout');
              showBuildNotificationMessage('error', 'Build failed after script update. Check console for details.');
              return;
            }
            // Continue with successful build
            console.log('Build succeeded after script update!');
            console.log('Retry build stdout:', retryResult.stdout || 'No stdout');
          } else {
            console.error('Failed to update scripts:', updateResult.error);
            showBuildNotificationMessage('error', 'Failed to update scripts. Check console for details.');
            return;
          }
        } else if (errorText.includes('Cannot find package') && 
                   (errorText.includes('vite') || errorText.includes('node_modules'))) {
          console.log('Detected missing dependencies, installing...');
          showBuildNotificationMessage('building', 'Installing dependencies...');
          const installResult = await installDependencies(selected);
          if (installResult.success) {
            console.log('Dependencies installed successfully, retrying build...');
            console.log('Install output:', installResult.stdout || 'No stdout');
            showBuildNotificationMessage('building', 'Dependencies installed, retrying build...');
            // Retry the build
            const retryResult = await runBuild(selected);
            if (!retryResult.success) {
              console.error('Build failed after dependency install:', retryResult.stderr || 'Build failed');
              console.error('Retry build stdout:', retryResult.stdout || 'No stdout');
              showBuildNotificationMessage('error', 'Build failed after installing dependencies. Check console for details.');
              return;
            }
            // Continue with successful build
            console.log('Build succeeded after dependency install!');
            console.log('Retry build stdout:', retryResult.stdout || 'No stdout');
          } else {
            console.error('Failed to install dependencies:', installResult.stderr || 'Install failed');
            console.error('Install stdout:', installResult.stdout || 'No stdout');
            showBuildNotificationMessage('error', 'Failed to install dependencies. Check console for details.');
            return;
          }
        } else {
          showBuildNotificationMessage('error', 'Build failed. Check console for details.');
          return;
        }
      }
      
      addLocalBuildLog('Exporting built plugin to downloads...');
      const out = await exportBuiltPluginToDownloads(selected);
      setLastDownloadPath(out.savedPath);
      addLocalBuildLog(`Plugin exported to: ${out.savedPath}`);
      
      // Validate exported .lycplugin file
      try {
        const exportedContent = await readTextFile(out.savedPath);
        const exportedDoc = JSON.parse(exportedContent);
        const exportedMeta = exportedDoc?.metadata || {};
        
        addLocalBuildLog('=== Exported Plugin Validation ===');
        addLocalBuildLog(`Exported Plugin ID: ${exportedMeta.id}`);
        addLocalBuildLog(`Exported Plugin Name: ${exportedMeta.name}`);
        addLocalBuildLog(`Exported Route: ${exportedMeta.route}`);
        addLocalBuildLog(`Exported Icon: ${exportedMeta.icon}`);
        
        // Check for issues that would cause Centcom problems
        if (!exportedMeta.route || exportedMeta.route.startsWith('#')) {
          addLocalBuildLog(`ERROR: Exported plugin has invalid route: ${exportedMeta.route}`);
        }
        if (!exportedMeta.icon) {
          addLocalBuildLog(`WARNING: Exported plugin has no icon`);
        }
        if (exportedMeta.route !== `/${exportedMeta.id}`) {
          addLocalBuildLog(`WARNING: Route (${exportedMeta.route}) doesn't match expected (/${exportedMeta.id})`);
        }
        
        addLocalBuildLog('=== End Exported Plugin Validation ===');
      } catch (exportValidationError: any) {
        addLocalBuildLog(`ERROR: Could not validate exported file: ${exportValidationError?.message || String(exportValidationError)}`);
        console.error('Export validation error:', exportValidationError);
      }
      
      try {
        const updatedFile = await readPlugin(selected);
        const updatedDoc = JSON.parse(updatedFile.contents);
        const m = updatedDoc?.metadata || {};
        
        // Create build record with name, release notes, and build logs
        console.log('Current build logs before saving (React state):', buildLogs);
        console.log('Current build logs before saving (local array):', currentBuildLogs);
        const record = {
          key: makeBuildKey(),
          path: out.savedPath,
          pluginId: String(m.id || selected),
          name: String(m.name || selected),
          version: String(m.version || '1.0.0'),
          filename: String(out.savedPath.split('\\').pop() || `${selected}.lycplugin`),
          builtAt: new Date().toISOString(),
          icon: m.icon,
          buildName: buildName || 'Unnamed Build',
          releaseNotes: releaseNotes || '',
          buildLogs: [...currentBuildLogs], // Use local build logs array
        };
        console.log('Build record being saved:', record);
        
        // Add final completion logs to the local array before saving
        addLocalBuildLog('=== Build Completed Successfully ===');
        const finalVersion = incrementVersion(m.version || '1.0.0');
        addLocalBuildLog(`Final version: ${finalVersion}`);
        addLocalBuildLog(`Build record key: ${record.key}`);
        
        // Update the record with all logs including final ones
        record.buildLogs = [...currentBuildLogs];
        
        addBuild(record);
        
        // Add to build history in plugin metadata
        const buildHistory = await getPluginBuildHistory(selected);
        const newHistoryEntry = {
          buildName: buildName || 'Unnamed Build',
          version: m.version || '1.0.0',
          releaseNotes: releaseNotes || '',
          builtAt: new Date().toISOString(),
          buildKey: record.key
        };
        
        // Update plugin with build history
        const updatedWithHistory = {
          ...updatedDoc,
          metadata: {
            ...m,
            buildHistory: [...buildHistory, newHistoryEntry]
          }
        };
        
        await savePlugin(selected, updatedWithHistory);
        setPluginDoc(updatedWithHistory);
        setBuilds(listBuilds());
        
        // Update version and build history for this specific plugin
        try {
          const latestVersion = await getLatestVersion(selected);
          const latestBuildHistory = await getPluginBuildHistory(selected);
          setPluginVersionMap(prev => ({ ...prev, [selected]: latestVersion }));
          setPluginBuildHistoryMap(prev => ({ ...prev, [selected]: latestBuildHistory }));
        } catch (error) {
          console.error('Failed to update plugin version info:', error);
        }
        
        refresh();
        
        // Auto-increment version for next build (use the same finalVersion)
        const autoIncrementedDoc = {
          ...updatedWithHistory,
          metadata: {
            ...updatedWithHistory.metadata,
            version: finalVersion
          }
        };
        await savePlugin(selected, autoIncrementedDoc);
        setPluginDoc(autoIncrementedDoc);
        
        showBuildNotificationMessage('success', `Successfully built ${buildName || 'plugin'}! Version auto-incremented to ${finalVersion}`);
        setBuildModalOpen(false);
      } catch (error) {
        console.error('Failed to save build record:', error);
        showBuildNotificationMessage('error', 'Build completed but failed to save build record. Check console for details.');
      }
    } catch (error) {
      console.error('Build failed:', error);
      console.error('Build error details:', error);
      addLocalBuildLog('=== Build Failed ===');
      addLocalBuildLog(`Error: ${error}`);
      showBuildNotificationMessage('error', 'Build failed with unexpected error. Check console for details.');
    } finally {
      setBuildStatus('idle');
    }
  }

  const metadata = useMemo(() => pluginDoc?.metadata ?? {}, [pluginDoc]);

  const ICONS: Record<string, any> = {
    CpuChipIcon,
    BeakerIcon,
    ChartBarIcon,
    DocumentIcon,
    SpeakerWaveIcon,
    CameraIcon,
    WrenchScrewdriverIcon,
    CommandLineIcon,
    CircleStackIcon,
    ServerIcon,
    HomeIcon,
    Square3Stack3DIcon,
    ChartPieIcon,
    PlayIcon,
    UserGroupIcon,
    ArchiveBoxIcon,
    Squares2X2Icon,
    BoltIcon,
    AdjustmentsHorizontalIcon,
    BookmarkIcon,
    BriefcaseIcon,
    BuildingOfficeIcon,
    CalendarIcon,
    CloudIcon,
    CubeIcon,
    DevicePhoneMobileIcon,
    EnvelopeIcon,
    GlobeAltIcon,
    KeyIcon,
    LightBulbIcon,
    MagnifyingGlassIcon,
    MapIcon,
    PaperClipIcon,
    PencilSquareIcon,
    PhotoIcon,
    PrinterIcon,
    ShieldCheckIcon,
    SignalIcon,
    StarIcon,
    TagIcon,
    TruckIcon,
    WrenchIcon,
  } as const;

  return (
    <div className="w-full h-full flex">
      {/* Sidebar */}
      <aside className="bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-auto w-64">
        <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-4">
          <img src={theme === 'dark' ? '/logo/PDS-white.png' : '/logo/PDS-black.png'} alt="Logo" className="w-full h-auto" />
        </div>
        {/* removed duplicate Plugins header/button */}
        <div className="mt-4 px-4">
          <div className="font-semibold text-gray-900 dark:text-white mb-2">Tools</div>
          <nav className="flex flex-col gap-2 mb-4">
            <button className={`flex items-center gap-2 w-full text-sm rounded-md px-3 py-2 ${selected === 'pluginsTool' ? 'bg-blue-50 text-blue-700 dark:bg-gray-700 dark:text-blue-300' : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'}`} onClick={() => { setSelected('pluginsTool'); }}>
              <Squares2X2Icon className="h-5 w-5" />
              <span>Plugins</span>
            </button>
            <button className={`flex items-center gap-2 w-full text-sm rounded-md px-3 py-2 ${selected === 'simulator' ? 'bg-blue-50 text-blue-700 dark:bg-gray-700 dark:text-blue-300' : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'}`} onClick={() => { setSelected('simulator'); }}>
              <PlayIcon className="h-5 w-5" />
              <span>Simulator</span>
            </button>
            <button className={`flex items-center gap-2 w-full text-sm rounded-md px-3 py-2 ${selected === 'builds' ? 'bg-blue-50 text-blue-700 dark:bg-gray-700 dark:text-blue-300' : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'}`} onClick={() => { setSelected('builds'); }}>
              <ArchiveBoxIcon className="h-5 w-5" />
              <span>Builds</span>
            </button>
            <button className={`flex items-center gap-2 w-full text-sm rounded-md px-3 py-2 ${selected === 'centcomDemo' ? 'bg-blue-50 text-blue-700 dark:bg-gray-700 dark:text-blue-300' : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'}`} onClick={() => { setSelected('centcomDemo'); }}>
              <KeyIcon className="h-5 w-5" />
              <span>License Manager Demo</span>
            </button>
          </nav>
        </div>
        <div className="px-4 flex-1">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold text-gray-900 dark:text-white">Plugins</div>
            <button
              className="p-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-800"
              title="New Plugin"
              onClick={async () => {
                const n = prompt('New plugin name');
                if (!n) return;
                await createPlugin({ name: n });
                await refresh();
                setActivePlugins((prev) => {
                  const id = n.toLowerCase().replace(/\s+/g, '-');
                  const next = prev.includes(id) ? prev : [...prev, id];
                  localStorage.setItem('activePlugins', JSON.stringify(next));
                  return next;
                });
              }}
            >
              +
            </button>
          </div>
          <nav className="flex flex-col gap-2">
            {activePlugins.map((p) => {
              const iconName = pluginIconMap[p] || 'BeakerIcon';
              const IconComp = ICONS[iconName] || PuzzlePieceIcon;
  return (
                <div key={p} className={`flex items-center justify-between w-full text-sm rounded-md px-2 py-1 border border-gray-200 dark:border-gray-700 ${selected === p ? 'bg-blue-50 text-blue-700 dark:bg-gray-700 dark:text-blue-300' : 'bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
                  <button className="flex items-center gap-2 flex-1 text-left px-1 py-1 rounded hover:bg-gray-50 dark:hover:bg-gray-700" onClick={() => openPlugin(p)}>
                    <IconComp className="h-5 w-5" />
                    <span className="truncate">{pluginTitleMap[p] || p}</span>
                  </button>
                  <button
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="Close from sidebar"
                    onClick={() => {
                      setActivePlugins((prev) => {
                        const next = prev.filter((x) => x !== p);
                        localStorage.setItem('activePlugins', JSON.stringify(next));
                        return next;
                      });
                      if (selected === p) setSelected(null);
                    }}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </nav>
        </div>
        <div className="px-4 pb-4 mt-2">
          <button className={`flex items-center gap-2 w-full text-sm rounded-md px-3 py-2 ${selected === 'settings' ? 'bg-blue-50 text-blue-700 dark:bg-gray-700 dark:text-blue-300' : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'}`} onClick={() => { setSelected('settings'); setPluginDoc(null); }}>
            <Cog6ToothIcon className="h-5 w-5" />
            <span>Settings</span>
          </button>
        </div>
      </aside>

      {/* Right editor area */}
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto px-6 py-8">
        {selected === 'settings' ? (
          <div className="grid gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-0">Workspace</h3>
              <code className="block text-[12px] break-all text-gray-600 dark:text-gray-300 mb-3">{root}</code>
              <button className="px-3 py-2 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" onClick={async () => {
                const r = prompt('Set workspace root', root) || root;
                setWorkspaceRoot(r);
                setRoot(r);
                await refresh();
              }}>Change Workspace</button>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-0">Theme</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700 dark:text-gray-300">Current:</span>
                <span className="text-sm font-medium">{theme}</span>
              </div>
              <button className="mt-3 px-3 py-2 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" onClick={toggleTheme}>{theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}</button>
            </div>
          </div>
        ) : selected === 'pluginsTool' ? (
          <div className="grid gap-2">
            {/* Title Section - More padding above, less below */}
            <div className="py-8 pb-4">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Plugins</h2>
                  <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">{plugins.length} total</span>
                </div>
                <div className="flex items-center gap-3">
                  {selectedPluginIds.length>0 && (
                    <button className="px-4 py-2 text-sm rounded-md border border-red-300 bg-white hover:bg-red-50 text-red-700 dark:bg-red-900 dark:border-red-600 dark:text-red-200" onClick={async ()=>{
                      if(!confirm(`Delete ${selectedPluginIds.length} plugin(s)?`)) return;
                      for(const id of selectedPluginIds){ try{ await deletePlugin(id); } catch{} }
                      await refresh();
                      setSelectedPluginIds([]);
                    }}>Delete Selected ({selectedPluginIds.length})</button>
                  )}
                  <button className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700" onClick={async () => { const n = prompt('New plugin name'); if (!n) return; await createPlugin({ name: n }); await refresh(); }}>Add Plugin</button>
                </div>
              </div>
              
              {/* Search Bar */}
              <div className="w-full">
                <input 
                  className="w-full px-4 py-3 text-base rounded-lg border border-gray-300 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  placeholder="Search plugins by name, description, tags, route..." 
                  value={searchPlugins}
                  onChange={(e)=>setSearchPlugins(e.target.value)} 
                />
              </div>
            </div>
            
            {/* Table Container with Rounded Corners */}
            <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Available Plugins ({filteredPlugins.length})</span>
                </div>
                <details className="relative">
                  <summary className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 cursor-pointer list-none">
                    Columns ▼
                  </summary>
                  <div className="absolute right-0 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-30">
                    <div className="p-3">
                      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Show/Hide Columns</div>
                      <div className="max-h-64 overflow-y-auto space-y-1">
                        {defaultPluginOrder.map((col) => (
                          <label key={col} className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                            <input type="checkbox" checked={!!visiblePluginColumns[col]} onChange={(e)=>{
                              const next={...visiblePluginColumns,[col]:e.target.checked};
                              setVisiblePluginColumns(next); localStorage.setItem('pluginsTableCols', JSON.stringify(next));
                            }} className="rounded border-gray-300 dark:border-gray-600" />
                            <span className="text-sm capitalize text-gray-700 dark:text-gray-300">{col === 'lastSeen' ? 'Last Seen' : col === 'installedAt' ? 'Installed' : col === 'size' ? 'Size' : col === 'version' ? 'Latest Version' : col}</span>
                          </label>
                        ))}
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 text-xs text-gray-500 dark:text-gray-400">
                        Drag column headers to reorder
                      </div>
                    </div>
                  </div>
                </details>
              </div>
              <div className="overflow-x-auto overflow-y-visible">
                <table className="w-auto text-sm border-collapse" role="table" aria-label="Plugins" style={{ minWidth: 'max-content' }}>
                  <thead>
                    <tr className="text-left text-gray-600 dark:text-gray-300 text-xs uppercase bg-gray-50 dark:bg-gray-900" role="row">
                      {pluginColumnOrder.map((col) => visiblePluginColumns[col] && (
                        <th key={col} style={{ width: (pluginColumnWidths[col] || pluginDefaultWidths[col] || 140) }} className="px-3 py-2 font-semibold border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 relative group">
                          <div className="flex items-center justify-between h-full">
                            <div 
                              className="flex items-center justify-center gap-2 cursor-move select-none flex-1"
                              draggable={col !== 'checkbox'} 
                              onDragStart={(e)=>{ 
                                if(col === 'checkbox') return false;
                                e.dataTransfer.setData('text/col', col); 
                                e.currentTarget.parentElement?.parentElement?.classList.add('opacity-50');
                              }} 
                              onDragEnd={(e)=>{
                                e.currentTarget.parentElement?.parentElement?.classList.remove('opacity-50');
                              }}
                              onDragOver={(e)=>{
                                e.preventDefault();
                                e.currentTarget.parentElement?.parentElement?.classList.add('bg-blue-50', 'dark:bg-blue-900');
                              }}
                              onDragLeave={(e)=>{
                                e.currentTarget.parentElement?.parentElement?.classList.remove('bg-blue-50', 'dark:bg-blue-900');
                              }}
                              onDrop={(e)=>{ 
                                e.preventDefault();
                                e.currentTarget.parentElement?.parentElement?.classList.remove('bg-blue-50', 'dark:bg-blue-900');
                                const from=e.dataTransfer.getData('text/col'); 
                                if(!from||from===col||from==='checkbox') return; 
                                const fromIdx=pluginColumnOrder.indexOf(from); 
                                const toIdx=pluginColumnOrder.indexOf(col); 
                                if(fromIdx<0||toIdx<0) return; 
                                const next=[...pluginColumnOrder]; 
                                next.splice(toIdx,0,next.splice(fromIdx,1)[0]); 
                                setPluginColumnOrder(next); 
                                localStorage.setItem('pluginsTableOrder', JSON.stringify(next)); 
                              }}
                            >
                              {col==='checkbox' ? (
                                <input ref={pluginsHeaderCheckboxRef} type="checkbox" aria-label="Select all plugins" onChange={(e)=>{ if(e.target.checked){ setSelectedPluginIds(filteredPlugins); } else { setSelectedPluginIds([]); } }} />
                              ) : (
                                <span className="capitalize font-medium">{col === 'lastSeen' ? 'Last Seen' : col === 'installedAt' ? 'Installed' : col === 'size' ? 'Size' : col === 'version' ? 'Latest Version' : col}</span>
                              )}
                            </div>
                            <div 
                              className="w-1 h-full cursor-col-resize hover:bg-blue-500 dark:hover:bg-blue-400 absolute right-0 top-0 opacity-0 hover:opacity-100 transition-opacity duration-200"
                              onMouseDown={(e)=>startResizePlugin(col,e)}
                              title="Drag to resize column"
                            />
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody role="rowgroup" className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredPlugins.length === 0 ? (
                      <tr><td className="px-3 py-4 text-gray-500 dark:text-gray-400" colSpan={5}>No plugins yet</td></tr>
                    ) : filteredPlugins.map((p) => {
                      const meta = pluginMeta(p);
                      const IconComp = ICONS[meta.icon || 'BeakerIcon'] || BeakerIcon;
                      return (
                        <tr key={p} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 h-10" role="row">
                          {pluginColumnOrder.map((col) => visiblePluginColumns[col] && (
                            <td key={col} style={{ width: (pluginColumnWidths[col] || pluginDefaultWidths[col] || 140) }} className="px-3 py-2 align-middle border border-gray-200 dark:border-gray-700 h-10 max-h-10 overflow-hidden text-center">
                              {col==='checkbox' && (<input type="checkbox" checked={selectedPluginIds.includes(p)} onChange={(e)=>{ if(e.target.checked){ setSelectedPluginIds((prev)=>[...prev,p]); } else { setSelectedPluginIds((prev)=>prev.filter(x=>x!==p)); } }} aria-label={`Select ${meta.name}`} />)}
                              {col==='key' && (<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200" title={`Plugin Key: ${(pluginKeys && pluginKeys[p]) || '-'}`}>{(pluginKeys && pluginKeys[p]) || '-'}</span>)}
                              {col==='open' && (<button className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700" title="Open Plugin" onClick={() => { openPlugin(p); setSelected(p); }}><FolderOpenIcon className="h-4 w-4" /></button>)}
                              {col==='icon' && (<div className="flex justify-center"><IconComp className="h-4 w-4 text-gray-700 dark:text-gray-200" title={`Icon: ${meta.icon || 'BeakerIcon'}`} /></div>)}
                              {col==='name' && (
                                <div className="text-left">
                                  {editingCell?.pluginId === p && editingCell?.column === 'name' ? (
                                    <input 
                                      type="text" 
                                      defaultValue={meta.name} 
                                      className="w-full text-sm border-none bg-transparent focus:ring-1 focus:ring-blue-500 rounded px-1" 
                                      autoFocus
                                      onBlur={(e) => {
                                        // Save the changes here
                                        const newName = (e.target as HTMLInputElement).value.trim();
                                        if (newName && newName !== meta.name) {
                                          handleUpdatePluginMetadata(p, { name: newName });
                                        }
                                        setEditingCell(null);
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          const newName = (e.target as HTMLInputElement).value.trim();
                                          if (newName && newName !== meta.name) {
                                            handleUpdatePluginMetadata(p, { name: newName });
                                          }
                                          setEditingCell(null);
                                        } else if (e.key === 'Escape') {
                                          setEditingCell(null);
                                        }
                                      }}
                                    />
                                  ) : (
                                    <div className="min-w-0 cursor-pointer" onClick={() => setEditingCell({pluginId: p, column: 'name'})}>
                                      <div className="font-medium text-gray-900 dark:text-gray-100 truncate" title={meta.name}>{meta.name}</div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate" title={meta.description||''}>{meta.description||''}</div>
                                    </div>
                                  )}
                                </div>
                              )}
                              {col==='version' && (
                                <div className="flex flex-col items-center gap-1">
                                  {meta.version && meta.version !== 'NA' ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" title={`Latest Built Version: ${meta.version}`}>
                                      {meta.version}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400" title="No builds yet">
                                      NA
                                    </span>
                                  )}
                                </div>
                              )}
                              {col==='size' && (<span className="text-xs text-gray-700 dark:text-gray-300 truncate block" title={`Size: ${formatFileSize(meta.size)}`}>{formatFileSize(meta.size)}</span>)}
                              {col==='status' && (<span className={`px-2 py-0.5 rounded-full text-[11px] truncate inline-block ${meta.status==='active'?'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300':meta.status==='error'?'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300':'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300'}`} title={`Status: ${meta.status.charAt(0).toUpperCase()+meta.status.slice(1)}`}>{meta.status.charAt(0).toUpperCase()+meta.status.slice(1)}</span>)}
                              {col==='license' && (<span className={`px-2 py-0.5 rounded-full text-[11px] truncate inline-block ${meta.licenseRequired? (meta.licenseKeyPresent?'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300':'border border-red-400 text-red-700 dark:text-red-300'): 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300'}`} title={meta.licenseRequired && !meta.licenseKeyPresent ? 'License Required and missing key' : meta.licenseRequired ? 'License Required and present' : 'License Optional'}>{meta.licenseRequired?'Required':'Optional'}</span>)}
                              {col==='detected' && (<span className={`px-2 py-0.5 rounded-full text-[11px] truncate inline-block ${meta.autoDetected?'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300':'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300'}`} title={meta.autoDetected?'Auto detected by system':'Manually registered'}>{meta.autoDetected?'Auto':'Manual'}</span>)}
                              {col==='installed' && (<span className="text-xs text-gray-700 dark:text-gray-300 truncate block" title={meta.installedAt ? `Installed: ${new Date(meta.installedAt).toLocaleDateString()}` : 'Not installed'}>{meta.installedAt? new Date(meta.installedAt).toLocaleDateString(): '-'}</span>)}
                              {col==='lastSeen' && (<span className="text-xs text-gray-700 dark:text-gray-300 truncate block" title={meta.lastSeen ? `Last seen: ${new Date(meta.lastSeen).toLocaleDateString()}` : 'Never seen'}>{meta.lastSeen? new Date(meta.lastSeen).toLocaleDateString(): '-'}</span>)}
                              {col==='tags' && (
                                editingCell?.pluginId === p && editingCell?.column === 'tags' ? (
                                  <input 
                                    type="text" 
                                    defaultValue={(meta.tags||[]).join(', ')} 
                                    className="w-full text-sm border-none bg-transparent focus:ring-1 focus:ring-blue-500 rounded px-1" 
                                    placeholder="Enter tags separated by commas"
                                    autoFocus
                                    onBlur={(e) => {
                                      // Save the tags here
                                      const newTagsString = (e.target as HTMLInputElement).value.trim();
                                      const newTags = newTagsString.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0);
                                      const currentTags = meta.tags || [];
                                      if (JSON.stringify(newTags) !== JSON.stringify(currentTags)) {
                                        handleUpdatePluginMetadata(p, { tags: newTags });
                                      }
                                      setEditingCell(null);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        const newTagsString = (e.target as HTMLInputElement).value.trim();
                                        const newTags = newTagsString.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0);
                                        const currentTags = meta.tags || [];
                                        if (JSON.stringify(newTags) !== JSON.stringify(currentTags)) {
                                          handleUpdatePluginMetadata(p, { tags: newTags });
                                        }
                                        setEditingCell(null);
                                      } else if (e.key === 'Escape') {
                                        setEditingCell(null);
                                      }
                                    }}
                                  />
                                ) : (
                                  <div className="flex items-center justify-center gap-1 max-w-[200px] overflow-hidden cursor-pointer" title={(meta.tags||[]).join(', ')} onClick={() => setEditingCell({pluginId: p, column: 'tags'})}>
                                    {(meta.tags||[]).slice(0,3).map((t:string)=>(<span key={t} className="px-2 py-0.5 rounded-full text-[11px] bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300 truncate" title={`Tag: ${t}`}>{t}</span>))}
                                    {meta.tags && meta.tags.length>3 && (<span className="text-[11px] text-gray-500 dark:text-gray-400" title={`+${meta.tags.length-3} more tags: ${meta.tags.slice(3).join(', ')}`}>+{meta.tags.length-3}</span>)}
                                    {(!meta.tags || meta.tags.length === 0) && (<span className="text-xs text-gray-400 italic">Click to add tags</span>)}
                                  </div>
                                )
                              )}
                              {col==='route' && (<span className="font-mono text-xs text-gray-500 dark:text-gray-400 truncate block" title={meta.route ? `Route: ${meta.route}` : 'No route defined'}>{meta.route || '-'}</span>)}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        ) : selected === 'builds' ? (
          <div className="grid gap-2">
            {/* Title Section - More padding above, less below */}
            <div className="py-8 pb-4">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Builds</h2>
                  <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">{builds.length} total</span>
                </div>
                <div className="flex items-center gap-3">
                  {selectedBuildKeys.length>0 && (
                    <button className="px-4 py-2 text-sm rounded-md border border-red-300 bg-white hover:bg-red-50 text-red-700 dark:bg-red-900 dark:border-red-600 dark:text-red-200" onClick={async ()=>{
                      if(!confirm(`Delete ${selectedBuildKeys.length} build(s)?`)) return;
                      for(const key of selectedBuildKeys){ try{ await deleteBuild(key); } catch{} }
                      setBuilds(listBuilds());
                      setSelectedBuildKeys([]);
                    }}>Delete Selected ({selectedBuildKeys.length})</button>
                  )}
                </div>
              </div>
              
              {/* Search Bar */}
              <div className="w-full">
                <input 
                  className="w-full px-4 py-3 text-base rounded-lg border border-gray-300 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  placeholder="Search builds by name, filename, path, version..." 
                  value={searchBuilds}
                  onChange={(e)=>setSearchBuilds(e.target.value)} 
                />
              </div>
            </div>
            
            {/* Table Container with Rounded Corners */}
            <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Available Builds ({filteredBuilds.length})</span>
                </div>
                <details className="relative">
                  <summary className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 cursor-pointer list-none">
                    Columns ▼
                  </summary>
                  <div className="absolute right-0 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-30">
                    <div className="p-3">
                      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Show/Hide Columns</div>
                      <div className="max-h-64 overflow-y-auto space-y-1">
                        {defaultBuildsOrder.map((col) => (
                          <label key={col} className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                            <input type="checkbox" checked={!!visibleBuildsColumns[col]} onChange={(e)=>{
                              const next={...visibleBuildsColumns,[col]:e.target.checked};
                              setVisibleBuildsColumns(next); localStorage.setItem('buildsTableCols', JSON.stringify(next));
                            }} className="rounded border-gray-300 dark:border-gray-600" />
                            <span className="text-sm capitalize text-gray-700 dark:text-gray-300">{col === 'name' ? 'Plugin Name' : col === 'built' ? 'Built Date' : col}</span>
                          </label>
                        ))}
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 text-xs text-gray-500 dark:text-gray-400">
                        Drag column headers to reorder
                      </div>
                    </div>
                  </div>
                </details>
              </div>
              <div className="overflow-x-auto overflow-y-visible">
                <table className="w-auto text-sm border-collapse" role="table" aria-label="Builds" style={{ minWidth: 'max-content' }}>
                  <thead>
                    <tr className="text-left text-gray-600 dark:text-gray-300 text-xs uppercase bg-gray-50 dark:bg-gray-900" role="row">
                      {buildsColumnOrder.map((col) => visibleBuildsColumns[col] && (
                        <th key={col} style={{ width: (buildsColumnWidths[col] || buildsDefaultWidths[col] || 140) }} className="px-3 py-2 font-semibold border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 relative group">
                          <div className="flex items-center justify-between h-full">
                            <div 
                              className="flex items-center justify-center gap-2 cursor-move select-none flex-1"
                              draggable={col !== 'checkbox'} 
                              onDragStart={(e)=>{ 
                                if(col === 'checkbox') return false;
                                e.dataTransfer.setData('text/col', col); 
                                e.currentTarget.parentElement?.parentElement?.classList.add('opacity-50');
                              }} 
                              onDragEnd={(e)=>{
                                e.currentTarget.parentElement?.parentElement?.classList.remove('opacity-50');
                              }}
                              onDragOver={(e)=>{
                                e.preventDefault();
                                e.currentTarget.parentElement?.parentElement?.classList.add('bg-blue-50', 'dark:bg-blue-900');
                              }}
                              onDragLeave={(e)=>{
                                e.currentTarget.parentElement?.parentElement?.classList.remove('bg-blue-50', 'dark:bg-blue-900');
                              }}
                              onDrop={(e)=>{ 
                                e.preventDefault();
                                e.currentTarget.parentElement?.parentElement?.classList.remove('bg-blue-50', 'dark:bg-blue-900');
                                const from=e.dataTransfer.getData('text/col'); 
                                if(!from||from===col||from==='checkbox') return; 
                                const fromIdx=buildsColumnOrder.indexOf(from); 
                                const toIdx=buildsColumnOrder.indexOf(col); 
                                if(fromIdx<0||toIdx<0) return; 
                                const next=[...buildsColumnOrder]; 
                                next.splice(toIdx,0,next.splice(fromIdx,1)[0]); 
                                setBuildsColumnOrder(next); 
                                localStorage.setItem('buildsTableOrder', JSON.stringify(next)); 
                              }}
                            >
                              {col==='checkbox' ? (
                                <input ref={buildsHeaderCheckboxRef} type="checkbox" aria-label="Select all builds" onChange={(e)=>{ if(e.target.checked){ setSelectedBuildKeys(filteredBuilds.map(b=>b.key)); } else { setSelectedBuildKeys([]);} }} />
                              ) : (
                                <span className="capitalize font-medium">{col === 'name' ? 'Plugin Name' : col === 'built' ? 'Built Date' : col === 'buildName' ? 'Build Name' : col === 'releaseNotes' ? 'Release Notes' : col === 'buildLogs' ? 'Build Logs' : col}</span>
                              )}
                            </div>
                            <div 
                              className="w-1 h-full cursor-col-resize hover:bg-blue-500 dark:hover:bg-blue-400 absolute right-0 top-0 opacity-0 hover:opacity-100 transition-opacity duration-200"
                              onMouseDown={(e)=>startResizeBuilds(col,e)}
                              title="Drag to resize column"
                            />
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody role="rowgroup" className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredBuilds.length === 0 ? (
                      <tr><td className="px-3 py-4 text-gray-500 dark:text-gray-400" colSpan={10}>No builds yet</td></tr>
                    ) : filteredBuilds.map((b) => (
                      <tr key={b.key} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 h-10" role="row">
                        {buildsColumnOrder.map((col) => visibleBuildsColumns[col] && (
                          <td key={col} style={{ width: (buildsColumnWidths[col] || buildsDefaultWidths[col] || 140) }} className="px-3 py-2 align-middle border border-gray-200 dark:border-gray-700 h-10 max-h-10 overflow-hidden text-center">
                            {col==='checkbox' && (<input type="checkbox" aria-label={`Select ${b.name}`} checked={selectedBuildKeys.includes(b.key)} onChange={(e)=>{ if(e.target.checked){ setSelectedBuildKeys((prev)=>[...prev,b.key]); } else { setSelectedBuildKeys((prev)=>prev.filter(x=>x!==b.key)); } }} />)}
                            {col==='key' && (<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200" title={`Build Key: ${b.key}`}>{b.key}</span>)}
                            {col==='download' && (<button className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700" title="Download .lycplugin file" onClick={async ()=>{ try { const {copyFileToDownloads} = await import('./lib/studio'); const saved=await copyFileToDownloads(b.path, b.filename); alert(`Saved to ${saved}`); } catch(e) { alert(`Error: ${e}`); } }}><ArrowDownTrayIcon className="h-4 w-4" /></button>)}
                            {col==='name' && (<div className="text-left"><span className="text-gray-900 dark:text-gray-100 truncate block" title={`Plugin: ${b.name}`}>{b.name}</span></div>)}
                            {col==='version' && (<span className="font-mono text-xs text-gray-700 dark:text-gray-200 truncate block" title={`Version: ${b.version}`}>{b.version}</span>)}
                            {col==='buildName' && (<div className="text-left"><span className="text-gray-900 dark:text-gray-100 truncate block font-medium" title={`Build Name: ${b.buildName || 'Unnamed Build'}`}>{b.buildName || 'Unnamed Build'}</span></div>)}
                            {col==='releaseNotes' && (<div className="text-left"><span className="text-xs text-gray-600 dark:text-gray-300 truncate block" title={`Release Notes: ${b.releaseNotes || 'No release notes'}`}>{b.releaseNotes || 'No release notes'}</span></div>)}
                            {col==='buildLogs' && (
                              <div className="text-center">
                                {b.buildLogs && b.buildLogs.length > 0 ? (
                                  <button
                                    onClick={() => {
                                      setBuildLogs(b.buildLogs || []);
                                      setShowBuildLogs(true);
                                    }}
                                    className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                                    title={`View ${b.buildLogs.length} log entries`}
                                  >
                                    View ({b.buildLogs.length})
                                  </button>
                                ) : (
                                  <span className="text-xs text-gray-400">No logs</span>
                                )}
                              </div>
                            )}
                            {col==='filename' && (<span className="text-gray-700 dark:text-gray-200 truncate block" title={`Filename: ${b.filename}`}>{b.filename}</span>)}
                            {col==='path' && (<span className="text-gray-700 dark:text-gray-200 truncate block" title={`Path: ${b.path}`}>{b.path}</span>)}
                            {col==='built' && (<span className="text-xs text-gray-700 dark:text-gray-200 truncate block" title={`Built: ${new Date(b.builtAt).toLocaleString()}`}>{new Date(b.builtAt).toLocaleDateString()}</span>)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        ) : selected === 'simulator' ? (
          <div className="grid gap-4">
            <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4 space-y-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-0">Centcom Simulator</h3>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  className="px-3 py-2 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                  onClick={async () => {
                    const opened = await openLycpPluginFromDisk();
                    if (!opened) return;
                    setSimSourcePath(opened.path);
                    setSimLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Loaded ${opened.path}`]);
                    // If the opened plugin matches one in workspace, set simPlugin for validation convenience
                    try {
                      const id = String(opened.doc?.metadata?.id || '');
                      if (id && plugins.includes(id)) setSimPlugin(id);
                    } catch {}
                    // Render preview now
                    try {
                      const html = buildSimulatorPreviewHtml(opened.doc);
                      if (simFrameRef.current) {
                        const blob = new Blob([html], { type: 'text/html' });
                        const url = URL.createObjectURL(blob);
                        simFrameRef.current.src = url;
                      }
                    } catch (e) {
                      setSimLogs((prev) => [...prev, `[ERROR] Failed to build preview: ${String((e as any)?.message || e)}`]);
                    }
                  }}
                >
                  Open .lycplugin…
                </button>
                <button
                  className="px-3 py-2 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                  onClick={async () => {
                    // If opened from disk, prefer that doc; else use workspace plugin by id
                    let doc: any | null = null;
                    if (simSourcePath) {
                      try {
                        const res = await openLycpPluginFromDisk();
                        if (res) { doc = res.doc; setSimSourcePath(res.path); }
                      } catch {}
                    }
                    if (!doc && simPlugin) {
                      try {
                        const file = await readPlugin(simPlugin);
                        doc = JSON.parse(file.contents);
                      } catch {}
                    }
                    if (!doc) return;
                    setSimRunning(true);
                    setSimLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Starting simulator`]);
                    try {
                      const html = buildSimulatorPreviewHtml(doc);
                      if (simFrameRef.current) {
                        const blob = new Blob([html], { type: 'text/html' });
                        const url = URL.createObjectURL(blob);
                        simFrameRef.current.src = url;
                      }
                    } catch (e) {
                      setSimLogs((prev) => [...prev, `[ERROR] Failed to build preview: ${String((e as any)?.message || e)}`]);
                    }
                    // Validate the opened doc using the same checks (without requiring workspace)
                    const report = validatePluginDoc(doc, []);
                    report.info.forEach((m: string) => setSimLogs((prev) => [...prev, `[INFO] ${m}`]));
                    report.warnings.forEach((w: string) => setSimLogs((prev) => [...prev, `[WARN] ${w}`]));
                    report.errors.forEach((e: string) => setSimLogs((prev) => [...prev, `[ERROR] ${e}`]));
                    setSimReport(report);
                    setSimRunning(false);
                  }}
                >
                  Run
                </button>
                <button
                  className="px-3 py-2 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                  onClick={() => { setSimLogs([]); setSimReport(null); }}
                >
                  Clear Logs
                </button>
                {lastDownloadPath && (
                  <span className="text-xs text-gray-600 dark:text-gray-300">Last build saved: {lastDownloadPath}</span>
                )}
              </div>
            </section>
            {simModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div className="absolute inset-0 bg-black/50" onClick={() => setSimModalOpen(false)} />
                <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 w-full max-w-3xl max-h-[80vh] overflow-auto border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-md font-semibold">Select a Build</h4>
                    <button className="px-2 py-1 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" onClick={() => setSimModalOpen(false)}>Close</button>
                  </div>
                  <div className="overflow-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-600 dark:text-gray-300">
                          <th className="px-2 py-2">Key</th>
                          <th className="px-2 py-2">Plugin</th>
                          <th className="px-2 py-2">Name</th>
                          <th className="px-2 py-2">Version</th>
                          <th className="px-2 py-2">Filename</th>
                          <th className="px-2 py-2">Built</th>
                          <th className="px-2 py-2">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {builds.length === 0 ? (
                          <tr><td className="px-2 py-3 text-gray-500" colSpan={7}>No builds available</td></tr>
                        ) : builds.map((b) => (
                          <tr key={b.key} className="border-t border-gray-200 dark:border-gray-700">
                            <td className="px-2 py-2 font-mono">{b.key}</td>
                            <td className="px-2 py-2">{b.pluginId}</td>
                            <td className="px-2 py-2">{b.name}</td>
                            <td className="px-2 py-2">{b.version}</td>
                            <td className="px-2 py-2">{b.filename}</td>
                            <td className="px-2 py-2">{new Date(b.builtAt).toLocaleString()}</td>
                            <td className="px-2 py-2">
                              <button className="px-2 py-1 text-xs rounded-md border border-gray-300 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" onClick={async () => {
                                try {
                                  const doc = await readPluginFromPath(b.path);
                                  const html = buildSimulatorPreviewHtml(doc);
                                  if (simFrameRef.current) {
                                    const blob = new Blob([html], { type: 'text/html' });
                                    const url = URL.createObjectURL(blob);
                                    simFrameRef.current.src = url;
                                  }
                                  setSimSourcePath(b.path);
                                  setSimLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Loaded ${b.filename}`]);
                                  setSimModalOpen(false);
                                } catch (e) {
                                  setSimLogs((prev) => [...prev, `[ERROR] Failed to load build: ${String((e as any)?.message || e)}`]);
                                }
                              }}>Use</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-3 lg:col-span-1">
                <h4 className="text-md font-semibold text-gray-900 dark:text-white mt-0">Simulator Logs</h4>
                <div className="h-64 overflow-auto text-xs font-mono whitespace-pre-wrap bg-gray-50 dark:bg-gray-900 dark:text-gray-200 p-2 rounded border border-gray-200 dark:border-gray-700">
                  {simRunning && <div>Running…</div>}
                  {simLogs.length === 0 ? <div className="text-gray-500">No logs yet</div> : simLogs.map((l, i) => <div key={i}>{l}</div>)}
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-3 lg:col-span-1">
                <h4 className="text-md font-semibold text-gray-900 dark:text-white mt-0 mb-2">Centcom App Preview</h4>
                <div className="rounded border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <iframe ref={simFrameRef} title="Centcom Simulator" className="w-full h-64 bg-white" sandbox="allow-scripts"></iframe>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-3 lg:col-span-1">
                <h4 className="text-md font-semibold text-gray-900 dark:text-white mt-0">Results</h4>
                {!simReport ? (
                  <div className="text-sm text-gray-600 dark:text-gray-300">Run the simulator to see results.</div>
                ) : (
                  <div className="space-y-2">
                    <div className={`text-sm font-medium ${simReport.ok ? 'text-green-600' : 'text-red-600'}`}>
                      {simReport.ok ? 'Simulation OK' : 'Simulation Found Issues'}
                    </div>
                    {simReport.errors.length > 0 && (
                      <div>
                        <div className="text-sm font-semibold text-red-600">Errors</div>
                        <ul className="list-disc ml-5 text-sm text-red-700">
                          {simReport.errors.map((e, i) => <li key={`e-${i}`}>{e}</li>)}
                        </ul>
                      </div>
                    )}
                    {simReport.warnings.length > 0 && (
                      <div>
                        <div className="text-sm font-semibold text-yellow-600">Warnings</div>
                        <ul className="list-disc ml-5 text-sm text-yellow-700">
                          {simReport.warnings.map((w, i) => <li key={`w-${i}`}>{w}</li>)}
                        </ul>
                      </div>
                    )}
                    {simReport.info.length > 0 && (
                      <div>
                        <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">Info</div>
                        <ul className="list-disc ml-5 text-sm text-gray-700 dark:text-gray-300">
                          {simReport.info.map((m, i) => <li key={`i-${i}`}>{m}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
          </div>
        ) : selected === 'centcomDemo' ? (
          <CentcomDemo />
        ) : !selected || !pluginDoc ? (
          <div className="h-full grid place-items-center text-gray-500">{busy ? 'Loading…' : 'Select an application or open Settings'}</div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Minimal plugin header (no borders/containers). Click to edit */}
            <div className="flex items-center justify-between gap-4 select-none mt-10 mb-6">
              <div className="flex items-center gap-4">
              {/* Icon display / edit */}
              <div className="relative">
                {(() => {
                  const iconName = metadata.icon || 'BeakerIcon';
                  const IconComp = ICONS[iconName] || PuzzlePieceIcon;
  return (
                    <button
                      className="p-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onClick={() => setIsEditingIcon((v) => !v)}
                      aria-label="Edit icon"
                    >
                      <IconComp className="h-12 w-12 text-gray-800 dark:text-gray-100" />
                    </button>
                  );
                })()}
              </div>
              {/* Title display / edit */}
              {!isEditingTitle ? (
                <button
                  className="text-3xl font-bold text-gray-900 dark:text-gray-100 hover:underline text-left"
                  onClick={() => setIsEditingTitle(true)}
                  aria-label="Edit title"
                >
                  {metadata.name || selected}
                </button>
              ) : (
                <input
                  autoFocus
                  onBlur={() => setIsEditingTitle(false)}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter') {
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  className="flex-1 px-1 py-0.5 text-3xl font-bold bg-transparent border-b border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500"
                  value={metadata.name || ''}
                  placeholder={selected || 'Untitled'}
                  onChange={async (e) => {
                    const next = { ...pluginDoc, metadata: { ...metadata, name: e.target.value } };
                    await persist(next);
                    if (selected) {
                      setPluginTitleMap((prev) => ({ ...prev, [selected]: e.target.value }));
                    }
                  }}
                />
              )}
              </div>
              
              {/* Build Button and Tools */}
              <div className="flex items-center gap-3">
                <button
                  className={`px-6 py-3 text-lg font-semibold rounded-lg transition-colors shadow-md ${
                    !selected || typeof selected !== 'string' || selected === 'settings' || selected === 'pluginsTool' || selected === 'simulator' || selected === 'builds' || selected === 'centcomDemo' || versionExists(metadata.id || selected, metadata.version || '1.0.0')
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                  }`}
                  onClick={() => {
                    if (!selected || typeof selected !== 'string' || selected === 'settings' || selected === 'pluginsTool' || selected === 'simulator' || selected === 'builds' || selected === 'centcomDemo') {
                      return;
                    }
                    if (versionExists(metadata.id || selected, metadata.version || '1.0.0')) {
                      showBuildNotificationMessage('error', `Version ${metadata.version || '1.0.0'} already exists. Please update the version number.`);
                      return;
                    }
                    setBuildName('');
                    setReleaseNotes('');
                    setBuildModalOpen(true);
                  }}
                  disabled={!selected || typeof selected !== 'string' || selected === 'settings' || selected === 'pluginsTool' || selected === 'simulator' || selected === 'builds' || selected === 'centcomDemo' || versionExists(metadata.id || selected, metadata.version || '1.0.0')}
                  title={versionExists(metadata.id || selected, metadata.version || '1.0.0') ? `Version ${metadata.version || '1.0.0'} already exists` : "Build Plugin"}
                >
                  {versionExists(metadata.id || selected, metadata.version || '1.0.0') ? 'Version Exists' : 'Build'}
                </button>

              </div>
            </div>

            {/* Icon modal */}
            {isEditingIcon && (
              <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div className="absolute inset-0 bg-black/50" onClick={() => setIsEditingIcon(false)} />
                <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 w-full max-w-3xl max-h-[80vh] overflow-auto border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Select an icon</h3>
                    <button className="px-2 py-1 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" onClick={() => setIsEditingIcon(false)}>Close</button>
                  </div>
                  <div className="grid grid-cols-5 md:grid-cols-8 gap-3">
                    {Object.entries(ICONS).map(([name, Comp]) => (
                      <button
                        key={name}
                        className={`flex flex-col items-center gap-1 p-2 rounded-md border ${metadata.icon===name ? 'border-blue-500 bg-blue-50 dark:bg-gray-700' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                        onClick={async () => {
                          const next = { ...pluginDoc, metadata: { ...metadata, icon: name } };
                          await persist(next);
                          if (selected) setPluginIconMap((prev) => ({ ...prev, [selected]: name }));
                          setIsEditingIcon(false);
                        }}
                        title={name}
                      >
                        <Comp className="h-6 w-6 text-gray-800 dark:text-gray-100" />
                        <span className="text-[10px] text-gray-600 dark:text-gray-300 truncate max-w-[70px]">{name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {/* Tabs + Build button */}
            <div className="border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <nav className="-mb-px flex gap-4 text-sm">
                  {(['General','App GUI','App Settings','Sequencer Actions','Licensing','Build Settings','Test'] as const).map((t) => (
                    <button
                      key={t}
                      className={`px-3 py-2 border-b-2 ${activeTab===t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:bg-gray-700'}`}
                      onClick={() => setActiveTab(t)}
                    >
                      {t}
                    </button>
                  ))}
                </nav>
              </div>
      </div>

            {/* Tab content */}
            {activeTab === 'General' && (
              <div className="flex flex-col gap-4">
                <section className="flex flex-col gap-4">
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-0">General Settings</h3>
                    <PluginMetadataEditor
                      metadata={metadata}
                      onUpdateMetadata={async (updates: any) => {
                        const next = { ...pluginDoc, metadata: { ...metadata, ...updates } };
                        await persist(next);
                      }}
                      hideName
                    />
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-0">Appearance</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Icon</h4>
                        {!isEditingIcon ? (
                          <button
                            className="px-3 py-2 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                            onClick={() => setIsEditingIcon(true)}
                          >
                            Change Icon
                          </button>
                        ) : null}
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-2">Color</h4>
                        <input
                          type="color"
                          value={metadata.color || '#3b82f6'}
                          onChange={async (e) => {
                            const next = { ...pluginDoc, metadata: { ...metadata, color: e.target.value } };
                            await persist(next);
                          }}
                          className="h-10 w-16 rounded-md border border-gray-300 dark:border-gray-600 bg-transparent"
                        />
                      </div>
                    </div>
                  </div>

                </section>
              </div>
            )}

            {activeTab === 'App GUI' && (
              <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
                <PluginGUIBuilder
                  pluginDoc={pluginDoc}
                  onUpdateGUI={async (guiConfig: any) => {
                    const next = { ...pluginDoc, gui: guiConfig };
                    await persist(next);
                  }}
                />
              </section>
            )}

            {activeTab === 'App Settings' && (
              <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-0">Application Settings</h3>
                <div>
                  <label className="block text-sm mb-1">Default database connection string</label>
                  <input className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-gray-200" value={pluginDoc?.appSettings?.db ?? ''} onChange={async (e) => {
                    const next = { ...pluginDoc, appSettings: { ...(pluginDoc.appSettings||{}), db: e.target.value } };
                    await persist(next);
                  }} />
                </div>
      <div>
                  <label className="block text-sm mb-1">External script path</label>
                  <input className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-gray-200" value={pluginDoc?.appSettings?.script ?? ''} onChange={async (e) => {
                    const next = { ...pluginDoc, appSettings: { ...(pluginDoc.appSettings||{}), script: e.target.value } };
                    await persist(next);
                  }} />
      </div>
              </section>
            )}

            {activeTab === 'Sequencer Actions' && (
              <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-0">Sequencer Actions</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">Define actions triggered by your App GUI that can be automated in sequences.</p>
              </section>
            )}

            {activeTab === 'Licensing' && (
              <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4">
                <LicensingPanel
                  pluginDoc={pluginDoc}
                  onUpdatePlugin={async (updatedPlugin: any) => {
                    await persist(updatedPlugin);
                  }}
                />
              </section>
            )}

            {activeTab === 'Build Settings' && (
              <div className="space-y-4">
                {/* Versioning Section */}
                <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-0 mb-3">Versioning</h3>
                  <VersionEditor
                    currentVersion={metadata.version || '1.0.0'}
                    onUpdateVersion={async (v: string) => {
                      const next = { ...pluginDoc, metadata: { ...metadata, version: v } };
                      await persist(next);
                    }}
                  />
                </section>

                {/* Route Section */}
                <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-0 mb-3">Route Configuration</h3>
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Plugin Route
                    </label>
                    <input
                      type="text"
                      value={metadata.route || ''}
                      onChange={async (e) => {
                        const next = { ...pluginDoc, metadata: { ...metadata, route: e.target.value } };
                        await persist(next);
                      }}
                      className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-gray-200"
                      placeholder="/api/plugin-route"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Define the API route for this plugin (e.g., /api/data-processor)
                    </p>
                  </div>
                </section>

                {/* Build History Section */}
                <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-0 mb-3">Build History</h3>
                  <div className="space-y-3">
                    {(metadata.buildHistory && metadata.buildHistory.length > 0) ? (
                      <div className="space-y-2">
                        {metadata.buildHistory.slice().reverse().map((build: any, index: number) => (
                          <div key={`${build.buildKey || 'build'}-${build.version}-${build.builtAt || index}`} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-900">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                  v{build.version}
                                </span>
                                <h4 className="font-medium text-gray-900 dark:text-gray-100">{build.buildName}</h4>
                              </div>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(build.builtAt).toLocaleDateString()}
                              </span>
                            </div>
                            {build.releaseNotes && (
                              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                {build.releaseNotes}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <p className="text-sm">No builds yet</p>
                        <p className="text-xs mt-1">Use the Build button to create your first build</p>
                      </div>
                    )}
                  </div>
                </section>

                {/* Build Logs Section */}
                <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-0 mb-3">Build Logs</h3>
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      View and manage build logs for troubleshooting and monitoring build processes.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowBuildLogs(true)}
                        className="px-3 py-2 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                        title="View Build Logs"
                      >
                        View Logs
                      </button>
                      
                      <button
                        onClick={clearBuildLogs}
                        className="px-3 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                        title="Clear Build Logs"
                      >
                        Clear Logs
                      </button>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'Test' && (
              <TestPanel 
                pluginDoc={pluginDoc}
                selected={selected}
              />
            )}

            {/* Compiler tab removed */}
          </div>
        )}
        </div>
      </main>

      {/* Build Status Notification */}
      {showBuildNotification && (
        <div className="fixed top-4 right-4 z-50 max-w-sm">
          <div className={`rounded-lg shadow-lg p-4 border ${
            buildStatus === 'building' ? 'bg-blue-50 border-blue-200 dark:bg-blue-900 dark:border-blue-700' :
            buildStatus === 'success' ? 'bg-green-50 border-green-200 dark:bg-green-900 dark:border-green-700' :
            'bg-red-50 border-red-200 dark:bg-red-900 dark:border-red-700'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {buildStatus === 'building' && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 dark:border-blue-400 mr-3"></div>
                )}
                {buildStatus === 'success' && (
                  <svg className="h-4 w-4 text-green-600 dark:text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
                {buildStatus === 'error' && (
                  <svg className="h-4 w-4 text-red-600 dark:text-red-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
                <p className={`text-sm font-medium ${
                  buildStatus === 'building' ? 'text-blue-800 dark:text-blue-200' :
                  buildStatus === 'success' ? 'text-green-800 dark:text-green-200' :
                  'text-red-800 dark:text-red-200'
                }`}>
                  {buildMessage}
                </p>
              </div>
              {buildStatus !== 'building' && (
                <button
                  onClick={() => setShowBuildNotification(false)}
                  className={`ml-4 text-xs ${
                    buildStatus === 'success' ? 'text-green-600 hover:text-green-800 dark:text-green-400' :
                    'text-red-600 hover:text-red-800 dark:text-red-400'
                  }`}
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Build Modal */}
      {buildModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Build Plugin</h3>
              <button
                onClick={() => setBuildModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Build Name *
                </label>
                <input
                  type="text"
                  value={buildName}
                  onChange={(e) => setBuildName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Feature Release, Bug Fix, etc."
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Release Notes
                </label>
                <textarea
                  value={releaseNotes}
                  onChange={(e) => setReleaseNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe what's new in this build..."
                  rows={4}
                />
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setBuildModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                Cancel
              </button>
              <button
                onClick={() => handleBuildWithMetadata(buildName, releaseNotes)}
                disabled={!buildName.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Build Plugin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Build Log Viewer Modal */}
      <BuildLogViewer
        isOpen={showBuildLogs}
        onClose={() => setShowBuildLogs(false)}
        buildLogs={buildLogs}
        buildStatus={buildStatus}
      />


    </div>
  );
}