import * as vscode from "vscode";
import { basename } from 'path';
import { getLocation, createScanner, SyntaxKind, ScanError, JSONScanner } from 'jsonc-parser';
import { IJSONContribution } from "./IJSONContribution";
import { ISuggestionsCollector } from "./ISuggestionsCollector";

export class JSONCompletionItemProvider implements vscode.CompletionItemProvider {

	constructor(private jsonContribution: IJSONContribution) {
	}

	public resolveCompletionItem(item: vscode.CompletionItem, _token: vscode.CancellationToken): Thenable<vscode.CompletionItem | null> {
		if (this.jsonContribution.resolveSuggestion) {
			const resolver = this.jsonContribution.resolveSuggestion(item);
			if (resolver) {
				return resolver;
			}
		}
		return Promise.resolve(item);
	}

	public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, _token: vscode.CancellationToken): Thenable<vscode.CompletionList | null> | null {

		const fileName = basename(document.fileName);

		const currentWord = this.getCurrentWord(document, position);
		let overwriteRange: vscode.Range;

		const items: vscode.CompletionItem[] = [];
		let isIncomplete = false;

		const offset = document.offsetAt(position);
		const location = getLocation(document.getText(), offset);

		const node = location.previousNode;
		if (node && node.offset <= offset && offset <= node.offset + node.length && (node.type === 'property' || node.type === 'string' || node.type === 'number' || node.type === 'boolean' || node.type === 'null')) {
			overwriteRange = new vscode.Range(document.positionAt(node.offset), document.positionAt(node.offset + node.length));
		} else {
			overwriteRange = new vscode.Range(document.positionAt(offset - currentWord.length), position);
		}

		const proposed: { [key: string]: boolean } = {};
		const collector: ISuggestionsCollector = {
			add: (suggestion: vscode.CompletionItem) => {
				if (!proposed[suggestion.label]) {
					proposed[suggestion.label] = true;
					suggestion.range = { replacing: overwriteRange, inserting: new vscode.Range(overwriteRange.start, overwriteRange.start) };
					items.push(suggestion);
				}
			},
			setAsIncomplete: () => isIncomplete = true,
			error: (message: string) => console.error(message),
			log: (message: string) => console.log(message)
		};

		let collectPromise: Thenable<any> | null = null;

		if (location.isAtPropertyKey) {
			const scanner = createScanner(document.getText(), true);
			const addValue = !location.previousNode || !this.hasColonAfter(scanner, location.previousNode.offset + location.previousNode.length);
			const isLast = this.isLast(scanner, document.offsetAt(position));
			collectPromise = this.jsonContribution.collectPropertySuggestions(fileName, location, currentWord, addValue, isLast, collector);
		} else {
			if (location.path.length === 0) {
				collectPromise = this.jsonContribution.collectDefaultSuggestions(fileName, collector);
			} else {
				collectPromise = this.jsonContribution.collectValueSuggestions(fileName, location, collector);
			}
		}
		if (collectPromise) {
			return collectPromise.then(() => {
				if (items.length > 0) {
					return new vscode.CompletionList(items, isIncomplete);
				}
				return null;
			});
		}
		return null;
	}

	private getCurrentWord(document: vscode.TextDocument, position: vscode.Position) {
		let i = position.character - 1;
		const text = document.lineAt(position.line).text;
		while (i >= 0 && ' \t\n\r\v":{[,'.indexOf(text.charAt(i)) === -1) {
			i--;
		}
		return text.substring(i + 1, position.character);
	}

	private isLast(scanner: JSONScanner, offset: number): boolean {
		scanner.setPosition(offset);
		let nextToken = scanner.scan();
		if (nextToken === SyntaxKind.StringLiteral && scanner.getTokenError() === ScanError.UnexpectedEndOfString) {
			nextToken = scanner.scan();
		}
		return nextToken === SyntaxKind.CloseBraceToken || nextToken === SyntaxKind.EOF;
	}
	private hasColonAfter(scanner: JSONScanner, offset: number): boolean {
		scanner.setPosition(offset);
		return scanner.scan() === SyntaxKind.ColonToken;
	}

}