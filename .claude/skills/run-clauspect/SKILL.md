---
name: run-clauspect
description: Run, launch, serve, smoke-test, or screenshot clauspect — the local web viewer for Claude Code session JSONL logs. Use when asked to start the app, check a rendering change in the real UI, or capture screenshots of the session list, conversation, subagent, raw, or search pages.
---

# Run clauspect

Bun + Hono, reading Claude Code session logs and server-rendering them as HTML.
**No client-side JavaScript**, so `curl` is the driver — nothing to install,
nothing to maintain. Paths are relative to the repo root.

```bash
bun install
bun run web --port 4111                     # your real ~/.claude/projects
bun run web --port 4111 --root ./throwaway  # any other log dir
```

## Privacy

The pages render your own Claude Code history — prompts, source, paths, secrets
you once pasted. Reading it locally is the point of the app. But a screenshot or
HTML dump of a real session is private conversation content: **never attach one
to a PR, issue, or commit.** For anything shareable, point `--root` at a
throwaway log dir and capture that instead.

## Drive it

```bash
bun run web --port 4111 >/tmp/clauspect.log 2>&1 &
sleep 1.2
ID=$(curl -s localhost:4111/ | grep -o '/sessions/[0-9a-f-]\{36\}' | head -1 | cut -d/ -f3)

for p in "/" "/sessions/$ID" "/sessions/$ID/raw" "/search?q=bun"; do
  curl -s -o /dev/null -w "%{http_code} $p\n" "localhost:4111$p"
done

pkill -f web/index.tsx   # backgrounded: killing the wrapper leaves the server
```

All four print `200`. Drop `-o /dev/null` to grep the HTML instead of the status.

`/sessions/:id/agents/:agentId` needs a session that has a subagent — find one
with `find ~/.claude/projects -type d -name subagents`.

## Screenshot

With the server running:

```bash
CHROME=$(command -v google-chrome || command -v chromium || \
  echo "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")

"$CHROME" --headless --disable-gpu --hide-scrollbars --window-size=1280,1600 \
  --screenshot=/tmp/detail.png "http://localhost:4111/sessions/$ID"
```

Read the PNG — the detail page exercises the most view code (markdown, tool
rows, hook attachments, usage bar, subagent links). Delete it after; see Privacy.
