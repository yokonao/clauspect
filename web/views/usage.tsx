import {
	cacheHitRate,
	totalToolCalls,
	type UsageStats,
} from "../../session/usage";
import { displayToolName } from "../../turn";
import { compactNum } from "./format";

function Stat({ label, value }: { label: string; value: string }) {
	return (
		<div class="usage-stat">
			<span class="usage-num">{value}</span>
			<span class="usage-label">{label}</span>
		</div>
	);
}

// Usage panel shown atop a session/subagent page. `note` describes the scope
// (e.g. "session + 3 subagents") since totals may span more than one file.
export function UsageSummary({
	stats,
	note,
}: {
	stats: UsageStats;
	note?: string;
}) {
	if (stats.messages === 0 && totalToolCalls(stats) === 0) return null;

	const tools = Object.entries(stats.toolCounts).sort((a, b) => b[1] - a[1]);
	const hit = Math.round(cacheHitRate(stats) * 100);

	return (
		<div class="usage">
			<div class="usage-head">
				<span class="usage-title">Usage</span>
				{note ? <span class="usage-note">{note}</span> : null}
			</div>
			<div class="usage-stats">
				<Stat label="Input" value={compactNum(stats.inputTokens)} />
				<Stat label="Output" value={compactNum(stats.outputTokens)} />
				<Stat label="Cache read" value={compactNum(stats.cacheReadTokens)} />
				<Stat
					label="Cache created"
					value={compactNum(stats.cacheCreationTokens)}
				/>
				<Stat label="Cache hit" value={`${hit}%`} />
				<Stat label="API calls" value={String(stats.messages)} />
				{stats.webSearchRequests > 0 ? (
					<Stat label="Web search" value={String(stats.webSearchRequests)} />
				) : null}
				{stats.webFetchRequests > 0 ? (
					<Stat label="Web fetch" value={String(stats.webFetchRequests)} />
				) : null}
			</div>
			{tools.length > 0 ? (
				<div class="usage-tools">
					{tools.map(([name, count]) => (
						<span class="usage-tool">
							{displayToolName(name)}
							<span class="usage-tool-n">{count}</span>
						</span>
					))}
				</div>
			) : null}
		</div>
	);
}
