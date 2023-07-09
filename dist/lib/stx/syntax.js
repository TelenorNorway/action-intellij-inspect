"use strict";
// MIT License James Bradlee 2023
// https://deno.land/x/stx@0.1.1/themes/default.ts?source
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.languages = exports.highlight = void 0;
const prismjs_1 = __importDefault(require("prismjs"));
const jsdom_1 = require("jsdom");
require("./components");
const colors_1 = require("./colors");
function processNodeTree(theme, nodes, classes = []) {
    var _a;
    let output = "";
    for (const node of nodes) {
        if (node.nodeName === "#text") {
            output += theme
                .filter((rule) => rule.match(classes))
                .reduce((text, rule) => rule.style(text || ""), node.textContent);
        }
        else {
            const classes = 
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ((_a = node.attributes
                .getNamedItem("class")) === null || _a === void 0 ? void 0 : _a.value.split(" ")) || [];
            output += processNodeTree(theme, node.childNodes, classes);
        }
    }
    return output;
}
function highlight(theme, language, text) {
    const doc = new jsdom_1.JSDOM(prismjs_1.default.highlight(text, prismjs_1.default.languages[language], language));
    return (0, colors_1.white)(processNodeTree(theme, doc.window.document.body.childNodes));
}
exports.highlight = highlight;
exports.languages = prismjs_1.default.languages;
