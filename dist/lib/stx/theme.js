"use strict";
// MIT License James Bradlee 2023
// https://deno.land/x/stx@0.1.1/themes/default.ts?source
Object.defineProperty(exports, "__esModule", { value: true });
exports.combine = exports.rule = exports.hex = exports.matchSome = exports.match = exports.theme = void 0;
// This file has been modified to work for Node.js
const colors_1 = require("./colors");
function theme(...rules) {
    return rules;
}
exports.theme = theme;
function match(classes) {
    const c = classes.split(/\s+/g);
    return (classes) => {
        return c.every((v) => classes.includes(v));
    };
}
exports.match = match;
function matchSome(...classes) {
    const matchers = [];
    for (const cls of classes)
        matchers.push(match(cls));
    return (classes) => matchers.some((match) => match(classes));
}
exports.matchSome = matchSome;
function hexToCode(code) {
    code = code.replace(/^[#]+/g, "");
    let r, g, b;
    if (code.length === 3) {
        r = parseInt(code.substring(0, 1).repeat(2), 16);
        g = parseInt(code.substring(1, 2).repeat(2), 16);
        b = parseInt(code.substring(2, 3).repeat(2), 16);
    }
    else if (code.length === 6) {
        r = parseInt(code.substring(0, 2), 16);
        g = parseInt(code.substring(2, 4), 16);
        b = parseInt(code.substring(4, 6), 16);
    }
    else {
        throw new Error("Invalid hex code!");
    }
    return Number((BigInt(r) << BigInt(16)) | (BigInt(g) << BigInt(8)) | BigInt(b));
}
function hex(code) {
    if (typeof code === "string")
        code = hexToCode(code);
    return (text) => {
        return (0, colors_1.rgb24)(text, code);
    };
}
exports.hex = hex;
function rule(style, ...matchers) {
    matchers = matchers.map((matcher) => {
        if (typeof matcher === "function")
            return matcher;
        return match(matcher);
    });
    return {
        style,
        match: (classes) => 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        matchers.some(((match) => match(classes))),
    };
}
exports.rule = rule;
function combine(...styles) {
    return (text) => styles.reduce((_, style) => style(_), text);
}
exports.combine = combine;
