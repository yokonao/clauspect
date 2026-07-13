---
name: run-clauspect
description: Run, launch, serve, smoke-test, or screenshot clauspect — the local web viewer for Claude Code session JSONL logs. Use when asked to start the app, check a rendering change in the real UI, or capture screenshots of the session list, conversation, subagent, raw, or search pages.
---

# Run clauspect

Bun + Hono web app that reads `$HOME/.claude/projects` and server-renders the
session logs as HTML.

**Zero client-side JavaScript.** Every page is server-rendered, so `curl` is the
driver — no browser automation, no fixture, no custom harness. Whatever is
already in your `~/.claude/projects` is the corpus; a normal history covers
thinking blocks, tool calls, hooks, images, compact boundaries, api errors and
subagents without you having to synthesize anything.

Paths are relative to the repo root.

## Privacy — read this before sharing any output

Every page renders **your own Claude Code history**: prompts, source code, file
paths, and anything you ever pasted into a session. Viewing it locally is the
whole point of the app and is fine. What is *not* fine:

- Do not attach screenshots, HTML dumps, or `curl` output from a real session to
  a PR, issue, commit, or bug report. They are private conversation content, not
  test output.
- Do not paste a real session's rendered text into a public channel to "show the
  bug."

If you need a shareable repro, point the server at a scratch `HOME` holding a
hand-written JSONL (see the `$HOME` gotcha below) and screenshot *that*:

```bash
FAKE=$(mktemp -d)
mkdir -p "$FAKE/.claude/projects/demo"
# session files MUST be named <uuid>.jsonl or they're invisible — see Gotchas
cat > "$FAKE/.claude/projects/demo/00000000-0000-4000-8000-000000000001.jsonl" <<'JSONL'
{"type":"user","parentUuid":null,"isSidechain":false,"uuid":"a","timestamp":"2026-01-01T00:00:00Z","cwd":"/demo","message":{"role":"user","content":"hello"}}
JSONL
HOME="$FAKE" bun run web --port 4111
```

## Setup

```bash
bun install
```

## Run

```bash
bun run web --port 4111
```

Open `http://localhost:4111`. Ctrl-C to stop.

Pass `--port` explicitly. The default is `0` (`DEFAULT_PORT` in
`web/index.tsx`), which binds a **random** port — nothing ever listens on 3000.

## Drive it (agent path)

Start the server, then walk the routes. This is the whole harness:

```bash
bun run web --port 4111 >/tmp/clauspect.log 2>&1 &
sleep 1.2

ID=$(curl -s localhost:4111/ | grep -o '/sessions/[0-9a-f-]\{36\}' | head -1 | cut -d/ -f3)

curl -s -o /dev/null -w 'list   %{http_code}\n' localhost:4111/
curl -s -o /dev/null -w 'detail %{http_code}\n' localhost:4111/sessions/$ID
curl -s -o /dev/null -w 'raw    %{http_code}\n' localhost:4111/sessions/$ID/raw
curl -s -o /dev/null -w 'search %{http_code}\n' "localhost:4111/search?q=bun"

pkill -f web/index.tsx
```

All four print `200`. To inspect rendering rather than status, drop the
`-o /dev/null` and grep the HTML.

A session with subagents (needed for `/sessions/:id/agents/:agentId`):

```bash
find ~/.claude/projects -type d -name subagents
```

## Screenshot

Headless Chrome, with the server already running. Pick whichever binary exists
on this machine:

```bash
CHROME=$(command -v google-chrome || command -v chromium || \
  echo "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")

"$CHROME" --headless --disable-gpu --hide-scrollbars --window-size=1280,1600 \
  --screenshot=/tmp/detail.png "http://localhost:4111/sessions/$ID"
```

Then actually open the PNG with the Read tool. The detail page exercises the
most view code: markdown, tool rows, hook attachments, the usage bar, and the
subagent link.

The PNG is a picture of a real conversation — see Privacy above. Delete it when
done (`rm /tmp/detail.png`) rather than leaving it in a shared `/tmp`.

## Test

```bash
bun test          # 27 tests, domain + views, ~30ms
bun run typecheck # tsc --noEmit
bun run check     # biome lint + format, writes fixes
```

Most changes here are to pure functions in `domain/` or `web/views/` and need no
server at all:

```bash
bun -e 'import {parseEntries} from "./domain/model/jsonl";
console.log(parseEntries(`{"type":"ai-title","aiTitle":"hi","sessionId":"x"}`).entries)'
```

## Gotchas

- **The default port is random.** See Run above. Anything that needs the real
  port must parse it off stdout: `listening on http://localhost:(\d+)`.

- **`$HOME` is the only way to point the app at different logs.** `SessionStore`
  takes a `root` option, but `web/routes.tsx` constructs it as
  `new SessionStore({ logger: consoleLogger })` — no `root`. So the directory is
  always `$HOME/.claude/projects`. To render a synthetic corpus, spawn the server
  with `HOME=/some/dir`; there is no flag and no config.

- **Session files must be named `<uuid>.jsonl` or they are silently invisible.**
  `SessionStore` filters on a strict `UUID_REGEX`. A file named `session.jsonl`
  yields an empty list page with no error and no warning. Same in URLs: a
  non-UUID id 404s before any file is touched.

- **Search does not index subagent transcripts.** `runSearch` in
  `web/routes.tsx` only parses each `session.jsonl`; the
  `<sessionId>/subagents/agent-*.jsonl` sidecars are never scanned. Text that
  exists *only* inside a subagent is unfindable from `/search`.

- **Thinking blocks are parsed but never rendered.** The schema accepts them and
  the raw view shows them, but the conversation view drops them. Current
  behavior, not a bug you introduced.

- **Malformed lines never crash a page.** `parseEntries` turns a bad line into a
  synthetic `__error__` entry that rides along with the good ones; the raw view
  keeps it verbatim as `unparseable`. Covered by `domain/model/jsonl.test.ts`.

- **Usage totals span the session *and* its subagents** — real token spend lives
  in the sidecars, so `/sessions/:id` aggregates both.

## Troubleshooting

| Symptom | Fix |
|---|---|
| A port is stuck, or a tool call hangs forever | `bun run web` was backgrounded and only the wrapper got killed. `pkill -f web/index.tsx`. |
| List page renders but is empty | `$HOME` isn't where you think, or the file isn't named `<uuid>.jsonl`. Check `ls $HOME/.claude/projects/*/`. |
| Server exits immediately | A TypeScript error in a view. `bun run typecheck` names it; the server logs it to stderr. |
