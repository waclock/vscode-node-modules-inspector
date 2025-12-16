import { DependencyType, LocationType, ModuleType, PackageJson } from './types';
import * as fs from 'fs';
import * as path from 'path';

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

/**
 * Formats bytes into a human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), units.length - 1);

  const value = bytes / Math.pow(k, i);
  // Use 1 decimal for KB+, no decimals for bytes
  const formatted = i === 0 ? value.toString() : value.toFixed(1);

  return `${formatted} ${units[i]}`;
}

/**
 * Calculates the total size of a directory recursively
 * Returns size in bytes, or null if calculation fails
 */
export function calculateDirectorySize(dirPath: string): number | null {
  try {
    let totalSize = 0;

    const calculateSize = (currentPath: string): void => {
      const stats = fs.statSync(currentPath);

      if (stats.isFile()) {
        totalSize += stats.size;
      } else if (stats.isDirectory()) {
        const entries = fs.readdirSync(currentPath);
        for (const entry of entries) {
          calculateSize(path.join(currentPath, entry));
        }
      }
    };

    calculateSize(dirPath);
    return totalSize;
  } catch {
    return null;
  }
}

/**
 * Simple glob pattern matching for package names
 * Supports * as wildcard
 */
export function matchesGlobPattern(packageName: string, pattern: string): boolean {
  // Convert glob pattern to regex
  const regexPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars except *
    .replace(/\*/g, '.*'); // Convert * to .*

  const regex = new RegExp(`^${regexPattern}$`, 'i');
  return regex.test(packageName);
}

/**
 * Checks if a package name matches any of the given exclude patterns
 */
export function isPackageExcluded(packageName: string, excludePatterns: string[]): boolean {
  return excludePatterns.some(pattern => matchesGlobPattern(packageName, pattern));
}

/**
 * Detects the module type of a package from its package.json
 * - ESM: type: "module" or has exports with .mjs
 * - CJS: type: "commonjs" or has main without module field
 * - Dual: has both ESM and CJS entry points
 * - Unknown: cannot determine
 */
export function detectModuleType(pkg: PackageJson): ModuleType {
  const hasTypeModule = pkg.type === 'module';
  const hasTypeCJS = pkg.type === 'commonjs';
  const hasModuleField = !!pkg.module;
  const hasMainField = !!pkg.main;
  const hasExports = !!pkg.exports;

  // Check exports field for dual support
  if (hasExports && typeof pkg.exports === 'object') {
    const exports = pkg.exports as Record<string, unknown>;
    const hasCJSExport = 'require' in exports ||
      (exports['.'] && typeof exports['.'] === 'object' && 'require' in (exports['.'] as Record<string, unknown>));
    const hasESMExport = 'import' in exports ||
      (exports['.'] && typeof exports['.'] === 'object' && 'import' in (exports['.'] as Record<string, unknown>));

    if (hasCJSExport && hasESMExport) {
      return ModuleType.Dual;
    }
    if (hasESMExport) {
      return ModuleType.ESM;
    }
    if (hasCJSExport) {
      return ModuleType.CJS;
    }
  }

  // Has both module (ESM) and main (CJS) fields
  if (hasModuleField && hasMainField) {
    return ModuleType.Dual;
  }

  // Explicit type field
  if (hasTypeModule) {
    return ModuleType.ESM;
  }

  if (hasTypeCJS || hasMainField) {
    return ModuleType.CJS;
  }

  return ModuleType.Unknown;
}
