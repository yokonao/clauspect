#!/usr/bin/env bun

import { parseArgs } from "node:util";
import {
	loadRawView,
	loadSearch,
	loadSessionDetail,
	loadSessionList,
	loadSubagentDetail,
	loadSubagentRawView,
} from "./data";
import { detailPage } from "./views/detail";
import { listPage } from "./views/list";
import { rawPage } from "./views/raw";
import { searchPage } from "./views/search";
import { renderPage, Shell } from "./views/shell";
import { subagentPage } from "./views/subagent";

const DEFAULT_PORT = 0;

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

const { values } = parseArgs({
	args: process.argv.slice(2),
	options: { port: { type: "string", short: "p" } },
	allowPositionals: false,
});

const port = values.port ? parseInt(values.port, 10) : DEFAULT_PORT;
if (Number.isNaN(port) || port < 0 || port > 65535) {
	console.error("--port must be a valid port number");
	process.exit(1);
}

const server = Bun.serve({
	port,
	routes: {
		"/": async (req) => {
			const project = new URL(req.url).searchParams.get("project");
			const data = await loadSessionList();
			return new Response(listPage(data, project), html);
		},
		"/search": async (req) => {
			const q = new URL(req.url).searchParams.get("q") ?? "";
			const data = await loadSearch(q);
			return new Response(searchPage(data), html);
		},
		"/sessions/:id": async (req) => {
			const data = await loadSessionDetail((req as BunRequest).params.id ?? "");
			if (!data) return notFound("Session not found");
			return new Response(detailPage(data), html);
		},
		"/sessions/:id/agents/:agentId": async (req) => {
			const p = (req as BunRequest).params;
			const data = await loadSubagentDetail(p.id ?? "", p.agentId ?? "");
			if (!data) return notFound("Subagent not found");
			return new Response(subagentPage(data), html);
		},
		"/sessions/:id/raw": async (req) => {
			const data = await loadRawView((req as BunRequest).params.id ?? "");
			if (!data) return notFound("Session not found");
			return new Response(rawPage(data), html);
		},
		"/sessions/:id/agents/:agentId/raw": async (req) => {
			const p = (req as BunRequest).params;
			const data = await loadSubagentRawView(p.id ?? "", p.agentId ?? "");
			if (!data) return notFound("Subagent not found");
			return new Response(rawPage(data), html);
		},
	},
});

console.log(`clauspect server listening on http://localhost:${server.port}`);
console.log("Press Ctrl+C to stop.");
