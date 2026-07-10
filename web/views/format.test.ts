import { expect, test } from "bun:test";
import { displayToolName } from "./format";

test("MCP tool name renders as server: tool, not the raw mcp__ form", () => {
	expect(displayToolName("mcp__jira__create_issue")).toBe("jira: create_issue");
	expect(displayToolName("Bash")).toBe("Bash");
});
