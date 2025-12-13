import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { PackageJson, PackageInstance, PackageJsonCache, LocationType, PackageSearchResult } from './types';
import { getDependencyType, getLocationType, formatResolvedPath } from './utils';
import { TreeItem, PackageGroupItem, PackageInstanceItem } from './treeItems';

export class NodeModulesProvider implements vscode.TreeDataProvider<TreeItem> {
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
      await this.collectDirectDependencies(this.workspaceRoot);
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
          // Ignore parse errors
        }
      }

      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          if (entry.name === 'node_modules' || entry.name === '.git' ||
              entry.name === 'dist' || entry.name === 'build') continue;

          collectFromDir(path.join(dir, entry.name), depth + 1);
        }
      } catch {
        // Ignore read errors
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
        // Ignore read errors
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
            // Ignore read errors
          }
        } else if (!entry.name.startsWith('.')) {
          const packagePath = path.join(nodeModulesPath, entry.name);
          this.addPackageInstance(entry.name, packagePath, root, parentPackage);
        }
      }
    } catch {
      // Ignore read errors
    }
  }

  private addPackageInstance(packageName: string, packagePath: string, root: string, parentPackage?: string): void {
    const version = this.getPackageVersion(packagePath);
    if (!version) return;

    const relativePath = path.relative(root, packagePath);
    const resolvedAt = formatResolvedPath(relativePath);
    const dependencyType = getDependencyType(packageName, this.directDeps, this.devDeps, this.peerDeps);
    const locationType = getLocationType(relativePath);

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

  private getPackageVersion(packagePath: string): string | null {
    const packageJsonPath = path.join(packagePath, 'package.json');

    try {
      if (fs.existsSync(packageJsonPath)) {
        const content = fs.readFileSync(packageJsonPath, 'utf-8');
        const pkg: PackageJson = JSON.parse(content);
        return pkg.version || null;
      }
    } catch {
      // Ignore read errors
    }

    return null;
  }

  async getAllPackages(): Promise<PackageSearchResult[]> {
    await this.getPackageGroups();

    const results: PackageSearchResult[] = [];

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
