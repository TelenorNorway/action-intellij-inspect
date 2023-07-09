const severityWeight: Record<string, number> = {
	TYPO: 1,
	INFO: 0,
	INFORMATION: 0,
	GRAMMAR_ERROR: 1,
	"WEAK WARNING": 100,
	WARNING: 1000,
	ERROR: 1000000000,
};

const severityToIsError: Record<string, boolean> = {
	TYPO: false,
	INFO: false,
	INFORMATION: false,
	GRAMMAR_ERROR: false,
	"WEAK WARNING": false,
	WARNING: true,
	ERROR: true,
};

export const weightOfSeverity = (severity: string) =>
	severityWeight[severity] ?? 0;
export const isSeverityAnError = (severity: string) =>
	severityToIsError[severity] ?? false;

export interface FileDiagnostics {
	file: string;
	language: string;
	weight: number;
	error: boolean;
	messages: DiagnosticMessage[];
}

export interface DiagnosticMessage {
	line: number;
	offset: number;
	length: number;

	name: string;
	message: string;
	severity: string;
	weight: number;
}
