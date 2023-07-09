"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const action_1 = __importDefault(require("./action"));
const core_1 = require("@actions/core");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fail(error) {
    console.log(error);
    (0, core_1.setFailed)(error);
}
(0, action_1.default)().catch(fail);
