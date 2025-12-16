import * as vscode from 'vscode';
import { PackageInstance, DependencyType, LocationType } from './types';
import { DEPENDENCY_TYPE_INFO, LOCATION_TYPE_INFO, MODULE_TYPE_INFO } from './constants';
import { getUniqueVersions, hasVersionConflict as checkVersionConflict, buildVersionDescription, formatBytes } from './utils';

export type TreeItem = PackageGroupItem | PackageInstanceItem;

export class PackageGroupItem extends vscode.TreeItem {
  readonly type = 'group' as const;

  public readonly hasVersionConflict: boolean;

  constructor(
    public readonly packageName: string,
    public readonly instances: PackageInstance[],
    public readonly workspaceRoot: string
  ) {
    const hasMultiple = instances.length > 1;
    const versions = instances.map(i => i.version);
    const hasConflict = checkVersionConflict(versions);

    super(packageName, hasMultiple
      ? vscode.TreeItemCollapsibleState.Collapsed
      : vscode.TreeItemCollapsibleState.None
    );

    this.hasVersionConflict = hasConflict;
    this.description = this.buildDescription(instances, hasConflict);
    this.contextValue = this.buildContextValue(hasMultiple, hasConflict);
    this.iconPath = this.buildIcon(instances, hasConflict);
    this.tooltip = this.buildTooltip(packageName, instances, hasConflict);

    if (!hasMultiple) {
      this.command = {
        command: 'nodeModulesVersions.openPackageJson',
        title: 'Show Source',
        arguments: [new PackageInstanceItem(instances[0], workspaceRoot)]
      };
    }
  }

  private buildDescription(instances: PackageInstance[], hasConflict: boolean): string {
    const versions = getUniqueVersions(instances.map(i => i.version));

    if (versions.length === 1) {
      if (instances.length > 1) {
        return `${versions[0]} (${instances.length})`;
      }
      return versions[0];
    }

    return `${versions.join(', ')} (${instances.length})`;
  }

  private buildContextValue(hasMultiple: boolean, hasVersionConflict: boolean): string {
    if (hasVersionConflict) {
      return 'packageGroupConflict';
    }
    return hasMultiple ? 'packageGroup' : 'nodeModule';
  }

  private buildIcon(instances: PackageInstance[], hasVersionConflict: boolean): vscode.ThemeIcon {
    const primaryInstance = instances[0];
    if (hasVersionConflict) {
      // Subtle indicator for multiple versions (not a warning - this is normal with deduping)
      return new vscode.ThemeIcon('versions', new vscode.ThemeColor('charts.yellow'));
    } else if (primaryInstance.dependencyType === DependencyType.Direct) {
      return new vscode.ThemeIcon('package', new vscode.ThemeColor('charts.green'));
    } else if (primaryInstance.dependencyType === DependencyType.Dev) {
      return new vscode.ThemeIcon('package', new vscode.ThemeColor('charts.blue'));
    }
    return new vscode.ThemeIcon('package');
  }

  private buildTooltip(packageName: string, instances: PackageInstance[], hasVersionConflict: boolean): string {
    const lines = [packageName];

    // Calculate total size across all instances
    const totalSize = instances.reduce((sum, inst) => sum + (inst.size || 0), 0);
    if (totalSize > 0) {
      lines.push(`Total size: ${formatBytes(totalSize)}`);
    }

    if (hasVersionConflict) {
      const versions = getUniqueVersions(instances.map(i => i.version));
      lines.push(`${versions.length} versions installed`);
    }

    lines.push('');
    for (const inst of instances) {
      const depInfo = DEPENDENCY_TYPE_INFO[inst.dependencyType];
      const locInfo = LOCATION_TYPE_INFO[inst.locationType];
      const modInfo = MODULE_TYPE_INFO[inst.moduleType];
      const sizeStr = inst.size ? ` (${formatBytes(inst.size)})` : '';
      lines.push(`v${inst.version}${sizeStr} @ ${inst.resolvedAt}`);
      lines.push(`  ${depInfo.label} | ${locInfo.label} | ${modInfo.label}`);
      if (inst.requiredBy) {
        lines.push(`  Required by: ${inst.requiredBy}`);
      }
      lines.push('');
    }
    return lines.join('\n');
  }
}

export class PackageInstanceItem extends vscode.TreeItem {
  readonly type = 'instance' as const;

  constructor(
    public readonly instance: PackageInstance,
    public readonly workspaceRoot: string
  ) {
    super(instance.resolvedAt, vscode.TreeItemCollapsibleState.None);
    this.description = this.buildDescription(instance);
    this.contextValue = 'nodeModule';
    this.tooltip = this.buildTooltip(instance);
    this.iconPath = this.buildIcon(instance);

    this.command = {
      command: 'nodeModulesVersions.openPackageJson',
      title: 'Show Source',
      arguments: [this]
    };
  }

  private buildDescription(instance: PackageInstance): string {
    const modInfo = MODULE_TYPE_INFO[instance.moduleType];
    const sizeStr = instance.size ? ` • ${formatBytes(instance.size)}` : '';
    return `${instance.version} • ${modInfo.label}${sizeStr}`;
  }

  private buildTooltip(instance: PackageInstance): vscode.MarkdownString {
    const depInfo = DEPENDENCY_TYPE_INFO[instance.dependencyType];
    const locInfo = LOCATION_TYPE_INFO[instance.locationType];
    const modInfo = MODULE_TYPE_INFO[instance.moduleType];

    const tooltip = new vscode.MarkdownString();
    tooltip.appendMarkdown(`**${instance.resolvedAt}** \`v${instance.version}\`\n\n`);
    if (instance.size) {
      tooltip.appendMarkdown(`$(package) **Size**: ${formatBytes(instance.size)}\n\n`);
    }
    tooltip.appendMarkdown(`---\n\n`);
    tooltip.appendMarkdown(`$(${depInfo.icon}) **${depInfo.label}**: ${depInfo.description}\n\n`);
    tooltip.appendMarkdown(`$(${locInfo.icon}) **${locInfo.label}**: ${locInfo.description}\n\n`);
    tooltip.appendMarkdown(`$(${modInfo.icon}) **${modInfo.label}**: ${modInfo.description}\n\n`);
    if (instance.requiredBy) {
      tooltip.appendMarkdown(`$(git-commit) **Required by**: \`${instance.requiredBy}\`\n\n`);
    }
    tooltip.appendMarkdown(`---\n\n`);
    tooltip.appendMarkdown(`*Click to view source*`);
    tooltip.supportThemeIcons = true;
    return tooltip;
  }

  private buildIcon(instance: PackageInstance): vscode.ThemeIcon {
    const iconId = instance.locationType === LocationType.Nested
      ? 'indent'
      : DEPENDENCY_TYPE_INFO[instance.dependencyType].icon;

    const color = instance.locationType === LocationType.Nested
      ? 'charts.yellow'
      : DEPENDENCY_TYPE_INFO[instance.dependencyType].color;

    return color
      ? new vscode.ThemeIcon(iconId, new vscode.ThemeColor(color))
      : new vscode.ThemeIcon(iconId);
  }

  get packagePath(): string {
    return this.instance.packagePath;
  }
}
