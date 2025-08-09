// src/App.tsx
import { useEffect, useMemo, useState } from 'react';
import React from 'react';
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
} from './lib/studio';
import PluginMetadataEditor from './components/PluginMetadataEditor.jsx';
import VersionEditor from './components/VersionEditor.jsx';
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
  const [selected, setSelected] = useState<string | 'settings' | 'pluginsTool' | 'simulator' | 'builds' | null>(null);
  const [pluginIconMap, setPluginIconMap] = useState<Record<string, string>>({});
  const [pluginTitleMap, setPluginTitleMap] = useState<Record<string, string>>({});
  const [pluginMetaMap, setPluginMetaMap] = useState<Record<string, any>>({});
  const [pluginDoc, setPluginDoc] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  // message removed from UI; kept logic simplified
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<
    'General' | 'App GUI' | 'App Settings' | 'Sequencer Actions' | 'Licensing'
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
  const [editingCell, setEditingCell] = useState<{pluginId: string, column: string} | null>(null);
  const [searchPlugins, setSearchPlugins] = useState('');
  const [searchBuilds, setSearchBuilds] = useState('');
  const [selectedPluginIds, setSelectedPluginIds] = useState<string[]>([]);
  const pluginsHeaderCheckboxRef = React.useRef<HTMLInputElement | null>(null);
  const pluginMeta = (id: string) => {
    const meta = pluginMetaMap[id] || { id, name: pluginTitleMap[id]||id, version: '1.0.0', description: '', status: 'active', licenseRequired: false, licenseKeyPresent: false, autoDetected: false, installedAt: undefined, lastSeen: undefined, tags: [], route: '', icon: pluginIconMap[id]||'BeakerIcon' };
    return {
      ...meta,
      version: getLatestVersion(id),
      size: pluginSizes[id] || 0,
      buildHistory: getPluginBuildHistory(id),
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
    const startW = pluginColumnWidths[key] || 140;
    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX;
      const next = Math.max(80, startW + delta);
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
  const defaultBuildsOrder = ['checkbox','key','download','name','version','filename','path','built'];
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
    const startW = buildsColumnWidths[key] || 140;
    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX;
      const next = Math.max(80, startW + delta);
      setBuildsColumnWidths((prev)=>{ const updated={...prev,[key]:next}; localStorage.setItem('buildsTableColumnWidths', JSON.stringify(updated)); return updated; });
    };
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };
  const pluginDefaultWidths: Record<string, number> = {
    checkbox: 40, key: 90, open: 70, icon: 60, name: 280, version: 120, size: 100,
    status: 120, license: 120, detected: 120, installed: 140, lastSeen: 140,
    tags: 200, route: 180,
  };
  const buildsDefaultWidths: Record<string, number> = {
    checkbox: 40, key: 90, download: 90, name: 260, version: 120, filename: 260,
    path: 360, built: 160,
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
    
    // Load plugin sizes
    const sizes: Record<string,number> = {};
    for (const p of list) {
      try {
        sizes[p] = await getPluginSize(p);
      } catch {
        sizes[p] = 0;
      }
    }
    setPluginSizes(sizes);
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
                            <span className="text-sm capitalize text-gray-700 dark:text-gray-300">{col === 'lastSeen' ? 'Last Seen' : col === 'installedAt' ? 'Installed' : col === 'size' ? 'Size' : col}</span>
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
              <div className="overflow-auto">
                <table className="min-w-full text-sm border-collapse" role="table" aria-label="Plugins">
                  <thead>
                    <tr className="text-left text-gray-600 dark:text-gray-300 text-xs uppercase bg-gray-50 dark:bg-gray-900" role="row">
                      {pluginColumnOrder.map((col) => visiblePluginColumns[col] && (
                        <th key={col} style={{ width: (pluginColumnWidths[col] || pluginDefaultWidths[col] || 140) }} className="px-3 py-2 font-semibold border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 relative group">
                          <div 
                            className="flex items-center justify-between gap-2 cursor-move select-none"
                            draggable={col !== 'checkbox'} 
                            onDragStart={(e)=>{ 
                              if(col === 'checkbox') return false;
                              e.dataTransfer.setData('text/col', col); 
                              e.currentTarget.parentElement?.classList.add('opacity-50');
                            }} 
                            onDragEnd={(e)=>{
                              e.currentTarget.parentElement?.classList.remove('opacity-50');
                            }}
                            onDragOver={(e)=>{
                              e.preventDefault();
                              e.currentTarget.parentElement?.classList.add('bg-blue-50', 'dark:bg-blue-900');
                            }}
                            onDragLeave={(e)=>{
                              e.currentTarget.parentElement?.classList.remove('bg-blue-50', 'dark:bg-blue-900');
                            }}
                            onDrop={(e)=>{ 
                              e.preventDefault();
                              e.currentTarget.parentElement?.classList.remove('bg-blue-50', 'dark:bg-blue-900');
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
                              <span className="capitalize font-medium">{col === 'lastSeen' ? 'Last Seen' : col === 'installedAt' ? 'Installed' : col === 'size' ? 'Size' : col}</span>
                            )}
                            <span className="w-1 h-4 cursor-col-resize hover:bg-blue-400 dark:hover:bg-blue-600 rounded" onMouseDown={(e)=>startResizePlugin(col,e)} />
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
                              {col==='icon' && (<IconComp className="h-4 w-4 text-gray-700 dark:text-gray-200" title={`Icon: ${meta.icon || 'BeakerIcon'}`} />)}
                              {col==='name' && (
                                <div className="text-left">
                                  {editingCell?.pluginId === p && editingCell?.column === 'name' ? (
                                    <input 
                                      type="text" 
                                      defaultValue={meta.name} 
                                      className="w-full text-sm border-none bg-transparent focus:ring-1 focus:ring-blue-500 rounded px-1" 
                                      autoFocus
                                      onBlur={() => {
                                        // Save the changes here
                                        setEditingCell(null);
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
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
                                <div className="flex flex-col gap-1">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" title={`Latest Version: ${meta.version}`}>v{meta.version}</span>
                                  {meta.buildHistory && meta.buildHistory.length > 1 && (
                                    <span className="text-[10px] text-gray-500 dark:text-gray-400" title={`${meta.buildHistory.length} total builds`}>+{meta.buildHistory.length - 1} builds</span>
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
                                    onBlur={() => {
                                      // Save the tags here
                                      setEditingCell(null);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
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
              <div className="overflow-auto">
                <table className="min-w-full text-sm border-collapse" role="table" aria-label="Builds">
                  <thead>
                    <tr className="text-left text-gray-600 dark:text-gray-300 text-xs uppercase bg-gray-50 dark:bg-gray-900" role="row">
                      {buildsColumnOrder.map((col) => visibleBuildsColumns[col] && (
                        <th key={col} style={{ width: (buildsColumnWidths[col] || buildsDefaultWidths[col] || 140) }} className="px-3 py-2 font-semibold border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 relative group">
                          <div 
                            className="flex items-center justify-between gap-2 cursor-move select-none"
                            draggable={col !== 'checkbox'} 
                            onDragStart={(e)=>{ 
                              if(col === 'checkbox') return false;
                              e.dataTransfer.setData('text/col', col); 
                              e.currentTarget.parentElement?.classList.add('opacity-50');
                            }} 
                            onDragEnd={(e)=>{
                              e.currentTarget.parentElement?.classList.remove('opacity-50');
                            }}
                            onDragOver={(e)=>{
                              e.preventDefault();
                              e.currentTarget.parentElement?.classList.add('bg-blue-50', 'dark:bg-blue-900');
                            }}
                            onDragLeave={(e)=>{
                              e.currentTarget.parentElement?.classList.remove('bg-blue-50', 'dark:bg-blue-900');
                            }}
                            onDrop={(e)=>{ 
                              e.preventDefault();
                              e.currentTarget.parentElement?.classList.remove('bg-blue-50', 'dark:bg-blue-900');
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
                              <span className="capitalize font-medium">{col === 'name' ? 'Plugin Name' : col === 'built' ? 'Built Date' : col}</span>
                            )}
                            <span className="w-1 h-4 cursor-col-resize hover:bg-blue-400 dark:hover:bg-blue-600 rounded" onMouseDown={(e)=>startResizeBuilds(col,e)} />
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody role="rowgroup" className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredBuilds.length === 0 ? (
                      <tr><td className="px-3 py-4 text-gray-500 dark:text-gray-400" colSpan={8}>No builds yet</td></tr>
                    ) : filteredBuilds.map((b) => (
                      <tr key={b.key} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 h-10" role="row">
                        {buildsColumnOrder.map((col) => visibleBuildsColumns[col] && (
                          <td key={col} style={{ width: (buildsColumnWidths[col] || buildsDefaultWidths[col] || 140) }} className="px-3 py-2 align-middle border border-gray-200 dark:border-gray-700 h-10 max-h-10 overflow-hidden text-center">
                            {col==='checkbox' && (<input type="checkbox" aria-label={`Select ${b.name}`} checked={selectedBuildKeys.includes(b.key)} onChange={(e)=>{ if(e.target.checked){ setSelectedBuildKeys((prev)=>[...prev,b.key]); } else { setSelectedBuildKeys((prev)=>prev.filter(x=>x!==b.key)); } }} />)}
                            {col==='key' && (<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200" title={`Build Key: ${b.key}`}>{b.key}</span>)}
                            {col==='download' && (<button className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700" title="Download .lycplugin file" onClick={async ()=>{ try { const {copyFileToDownloads} = await import('./lib/studio'); const saved=await copyFileToDownloads(b.path, b.filename); alert(`Saved to ${saved}`); } catch(e) { alert(`Error: ${e}`); } }}><ArrowDownTrayIcon className="h-4 w-4" /></button>)}
                            {col==='name' && (<div className="text-left"><span className="text-gray-900 dark:text-gray-100 truncate block" title={`Plugin: ${b.name}`}>{b.name}</span></div>)}
                            {col==='version' && (<span className="font-mono text-xs text-gray-700 dark:text-gray-200 truncate block" title={`Version: ${b.version}`}>{b.version}</span>)}
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
        ) : !selected || !pluginDoc ? (
          <div className="h-full grid place-items-center text-gray-500">{busy ? 'Loading…' : 'Select an application or open Settings'}</div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Minimal plugin header (no borders/containers). Click to edit */}
            <div className="flex items-center gap-4 select-none mt-10 mb-6">
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
                  {(['General','App GUI','App Settings','Sequencer Actions','Licensing'] as const).map((t) => (
                    <button
                      key={t}
                      className={`px-3 py-2 border-b-2 ${activeTab===t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:bg-gray-700'}`}
                      onClick={() => setActiveTab(t)}
                    >
                      {t}
                    </button>
                  ))}
                </nav>
                <div className="py-2">
                  <button
                    className="px-3 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
                    onClick={async () => {
                      if (!selected) return;
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

                      const r = await runBuild(selected);
                      if (!r.success) {
                        alert(r.stderr || 'Build failed');
                        return;
                      }
                      const out = await exportBuiltPluginToDownloads(selected);
                      setLastDownloadPath(out.savedPath);
                      try {
                        const updatedFile = await readPlugin(selected);
                        const updatedDoc = JSON.parse(updatedFile.contents);
                        const m = updatedDoc?.metadata || {};
                        const record = {
                          key: makeBuildKey(),
                          path: out.savedPath,
                          pluginId: String(m.id || selected),
                          name: String(m.name || selected),
                          version: String(m.version || '1.0.0'),
                          filename: String(out.savedPath.split('\\').pop() || `${selected}.lycplugin`),
                          builtAt: new Date().toISOString(),
                          icon: m.icon,
                        };
                        addBuild(record);
                        setBuilds(listBuilds());
                      } catch {}
                    }}
                  >
                    Build
                  </button>
                </div>
              </div>
      </div>

            {/* Tab content */}
            {activeTab === 'General' && (
              <div className="grid grid-cols-[1fr_360px] gap-4">
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
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-0">Versioning</h3>
                    <VersionEditor
                      currentVersion={metadata.version || '1.0.0'}
                      onUpdateVersion={async (v: string) => {
                        const next = { ...pluginDoc, metadata: { ...metadata, version: v } };
                        await persist(next);
                      }}
                    />
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'App GUI' && (
              <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-0">App GUI Configurator</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">Design and simulate your application GUI elements here.</p>
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
              <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4 space-y-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-0">Licensing</h3>
                <label className="block text-sm">Create or paste a license key</label>
                <textarea className="w-full h-24 px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-gray-200" value={pluginDoc?.licensing?.key ?? ''} onChange={async (e) => {
                  const next = { ...pluginDoc, licensing: { ...(pluginDoc.licensing||{}), key: e.target.value } };
                  await persist(next);
                }} />
              </section>
            )}

            {/* Compiler tab removed */}
          </div>
        )}
        </div>
      </main>
    </div>
  );
}