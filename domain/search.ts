import type { AnyEntry } from "./model/jsonl";
import { toolInputText } from "./tool";

export type HitKind = "user" | "assistant" | "thinking" | "tool";

// A match with just enough surrounding text to make sense, split around the
// matched span so the view can wrap it in <mark> without re-scanning.
export interface SearchHit {
	uuid?: string;
	kind: HitKind;
	before: string;
	match: string;
	after: string;
}

interface Segment {
	uuid?: string;
	kind: HitKind;
	text: string;
}

// Searchable text per entry: what was said, thought, or invoked — but not
// tool_result output (file dumps / command output would drown the signal).
function extractSegments(entry: AnyEntry): Segment[] {
	if (entry.type === "user") {
		const c = entry.message.content;
		if (typeof c === "string") {
			return c.trim() ? [{ uuid: entry.uuid, kind: "user", text: c }] : [];
		}
		return c
			.filter((b) => b.type === "text" && b.text.trim())
			.map((b) => ({
				uuid: entry.uuid,
				kind: "user" as const,
				text: (b as { text: string }).text,
			}));
	}

	if (entry.type === "assistant") {
		const out: Segment[] = [];
		for (const b of entry.message.content) {
			if (b.type === "text") {
				if (b.text.trim())
					out.push({ uuid: entry.uuid, kind: "assistant", text: b.text });
			} else if (b.type === "thinking") {
				if (b.thinking.trim())
					out.push({ uuid: entry.uuid, kind: "thinking", text: b.thinking });
			} else if (b.type === "tool_use") {
				const text = toolInputText(b.name, b.input);
				if (text)
					out.push({
						uuid: entry.uuid,
						kind: "tool",
						text: `${b.name}: ${text}`,
					});
			}
		}
		return out;
	}

	return [];
}

const CONTEXT = 90;

function makeHit(seg: Segment, idx: number, len: number): SearchHit {
	const start = Math.max(0, idx - CONTEXT);
	const end = Math.min(seg.text.length, idx + len + CONTEXT);
	const collapse = (s: string) => s.replace(/\s+/g, " ").trim();

	let before = collapse(seg.text.slice(start, idx));
	let after = collapse(seg.text.slice(idx + len, end));
	if (start > 0) before = `… ${before}`;
	if (end < seg.text.length) after = `${after} …`;

	return {
		uuid: seg.uuid,
		kind: seg.kind,
		before,
		match: seg.text.slice(idx, idx + len),
		after,
	};
}

// Naive substring scan of one session's entries, case-insensitive. `needle` must
// already be lowercased and non-empty. Returns up to `maxHits` snippets plus the
// full match count so the caller can show "+N more". No index: the on-disk corpus
// is small enough (measured ~100MB) that a full parse per query stays sub-second.
export function scanEntries(
	entries: AnyEntry[],
	needle: string,
	maxHits: number,
): { hits: SearchHit[]; totalHits: number } {
	const hits: SearchHit[] = [];
	let totalHits = 0;
	for (const entry of entries) {
		for (const seg of extractSegments(entry)) {
			const idx = seg.text.toLowerCase().indexOf(needle);
			if (idx === -1) continue;
			totalHits++;
			if (hits.length < maxHits) hits.push(makeHit(seg, idx, needle.length));
		}
	}
	return { hits, totalHits };
}
