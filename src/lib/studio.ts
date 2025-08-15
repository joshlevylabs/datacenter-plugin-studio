// src/lib/studio.ts
import { readTextFile, writeTextFile, mkdir, BaseDirectory } from '@tauri-apps/plugin-fs';
import { join, appDataDir, downloadDir } from '@tauri-apps/api/path';
import { invoke } from '@tauri-apps/api/core';

const CONFIG_KEY = 'pluginStudioRoot'; // store in localStorage for now
const BUILDS_KEY = 'pluginStudioBuilds';
const PLUGIN_KEYS_KEY = 'pluginStudioPluginKeys';

export async function getWorkspaceRoot(): Promise<string> {
  const saved = localStorage.getItem(CONFIG_KEY);
  if (saved) return saved;
  const cwd = await join(await appDataDir(), 'plugins'); // fallback
  return cwd;
}

export function setWorkspaceRoot(root: string) {
  localStorage.setItem(CONFIG_KEY, root);
}

export async function listPlugins(): Promise<string[]> {
  const root = await getWorkspaceRoot();
  return await invoke<string[]>('list_plugins', { workspaceRoot: root });
}

export type PluginFile = {
  path: string;
  contents: string;
};

export async function readPlugin(pluginName: string): Promise<PluginFile> {
  const root = await getWorkspaceRoot();
  const dir = await join(root, pluginName);
  const filePath = await join(dir, `${pluginName}.lycplugin`);
  let contents: string;
  try {
    contents = await readTextFile(filePath);
  } catch (err) {
    // Auto-create from skeleton if missing
    const res = await fetch('/custom-plugin-skeleton.lycplugin');
    if (!res.ok) throw err;
    const skeleton = await res.text();
    const plugin = JSON.parse(skeleton);
    plugin.metadata.id = pluginName;
    plugin.metadata.name = pluginName.replace(/-/g, ' ');
    await writeTextFile(filePath, JSON.stringify(plugin, null, 2));
    contents = JSON.stringify(plugin, null, 2);
  }
  return { path: filePath, contents };
}

export async function getPluginSize(pluginName: string): Promise<number> {
  try {
    const root = await getWorkspaceRoot();
    const pluginDir = await join(root, pluginName);
    // Get directory size via Tauri command
    const sizeBytes = await invoke<number>('get_directory_size', { path: pluginDir });
    return sizeBytes;
  } catch {
    return 0;
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export async function getLatestVersion(pluginName: string): Promise<string> {
  try {
    // First check plugin metadata buildHistory
    const file = await readPlugin(pluginName);
    const doc = JSON.parse(file.contents);
    const buildHistory = doc?.metadata?.buildHistory;
    
    if (buildHistory && buildHistory.length > 0) {
      // Sort by build date and get latest
      const sorted = buildHistory.sort((a: any, b: any) => new Date(b.builtAt).getTime() - new Date(a.builtAt).getTime());
      return sorted[0].version;
    }
    
    // Fall back to external builds list
    const builds = listBuilds();
    const pluginBuilds = builds.filter(b => b.pluginId === pluginName || b.name === pluginName);
    if (pluginBuilds.length === 0) return 'NA';
    
    // Sort by build date and get latest
    pluginBuilds.sort((a, b) => new Date(b.builtAt).getTime() - new Date(a.builtAt).getTime());
    return pluginBuilds[0].version;
  } catch (error) {
    return 'NA';
  }
}

export async function getPluginBuildHistory(pluginName: string): Promise<any[]> {
  try {
    // First check plugin metadata buildHistory
    const file = await readPlugin(pluginName);
    const doc = JSON.parse(file.contents);
    const buildHistory = doc?.metadata?.buildHistory;
    
    if (buildHistory && buildHistory.length > 0) {
      // Sort by build date (newest first)
      return buildHistory.sort((a: any, b: any) => new Date(b.builtAt).getTime() - new Date(a.builtAt).getTime());
    }
    
    // Fall back to external builds list
    const builds = listBuilds();
    return builds
      .filter(b => b.pluginId === pluginName || b.name === pluginName)
      .sort((a, b) => new Date(b.builtAt).getTime() - new Date(a.builtAt).getTime());
  } catch (error) {
    return [];
  }
}

export async function savePlugin(pluginName: string, data: object): Promise<{ success: boolean }>{
  const root = await getWorkspaceRoot();
  const dir = await join(root, pluginName);
  const filePath = await join(dir, `${pluginName}.lycplugin`);
  await writeTextFile(filePath, JSON.stringify(data, null, 2));
  return { success: true };
}

export async function deletePlugin(pluginName: string): Promise<{ success: boolean; stderr?: string }>{
  return await invoke('remove_plugin', { name: pluginName, workspaceRoot: await getWorkspaceRoot() });
}

export type CreatePluginOptions = {
  name: string;
  templatePath?: string; // optional override for skeleton path
};

export async function createPlugin(options: CreatePluginOptions) {
  const root = await getWorkspaceRoot();
  const pluginId = options.name.toLowerCase().replace(/\s+/g, '-');
  const appDataPlugins = await join(await appDataDir(), 'plugins');
  const usingDefaultAppData = root.toLowerCase() === appDataPlugins.toLowerCase();
  const pluginDirAbs = usingDefaultAppData
    ? await join(await appDataDir(), 'plugins', pluginId)
    : await join(root, pluginId);
  // Ensure FS scope allows the custom root when not using AppData
  if (!usingDefaultAppData) {
    try {
      await invoke('allow_fs_dir', { dir: root, recursive: true });
    } catch {
      // ignore, capability may already allow it
    }
  }

  const pluginDirRel = `plugins/${pluginId}`;
  if (usingDefaultAppData) {
    await mkdir(pluginDirRel, { recursive: true, baseDir: BaseDirectory.AppData });
  } else {
    await mkdir(pluginDirAbs, { recursive: true });
  }

  // read skeleton via HTTP to avoid FS permission issues; served from /public
  let skeleton: string;
  if (options.templatePath) {
    skeleton = await readTextFile(options.templatePath);
  } else {
    const res = await fetch('/custom-plugin-skeleton.lycplugin');
    if (!res.ok) throw new Error(`Failed to load skeleton: ${res.status}`);
    skeleton = await res.text();
  }
  const plugin = JSON.parse(skeleton);
  plugin.metadata.id = pluginId;
  plugin.metadata.name = options.name;

  // write plugin file
  if (usingDefaultAppData) {
    await writeTextFile(
      `${pluginDirRel}/${pluginId}.lycplugin`,
      JSON.stringify(plugin, null, 2),
      { baseDir: BaseDirectory.AppData }
    );
  } else {
    await writeTextFile(
      await join(root, pluginId, `${pluginId}.lycplugin`),
      JSON.stringify(plugin, null, 2)
    );
  }

  // write minimal package.json and vite scaffolding
  const pkg = {
    name: pluginId,
    version: '1.0.0',
    private: true,
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'node ./scripts/build.js',
      validate: 'node ./scripts/validate.js'
    },
    dependencies: { react: '^18.2.0', 'react-dom': '^18.2.0' },
    devDependencies: { '@vitejs/plugin-react': '^4.0.3', vite: '^4.4.5' }
  };
  if (usingDefaultAppData) {
    await writeTextFile(`${pluginDirRel}/package.json`, JSON.stringify(pkg, null, 2), {
      baseDir: BaseDirectory.AppData,
    });
  } else {
    await writeTextFile(await join(root, pluginId, 'package.json'), JSON.stringify(pkg, null, 2));
  }

  // index.html
  if (usingDefaultAppData) {
    await writeTextFile(
      `${pluginDirRel}/index.html`,
      `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/><title>${pluginId}</title></head><body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body></html>`,
      { baseDir: BaseDirectory.AppData }
    );
  } else {
    await writeTextFile(
      await join(root, pluginId, 'index.html'),
      `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/><title>${pluginId}</title></head><body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body></html>`
    );
  }

  // vite.config.js
  if (usingDefaultAppData) {
    await writeTextFile(
      `${pluginDirRel}/vite.config.js`,
      `import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\nexport default defineConfig({ plugins: [react()] });\n`,
      { baseDir: BaseDirectory.AppData }
    );
  } else {
    await writeTextFile(
      await join(root, pluginId, 'vite.config.js'),
      `import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\nexport default defineConfig({ plugins: [react()] });\n`
    );
  }

  // src/main.jsx
  if (usingDefaultAppData) {
    await mkdir(`${pluginDirRel}/src`, { recursive: true, baseDir: BaseDirectory.AppData });
    await writeTextFile(
      `${pluginDirRel}/src/main.jsx`,
      `import React from 'react';\nimport { createRoot } from 'react-dom/client';\nfunction App(){ return <div style={{padding:16}}>Plugin ${options.name}</div>; }\ncreateRoot(document.getElementById('root')).render(<App/>);\n`,
      { baseDir: BaseDirectory.AppData }
    );
  } else {
    await mkdir(await join(root, pluginId, 'src'), { recursive: true });
    await writeTextFile(
      await join(root, pluginId, 'src', 'main.jsx'),
      `import React from 'react';\nimport { createRoot } from 'react-dom/client';\nfunction App(){ return <div style={{padding:16}}>Plugin ${options.name}</div>; }\ncreateRoot(document.getElementById('root')).render(<App/>);\n`
    );
  }

  // scripts/
  if (usingDefaultAppData) {
    await mkdir(`${pluginDirRel}/scripts`, { recursive: true, baseDir: BaseDirectory.AppData });
    await writeTextFile(
      `${pluginDirRel}/scripts/build.js`,
      `import fs from 'fs';\nimport path from 'path';\nimport {exec} from 'child_process';\nconsole.log('Building plugin...');\nexec('npx vite build',(e,so,se)=>{if(so)process.stdout.write(so);if(se)process.stderr.write(se);if(e){console.error('Vite build failed');process.exit(1);}const root=process.cwd();const id='${pluginId}';const src=path.join(root,id+'.lycplugin');const dist=path.join(root,'dist');if(!fs.existsSync(dist))fs.mkdirSync(dist,{recursive:true});if(!fs.existsSync(src)){console.error('Missing .lycplugin at',src);process.exit(1);}fs.copyFileSync(src,path.join(dist,id+'.lycplugin'));console.log('Wrote',path.join(dist,id+'.lycplugin'));});\n`,
      { baseDir: BaseDirectory.AppData }
    );
    await writeTextFile(
      `${pluginDirRel}/scripts/validate.js`,
      `import fs from 'fs';\nimport path from 'path';\nconst p=path.join(process.cwd(),'${pluginId}.lycplugin');try{const d=JSON.parse(fs.readFileSync(p,'utf8'));if(!d.metadata||!d.metadata.id){console.error('Missing metadata.id');process.exit(1);}console.log('Validation OK');}catch(e){console.error('Validation error',e);process.exit(1);}\n`,
      { baseDir: BaseDirectory.AppData }
    );
  } else {
    await mkdir(await join(root, pluginId, 'scripts'), { recursive: true });
    await writeTextFile(
      await join(root, pluginId, 'scripts', 'build.js'),
      `import fs from 'fs';\nimport path from 'path';\nimport {exec} from 'child_process';\nconsole.log('Building plugin...');\nexec('npx vite build',(e,so,se)=>{if(so)process.stdout.write(so);if(se)process.stderr.write(se);if(e){console.error('Vite build failed');process.exit(1);}const root=process.cwd();const id='${pluginId}';const src=path.join(root,id+'.lycplugin');const dist=path.join(root,'dist');if(!fs.existsSync(dist))fs.mkdirSync(dist,{recursive:true});if(!fs.existsSync(src)){console.error('Missing .lycplugin at',src);process.exit(1);}fs.copyFileSync(src,path.join(dist,id+'.lycplugin'));console.log('Wrote',path.join(dist,id+'.lycplugin'));});\n`
    );
    await writeTextFile(
      await join(root, pluginId, 'scripts', 'validate.js'),
      `import fs from 'fs';\nimport path from 'path';\nconst p=path.join(process.cwd(),'${pluginId}.lycplugin');try{const d=JSON.parse(fs.readFileSync(p,'utf8'));if(!d.metadata||!d.metadata.id){console.error('Missing metadata.id');process.exit(1);}console.log('Validation OK');}catch(e){console.error('Validation error',e);process.exit(1);}\n`
    );
  }

  return { pluginId, pluginDir: pluginDirAbs };
}

export async function updatePluginScriptsToESModule(pluginName: string) {
  const root = await getWorkspaceRoot();
  const appDataPlugins = await join(await appDataDir(), 'plugins');
  const usingDefaultAppData = root.toLowerCase() === appDataPlugins.toLowerCase();
  
  try {
    if (usingDefaultAppData) {
      // Update build.js
      await writeTextFile(
        `plugins/${pluginName}/scripts/build.js`,
        `import fs from 'fs';\nimport path from 'path';\nimport {exec} from 'child_process';\nconsole.log('Building plugin...');\nexec('npx vite build',(e,so,se)=>{if(so)process.stdout.write(so);if(se)process.stderr.write(se);if(e){console.error('Vite build failed');process.exit(1);}const root=process.cwd();const id='${pluginName}';const src=path.join(root,id+'.lycplugin');const dist=path.join(root,'dist');if(!fs.existsSync(dist))fs.mkdirSync(dist,{recursive:true});if(!fs.existsSync(src)){console.error('Missing .lycplugin at',src);process.exit(1);}fs.copyFileSync(src,path.join(dist,id+'.lycplugin'));console.log('Wrote',path.join(dist,id+'.lycplugin'));});\n`,
        { baseDir: BaseDirectory.AppData }
      );
      
      // Update validate.js
      await writeTextFile(
        `plugins/${pluginName}/scripts/validate.js`,
        `import fs from 'fs';\nimport path from 'path';\nconst p=path.join(process.cwd(),'${pluginName}.lycplugin');try{const d=JSON.parse(fs.readFileSync(p,'utf8'));if(!d.metadata||!d.metadata.id){console.error('Missing metadata.id');process.exit(1);}console.log('Validation OK');}catch(e){console.error('Validation error',e);process.exit(1);}\n`,
        { baseDir: BaseDirectory.AppData }
      );
    } else {
      // Update build.js
      await writeTextFile(
        await join(root, pluginName, 'scripts', 'build.js'),
        `import fs from 'fs';\nimport path from 'path';\nimport {exec} from 'child_process';\nconsole.log('Building plugin...');\nexec('npx vite build',(e,so,se)=>{if(so)process.stdout.write(so);if(se)process.stderr.write(se);if(e){console.error('Vite build failed');process.exit(1);}const root=process.cwd();const id='${pluginName}';const src=path.join(root,id+'.lycplugin');const dist=path.join(root,'dist');if(!fs.existsSync(dist))fs.mkdirSync(dist,{recursive:true});if(!fs.existsSync(src)){console.error('Missing .lycplugin at',src);process.exit(1);}fs.copyFileSync(src,path.join(dist,id+'.lycplugin'));console.log('Wrote',path.join(dist,id+'.lycplugin'));});\n`
      );
      
      // Update validate.js
      await writeTextFile(
        await join(root, pluginName, 'scripts', 'validate.js'),
        `import fs from 'fs';\nimport path from 'path';\nconst p=path.join(process.cwd(),'${pluginName}.lycplugin');try{const d=JSON.parse(fs.readFileSync(p,'utf8'));if(!d.metadata||!d.metadata.id){console.error('Missing metadata.id');process.exit(1);}console.log('Validation OK');}catch(e){console.error('Validation error',e);process.exit(1);}\n`
      );
    }
    
    console.log(`Updated ${pluginName} scripts to ES module syntax`);
    return { success: true };
  } catch (error) {
    console.error(`Failed to update ${pluginName} scripts:`, error);
    return { success: false, error: String(error) };
  }
}

export async function runDev(pluginName: string) {
  const root = await getWorkspaceRoot();
  const dir = await join(root, pluginName);
  return await invoke<{ success: boolean; stdout: string; stderr: string }>('run_npm', { dir, script: 'dev' });
}
export async function installDependencies(pluginName: string) {
  const root = await getWorkspaceRoot();
  const dir = await join(root, pluginName);
  return await invoke<{ success: boolean; stdout: string; stderr: string }>('run_npm_command', { dir, command: 'install' });
}

export async function runBuild(pluginName: string) {
  const root = await getWorkspaceRoot();
  const dir = await join(root, pluginName);
  return await invoke<{ success: boolean; stdout: string; stderr: string }>('run_npm', { dir, script: 'build' });
}
export async function runValidate(pluginName: string) {
  const root = await getWorkspaceRoot();
  const dir = await join(root, pluginName);
  return await invoke<{ success: boolean; stdout: string; stderr: string }>('run_npm', { dir, script: 'validate' });
}

/**
 * Returns the expected path for the build artifact produced by scripts/build.js
 */
export async function getBuiltArtifactPath(pluginName: string): Promise<string> {
  const root = await getWorkspaceRoot();
  const distDir = await join(root, pluginName, 'dist');
  return await join(distDir, `${pluginName}.lycplugin`);
}

/**
 * Copies the built .lycplugin into the user's Downloads folder with a friendly filename.
 * If a built artifact is not present, falls back to the source .lycplugin in the plugin folder.
 * Returns the absolute path of the saved file.
 */
export async function exportBuiltPluginToDownloads(pluginName: string): Promise<{ savedPath: string; fromDist: boolean }>{
  const root = await getWorkspaceRoot();
  const pluginDir = await join(root, pluginName);
  const srcFromDist = await getBuiltArtifactPath(pluginName);
  let sourcePath = srcFromDist;
  let fromDist = true;
  let contents: string;
  try {
    contents = await readTextFile(sourcePath);
  } catch {
    // Fallback to the plugin's source .lycplugin
    sourcePath = await join(pluginDir, `${pluginName}.lycplugin`);
    contents = await readTextFile(sourcePath);
    fromDist = false;
  }

  // Determine friendly filename using metadata ID (not display name)
  let friendlyName = `${pluginName}.lycplugin`;
  try {
    const doc = JSON.parse(contents);
    const meta = doc?.metadata || {};
    
    // DEBUG: Log what's actually in the exported file
    console.log('=== EXPORT DEBUG ===');
    console.log('Plugin file being exported:');
    console.log('meta.id:', meta.id);
    console.log('meta.name:', meta.name);
    console.log('meta.route:', meta.route);
    console.log('pluginName param:', pluginName);
    console.log('fromDist:', fromDist);
    console.log('sourcePath:', sourcePath);
    
    // Use plugin ID instead of display name to ensure consistency with route
    const pluginId = (meta.id || pluginName).toString().toLowerCase().replace(/\s+/g, '-');
    const version = (meta.version || '1.0.0').toString();
    friendlyName = `${pluginId}-v${version}.lycplugin`;
    
    console.log('Final filename:', friendlyName);
    console.log('==================');
  } catch {
    // ignore JSON parse error, keep default
  }

  // Ensure we have permission then write to Downloads
  const downloads = await downloadDir();
  try {
    await invoke('allow_fs_dir', { dir: downloads, recursive: true });
  } catch {
    // ignore if capability already allows
  }
  const targetPath = await join(downloads, friendlyName);
  await writeTextFile(targetPath, contents);
  return { savedPath: targetPath, fromDist };
}

/**
 * Perform an in-app validation simulating Centcom importer and basic subsystems.
 * Returns a report with errors, warnings, and info entries.
 */
export async function simulateCentcomValidation(pluginName: string): Promise<{
  ok: boolean;
  errors: string[];
  warnings: string[];
  info: string[];
}> {
  const root = await getWorkspaceRoot();
  const pluginPath = await join(root, pluginName, `${pluginName}.lycplugin`);
  const errors: string[] = [];
  const warnings: string[] = [];
  const info: string[] = [];

  let doc: any;
  try {
    const text = await readTextFile(pluginPath);
    doc = JSON.parse(text);
    info.push(`Loaded ${pluginPath}`);
  } catch (e: any) {
    errors.push(`Failed to read/parse plugin file: ${e?.message || e}`);
    return { ok: false, errors, warnings, info };
  }
  return validatePluginDoc(doc, info);
}

function validatePluginDocInternal(doc: any, infoSeed: string[] = []) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const info: string[] = [...infoSeed];

  const meta = doc?.metadata || {};
  if (!meta.id || typeof meta.id !== 'string') errors.push('metadata.id is required');
  if (!meta.name || typeof meta.name !== 'string') errors.push('metadata.name is required');
  if (!meta.version || typeof meta.version !== 'string') warnings.push('metadata.version missing, defaulting to 1.0.0');
  
  // Enhanced route validation and auto-fix
  const expectedRoute = `/${meta.id || 'plugin'}`;
  
  // Check for problematic routes
  if (!meta.route || typeof meta.route !== 'string' || 
      meta.route.startsWith('#') || 
      meta.route.trim() === '' ||
      meta.route === '/') {
    warnings.push(`metadata.route missing or invalid (${meta.route}), auto-setting to: ${expectedRoute}`);
    if (doc.metadata) {
      doc.metadata.route = expectedRoute;
    } else {
      doc.metadata = { ...meta, route: expectedRoute };
    }
  }
  // Check if route doesn't match the plugin ID (common mismatch issue)
  else if (meta.route !== expectedRoute && !meta.route.startsWith('/api/')) {
    warnings.push(`metadata.route (${meta.route}) doesn't match plugin ID, updating to: ${expectedRoute}`);
    if (doc.metadata) {
      doc.metadata.route = expectedRoute;
    } else {
      doc.metadata = { ...meta, route: expectedRoute };
    }
  }
  
  // Validate and fix icon field
  if (!meta.icon || typeof meta.icon !== 'string' || meta.icon.trim() === '') {
    warnings.push(`metadata.icon missing, defaulting to: CubeIcon`);
    if (doc.metadata) {
      doc.metadata.icon = 'CubeIcon';
    } else {
      doc.metadata = { ...meta, icon: 'CubeIcon' };
    }
  } else {
    // Check if icon name is valid (should not contain URLs or paths)
    if (meta.icon.includes('/') || meta.icon.includes('http') || meta.icon.includes('.')) {
      warnings.push(`metadata.icon contains invalid characters (${meta.icon}), defaulting to: CubeIcon`);
      if (doc.metadata) {
        doc.metadata.icon = 'CubeIcon';
      } else {
        doc.metadata = { ...meta, icon: 'CubeIcon' };
      }
    }
  }
  if (Array.isArray(meta.permissions) && meta.permissions.length === 0) warnings.push('metadata.permissions is empty');

  if (!doc.frontend || (!doc.frontend.main && !doc.frontend.previewHtml && !doc.frontend.bundle)) {
    errors.push('frontend.main, frontend.previewHtml or frontend.bundle required');
  } else {
    if (typeof doc.frontend.main === 'string' && doc.frontend.main.trim().length > 0) info.push('frontend.main exists');
    if (typeof doc.frontend.previewHtml === 'string' && doc.frontend.previewHtml.trim().length > 0) info.push('frontend.previewHtml exists');
    if (typeof doc.frontend.bundle === 'string' && doc.frontend.bundle.trim().length > 0) info.push('frontend.bundle exists');
  }

  if (!doc.backend || typeof doc.backend.main !== 'string' || doc.backend.main.trim().length === 0) {
    warnings.push('backend.main (Rust source) missing; backend commands will not be available in Centcom');
  } else {
    info.push('backend.main exists');
  }

  if (doc.sequencer && Array.isArray(doc.sequencer.steps)) {
    const steps = doc.sequencer.steps;
    if (steps.length === 0) warnings.push('sequencer.steps is empty');
    steps.forEach((s: any, idx: number) => {
      if (!s.id) errors.push(`sequencer.steps[${idx}].id is required`);
      if (!s.command) warnings.push(`sequencer.steps[${idx}].command is missing`);
    });
    info.push(`Sequencer: ${steps.length} step(s)`);
  }

  const declared: string[] = Array.isArray(meta.tauriCommands) ? meta.tauriCommands : [];
  const used = new Set<string>();
  if (doc.sequencer && Array.isArray(doc.sequencer.steps)) {
    for (const s of doc.sequencer.steps) if (s?.command) used.add(String(s.command));
  }
  for (const u of used) {
    if (!declared.includes(u)) warnings.push(`Command '${u}' used in sequencer but not declared in metadata.tauriCommands`);
  }
  if (declared.length && used.size === 0) warnings.push('metadata.tauriCommands declared but not referenced by sequencer');

  // Validate licensing configuration if enabled
  if (doc.licensing && doc.licensing.enabled) {
    info.push('Licensing system enabled');
    
    if (doc.licensing.requiresLicense) {
      info.push('Plugin requires valid license');
      
      // Check license tiers
      if (!doc.licensing.tiers || doc.licensing.tiers.length === 0) {
        errors.push('At least one license tier must be defined when licensing is required');
      } else {
        doc.licensing.tiers.forEach((tier: any, index: number) => {
          if (!tier.name) {
            errors.push(`License tier ${index + 1}: name is required`);
          }
          if (tier.price < 0) {
            errors.push(`License tier ${index + 1}: price cannot be negative`);
          }
          if (tier.duration !== 'perpetual' && (!tier.durationValue || tier.durationValue <= 0)) {
            errors.push(`License tier ${index + 1}: duration value must be positive for non-perpetual licenses`);
          }
        });
        info.push(`License tiers: ${doc.licensing.tiers.length} defined`);
      }
      
      // Check cryptography configuration
      if (!doc.licensing.cryptography) {
        warnings.push('Cryptography configuration missing - using defaults');
      } else {
        if (!doc.licensing.cryptography.publicKey && !doc.licensing.cryptography.privateKey) {
          warnings.push('No cryptographic keys generated - licenses cannot be signed or verified');
        }
        info.push(`Cryptography: ${doc.licensing.cryptography.algorithm || 'RSA-2048'}`);
      }
      
      // Check remote validation
      if (doc.licensing.remoteValidation && doc.licensing.remoteValidation.enabled) {
        if (!doc.licensing.remoteValidation.endpoint) {
          errors.push('Remote validation endpoint is required when remote validation is enabled');
        } else {
          info.push('Remote license validation enabled');
        }
      }
      
      // Check features
      if (doc.licensing.features && doc.licensing.features.length > 0) {
        info.push(`License-controlled features: ${doc.licensing.features.length}`);
      }
    } else {
      info.push('Plugin licensing enabled but not required (optional licensing)');
    }
  }

  const ok = errors.length === 0;
  if (ok) info.push('Validation OK');
  return { ok, errors, warnings, info };
}

export function validatePluginDoc(doc: any, seedInfo: string[] = []) {
  return validatePluginDocInternal(doc, seedInfo);
}

/**
 * Create a self-contained HTML string for the simulator preview.
 * Priority:
 *  - If frontend.previewHtml exists, use it directly inside our shell.
 *  - Else if frontend.bundle exists (string of JS), inject it in a <script>.
 *  - Else fallback to a placeholder message (we avoid JSX and external CDNs to keep offline and safe).
 */
export function buildSimulatorPreviewHtml(pluginJson: any): string {
  const name = (pluginJson?.metadata?.name || 'Plugin Preview').toString();
  const previewHtml = pluginJson?.frontend?.previewHtml;
  const bundleJs = pluginJson?.frontend?.bundle;
  const shellStart = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <title>${name}</title>
    <style>html,body,#root{height:100%;margin:0}body{font-family:ui-sans-serif,system-ui,Segoe UI,Roboto,Helvetica,Arial}</style>
    <script>window.__SIM_PARENT_ORIGIN='*';</script>
  </head>
  <body>
    <div id="root"></div>
`;
  const shellEnd = `
  </body>
</html>`;

  // If explicit preview HTML is provided, use it
  if (typeof previewHtml === 'string' && previewHtml.trim().length > 0) {
    return `${shellStart}${previewHtml}${shellEnd}`;
  }

  // If we have a bundle, inject it with minimal stubs
  if (typeof bundleJs === 'string' && bundleJs.trim().length > 0) {
    const boot = `
    <script>(function(){
      const send = (payload) => { try { parent.postMessage({ __sim: true, ...payload }, window.__SIM_PARENT_ORIGIN); } catch(e) {} };
      const dialog = { open: async () => (null) };
      const invoke = async (cmd, args) => { send({ type:'sim-invoke', cmd, args }); return { success:true }; };
      window.invoke = invoke; window.dialog = dialog;
      const _cl = console.log; console.log = function(){ try{ send({ type: 'sim-log', value: Array.from(arguments).map(String).join(' ') }); }catch(e){}; _cl.apply(console, arguments); };
    })();</script>
    <script>${bundleJs}\n//# sourceURL=plugin-bundle.js</script>`;
    return `${shellStart}${boot}${shellEnd}`;
  }

  // Fallback: message
  const msg = `<div style="padding:12px;color:#374151;font-size:14px;">Preview unavailable. Provide 'frontend.previewHtml' or a compiled 'frontend.bundle' in your .lycplugin to enable the in-app preview.</div>`;
  return `${shellStart}${msg}${shellEnd}`;
}

/**
 * Open a .lycplugin file from disk and return parsed JSON and path.
 */
export async function openLycpPluginFromDisk(): Promise<{ path: string; doc: any } | null> {
  // Use the in-app file selector by prompting the user via the opener capability
  // Since @tauri-apps/api/dialog might not be available, leverage a simple prompt fallback.
  // If you later add the dialog plugin, replace this with dialog.open.
  const selected = prompt('Select .lycplugin file (enter full path)');
  if (!selected || Array.isArray(selected)) return null;
  // Permit FS access to the chosen directory
  const filePath = String(selected);
  const dir = filePath.replace(/[\\/][^\\/]*$/, '');
  try { await invoke('allow_fs_dir', { dir, recursive: true }); } catch {}
  const text = await readTextFile(filePath);
  const doc = JSON.parse(text);
  return { path: filePath, doc };
}

export type BuildRecord = {
  key: string;
  path: string;
  pluginId: string;
  name: string;
  version: string;
  filename: string;
  builtAt: string; // ISO
  icon?: string;
  buildName?: string;
  releaseNotes?: string;
  buildLogs?: string[];
  extra?: Record<string, any>;
};

export function listBuilds(): BuildRecord[] {
  try {
    const raw = localStorage.getItem(BUILDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as BuildRecord[];
  } catch {
    return [];
  }
}

export function addBuild(record: BuildRecord) {
  const list = listBuilds();
  list.unshift(record);
  localStorage.setItem(BUILDS_KEY, JSON.stringify(list));
}

export function deleteBuild(key: string) {
  const list = listBuilds().filter((b) => b.key !== key);
  localStorage.setItem(BUILDS_KEY, JSON.stringify(list));
}

export function makeBuildKey(): string {
  // Generate sequential key: BLD-001, BLD-002, ...
  // Track highest number ever used, not just existing builds
  const BUILD_COUNTER_KEY = 'pluginStudioBuildCounter';
  
  // Get current counter from localStorage
  let counter = parseInt(localStorage.getItem(BUILD_COUNTER_KEY) || '0', 10);
  
  // Also check existing builds in case we're migrating or counter was reset
  const allBuilds = listBuilds();
  let maxExisting = 0;
  for (const build of allBuilds) {
    const m = /^BLD-(\d+)$/.exec(build.key);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > maxExisting) maxExisting = n;
    }
  }
  
  // Use the higher of the two: stored counter or max from existing builds
  counter = Math.max(counter, maxExisting);
  
  // Increment and save the new counter
  counter++;
  localStorage.setItem(BUILD_COUNTER_KEY, counter.toString());
  
  const padded = String(counter).padStart(3, '0');
  return `BLD-${padded}`;
}

export function makePluginKey(): string {
  return `P-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function getOrCreatePluginKey(pluginId: string): string {
  let map: Record<string, string> = {};
  try {
    const raw = localStorage.getItem(PLUGIN_KEYS_KEY);
    if (raw) map = JSON.parse(raw);
  } catch {}
  if (!map[pluginId]) {
    // Generate sequential key: PGN-001, PGN-002, ...
    let maxNum = 0;
    for (const val of Object.values(map)) {
      const m = /^PGN-(\d+)$/.exec(val);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > maxNum) maxNum = n;
      }
    }
    const next = maxNum + 1;
    const padded = String(next).padStart(3, '0');
    map[pluginId] = `PGN-${padded}`;
    localStorage.setItem(PLUGIN_KEYS_KEY, JSON.stringify(map));
  }
  return map[pluginId];
}

export function listPluginKeys(pluginIds: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const id of pluginIds) out[id] = getOrCreatePluginKey(id);
  return out;
}

/**
 * Copies a file to the user's Downloads directory. Returns the saved path.
 * If destName is provided, it will be used; otherwise the source filename will be used.
 */
export async function copyFileToDownloads(srcPath: string, destName?: string): Promise<string> {
  const dir = srcPath.replace(/[\\/][^\\/]*$/, '');
  try { await invoke('allow_fs_dir', { dir, recursive: true }); } catch {}
  const data = await readTextFile(srcPath);
  const downloads = await downloadDir();
  try { await invoke('allow_fs_dir', { dir: downloads, recursive: true }); } catch {}
  const name = destName || srcPath.replace(/^.*[\\/]/, '');
  const targetPath = await join(downloads, name);
  await writeTextFile(targetPath, data);
  return targetPath;
}

export async function readPluginFromPath(filePath: string): Promise<any> {
  const dir = filePath.replace(/[\\/][^\\/]*$/, '');
  try { await invoke('allow_fs_dir', { dir, recursive: true }); } catch {}
  const text = await readTextFile(filePath);
  return JSON.parse(text);
}