import { join } from "path";
import { findProblems } from "./lib/problems";
import { render } from "./lib/renderer";

export default async function action() {
	const projectDir = process.cwd();
	const inspectionDir = join(projectDir, ".inspection_results");

	findProblems(inspectionDir, projectDir);
	render();
}
