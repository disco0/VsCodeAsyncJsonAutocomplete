import * as vscode from "vscode";
import { Location } from 'jsonc-parser';
import { ISuggestionsCollector } from "./ISuggestionsCollector";

export interface IJSONContribution {
	getDocumentSelector(): vscode.DocumentSelector;
	getInfoContribution(fileName: string, location: Location): Thenable<vscode.MarkedString[] | null> | null;
	collectPropertySuggestions(fileName: string, location: Location, currentWord: string, addValue: boolean, isLast: boolean, result: ISuggestionsCollector): Thenable<any> | null;
	collectValueSuggestions(fileName: string, location: Location, result: ISuggestionsCollector): Thenable<any> | null;
	collectDefaultSuggestions(fileName: string, result: ISuggestionsCollector): Thenable<any>;
	resolveSuggestion?(item: vscode.CompletionItem): Thenable<vscode.CompletionItem | null> | null;
}