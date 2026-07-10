import type { UsageStats } from "../../domain/usage";
import type { Session, SubagentMeta } from "../../store";
import { Conversation, type RenderOptions } from "./conversation";
import { renderPage, Shell } from "./shell";
import type { TurnGroup } from "./turn";
import { UsageSummary } from "./usage";

export interface SubagentDetailData {
	session: Session;
	agent: SubagentMeta;
	groups: TurnGroup[];
	opts: RenderOptions;
	usage: UsageStats;
}

export function subagentPage(data: SubagentDetailData): string {
	const { session, agent, groups, opts, usage } = data;
	const heading = agent.description || agent.agentId;
	return renderPage(
		<Shell title={`clauspect — ${heading}`}>
			<div class="container">
				<a href={`/sessions/${session.id}`} class="back">
					← Back to session
				</a>
				<div class="meta">
					<span class="meta-label">Agent</span>
					<span class="meta-value">{heading}</span>
					<span class="meta-label">Type</span>
					<span class="meta-value">
						{agent.agentType} · depth {agent.spawnDepth}
					</span>
					<span class="meta-label">Agent ID</span>
					<span class="meta-value">{agent.agentId}</span>
					<span class="meta-label">JSONL</span>
					<span class="meta-value">{agent.jsonl}</span>
				</div>
				<UsageSummary stats={usage} />
				<Conversation groups={groups} opts={opts} />
			</div>
		</Shell>,
	);
}
