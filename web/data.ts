import { type SessionSearchResult, searchSessions } from "../search";
import {
	consoleLogger,
	type RawEntry,
	type Session,
	SessionStore,
	type SubagentMeta,
} from "../store";
import { buildTurnGroups } from "../turn";
import { aggregateUsage, type UsageStats } from "../usage";
import { renderGroupsToHtml } from "./views/conversation";

const store = new SessionStore({ logger: consoleLogger });

async function findSession(
	id: string | undefined,
): Promise<Session | undefined> {
	const sessions = await store.listSessions();
	return sessions.find((s) => s.id === id);
}

// A single toolUseId→agentId map covers every spawn point at any depth, since
// tool_use ids are unique across the whole session tree.
function agentMap(agents: SubagentMeta[]): Map<string, string> {
	return new Map(agents.map((a) => [a.toolUseId, a.agentId]));
}

export interface SessionListData {
	sessions: Session[];
	projects: string[];
}

export async function loadSessionList(
	projectFilter?: string | null,
): Promise<SessionListData> {
	const sessions = await store.listSessions();
	const projects = [...new Set(sessions.map((s) => s.directory))].sort();
	const list = projectFilter
		? sessions.filter((s) => s.directory === projectFilter)
		: sessions;
	return { sessions: list, projects };
}

export interface SessionDetailData {
	session: Session;
	agents: SubagentMeta[];
	html: string;
	usage: UsageStats;
}

export async function loadSessionDetail(
	id: string,
): Promise<SessionDetailData | null> {
	const session = await findSession(id);
	if (!session) return null;

	const agents = await store.listSubagents(session);
	const parsed = await store.parseSession(session.jsonl);
	const groups = buildTurnGroups(parsed.entries);
	const html = renderGroupsToHtml(groups, {
		sessionId: session.id,
		agentByToolUseId: agentMap(agents),
		rawBasePath: `/sessions/${session.id}/raw`,
	});

	// Usage totals span the session plus its subagents (real spend lives in the
	// sidecar agent files), so aggregate over all of them together.
	const entries = [...parsed.entries];
	for (const agent of agents) {
		const agentParsed = await store.parseSession(agent.jsonl);
		entries.push(...agentParsed.entries);
	}
	const usage = aggregateUsage(entries);

	return { session, agents, html, usage };
}

export interface SubagentDetailData {
	session: Session;
	agent: SubagentMeta;
	html: string;
	usage: UsageStats;
}

export async function loadSubagentDetail(
	id: string,
	agentId: string,
): Promise<SubagentDetailData | null> {
	const session = await findSession(id);
	if (!session) return null;

	const agents = await store.listSubagents(session);
	const agent = agents.find((a) => a.agentId === agentId);
	if (!agent) return null;

	const parsed = await store.parseSession(agent.jsonl);
	const groups = buildTurnGroups(parsed.entries);
	const html = renderGroupsToHtml(groups, {
		sessionId: session.id,
		agentByToolUseId: agentMap(agents),
		rawBasePath: `/sessions/${session.id}/agents/${agentId}/raw`,
	});

	return { session, agent, html, usage: aggregateUsage(parsed.entries) };
}

export interface RawViewData {
	session: Session;
	agent?: SubagentMeta;
	backPath: string;
	entries: RawEntry[];
}

export async function loadRawView(id: string): Promise<RawViewData | null> {
	const session = await findSession(id);
	if (!session) return null;
	const entries = await store.readRawEntries(session.jsonl);
	return { session, backPath: `/sessions/${session.id}`, entries };
}

export async function loadSubagentRawView(
	id: string,
	agentId: string,
): Promise<RawViewData | null> {
	const session = await findSession(id);
	if (!session) return null;
	const agents = await store.listSubagents(session);
	const agent = agents.find((a) => a.agentId === agentId);
	if (!agent) return null;
	const entries = await store.readRawEntries(agent.jsonl);
	return {
		session,
		agent,
		backPath: `/sessions/${session.id}/agents/${agentId}`,
		entries,
	};
}

export interface SearchData {
	query: string;
	results: SessionSearchResult[];
	totalHits: number;
}

export async function loadSearch(query: string): Promise<SearchData> {
	const q = query.trim();
	const results = q ? await searchSessions(store, q) : [];
	const totalHits = results.reduce((n, r) => n + r.totalHits, 0);
	return { query: q, results, totalHits };
}
