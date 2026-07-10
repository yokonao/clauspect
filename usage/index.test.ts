import { expect, test } from "bun:test";
import type { AnyEntry } from "../session/jsonl";
import { aggregateUsage, cacheHitRate, totalToolCalls } from ".";

function assistant(
	usage: Record<string, unknown> | undefined,
	tools: string[] = [],
	model = "claude-opus-4-8",
): AnyEntry {
	return {
		type: "assistant",
		parentUuid: null,
		isSidechain: false,
		message: {
			id: "m",
			type: "message",
			role: "assistant",
			model,
			content: tools.map((name) => ({
				type: "tool_use",
				id: `t-${name}`,
				name,
				input: {},
			})),
			usage: usage as never,
		},
	} as AnyEntry;
}

test("sums top-level usage and counts tools across assistant entries", () => {
	const stats = aggregateUsage([
		assistant(
			{
				input_tokens: 100,
				output_tokens: 20,
				cache_read_input_tokens: 900,
				cache_creation_input_tokens: 50,
			},
			["Bash", "Read"],
		),
		assistant(
			{
				input_tokens: 10,
				output_tokens: 5,
				server_tool_use: { web_search_requests: 2 },
			},
			["Bash"],
		),
	]);

	expect(stats.inputTokens).toBe(110);
	expect(stats.outputTokens).toBe(25);
	expect(stats.cacheReadTokens).toBe(900);
	expect(stats.cacheCreationTokens).toBe(50);
	expect(stats.messages).toBe(2);
	expect(stats.webSearchRequests).toBe(2);
	expect(stats.toolCounts).toEqual({ Bash: 2, Read: 1 });
	expect(totalToolCalls(stats)).toBe(3);
});

test("iterations are ignored so per-response breakdowns are not double counted", () => {
	const stats = aggregateUsage([
		assistant({
			input_tokens: 100,
			output_tokens: 40,
			iterations: [
				{ input_tokens: 60, output_tokens: 20 },
				{ input_tokens: 40, output_tokens: 20 },
			],
		}),
	]);
	expect(stats.inputTokens).toBe(100);
	expect(stats.outputTokens).toBe(40);
});

test("assistant entries without usage still contribute tool counts", () => {
	const stats = aggregateUsage([assistant(undefined, ["Edit"])]);
	expect(stats.messages).toBe(0);
	expect(stats.toolCounts).toEqual({ Edit: 1 });
});

test("cacheHitRate is cache reads over the whole input surface", () => {
	const stats = aggregateUsage([
		assistant({
			input_tokens: 100,
			output_tokens: 0,
			cache_read_input_tokens: 300,
			cache_creation_input_tokens: 100,
		}),
	]);
	expect(cacheHitRate(stats)).toBeCloseTo(0.6);
	expect(cacheHitRate(aggregateUsage([]))).toBe(0);
});
