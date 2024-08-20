import * as vscode from 'vscode';
import { IQuickItemLine, IQuickPickItem } from './interfaces/fzf.interface';
import SearchFile from './search-file';
import { IFzfOptions } from './interfaces/fzf.interface';
import SearchContent from './search-content';

// Search file
var recentFilePaths: string[] = [];

// Search content
var valueFromPreviousInvocation = '';
var lastSelected: IQuickItemLine | undefined = undefined;

export async function fzfSearchFile(): Promise<void> {
  const searchFile = new SearchFile();
  const quickPick = vscode.window.createQuickPick<IQuickPickItem>();
  quickPick.placeholder = 'Search files...';
  quickPick.canSelectMany = false;

  const getRecentFiles = async (): Promise<string[]> => {
    recentFilePaths = await (await Promise.all(recentFilePaths.filter(async (filePath) => await searchFile.checkFileExist(filePath))));
    return [...new Set(recentFilePaths)];
  };

  const getSeparator = (): IQuickPickItem => {
    return { label: `recently opened`, alwaysShow: true, kind: vscode.QuickPickItemKind.Separator } as IQuickPickItem;
  };

  const getQuickPickItems = async (quickItemPaths: string[], ignoreRecentItem: boolean) => {
    const separator = getSeparator();
    const recentItems = await getRecentFiles();
    if (ignoreRecentItem) {
      const itemPaths = [...new Set([...quickItemPaths])].slice(0, 10);
      return itemPaths.map((filePath) => searchFile.filePathToQuickItem(filePath));
    }
    const itemPaths = [...new Set([...recentItems, ...quickItemPaths])].slice(0, 10);
    const quickItemSearch = itemPaths.map((filePath) => searchFile.filePathToQuickItem(filePath));
    return [separator, ...quickItemSearch];
  };

  const fuzzySearch = (search: string, options: Partial<IFzfOptions> = {}) => {
    searchFile.searchFiles(search, async (quickItemPaths: string[]) => {
      quickPick.items = await getQuickPickItems(quickItemPaths, options.ignoreRecentItem || false);
      quickPick.busy = false;
    }, options);
  };

  fuzzySearch('', { max_depth: 1 });

  quickPick.onDidChangeValue((search) => {
    quickPick.busy = true;
    fuzzySearch(search, { ignoreRecentItem: true });
  });

  quickPick.onDidChangeSelection(() => {
    const fileSelected = quickPick.selectedItems[0].filePath;
    recentFilePaths = [fileSelected, ...recentFilePaths].slice(0, 3);
    vscode.workspace.openTextDocument(fileSelected).then((doc) => {
      vscode.window.showTextDocument(doc);
    });

    quickPick.hide();
  });

  quickPick.show();
}

export function fzfSearchContent(useCurrentSelection: boolean): void {
  if (!vscode.window.activeTextEditor) {
    vscode.window.showErrorMessage('No active text editor found.');
    return;
  }
  const searchContent = new SearchContent();
  const quickPick = vscode.window.createQuickPick<IQuickItemLine>();
  const quickPickEntries: IQuickItemLine[] = searchContent.initQuickPickEntries();
  quickPick.items = quickPickEntries;
  quickPick.canSelectMany = false;

  const onGetLastSelected = () => {
    if (lastSelected) {
      lastSelected = quickPickEntries.find(
        t => t.line === lastSelected?.line || t.label === lastSelected?.label);
    }

    lastSelected && (quickPick.activeItems = [lastSelected]);
  };

  const onDidChangeActive = (items: any) => {
    if (!items.length) {
      return;
    }
    const position = new vscode.Position(items[0].line, 0);
    if (!vscode.window.activeTextEditor) {
      return;
    }
    vscode.window.activeTextEditor.revealRange(
      new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
    vscode.window.activeTextEditor.selection = new vscode.Selection(position, position);
  };

  const onDidChangeValue = () => {
    if (!vscode.window.activeTextEditor) {
      return;
    }
    if (useCurrentSelection) {
      if (vscode.window.activeTextEditor.selection.isEmpty) {
        vscode.window.showErrorMessage('No text selected.');
        return;
      }
      quickPick.value = vscode.window.activeTextEditor.document.getText(
        vscode.window.activeTextEditor.selection);
      return;
    }

    // Show the previous search string. When the user types a character, the
    // preview string will replaced with the typed character.
    quickPick.value = valueFromPreviousInvocation;
    let previewValue = valueFromPreviousInvocation;
    let hasPreviewValue = previewValue.length > 0;
    quickPick.onDidChangeValue(value => {
      if (hasPreviewValue) {
        hasPreviewValue = false;

        // Try to figure out what text the user typed. Assumes that the user
        // typed at most one character.
        for (let i = 0; i < value.length; ++i) {
          if (previewValue.charAt(i) !== value.charAt(i)) {
            quickPick.value = value.charAt(i);
            break;
          }
        }
      }
    });
    // Save the search string so we can show it next time fuzzy search is
    // invoked.
    quickPick.onDidChangeValue(value => valueFromPreviousInvocation = value);
  };

  const onDidChangeSelection = () => {
    lastSelected = quickPick.selectedItems[0];
    quickPick.hide();
  };

  const onDidHide = () => {
    // If fuzzy-search was cancelled navigate to the previous location.
    if (!vscode.window.activeTextEditor) {
      return;
    }
    const startingSelection = vscode.window.activeTextEditor.selection;
    quickPick.onDidHide(() => {
      if (quickPick.selectedItems.length === 0) {
        if (vscode.window.activeTextEditor) {
          vscode.window.activeTextEditor.revealRange(
            new vscode.Range(startingSelection.start, startingSelection.end),
            vscode.TextEditorRevealType.InCenter);
          vscode.window.activeTextEditor.selection = startingSelection;
        }
      }
    });
  };

  onGetLastSelected();
  quickPick.onDidChangeActive(onDidChangeActive);
  quickPick.onDidChangeSelection(onDidChangeSelection);
  onDidChangeValue();
  onDidHide();
  quickPick.show();
}