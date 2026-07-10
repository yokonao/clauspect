import { expect, test } from "bun:test";
import { toolInputText } from "./tool";

test("MCP tools get no summary text — input structure is arbitrary, use the raw view", () => {
	const text = toolInputText("mcp__jira__create_issue", {
		project_key: "DEMO",
		summary: "Update the docs",
	});
	expect(text).toBe("");
});

test("AskUserQuestion text lists question texts, not [object Object]", () => {
	const text = toolInputText("AskUserQuestion", {
		questions: [{ question: "Adopt?" }, { question: "Deprecate?" }],
	});
	expect(text).toBe("Adopt? / Deprecate?");
});

test("toolInputText does not truncate — search indexes the full command", () => {
	const cmd = "echo ".repeat(40).trim();
	expect(toolInputText("Bash", { command: cmd })).toBe(cmd);
});
