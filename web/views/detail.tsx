import type { SessionDetailData } from "../data";
import { Conversation } from "./conversation";
import { abs } from "./format";
import { renderPage, Shell } from "./shell";
import { UsageSummary } from "./usage";

function Agents({
	sessionId,
	agents,
}: {
	sessionId: string;
	agents: SessionDetailData["agents"];
}) {
	if (agents.length === 0) return null;
	return (
		<>
			<h2 class="section">Subagents ({agents.length})</h2>
			<div class="agent-grid">
				{agents.map((a) => (
					<a
						class="agent-card"
						href={`/sessions/${sessionId}/agents/${a.agentId}`}
					>
						<span class="agent-desc">{a.description || a.agentId}</span>
						<span class="agent-type">
							{a.agentType} · depth {a.spawnDepth}
						</span>
					</a>
				))}
			</div>
		</>
	);
}

export function detailPage(data: SessionDetailData): string {
	const { session, agents, groups, opts, usage } = data;
	const title = session.title || "Untitled";
	const usageNote =
		agents.length > 0
			? `session + ${agents.length} subagent${agents.length > 1 ? "s" : ""}`
			: undefined;
	return renderPage(
		<Shell title={`clauspect — ${title}`}>
			<div class="container">
				<a href="/" class="back">
					← Back to sessions
				</a>
				<h1 class={session.title ? "session-title" : "session-title untitled"}>
					{title}
				</h1>
				<div class="meta">
					<span class="meta-label">Project</span>
					<span class="meta-value">{session.directory}</span>
					<span class="meta-label">Session ID</span>
					<span class="meta-value">{session.id}</span>
					<span class="meta-label">Updated</span>
					<span class="meta-value">{abs(session.mtime)}</span>
					<span class="meta-label">JSONL</span>
					<span class="meta-value">{session.jsonl}</span>
				</div>
				<UsageSummary stats={usage} note={usageNote} />
				<div>
					<Conversation groups={groups} opts={opts} />
					<Agents sessionId={session.id} agents={agents} />
				</div>
			</div>
		</Shell>,
	);
}
