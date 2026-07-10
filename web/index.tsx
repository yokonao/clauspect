#!/usr/bin/env bun

import { parseArgs } from "node:util";
import { routes } from "./routes";

const DEFAULT_PORT = 0;

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

const server = Bun.serve({ port, routes });

console.log(`clauspect server listening on http://localhost:${server.port}`);
console.log("Press Ctrl+C to stop.");
