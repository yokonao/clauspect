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
	const tool = groups[0]?.blocks.find((b) => b.kind === "tool");
	expect(tool?.kind === "tool" && tool.tool.answer).toBe("Adopt? → Yes");
});
