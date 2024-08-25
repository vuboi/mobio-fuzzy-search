import * as vscode from 'vscode';
import { IConfigSetting } from './interfaces/config.interface';

export const getConfig = (key: keyof IConfigSetting): any => {
  return vscode.workspace.getConfiguration('fuzzySearch').get(key);
};
