import * as vscode from 'vscode';
import { PackageInstance, DependencyType, LocationType } from './types';
import { DEPENDENCY_TYPE_INFO, LOCATION_TYPE_INFO } from './constants';

export type TreeItem = PackageGroupItem | PackageInstanceItem;

export class PackageGroupItem extends vscode.TreeItem {
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

    this.description = this.buildDescription(instances, hasMultiple);
    this.contextValue = hasMultiple ? 'packageGroup' : 'nodeModule';
    this.iconPath = this.buildIcon(instances, hasMultipleVersions);
    this.tooltip = this.buildTooltip(packageName, instances);

    if (!hasMultiple) {
      this.command = {
        command: 'nodeModulesVersions.openPackageJson',
        title: 'Show Source',
        arguments: [new PackageInstanceItem(instances[0], workspaceRoot)]
      };
    }
  }

  private buildDescription(instances: PackageInstance[], hasMultiple: boolean): string {
    const versions = [...new Set(instances.map(i => i.version))];
    if (versions.length === 1) {
      let desc = `[${versions[0]}]`;
      if (hasMultiple) {
        desc += ` (${instances.length} locations)`;
      }
      return desc;
    }
    return `[${versions.join(', ')}] (${instances.length} locations)`;
  }

  private buildIcon(instances: PackageInstance[], hasMultipleVersions: boolean): vscode.ThemeIcon {
    const primaryInstance = instances[0];
    if (hasMultipleVersions) {
      return new vscode.ThemeIcon('versions', new vscode.ThemeColor('charts.yellow'));
    } else if (primaryInstance.dependencyType === DependencyType.Direct) {
      return new vscode.ThemeIcon('package', new vscode.ThemeColor('charts.green'));
    } else if (primaryInstance.dependencyType === DependencyType.Dev) {
      return new vscode.ThemeIcon('package', new vscode.ThemeColor('charts.blue'));
    }
    return new vscode.ThemeIcon('package');
  }

  private buildTooltip(packageName: string, instances: PackageInstance[]): string {
    const lines = [packageName, ''];
    for (const inst of instances) {
      const depInfo = DEPENDENCY_TYPE_INFO[inst.dependencyType];
      const locInfo = LOCATION_TYPE_INFO[inst.locationType];
      lines.push(`v${inst.version} @ ${inst.resolvedAt}`);
      lines.push(`  ${depInfo.label} | ${locInfo.label}`);
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
    this.description = `[${instance.version}]`;
    this.contextValue = 'nodeModule';
    this.tooltip = this.buildTooltip(instance);
    this.iconPath = this.buildIcon(instance);

    this.command = {
      command: 'nodeModulesVersions.openPackageJson',
      title: 'Open package.json',
      arguments: [this]
    };
  }

  private buildTooltip(instance: PackageInstance): vscode.MarkdownString {
    const depInfo = DEPENDENCY_TYPE_INFO[instance.dependencyType];
    const locInfo = LOCATION_TYPE_INFO[instance.locationType];

    const tooltip = new vscode.MarkdownString();
    tooltip.appendMarkdown(`**${instance.resolvedAt}** \`v${instance.version}\`\n\n`);
    tooltip.appendMarkdown(`---\n\n`);
    tooltip.appendMarkdown(`$(${depInfo.icon}) **${depInfo.label}**: ${depInfo.description}\n\n`);
    tooltip.appendMarkdown(`$(${locInfo.icon}) **${locInfo.label}**: ${locInfo.description}\n\n`);
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
