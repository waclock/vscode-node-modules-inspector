import * as vscode from 'vscode';
import { NodeModulesProvider } from './provider';
import { registerCommands } from './commands';

export function activate(context: vscode.ExtensionContext) {
  const provider = new NodeModulesProvider();

  const treeView = vscode.window.createTreeView('nodeModulesVersions', {
    treeDataProvider: provider,
    showCollapseAll: true
  });
  context.subscriptions.push(treeView);

  registerCommands(context, provider, treeView);

  // Watch for changes in node_modules
  const watcher = vscode.workspace.createFileSystemWatcher('**/node_modules/**/package.json');
  watcher.onDidChange(() => provider.refresh());
  watcher.onDidCreate(() => provider.refresh());
  watcher.onDidDelete(() => provider.refresh());
  context.subscriptions.push(watcher);
}

export function deactivate() {}
