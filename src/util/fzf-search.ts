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
let lastRange: vscode.Range | undefined = undefined;
let listen: vscode.Disposable | undefined = undefined;

export async function fzfSearchFile(): Promise<void> {
  const file = new SearchFile();
  const quickPick = vscode.window.createQuickPick<IQuickPickItem>();
  quickPick.placeholder = 'Search files...';
  quickPick.canSelectMany = false;

  const getRecentFiles = async (): Promise<string[]> => {
    recentFilePaths = await (await Promise.all(recentFilePaths.filter(async (filePath) => await file.checkFileExist(filePath))));
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
      return itemPaths.map((filePath) => file.filePathToQuickItem(filePath));
    }
    const itemPaths = [...new Set([...recentItems, ...quickItemPaths])].slice(0, 10);
    const quickItemSearch = itemPaths.map((filePath) => file.filePathToQuickItem(filePath));
    return [separator, ...quickItemSearch];
  };

  const fuzzySearch = (search: string, options: Partial<IFzfOptions> = {}) => {
    file.searchFiles(search, async (quickItemPaths: string[]) => {
      quickPick.items = await getQuickPickItems(quickItemPaths, options.ignoreRecentItem || false);
      quickPick.busy = false;
    }, options);
  };

  fuzzySearch('', { max_depth: 1, ignoreRecentItem: false });

  quickPick.onDidChangeValue((search) => {
    quickPick.busy = true;
    if (search.length === 0) {
      fuzzySearch(search, { ignoreRecentItem: false });
      return;
    }
    fuzzySearch(search, { ignoreRecentItem: true });
  });

  quickPick.onDidChangeSelection(async () => {
    const fileSelected = quickPick.selectedItems[0].filePath;
    recentFilePaths = [fileSelected, ...recentFilePaths].slice(0, 3);
    await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(fileSelected));
    quickPick.hide();
  });

  quickPick.show();
}

export function fzfSearchContent(useCurrentSelection: boolean): void {
  if (!vscode.window.activeTextEditor) {
    vscode.window.showErrorMessage('No active text editor found.');
    return;
  }
  const content = new SearchContent();
  const quickPick = vscode.window.createQuickPick<IQuickItemLine>();
  const quickPickEntries: IQuickItemLine[] = content.initQuickPickEntries();
  quickPick.items = quickPickEntries;
  quickPick.canSelectMany = false;
  listen?.dispose();

  const onGetLastSelected = () => {
    if (lastSelected) {
      lastSelected = quickPickEntries.find(
        t => t.line === lastSelected?.line || t.label === lastSelected?.label);
    }

    lastSelected && (quickPick.activeItems = [lastSelected]);
  };

  const setDecorations = (position: vscode.Position, reset: boolean = false) => {
    // const configColorTextDecoration = vscode.workspace.getConfiguration('editor').get('colorDecorators');
    // if (!vscode.window.activeTextEditor) {
    //   return;
    // }

    // const createTexDecoration = (color: string, range: vscode.Range) => {
    //   vscode.window.activeTextEditor?.setDecorations(
    //     vscode.window.createTextEditorDecorationType({
    //       color: color,
    //       isWholeLine: true
    //     }), [range]);
    // };

    // if (reset) {
    //   // Restore to default color
    //   lastRange && createTexDecoration('editor.background', lastRange);
    //   createTexDecoration('editor.background', new vscode.Range(position, position));
    //   return;
    // }

    // if (lastRange) {
    //   createTexDecoration('editor.background', lastRange);
    // }

    // lastRange = new vscode.Range(position, position);
    // createTexDecoration('red', lastRange);
  };

  const onDidChangeTextEditorSelection = () => {
    listen = vscode.window.onDidChangeTextEditorSelection(() => {
      if (!vscode.window.activeTextEditor) {
        return;
      }
      const position = vscode.window.activeTextEditor.selection.active;
      setDecorations(position, true);

      listen?.dispose();
    });
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

    setDecorations(position);
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
    quickPick.onDidChangeValue(search => {
      if (hasPreviewValue) {
        hasPreviewValue = false;

        // Try to figure out what text the user typed. Assumes that the user
        // typed at most one character.
        content.searchLastContent(search, previewValue, quickPick);
      }
    });
    // Save the search string so we can show it next time fuzzy search is
    // invoked.
    quickPick.onDidChangeValue(search => {
      valueFromPreviousInvocation = search;
      if (search.length === 0) {
        quickPick.items = quickPickEntries;
        return;
      }
      quickPick.items = content.searchContent(search, quickPickEntries);
    });
  };

  const onDidChangeSelection = () => {
    lastSelected = quickPick.selectedItems[0];
    onDidChangeTextEditorSelection();
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
  // quickPick.onDidHide(onDidChangeTextEditorSelection);
  quickPick.onDidChangeActive(onDidChangeActive);
  quickPick.onDidChangeSelection(onDidChangeSelection);
  onDidChangeValue();
  onDidHide();
  quickPick.show();
};