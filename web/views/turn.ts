import type {
	AnyEntry,
	AssistantEntry,
	UserEntry,
} from "../../domain/model/jsonl";

// This is the conversation view-model: it adapts raw JSONL entries into the
// render-ready turn/block shape the conversation views consume. It lives in the
// view layer (not domain/) because its output types are defined by what the
// renderer needs — ordered blocks, deep-link uuids, per-tool answer fields.

// The user's text pieces in an entry, trimmed and non-empty. Returns null when
// the entry carries no user text (only tool_results, or blank) — the caller
// uses that to decide whether the entry starts a new user turn. How the pieces
// are joined for display is the view's call.
function userTextBlocks(entry: UserEntry): string[] | null {
	const content = entry.message.content;

	if (typeof content === "string") {
		const t = content.trim();
		return t ? [t] : null;
	}

	const texts = content
		.filter((b) => b.type === "text")
		.map((b) => (b as { type: "text"; text: string }).text.trim())
		.filter(Boolean);
	return texts.length ? texts : null;
}

export interface ToolCall {
	name: string;
	/** Raw tool input; the view derives its summary/plan display from this. */
	input: Record<string, unknown>;
	id?: string;
	/** uuid of the entry that emitted this tool_use, for deep-linking to the raw view. */
	entryUuid?: string;
	/** For AskUserQuestion: the user's chosen answers, one "Q → A" per line. */
	answer?: string;
}

// An assistant turn is a sequence of text and tool_use blocks in the order
// they were emitted. Keeping them in one ordered list preserves the natural
// "text → tool → text" interleaving instead of collapsing into separate lists.
export type AssistantBlock =
	| { kind: "text"; text: string }
	| { kind: "tool"; tool: ToolCall };

function formatAssistantEntry(
	entry: AssistantEntry,
	answers: Map<string, string>,
): AssistantBlock[] {
	const blocks: AssistantBlock[] = [];

	for (const block of entry.message.content) {
		if (block.type === "text") {
			const t = block.text.trim();
			if (t) blocks.push({ kind: "text", text: t });
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
		// thinking blocks: skip
	}

	return blocks;
}

// Pull the user's selected answers out of an AskUserQuestion tool_result. Its
// content is a sentence of `"question"="answer"` pairs; we reduce it to plain
// "question → answer" lines. Returns null if no pairs are found.
function parseAskAnswers(content: string | unknown[]): string | null {
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
	return pairs.map((m) => `${m[1]} → ${m[2]}`).join("\n");
}

// Map each AskUserQuestion tool_use id to its answer, so the tool row can show
// what the user actually chose (answers live in a later user tool_result).
function collectAskAnswers(entries: AnyEntry[]): Map<string, string> {
	const askIds = new Set<string>();
	for (const entry of entries) {
		if (entry.type !== "assistant") continue;
		for (const block of entry.message.content) {
			if (block.type === "tool_use" && block.name === "AskUserQuestion")
				askIds.add(block.id);
		}
	}

	const answers = new Map<string, string>();
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

export interface TurnGroup {
	userText: string[];
	userTs: string | undefined;
	blocks: AssistantBlock[];
	assistantTs: string | undefined;
	isSidechain: boolean;
	isCompactBoundary?: boolean;
}

export function buildTurnGroups(entries: AnyEntry[]): TurnGroup[] {
	const groups: TurnGroup[] = [];
	const answers = collectAskAnswers(entries);
	let current: TurnGroup | null = null;

	function flushCurrent() {
		if (current) groups.push(current);
		current = null;
	}

	for (const entry of entries) {
		if (entry.type === "user") {
			const text = userTextBlocks(entry);
			if (text !== null) {
				flushCurrent();
				current = {
					userText: text,
					userTs: entry.timestamp,
					blocks: [],
					assistantTs: undefined,
					isSidechain: entry.isSidechain,
				};
			}
		} else if (entry.type === "assistant") {
			const blocks = formatAssistantEntry(entry, answers);
			if (blocks.length === 0) continue;

			if (!current) {
				current = {
					userText: [],
					userTs: undefined,
					blocks: [],
					assistantTs: entry.timestamp,
					isSidechain: entry.isSidechain,
				};
			}

			if (!current.assistantTs) current.assistantTs = entry.timestamp;
			current.blocks.push(...blocks);
		} else if (
			entry.type === "system" &&
			entry.subtype === "compact_boundary"
		) {
			flushCurrent();
			groups.push({
				userText: [],
				userTs: entry.timestamp,
				blocks: [],
				assistantTs: entry.timestamp,
				isSidechain: false,
				isCompactBoundary: true,
			});
		}
	}

	flushCurrent();
	return groups;
}
