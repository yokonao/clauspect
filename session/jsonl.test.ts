import { expect, test } from "bun:test";
import { parseEntries } from "./jsonl";

// Regression guard for schema drift: each line below is a real shape that used
// to fail validation and land in an __error__ entry. They must all parse cleanly.
const base = {
	parentUuid: null,
	isSidechain: false,
	uuid: "u",
	type: "attachment",
};
const att = (attachment: unknown) => JSON.stringify({ ...base, attachment });

const lines = [
	// last-prompt without lastPrompt (leafUuid variant)
	JSON.stringify({ type: "last-prompt", leafUuid: "l", sessionId: "s" }),
	// auto_mode without reminderType
	att({ type: "auto_mode" }),
	// hook_non_blocking_error without command/durationMs
	att({
		type: "hook_non_blocking_error",
		hookName: "Stop",
		hookEvent: "Stop",
		stderr: "boom",
		stdout: "",
		exitCode: 1,
	}),
	// user tool_result whose toolUseResult is an array
	JSON.stringify({
		parentUuid: null,
		isSidechain: false,
		type: "user",
		message: {
			role: "user",
			content: [{ type: "tool_result", tool_use_id: "t", content: "ok" }],
		},
		toolUseResult: [{ type: "text", text: "x" }],
	}),
	// newly-supported attachment types
	att({ type: "agent_listing_delta", addedTypes: ["claude"] }),
	att({ type: "date_change", newDate: "2026-07-05" }),
	att({ type: "dynamic_skill", skillDir: "/d", skillNames: ["a"] }),
	att({ type: "plan_mode", planFilePath: "/p", planExists: false }),
];

test("previously-drifting entry shapes parse without errors", () => {
	const { entries } = parseEntries(lines.join("\n"));
	expect(entries.filter((e) => e.type === "__error__")).toEqual([]);
	expect(entries).toHaveLength(lines.length);
});

test("unparseable and invalid lines become __error__ entries", () => {
	const invalid = '{"type":"nope"}';
	const { entries } = parseEntries(`{bad json\n${invalid}`);
	expect(entries.map((e) => e.type)).toEqual(["__error__", "__error__"]);
	// raw is untouched so the app can re-parse it.
	expect(entries[1]).toMatchObject({ type: "__error__", raw: invalid });
	expect(JSON.parse((entries[1] as { raw: string }).raw)).toEqual({
		type: "nope",
	});
});
