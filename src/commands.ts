import * as vscode from 'vscode';
import * as path from 'path';
import { NodeModulesProvider } from './provider';
import { PackageGroupItem, PackageInstanceItem } from './treeItems';
import { DEPENDENCY_TYPE_INFO } from './constants';
import { getPackageNameFromInstance, getRegistryUrls } from './registry';

export function registerCommands(
  context: vscode.ExtensionContext,
  provider: NodeModulesProvider,
  treeView: vscode.TreeView<PackageGroupItem | PackageInstanceItem>
): void {
  // Refresh command
  context.subscriptions.push(
    vscode.commands.registerCommand('nodeModulesVersions.refresh', () => {
      provider.refresh();
    })
  );

  // Search command
  context.subscriptions.push(
    vscode.commands.registerCommand('nodeModulesVersions.search', async () => {
      const allPackages = await provider.getAllPackages();

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

        const group = provider.getPackageGroup(picked.pkg.packageName);
        if (group) {
          if (group.collapsibleState === vscode.TreeItemCollapsibleState.None) {
            await treeView.reveal(group, { select: true, focus: true, expand: true });
          } else {
            const instanceItem = provider.createInstanceItem(picked.pkg.instance);
            await treeView.reveal(instanceItem, { select: true, focus: true, expand: true });
          }
        }
      }
    })
  );

  // Open package.json command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'nodeModulesVersions.openPackageJson',
      async (item: PackageInstanceItem) => {
        const packageJsonPath = path.join(item.packagePath, 'package.json');
        const uri = vscode.Uri.file(packageJsonPath);
        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc);
        await vscode.commands.executeCommand('revealInExplorer', uri);
      }
    )
  );

  // Reveal in explorer command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'nodeModulesVersions.revealInExplorer',
      async (item: PackageInstanceItem) => {
        const uri = vscode.Uri.file(item.packagePath);
        await vscode.commands.executeCommand('revealInExplorer', uri);
      }
    )
  );

  // Open in npm registry command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'nodeModulesVersions.openInNpm',
      async (item: PackageGroupItem | PackageInstanceItem) => {
        const packageName = item.type === 'group' ? item.packageName : getPackageNameFromInstance(item);
        if (!packageName) return;

        const urls = getRegistryUrls(packageName);

        if (urls.length === 0) {
          vscode.window.showWarningMessage(`No registry configured for package: ${packageName}`);
          return;
        }

        if (urls.length === 1) {
          vscode.env.openExternal(vscode.Uri.parse(urls[0].url));
        } else {
          const picked = await vscode.window.showQuickPick(
            urls.map(u => ({ label: u.name, url: u.url })),
            { placeHolder: `Open ${packageName} in...` }
          );
          if (picked) {
            vscode.env.openExternal(vscode.Uri.parse(picked.url));
          }
        }
      }
    )
  );

  // Toggle duplicates-only filter command
  context.subscriptions.push(
    vscode.commands.registerCommand('nodeModulesVersions.toggleDuplicatesOnly', () => {
      provider.toggleDuplicatesOnly();
      updateFilterContext(provider);
      const status = provider.showDuplicatesOnly ? 'ON' : 'OFF';
      vscode.window.showInformationMessage(`Duplicates only filter: ${status}`);
    })
  );

  // Clear all filters command
  context.subscriptions.push(
    vscode.commands.registerCommand('nodeModulesVersions.clearFilters', () => {
      provider.clearFilters();
      updateFilterContext(provider);
      vscode.window.showInformationMessage('All filters cleared');
    })
  );

  // Set initial context
  updateFilterContext(provider);
}

function updateFilterContext(provider: NodeModulesProvider): void {
  vscode.commands.executeCommand(
    'setContext',
    'nodeModulesInspector.hasActiveFilters',
    provider.hasActiveFilters()
  );
}
