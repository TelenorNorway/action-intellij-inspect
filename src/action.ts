import { join } from "node:path";
import { type } from "node:os";
import { exec } from "@actions/exec";
import { findProblems } from "./lib/problems";
import { render } from "./lib/renderer";
import { rmRF } from "@actions/io";

export default async function action() {
	const projectDir = process.cwd();
	const inspectionDir = join(projectDir, ".inspection_results");

	await generateInspections();
	findProblems(inspectionDir, projectDir);
	render();
	await rmRF(process.cwd() + "/.inspection_results");
}

async function generateInspections() {
	await exec(
		"idea" + ideaExecExt(),
		[
			"inspect",
			".idea/inspectionProfiles/Project_Default.xml",
			".inspection_results",
			"-v2",
			"-format",
			"json",
		],
		{
			listeners: { stdout: (data) => (out += data.toString()) },
			silent: true,
			ignoreReturnCode: true,
		},
	);
}

function ideaExecExt(os = type()) {
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
