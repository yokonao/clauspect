import type { Dirent, Stats } from "node:fs";
import { existsSync } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { basename, join } from "node:path";
import { type ParsedSessionJsonl, parseEntries } from "../domain/model/jsonl";

export interface Logger {
	warn(message: string, context?: Record<string, unknown>): void;
}

export const noopLogger: Logger = { warn() {} };

export const consoleLogger: Logger = {
	warn(message, context) {
		const suffix = context ? ` ${JSON.stringify(context)}` : "";
		process.stderr.write(`[WARN] ${message}${suffix}\n`);
	},
};

export interface Session {
	id: string;
	directory: string;
	jsonl: string;
	mtime: Date;
	additions: string[];
	title?: string;
}

// Subagent conversations live beside the session JSONL, not inside it:
//   <projectDir>/<sessionId>/subagents/agent-<agentId>.jsonl       full conversation
//   <projectDir>/<sessionId>/subagents/agent-<agentId>.meta.json   { agentType, description, toolUseId, spawnDepth }
// The meta's toolUseId matches the `Agent` tool_use id in the parent (session or
// another subagent), so a single toolUseId→agentId map links every spawn point.
export interface SubagentMeta {
	agentId: string;
	agentType: string;
	description: string;
	toolUseId: string;
	spawnDepth: number;
	jsonl: string;
}

// One jsonl line, pretty-printed for the raw view. `uuid` anchors deep-links
// from tool rows (`#entry-<uuid>`).
export interface RawEntry {
	uuid?: string;
	type: string;
	subtype?: string;
	timestamp?: string;
	json: string;
}

const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export interface SessionStoreOptions {
	root?: string;
	home?: string;
	logger?: Logger;
}

// All filesystem access for reading Claude Code sessions off local disk. Pure
// schema/parse logic lives in ./jsonl; this class is the physical-file boundary.
export class SessionStore {
	private readonly root: string;
	private readonly home: string;
	private readonly logger: Logger;

	constructor(opts: SessionStoreOptions = {}) {
		this.home = opts.home ?? process.env.HOME ?? "";
		this.root = opts.root ?? join(this.home, ".claude", "projects");
		this.logger = opts.logger ?? noopLogger;
	}

	async listSessions(limit?: number): Promise<Session[]> {
		let projectEntries: Dirent<string>[];
		try {
			projectEntries = await readdir(this.root, {
				withFileTypes: true,
				encoding: "utf8",
			});
		} catch (error) {
			this.logger.warn("failed to read projects directory", {
				root: this.root,
				error: String(error),
			});
			return [];
		}

		const sessions: Session[] = [];

		await Promise.all(
			projectEntries
				.filter((e) => e.isDirectory())
				.map(async (projectEntry) => {
					const projectPath = join(this.root, projectEntry.name);

					let entries: string[];
					try {
						entries = await readdir(projectPath);
					} catch (error) {
						this.logger.warn("failed to read project directory", {
							projectPath,
							error: String(error),
						});
						return;
					}

					await Promise.all(
						entries.map(async (entry) => {
							if (!entry.endsWith(".jsonl")) return;
							const sessionId = entry.slice(0, -6);
							if (!UUID_REGEX.test(sessionId)) {
								this.logger.warn("skipping jsonl with a non-uuid name", {
									path: join(projectPath, entry),
								});
								return;
							}
							const session = await this.loadSession(
								projectEntry.name,
								sessionId,
							);
							if (session) sessions.push(session);
						}),
					);
				}),
		);

		sessions.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
		return sessions.slice(0, limit);
	}

	// Locate one session by id without scanning every file. The jsonl is always
	// named <id>.jsonl; we only need to find which project dir holds it, then read
	// that single file.
	async getSession(id: string): Promise<Session | undefined> {
		if (!UUID_REGEX.test(id)) return undefined;

		let projectEntries: Dirent<string>[];
		try {
			projectEntries = await readdir(this.root, {
				withFileTypes: true,
				encoding: "utf8",
			});
		} catch (error) {
			this.logger.warn("failed to read projects directory", {
				root: this.root,
				error: String(error),
			});
			return undefined;
		}

		for (const projectEntry of projectEntries) {
			if (!projectEntry.isDirectory()) continue;
			const jsonlPath = join(this.root, projectEntry.name, `${id}.jsonl`);
			if (!existsSync(jsonlPath)) continue;
			return this.loadSession(projectEntry.name, id);
		}
		return undefined;
	}

	// Build a Session from its jsonl: stat for mtime, collect sibling additions,
	// and scan the file once for title/cwd. Returns undefined if the file vanished.
	private async loadSession(
		projectName: string,
		sessionId: string,
	): Promise<Session | undefined> {
		const projectPath = join(this.root, projectName);
		const jsonlPath = join(projectPath, `${sessionId}.jsonl`);

		let fileStat: Stats;
		try {
			fileStat = await stat(jsonlPath);
		} catch (error) {
			this.logger.warn("failed to stat session jsonl", {
				jsonlPath,
				error: String(error),
			});
			return undefined;
		}

		const siblingDir = join(projectPath, sessionId);
		let additions: string[] = [];
		if (existsSync(siblingDir)) {
			const addFiles = await readdir(siblingDir, { recursive: true });
			additions = addFiles.map((f) => join(siblingDir, f as string)).sort();
		}

		const { title, cwd } = await this.scanSessionMeta(jsonlPath);
		return {
			id: sessionId,
			directory: cwd ?? projectName,
			jsonl: jsonlPath,
			mtime: fileStat.mtime,
			additions,
			title,
		};
	}

	async listSubagents(session: Session): Promise<SubagentMeta[]> {
		const dir = this.subagentsDir(session);
		if (!existsSync(dir)) return [];

		let entries: string[];
		try {
			entries = await readdir(dir);
		} catch (error) {
			this.logger.warn("failed to read subagents directory", {
				dir,
				error: String(error),
			});
			return [];
		}

		const agents: SubagentMeta[] = [];

		await Promise.all(
			entries
				.filter((e) => e.endsWith(".meta.json"))
				.map(async (metaFile) => {
					const agentId = basename(metaFile, ".meta.json").replace(
						/^agent-/,
						"",
					);
					const jsonl = join(dir, `agent-${agentId}.jsonl`);
					if (!existsSync(jsonl)) return;

					let meta: Record<string, unknown>;
					try {
						meta = await Bun.file(join(dir, metaFile)).json();
					} catch (error) {
						this.logger.warn("failed to read subagent meta", {
							metaFile: join(dir, metaFile),
							error: String(error),
						});
						return;
					}

					agents.push({
						agentId,
						agentType: String(meta.agentType ?? ""),
						description: String(meta.description ?? ""),
						toolUseId: String(meta.toolUseId ?? ""),
						spawnDepth: Number(meta.spawnDepth ?? 0),
						jsonl,
					});
				}),
		);

		agents.sort((a, b) => a.spawnDepth - b.spawnDepth);
		return agents;
	}

	// Line-level parse failures ride the entries stream as `__error__` entries
	// for callers to surface; only a total read failure is logged.
	async parseSession(jsonlPath: string): Promise<ParsedSessionJsonl> {
		const text = await Bun.file(jsonlPath).text();
		return parseEntries(text);
	}

	// Pretty-print each jsonl line verbatim (not zod-parsed), so the raw view
	// shows every field — including ones our schemas drop. Unparseable lines are
	// kept as-is rather than skipped.
	async readRawEntries(jsonlPath: string): Promise<RawEntry[]> {
		const text = await Bun.file(jsonlPath).text();
		const out: RawEntry[] = [];
		for (const line of text.split("\n")) {
			const t = line.trim();
			if (!t) continue;
			try {
				const o = JSON.parse(t);
				out.push({
					uuid: typeof o.uuid === "string" ? o.uuid : undefined,
					type: typeof o.type === "string" ? o.type : "unknown",
					subtype: typeof o.subtype === "string" ? o.subtype : undefined,
					timestamp: typeof o.timestamp === "string" ? o.timestamp : undefined,
					json: JSON.stringify(o, null, 2),
				});
			} catch {
				out.push({ type: "unparseable", json: t });
			}
		}
		return out;
	}

	private subagentsDir(session: Session): string {
		return join(session.jsonl.replace(/\.jsonl$/, ""), "subagents");
	}

	// One pass over the session file for its title and cwd. Titles are appended
	// repeatedly; the last entry wins, and a user-set custom-title takes precedence
	// over the AI-generated one. cwd is stored verbatim on every entry, so the first
	// one found is authoritative. Scan lines by substring to avoid full zod parsing
	// of large session files.
	private async scanSessionMeta(
		jsonlPath: string,
	): Promise<{ title?: string; cwd?: string }> {
		let text: string;
		try {
			text = await Bun.file(jsonlPath).text();
		} catch (error) {
			this.logger.warn("failed to read session meta", {
				jsonlPath,
				error: String(error),
			});
			return {};
		}

		let aiTitle: string | undefined;
		let customTitle: string | undefined;
		let cwd: string | undefined;
		for (const line of text.split("\n")) {
			const hasTitle =
				line.includes('"ai-title"') || line.includes('"custom-title"');
			if (!hasTitle && (cwd || !line.includes('"cwd"'))) continue;
			try {
				const o = JSON.parse(line);
				if (o.type === "ai-title" && typeof o.aiTitle === "string") {
					aiTitle = o.aiTitle;
				} else if (
					o.type === "custom-title" &&
					typeof o.customTitle === "string"
				) {
					customTitle = o.customTitle;
				}
				if (!cwd && typeof o.cwd === "string") cwd = o.cwd;
			} catch (error) {
				this.logger.warn("failed to parse session meta line", {
					jsonlPath,
					error: String(error),
				});
			}
		}
		return { title: customTitle ?? aiTitle, cwd };
	}
}
