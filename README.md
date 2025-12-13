# Node Modules Inspector

A VS Code extension that provides a powerful, organized view of your `node_modules` dependencies with version information, dependency classification, and smart grouping.

![Node Modules Inspector Demo](demo.gif)

![Screenshot](screenshot.png)

## Features

- **Unified Package View**: All instances of each package grouped together, regardless of where they're installed
- **Version Conflict Detection**: Easily spot when the same package has multiple versions installed (highlighted in yellow)
- **Dependency Classification**:
  - **Direct** (green): Listed in your `dependencies`
  - **Dev** (blue): Listed in your `devDependencies`
  - **Peer** (purple): Listed in your `peerDependencies`
  - **Transitive** (gray): Installed as a dependency of another package
- **Location Tracking**:
  - **Hoisted**: At the top-level `node_modules`
  - **Nested**: Inside another package (version conflict)
  - **Workspace**: In a monorepo sub-package
- **Multi-root Support**: Works with monorepos and projects with multiple `node_modules` folders
- **Quick Search**: Press `Cmd+F` (Mac) or `Ctrl+F` (Windows/Linux) to search all packages
- **Click to Navigate**: Click any package to open its `package.json` and reveal it in the Explorer
- **Open in npm Registry**: Right-click to open packages in npmjs.com or your custom internal registry (configurable)

## Usage

1. Open a project with `node_modules`
2. Find the **"Node Modules Explorer"** panel in the Explorer sidebar
3. Browse packages or use the search icon to find specific packages
4. Hover over items for detailed information about dependency type and location
5. Click to open `package.json` files

## Icon Legend

### Package Level
| Icon | Meaning |
|------|---------|
| 📦 (green) | Direct dependency |
| 📦 (blue) | Dev dependency |
| 📦 (gray) | Transitive dependency |
| 🔀 (yellow) | Multiple versions installed |

### Instance Level
| Icon | Color | Meaning |
|------|-------|---------|
| → | Green | Direct dependency |
| 🔧 | Blue | Dev dependency |
| 🔗 | Purple | Peer dependency |
| ⎇ | Gray | Transitive dependency |
| ⤷ | Yellow | Nested (version conflict) |

## Requirements

- VS Code 1.100.0 or higher
- A project with `node_modules`

## Extension Settings

This extension contributes the following settings:

- `nodeModulesInspector.primaryRegistry`: Configure a primary npm registry for "Open in npm" (falls back to npmjs.com)

### Configuring a Custom Registry

For internal/private registries (like Artifactory, Verdaccio, or Nexus), add to your VS Code **User Settings** (so it applies to all projects):

```json
{
  "nodeModulesInspector.primaryRegistry": {
    "name": "Internal Registry",
    "urlPattern": "https://npm.mycompany.com/package/{package}/"
  }
}
```

> **Note:** When you right-click a package and select "Open in npm Registry", your primary registry is listed first, with npmjs.com as a fallback. This is useful if your internal registry mirrors public packages - you can check your internal registry first, then fall back to npmjs.com if needed.

**URL Pattern placeholders:**
- `{package}`: Full package name (e.g., `@scope/name` or `lodash`)
- `{scope}`: Just the scope (e.g., `@scope`)
- `{name}`: Just the package name without scope (e.g., `name`)

### Commands

- `nodeModulesVersions.refresh`: Refresh the package list
- `nodeModulesVersions.search`: Search packages
- `nodeModulesVersions.openInNpm`: Open package in npm registry

## Known Issues

None yet! Please report issues on GitHub.

## Release Notes

### 1.0.0

Initial release:
- Package grouping by name
- Dependency type detection (direct/dev/peer/transitive)
- Location type detection (hoisted/nested/workspace)
- Multi-root workspace support
- Search functionality
- Click to open package.json

## Contributing

Contributions welcome! Please open an issue or PR on GitHub.

## License

MIT
