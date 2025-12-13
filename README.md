# Node Modules Inspector

A VS Code extension that provides a powerful, organized view of your `node_modules` dependencies with version information, dependency classification, and smart grouping.

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

## Usage

1. Open a project with `node_modules`
2. Find the **"Node Modules"** panel in the Explorer sidebar
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

- VS Code 1.74.0 or higher
- A project with `node_modules`

## Extension Settings

This extension contributes the following commands:

- `nodeModulesVersions.refresh`: Refresh the package list
- `nodeModulesVersions.search`: Search packages

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
