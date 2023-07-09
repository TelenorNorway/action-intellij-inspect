import action from "./action";
import { setFailed } from "@actions/core";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fail(error: any) {
	console.log(error);
	setFailed(error);
}

action().catch(fail);
