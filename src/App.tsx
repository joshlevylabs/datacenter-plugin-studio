// src/App.tsx
import { useEffect, useMemo, useState } from 'react';
import React from 'react';
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
  const [selected, setSelected] = useState<string | 'settings' | 'simulator' | 'builds' | null>(null);
  const [pluginIconMap, setPluginIconMap] = useState<Record<string, string>>({});
  const [pluginTitleMap, setPluginTitleMap] = useState<Record<string, string>>({});
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
  const [simModalOpen, setSimModalOpen] = useState(false);
  // selectedBuildKey not used presently
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
  const [isEditingIcon, setIsEditingIcon] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      const r = await getWorkspaceRoot();
      setRoot(r);
      const list = await listPlugins();
      setPlugins(list);
      // Preload icons and titles for each plugin
      const iconEntries: Array<[string, string]> = [];
      const titleEntries: Array<[string, string]> = [];
      for (const p of list) {
        try {
          const file = await readPlugin(p);
          const doc = JSON.parse(file.contents);
          const iconName = doc?.metadata?.icon || 'BeakerIcon';
          iconEntries.push([p, iconName]);
          const title = doc?.metadata?.name || p;
          titleEntries.push([p, title]);
        } catch {
          iconEntries.push([p, 'BeakerIcon']);
          titleEntries.push([p, p]);
        }
      }
      setPluginIconMap(Object.fromEntries(iconEntries));
      setPluginTitleMap(Object.fromEntries(titleEntries));
    })();
  }, []);

  async function refresh() {
    const list = await listPlugins();
    setPlugins(list);
    const iconEntries: Array<[string, string]> = [];
    const titleEntries: Array<[string, string]> = [];
    for (const p of list) {
      try {
        const file = await readPlugin(p);
        const doc = JSON.parse(file.contents);
        const iconName = doc?.metadata?.icon || 'BeakerIcon';
        iconEntries.push([p, iconName]);
        const title = doc?.metadata?.name || p;
        titleEntries.push([p, title]);
      } catch {
        iconEntries.push([p, 'BeakerIcon']);
        titleEntries.push([p, p]);
      }
    }
    setPluginIconMap(Object.fromEntries(iconEntries));
    setPluginTitleMap(Object.fromEntries(titleEntries));
  }

  async function openPlugin(name: string) {
    setBusy(true);
    try {
      const file = await readPlugin(name);
      const doc = JSON.parse(file.contents);
      setSelected(name);
      setPluginDoc(doc);
      setActiveTab('General');
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
        <div className="px-4 mt-3">
          <div className="font-semibold text-gray-900 dark:text-white mb-2">Plugins</div>
          <button className="w-full mb-3 px-3 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700" onClick={() => { const n = prompt('New plugin name'); if (!n) return; createPlugin({ name: n }).then(refresh); }}>New Plugin…</button>
        </div>
        <div className="mt-4 px-4">
          <div className="font-semibold text-gray-900 dark:text-white mb-2">Tools</div>
          <nav className="flex flex-col gap-2 mb-4">
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
          <div className="font-semibold text-gray-900 dark:text-white mb-2">Plugins</div>
          <nav className="flex flex-col gap-2">
            {plugins.map((p) => {
              const iconName = pluginIconMap[p] || 'BeakerIcon';
              const IconComp = ICONS[iconName] || PuzzlePieceIcon;
  return (
                <button key={p} className={`flex items-center gap-2 text-left w-full text-sm rounded-md px-3 py-2 border border-gray-200 dark:border-gray-700 ${selected === p ? 'bg-blue-50 text-blue-700 dark:bg-gray-700 dark:text-blue-300' : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'}`} onClick={() => openPlugin(p)}>
                  <IconComp className="h-5 w-5" />
                  <span className="truncate">{pluginTitleMap[p] || p}</span>
                </button>
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
        ) : selected === 'builds' ? (
          <div className="grid gap-4">
            <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-0">Builds</h3>
                <button className="px-3 py-2 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" onClick={() => setBuilds(listBuilds())}>Refresh</button>
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
                      <th className="px-2 py-2">Path</th>
                      <th className="px-2 py-2">Built</th>
                      <th className="px-2 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {builds.length === 0 ? (
                      <tr><td className="px-2 py-3 text-gray-500" colSpan={8}>No builds yet</td></tr>
                    ) : builds.map((b) => (
                      <tr key={b.key} className="border-t border-gray-200 dark:border-gray-700">
                        <td className="px-2 py-2 font-mono">{b.key}</td>
                        <td className="px-2 py-2">{b.pluginId}</td>
                        <td className="px-2 py-2">{b.name}</td>
                        <td className="px-2 py-2">{b.version}</td>
                        <td className="px-2 py-2">{b.filename}</td>
                        <td className="px-2 py-2 truncate max-w-[280px]" title={b.path}>{b.path}</td>
                        <td className="px-2 py-2">{new Date(b.builtAt).toLocaleString()}</td>
                        <td className="px-2 py-2">
                          <div className="flex gap-2">
                            <button className="px-2 py-1 text-xs rounded-md border border-gray-300 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" onClick={() => { setSelected('simulator'); setSimModalOpen(true); }}>Simulate</button>
                            <button className="px-2 py-1 text-xs rounded-md border border-red-300 bg-white hover:bg-red-50 text-red-700" onClick={() => { deleteBuild(b.key); setBuilds(listBuilds()); }}>Delete</button>
                          </div>
                        </td>
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