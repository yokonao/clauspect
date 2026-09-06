# Clauspect

Claude Code + Retrospect & Introspect = Clauspect

Inspect your Claude Code session histories. Clauspect reads the JSONL logs under
`~/.claude/projects` and renders them as readable conversations in a local web
viewer.

## Install

Prebuilt binaries for macOS, Linux, and Windows are published on
[Releases](https://github.com/yokonao/clauspect/releases).

Via curl:

```
curl -fsSL https://github.com/yokonao/clauspect/releases/latest/download/clauspect-darwin-arm64 -o clauspect
chmod +x clauspect
sudo mv clauspect /usr/local/bin/
```

Swap `clauspect-darwin-arm64` for your platform: `clauspect-darwin-x64`,
`clauspect-linux-arm64`, `clauspect-linux-x64`, `clauspect-windows-x64.exe`.

Via [mise](https://mise.jdx.dev):

```
mise use -g github:yokonao/clauspect
```

Or run from source with [Bun](https://bun.sh):

```
bun install
bun run web
```

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
```

## Development

```
bun test          # run tests
bun run check     # lint + format (biome)
bun run typecheck # type check
```

## License

[MIT](LICENSE)
