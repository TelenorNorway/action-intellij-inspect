"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const problems_1 = require("./lib/problems");
const renderer_1 = require("./lib/renderer");
async function action() {
    const projectDir = process.cwd();
    const inspectionDir = (0, path_1.join)(projectDir, ".inspection_results");
    (0, problems_1.findProblems)(inspectionDir, projectDir);
    (0, renderer_1.render)();
}
exports.default = action;
