#!/usr/bin/env bun

import { parseArgs } from "node:util";
import { createRoutes } from "./routes";

const DEFAULT_PORT = 0;

const { values } = parseArgs({
	args: process.argv.slice(2),
	options: {
		port: { type: "string", short: "p" },
		root: { type: "string", short: "r" },
		unix: { type: "string", short: "u" },
	},
	allowPositionals: false,
});

if (values.port && values.unix) {
	console.error("--port and --unix cannot be used together");
	process.exit(1);
}

const port = values.port ? parseInt(values.port, 10) : DEFAULT_PORT;
if (Number.isNaN(port) || port < 0 || port > 65535) {
	console.error("--port must be a valid port number");
	process.exit(1);
}

const routes = createRoutes({ root: values.root });
const server = values.unix
	? Bun.serve({ unix: values.unix, routes })
	: Bun.serve({ port, routes });
if (values.root) console.log(`reading sessions from ${values.root}`);

console.log(
	values.unix
		? `clauspect server listening on unix:${values.unix}`
		: `clauspect server listening on http://localhost:${server.port}`,
);
console.log("Press Ctrl+C to stop.");
