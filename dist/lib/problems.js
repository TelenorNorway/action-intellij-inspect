"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findProblems = exports.weightOf = exports.fileOrder = exports.severityCount = exports.fileToProblemSource = void 0;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const stx_1 = require("./stx");
// API
exports.fileToProblemSource = new Map();
exports.severityCount = {};
exports.fileOrder = [];
function highlightCode(code, language) {
    try {
        return (0, stx_1.highlight)(stx_1.defaultTheme, language, code);
    }
    catch (_a) {
        return;
    }
}
const levelWeight = {
    ERROR: 900,
    WARNING: 800,
    "WEAK WARNING": 700,
    GRAMMAR_ERROR: 0,
    INFORMATION: 100,
    INFO: 100,
    TYPO: 0,
};
function weightOf(severity) {
    return levelWeight[severity] || 0;
}
exports.weightOf = weightOf;
function insertProblemSourceOf(projectDir, file, language) {
    var _a;
    const path = (0, node_path_1.join)(projectDir, file);
    const fileContent = (0, node_fs_1.readFileSync)(path).toString();
    const originalCode = fileContent.split(/\r?\n/g);
    const modifiedCode = fileContent.replace(/\t/g, "  ");
    const code = modifiedCode.split(/\r?\n/g);
    const source = {
        file,
        problems: [],
        code,
        originalCode,
        highlightedCode: (_a = highlightCode(modifiedCode, language)) === null || _a === void 0 ? void 0 : _a.split(/\r?\n/g),
        protectedLines: new Array(code.length).fill(false),
        weight: 0,
        protectedLinesArr: [],
        linesToProblem: [],
    };
    exports.fileToProblemSource.set(file, source);
    return source;
}
function insertProblem(projectDir, problem) {
    var _a;
    exports.severityCount[problem.problem_class.severity] =
        ((_a = exports.severityCount[problem.problem_class.severity]) !== null && _a !== void 0 ? _a : 0) + 1;
    const source = exports.fileToProblemSource.has(problem.file)
        ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            exports.fileToProblemSource.get(problem.file)
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
function findProblems(inspectionDir, projectDir) {
    for (const name of (0, node_fs_1.readdirSync)(inspectionDir)) {
        const path = (0, node_path_1.join)(inspectionDir, name);
        if (name.startsWith(".") ||
            !name.endsWith(".json") ||
            !(0, node_fs_1.lstatSync)((0, node_path_1.join)(inspectionDir, name)).isFile()) {
            continue;
        }
        const contents = JSON.parse((0, node_fs_1.readFileSync)(path).toString());
        if (!contents.problems || !contents.problems.length)
            continue;
        for (const problem of contents.problems) {
            problem.file = problem.file.substring(21);
            problem.line--;
            insertProblem(projectDir, problem);
        }
    }
    const arr = [];
    for (const [, source] of exports.fileToProblemSource) {
        arr.push({ file: source.file, weight: source.weight });
        source.problems = source.problems.sort((a, b) => {
            const lineDiff = a.line - b.line;
            const startDiff = b.startsAt - a.startsAt;
            return lineDiff === 0 ? startDiff : lineDiff;
        });
    }
    exports.fileOrder.push(...arr
        .sort((a, b) => {
        const weightDiff = b.weight - a.weight;
        const nameDiff = b.file.localeCompare(a.file);
        return weightDiff === 0 ? nameDiff : weightDiff;
    })
        .map((o) => o.file));
}
exports.findProblems = findProblems;
