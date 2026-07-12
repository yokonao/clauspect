// Extracted from the original shell view; edit styles here.
export const CSS = `
:root {
  --bg: #f0eee6;
  --surface: #ffffff;
  --surface-2: #faf9f5;
  --ink: #1a1915;
  --muted: #6b6a63;
  --faint: #737166;
  --border: #e4e1d6;
  --border-strong: #d5d1c4;
  --accent: #b04e2e;
  --accent-hover: #973f22;
  --accent-soft: #f6ece6;
  --user: #6f5f4b;
  --user-soft: #efe9dd;
  --header-bg: rgba(240,238,230,0.85);
  --focus-ring: rgba(176,78,46,0.30);
  --mark: #f7e3a1;
  --mark-ink: var(--ink);
  --danger: #b3452a;
  --accent-soft-hover: #efe0d6;
  /* Code surfaces (blocks, tool/usage badges): always dark bg, light ink —
     not flipped in dark mode. */
  --code-bg: #1a1915;
  --code-ink: #f0eee6;
  --serif: "Times New Roman", "Georgia", "Iowan Old Style", serif;
  --sans: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
  --mono: ui-monospace, "SF Mono", "Fira Code", "JetBrains Mono", Menlo, monospace;
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: var(--sans);
  background: var(--bg);
  color: var(--ink);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}
a { color: var(--accent); text-decoration: none; }
a:hover { color: var(--accent-hover); text-decoration: underline; }

/* Keyboard focus: visible on every interactive element, regardless of theme */
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 3px; }
a:focus-visible, .row:focus-within { outline-offset: 2px; }

header {
  background: var(--header-bg);
  backdrop-filter: saturate(180%) blur(12px);
  border-bottom: 1px solid var(--border);
  padding: 16px 28px;
  display: flex;
  align-items: baseline;
  gap: 12px;
  position: sticky;
  top: 0;
  z-index: 10;
}
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  header { background: var(--bg); }
}
header .mark {
  width: 15px; height: 15px; border-radius: 50%;
  background: var(--accent);
  align-self: center;
  flex: none;
  box-shadow: 0 0 0 4px var(--accent-soft);
}
header h1 {
  font-family: var(--serif);
  font-size: 1.35rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--ink);
}
header .sub { font-size: 0.8rem; color: var(--muted); }

.container { max-width: 1180px; margin: 0 auto; padding: 40px 24px 80px; }

/* Toolbar */
.toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 24px;
  flex-wrap: wrap;
  align-items: center;
}
input[type=text], select {
  padding: 9px 13px;
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  font-size: 0.9rem;
  font-family: var(--sans);
  background: var(--surface);
  color: var(--ink);
  transition: border-color 0.15s, box-shadow 0.15s;
}
input[type=text] { min-width: 300px; }
input[type=text]::placeholder { color: var(--faint); }
input[type=text]:focus, select:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--focus-ring);
}
.count { font-size: 0.82rem; color: var(--muted); margin-left: 2px; }

/* Buttons and button-styled links (search submit, toolbar entry point) */
.btn {
  padding: 9px 15px;
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  background: var(--surface);
  color: var(--ink);
  font-size: 0.9rem;
  font-family: var(--sans);
  cursor: pointer;
  white-space: nowrap;
}
.btn:hover { border-color: var(--accent); color: var(--accent); text-decoration: none; }
.btn.right { margin-left: auto; }

/* Full-text search results */
.results { display: flex; flex-direction: column; gap: 20px; }
.result {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
}
.result-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 12px 18px;
  background: var(--surface-2);
  border-bottom: 1px solid var(--border);
}
.result-head:hover { text-decoration: none; }
.hits { display: flex; flex-direction: column; }
.hit {
  display: flex;
  gap: 12px;
  align-items: baseline;
  padding: 10px 18px;
  border-bottom: 1px solid var(--border);
  color: var(--ink);
}
.hit:last-child { border-bottom: none; }
.hit:hover { background: var(--accent-soft); text-decoration: none; }
.hit-kind {
  flex: none;
  width: 72px;
  font-family: var(--mono);
  font-size: 0.66rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted);
}
.hit-snippet {
  min-width: 0;
  font-size: 0.86rem;
  color: var(--muted);
  line-height: 1.55;
  word-break: break-word;
  overflow-wrap: anywhere;
}
.hit-snippet mark {
  background: var(--mark);
  color: var(--mark-ink);
  border-radius: 3px;
  padding: 0 2px;
}
.more { display: block; padding: 9px 18px; font-size: 0.8rem; color: var(--accent); }

/* Table */
table {
  width: 100%;
  border-collapse: collapse;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
}
thead { background: var(--surface-2); }
th {
  padding: 12px 18px;
  text-align: left;
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
  border-bottom: 1px solid var(--border);
}
td {
  padding: 14px 18px;
  font-size: 0.9rem;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}
tr:last-child td { border-bottom: none; }
tr.row { transition: background 0.12s; }
tr.row:hover { background: var(--accent-soft); cursor: pointer; }

.ts { color: var(--faint); font-size: 0.8rem; white-space: nowrap; }
.badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  color: var(--muted);
  font-size: 0.74rem;
  font-family: var(--mono);
  max-width: 340px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.uuid { font-family: var(--mono); font-size: 0.78rem; color: var(--muted); }
.title { font-weight: 600; color: var(--ink); }
.title.untitled { font-weight: 400; color: var(--faint); font-style: italic; }
/* Real anchor so the row is reachable and activatable by keyboard */
.row-link { display: flex; flex-direction: column; gap: 3px; color: inherit; }
.row-link:hover { color: inherit; text-decoration: none; }
.session-title {
  font-family: var(--serif);
  font-size: 2rem;
  font-weight: 600;
  letter-spacing: -0.015em;
  color: var(--ink);
  margin: 10px 0 20px;
  line-height: 1.25;
}
.session-title.untitled { font-weight: 400; color: var(--faint); font-style: italic; }
.sub-id { font-family: var(--mono); font-size: 0.72rem; color: var(--faint); margin-top: 3px; }

/* Detail page */
.back {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 22px;
  font-size: 0.875rem;
  color: var(--muted);
}
.back:hover { color: var(--accent); }
.meta {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 18px 22px;
  margin-bottom: 28px;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px 20px;
  align-items: baseline;
}
.meta-label { font-size: 0.68rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.07em; white-space: nowrap; }
.meta-value { font-family: var(--mono); font-size: 0.82rem; color: var(--ink); word-break: break-all; }

/* Usage panel */
.usage {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 18px 22px;
  margin-bottom: 28px;
}
.usage-head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 14px; }
.usage-title {
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
}
.usage-note { font-size: 0.74rem; color: var(--faint); font-family: var(--mono); }
.usage-stats { display: flex; flex-wrap: wrap; gap: 10px 28px; }
.usage-stat { display: flex; flex-direction: column; gap: 2px; }
.usage-num { font-family: var(--mono); font-size: 1.1rem; font-weight: 600; color: var(--ink); }
.usage-label { font-size: 0.68rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; }
.usage-tools {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}
.usage-tool {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 6px 2px 9px;
  border-radius: 999px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  font-family: var(--mono);
  font-size: 0.72rem;
  color: var(--muted);
}
.usage-tool-n {
  background: var(--code-bg);
  color: var(--code-ink);
  border-radius: 999px;
  padding: 0 6px;
  font-size: 0.68rem;
  font-weight: 600;
}

/* Conversation */
#conv {
  background: transparent;
  box-shadow: none;
  padding: 0;
}

.turn {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 8px;
  margin-bottom: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.msg {
  border-radius: 11px;
  padding: 18px 20px;
}
.msg.user      { background: var(--user-soft); }
.msg.assistant { background: var(--surface-2); }

.role {
  font-size: 0.66rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  margin-bottom: 10px;
}
.msg.user .role      { color: var(--user); }
.msg.assistant .role { color: var(--muted); }
.role time { font-size: 0.9em; font-weight: 400; color: var(--faint); letter-spacing: 0; text-transform: none; margin-left: 6px; }

.text {
  font-size: 0.92rem;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
}

/* Markdown-rendered assistant text */
.md { white-space: normal; }
.md > :first-child { margin-top: 0; }
.md > :last-child { margin-bottom: 0; }
.md p { margin: 10px 0; }
.md h1, .md h2, .md h3, .md h4, .md h5, .md h6 {
  font-family: var(--serif);
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.3;
  margin: 18px 0 8px;
}
.md h1 { font-size: 1.4rem; }
.md h2 { font-size: 1.2rem; }
.md h3 { font-size: 1.05rem; }
.md h4, .md h5, .md h6 { font-size: 0.95rem; }
.md ul, .md ol { margin: 10px 0; padding-left: 1.5em; }
.md li { margin: 3px 0; }
.md li > ul, .md li > ol { margin: 3px 0; }
.md a { text-decoration: underline; }
.md strong { font-weight: 650; }
.md code {
  font-family: var(--mono);
  font-size: 0.86em;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 5px;
  padding: 1px 5px;
}
.md pre {
  background: var(--code-bg);
  border-radius: 10px;
  padding: 14px 16px;
  margin: 12px 0;
  overflow-x: auto;
}
.md pre code {
  font-size: 0.82rem;
  background: none;
  border: none;
  padding: 0;
  color: var(--code-ink);
  white-space: pre;
}
.md blockquote {
  border-left: 3px solid var(--border-strong);
  padding-left: 14px;
  margin: 12px 0;
  color: var(--muted);
}
.md hr { border: none; border-top: 1px solid var(--border-strong); margin: 20px 0; }
.md table {
  border-collapse: collapse;
  margin: 12px 0;
  font-size: 0.86rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  display: block;
  overflow-x: auto;
  width: max-content;
  max-width: 100%;
}
.md thead { background: var(--surface-2); }
.md th, .md td {
  border: 1px solid var(--border);
  padding: 7px 12px;
  text-align: left;
  vertical-align: top;
}
.md th { font-weight: 600; }

/* Block rhythm: consecutive tools stay tight, but a divider + extra space
   separates a run of tools from surrounding prose. */
.text + .text { margin-top: 14px; }
.tool + .tool { margin-top: 5px; }
.text + .tool,
.tool + .text,
.tanswer + .text,
.plan + .text {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

/* Tool rows */
.tool {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  font-family: var(--mono);
  font-size: 0.8rem;
}
.tname {
  flex: none;
  background: var(--code-bg);
  color: var(--code-ink);
  padding: 2px 9px;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.74rem;
}
.targ {
  min-width: 0;
  color: var(--muted);
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
  padding-top: 1px;
}
/* User's chosen answers under an AskUserQuestion tool row */
.tanswer {
  margin: 5px 0 0 0;
  color: var(--accent);
  font-family: var(--mono);
  font-size: 0.78rem;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.tanswer + .tool { margin-top: 5px; }

/* ExitPlanMode proposed-plan body */
.plan {
  margin: 8px 0 0 0;
  padding: 14px 18px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-left: 3px solid var(--accent);
  border-radius: 10px;
  font-size: 0.88rem;
}

/* A hook firing surfaced inline in the turn. Self-labeled so it doesn't read as
   assistant speech, regardless of which message box it lands in. */
.hook {
  margin: 6px 0;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-left: 3px solid var(--faint);
  border-radius: 8px;
  background: var(--surface);
  font-size: 0.8rem;
}
.hook-error,
.hook-blocked { border-left-color: var(--danger); }
.hook-head {
  display: flex;
  align-items: baseline;
  gap: 9px;
  font-family: var(--mono);
}
.hook-tag {
  flex: none;
  color: var(--muted);
  font-weight: 600;
  font-size: 0.74rem;
}
.hook-name {
  color: var(--faint);
  font-size: 0.74rem;
}
.hook-body {
  margin-top: 6px;
  color: var(--muted);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-family: var(--mono);
  font-size: 0.76rem;
}

.compact {
  display: flex;
  align-items: center;
  gap: 14px;
  color: var(--faint);
  font-size: 0.75rem;
  font-style: italic;
  margin: 26px 4px;
}
.compact::before,
.compact::after {
  content: "";
  flex: 1;
  border-top: 1px solid var(--border-strong);
}

/* Inline link from an Agent tool row to its subagent history */
.agent-link {
  flex: none;
  margin-left: auto;
  padding: 2px 9px;
  border-radius: 6px;
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
  white-space: nowrap;
  font-size: 0.74rem;
}
.agent-link:hover { background: var(--accent-soft-hover); color: var(--accent-hover); text-decoration: none; }

/* Raw-JSON link on tool rows: hidden at rest to keep the row minimal, revealed
   on hover and — for keyboard reach — on focus (opacity keeps it tab-navigable). */
.raw-link {
  flex: none;
  margin-left: auto;
  padding: 2px 8px;
  border-radius: 6px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  color: var(--muted);
  font-family: var(--mono);
  font-weight: 600;
  font-size: 0.72rem;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.12s;
}
.agent-link + .raw-link { margin-left: 6px; }
.tool:hover .raw-link,
.tool:focus-within .raw-link,
.raw-link:focus-visible { opacity: 1; }
.raw-link:hover { background: var(--accent-soft); color: var(--accent); text-decoration: none; }

/* Raw JSONL view */
.raw-list { display: flex; flex-direction: column; gap: 28px; margin-top: 20px; }
.raw-entry {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  scroll-margin-top: 90px;
}
.raw-entry:target { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.raw-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 8px 14px;
  background: var(--surface-2);
  border-bottom: 1px solid var(--border);
  font-family: var(--mono);
  font-size: 0.74rem;
}
.raw-type { font-weight: 600; color: var(--ink); }
.raw-ts { color: var(--faint); }
.raw-json {
  margin: 0;
  padding: 14px 16px;
  background: var(--surface-2);
  font-family: var(--mono);
  font-size: 0.78rem;
  line-height: 1.5;
  color: var(--ink);
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
}

/* Subagents section on the session detail page */
.section {
  font-family: var(--serif);
  font-size: 1.15rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  text-transform: none;
  color: var(--ink);
  margin: 36px 4px 14px;
}
.agent-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
.agent-card {
  display: flex;
  flex-direction: column;
  gap: 5px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 16px 18px;
  transition: border-color 0.12s, transform 0.12s;
}
.agent-card:hover { border-color: var(--accent); transform: translateY(-1px); text-decoration: none; }
.agent-desc { font-size: 0.92rem; font-weight: 600; color: var(--ink); }
.agent-type { font-size: 0.75rem; color: var(--muted); font-family: var(--mono); }

.state { padding: 48px; text-align: center; color: var(--faint); font-style: italic; }
.err { color: var(--danger); padding: 20px; }

/* Dark theme: follow OS setting. Only palette values change — --code-bg /
   --code-ink stay dark on purpose, so code blocks and badges look identical. */
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #1a1815;
    --surface: #242219;
    --surface-2: #2b2820;
    --ink: #ece8dd;
    --muted: #a29e91;
    --faint: #837f74;
    --border: #35322a;
    --border-strong: #464236;
    --accent: #d4744f;
    --accent-hover: #e59470;
    --accent-soft: #3a281f;
    --user: #c6b394;
    --user-soft: #2c281f;
    --header-bg: rgba(26,24,21,0.85);
    --focus-ring: rgba(212,116,79,0.40);
    --mark: #6a5518;
    --mark-ink: #f6e7b4;
    --danger: #e8846b;
    --accent-soft-hover: #4a3225;
  }
}
`;
