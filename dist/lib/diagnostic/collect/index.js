"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectDiagnostics = void 0;
const fs_1 = require("fs");
const common_1 = require("../common");
const path_1 = require("path");
function collectDiagnostics(inspectionDir) {
    return transformInspectionFilesToFileDiagnostics(readInspectionFiles(getInspectionFiles(inspectionDir))).map(removeDollarProjectPrefixFromFileNames);
}
exports.collectDiagnostics = collectDiagnostics;
function removeDollarProjectPrefixFromFileNames(diagnostic) {
    diagnostic.file = diagnostic.file.substring(21);
    return diagnostic;
}
function getInspectionFiles(inspectionDir) {
    return (0, fs_1.readdirSync)(inspectionDir)
        .filter((name) => !name.startsWith(".") &&
        name.endsWith(".json") &&
        name !== "DuplicatedCode_aggregate.json" &&
        name !== "VulnerableLibrariesGlobal.json" &&
        name !== "SpellCheckingInspection.json" &&
        (0, fs_1.lstatSync)((0, path_1.join)(inspectionDir, name)).isFile)
        .map((name) => (0, path_1.join)(inspectionDir, name));
}
function readInspectionFiles(files) {
    return files.map((path) => {
        try {
            return JSON.parse((0, fs_1.readFileSync)(path).toString());
        }
        catch (ex) {
            console.error(path, ex);
            return { problems: [] };
        }
    });
}
function getFileDiagnosticsByProblem(fileDiagnostics, problem) {
    if (!fileDiagnostics.has(problem.file)) {
        const file = {
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
    return fileDiagnostics.get(problem.file);
}
function transformProblemToDiagnosticMessage(problem) {
    return {
        line: problem.line--,
        offset: problem.offset,
        length: problem.length,
        name: problem.problem_class.name,
        message: problem.description,
        severity: problem.problem_class.severity,
        weight: (0, common_1.weightOfSeverity)(problem.problem_class.severity),
    };
}
function addProblemToFileDiagnostic(fileDiagnostic, problem) {
    const message = transformProblemToDiagnosticMessage(problem);
    fileDiagnostic.weight += message.weight;
    fileDiagnostic.error =
        fileDiagnostic.error || (0, common_1.isSeverityAnError)(message.severity);
    fileDiagnostic.messages.push(message);
}
function messageDiagnosticSort(a, b) {
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
                : weightDiff;
}
function fileDiagnosticSort(a, b) {
    const weightDiff = b.weight - a.weight;
    const nameDiff = b.file.localeCompare(a.file);
    return weightDiff === 0 ? nameDiff : weightDiff;
}
function transformInspectionFilesToFileDiagnostics(inspections, fileDiagnostics = new Map()) {
    for (const inspection of inspections) {
        for (const problem of inspection.problems) {
            const fileDiagnostic = getFileDiagnosticsByProblem(fileDiagnostics, problem);
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
