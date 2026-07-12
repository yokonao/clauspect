import type {
	AnyEntry,
	AssistantEntry,
	AttachmentEntry,
	UserEntry,
} from "../../domain/model/jsonl";

// This is the conversation view-model: it adapts raw JSONL entries into the
// render-ready turn/block shape the conversation views consume. It lives in the
// view layer (not domain/) because its output types are defined by what the
// renderer needs — ordered blocks, deep-link uuids, per-tool answer fields.

// A tool_result carrier is a user entry the harness emits to feed tool output
// back — its content array holds tool_result blocks, not a human prompt. It must
// not start a new turn; the assistant's response to the tool is the same turn.
function isToolResultCarrier(entry: UserEntry): boolean {
	const content = entry.message.content;
	return (
		Array.isArray(content) && content.some((b) => b.type === "tool_result")
	);
}

// The user's raw text pieces in a prompt entry. Trimming and joining the pieces
// for display is the view's job.
function userTextBlocks(entry: UserEntry): string[] {
	const content = entry.message.content;
	return typeof content === "string"
		? [content]
		: content
				.filter((b) => b.type === "text")
				.map((b) => (b as { type: "text"; text: string }).text);
}

export interface AskAnswer {
	question: string;
	answer: string;
}

export interface ToolCall {
	name: string;
	/** Raw tool input; the view derives its summary/plan display from this. */
	input: Record<string, unknown>;
	id?: string;
	/** uuid of the entry that emitted this tool_use, for deep-linking to the raw view. */
	entryUuid?: string;
	/** For AskUserQuestion: the user's chosen question/answer pairs. */
	answer?: AskAnswer[];
}

// A hook firing surfaced from an attachment entry. `body` is the meaningful
// text — for a success, the content the hook injected into the model's context;
// for a failure, the error/stderr. The renderer decides how much to show.
export interface HookBlock {
	event: string;
	name: string;
	status: "success" | "error" | "blocked" | "async";
	body?: string;
}

// A turn is a sequence of text, thinking, tool_use, and hook blocks in the order
// they were emitted. Keeping them in one ordered list preserves the natural
// interleaving; which kinds to render is the renderer's call. Hooks fire at
// heterogeneous points (mid-turn PostToolUse, end-of-turn Stop, …); emission
// order places each one correctly without per-event special-casing.
export type AssistantBlock =
	| { kind: "text"; text: string }
	| { kind: "thinking"; text: string }
	| { kind: "tool"; tool: ToolCall }
	| { kind: "hook"; hook: HookBlock };

// Normalize the hook-bearing attachment payloads into a HookBlock. Returns null
// for non-hook attachments (files, diagnostics, skills, …) which the turn view
// doesn't surface.
function hookBlock(entry: AttachmentEntry): HookBlock | null {
	const a = entry.attachment;
	switch (a.type) {
		case "hook_success":
			return {
				event: a.hookEvent,
				name: a.hookName,
				status: "success",
				body: a.content.trim() || a.stdout.trim() || undefined,
			};
		case "hook_non_blocking_error":
			return {
				event: a.hookEvent,
				name: a.hookName,
				status: "error",
				body: a.stderr.trim() || a.stdout.trim() || undefined,
			};
		case "hook_blocking_error":
			return {
				event: a.hookEvent,
				name: a.hookName,
				status: "blocked",
				body: a.blockingError.blockingError?.trim() || undefined,
			};
		case "async_hook_response":
			return {
				event: a.hookEvent,
				name: a.hookName,
				status: "async",
				body: a.stdout.trim() || undefined,
			};
		default:
			return null;
	}
}

function formatAssistantEntry(
	entry: AssistantEntry,
	answers: Map<string, AskAnswer[]>,
): AssistantBlock[] {
	const blocks: AssistantBlock[] = [];

	for (const block of entry.message.content) {
		if (block.type === "text") {
			if (block.text.trim()) blocks.push({ kind: "text", text: block.text });
		} else if (block.type === "thinking") {
			if (block.thinking.trim())
				blocks.push({ kind: "thinking", text: block.thinking });
		} else if (block.type === "tool_use") {
			blocks.push({
				kind: "tool",
				tool: {
					name: block.name,
					input: block.input,
					id: block.id,
					entryUuid: entry.uuid,
					answer: answers.get(block.id),
				},
			});
		}
	}

	return blocks;
}

// Pull the user's selected answers out of an AskUserQuestion tool_result. Its
// content is a sentence of `"question"="answer"` pairs; we recover them as
// structured pairs (the view decides how to render them). Null if none found.
function parseAskAnswers(content: string | unknown[]): AskAnswer[] | null {
	const text =
		typeof content === "string"
			? content
			: content
					.map((c) =>
						typeof c === "object" && c && "text" in c
							? String((c as { text: unknown }).text)
							: "",
					)
					.join("");
	const pairs = [...text.matchAll(/"([^"]*)"="([^"]*)"/g)];
	if (pairs.length === 0) return null;
	return pairs.map((m) => ({ question: m[1] ?? "", answer: m[2] ?? "" }));
}

// Map each AskUserQuestion tool_use id to its answers, so the tool row can show
// what the user actually chose (answers live in a later user tool_result).
function collectAskAnswers(entries: AnyEntry[]): Map<string, AskAnswer[]> {
	const askIds = new Set<string>();
	for (const entry of entries) {
		if (entry.type !== "assistant") continue;
		for (const block of entry.message.content) {
			if (block.type === "tool_use" && block.name === "AskUserQuestion")
				askIds.add(block.id);
		}
	}

	const answers = new Map<string, AskAnswer[]>();
	for (const entry of entries) {
		if (entry.type !== "user" || typeof entry.message.content === "string")
			continue;
		for (const block of entry.message.content) {
			if (block.type !== "tool_result" || !askIds.has(block.tool_use_id))
				continue;
			const parsed = parseAskAnswers(block.content);
			if (parsed) answers.set(block.tool_use_id, parsed);
		}
	}
	return answers;
}

// --- Turn grouping ---

// A user prompt and the assistant response it drew, in emission order. Either
// side may be empty (assistant activity with no preceding user text, or vice
// versa). Compaction dividers are a separate stream member, not empty turns.
export interface Turn {
	kind: "turn";
	userText: string[];
	userTs?: string;
	blocks: AssistantBlock[];
	assistantTs?: string;
}

export type TurnGroup = Turn | { kind: "compact" };

export function buildTurnGroups(entries: AnyEntry[]): TurnGroup[] {
	const groups: TurnGroup[] = [];
	const answers = collectAskAnswers(entries);
	let current: Turn | null = null;

	function flushCurrent() {
		if (current) groups.push(current);
		current = null;
	}

	for (const entry of entries) {
		if (entry.type === "user") {
			// Skip entries that aren't a human prompt: harness-generated meta
			// entries (slash-command output, /context, caveats) and tool_result
			// carriers. Everything else starts a fresh user turn.
			if (entry.isMeta || isToolResultCarrier(entry)) continue;
			flushCurrent();
			current = {
				kind: "turn",
				userText: userTextBlocks(entry),
				userTs: entry.timestamp,
				blocks: [],
			};
		} else if (entry.type === "assistant") {
			const blocks = formatAssistantEntry(entry, answers);
			if (blocks.length === 0) continue;

			if (!current) current = { kind: "turn", userText: [], blocks: [] };
			if (!current.assistantTs) current.assistantTs = entry.timestamp;
			current.blocks.push(...blocks);
		} else if (entry.type === "attachment") {
			// Hooks never break a turn — they attach in emission order to whatever
			// turn is open (a bare turn if a hook fires before any user/assistant
			// activity, e.g. SessionStart). Only user prompts and compaction are
			// turn boundaries.
			const hook = hookBlock(entry);
			if (!hook) continue;
			if (!current) current = { kind: "turn", userText: [], blocks: [] };
			current.blocks.push({ kind: "hook", hook });
		} else if (
			entry.type === "system" &&
			entry.subtype === "compact_boundary"
		) {
			flushCurrent();
			groups.push({ kind: "compact" });
		}
	}

	flushCurrent();
	return groups;
}
