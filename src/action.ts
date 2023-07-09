import { join } from "node:path";
import { type } from "node:os";
import { exec } from "@actions/exec";
import { rmRF } from "@actions/io";
import { collectDiagnostics } from "./lib/diagnostic/collect";
import { emitFileDiagnostic } from "./lib/diagnostic/render";
import { setFailed } from "@actions/core";

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
	if (!dev) await rmRF(process.cwd() + "/.inspection_results");
	if (diagnostics.some((diagnostic) => diagnostic.error)) {
		setFailed(
			"One or more inspections has caused the job to fail, make sure to format your code right and fix errors and warnings in your code.",
		);
		process.exit(1);
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
