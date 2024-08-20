import * as vscode from 'vscode';
import { IQuickItemLine } from './interfaces/fzf.interface';

export default class SearchContent {
  constructor() { }

  private pad(str: string, length: number) {
    return '0'.repeat(length - str.length) + str;
  }

  public searchContent(search: string, previewValue: string): string | undefined {
    for (let i = 0; i < search.length; ++i) {
      if (previewValue.charAt(i) !== search.charAt(i)) {
        return search.charAt(i);
      }
    }
  }

  public initQuickPickEntries(): IQuickItemLine[] {
    if (!vscode.window.activeTextEditor) {
      return [];
    }
    const lines: string[] = vscode.window.activeTextEditor.document.getText().split(/\r?\n/) || [];
    const maxNumberLength = lines.length.toString().length;
    return lines.map((line, index) => {
      return new IQuickItemLine(`${this.pad((index + 1).toString(), maxNumberLength)}: ${line}`, index);
    });
  }
}
