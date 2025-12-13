import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

interface PackageJson {
  version?: string;
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

// Enums for package classification
enum DependencyType {
  Direct = 'direct',
  Dev = 'dev',
  Peer = 'peer',
  Transitive = 'transitive'
}

enum LocationType {
  Hoisted = 'hoisted',
  Nested = 'nested',
  Workspace = 'workspace'
}

// Icon and color mappings
const DEPENDENCY_TYPE_INFO: Record<DependencyType, { icon: string; color?: string; label: string; description: string }> = {
  [DependencyType.Direct]: {
    icon: 'arrow-right',
    color: 'charts.green',
    label: 'Direct',
    description: 'Listed in dependencies'
  },
  [DependencyType.Dev]: {
    icon: 'tools',
    color: 'charts.blue',
    label: 'Dev',
    description: 'Listed in devDependencies'
  },
  [DependencyType.Peer]: {
    icon: 'link',
    color: 'charts.purple',
    label: 'Peer',
    description: 'Listed in peerDependencies'
  },
  [DependencyType.Transitive]: {
    icon: 'git-merge',
    color: 'charts.gray',
    label: 'Transitive',
    description: 'Installed as a dependency of another package'
  }
};

const LOCATION_TYPE_INFO: Record<LocationType, { icon: string; color?: string; label: string; description: string }> = {
  [LocationType.Hoisted]: {
    icon: 'arrow-up',
    label: 'Hoisted',
    description: 'Hoisted to top-level node_modules'
  },
  [LocationType.Nested]: {
    icon: 'indent',
    color: 'charts.yellow',
    label: 'Nested',
    description: 'Nested inside another package (version conflict)'
  },
  [LocationType.Workspace]: {
    icon: 'folder-library',
    color: 'charts.orange',
    label: 'Workspace',
    description: 'In a workspace/monorepo sub-package'
  }
};

interface PackageInstance {
  version: string;
  packagePath: string;
  resolvedAt: string;
  dependencyType: DependencyType;
  locationType: LocationType;
  requiredBy?: string; // For transitive deps, which package requires this
}

type TreeItem = PackageGroupItem | PackageInstanceItem;

// Top-level item: groups all instances of a package by name
class PackageGroupItem extends vscode.TreeItem {
  readonly type = 'group' as const;

  constructor(
    public readonly packageName: string,
    public readonly instances: PackageInstance[],
    public readonly workspaceRoot: string
  ) {
    const hasMultiple = instances.length > 1;
    const hasMultipleVersions = new Set(instances.map(i => i.version)).size > 1;

    super(packageName, hasMultiple
      ? vscode.TreeItemCollapsibleState.Collapsed
      : vscode.TreeItemCollapsibleState.None
    );

    // Show version(s) in description
    const versions = [...new Set(instances.map(i => i.version))];
    if (versions.length === 1) {
      this.description = `[${versions[0]}]`;
      if (instances.length > 1) {
        this.description += ` (${instances.length} locations)`;
      }
    } else {
      this.description = `[${versions.join(', ')}] (${instances.length} locations)`;
    }

    this.contextValue = hasMultiple ? 'packageGroup' : 'nodeModule';

    // Choose icon based on primary instance characteristics
    const primaryInstance = instances[0];
    if (hasMultipleVersions) {
      this.iconPath = new vscode.ThemeIcon('versions', new vscode.ThemeColor('charts.yellow'));
    } else if (primaryInstance.dependencyType === DependencyType.Direct) {
      this.iconPath = new vscode.ThemeIcon('package', new vscode.ThemeColor('charts.green'));
    } else if (primaryInstance.dependencyType === DependencyType.Dev) {
      this.iconPath = new vscode.ThemeIcon('package', new vscode.ThemeColor('charts.blue'));
    } else {
      this.iconPath = new vscode.ThemeIcon('package');
    }

    // Build tooltip
    const tooltipLines = [`${packageName}`, ''];
    for (const inst of instances) {
      const depInfo = DEPENDENCY_TYPE_INFO[inst.dependencyType];
      const locInfo = LOCATION_TYPE_INFO[inst.locationType];
      tooltipLines.push(`v${inst.version} @ ${inst.resolvedAt}`);
      tooltipLines.push(`  ${depInfo.label} | ${locInfo.label}`);
      if (inst.requiredBy) {
        tooltipLines.push(`  Required by: ${inst.requiredBy}`);
      }
      tooltipLines.push('');
    }
    this.tooltip = tooltipLines.join('\n');

    if (!hasMultiple) {
      this.command = {
        command: 'nodeModulesVersions.openPackageJson',
        title: 'Open package.json',
        arguments: [new PackageInstanceItem(instances[0], workspaceRoot)]
      };
    }
  }
}

// Child item: a specific resolved instance of a package
class PackageInstanceItem extends vscode.TreeItem {
  readonly type = 'instance' as const;

  constructor(
    public readonly instance: PackageInstance,
    public readonly workspaceRoot: string
  ) {
    super(instance.resolvedAt, vscode.TreeItemCollapsibleState.None);
    this.description = `[${instance.version}]`;
    this.contextValue = 'nodeModule';

    // Build rich tooltip with all metadata
    const depInfo = DEPENDENCY_TYPE_INFO[instance.dependencyType];
    const locInfo = LOCATION_TYPE_INFO[instance.locationType];

    const tooltipMd = new vscode.MarkdownString();
    tooltipMd.appendMarkdown(`**${instance.resolvedAt}** \`v${instance.version}\`\n\n`);
    tooltipMd.appendMarkdown(`---\n\n`);
    tooltipMd.appendMarkdown(`$(${depInfo.icon}) **${depInfo.label}**: ${depInfo.description}\n\n`);
    tooltipMd.appendMarkdown(`$(${locInfo.icon}) **${locInfo.label}**: ${locInfo.description}\n\n`);
    if (instance.requiredBy) {
      tooltipMd.appendMarkdown(`$(git-commit) **Required by**: \`${instance.requiredBy}\`\n\n`);
    }
    tooltipMd.appendMarkdown(`---\n\n`);
    tooltipMd.appendMarkdown(`*Click to open package.json*`);
    tooltipMd.supportThemeIcons = true;
    this.tooltip = tooltipMd;

    // Choose icon based on dependency type and location
    const iconId = this.getIconForInstance(instance);
    const color = this.getColorForInstance(instance);
    this.iconPath = color
      ? new vscode.ThemeIcon(iconId, new vscode.ThemeColor(color))
      : new vscode.ThemeIcon(iconId);

    this.command = {
      command: 'nodeModulesVersions.openPackageJson',
      title: 'Open package.json',
      arguments: [this]
    };
  }

  private getIconForInstance(instance: PackageInstance): string {
    // Priority: location type issues first, then dependency type
    if (instance.locationType === LocationType.Nested) {
      return 'indent'; // Nested = potential issue
    }
    return DEPENDENCY_TYPE_INFO[instance.dependencyType].icon;
  }

  private getColorForInstance(instance: PackageInstance): string | undefined {
    if (instance.locationType === LocationType.Nested) {
      return 'charts.yellow'; // Highlight nested as warning
    }
    return DEPENDENCY_TYPE_INFO[instance.dependencyType].color;
  }

  get packagePath(): string {
    return this.instance.packagePath;
  }
}

// Cache for package.json contents
interface PackageJsonCache {
  [path: string]: PackageJson;
}

class NodeModulesProvider implements vscode.TreeDataProvider<TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
  private packageGroups: Map<string, PackageInstance[]> = new Map();
  private workspaceRoot: string = '';
  private packageJsonCache: PackageJsonCache = {};
  private directDeps: Set<string> = new Set();
  private devDeps: Set<string> = new Set();
  private peerDeps: Set<string> = new Set();

  refresh(): void {
    this.packageGroups.clear();
    this.packageJsonCache = {};
    this.directDeps.clear();
    this.devDeps.clear();
    this.peerDeps.clear();
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TreeItem): vscode.TreeItem {
    return element;
  }

  getParent(element: TreeItem): TreeItem | undefined {
    if (element.type === 'instance') {
      for (const [name, instances] of this.packageGroups) {
        if (instances.some(i => i.packagePath === element.instance.packagePath)) {
          return new PackageGroupItem(name, instances, this.workspaceRoot);
        }
      }
    }
    return undefined;
  }

  async getChildren(element?: TreeItem): Promise<TreeItem[]> {
    if (!vscode.workspace.workspaceFolders) {
      return [];
    }

    if (element?.type === 'group') {
      return element.instances.map(inst =>
        new PackageInstanceItem(inst, element.workspaceRoot)
      );
    }

    if (!element) {
      return this.getPackageGroups();
    }

    return [];
  }

  private async getPackageGroups(): Promise<PackageGroupItem[]> {
    this.packageGroups.clear();
    this.directDeps.clear();
    this.devDeps.clear();
    this.peerDeps.clear();

    for (const workspaceFolder of vscode.workspace.workspaceFolders!) {
      this.workspaceRoot = workspaceFolder.uri.fsPath;

      // First, collect all direct dependencies from all package.json files
      await this.collectDirectDependencies(this.workspaceRoot);

      // Then scan all node_modules
      await this.scanAllNodeModules(this.workspaceRoot);
    }

    const groups: PackageGroupItem[] = [];
    const sortedNames = [...this.packageGroups.keys()].sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );

    for (const name of sortedNames) {
      const instances = this.packageGroups.get(name)!;
      groups.push(new PackageGroupItem(name, instances, this.workspaceRoot));
    }

    return groups;
  }

  private async collectDirectDependencies(root: string): Promise<void> {
    const collectFromDir = (dir: string, depth: number) => {
      if (depth > 5) return;

      const packageJsonPath = path.join(dir, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        try {
          const content = fs.readFileSync(packageJsonPath, 'utf-8');
          const pkg: PackageJson = JSON.parse(content);
          this.packageJsonCache[packageJsonPath] = pkg;

          if (pkg.dependencies) {
            Object.keys(pkg.dependencies).forEach(dep => this.directDeps.add(dep));
          }
          if (pkg.devDependencies) {
            Object.keys(pkg.devDependencies).forEach(dep => this.devDeps.add(dep));
          }
          if (pkg.peerDependencies) {
            Object.keys(pkg.peerDependencies).forEach(dep => this.peerDeps.add(dep));
          }
        } catch {
          // Ignore
        }
      }

      // Scan subdirectories for workspace packages
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          if (entry.name === 'node_modules' || entry.name === '.git' ||
              entry.name === 'dist' || entry.name === 'build') continue;

          collectFromDir(path.join(dir, entry.name), depth + 1);
        }
      } catch {
        // Ignore
      }
    };

    collectFromDir(root, 0);
  }

  private async scanAllNodeModules(root: string): Promise<void> {
    const scan = (dir: string, depth: number, insideNodeModules: boolean, parentPackage?: string) => {
      if (depth > 15) return;

      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
          if (!entry.isDirectory()) continue;

          const fullPath = path.join(dir, entry.name);

          if (entry.name === 'node_modules') {
            this.scanNodeModulesDir(fullPath, root, parentPackage);
            scan(fullPath, depth + 1, true, parentPackage);
            continue;
          }

          if (insideNodeModules) {
            if (entry.name.startsWith('@')) {
              scan(fullPath, depth + 1, true, parentPackage);
            } else if (!entry.name.startsWith('.')) {
              // This is a package - scan for its nested node_modules
              scan(fullPath, depth + 1, true, entry.name);
            }
            continue;
          }

          if (entry.name === 'dist' || entry.name === 'build' || entry.name === '.git') {
            continue;
          }

          scan(fullPath, depth + 1, false, undefined);
        }
      } catch {
        // Ignore
      }
    };

    scan(root, 0, false, undefined);
  }

  private scanNodeModulesDir(nodeModulesPath: string, root: string, parentPackage?: string): void {
    try {
      const entries = fs.readdirSync(nodeModulesPath, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        if (entry.name.startsWith('@')) {
          const scopePath = path.join(nodeModulesPath, entry.name);
          try {
            const scopedEntries = fs.readdirSync(scopePath, { withFileTypes: true });
            for (const scopedEntry of scopedEntries) {
              if (!scopedEntry.isDirectory()) continue;

              const packageName = `${entry.name}/${scopedEntry.name}`;
              const packagePath = path.join(scopePath, scopedEntry.name);
              this.addPackageInstance(packageName, packagePath, root, parentPackage);
            }
          } catch {
            // Ignore
          }
        } else if (!entry.name.startsWith('.')) {
          const packagePath = path.join(nodeModulesPath, entry.name);
          this.addPackageInstance(entry.name, packagePath, root, parentPackage);
        }
      }
    } catch {
      // Ignore
    }
  }

  private addPackageInstance(packageName: string, packagePath: string, root: string, parentPackage?: string): void {
    const version = this.getPackageVersion(packagePath);
    if (!version) return;

    const relativePath = path.relative(root, packagePath);
    const resolvedAt = this.formatResolvedPath(relativePath);

    // Determine dependency type
    let dependencyType: DependencyType;
    if (this.directDeps.has(packageName)) {
      dependencyType = DependencyType.Direct;
    } else if (this.devDeps.has(packageName)) {
      dependencyType = DependencyType.Dev;
    } else if (this.peerDeps.has(packageName)) {
      dependencyType = DependencyType.Peer;
    } else {
      dependencyType = DependencyType.Transitive;
    }

    // Determine location type
    let locationType: LocationType;
    const nodeModulesCount = (relativePath.match(/node_modules/g) || []).length;

    if (nodeModulesCount > 1) {
      locationType = LocationType.Nested;
    } else if (relativePath.startsWith('node_modules/')) {
      locationType = LocationType.Hoisted;
    } else {
      locationType = LocationType.Workspace;
    }

    const instance: PackageInstance = {
      version,
      packagePath,
      resolvedAt,
      dependencyType,
      locationType,
      requiredBy: locationType === LocationType.Nested ? parentPackage : undefined
    };

    if (!this.packageGroups.has(packageName)) {
      this.packageGroups.set(packageName, []);
    }
    this.packageGroups.get(packageName)!.push(instance);
  }

  private formatResolvedPath(relativePath: string): string {
    const parts = relativePath.split('/node_modules/');
    if (parts.length === 1) {
      return relativePath;
    }

    const segments: string[] = [];

    if (parts[0] === '') {
      segments.push('root');
    } else {
      segments.push(parts[0]);
    }

    for (let i = 1; i < parts.length - 1; i++) {
      segments.push(parts[i]);
    }

    return segments.join(' → ');
  }

  private getPackageVersion(packagePath: string): string | null {
    const packageJsonPath = path.join(packagePath, 'package.json');

    try {
      if (fs.existsSync(packageJsonPath)) {
        const content = fs.readFileSync(packageJsonPath, 'utf-8');
        const pkg: PackageJson = JSON.parse(content);
        return pkg.version || null;
      }
    } catch {
      // Ignore
    }

    return null;
  }

  async getAllPackages(): Promise<{label: string; version: string; packagePath: string; packageName: string; instance: PackageInstance}[]> {
    await this.getPackageGroups();

    const results: {label: string; version: string; packagePath: string; packageName: string; instance: PackageInstance}[] = [];

    for (const [name, instances] of this.packageGroups) {
      for (const inst of instances) {
        results.push({
          label: `${name} @ ${inst.resolvedAt}`,
          version: inst.version,
          packagePath: inst.packagePath,
          packageName: name,
          instance: inst
        });
      }
    }

    return results.sort((a, b) => a.label.localeCompare(b.label));
  }

  getPackageGroup(packageName: string): PackageGroupItem | undefined {
    const instances = this.packageGroups.get(packageName);
    if (instances) {
      return new PackageGroupItem(packageName, instances, this.workspaceRoot);
    }
    return undefined;
  }

  createInstanceItem(instance: PackageInstance): PackageInstanceItem {
    return new PackageInstanceItem(instance, this.workspaceRoot);
  }
}

export function activate(context: vscode.ExtensionContext) {
  const nodeModulesProvider = new NodeModulesProvider();

  const treeView = vscode.window.createTreeView('nodeModulesVersions', {
    treeDataProvider: nodeModulesProvider,
    showCollapseAll: true
  });
  context.subscriptions.push(treeView);

  const refreshCommand = vscode.commands.registerCommand('nodeModulesVersions.refresh', () => {
    nodeModulesProvider.refresh();
  });
  context.subscriptions.push(refreshCommand);

  const searchCommand = vscode.commands.registerCommand('nodeModulesVersions.search', async () => {
    const allPackages = await nodeModulesProvider.getAllPackages();

    const picked = await vscode.window.showQuickPick(
      allPackages.map(pkg => {
        const depInfo = DEPENDENCY_TYPE_INFO[pkg.instance.dependencyType];
        return {
          label: `$(${depInfo.icon}) ${pkg.label}`,
          description: `[${pkg.version}]`,
          detail: `${depInfo.label} | ${pkg.packagePath}`,
          pkg
        };
      }),
      {
        placeHolder: 'Search packages...',
        matchOnDescription: true,
        matchOnDetail: true
      }
    );

    if (picked) {
      const packageJsonPath = path.join(picked.pkg.packagePath, 'package.json');
      const uri = vscode.Uri.file(packageJsonPath);
      const doc = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(doc);

      await vscode.commands.executeCommand('revealInExplorer', uri);

      const group = nodeModulesProvider.getPackageGroup(picked.pkg.packageName);
      if (group) {
        if (group.collapsibleState === vscode.TreeItemCollapsibleState.None) {
          await treeView.reveal(group, { select: true, focus: true, expand: true });
        } else {
          const instanceItem = nodeModulesProvider.createInstanceItem(picked.pkg.instance);
          await treeView.reveal(instanceItem, { select: true, focus: true, expand: true });
        }
      }
    }
  });
  context.subscriptions.push(searchCommand);

  const openPackageJsonCommand = vscode.commands.registerCommand(
    'nodeModulesVersions.openPackageJson',
    async (item: PackageInstanceItem) => {
      const packageJsonPath = path.join(item.packagePath, 'package.json');
      const uri = vscode.Uri.file(packageJsonPath);
      const doc = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(doc);
      await vscode.commands.executeCommand('revealInExplorer', uri);
    }
  );
  context.subscriptions.push(openPackageJsonCommand);

  const revealCommand = vscode.commands.registerCommand(
    'nodeModulesVersions.revealInExplorer',
    async (item: PackageInstanceItem) => {
      const uri = vscode.Uri.file(item.packagePath);
      await vscode.commands.executeCommand('revealInExplorer', uri);
    }
  );
  context.subscriptions.push(revealCommand);

  const watcher = vscode.workspace.createFileSystemWatcher('**/node_modules/**/package.json');
  watcher.onDidChange(() => nodeModulesProvider.refresh());
  watcher.onDidCreate(() => nodeModulesProvider.refresh());
  watcher.onDidDelete(() => nodeModulesProvider.refresh());
  context.subscriptions.push(watcher);
}

export function deactivate() {}
