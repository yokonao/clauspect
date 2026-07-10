import type { RawEntry, Session, SubagentMeta } from "../../store";
import { renderPage, Shell } from "./shell";

export interface RawViewData {
	session: Session;
	agent?: SubagentMeta;
	backPath: string;
	entries: RawEntry[];
}

// Readable dump of a session (or subagent) jsonl: every line pretty-printed,
// anchored by uuid so tool rows can deep-link to `#entry-<uuid>`. Text children
// are escaped by hono/jsx, so the raw JSON is safe inside <pre>.
export function rawPage(data: RawViewData): string {
	const { session, agent, backPath, entries } = data;
	const label = agent
		? agent.description || agent.agentId
		: session.title || session.id;
	return renderPage(
		<Shell title={`clauspect — raw · ${label}`}>
			<div class="container">
				<a href={backPath} class="back">
					← Back to conversation
				</a>
				<h1 class="session-title">Raw JSONL</h1>
				<div class="sub-id">{label}</div>
				<div class="raw-list">
					{entries.map((e) => (
						<section
							class="raw-entry"
							id={e.uuid ? `entry-${e.uuid}` : undefined}
						>
							<div class="raw-head">
								<span class="raw-type">
									{e.subtype ? `${e.type}/${e.subtype}` : e.type}
								</span>
								{e.timestamp && <span class="raw-ts">{e.timestamp}</span>}
							</div>
							<pre class="raw-json">{e.json}</pre>
						</section>
					))}
				</div>
			</div>
		</Shell>,
	);
}
