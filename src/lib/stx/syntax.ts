// MIT License James Bradlee 2023
// https://deno.land/x/stx@0.1.1/themes/default.ts?source

// This file has been modified to work for Node.js

import type { PrismTheme } from "./theme";
import Prism from "prismjs";
import { JSDOM } from "jsdom";
import "./components";
import { white } from "./colors";

function processNodeTree(
	theme: PrismTheme,
	nodes: NodeListOf<ChildNode>,
	classes: string[] = [],
) {
	let output = "";
	for (const node of nodes) {
		if (node.nodeName === "#text") {
			output += theme
				.filter((rule) => rule.match(classes))
				.reduce((text, rule) => rule.style(text || ""), node.textContent);
		} else {
			const classes: string[] =
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				((node as any).attributes as NamedNodeMap)
					.getNamedItem("class")
					?.value.split(" ") || [];
			output += processNodeTree(theme, node.childNodes, classes);
		}
	}
	return output;
}

export function highlight(
	theme: PrismTheme,
	language: string,
	text: string,
): string {
	const doc = new JSDOM(
		Prism.highlight(text, Prism.languages[language], language),
	);
	return white(processNodeTree(theme, doc.window.document.body.childNodes));
}

export const languages = Prism.languages;
