import * as vscode from 'vscode';
import { fzfSearchContent, fzfSearchFile } from './util/fzf-search';

export function activate(context: vscode.ExtensionContext) {
	const _searchContent = vscode.commands.registerCommand('fuzzySearch.searchContent', () => {
		fzfSearchContent(false);
	});

	const _searchContentSelection = vscode.commands.registerCommand('fuzzySearch.searchContentSelection', () => {
		fzfSearchContent(true);
	});

	const _searchFiles = vscode.commands.registerCommand('fuzzySearch.searchFiles', () => {
		fzfSearchFile();
	});

	context.subscriptions.push(_searchFiles);
	context.subscriptions.push(_searchContent);
	context.subscriptions.push(_searchContentSelection);
}

export function deactivate() { }
