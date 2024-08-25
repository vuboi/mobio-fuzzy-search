import * as path from 'path';
import * as vscode from 'vscode';
import { getFileExtension, getFileName, getFileType } from './defines/file-type.define';
import Fzf from './fzf';
import { IFzfCallbackResult, IFzfOptions, IQuickPickItem } from './interfaces/fzf.interface';
import { IContributeIConThemes, IIConDefinitions } from './interfaces/package.interface';
import { getConfig } from './config';

export default class SearchFile {
  private fzf: Fzf;
  private iconThemeName: string | undefined;
  private iconThemePath: Record<string, IIConDefinitions> | undefined;

  constructor() {
    this.fzf = new Fzf();
    this.iconThemePath = this.getContentIconJson();
  }

  public searchFiles(search: string, callback: IFzfCallbackResult, options: Partial<IFzfOptions> = {}): void {
    this.fzf.searchFzf(search, this.onDataSearch(callback), options);
  }

  private onDataSearch(callback: IFzfCallbackResult): IFzfCallbackResult {
    return (filePaths: string[]) => {
      return callback(filePaths);
    };
  }

  public filePathToQuickItem(filePath: string): IQuickPickItem {
    const workspacePath = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0].uri.path;
    const uri = vscode.Uri.file(filePath);
    const fileType = getFileType(uri);
    const fileName = getFileName(uri);
    const fileExtension = getFileExtension(uri);


    if (this.iconThemePath) {
      const iconPath = this.iconThemePath?.[fileName]?.iconPath || this.iconThemePath?.[fileExtension]?.iconPath || '';
      if (iconPath) {
        return {
          iconPath: vscode.Uri.file(iconPath),
          label: `${path.parse(filePath).base}`,
          description: `${path.parse(filePath).dir.replace(`${workspacePath}` || '', '')}`,
          alwaysShow: true,
          filePath,
        };
      }
    }

    return {
      label: `$(${fileType}) ${path.parse(filePath).base}`,
      description: `${path.parse(filePath).dir.replace(`${workspacePath}` || '', '')}`,
      alwaysShow: true,
      filePath,
    };
  }

  public async checkFileExist(filePath: string): Promise<boolean> {
    return await this.fzf.checkFileExist(filePath);
  }

  private getCurrentIconTheme(): string | undefined {
    this.iconThemeName = vscode.workspace.getConfiguration('workbench').get('iconTheme');
    return this.iconThemeName;
  }

  private getListExtensionIconThemes(): vscode.Extension<any>[] {
    const BUILT_IN_EXTENSION_PREFIXES = [
      'ms-vscode', // Common Microsoft extensions
      'vscode-',    // Generic VS Code extensions,
      'vscode-insiders-', // Insiders VS Code extensions
      'vscode',
      'vscode-insiders',
    ];

    const excludeExtensions: string[] = getConfig('excludeExtensions') || [];
    const isExtensionIconTheme = (ext: vscode.Extension<any>) => {
      return ext.packageJSON?.contributes?.iconThemes?.length > 0 || excludeExtensions.some(item => item === ext.id);
    };

    const extensions = vscode.extensions.all.filter(ext => {
      return !BUILT_IN_EXTENSION_PREFIXES.some(prefix => {
        const [publisher, name] = ext.id.split('.');
        return isExtensionIconTheme(ext) && (prefix === publisher || ext.id.startsWith(prefix));
      });
    });

    return extensions as vscode.Extension<any>[];
  }

  private getExtensionIconThemeCurrent(): vscode.Extension<any> | undefined {
    const iconTheme = this.getCurrentIconTheme();
    const installedExtensions = this.getListExtensionIconThemes();
    for (const ext of installedExtensions) {
      const { contributes } = ext.packageJSON || {};
      if (!contributes) {
        continue;
      }
      const { iconThemes } = contributes || {};
      if (!iconThemes?.length) {
        continue;
      }

      const exist = iconThemes.find((theme: IContributeIConThemes) => theme.id === iconTheme);
      if (exist) {
        return ext;
      }
    }

    return undefined;
  }

  private getPathIconTheme(): string | undefined {
    const extension = this.getExtensionIconThemeCurrent();
    if (!extension) {
      return;
    }

    const { contributes } = extension.packageJSON || {};
    if (!contributes || !contributes.iconThemes || !this.iconThemeName) {
      return;
    }

    const pathIconThemes = contributes.iconThemes.find((theme: IContributeIConThemes) => theme.id === this.iconThemeName);

    if (!pathIconThemes || !pathIconThemes.path) {
      return;
    }

    return path.join(extension.extensionPath, pathIconThemes.path);
  }

  private getContentIconJson(): Record<string, IIConDefinitions> | undefined {
    const pathIconTheme = this.getPathIconTheme();
    if (!pathIconTheme) {
      return;
    }

    try {
      const readFile = require('fs').readFileSync(pathIconTheme, 'utf8');
      const iconJson = JSON.parse(readFile);

      const { fileExtensions, fileNames, iconDefinitions } = iconJson || {
        fileExtensions: {},
        fileNames: {},
        iconDefinitions: {},
      };

      const pathFolderIcons = Object.keys(iconDefinitions).reduce((acc, key) => {
        acc[key] = {
          ...iconDefinitions[key],
          iconPath: path.join(path.dirname(pathIconTheme), iconDefinitions[key]['iconPath']),
        };
        return acc;
      }, {} as Record<string, IIConDefinitions>);

      const _fileExtensions = Object.keys(fileExtensions).reduce((acc, key) => {
        acc[key] = pathFolderIcons[fileExtensions[key]];
        return acc;
      }, {} as Record<string, IIConDefinitions>);

      const _fileName = Object.keys(fileNames).reduce((acc, key) => {
        acc[key] = pathFolderIcons[fileNames[key]];
        return acc;
      }, {} as Record<string, IIConDefinitions>);

      return {
        ..._fileExtensions,
        ..._fileName
      };

    } catch (err) {
      console.error(err);
      return;
    }
  }
}