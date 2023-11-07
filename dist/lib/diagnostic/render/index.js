"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitFileDiagnostic = void 0;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const wordwrap_1 = __importDefault(require("wordwrap"));
const stx_1 = require("../../stx");
const colors_1 = require("../../stx/colors");
const virtualLines_1 = require("./virtualLines");
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
const styleProblematicLineNumber = (0, stx_1.hex)("#FFFFFF");
const styleLineNumber = (0, stx_1.hex)("#666666");
const styleFileName = (0, stx_1.hex)("#999999");
const numberGutterStyle = (0, stx_1.hex)("#444444");
const defaultCursorStyle = (0, stx_1.hex)("444444");
const cursorStyles = {
    WARNING: (0, stx_1.hex)("#EE6C4D"),
    "WEAK WARNING": (0, stx_1.hex)("#F79D5C"),
    ERROR: (0, stx_1.hex)("#FB4B4E"),
    INFORMATION: (0, stx_1.hex)("#427AA1"),
    INFO: (0, stx_1.hex)("#427AA1"),
    GRAMMAR_ERROR: (0, stx_1.hex)("#A5BE00"),
    TYPO: (0, stx_1.hex)("#E3E36A"),
};
const styleForSeverity = (severity) => { var _a; return (_a = cursorStyles[severity]) !== null && _a !== void 0 ? _a : defaultCursorStyle; };
function emitFileDiagnostic(diagnostics, projectDir) {
    const fileToContent = loadFilesToContent(diagnostics, projectDir);
    const originalLines = splitContentToLines(fileToContent);
    const highlightedLines = splitContentToLines(fileToContent, true, fileToLanguage(diagnostics), true);
    const segments = segregateDiagnosticsIntoCodeSegments(diagnostics).sort(codeSegmentSort);
    const longestLineNumber = fixMaxLineOnCodeSegments(segments, originalLines);
    renderSegments(longestLineNumber, segments, highlightedLines, originalLines);
}
exports.emitFileDiagnostic = emitFileDiagnostic;
function renderSegments(longestLineNumber, segments, highlightedLines, originalLines) {
    for (const segment of segments) {
        renderSegment(longestLineNumber, segment, highlightedLines, originalLines);
    }
}
function renderSegment(longestLineNumber, segment, highlightedLines, originalLines) {
    let str = "".padStart(longestLineNumber + 2) +
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
                const offset = realPosFor(originalLines, segment.file, message.line, message.offset);
                const length = realPosFor(originalLines, segment.file, message.line, message.offset + message.length) - offset;
                str += "".padStart(offset + 1);
                str += cursorStyle(HORIZONTAL_FULL.repeat(length));
                const msgOffset = 5 + longestLineNumber + offset + length;
                const msgLineSize = Math.min(HARD_WRAP_WHEN, MESSAGE_HARD_WRAP_AT - msgOffset);
                const msgLines = (msgLineSize < MESSAGE_MINIMUM_LENGTH
                    ? message.message
                    : wordwrap_1.default.hard(msgLineSize)(message.message)).split(/\r?\n/g);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const firstLine = msgLines.shift() || "";
                str += " " + cursorStyle((0, colors_1.italic)(firstLine));
                const continuationOffset = "\n" +
                    "".padStart(2 + longestLineNumber) +
                    numberGutterStyle(VERTICAL_FULL) +
                    "".padStart(msgOffset - (3 + longestLineNumber));
                for (const line of msgLines) {
                    str += continuationOffset + cursorStyle((0, colors_1.italic)(line));
                }
                continue;
            }
            const lines = (0, virtualLines_1.virtualLines)();
            for (const message of messages.reverse()) {
                const oldStyler = (0, virtualLines_1.getStyler)(lines);
                (0, virtualLines_1.setStyler)(lines, styleForSeverity(message.severity));
                const offset = realPosFor(originalLines, segment.file, message.line, message.offset);
                const length = realPosFor(originalLines, segment.file, message.line, message.offset + message.length) - offset;
                (0, virtualLines_1.setPos)(lines, offset, 0);
                (0, virtualLines_1.write)(lines, HORIZONTAL_FULL.repeat(length));
                (0, virtualLines_1.setStyler)(lines, oldStyler);
            }
            for (const message of messages.slice(0, -1).reverse()) {
                const offset = realPosFor(originalLines, segment.file, message.line, message.offset);
                const length = realPosFor(originalLines, segment.file, message.line, message.offset + message.length) - offset;
                const middlePos = offset + Math.ceil(length / 2);
                if (HORIZONTAL_FULL === (0, virtualLines_1.getCharAt)(lines, middlePos, 0)) {
                    (0, virtualLines_1.replaceCharAt)(lines, middlePos, 0, HORIZONTAL_DOWN);
                }
            }
            let nLines = -1;
            for (const message of messages.reverse()) {
                const cursorStyle = styleForSeverity(message.severity);
                const offset = realPosFor(originalLines, segment.file, message.line, message.offset);
                const length = realPosFor(originalLines, segment.file, message.line, message.offset + message.length) - offset;
                if (nLines === -1) {
                    (0, virtualLines_1.setStyler)(lines, (text) => cursorStyle((0, colors_1.italic)(text)));
                    const msgOffset = 5 + longestLineNumber + offset + length;
                    const msgLineSize = Math.min(HARD_WRAP_WHEN, MESSAGE_HARD_WRAP_AT - msgOffset);
                    const msgLines = (msgLineSize < MESSAGE_MINIMUM_LENGTH
                        ? message.message
                        : wordwrap_1.default.hard(msgLineSize)(message.message)).split(/\r?\n/g);
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    const firstLine = msgLines.shift() || "";
                    nLines = msgLines.length;
                    const lineOffset = offset + length + 1;
                    (0, virtualLines_1.setPos)(lines, lineOffset, 0);
                    (0, virtualLines_1.write)(lines, firstLine);
                    let y = 1;
                    for (const line of msgLines) {
                        (0, virtualLines_1.setPos)(lines, lineOffset, y++);
                        (0, virtualLines_1.write)(lines, line);
                    }
                    continue;
                }
                (0, virtualLines_1.setStyler)(lines, cursorStyle);
                const middlePos = offset + Math.ceil(length / 2);
                for (let i = 1; i <= nLines; i++) {
                    (0, virtualLines_1.setPos)(lines, middlePos, i);
                    const charAt = (0, virtualLines_1.getCharAt)(lines, lines.x, lines.y);
                    if (charAt === VERTICAL_FULL)
                        continue;
                    if (charAt === SOFT_CORNER_UP_RIGHT) {
                        (0, virtualLines_1.replaceCharAt)(lines, lines.x, lines.y, VERTICAL_RIGHT);
                    }
                    else {
                        (0, virtualLines_1.write)(lines, VERTICAL_FULL);
                    }
                }
                (0, virtualLines_1.setPos)(lines, middlePos, nLines + 1);
                (0, virtualLines_1.write)(lines, SOFT_CORNER_UP_RIGHT + HORIZONTAL_FULL);
                nLines++;
                (0, virtualLines_1.setStyler)(lines, (text) => cursorStyle((0, colors_1.italic)(text)));
                const msgOffset = 5 + longestLineNumber + offset + length;
                const msgLineSize = Math.min(HARD_WRAP_WHEN, MESSAGE_HARD_WRAP_AT - msgOffset);
                const msgLines = (msgLineSize < MESSAGE_MINIMUM_LENGTH
                    ? message.message
                    : wordwrap_1.default.hard(msgLineSize)(message.message)).split(/\r?\n/g);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const firstLine = msgLines.shift() || "";
                const lineOffset = middlePos + 3;
                (0, virtualLines_1.setPos)(lines, lineOffset, nLines);
                (0, virtualLines_1.write)(lines, firstLine);
                let y = 1;
                for (const line of msgLines) {
                    (0, virtualLines_1.setPos)(lines, lineOffset, nLines + y++);
                    (0, virtualLines_1.write)(lines, line);
                }
                nLines += msgLines.length;
            }
            const linePrefix = "".padStart(2 + longestLineNumber) +
                numberGutterStyle(VERTICAL_FULL) +
                " ";
            str +=
                "\n" +
                    (0, virtualLines_1.renderToString)(lines)
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
function realPosFor(content, file, line, column) {
    const tabs = countTabs(codeFor(content, file, line, false), column);
    column -= tabs;
    column += tabs * TAB_SIZE;
    return column;
}
function countTabs(code, until) {
    let tabs = 0;
    for (let i = 0; i <= Math.min(code.length, until); i++) {
        if (code[i] === "\t")
            tabs++;
    }
    return tabs;
}
function codeFor(content, file, line, reset = true) {
    var _a;
    return ((_a = content[file][line]) !== null && _a !== void 0 ? _a : "") + (reset ? "\u001b[0m" : "");
}
function fixMaxLineOnCodeSegments(segments, originalLines) {
    let maxLineNumber = 0;
    for (const segment of segments) {
        segment.maxLines = Math.min(segment.maxLines, originalLines[segment.file].length - 1);
        maxLineNumber = Math.max(maxLineNumber, originalLines[segment.file].length - 1);
    }
    return (maxLineNumber + 1).toString().length;
}
function fileToLanguage(diagnostics) {
    const languages = {};
    for (const diagnostic of diagnostics) {
        languages[diagnostic.file] = diagnostic.language;
    }
    return languages;
}
function splitContentToLines(content, shouldHighlight = false, contentLanguages = {}, replaceTabs = false) {
    return Object.fromEntries(Object.entries(content).map(([file, content]) => {
        var _a, _b;
        return [
            file,
            (shouldHighlight
                ? (_b = (0, stx_1.tryHighlight)(stx_1.defaultTheme, (_a = contentLanguages[file]) !== null && _a !== void 0 ? _a : "", replaceTabs ? content.replace(TAB_REGEX, INDENT) : content)) !== null && _b !== void 0 ? _b : content
                : content).split(LINE_ENDING_REGEX),
        ];
    }));
}
function loadFilesToContent(diagnostics, projectDir) {
    const content = {};
    for (const diagnostic of diagnostics) {
        content[diagnostic.file] = (0, node_fs_1.readFileSync)((0, node_path_1.join)(projectDir, diagnostic.file)).toString();
    }
    return content;
}
function codeSegmentSort(a, b) {
    const weightDiff = b.weight - a.weight;
    const messagesDiff = b.messages.length - a.messages.length;
    const nameDiff = b.file.localeCompare(a.file);
    return weightDiff !== 0
        ? weightDiff
        : messagesDiff !== 0
            ? messagesDiff
            : nameDiff;
}
function segregateDiagnosticsIntoCodeSegments(diagnostics) {
    const segments = [];
    for (const diagnostic of diagnostics) {
        segments.push(...segregateDiagnosticMessagesIntoCodeSegments(diagnostic));
    }
    return segments;
}
function segregateDiagnosticMessagesIntoCodeSegments(diagnostic) {
    const segments = [];
    let segment = undefined;
    for (const message of diagnostic.messages) {
        if (segment &&
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            !isLineWithinMinMax(message.line, segment.minLines, segment.maxLines)) {
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
        segment.minLines = Math.max(Math.min(segment.minLines, message.line - LINES_AROUND), 0);
        segment.maxLines = Math.max(segment.maxLines, message.line + LINES_AROUND);
    }
    if (segment) {
        segments.push(segment);
        segment = undefined;
    }
    return segments;
}
function addMessageToSegmentLineMap(map, message) {
    if (map.has(message.line)) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        map.get(message.line).push(message);
    }
    else {
        map.set(message.line, [message]);
    }
}
function isLineWithinMinMax(line, min, max, around = LINES_AROUND) {
    return line + around >= min && line - around <= max;
}
