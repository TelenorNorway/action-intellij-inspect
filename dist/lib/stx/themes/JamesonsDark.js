"use strict";
// MIT License James Bradlee 2023
// https://deno.land/x/stx@0.1.1/themes/default.ts?source
Object.defineProperty(exports, "__esModule", { value: true });
// This file has been modified to work for Node.js
const theme_1 = require("../theme");
const colors_1 = require("../colors");
const green = (0, theme_1.hex)("#4CAF50");
const softerRed = (0, theme_1.hex)("#F09483");
const teal = (0, theme_1.hex)("#25B0BC");
const softerOrange = (0, theme_1.hex)("#FAC29A");
const softRed = (0, theme_1.hex)("#E95678");
const softOrange = (0, theme_1.hex)("#FAB795");
const violet = (0, theme_1.hex)("#B877DB");
const gray = (0, theme_1.hex)("#BBBBBB");
exports.default = (0, theme_1.theme)((0, theme_1.rule)(green, "comment", "block-comment", "inserted", "string", "char", "cdata"), (0, theme_1.rule)(softerRed, "variable", "property", "namespace"), (0, theme_1.rule)(softRed, "deleted", "prolog", "tag"), (0, theme_1.rule)(teal, "function", "entity"), (0, theme_1.rule)(softerOrange, "builtin", "class-name", "symbol", "constant", "attr-value"), (0, theme_1.rule)(softOrange, "boolean", "number", "regex", "attr-name"), (0, theme_1.rule)(violet, "keyword", "atrule", "selector"), (0, theme_1.rule)(gray, (classes) => classes.length === 0, "operator", "punctuation"), (0, theme_1.rule)(colors_1.bold, "bold", "important"), (0, theme_1.rule)(colors_1.italic, "italic"));
