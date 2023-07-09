// MIT License James Bradlee 2023
// https://deno.land/x/stx@0.1.1/themes/default.ts?source

// This file has been modified to work for Node.js

import { hex, rule, theme } from "../theme";
import { bold, italic } from "../colors";

const green = hex("#4CAF50");
const softerRed = hex("#F09483");
const teal = hex("#25B0BC");
const softerOrange = hex("#FAC29A");
const softRed = hex("#E95678");
const softOrange = hex("#FAB795");
const violet = hex("#B877DB");
const gray = hex("#BBBBBB");

export default theme(
	rule(
		green,
		"comment",
		"block-comment",
		"inserted",
		"string",
		"char",
		"cdata",
	),
	rule(softerRed, "variable", "property", "namespace"),
	rule(softRed, "deleted", "prolog", "tag"),
	rule(teal, "function", "entity"),
	rule(
		softerOrange,
		"builtin",
		"class-name",
		"symbol",
		"constant",
		"attr-value",
	),
	rule(softOrange, "boolean", "number", "regex", "attr-name"),
	rule(violet, "keyword", "atrule", "selector"),
	rule(gray, (classes) => classes.length === 0, "operator", "punctuation"),
	rule(bold, "bold", "important"),
	rule(italic, "italic"),
);
