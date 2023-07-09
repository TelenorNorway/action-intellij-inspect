"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_path_1 = require("node:path");
const node_os_1 = require("node:os");
const exec_1 = require("@actions/exec");
const problems_1 = require("./lib/problems");
const renderer_1 = require("./lib/renderer");
const io_1 = require("@actions/io");
async function action() {
    const projectDir = process.cwd();
    const inspectionDir = (0, node_path_1.join)(projectDir, ".inspection_results");
    const cwd = process.cwd();
    await generateInspections(cwd);
    (0, problems_1.findProblems)(inspectionDir, projectDir);
    (0, renderer_1.render)();
    await (0, io_1.rmRF)(process.cwd() + "/.inspection_results");
}
exports.default = action;
async function generateInspections(cwd) {
    await (0, exec_1.exec)("idea" + ideaExecExt(), [
        "inspect",
        cwd + "/.idea/inspectionProfiles/Project_Default.xml",
        cwd + "/.inspection_results",
        "-v2",
        "-format",
        "json",
    ], {
        silent: true,
        ignoreReturnCode: true,
    });
}
function ideaExecExt(os = (0, node_os_1.type)()) {
    switch (os) {
        case "Linux":
            return ".sh";
        case "Darwin":
            return "";
        case "Windows":
            return ".exe";
        default:
            throw new Error(`Unsupported os '${os}'`);
    }
}
