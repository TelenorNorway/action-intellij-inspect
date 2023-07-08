import { add } from "./add";

describe("add function", () => {
	it("adds 1 + 2 to equal 3", () => {
		expect(add(1, 2)).toBe(3);
	});
});
