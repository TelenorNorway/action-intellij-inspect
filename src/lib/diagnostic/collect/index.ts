import { lstatSync, readFileSync, readdirSync } from "fs";
import {
	DiagnosticMessage,
	FileDiagnostics,
	isSeverityAnError,
	weightOfSeverity,
} from "../common";
import { join } from "path";

export function collectDiagnostics(inspectionDir: string): FileDiagnostics[] {
	return transformInspectionFilesToFileDiagnostics(
		readInspectionFiles(getInspectionFiles(inspectionDir)),
	).map(removeDollarProjectPrefixFromFileNames);
}

function removeDollarProjectPrefixFromFileNames(
	diagnostic: FileDiagnostics,
): FileDiagnostics {
	diagnostic.file = diagnostic.file.substring(21);
	return diagnostic;
}

function getInspectionFiles(inspectionDir: string): string[] {
	return readdirSync(inspectionDir)
		.filter(
			(name) =>
				!name.startsWith(".") &&
				name.endsWith(".json") &&
				name !== "DuplicatedCode_aggregate.json" &&
				name !== "VulnerableLibrariesGlobal.json" &&
				lstatSync(join(inspectionDir, name)).isFile,
		)
		.map((name) => join(inspectionDir, name));
}

function readInspectionFiles(files: string[]): WithProblems[] {
	return files.map((path) => {
		try {
			return JSON.parse(readFileSync(path).toString());
		} catch (ex) {
			console.error(path, ex);
			return { problems: [] };
		}
	});
}

function getFileDiagnosticsByProblem(
	fileDiagnostics: Map<string, FileDiagnostics>,
	problem: WithProblems["problems"][number],
): FileDiagnostics {
	if (!fileDiagnostics.has(problem.file)) {
		const file: FileDiagnostics = {
			file: problem.file,
			language: problem.language,
			weight: 0,
			error: false,
			messages: [],
		};
		fileDiagnostics.set(problem.file, file);
		return file;
	}
	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	return fileDiagnostics.get(problem.file)!;
}

function transformProblemToDiagnosticMessage(
	problem: WithProblems["problems"][number],
): DiagnosticMessage {
	console.log(!problem.problem_class ? problem : "");
	return {
		line: problem.line--,
		offset: problem.offset,
		length: problem.length,

		name: problem.problem_class.name,
		message: problem.description,
		severity: problem.problem_class.severity,
		weight: weightOfSeverity(problem.problem_class.severity),
	};
}

function addProblemToFileDiagnostic(
	fileDiagnostic: FileDiagnostics,
	problem: WithProblems["problems"][number],
) {
	const message = transformProblemToDiagnosticMessage(problem);
	fileDiagnostic.weight += message.weight;
	fileDiagnostic.error =
		fileDiagnostic.error || isSeverityAnError(message.severity);
	fileDiagnostic.messages.push(message);
}

function messageDiagnosticSort(
	a: DiagnosticMessage,
	b: DiagnosticMessage,
): number {
	const aRight = a.offset + a.length;
	const bRight = b.offset + b.length;
	const rightDiff = aRight - bRight;

	const offsetDiff = a.offset - b.offset;

	const lengthDiff = a.length - b.length;

	const weightDiff = b.weight - a.weight;

	// prettier-ignore
	return rightDiff !== 0 ? -rightDiff
		: offsetDiff !== 0 ? -offsetDiff
		: lengthDiff !== 0 ? lengthDiff
		: weightDiff
}

function fileDiagnosticSort(a: FileDiagnostics, b: FileDiagnostics): number {
	const weightDiff = b.weight - a.weight;
	const nameDiff = b.file.localeCompare(a.file);
	return weightDiff === 0 ? nameDiff : weightDiff;
}

function transformInspectionFilesToFileDiagnostics(
	inspections: WithProblems[],
	fileDiagnostics: Map<string, FileDiagnostics> = new Map<
		string,
		FileDiagnostics
	>(),
): FileDiagnostics[] {
	for (const inspection of inspections) {
		for (const problem of inspection.problems) {
			const fileDiagnostic = getFileDiagnosticsByProblem(
				fileDiagnostics,
				problem,
			);
			addProblemToFileDiagnostic(fileDiagnostic, problem);
		}
	}

	const files = [...fileDiagnostics.values()];

	for (const file of files) {
		file.messages = file.messages.sort(messageDiagnosticSort);
		for (const message of file.messages) {
			message.line--;
		}
	}

	return files.sort(fileDiagnosticSort);
}

// Types

interface WithProblems {
	problems: {
		file: string;
		line: number;
		offset: number;
		length: number;
		language: string;
		description: string;
		problem_class: {
			severity: string;
			name: string;
		};
	}[];
}
