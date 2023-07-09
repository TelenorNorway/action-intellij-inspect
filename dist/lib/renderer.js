"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.render = void 0;
const stx_1 = require("./stx");
const problems_1 = require("./problems");
const colors_1 = require("./stx/colors");
const defaultCursorStyle = (0, stx_1.hex)("#AAAAAA");
const warningColor = (0, stx_1.hex)("#EE6C4D");
const errorColor = (0, stx_1.hex)("#FB4B4E");
const informationColor = (0, stx_1.hex)("#427AA1");
const grammarErrorColor = (0, stx_1.hex)("#A5BE00");
const typoColor = (0, stx_1.hex)("#679436");
const weakWarningColor = (0, stx_1.hex)("#F79D5C");
const defaultLineNumberStyle = (text) => (0, colors_1.brightWhite)(text);
const cursorStyles = {
    WARNING: warningColor,
    "WEAK WARNING": weakWarningColor,
    ERROR: errorColor,
    INFORMATION: informationColor,
    GRAMMAR_ERROR: grammarErrorColor,
    TYPO: typoColor,
    // "TEXT ATTRIBUTES": hex("#000000"),
    INFO: informationColor,
};
function styleFor(severity) {
    return cursorStyles[severity] || defaultCursorStyle;
}
const HOR_LINE = "─";
const VER_LINE = "│";
const MID_DOWN = "┬";
const MIDDLE_U = "┴";
const MIDDLE_A = "┼";
const protectLinesAround = 2;
function render() {
    var _a, _b, _c, _d;
    var _e, _f;
    let longestLineNumber = 4;
    let longestLine = 0;
    for (const file of problems_1.fileOrder) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const source = problems_1.fileToProblemSource.get(file);
        longestLineNumber = Math.max(longestLineNumber, (1 + source.code.length).toString().length);
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
                (_a = (_e = source.linesToProblem)[_f = problem.line]) !== null && _a !== void 0 ? _a : (_e[_f] = []);
                source.linesToProblem[problem.line].push(problem);
            }
        }
        for (let i = 0; i < source.protectedLines.length; i++) {
            if (source.protectedLines[i]) {
                source.protectedLinesArr.push(i);
            }
        }
    }
    const fileHeaderTop = HOR_LINE.repeat(longestLineNumber + 2) +
        MID_DOWN +
        HOR_LINE.repeat(longestLine + 2);
    const fileHeaderBottom = HOR_LINE.repeat(longestLineNumber + 2) +
        MIDDLE_A +
        HOR_LINE.repeat(longestLine + 2);
    const fileContentBottom = HOR_LINE.repeat(longestLineNumber + 2) +
        MIDDLE_U +
        HOR_LINE.repeat(longestLine + 2);
    const emptyLine = "\n" +
        HOR_LINE.repeat(longestLineNumber + 2) +
        MIDDLE_A +
        HOR_LINE.repeat(longestLine + 2);
    for (const file of problems_1.fileOrder) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const source = problems_1.fileToProblemSource.get(file);
        const fileHeaderMiddle = ` ${"File".padStart(longestLineNumber)} ${VER_LINE} ${file}`;
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
                    (hasProblem ? defaultLineNumberStyle : defaultCursorStyle)((1 + line).toString().padStart(longestLineNumber)) +
                    " " +
                    VER_LINE +
                    " " +
                    (((_b = source.highlightedCode) === null || _b === void 0 ? void 0 : _b[line]) || source.code[line]);
            if (hasProblem) {
                const columnsAlts = new Array(longestLine).fill(false).map(() => []);
                for (const problem of source.linesToProblem[line]) {
                    const obj = {
                        weight: (0, problems_1.weightOf)(problem.severity),
                        style: styleFor(problem.severity),
                    };
                    for (let i = 0; i < problem.length; i++) {
                        (_d = (_c = columnsAlts[problem.startsAt + i]) === null || _c === void 0 ? void 0 : _c.push) === null || _d === void 0 ? void 0 : _d.call(_c, obj);
                    }
                }
                const columns = columnsAlts
                    .map((column, index) => {
                    var _a, _b, _c, _d, _e, _f, _g;
                    return (_g = (_d = (_c = (_b = (_a = column.sort((a, b) => b.weight - a.weight)) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.style) === null || _c === void 0 ? void 0 : _c.call(_b, "^")) !== null && _d !== void 0 ? _d : (_f = (_e = source.originalCode
                        .at(line)) === null || _e === void 0 ? void 0 : _e.at(index)) === null || _f === void 0 ? void 0 : _f.replace(/\t/g, "  ").replace(/[^ ]/g, " ")) !== null && _g !== void 0 ? _g : "";
                })
                    .join("");
                str +=
                    "\n" + "".padStart(longestLineNumber + 2) + VER_LINE + " " + columns;
            }
        }
        console.log((0, colors_1.white)(str + "\n" + fileContentBottom) + "\u001b[0m");
        for (const problem of source.problems) {
            console.debug("%s:%d:%d-%d: %s", file, problem.line, problem.startsAt, problem.startsAt + problem.length, problem.message
                .replace(/<code>/g, "\u001b[100;97;m")
                .replace(/<\/code>/g, "\u001b[0m"));
        }
        console.log("");
    }
}
exports.render = render;
