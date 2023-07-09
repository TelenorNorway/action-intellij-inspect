import { readFileSync } from "node:fs";
import { join } from "node:path";
import wordwrap from "wordwrap";
import { DiagnosticMessage, FileDiagnostics } from "../common";
import { PrismStyler, defaultTheme, hex, tryHighlight } from "../../stx";
import { italic } from "../../stx/colors";
import {
	getCharAt,
	getStyler,
	renderToString,
	replaceCharAt,
	setPos,
	setStyler,
	virtualLines,
	write,
} from "./virtualLines";

// The max amount of lines around the problematic line.
const LINES_AROUND = 2;
const TAB_SIZE = 2;
const INDENT = " ".repeat(TAB_SIZE);
const LINE_ENDING_REGEX = /\r?\n/g;
const TAB_REGEX = /\t/g;

const MESSAGE_HARD_WRAP_AT = 120;
const MESSAGE_MINIMUM_LENGTH = 20;
const HARD_WRAP_WHEN = 60;

const SOFT_CORNER_RIGHT_DOWN = "╭";
const SOFT_CORNER_UP_RIGHT = "╰";
const SOFT_CORNER_LEFT_UP = "╯";
const HORIZONTAL_FULL = "─";
const HORIZONTAL_DOWN = "┬";
const VERTICAL_FULL = "│";
const VERTICAL_RIGHT = "├";

const styleProblematicLineNumber = hex("#FFFFFF");
const styleLineNumber = hex("#666666");
const styleFileName = hex("#999999");
const numberGutterStyle = hex("#444444");

const defaultCursorStyle = hex("444444");
const cursorStyles: Record<string, PrismStyler> = {
	WARNING: hex("#EE6C4D"),
	"WEAK WARNING": hex("#F79D5C"),
	ERROR: hex("#FB4B4E"),
	INFORMATION: hex("#427AA1"),
	INFO: hex("#427AA1"),
	GRAMMAR_ERROR: hex("#A5BE00"),
	TYPO: hex("#E3E36A"),
};
const styleForSeverity = (severity: string) =>
	cursorStyles[severity] ?? defaultCursorStyle;

export function emitFileDiagnostic(
	diagnostics: FileDiagnostics[],
	projectDir: string,
) {
	const fileToContent = loadFilesToContent(diagnostics, projectDir);
	const originalLines = splitContentToLines(fileToContent);
	const highlightedLines = splitContentToLines(
		fileToContent,
		true,
		fileToLanguage(diagnostics),
		true,
	);

	const segments =
		segregateDiagnosticsIntoCodeSegments(diagnostics).sort(codeSegmentSort);

	const longestLineNumber = fixMaxLineOnCodeSegments(segments, originalLines);

	renderSegments(longestLineNumber, segments, highlightedLines, originalLines);
}

function renderSegments(
	longestLineNumber: number,
	segments: CodeSegment[],
	highlightedLines: Record<string, string[]>,
	originalLines: Record<string, string[]>,
) {
	for (const segment of segments) {
		renderSegment(longestLineNumber, segment, highlightedLines, originalLines);
	}
}

function renderSegment(
	longestLineNumber: number,
	segment: CodeSegment,
	highlightedLines: Record<string, string[]>,
	originalLines: Record<string, string[]>,
) {
	let str =
		"".padStart(longestLineNumber + 2) +
		numberGutterStyle(SOFT_CORNER_RIGHT_DOWN) +
		numberGutterStyle(HORIZONTAL_FULL) +
		" " +
		styleFileName(segment.file);

	for (let line = segment.minLines; line <= segment.maxLines; line++) {
		const messages = segment.lineToMessages.get(line);
		str += "\n ";
		const lineNumberStyle = messages
			? styleProblematicLineNumber
			: styleLineNumber;
		str += lineNumberStyle((1 + line).toString().padStart(longestLineNumber));
		str += " " + numberGutterStyle(VERTICAL_FULL) + " ";
		str += codeFor(highlightedLines, segment.file, line);
		if (messages) {
			if (messages.length === 1) {
				const message = messages[0];
				const cursorStyle = styleForSeverity(message.severity);
				str += "\n";
				str += "".padStart(longestLineNumber + 2);
				str += numberGutterStyle(VERTICAL_FULL);
				const offset = realPosFor(
					originalLines,
					segment.file,
					message.line,
					message.offset,
				);
				const length = realPosFor(
					originalLines,
					segment.file,
					message.line,
					message.length,
				);
				str += "".padStart(offset + 1);
				str += cursorStyle(HORIZONTAL_FULL.repeat(length));
				const msgOffset = 5 + longestLineNumber + offset + length;
				const msgLineSize = Math.min(
					HARD_WRAP_WHEN,
					MESSAGE_HARD_WRAP_AT - msgOffset,
				);
				const msgLines = (
					msgLineSize < MESSAGE_MINIMUM_LENGTH
						? message.message
						: wordwrap.hard(msgLineSize)(message.message)
				).split(/\r?\n/g);
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				const firstLine = msgLines.shift() || "";
				str += " " + cursorStyle(italic(firstLine));
				const continuationOffset =
					"\n" +
					"".padStart(2 + longestLineNumber) +
					numberGutterStyle(VERTICAL_FULL) +
					"".padStart(msgOffset - (3 + longestLineNumber));
				for (const line of msgLines) {
					str += continuationOffset + cursorStyle(italic(line));
				}
				continue;
			}
			const lines = virtualLines();
			for (const message of messages.reverse()) {
				const oldStyler = getStyler(lines);
				setStyler(lines, styleForSeverity(message.severity));
				const offset = realPosFor(
					originalLines,
					segment.file,
					message.line,
					message.offset,
				);
				const length = realPosFor(
					originalLines,
					segment.file,
					message.line,
					message.length,
				);
				setPos(lines, offset, 0);
				write(lines, HORIZONTAL_FULL.repeat(length));
				setStyler(lines, oldStyler);
			}
			for (const message of messages.slice(0, -1).reverse()) {
				const offset = realPosFor(
					originalLines,
					segment.file,
					message.line,
					message.offset,
				);
				const length = realPosFor(
					originalLines,
					segment.file,
					message.line,
					message.length,
				);
				const middlePos = offset + Math.ceil(length / 2);
				if (HORIZONTAL_FULL === getCharAt(lines, middlePos, 0)) {
					replaceCharAt(lines, middlePos, 0, HORIZONTAL_DOWN);
				}
			}
			let nLines = -1;
			for (const message of messages.reverse()) {
				const cursorStyle = styleForSeverity(message.severity);
				const offset = realPosFor(
					originalLines,
					segment.file,
					message.line,
					message.offset,
				);
				const length = realPosFor(
					originalLines,
					segment.file,
					message.line,
					message.length,
				);
				if (nLines === -1) {
					setStyler(lines, (text) => cursorStyle(italic(text)));
					const msgOffset = 5 + longestLineNumber + offset + length;
					const msgLineSize = Math.min(
						HARD_WRAP_WHEN,
						MESSAGE_HARD_WRAP_AT - msgOffset,
					);
					const msgLines = (
						msgLineSize < MESSAGE_MINIMUM_LENGTH
							? message.message
							: wordwrap.hard(msgLineSize)(message.message)
					).split(/\r?\n/g);
					// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
					const firstLine = msgLines.shift() || "";
					nLines = msgLines.length;
					const lineOffset = offset + length + 1;
					setPos(lines, lineOffset, 0);
					write(lines, firstLine);
					let y = 1;
					for (const line of msgLines) {
						setPos(lines, lineOffset, y++);
						write(lines, line);
					}
					continue;
				}
				setStyler(lines, cursorStyle);
				const middlePos = offset + Math.ceil(length / 2);
				for (let i = 1; i <= nLines; i++) {
					setPos(lines, middlePos, i);
					const charAt = getCharAt(lines, lines.x, lines.y);
					if (charAt === VERTICAL_FULL) continue;
					if (charAt === SOFT_CORNER_UP_RIGHT) {
						replaceCharAt(lines, lines.x, lines.y, VERTICAL_RIGHT);
					} else {
						write(lines, VERTICAL_FULL);
					}
				}
				setPos(lines, middlePos, nLines + 1);
				write(lines, SOFT_CORNER_UP_RIGHT + HORIZONTAL_FULL);
				nLines++;
				setStyler(lines, (text) => cursorStyle(italic(text)));
				const msgOffset = 5 + longestLineNumber + offset + length;
				const msgLineSize = Math.min(
					HARD_WRAP_WHEN,
					MESSAGE_HARD_WRAP_AT - msgOffset,
				);
				const msgLines = (
					msgLineSize < MESSAGE_MINIMUM_LENGTH
						? message.message
						: wordwrap.hard(msgLineSize)(message.message)
				).split(/\r?\n/g);
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				const firstLine = msgLines.shift() || "";
				const lineOffset = middlePos + 3;
				setPos(lines, lineOffset, nLines);
				write(lines, firstLine);
				let y = 1;
				for (const line of msgLines) {
					setPos(lines, lineOffset, nLines + y++);
					write(lines, line);
				}
				nLines += msgLines.length;
			}
			const linePrefix =
				"".padStart(2 + longestLineNumber) +
				numberGutterStyle(VERTICAL_FULL) +
				" ";
			str +=
				"\n" +
				renderToString(lines)
					.split(/\r?\n/g)
					.map((line) => linePrefix + line)
					.join("\n");
		}
	}

	str +=
		"\n" +
		"".padStart(longestLineNumber + 1) +
		numberGutterStyle(HORIZONTAL_FULL + SOFT_CORNER_LEFT_UP);

	console.log(str + "\n");
}

function realPosFor(
	content: Record<string, string[]>,
	file: string,
	line: number,
	column: number,
) {
	const tabs = countTabs(codeFor(content, file, line, false), column);
	return column - tabs + tabs * TAB_SIZE;
}

function countTabs(code: string, until: number) {
	let tabs = 0;
	for (let i = 0; i <= Math.min(code.length, until); i++) {
		if (code[i] === "\t") tabs++;
	}
	return tabs;
}

function codeFor(
	content: Record<string, string[]>,
	file: string,
	line: number,
	reset = true,
) {
	return content[file][line] + (reset ? "\u001b[0m" : "");
}

function fixMaxLineOnCodeSegments(
	segments: CodeSegment[],
	originalLines: Record<string, string[]>,
) {
	let maxLineNumber = 0;

	for (const segment of segments) {
		segment.maxLines = Math.min(
			segment.maxLines,
			originalLines[segment.file].length - 1,
		);
		maxLineNumber = Math.max(segment.maxLines);
	}

	return (maxLineNumber + 1).toString().length;
}

function fileToLanguage(diagnostics: FileDiagnostics[]) {
	const languages: Record<string, string> = {};
	for (const diagnostic of diagnostics) {
		languages[diagnostic.file] = diagnostic.language;
	}
	return languages;
}

function splitContentToLines(
	content: Record<string, string>,
	shouldHighlight = false,
	contentLanguages: Record<string, string> = {},
	replaceTabs = false,
): Record<string, string[]> {
	return Object.fromEntries(
		Object.entries(content).map(([file, content]) => [
			file,
			(shouldHighlight
				? tryHighlight(
						defaultTheme,
						contentLanguages[file] ?? "",
						replaceTabs ? content.replace(TAB_REGEX, INDENT) : content,
				  ) ?? content
				: content
			).split(LINE_ENDING_REGEX),
		]),
	);
}

function loadFilesToContent(
	diagnostics: FileDiagnostics[],
	projectDir: string,
): Record<string, string> {
	const content: Record<string, string> = {};
	for (const diagnostic of diagnostics) {
		content[diagnostic.file] = readFileSync(
			join(projectDir, diagnostic.file),
		).toString();
	}
	return content;
}

function codeSegmentSort(a: CodeSegment, b: CodeSegment): number {
	const weightDiff = b.weight - a.weight;
	const messagesDiff = b.messages.length - a.messages.length;
	const nameDiff = b.file.localeCompare(a.file);
	return weightDiff !== 0
		? weightDiff
		: messagesDiff !== 0
		? messagesDiff
		: nameDiff;
}

function segregateDiagnosticsIntoCodeSegments(diagnostics: FileDiagnostics[]) {
	const segments: CodeSegment[] = [];
	for (const diagnostic of diagnostics) {
		segments.push(...segregateDiagnosticMessagesIntoCodeSegments(diagnostic));
	}
	return segments;
}

function segregateDiagnosticMessagesIntoCodeSegments(
	diagnostic: FileDiagnostics,
): CodeSegment[] {
	const segments: CodeSegment[] = [];
	let segment: CodeSegment | undefined = undefined;

	for (const message of diagnostic.messages) {
		if (
			segment &&
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			!isLineWithinMinMax(message.line, segment!.minLines, segment!.maxLines)
		) {
			segments.push(segment);
			segment = undefined;
		}

		if (segment === undefined) {
			segment = {
				file: diagnostic.file,
				weight: message.weight,
				minLines: Math.max(0, message.line - LINES_AROUND),
				maxLines: message.line + LINES_AROUND,
				messages: [message],
				lineToMessages: new Map(),
			};
			addMessageToSegmentLineMap(segment.lineToMessages, message);
			continue;
		}

		segment.weight += message.weight;
		segment.messages.push(message);
		addMessageToSegmentLineMap(segment.lineToMessages, message);
		segment.minLines = Math.max(
			Math.min(segment.minLines, message.line - LINES_AROUND),
			0,
		);
		segment.maxLines = Math.max(segment.maxLines, message.line + LINES_AROUND);
	}

	if (segment) {
		segments.push(segment);
		segment = undefined;
	}

	return segments;
}

function addMessageToSegmentLineMap(
	map: Map<number, DiagnosticMessage[]>,
	message: DiagnosticMessage,
) {
	if (map.has(message.line)) {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		map.get(message.line)!.push(message);
	} else {
		map.set(message.line, [message]);
	}
}

function isLineWithinMinMax(
	line: number,
	min: number,
	max: number,
	around: number = LINES_AROUND,
): boolean {
	return line + around >= min && line - around <= max;
}

// types

interface CodeSegment {
	file: string;
	weight: number;
	minLines: number;
	maxLines: number;
	messages: DiagnosticMessage[];
	lineToMessages: Map<number, DiagnosticMessage[]>;
}
