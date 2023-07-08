import action from "./action";
import { setFailed } from "@actions/core";

action().catch(setFailed);
