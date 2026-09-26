# Clauspect

Claude Code + Retrospect & Introspect = Clauspect

Inspect your Claude Code session histories. Clauspect reads the JSONL logs under
`~/.claude/projects` and renders them as readable conversations in a local web
viewer.

## Install

Download a binary from [GitHub Releases](https://github.com/yokonao/clauspect/releases), run `mise use -g github:yokonao/clauspect`, or run from source with `bun install && bun run web`. See [docs/install.md](docs/install.md) for the details and how to verify a release.

## Usage

```
clauspect        # or `bun run web` from source
```

Then open the printed `http://localhost:<port>` URL to browse and read sessions
in the browser.

Options:

```
clauspect --port 4111        # fixed port (default: a random free one)
clauspect --root ./sessions  # read logs from elsewhere (default: ~/.claude/projects)
clauspect --unix /tmp/clauspect.sock  # listen on a Unix domain socket instead of TCP
```

## Development

```
bun test          # run tests
bun run check     # lint + format (biome)
bun run typecheck # type check
```

## License

[MIT](LICENSE)
