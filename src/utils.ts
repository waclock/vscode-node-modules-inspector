import { DependencyType, LocationType } from './types';

/**
 * Builds a registry URL from a pattern and package name
 */
export function buildRegistryUrl(packageName: string, urlPattern: string): string {
  if (packageName.startsWith('@')) {
    const [scope, name] = packageName.split('/');
    return urlPattern
      .replace(/{package}/g, encodeURIComponent(packageName))
      .replace(/{scope}/g, encodeURIComponent(scope))
      .replace(/{name}/g, encodeURIComponent(name));
  }
  return urlPattern
    .replace(/{package}/g, encodeURIComponent(packageName))
    .replace(/{scope}/g, '')
    .replace(/{name}/g, encodeURIComponent(packageName));
}

/**
 * Determines the dependency type based on which set contains the package
 */
export function getDependencyType(
  packageName: string,
  directDeps: Set<string>,
  devDeps: Set<string>,
  peerDeps: Set<string>
): DependencyType {
  if (directDeps.has(packageName)) return DependencyType.Direct;
  if (devDeps.has(packageName)) return DependencyType.Dev;
  if (peerDeps.has(packageName)) return DependencyType.Peer;
  return DependencyType.Transitive;
}

/**
 * Determines the location type based on the relative path
 */
export function getLocationType(relativePath: string): LocationType {
  const nodeModulesCount = (relativePath.match(/node_modules/g) || []).length;

  if (nodeModulesCount > 1) return LocationType.Nested;
  if (relativePath.startsWith('node_modules/')) return LocationType.Hoisted;
  return LocationType.Workspace;
}

/**
 * Formats a relative path to a human-readable resolved location
 * e.g., "node_modules/lodash" -> "root"
 * e.g., "packages/app/node_modules/lodash" -> "packages/app"
 * e.g., "node_modules/foo/node_modules/bar" -> "root → foo"
 */
export function formatResolvedPath(relativePath: string): string {
  const parts = relativePath.split('/node_modules/');
  if (parts.length === 1) return relativePath;

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

/**
 * Extracts package name from a node_modules path
 * Handles both scoped (@org/pkg) and regular packages
 */
export function extractPackageNameFromPath(packagePath: string): string | undefined {
  const pathParts = packagePath.split('/node_modules/');
  if (pathParts.length > 0) {
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart.startsWith('@')) {
      const parts = lastPart.split('/');
      if (parts.length >= 2) {
        return `${parts[0]}/${parts[1]}`;
      }
    }
    return lastPart.split('/')[0];
  }
  return undefined;
}

/**
 * Gets unique versions from an array of version strings
 */
export function getUniqueVersions(versions: string[]): string[] {
  return [...new Set(versions)];
}

/**
 * Checks if there's a version conflict (multiple different versions)
 */
export function hasVersionConflict(versions: string[]): boolean {
  return getUniqueVersions(versions).length > 1;
}

/**
 * Builds a description string for version display
 * @param versions Array of version strings
 * @param locationCount Number of locations where the package is installed
 * @param hasConflict Whether there's a version conflict
 */
export function buildVersionDescription(
  versions: string[],
  locationCount: number,
  hasConflict: boolean
): string {
  const uniqueVersions = getUniqueVersions(versions);

  if (uniqueVersions.length === 1) {
    let desc = `[${uniqueVersions[0]}]`;
    if (locationCount > 1) {
      desc += ` (${locationCount} locations)`;
    }
    return desc;
  }

  // Version conflict - show warning indicator
  return `⚠ [${uniqueVersions.join(' ↔ ')}]`;
}
