import * as vscode from 'vscode';
import { PrimaryRegistry, RegistryUrl } from './types';
import { PackageInstanceItem } from './treeItems';
import { extractPackageNameFromPath, buildRegistryUrl } from './utils';

export { buildRegistryUrl };

export function getPackageNameFromInstance(item: PackageInstanceItem): string | undefined {
  return extractPackageNameFromPath(item.instance.packagePath);
}

export function getRegistryUrls(packageName: string): RegistryUrl[] {
  const config = vscode.workspace.getConfiguration('nodeModulesInspector');
  const primaryRegistry = config.get<PrimaryRegistry | null>('primaryRegistry', null);

  const urls: RegistryUrl[] = [];

  if (primaryRegistry?.name && primaryRegistry?.urlPattern) {
    urls.push({
      name: primaryRegistry.name,
      url: buildRegistryUrl(packageName, primaryRegistry.urlPattern)
    });
  }

  urls.push({
    name: 'npmjs.com',
    url: `https://www.npmjs.com/package/${encodeURIComponent(packageName)}`
  });

  return urls;
}
