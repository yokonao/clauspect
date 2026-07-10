import { scanEntries } from "../domain/search";
import { aggregateUsage } from "../domain/usage";
import {
	consoleLogger,
	type Session,
	SessionStore,
	type SubagentMeta,
} from "../store";
import { detailPage } from "./views/detail";
import { listPage } from "./views/list";
import { rawPage } from "./views/raw";
import { type SessionSearchResult, searchPage } from "./views/search";
import { renderPage, Shell } from "./views/shell";
import { subagentPage } from "./views/subagent";
import { buildTurnGroups } from "./views/turn";

const store = new SessionStore({ logger: consoleLogger });

type BunRequest = Request & { params: Record<string, string> };

const html = { headers: { "content-type": "text/html; charset=utf-8" } };

function notFound(message: string): Response {
	const body = renderPage(
		<Shell title="clauspect — Not found">
			<div class="container">
				<a href="/" class="back">
					← Back to sessions
				</a>
				<div class="state err">{message}</div>
			</div>
		</Shell>,
	);
	return new Response(body, { ...html, status: 404 });
}

function findSession(id: string | undefined): Promise<Session | undefined> {
	return id ? store.getSession(id) : Promise.resolve(undefined);
}

// A single toolUseId→agentId map covers every spawn point at any depth, since
// tool_use ids are unique across the whole session tree.
function agentMap(agents: SubagentMeta[]): Map<string, string> {
	return new Map(agents.map((a) => [a.toolUseId, a.agentId]));
}

const MAX_HITS_PER_SESSION = 5;

// Parse every session and scan it for `query`. listSessions is newest-first and
// Promise.all preserves order, so results stay newest-first. Sessions that fail
// to parse are skipped rather than aborting the whole search.
async function runSearch(query: string): Promise<SessionSearchResult[]> {
	const needle = query.toLowerCase();
	const sessions = await store.listSessions();
	const results = await Promise.all(
		sessions.map(async (session): Promise<SessionSearchResult | null> => {
			let entries: Awaited<ReturnType<typeof store.parseSession>>["entries"];
			try {
				entries = (await store.parseSession(session.jsonl)).entries;
			} catch {
				return null;
			}
			const { hits, totalHits } = scanEntries(
				entries,
				needle,
				MAX_HITS_PER_SESSION,
			);
			return totalHits > 0 ? { session, hits, totalHits } : null;
		}),
	);
	return results.filter((r): r is SessionSearchResult => r !== null);
}

export const routes = {
	"/": async (req: Request) => {
		const project = new URL(req.url).searchParams.get("project");
		const sessions = await store.listSessions();
		const projects = [...new Set(sessions.map((s) => s.directory))].sort();
		return new Response(listPage({ sessions, projects }, project), html);
	},

	"/search": async (req: Request) => {
		const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
		const results = q ? await runSearch(q) : [];
		const totalHits = results.reduce((n, r) => n + r.totalHits, 0);
		return new Response(searchPage({ query: q, results, totalHits }), html);
	},

	"/sessions/:id": async (req: Request) => {
		const session = await findSession((req as BunRequest).params.id);
		if (!session) return notFound("Session not found");
		const agents = await store.listSubagents(session);
		const parsed = await store.parseSession(session.jsonl);
		const groups = buildTurnGroups(parsed.entries);
		const opts = {
			sessionId: session.id,
			agentByToolUseId: agentMap(agents),
			rawBasePath: `/sessions/${session.id}/raw`,
		};

		// Usage totals span the session plus its subagents (real spend lives in
		// the sidecar agent files), so aggregate over all of them together.
		const entries = [...parsed.entries];
		for (const agent of agents) {
			const agentParsed = await store.parseSession(agent.jsonl);
			entries.push(...agentParsed.entries);
		}
		const usage = aggregateUsage(entries);

		return new Response(
			detailPage({ session, agents, groups, opts, usage }),
			html,
		);
	},

	"/sessions/:id/agents/:agentId": async (req: Request) => {
		const p = (req as BunRequest).params;
		const session = await findSession(p.id);
		if (!session) return notFound("Subagent not found");
		const agents = await store.listSubagents(session);
		const agent = agents.find((a) => a.agentId === p.agentId);
		if (!agent) return notFound("Subagent not found");
		const parsed = await store.parseSession(agent.jsonl);
		const groups = buildTurnGroups(parsed.entries);
		const opts = {
			sessionId: session.id,
			agentByToolUseId: agentMap(agents),
			rawBasePath: `/sessions/${session.id}/agents/${p.agentId}/raw`,
		};
		return new Response(
			subagentPage({
				session,
				agent,
				groups,
				opts,
				usage: aggregateUsage(parsed.entries),
			}),
			html,
		);
	},

	"/sessions/:id/raw": async (req: Request) => {
		const session = await findSession((req as BunRequest).params.id);
		if (!session) return notFound("Session not found");
		const entries = await store.readRawEntries(session.jsonl);
		return new Response(
			rawPage({ session, backPath: `/sessions/${session.id}`, entries }),
			html,
		);
	},

	"/sessions/:id/agents/:agentId/raw": async (req: Request) => {
		const p = (req as BunRequest).params;
		const session = await findSession(p.id);
		if (!session) return notFound("Subagent not found");
		const agents = await store.listSubagents(session);
		const agent = agents.find((a) => a.agentId === p.agentId);
		if (!agent) return notFound("Subagent not found");
		const entries = await store.readRawEntries(agent.jsonl);
		return new Response(
			rawPage({
				session,
				agent,
				backPath: `/sessions/${session.id}/agents/${p.agentId}`,
				entries,
			}),
			html,
		);
	},
};
