# CLAUDE.md

## Project Overview

This is a VS Code extension called "Node Modules Inspector" that provides a tree view of node_modules with package metadata (versions, sizes, module types, dependency classification).

## Tech Stack

- **Language**: TypeScript
- **Platform**: VS Code Extension API
- **Testing**: Mocha
- **Build**: tsc (TypeScript compiler)
- **Packaging**: vsce (VS Code Extension Manager)

## Project Structure

```
src/
├── extension.ts      # Entry point (activate/deactivate)
├── provider.ts       # TreeDataProvider - scans node_modules
├── treeItems.ts      # TreeItem classes (PackageGroupItem, PackageInstanceItem)
├── commands.ts       # Command handlers (refresh, search, filter, etc.)
├── types.ts          # Interfaces and enums
├── constants.ts      # Icon/color mappings for dependency/location/module types
├── utils.ts          # Pure utility functions (testable without vscode)
├── registry.ts       # Registry URL logic
└── test/             # Unit tests
```

## Development Commands

```bash
npm run compile    # Compile TypeScript
npm run watch      # Watch mode
npm test           # Run tests
npm run package    # Create .vsix file
```

## Testing Locally

1. Run `npm run compile`
2. In VS Code: Cmd+Shift+P → "Developer: Reload Window"
3. Open a project with node_modules to see the extension

## Architecture Principles

- **Separation of concerns**: Keep vscode-dependent code in treeItems.ts/provider.ts/commands.ts, pure logic in utils.ts
- **Testability**: Extract pure functions to utils.ts so they can be tested without mocking vscode
- **DRY**: Use constants.ts for repeated icon/color/label mappings

## Adding New Features

1. Add types/enums to `types.ts`
2. Add display constants to `constants.ts`
3. Add pure logic to `utils.ts` with tests
4. Update `provider.ts` to collect new data
5. Update `treeItems.ts` to display it
6. Add commands to `commands.ts` if needed
7. Register in `package.json` (commands, settings, menus)

## Publishing

Publishing is automated via GitHub Actions on release:
- Creates a GitHub release → publishes to VS Code Marketplace + Open VSX

Manual publish:
```bash
npm run package
npx vsce publish
npx ovsx publish
```

## Important Rules

### Git Commits
- **NEVER mention Claude, AI, or any AI assistant in commit messages**
- **NEVER add Co-Authored-By lines referencing Claude or AI**
- **NEVER mention Claude in any code comments or documentation**
- Write commit messages as if a human developer wrote them

### Code Style
- No emojis in code unless explicitly requested
- Keep descriptions concise
- Use TypeScript strict mode patterns
- Prefer explicit types over `any`

### VS Code Extension Best Practices
- Minimize activation events (use `workspaceContains` not `*`)
- Dispose of subscriptions properly in `deactivate()`
- Use TreeDataProvider for sidebar views
- Use `vscode.ThemeIcon` and `vscode.ThemeColor` for consistent styling
- Register commands in package.json `contributes.commands`
- Use `when` clauses for context-aware menu items
