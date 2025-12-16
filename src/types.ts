export interface PackageJson {
  version?: string;
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  type?: 'module' | 'commonjs';
  exports?: Record<string, unknown> | string;
  main?: string;
  module?: string;
}

export enum ModuleType {
  ESM = 'esm',
  CJS = 'cjs',
  Dual = 'dual',
  Unknown = 'unknown'
}

export enum DependencyType {
  Direct = 'direct',
  Dev = 'dev',
  Peer = 'peer',
  Transitive = 'transitive'
}

export enum LocationType {
  Hoisted = 'hoisted',
  Nested = 'nested',
  Workspace = 'workspace'
}

export interface PackageInstance {
  version: string;
  packagePath: string;
  resolvedAt: string;
  dependencyType: DependencyType;
  locationType: LocationType;
  requiredBy?: string;
  size?: number; // Size in bytes
  moduleType: ModuleType;
}

export interface PackageJsonCache {
  [path: string]: PackageJson;
}

export interface PrimaryRegistry {
  name: string;
  urlPattern: string;
}

export interface RegistryUrl {
  name: string;
  url: string;
}

export interface PackageSearchResult {
  label: string;
  version: string;
  packagePath: string;
  packageName: string;
  instance: PackageInstance;
}
