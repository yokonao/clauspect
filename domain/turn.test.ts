import { expect, test } from "bun:test";
import type { AnyEntry } from "./model/jsonl";
import { buildTurnGroups, displayToolName, summarizeToolInput } from "./turn";

test("MCP tool name renders as server: tool, not the raw mcp__ form", () => {
	expect(displayToolName("mcp__jira__create_issue")).toBe("jira: create_issue");
	expect(displayToolName("Bash")).toBe("Bash");
});

test("MCP tools get no summary — input structure is arbitrary, use the raw view", () => {
	const summary = summarizeToolInput("mcp__jira__create_issue", {
		project_key: "DEMO",
		summary: "Update the docs",
	});
	expect(summary).toBe("");
});

test("AskUserQuestion summary lists question texts, not [object Object]", () => {
	const summary = summarizeToolInput("AskUserQuestion", {
		questions: [{ question: "Adopt?" }, { question: "Deprecate?" }],
	});
	expect(summary).toBe("Adopt? / Deprecate?");
});

test("AskUserQuestion tool block carries the user's chosen answers", () => {
	const entries: AnyEntry[] = [
		{
			type: "assistant",
			parentUuid: null,
			isSidechain: false,
			message: {
				id: "m1",
				type: "message",
				role: "assistant",
				content: [
					{
						type: "tool_use",
						id: "tid",
						name: "AskUserQuestion",
						input: { questions: [{ question: "Adopt?" }] },
					},
				],
			},
		},
		{
			type: "user",
			parentUuid: "m1",
			isSidechain: false,
			message: {
				role: "user",
				content: [
					{
						type: "tool_result",
						tool_use_id: "tid",
						content:
							'Your questions have been answered: "Adopt?"="Yes". Continue.',
					},
				],
			},
		},
	] as unknown as AnyEntry[];

	const groups = buildTurnGroups(entries);
	const tool = groups[0]?.blocks.find((b) => b.kind === "tool");
	expect(tool?.kind === "tool" && tool.tool.answer).toBe("Adopt? → Yes");
});
