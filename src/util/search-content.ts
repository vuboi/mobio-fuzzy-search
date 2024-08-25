import * as vscode from 'vscode';
import { IQuickItemLine } from './interfaces/fzf.interface';
import { search as fuzzySearch } from 'fast-fuzzy';

export default class SearchContent {
  constructor() { }

  private pad(str: string, length: number) {
    return '0'.repeat(length - str.length) + str;
  }

  public searchLastContent(search: string, previewValue: string, quickPick: vscode.QuickPick<IQuickItemLine>): void {
    for (let i = 0; i < search.length; ++i) {
      if (previewValue.charAt(i) !== search.charAt(i)) {
        quickPick.value = search.charAt(i);
        break;
      }
    }
  }

  public searchContent(search: string, quickPickItem: IQuickItemLine[]): IQuickItemLine[] {
    const result = fuzzySearch(search, quickPickItem, { returnMatchData: true, keySelector: (s: IQuickItemLine) => s.label });

    return result.map((item) => item.item);
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
