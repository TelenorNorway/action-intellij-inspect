// MIT License James Bradlee 2023
// https://deno.land/x/stx@0.1.1/themes/default.ts?source

// This file has been modified to work for Node.js

import { rgb24 } from "./colors";

export type PrismRuleMatcher = (classes: string[]) => boolean;
export type PrismStyler = (text: string) => string;
export interface PrismThemeRule {
	match: PrismRuleMatcher;
	style: PrismStyler;
}
export type PrismTheme = PrismThemeRule[];

export function theme(...rules: PrismThemeRule[]): PrismTheme {
	return rules;
}

export function match(classes: string): PrismRuleMatcher {
	const c = classes.split(/\s+/g);
	return (classes: string[]) => {
		return c.every((v) => classes.includes(v));
	};
}

export function matchSome(...classes: string[]): PrismRuleMatcher {
	const matchers: PrismRuleMatcher[] = [];
	for (const cls of classes) matchers.push(match(cls));
	return (classes: string[]) => matchers.some((match) => match(classes));
}

function hexToCode(code: string): number {
	code = code.replace(/^[#]+/g, "");
	let r: number, g: number, b: number;
	if (code.length === 3) {
		r = parseInt(code.substring(0, 1).repeat(2), 16);
		g = parseInt(code.substring(1, 2).repeat(2), 16);
		b = parseInt(code.substring(2, 3).repeat(2), 16);
	} else if (code.length === 6) {
		r = parseInt(code.substring(0, 2), 16);
		g = parseInt(code.substring(2, 4), 16);
		b = parseInt(code.substring(4, 6), 16);
	} else {
		throw new Error("Invalid hex code!");
	}
	return Number(
		(BigInt(r) << BigInt(16)) | (BigInt(g) << BigInt(8)) | BigInt(b),
	);
}

export function hex(code: string | number): PrismStyler {
	if (typeof code === "string") code = hexToCode(code);
	return (text: string) => {
		return rgb24(text, code as number);
	};
}

export function rule(
	style: PrismStyler,
	...matchers: (string | PrismRuleMatcher)[]
): PrismThemeRule {
	matchers = matchers.map((matcher) => {
		if (typeof matcher === "function") return matcher;
		return match(matcher);
	}) as PrismRuleMatcher[];
	return {
		style,
		match: (classes: string[]) =>
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			matchers.some(((match: PrismRuleMatcher) => match(classes)) as any),
	};
}

export function combine(...styles: PrismStyler[]) {
	return (text: string) => styles.reduce((_, style) => style(_), text);
}
