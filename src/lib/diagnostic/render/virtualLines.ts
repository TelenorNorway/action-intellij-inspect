import type { PrismStyler } from "../../stx";

type VirtualLines = {
	lines: { char: string; styler: PrismStyler }[][];
	x: number;
	y: number;
	styler: PrismStyler;
};

export const normalStyler: PrismStyler = (text) => text;

export function virtualLines(): VirtualLines {
	return {
		lines: [],
		x: 0,
		y: 0,
		styler: normalStyler,
	};
}

export function getStyler(lines: VirtualLines) {
	return lines.styler;
}

export function setStyler(lines: VirtualLines, styler: PrismStyler) {
	lines.styler = styler;
}

export function getX(lines: VirtualLines) {
	return lines.x;
}

export function getY(lines: VirtualLines) {
	return lines.y;
}

export function getPos(lines: VirtualLines): [number, number] {
	return [getX(lines), getY(lines)];
}

export function setPos(lines: VirtualLines, x: number, y: number) {
	x = Math.max(0, x);
	y = Math.max(0, y);
	lines.x = x;
	lines.y = y;
}

export function setX(lines: VirtualLines, x: number) {
	setPos(lines, x, lines.y);
}

export function setY(lines: VirtualLines, y: number) {
	setPos(lines, lines.x, y);
}

export function getLineAt(lines: VirtualLines, y: number) {
	return lines.lines[Math.max(0, y)] ?? [];
}

export function getCharAt(lines: VirtualLines, x: number, y: number) {
	return getLineAt(lines, y)[x]?.char ?? " ";
}

export function getStylerAt(lines: VirtualLines, x: number, y: number) {
	return getLineAt(lines, y)[x]?.styler ?? normalStyler;
}

export function setCharAt(
	lines: VirtualLines,
	x: number,
	y: number,
	char: string,
) {
	if (!lines.lines) lines.lines = [];
	if (!lines.lines[y]) lines.lines[y] = [];
	lines.lines[y][x] = { char, styler: lines.styler };
}

export function replaceCharAt(
	lines: VirtualLines,
	x: number,
	y: number,
	char: string,
) {
	if (!lines.lines) lines.lines = [];
	if (!lines.lines[y]) lines.lines[y] = [];
	if (!lines.lines[y][x]) return;
	lines.lines[y][x].char = char;
}

export function write(lines: VirtualLines, text: string) {
	for (let char of text) {
		if (char === "\r") continue;
		else if (char === "\t") char = "  ";
		else if (char === "\n") {
			lines.x = 0;
			lines.y++;
		}
		setCharAt(lines, lines.x, lines.y, char);
		lines.x++;
	}
}

export function renderToString(lines: VirtualLines) {
	if (!lines.lines) return "";
	let str = "";
	for (let y = 0; y < lines.lines.length; y++) {
		const line = lines.lines[y];
		if (!line) {
			str += "\n";
			continue;
		}
		for (let x = 0; x < line.length; x++) {
			const cell = line[x];
			if (!cell) {
				str += normalStyler(" ");
				continue;
			}
			str += cell.styler(cell.char);
		}
		str += "\n";
	}
	return str.substring(0, str.length - 1);
}
