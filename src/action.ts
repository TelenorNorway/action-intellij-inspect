import { join } from "node:path";
import { type } from "node:os";
import { exec } from "@actions/exec";
import { collectDiagnostics } from "./lib/diagnostic/collect";
import { emitFileDiagnostic } from "./lib/diagnostic/render";
import { setFailed } from "@actions/core";
import { rmSync } from "node:fs";

export default async function action() {
	const dev = __filename.endsWith(".ts");

	const projectDir = process.cwd();
	const inspectionDir = join(projectDir, ".inspection_results");

	if (!dev) {
		const cwd = process.cwd();
		await generateInspections(cwd);
	}
	const diagnostics = collectDiagnostics(inspectionDir);
	emitFileDiagnostic(diagnostics, projectDir);
	if (!dev)
		await rmSync(process.cwd() + "/.inspection_results", {
			force: true,
			recursive: true,
		});
	if (diagnostics.some((diagnostic) => diagnostic.error)) {
		setFailed(
			"One or more inspections has caused the job to fail, make sure to format your code right and fix errors and warnings in your code.",
		);
		process.exit(1);
	}
	if (diagnostics.length) {
		console.log(
			"Your code is in compliance with the selected inspection profile, but it looks like it could be cleaned up a little bit more :)",
		);
	} else {
		console.log(
			"Your code is in complete compliance with the selected inspection profile!",
		);
		console.log();
		console.log("You did a very good job! <3");
	}
}

async function generateInspections(cwd: string) {
	let out = "";
	const code = await exec(
		"idea" + ideaExecExt(),
		[
			"inspect",
			cwd,
			cwd + "/.idea/inspectionProfiles/Project_Default.xml",
			cwd + "/.inspection_results",
			"-v2",
			"-format",
			"json",
		],
		{
			ignoreReturnCode: true,
			silent: true,
			listeners: {
				stdout: (data) => (out += data.toString()),
				stderr: (data) => (out += data.toString()),
			},
		},
	);
	if (code !== 0) {
		setFailed(out);
		process.exit(1);
	}
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
