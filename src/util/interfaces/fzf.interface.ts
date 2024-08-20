import * as vscode from 'vscode';

export interface IFzfCallbackResult {
  (filePath: string[]): void;
}

export interface IQuickPickItem extends vscode.QuickPickItem {
  filePath: string;
}

export interface IFzfCallbackQuickPick {
  (quickItem: IQuickPickItem[]): void;
}

export interface IFzfOptions {
  max_depth?: number;
  excludes?: string;
  ignoreRecentItem?: boolean;
}

export class IQuickItemLine implements vscode.QuickPickItem {
  description: string | undefined;
  detail: string | undefined;

  constructor(
    public label: string,
    public line: number
  ) {
    this.label = label.trim();
  }
}