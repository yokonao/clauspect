import type { AnyEntry, AssistantEntry, UserEntry } from "../session/jsonl";

// --- Tool input summarizer ---

export function summarizeToolInput(
	name: string,
	input: Record<string, unknown>,
): string {
	const truncate = (s: string, max = 120) =>
		s.length > max ? `${s.slice(0, max)}…` : s;

	switch (name) {
		case "Bash":
			// Show the full command — it's the most useful tool detail and
			// truncating it loses the pipeline/flags that matter most.
			return String(input.command ?? "");
		case "Read":
			return String(input.file_path ?? "");
		case "Write":
			return String(input.file_path ?? "");
		case "Edit":
			return String(input.file_path ?? "");
		case "NotebookEdit":
			return String(input.notebook_path ?? "");
		case "WebSearch":
			return String(input.query ?? "");
		case "WebFetch":
			return truncate(String(input.url ?? ""));
		case "Agent":
			return truncate(String(input.description ?? input.prompt ?? ""), 100);
		case "LSP":
			return `${input.operation} ${input.filePath}:${input.line}`;
		case "TaskCreate":
		case "TaskUpdate":
		case "TaskGet":
			return truncate(String(input.subject ?? input.taskId ?? ""), 80);
		case "AskUserQuestion": {
			const questions = input.questions;
			if (!Array.isArray(questions)) return "";
			return truncate(
				questions
					.map((q) => (q as { question?: string }).question ?? "")
					.filter(Boolean)
					.join(" / "),
			);
		}
		case "ExitPlanMode":
			// The plan body is rendered separately as Markdown; keep the row summary empty.
			return "";
		default:
			// MCP and unknown tools: input structure is arbitrary, so we don't guess
			// a summary. The tool name and the raw JSON link are enough.
			return "";
	}
}

// MCP tool ids have the form `mcp__<server>__<tool>`; the raw double-underscore
// form is noisy, so show it as "server: tool".
export function displayToolName(name: string): string {
	const m = name.match(/^mcp__(.+?)__(.+)$/);
	return m ? `${m[1]}: ${m[2]}` : name;
}

// --- Formatters ---

export function formatTimestamp(ts: string | undefined): string {
	if (!ts) return "";
	const d = new Date(ts);
	return d.toISOString().slice(0, 19).replace("T", " ");
}

function formatUserEntry(entry: UserEntry): string | null {
	const { message } = entry;
	const content = message.content;

	if (typeof content === "string") {
		const trimmed = content.trim();
		if (!trimmed) return null;
		return trimmed;
	}

	const textBlocks = content.filter((b) => b.type === "text");
	if (textBlocks.length === 0) return null;

	return textBlocks
		.map((b) => (b as { type: "text"; text: string }).text.trim())
		.filter(Boolean)
		.join("\n\n");
}

export interface ToolCall {
	name: string;
	summary: string;
	id?: string;
	/** uuid of the entry that emitted this tool_use, for deep-linking to the raw view. */
	entryUuid?: string;
	/** For AskUserQuestion: the user's chosen answers, one "Q → A" per line. */
	answer?: string;
	/** For ExitPlanMode: the proposed plan Markdown. */
	plan?: string;
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
					summary: summarizeToolInput(block.name, block.input),
					id: block.id,
					entryUuid: entry.uuid,
					answer: answers.get(block.id),
					plan:
						block.name === "ExitPlanMode" &&
						typeof block.input.plan === "string"
							? block.input.plan
							: undefined,
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
	userText: string | null;
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
			const text = formatUserEntry(entry);
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
					userText: null,
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
				userText: null,
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
