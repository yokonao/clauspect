import { expect, test } from "bun:test";
import { displayToolName, toolSummary } from "./format";

test("MCP tool name renders as server: tool, not the raw mcp__ form", () => {
	expect(displayToolName("mcp__jira__create_issue")).toBe("jira: create_issue");
	expect(displayToolName("Bash")).toBe("Bash");
});

test("toolSummary truncates capped tools but leaves Bash commands whole", () => {
	const cmd = "x".repeat(200);
	expect(toolSummary("Bash", { command: cmd })).toBe(cmd);

	const desc = "y".repeat(200);
	expect(toolSummary("Agent", { description: desc })).toBe(
		`${"y".repeat(100)}…`,
	);
});
