'use strict';

import * as vscode from 'vscode'; 

import CoqLintingProvider from './coqLintProvider';

export function activate(context: vscode.ExtensionContext) {
	let linter = new CoqLintingProvider();	
	linter.activate(context.subscriptions);
	vscode.languages.registerCodeActionsProvider('coq', linter);
}
