"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_path_1 = require("node:path");
const node_os_1 = require("node:os");
const exec_1 = require("@actions/exec");
const collect_1 = require("./lib/diagnostic/collect");
const render_1 = require("./lib/diagnostic/render");
const core_1 = require("@actions/core");
const node_fs_1 = require("node:fs");
async function action() {
    const dev = __filename.endsWith(".ts");
    const projectDir = process.cwd();
    const inspectionDir = (0, node_path_1.join)(projectDir, ".inspection_results");
    if (!dev) {
        const cwd = process.cwd();
        await generateInspections(cwd);
    }
    const diagnostics = (0, collect_1.collectDiagnostics)(inspectionDir);
    (0, render_1.emitFileDiagnostic)(diagnostics, projectDir);
    if (!dev)
        await (0, node_fs_1.rmSync)(process.cwd() + "/.inspection_results", {
            force: true,
            recursive: true,
        });
    if (diagnostics.some((diagnostic) => diagnostic.error)) {
        (0, core_1.setFailed)("One or more inspections has caused the job to fail, make sure to format your code right and fix errors and warnings in your code.");
        process.exit(1);
    }
    if (diagnostics.length) {
        console.log("Your code is in compliance with the selected inspection profile, but it looks like it could be cleaned up a little bit more :)");
    }
    else {
        console.log("Your code is in complete compliance with the selected inspection profile!");
        console.log();
        console.log("You did a very good job! <3");
    }
}
exports.default = action;
async function generateInspections(cwd) {
    let out = "";
    const code = await (0, exec_1.exec)("idea" + ideaExecExt(), [
        "inspect",
        cwd,
        cwd + "/.idea/inspectionProfiles/Project_Default.xml",
        cwd + "/.inspection_results",
        "-v2",
        "-format",
        "json",
    ], {
        ignoreReturnCode: true,
        silent: true,
        listeners: {
            stdout: (data) => (out += data.toString()),
            stderr: (data) => (out += data.toString()),
        },
    });
    if (code !== 0) {
        (0, core_1.setFailed)(out);
        process.exit(1);
    }
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
