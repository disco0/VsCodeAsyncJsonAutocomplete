import { CompletionItem } from "vscode";

export interface ISuggestionsCollector {
	add(suggestion: CompletionItem): void;
	error(message: string): void;
	log(message: string): void;
	setAsIncomplete(): void;
}