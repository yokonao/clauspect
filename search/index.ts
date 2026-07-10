import type { AnyEntry } from "../session/jsonl";
import type { Session, SessionStore } from "../store";
import { summarizeToolInput } from "../turn";

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

export interface SessionSearchResult {
	session: Session;
	hits: SearchHit[];
	totalHits: number;
}

export interface SearchOptions {
	maxSessions?: number;
	maxHitsPerSession?: number;
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
				const summary = summarizeToolInput(b.name, b.input);
				if (summary)
					out.push({
						uuid: entry.uuid,
						kind: "tool",
						text: `${b.name}: ${summary}`,
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

// Naive substring scan over every session, case-insensitive. No index: the whole
// on-disk corpus is small enough (measured ~100MB) that a full parse per query
// stays well under a second on local disk.
export async function searchSessions(
	store: SessionStore,
	query: string,
	opts: SearchOptions = {},
): Promise<SessionSearchResult[]> {
	const needle = query.trim().toLowerCase();
	if (!needle) return [];

	const maxHits = opts.maxHitsPerSession ?? 5;
	const sessions = await store.listSessions();

	const results = await Promise.all(
		sessions.map(async (session): Promise<SessionSearchResult | null> => {
			let entries: AnyEntry[];
			try {
				entries = (await store.parseSession(session.jsonl)).entries;
			} catch {
				return null;
			}

			const hits: SearchHit[] = [];
			let total = 0;
			for (const entry of entries) {
				for (const seg of extractSegments(entry)) {
					const idx = seg.text.toLowerCase().indexOf(needle);
					if (idx === -1) continue;
					total++;
					if (hits.length < maxHits)
						hits.push(makeHit(seg, idx, needle.length));
				}
			}

			return total > 0 ? { session, hits, totalHits: total } : null;
		}),
	);

	// listSessions already returns newest-first; preserve that order.
	const filtered = results.filter((r): r is SessionSearchResult => r !== null);
	return opts.maxSessions ? filtered.slice(0, opts.maxSessions) : filtered;
}
