---
name: run-clauspect
description: Run, launch, serve, smoke-test, or screenshot clauspect — the local web viewer for Claude Code session JSONL logs. Use when asked to start the app, check a rendering change in the real UI, or capture screenshots of the session list, conversation, subagent, raw, or search pages.
---

# Run clauspect

Bun + Hono. Reads Claude Code session JSONL and server-renders it as HTML.
**No client-side JavaScript**, so a headless browser and `curl` are the whole
driver — nothing to install, nothing to maintain.

## Privacy

The pages render your own Claude Code history — prompts, source, paths, secrets
you once pasted. Reading it locally is the point of the app. But a screenshot or
HTML dump of a real session is private conversation content: **never attach one
to a PR, issue, or commit.** For anything shareable, point `--root` at a
throwaway log dir and capture that instead.

## Run it and look at it

A view change is only verified when you have *looked* at the page. Status codes
don't verify rendering — a page that lost its entire usage bar still returns
`200`. Screenshot it and read the PNG.

```bash
bun install
bun run web --port 4111 >/tmp/clauspect.log 2>&1 &   # --root <dir> to read other logs
sleep 1.2
ID=$(curl -s localhost:4111/ | grep -o '/sessions/[0-9a-f-]\{36\}' | head -1 | cut -d/ -f3)

CHROME=$(command -v google-chrome || command -v chromium || \
  echo "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
"$CHROME" --headless --disable-gpu --hide-scrollbars --window-size=1280,1600 \
  --screenshot=/tmp/detail.png "http://localhost:4111/sessions/$ID"

pkill -f web/index.tsx   # backgrounded: killing the wrapper leaves the server
```

Now Read `/tmp/detail.png`. The detail page exercises the most view code —
markdown, tool rows, hook attachments, the usage bar, subagent links. Delete the
PNG afterwards; see Privacy.

Swap the URL to shoot any other page. The routes are the object keys of
`createRoutes` in `web/routes.tsx`. The `/agents/:agentId` ones need a session
that actually spawned a subagent:

```bash
find ~/.claude/projects -type d -name subagents
```
