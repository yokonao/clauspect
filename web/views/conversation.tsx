import { displayToolName, formatTimestamp, toolSummary } from "./format";
import { renderMarkdown } from "./markdown";
import type { AssistantBlock, TurnGroup } from "./turn";

// --- HTML renderer ---
//
// Renders TurnGroups to semantic HTML via JSX (hono/jsx). Assistant text is
// interpreted as Markdown (see ./markdown) and injected raw; user text and
// tool args stay plain, escaped automatically by JSX. The turn structure,
// role labels, and tool rows are marked up here, with styling in the server CSS.

// Maps an `Agent` tool_use id to the subagent page it spawned, so each Agent
// tool row in the conversation can link straight to that subagent's history.
export interface RenderOptions {
	sessionId?: string;
	agentByToolUseId?: Map<string, string>;
	/** Base path of the raw-jsonl view these tool rows link into (`#entry-<uuid>`). */
	rawBasePath?: string;
}

function Ts(props: { ts: string | undefined }) {
	if (!props.ts) return null;
	return (
		<>
			{" "}
			<time>{formatTimestamp(props.ts)}</time>
		</>
	);
}

function Blocks(props: { blocks: AssistantBlock[]; opts: RenderOptions }) {
	const { opts } = props;
	return (
		<>
			{props.blocks.map((block) => {
				if (block.kind === "thinking") return null;
				if (block.kind === "hook") {
					const { hook } = block;
					return (
						<div class={`hook hook-${hook.status}`}>
							<div class="hook-head">
								<span class="hook-tag">⚙ {hook.event}</span>
								<span class="hook-name">{hook.name}</span>
							</div>
							{hook.body && <div class="hook-body">{hook.body}</div>}
						</div>
					);
				}
				if (block.kind === "text") {
					return (
						<div
							class="text md"
							dangerouslySetInnerHTML={{
								__html: renderMarkdown(block.text.trim()),
							}}
						/>
					);
				}
				const agentId = block.tool.id
					? opts.agentByToolUseId?.get(block.tool.id)
					: undefined;
				const summary = toolSummary(block.tool.name, block.tool.input);
				const plan =
					block.tool.name === "ExitPlanMode" &&
					typeof block.tool.input.plan === "string"
						? block.tool.input.plan
						: undefined;
				return (
					<>
						<div class="tool">
							<span class="tname">{displayToolName(block.tool.name)}</span>
							{summary && (
								<span class="targ" title={summary}>
									{summary}
								</span>
							)}
							{agentId && opts.sessionId && (
								<a
									class="agent-link"
									href={`/sessions/${opts.sessionId}/agents/${agentId}`}
								>
									▸ trace
								</a>
							)}
							{opts.rawBasePath && block.tool.entryUuid && (
								<a
									class="raw-link"
									href={`${opts.rawBasePath}#entry-${block.tool.entryUuid}`}
									title="Show raw JSON"
									aria-label="Show raw JSON"
								>
									{"{ }"}
								</a>
							)}
						</div>
						{block.tool.answer && (
							<div class="tanswer">
								{block.tool.answer.map((a) => (
									<div>
										↳ {a.question} → {a.answer}
									</div>
								))}
							</div>
						)}
						{plan && (
							<div
								class="plan md"
								dangerouslySetInnerHTML={{
									__html: renderMarkdown(plan),
								}}
							/>
						)}
					</>
				);
			})}
		</>
	);
}

function Turn(props: { group: TurnGroup; opts: RenderOptions }) {
	const { group, opts } = props;
	if (group.kind === "compact") {
		return <div class="compact">Context compacted</div>;
	}

	const hasUser = group.userText.length > 0;
	const hasAssistant = group.blocks.some((b) => b.kind !== "thinking");
	if (!hasUser && !hasAssistant) return null;

	return (
		<section class="turn">
			{hasUser && (
				<div class="msg user">
					<div class="role">
						User
						<Ts ts={group.userTs} />
					</div>
					<div class="text">
						{group.userText
							.map((t) => t.trim())
							.filter(Boolean)
							.join("\n\n")}
					</div>
				</div>
			)}
			{hasAssistant && (
				<div class="msg assistant">
					<div class="role">
						Assistant
						<Ts ts={group.assistantTs} />
					</div>
					<Blocks blocks={group.blocks} opts={opts} />
				</div>
			)}
		</section>
	);
}

export function Conversation(props: {
	groups: TurnGroup[];
	opts?: RenderOptions;
}) {
	const opts = props.opts ?? {};
	if (props.groups.length === 0) {
		return <div class="state">(no conversation found)</div>;
	}
	return (
		<>
			{props.groups.map((group) => (
				<Turn group={group} opts={opts} />
			))}
		</>
	);
}
