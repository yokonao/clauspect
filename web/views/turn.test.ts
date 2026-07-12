import { expect, test } from "bun:test";
import type { AnyEntry } from "../../domain/model/jsonl";
import { buildTurnGroups } from "./turn";

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
	const group = groups[0];
	const tool =
		group?.kind === "turn"
			? group.blocks.find((b) => b.kind === "tool")
			: undefined;
	expect(tool?.kind === "tool" && tool.tool.answer).toEqual([
		{ question: "Adopt?", answer: "Yes" },
	]);
});

test("a PostToolUse hook attaches to the turn without breaking it", () => {
	const entries: AnyEntry[] = [
		{
			type: "user",
			parentUuid: null,
			isSidechain: false,
			message: { role: "user", content: "prompt" },
		},
		{
			type: "assistant",
			parentUuid: null,
			isSidechain: false,
			message: {
				id: "m1",
				type: "message",
				role: "assistant",
				content: [{ type: "tool_use", id: "tid", name: "Read", input: {} }],
			},
		},
		{
			type: "attachment",
			parentUuid: "m1",
			isSidechain: false,
			attachment: {
				type: "hook_success",
				hookName: "guard",
				hookEvent: "PostToolUse",
				content: "checked",
				stdout: "checked",
				stderr: "",
				exitCode: 0,
				command: "./guard.sh",
				durationMs: 3,
			},
		},
		{
			type: "assistant",
			parentUuid: "m1",
			isSidechain: false,
			message: {
				id: "m2",
				type: "message",
				role: "assistant",
				content: [{ type: "text", text: "done" }],
			},
		},
	] as unknown as AnyEntry[];

	const groups = buildTurnGroups(entries);
	expect(groups).toHaveLength(1);
	const g = groups[0];
	if (g?.kind !== "turn") throw new Error("expected a turn");
	expect(g.blocks.map((b) => b.kind)).toEqual(["tool", "hook", "text"]);
	const hook = g.blocks[1];
	expect(hook?.kind === "hook" && hook.hook.event).toBe("PostToolUse");
});

function hookAttachment(event: string): AnyEntry {
	return {
		type: "attachment",
		parentUuid: null,
		isSidechain: false,
		attachment: {
			type: "hook_success",
			hookName: event,
			hookEvent: event,
			content: "OK",
			stdout: "OK",
			stderr: "",
			exitCode: 0,
			command: "./hook.sh",
			durationMs: 1,
		},
	} as unknown as AnyEntry;
}

test("UserPromptSubmit hook lands on the user side, not the assistant blocks", () => {
	const entries: AnyEntry[] = [
		{
			type: "user",
			parentUuid: null,
			isSidechain: false,
			message: { role: "user", content: "prompt" },
		},
		hookAttachment("UserPromptSubmit"),
		{
			type: "assistant",
			parentUuid: null,
			isSidechain: false,
			message: {
				id: "m1",
				type: "message",
				role: "assistant",
				content: [{ type: "text", text: "done" }],
			},
		},
	] as unknown as AnyEntry[];

	const groups = buildTurnGroups(entries);
	expect(groups).toHaveLength(1);
	const g = groups[0];
	if (g?.kind !== "turn") throw new Error("expected a turn");
	expect(g.userHooks.map((h) => h.event)).toEqual(["UserPromptSubmit"]);
	expect(g.blocks.map((b) => b.kind)).toEqual(["text"]);
});

test("SessionStart hook becomes its own frame, not a turn", () => {
	const entries: AnyEntry[] = [
		hookAttachment("SessionStart"),
		{
			type: "user",
			parentUuid: null,
			isSidechain: false,
			message: { role: "user", content: "prompt" },
		},
	] as unknown as AnyEntry[];

	const groups = buildTurnGroups(entries);
	expect(groups.map((g) => g.kind)).toEqual(["session-hook", "turn"]);
	const first = groups[0];
	expect(first?.kind === "session-hook" && first.hook.event).toBe(
		"SessionStart",
	);
});

test("meta entries and tool_result carriers don't start a turn", () => {
	const entries: AnyEntry[] = [
		{
			type: "user",
			parentUuid: null,
			isSidechain: false,
			message: { role: "user", content: "real prompt" },
		},
		{
			type: "assistant",
			parentUuid: null,
			isSidechain: false,
			message: {
				id: "m1",
				type: "message",
				role: "assistant",
				content: [{ type: "tool_use", id: "tid", name: "Read", input: {} }],
			},
		},
		{
			type: "user",
			parentUuid: "m1",
			isSidechain: false,
			message: {
				role: "user",
				content: [{ type: "tool_result", tool_use_id: "tid", content: "ok" }],
			},
		},
		{
			type: "user",
			parentUuid: null,
			isSidechain: false,
			isMeta: true,
			message: { role: "user", content: "## Context Usage\n..." },
		},
		{
			type: "assistant",
			parentUuid: "m1",
			isSidechain: false,
			message: {
				id: "m2",
				type: "message",
				role: "assistant",
				content: [{ type: "text", text: "done" }],
			},
		},
	] as unknown as AnyEntry[];

	const groups = buildTurnGroups(entries);
	expect(groups).toHaveLength(1);
	const g = groups[0];
	expect(g?.kind === "turn" && g.userText).toEqual(["real prompt"]);
	expect(g?.kind === "turn" && g.blocks.length).toBe(2);
});
