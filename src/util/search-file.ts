import * as vscode from 'vscode';
import * as path from 'path';
import { IFzfCallbackResult, IFzfOptions, IQuickPickItem } from './interfaces/fzf.interface';
import { fileType } from './defines/file-type.define';
import Fzf from './fzf';

export default class SearchFile {
  private fzf: Fzf;

  constructor() {
    this.fzf = new Fzf();
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
    const workspacePath = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0].uri.path; const uri = vscode.Uri.file(filePath);
    const fileExtension = fileType(uri);
    return {
      label: `$(${fileExtension}) ${path.parse(filePath).base}`,
      description: `${path.parse(filePath).dir.replace(`${workspacePath}` || '', '')}`,
      alwaysShow: true,
      filePath,
    };
  }

  public async checkFileExist(filePath: string): Promise<boolean> {
    return await this.fzf.checkFileExist(filePath);
  }
}