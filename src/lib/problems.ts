import { lstatSync, readFile, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { inspect } from "node:util";
import { defaultTheme, highlight } from "./stx";

interface WithProblems {
	problems?: Problem[];
}

interface Problem {
	file: string;
	line: number;
	offset: number;
	length: number;
	language: string;
	description: string;
	problem_class: {
		severity: string;
	};
}

// Rendering
interface ProblemCursor {
	line: number;
	startsAt: number;
	length: number;
	message: string;
	severity: string;
}

interface ProblemSource {
	file: string;
	code: string[];
	originalCode: string[];
	highlightedCode?: string[];
	protectedLines: boolean[];
	protectedLinesArr: number[];
	linesToProblem: ProblemCursor[][];
	problems: ProblemCursor[];
	weight: number;
}

type FileOrderArr = { weight: number; file: string }[];

// API

export const fileToProblemSource = new Map<string, ProblemSource>();
export const severityCount: Record<string, number> = {};
export const fileOrder: string[] = [];

function highlightCode(code: string, language: string) {
	try {
		return highlight(defaultTheme, language, code);
	} catch {
		return;
	}
}

const levelWeight: Record<string, number> = {
	ERROR: 900,
	WARNING: 800,
	"WEAK WARNING": 700,
	GRAMMAR_ERROR: 0,
	INFORMATION: 100,
	INFO: 100,
	TYPO: 0,
};

export function weightOf(severity: string) {
	return levelWeight[severity] || 0;
}

function insertProblemSourceOf(
	projectDir: string,
	file: string,
	language: string,
): ProblemSource {
	const path = join(projectDir, file);
	const fileContent = readFileSync(path).toString();
	const originalCode = fileContent.split(/\r?\n/g);
	const modifiedCode = fileContent.replace(/\t/g, "  ");
	const code = modifiedCode.split(/\r?\n/g);
	const source = {
		file,
		problems: [],
		code,
		originalCode,
		highlightedCode: highlightCode(modifiedCode, language)?.split(/\r?\n/g),
		protectedLines: new Array(code.length).fill(false),
		weight: 0,
		protectedLinesArr: [],
		linesToProblem: [],
	};
	fileToProblemSource.set(file, source);
	return source;
}

function insertProblem(projectDir: string, problem: Problem) {
	severityCount[problem.problem_class.severity] =
		(severityCount[problem.problem_class.severity] ?? 0) + 1;
	const source = fileToProblemSource.has(problem.file)
		? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		  fileToProblemSource.get(problem.file)!
		: insertProblemSourceOf(projectDir, problem.file, problem.language);
	source.problems.push({
		line: problem.line,
		startsAt: problem.offset,
		length: problem.length,
		severity: problem.problem_class.severity,
		message: problem.description,
	});
	source.weight += weightOf(problem.problem_class.severity);
}

export function findProblems(inspectionDir: string, projectDir: string) {
	for (const name of readdirSync(inspectionDir)) {
		const path = join(inspectionDir, name);
		if (
			name.startsWith(".") ||
			!name.endsWith(".json") ||
			!lstatSync(join(inspectionDir, name)).isFile()
		) {
			continue;
		}
		const contents = JSON.parse(readFileSync(path).toString()) as WithProblems;
		if (!contents.problems || !contents.problems.length) continue;
		for (const problem of contents.problems) {
			problem.file = problem.file.substring(21);
			problem.line--;
			insertProblem(projectDir, problem);
		}
	}
	const arr: FileOrderArr = [];
	for (const [, source] of fileToProblemSource) {
		arr.push({ file: source.file, weight: source.weight });
		source.problems = source.problems.sort((a, b) => {
			const lineDiff = a.line - b.line;
			const startDiff = b.startsAt - a.startsAt;
			return lineDiff === 0 ? startDiff : lineDiff;
		});
	}
	fileOrder.push(
		...arr
			.sort((a, b) => {
				const weightDiff = b.weight - a.weight;
				const nameDiff = b.file.localeCompare(a.file);
				return weightDiff === 0 ? nameDiff : weightDiff;
			})
			.map((o) => o.file),
	);
}
