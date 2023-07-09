"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderToString = exports.write = exports.replaceCharAt = exports.setCharAt = exports.getStylerAt = exports.getCharAt = exports.getLineAt = exports.setY = exports.setX = exports.setPos = exports.getPos = exports.getY = exports.getX = exports.setStyler = exports.getStyler = exports.virtualLines = exports.normalStyler = void 0;
const normalStyler = (text) => text;
exports.normalStyler = normalStyler;
function virtualLines() {
    return {
        lines: [],
        x: 0,
        y: 0,
        styler: exports.normalStyler,
    };
}
exports.virtualLines = virtualLines;
function getStyler(lines) {
    return lines.styler;
}
exports.getStyler = getStyler;
function setStyler(lines, styler) {
    lines.styler = styler;
}
exports.setStyler = setStyler;
function getX(lines) {
    return lines.x;
}
exports.getX = getX;
function getY(lines) {
    return lines.y;
}
exports.getY = getY;
function getPos(lines) {
    return [getX(lines), getY(lines)];
}
exports.getPos = getPos;
function setPos(lines, x, y) {
    x = Math.max(0, x);
    y = Math.max(0, y);
    lines.x = x;
    lines.y = y;
}
exports.setPos = setPos;
function setX(lines, x) {
    setPos(lines, x, lines.y);
}
exports.setX = setX;
function setY(lines, y) {
    setPos(lines, lines.x, y);
}
exports.setY = setY;
function getLineAt(lines, y) {
    var _a;
    return (_a = lines.lines[Math.max(0, y)]) !== null && _a !== void 0 ? _a : [];
}
exports.getLineAt = getLineAt;
function getCharAt(lines, x, y) {
    var _a, _b;
    return (_b = (_a = getLineAt(lines, y)[x]) === null || _a === void 0 ? void 0 : _a.char) !== null && _b !== void 0 ? _b : " ";
}
exports.getCharAt = getCharAt;
function getStylerAt(lines, x, y) {
    var _a, _b;
    return (_b = (_a = getLineAt(lines, y)[x]) === null || _a === void 0 ? void 0 : _a.styler) !== null && _b !== void 0 ? _b : exports.normalStyler;
}
exports.getStylerAt = getStylerAt;
function setCharAt(lines, x, y, char) {
    if (!lines.lines)
        lines.lines = [];
    if (!lines.lines[y])
        lines.lines[y] = [];
    lines.lines[y][x] = { char, styler: lines.styler };
}
exports.setCharAt = setCharAt;
function replaceCharAt(lines, x, y, char) {
    if (!lines.lines)
        lines.lines = [];
    if (!lines.lines[y])
        lines.lines[y] = [];
    if (!lines.lines[y][x])
        return;
    lines.lines[y][x].char = char;
}
exports.replaceCharAt = replaceCharAt;
function write(lines, text) {
    for (let char of text) {
        if (char === "\r")
            continue;
        else if (char === "\t")
            char = "  ";
        else if (char === "\n") {
            lines.x = 0;
            lines.y++;
        }
        setCharAt(lines, lines.x, lines.y, char);
        lines.x++;
    }
}
exports.write = write;
function renderToString(lines) {
    if (!lines.lines)
        return "";
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
                str += (0, exports.normalStyler)(" ");
                continue;
            }
            str += cell.styler(cell.char);
        }
        str += "\n";
    }
    return str.substring(0, str.length - 1);
}
exports.renderToString = renderToString;
