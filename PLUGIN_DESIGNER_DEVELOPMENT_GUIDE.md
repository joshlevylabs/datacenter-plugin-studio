# Plugin Designer Development Guide

## Overview

This guide provides comprehensive instructions for developing the Plugin Development Studio (PDS) to create `.lycplugin` files that properly register and function within the Centcom datacenter application.

## Architecture Understanding

### Plugin Development Studio (PDS)
- **Location:** `C:\Users\joshual\Documents\Cursor\datacenter-plugin-studio`
- **Purpose:** Design, build, and export plugins for Centcom
- **Tech Stack:** React + TypeScript + Tauri + Vite

### Centcom Application  
- **Location:** `C:\Users\joshual\Documents\Cursor\datacenter`
- **Purpose:** Load and execute plugins for measurement and analysis
- **Tech Stack:** React + TypeScript + Tauri + Rust backend

## Plugin File Format (.lycplugin)

### File Structure
```json
{
  "metadata": {
    "id": "plugin-id",                    // CRITICAL: Must match route
    "name": "Display Name",               // Human-readable name
    "version": "1.0.0",                   // Semantic version
    "description": "Plugin description",   // Brief description
    "author": "Author Name",              // Plugin author
    "route": "/plugin-id",                // CRITICAL: Must match ID
    "icon": "IconName",                   // Heroicon name (not URL)
    "permissions": ["devices:read", ...], // Required permissions
    "tauriCommands": [...],               // Backend commands
    "category": "Measurement Tools",       // Plugin category
    "tags": ["measurement", "analysis"],  // Search tags
    "requiresLicense": false,             // License requirement
    "minCentcomVersion": "1.0.0",         // Compatibility
    "dependencies": []                    // Plugin dependencies
  },
  "frontend": {
    "main": "// React component code",    // Main component
    "previewHtml": "...",                 // Preview HTML
    "bundle": "..."                       // Built bundle
  },
  "backend": {
    "main": "// Rust backend code"        // Tauri commands
  },
  "gui": {
    "components": [...],                  // GUI component definitions
    "settings": {...},                    // GUI settings
    "version": "1.0",                     // GUI schema version
    "lastModified": "ISO date string"     // Last modification
  },
  "sequencer": {
    "steps": [...],                       // Sequencer steps
    "variables": {...}                    // Sequencer variables
  },
  "licensing": {
    "enabled": false,                     // Licensing enabled
    "requiresLicense": false,             // License required
    "tiers": [...],                       // License tiers
    "cryptography": {...}                 // Crypto settings
  }
}
```

## Critical Issues & Solutions

### 1. Plugin ID/Route Mismatch Issue

**Problem:** Plugin exported with correct metadata but Centcom registers with wrong ID.

**Root Cause:** 
- Filename used `display name` instead of `plugin ID`
- Centcom may cache old plugin data
- Route doesn't match plugin ID

**Solution:**
```typescript
// In exportBuiltPluginToDownloads()
const pluginId = (meta.id || pluginName).toString().toLowerCase().replace(/\s+/g, '-');
const version = (meta.version || '1.0.0').toString();
friendlyName = `${pluginId}-v${version}.lycplugin`;  // Use ID, not display name
```

**Validation Logic:**
```typescript
// Auto-fix route if missing or invalid
if (!meta.route || typeof meta.route !== 'string' || meta.route.startsWith('#')) {
  const autoRoute = `/${meta.id || 'plugin'}`;
  warnings.push(`metadata.route missing or invalid, auto-setting to: ${autoRoute}`);
  doc.metadata.route = autoRoute;
}

// Check if route doesn't match the plugin ID
const expectedRoute = `/${meta.id}`;
if (meta.route && meta.route !== expectedRoute && !meta.route.startsWith('/api/')) {
  warnings.push(`metadata.route (${meta.route}) doesn't match plugin ID, updating to: ${expectedRoute}`);
  doc.metadata.route = expectedRoute;
}
```

### 2. Icon Rendering Issue

**Problem:** Icons showing as broken links in Centcom.

**Root Cause:** 
- PDS exports icon names (e.g., "CircleStackIcon")
- Centcom expects icon components, not URLs

**Solution:**
```typescript
// Icon mapping for plugin icons
const ICON_COMPONENTS = {
  BeakerIcon, CubeIcon, ServerIcon, WrenchScrewdriverIcon,
  ChartBarIcon, DocumentTextIcon, SignalIcon, Squares2X2Icon,
  CogIcon, ComputerDesktopIcon, CircleStackIcon
};

// Icon renderer function
const renderPluginIcon = (iconName, className) => {
  if (!iconName) {
    return <div className={`bg-blue-400 ${className}`}></div>;
  }
  
  const IconComponent = ICON_COMPONENTS[iconName];
  if (IconComponent) {
    return <IconComponent className={className} />;
  }
  
  return <div className={`bg-gray-400 ${className}`}></div>;
};
```

### 3. GUI Components Not Rendering

**Problem:** Centcom shows "No GUI components found" instead of designed GUI.

**Root Cause:**
- GUI data structure mismatch
- Components not properly serialized
- Missing component type handlers

**Solution:**
```typescript
// Ensure GUI components are properly structured
const guiComponents = pluginMetadata?.gui?.components || [];

// Component renderer with proper type handling
{guiComponents.map((component, index) => (
  <div
    key={component.id || index}
    style={{
      position: 'absolute',
      left: component.x || 0,
      top: component.y || 0,
      width: component.width || 100,
      height: component.height || 30
    }}
  >
    {component.type === 'button' && (
      <button className="px-3 py-1 bg-blue-500 text-white rounded">
        {component.props?.text || 'Button'}
      </button>
    )}
    {component.type === 'textDisplay' && (
      <span className="text-sm">{component.props?.text || 'Text'}</span>
    )}
    {component.type === 'input' && (
      <input 
        type="text" 
        placeholder={component.props?.placeholder || 'Input'} 
        className="border px-2 py-1 text-sm"
      />
    )}
    {component.type === 'tabContainer' && (
      <div className="border rounded">
        <div className="flex border-b">
          {component.props?.tabs?.map((tab, i) => (
            <div key={i} className="px-3 py-1 border-r bg-gray-100">
              {tab}
            </div>
          ))}
        </div>
        <div className="p-2">Tab Content Area</div>
      </div>
    )}
  </div>
))}
```

### 4. Build Key Generation Issues

**Problem:** React duplicate key warnings when builds are deleted.

**Root Cause:** Sequential build keys (`BLD-001`, `BLD-002`) can duplicate after deletions.

**Solution:**
```typescript
export function makeBuildKey(): string {
  const BUILD_COUNTER_KEY = 'pluginStudioBuildCounter';
  
  // Get current counter from localStorage
  let counter = parseInt(localStorage.getItem(BUILD_COUNTER_KEY) || '0', 10);
  
  // Check existing builds for migration safety
  const allBuilds = listBuilds();
  let maxExisting = 0;
  for (const build of allBuilds) {
    const m = /^BLD-(\d+)$/.exec(build.key);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > maxExisting) maxExisting = n;
    }
  }
  
  // Use the higher value and increment
  counter = Math.max(counter, maxExisting) + 1;
  localStorage.setItem(BUILD_COUNTER_KEY, counter.toString());
  
  return `BLD-${String(counter).padStart(3, '0')}`;
}
```

## Development Patterns

### 1. Plugin Validation Workflow

```typescript
// Pre-build validation
async function validateAndFixPlugin(doc: any): Promise<ValidationResult> {
  const validation = await validatePluginDoc(doc);
  
  // Log all warnings and errors
  validation.warnings.forEach(warning => addBuildLog(`WARNING: ${warning}`));
  validation.errors.forEach(error => addBuildLog(`ERROR: ${error}`));
  
  if (validation.errors.length > 0) {
    throw new Error(`Plugin validation failed: ${validation.errors.join(', ')}`);
  }
  
  // Re-save with auto-fixes applied
  await persist(doc);
  
  return validation;
}
```

### 2. GUI Component System

```typescript
// Component library structure
const COMPONENT_LIBRARY = {
  'button': {
    type: 'button',
    name: 'Button',
    props: { text: 'Button', variant: 'primary' },
    icon: '🔘'
  },
  'textDisplay': {
    type: 'textDisplay', 
    name: 'Text Display',
    props: { text: 'Sample Text', fontSize: '14px' },
    icon: '📝'
  },
  'tabContainer': {
    type: 'tabContainer',
    name: 'Tab Container', 
    props: { tabs: ['Tab 1', 'Tab 2'], defaultTab: 0 },
    icon: '📑'
  }
};

// GUI builder state management
const [guiComponents, setGuiComponents] = useState([]);
const [selectedComponent, setSelectedComponent] = useState(null);
const [canvasZoom, setCanvasZoom] = useState(1.0);
const [canvasDimensions, setCanvasDimensions] = useState({ width: 800, height: 600 });
```

### 3. Template System

```typescript
// Template definitions
const BASIC_APP_TEMPLATE = {
  name: 'Basic Application',
  description: 'Simple app with title, description, and tabs',
  components: [
    {
      id: 'title',
      type: 'textDisplay',
      x: 20, y: 20, width: 200, height: 30,
      props: { text: 'Application Title', fontSize: '18px', fontWeight: 'bold' }
    },
    {
      id: 'description', 
      type: 'textDisplay',
      x: 20, y: 60, width: 400, height: 20,
      props: { text: 'Application description goes here', fontSize: '14px' }
    },
    {
      id: 'tabs',
      type: 'tabContainer',
      x: 20, y: 100, width: 500, height: 300,
      props: { tabs: ['General', 'Controls', 'Settings'], defaultTab: 0 }
    }
  ]
};
```

## Centcom Integration Points

### 1. Plugin Registration Flow

Based on analysis of `src-tauri/src/plugins/manager.rs`:

1. **File Detection:** Centcom scans plugin directory for `.lycplugin` files
2. **JSON Parsing:** Reads and parses the JSON content
3. **Metadata Extraction:** Extracts plugin metadata
4. **Database Registration:** Stores plugin in database with auto-generated UUID
5. **Runtime Loading:** Loads plugin into memory for execution

### 2. Database Schema

```sql
-- Inferred from Rust code
CREATE TABLE plugins (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT NOT NULL, 
  description TEXT,
  author TEXT,
  license_key TEXT,  -- Added for licensing system
  registered_at TIMESTAMP DEFAULT NOW()
);
```

### 3. Frontend Integration

From `src/components/PluginManager.tsx`:
- Uses file dialog to select `.lycplugin` files
- Parses JSON to extract metadata
- Registers with backend via Tauri commands
- Updates UI to show registered plugins

## Build Process Optimization

### 1. Validation Pipeline

```typescript
async function buildWithValidation(pluginName: string, buildName: string, releaseNotes: string) {
  try {
    // Step 1: Load plugin source
    const file = await readPlugin(pluginName);
    const doc = JSON.parse(file.contents);
    
    // Step 2: Validate and auto-fix
    addBuildLog('Validating plugin metadata...');
    const validation = await validateAndFixPlugin(doc);
    
    // Step 3: Build plugin
    const buildResult = await runBuild(pluginName);
    
    // Step 4: Export with correct filename
    const exportResult = await exportBuiltPluginToDownloads(pluginName);
    
    // Step 5: Create build record
    const buildRecord = createBuildRecord(doc, exportResult, buildName, releaseNotes);
    addBuild(buildRecord);
    
    return { success: true, path: exportResult.savedPath };
  } catch (error) {
    addBuildLog(`ERROR: ${error.message}`);
    throw error;
  }
}
```

### 2. Error Handling

```typescript
// Comprehensive error handling for plugin operations
try {
  // Plugin operation
} catch (error) {
  if (error.message.includes('metadata.id')) {
    addBuildLog('ERROR: Plugin ID is missing or invalid');
    addBuildLog('SOLUTION: Set a valid plugin ID in metadata');
  } else if (error.message.includes('route')) {
    addBuildLog('ERROR: Plugin route is missing or invalid');
    addBuildLog('SOLUTION: Route will be auto-fixed to match plugin ID');
  } else {
    addBuildLog(`ERROR: ${error.message}`);
  }
  
  showNotification('error', 'Build failed. Check build logs for details.');
}
```

## Testing & Validation

### 1. Plugin Compatibility Tests

```typescript
async function runCompatibilityTests(pluginDoc: any): Promise<TestResult[]> {
  const tests = [
    {
      name: 'Metadata Validation',
      test: () => validateRequiredMetadata(pluginDoc.metadata),
      critical: true
    },
    {
      name: 'Route Consistency', 
      test: () => validateRouteConsistency(pluginDoc.metadata),
      critical: true
    },
    {
      name: 'GUI Components',
      test: () => validateGUIComponents(pluginDoc.gui),
      critical: false
    },
    {
      name: 'Icon Compatibility',
      test: () => validateIconName(pluginDoc.metadata.icon),
      critical: false
    }
  ];
  
  return Promise.all(tests.map(async test => ({
    name: test.name,
    passed: await test.test(),
    critical: test.critical
  })));
}
```

### 2. Centcom Simulation

```typescript
// Simulate how Centcom will process the plugin
function simulateCentcomProcessing(pluginFile: string): SimulationResult {
  try {
    const content = JSON.parse(pluginFile);
    
    // Simulate Centcom's plugin registration
    const pluginId = content.metadata.id;
    const route = content.metadata.route;
    
    // Check for common integration issues
    const issues = [];
    if (!pluginId) issues.push('Missing plugin ID');
    if (!route) issues.push('Missing route');
    if (route !== `/${pluginId}`) issues.push('Route/ID mismatch');
    
    return {
      success: issues.length === 0,
      pluginId,
      route,
      issues,
      simulatedRegistration: {
        id: pluginId,
        name: content.metadata.name,
        version: content.metadata.version,
        route: route
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      issues: ['Invalid JSON format']
    };
  }
}
```

## Best Practices

### 1. Plugin ID Conventions

- **Use kebab-case:** `my-plugin-name`
- **Keep consistent:** Plugin ID should match directory name
- **Avoid changes:** Once set, avoid changing plugin IDs
- **Match route:** Route should always be `/${pluginId}`

### 2. Version Management

- **Semantic versioning:** `MAJOR.MINOR.PATCH`
- **Auto-increment:** Let PDS handle version increments
- **Build history:** Maintain complete build history
- **Rollback capability:** Support reverting to previous versions

### 3. GUI Design

- **Responsive design:** Support different canvas sizes
- **Component reuse:** Build reusable component library
- **Template system:** Provide common application templates
- **Preview mode:** Show how plugin will look in Centcom

### 4. Error Prevention

- **Real-time validation:** Validate as user designs
- **Auto-fix common issues:** Route/ID mismatches, missing metadata
- **Clear error messages:** Provide actionable error descriptions
- **Build logs:** Comprehensive logging for debugging

## Deployment Checklist

Before releasing a plugin:

- [ ] Plugin ID is unique and follows naming conventions
- [ ] Route matches plugin ID (`/plugin-id`)
- [ ] All required metadata fields are filled
- [ ] GUI components render correctly in preview
- [ ] Icon name is valid and displays properly
- [ ] Build completes without errors
- [ ] Export filename matches plugin ID
- [ ] Plugin registers successfully in Centcom
- [ ] All functionality works as expected

## Common Issues & Solutions

| Issue | Symptoms | Solution |
|-------|----------|----------|
| ID/Route Mismatch | Plugin shows but won't open | Ensure `metadata.route === "/${metadata.id}"` |
| Broken Icon | Blue square or broken image | Use valid Heroicon name, not URL |
| GUI Not Rendering | "No GUI components found" | Verify `gui.components` array structure |
| Build Key Duplicates | React key warnings | Use persistent counter for build keys |
| Registration Fails | Plugin doesn't appear in Centcom | Clear old plugin data before installing new version |

## Future Enhancements

1. **Plugin Marketplace:** Central repository for sharing plugins
2. **Dependency Management:** Handle plugin dependencies automatically
3. **Live Reload:** Real-time preview during development
4. **Code Generation:** Generate boilerplate code from GUI design
5. **Testing Framework:** Automated testing for plugin compatibility
6. **Version Control:** Git integration for plugin development
7. **Collaboration:** Multi-user plugin development support
8. **Documentation Generation:** Auto-generate plugin documentation

---

This guide should be referenced whenever developing features for the Plugin Development Studio to ensure proper integration with the Centcom application.