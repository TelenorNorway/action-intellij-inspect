import { PrismStyler, hex } from "./stx";
import {
	fileToProblemSource,
	severityCount,
	fileOrder,
	weightOf,
} from "./problems";
import { brightWhite, white } from "./stx/colors";

const defaultCursorStyle = hex("#AAAAAA");

const warningColor = hex("#EE6C4D");
const errorColor = hex("#FB4B4E");
const informationColor = hex("#427AA1");
const grammarErrorColor = hex("#A5BE00");
const typoColor = hex("#679436");
const weakWarningColor = hex("#F79D5C");
const defaultLineNumberStyle = (text: string) => brightWhite(text);

const cursorStyles: Record<string, PrismStyler> = {
	WARNING: warningColor,
	"WEAK WARNING": weakWarningColor,
	ERROR: errorColor,
	INFORMATION: informationColor,
	GRAMMAR_ERROR: grammarErrorColor,
	TYPO: typoColor,
	// "TEXT ATTRIBUTES": hex("#000000"),
	INFO: informationColor,
};

function styleFor(severity: string) {
	return cursorStyles[severity] || defaultCursorStyle;
}

const HOR_LINE = "─";
const VER_LINE = "│";
const MID_DOWN = "┬";
const MIDDLE_U = "┴";
const MIDDLE_A = "┼";

const protectLinesAround = 2;

export function render() {
	let longestLineNumber = 4;
	let longestLine = 0;

	for (const file of fileOrder) {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const source = fileToProblemSource.get(file)!;
		longestLineNumber = Math.max(
			longestLineNumber,
			(1 + source.code.length).toString().length,
		);
		longestLine = Math.max(longestLine, file.length);
		for (const line of source.code) {
			longestLine = Math.max(longestLine, line.length);
		}
		for (const problem of source.problems) {
			source.protectedLines[problem.line] = true;
			for (let i = 1; i <= protectLinesAround; i++) {
				if (problem.line - i in source.protectedLines) {
					source.protectedLines[problem.line - i] = true;
				}
				if (problem.line + i in source.protectedLines) {
					source.protectedLines[problem.line + i] = true;
				}
				source.linesToProblem[problem.line] ??= [];
				source.linesToProblem[problem.line].push(problem);
			}
		}
		for (let i = 0; i < source.protectedLines.length; i++) {
			if (source.protectedLines[i]) {
				source.protectedLinesArr.push(i);
			}
		}
	}

	const fileHeaderTop =
		HOR_LINE.repeat(longestLineNumber + 2) +
		MID_DOWN +
		HOR_LINE.repeat(longestLine + 2);

	const fileHeaderBottom =
		HOR_LINE.repeat(longestLineNumber + 2) +
		MIDDLE_A +
		HOR_LINE.repeat(longestLine + 2);

	const fileContentBottom =
		HOR_LINE.repeat(longestLineNumber + 2) +
		MIDDLE_U +
		HOR_LINE.repeat(longestLine + 2);

	const emptyLine =
		"\n" +
		HOR_LINE.repeat(longestLineNumber + 2) +
		MIDDLE_A +
		HOR_LINE.repeat(longestLine + 2);

	for (const file of fileOrder) {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const source = fileToProblemSource.get(file)!;

		const fileHeaderMiddle = ` ${"File".padStart(
			longestLineNumber,
		)} ${VER_LINE} ${file}`;

		let str = fileHeaderTop + "\n" + fileHeaderMiddle + "\n" + fileHeaderBottom;

		let lastLine = -1;
		for (const line of source.protectedLinesArr) {
			if (lastLine + 1 !== line && lastLine !== -1) {
				str += emptyLine;
			}
			lastLine = line;
			const hasProblem = line in source.linesToProblem;
			str +=
				"\n " +
				(hasProblem ? defaultLineNumberStyle : defaultCursorStyle)(
					(1 + line).toString().padStart(longestLineNumber),
				) +
				" " +
				VER_LINE +
				" " +
				(source.highlightedCode?.[line] || source.code[line]);
			if (hasProblem) {
				const columnsAlts: { weight: number; style: PrismStyler }[][] =
					new Array(longestLine).fill(false).map(() => []);
				for (const problem of source.linesToProblem[line]) {
					const obj = {
						weight: weightOf(problem.severity),
						style: styleFor(problem.severity),
					};
					for (let i = 0; i < problem.length; i++) {
						columnsAlts[problem.startsAt + i]?.push?.(obj);
					}
				}
				const columns = columnsAlts
					.map(
						(column, index) =>
							column.sort((a, b) => b.weight - a.weight)?.[0]?.style?.("^") ??
							source.originalCode
								.at(line)
								?.at(index)
								?.replace(/\t/g, "  ")
								.replace(/[^ ]/g, " ") ??
							"",
					)
					.join("");
				str +=
					"\n" + "".padStart(longestLineNumber + 2) + VER_LINE + " " + columns;
			}
		}

		console.log(white(str + "\n" + fileContentBottom) + "\u001b[0m");
		for (const problem of source.problems) {
			console.debug(
				"%s:%d:%d-%d: %s",
				file,
				problem.line,
				problem.startsAt,
				problem.startsAt + problem.length,
				problem.message
					.replace(/<code>/g, "\u001b[100;97;m")
					.replace(/<\/code>/g, "\u001b[0m"),
			);
		}
		console.log("");
	}
}
