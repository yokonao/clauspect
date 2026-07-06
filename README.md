# Clauspect

Claude Code + Retrospect & Introspect = Clauspect

Inspect your Claude Code session histories. Clauspect reads the JSONL logs under
`~/.claude/projects` and renders them as readable conversations in a local web
viewer.

## Requirements

[Bun](https://bun.sh) runtime.

```
bun install
```

## Usage

```
bun run web
```

Then open the printed `http://localhost:<port>` URL to browse and read sessions
in the browser.

## Development

```
bun test          # run tests
bun run check     # lint + format (biome)
bun run typecheck # type check
```

## License

[MIT](LICENSE)
