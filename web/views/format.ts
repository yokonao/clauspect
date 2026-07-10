import { toolInputText } from "../../domain/tool";

// Per-tool display cap for the tool-row summary. Tools with naturally short
// fields (file paths, skill names) and Bash (whose full command is the point)
// are absent and shown untruncated.
const TOOL_SUMMARY_MAX: Record<string, number> = {
	WebFetch: 120,
	Agent: 100,
	Monitor: 120,
	TaskCreate: 80,
	TaskUpdate: 80,
	TaskGet: 80,
	AskUserQuestion: 120,
};

export function toolSummary(
	name: string,
	input: Record<string, unknown>,
): string {
	const text = toolInputText(name, input);
	const max = TOOL_SUMMARY_MAX[name];
	return max && text.length > max ? `${text.slice(0, max)}…` : text;
}

export function formatTimestamp(ts: string | undefined): string {
	if (!ts) return "";
	const d = new Date(ts);
	return d.toISOString().slice(0, 19).replace("T", " ");
}

// MCP tool ids have the form `mcp__<server>__<tool>`; the raw double-underscore
// form is noisy, so show it as "server: tool".
export function displayToolName(name: string): string {
	const m = name.match(/^mcp__(.+?)__(.+)$/);
	return m ? `${m[1]}: ${m[2]}` : name;
}

export function shortName(dir: string): string {
	return (
		(dir || "—").replace(/\/$/, "").split("/").filter(Boolean).at(-1) || dir
	);
}

export function abs(date: Date): string {
	return date.toLocaleString("ja-JP", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});
}

// Compact token counts: 812, 12.3k, 1.2M.
export function compactNum(n: number): string {
	if (n < 1000) return String(n);
	if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`;
	return `${(n / 1_000_000).toFixed(1)}M`;
}

export function rel(date: Date, now: Date): string {
	const s = Math.floor((now.getTime() - date.getTime()) / 1000);
	if (s < 60) return `${s}s ago`;
	const m = Math.floor(s / 60);
	if (m < 60) return `${m}m ago`;
	const h = Math.floor(m / 60);
	if (h < 24) return `${h}h ago`;
	const d = Math.floor(h / 24);
	return d < 30 ? `${d}d ago` : date.toLocaleDateString();
}
