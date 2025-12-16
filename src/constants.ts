import { DependencyType, LocationType, ModuleType } from './types';

export interface TypeInfo {
  icon: string;
  color?: string;
  label: string;
  description: string;
}

export const DEPENDENCY_TYPE_INFO: Record<DependencyType, TypeInfo> = {
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

export const LOCATION_TYPE_INFO: Record<LocationType, TypeInfo> = {
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

export const MODULE_TYPE_INFO: Record<ModuleType, TypeInfo> = {
  [ModuleType.ESM]: {
    icon: 'symbol-module',
    color: 'charts.green',
    label: 'ESM',
    description: 'ECMAScript Module (import/export)'
  },
  [ModuleType.CJS]: {
    icon: 'symbol-namespace',
    color: 'charts.blue',
    label: 'CJS',
    description: 'CommonJS Module (require/module.exports)'
  },
  [ModuleType.Dual]: {
    icon: 'layers',
    color: 'charts.purple',
    label: 'ESM+CJS',
    description: 'Supports both ESM and CommonJS'
  },
  [ModuleType.Unknown]: {
    icon: 'question',
    label: 'Unknown',
    description: 'Module type could not be determined'
  }
};
