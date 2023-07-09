"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSeverityAnError = exports.weightOfSeverity = void 0;
const severityWeight = {
    TYPO: 1,
    INFO: 0,
    INFORMATION: 0,
    GRAMMAR_ERROR: 1,
    "WEAK WARNING": 100,
    WARNING: 1000,
    ERROR: 1000000000,
};
const severityToIsError = {
    TYPO: false,
    INFO: false,
    INFORMATION: false,
    GRAMMAR_ERROR: false,
    "WEAK WARNING": false,
    WARNING: true,
    ERROR: true,
};
const weightOfSeverity = (severity) => { var _a; return (_a = severityWeight[severity]) !== null && _a !== void 0 ? _a : 0; };
exports.weightOfSeverity = weightOfSeverity;
const isSeverityAnError = (severity) => { var _a; return (_a = severityToIsError[severity]) !== null && _a !== void 0 ? _a : false; };
exports.isSeverityAnError = isSeverityAnError;
