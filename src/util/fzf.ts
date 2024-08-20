import * as vscode from 'vscode';
import { IFzfCallbackResult, IFzfOptions } from './interfaces/fzf.interface';
import { exec } from 'child_process';

export default class Fzf {
  constructor() { }

  private getOsPath(): string {
    const extension = vscode.extensions.getExtension('boivn.mobio-fuzzy-search');
    const extensionPath = extension ? extension.extensionPath : '';
    const os = process.platform;

    switch (os) {
      case 'win32':
        return `${extensionPath}/binaries/windows`;
      case 'darwin':
        return `${extensionPath}/binaries/mac`;
      default:
        return `${extensionPath}/binaries/linux`;
    }
  }

  private getFdPath(): string {
    switch (process.platform) {
      case 'win32':
        return `${this.getOsPath()}/fd/fd.exe`;
      default:
        return `${this.getOsPath()}/fd/fd`;
    }
  }

  private getFzfPath(): string {
    switch (process.platform) {
      case 'win32':
        return `${this.getOsPath()}/fzf/fzf.exe`;
      default:
        return `${this.getOsPath()}/fzf/fzf`;
    }
  }

  private commandFzf(search: string, options: Partial<IFzfOptions>): string {
    const _search = search ? search.replace(/::/g, '').toLowerCase() : '';
    const pathSpace = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0].uri.path;
    const fdPath = this.getFdPath();
    const fzfPath = this.getFzfPath();
    const { max_depth } = options || {};
    const config = vscode.workspace.getConfiguration('fuzzySearch');
    const excludeFolders: string[] = config.get('excludeFolders') || [];

    if (max_depth) {
      return `${fdPath} --type f --hidden --follow --exclude .git --exclude node_modules --max-depth ${max_depth} . ${pathSpace || ''} | ${fzfPath} --tiebreak=end -m -f '${_search}'\n`;
    }

    const excludesList = excludeFolders.length ? excludeFolders.map((excludeFolder) => `--exclude ${excludeFolder}`).join(' ') : '--exclude .git --exclude node_modules';
    return `${fdPath} --type f --hidden --follow ${excludesList} . ${pathSpace || ''} | ${fzfPath} --tiebreak=end -m -f '${_search}'\n`;
  }

  private onResultData(callback: IFzfCallbackResult): (data: string) => void {
    return (data: string) => {
      const filePaths = data.toString().split('\n').filter((filePath: string) => filePath.trim() !== '').slice(0, 10);
      callback(filePaths);
    };
  }

  public searchFzf(search: string, callback: IFzfCallbackResult, options: Partial<IFzfOptions> = {}): void {
    const command = this.commandFzf(search, options);
    exec(command, (error: any, stdout: any, stderr: any) => {
      if (error || stderr) {
        return this.onResultData(callback)('');
      }

      this.onResultData(callback)(stdout);
    });
  }

  public checkFileExist(filePath: string, options: Partial<IFzfOptions> = {}): Promise<boolean> {
    const command = this.commandFzf(filePath, options);
    return new Promise((resolve) => {
      exec(command, (error, stdout, stderr) => {
        if (error || stderr) {
          return resolve(false);
        }
        return resolve(stdout.toString().trim() !== '');
      });
    });
  }
}
