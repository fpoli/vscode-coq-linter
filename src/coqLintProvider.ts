'use strict';

import * as path from 'path';
import * as cp from 'child_process';
import ChildProcess = cp.ChildProcess;
import * as vscode from 'vscode';

export default class CoqLintingProvider implements vscode.CodeActionProvider {

	private command: vscode.Disposable;
	private diagnosticCollection: vscode.DiagnosticCollection;

	public activate(subscriptions: vscode.Disposable[]) {
		subscriptions.push(this);
		this.diagnosticCollection = vscode.languages.createDiagnosticCollection();

		vscode.workspace.onDidOpenTextDocument(this.doLint, this, subscriptions);
		vscode.workspace.onDidCloseTextDocument((textDocument)=> {
			this.diagnosticCollection.delete(textDocument.uri);
		}, null, subscriptions);

		vscode.workspace.onDidSaveTextDocument(this.doLint, this);

		// Lint all open coq documents
		vscode.workspace.textDocuments.forEach(this.doLint, this);
	}

	public dispose(): void {
		this.diagnosticCollection.clear();
		this.diagnosticCollection.dispose();
		this.command.dispose();
	}

	private doLint(textDocument: vscode.TextDocument) {
		if (textDocument.languageId !== 'coq') {
			return;
		}
		
		let output = ''
		let diagnostics: vscode.Diagnostic[] = [];

		let options = vscode.workspace.rootPath ? { cwd: vscode.workspace.rootPath } : undefined;
		let args =  ['--json', textDocument.fileName];
		
		let childProcess = cp.spawn('coqc', [textDocument.fileName], options);
		childProcess.on('error', (error: Error) => {
			console.log(error);
			vscode.window.showInformationMessage(`Cannot lint the coq file.`);
		});
		if (childProcess.pid) {
			childProcess.stdout.on('data', (data: Buffer) => {
				output += data;
			});
			childProcess.stdout.on('end', () => {
                let reg:RegExp = /File "[^"]*", line (\d*), characters (\d*)-(\d*):\n([\s\S]*)/g

                var result;
                while((result = reg.exec(output)) !== null) {
                    let severity = vscode.DiagnosticSeverity.Error; // or vscode.DiagnosticSeverity.Warning
					let line = Number(result[1]);
					let startCharacter = Number(result[2]);
					let endCharacter = Number(result[3]);
                    let message = result[4];
                    console.log(line - 1, startCharacter, line - 1, endCharacter);
					let range = new vscode.Range(line - 1, startCharacter, line - 1, endCharacter);
					let diagnostic = new vscode.Diagnostic(range, message, severity);
					diagnostics.push(diagnostic);
                }

				this.diagnosticCollection.set(textDocument.uri, diagnostics);	
			});
		}
	}
	
	public provideCodeActions(document: vscode.TextDocument, range: vscode.Range, context: vscode.CodeActionContext, token: vscode.CancellationToken): vscode.Command[] {
		return [];
	}
}
