---
name: run-clauspect
description: Run, launch, serve, smoke-test, or screenshot clauspect — the local web viewer for Claude Code session JSONL logs. Use when asked to start the app, check a rendering change in the real UI, or capture screenshots of the session list, conversation, subagent, raw, or search pages.
---

# Run clauspect

Bun + Hono app that reads Claude Code session logs and server-renders them as
HTML. **No client-side JavaScript**, so `curl` is the driver — there is no
harness to install and none to maintain.

Paths are relative to the repo root.

```bash
bun install
bun run web --port 4111          # your real ~/.claude/projects
bun run web --port 4111 --root ./fixtures/projects   # any other log dir
```

`--port` is worth passing: the default is `0`, i.e. a **random** port.

## Privacy

The pages render your own Claude Code history — prompts, source, paths, secrets
you once pasted. Reading it locally is the point of the app. But screenshots and
HTML dumps of a real session are private conversation content: **never attach
them to a PR, issue, or commit.** For anything shareable, run with `--root`
pointing at a throwaway log dir and capture that instead.

## Drive it

Start the server, then walk the routes — this is the whole harness:

```bash
bun run web --port 4111 >/tmp/clauspect.log 2>&1 &
sleep 1.2
ID=$(curl -s localhost:4111/ | grep -o '/sessions/[0-9a-f-]\{36\}' | head -1 | cut -d/ -f3)

for p in "/" "/sessions/$ID" "/sessions/$ID/raw" "/search?q=bun"; do
  curl -s -o /dev/null -w "%{http_code} $p\n" "localhost:4111$p"
done

pkill -f web/index.tsx
```

All four print `200`. Drop `-o /dev/null` to grep the HTML instead of the status.

Subagent routes (`/sessions/:id/agents/:agentId`) need a session that has one:
`find ~/.claude/projects -type d -name subagents`.

## Screenshot

With the server running:

```bash
CHROME=$(command -v google-chrome || command -v chromium || \
  echo "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")

"$CHROME" --headless --disable-gpu --hide-scrollbars --window-size=1280,1600 \
  --screenshot=/tmp/detail.png "http://localhost:4111/sessions/$ID"
```

Open the PNG with the Read tool — the detail page exercises the most view code
(markdown, tool rows, hook attachments, usage bar, subagent links). Delete it
afterwards; see Privacy.

## Test

```bash
bun test          # 28 tests, ~50ms
bun run typecheck
bun run check     # biome lint + format, writes fixes
```

Most changes are to pure functions in `domain/` or `web/views/` and need no
server:

```bash
bun -e 'import {parseEntries} from "./domain/model/jsonl";
console.log(parseEntries(`{"type":"ai-title","aiTitle":"hi","sessionId":"x"}`).entries)'
```

## Gotchas

- **The default port is random** (`DEFAULT_PORT = 0`). Nothing listens on 3000.
  To capture the real port, parse stdout: `listening on http://localhost:(\d+)`.

- **Session files must be named `<uuid>.jsonl` or they are silently invisible.**
  `SessionStore` filters on a strict `UUID_REGEX` — a file named `session.jsonl`
  yields an empty list page with no error and no warning. Same in URLs: a
  non-UUID id 404s before any file is read.

- **Search does not index subagent transcripts.** `runSearch` only scans each
  `session.jsonl`; the `<sessionId>/subagents/agent-*.jsonl` sidecars are never
  read. Text that exists *only* in a subagent is unfindable from `/search`.

- **Thinking blocks are parsed but never rendered** in the conversation view
  (the raw view shows them). Current behavior, not a bug you introduced.

- **Usage totals span the session *and* its subagents** — real token spend lives
  in the sidecars, so `/sessions/:id` aggregates both.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Port stuck, or a tool call hangs forever | `bun run web` was backgrounded and only the wrapper died. `pkill -f web/index.tsx`. |
| List page renders but is empty | Wrong `--root`, or the file isn't named `<uuid>.jsonl`. |
| Server exits immediately | TypeScript error in a view; `bun run typecheck` names it. |
