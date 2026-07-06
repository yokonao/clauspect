// Minimal Markdown -> HTML renderer for assistant responses.
//
// The whole source is HTML-escaped before any markup is applied, so no raw
// HTML from the model output can reach the page — only the tags emitted here.
// Scope is limited to what Claude Code responses actually use: fenced/inline
// code, headings, lists, tables, blockquotes, rules, links, bold and italic.

function escapeHtml(s: string): string {
	return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// URL is already HTML-escaped; only pass through schemes that can't script.
function safeUrl(url: string): string | undefined {
	return /^(https?:\/\/|mailto:|\/|#)/i.test(url) ? url : undefined;
}

// Inline formatting on an already-escaped fragment. Splitting on code spans
// keeps their contents out of emphasis/link processing (odd indices are the
// captured code contents).
function inline(s: string): string {
	return s
		.split(/`([^`]+)`/)
		.map((part, i) => (i % 2 ? `<code>${part}</code>` : emphasis(part)))
		.join("");
}

function emphasis(s: string): string {
	return s
		.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, text, url) => {
			const safe = safeUrl(url);
			return safe
				? `<a href="${safe}" target="_blank" rel="noopener">${text}</a>`
				: m;
		})
		.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
		.replace(/(^|[^*])\*([^*\s][^*]*?)\*/g, "$1<em>$2</em>");
}

function isBlockStart(line: string): boolean {
	return (
		/^```/.test(line) ||
		/^#{1,6}\s/.test(line) ||
		/^(---|\*\*\*|___)\s*$/.test(line) ||
		/^&gt;\s?/.test(line) ||
		/^\s*[-*+]\s+/.test(line) ||
		/^\s*\d+\.\s+/.test(line)
	);
}

// A GFM table delimiter row, e.g. `| --- | :--: |`.
function isTableDelim(line: string): boolean {
	return line.includes("|") && /^[\s|:-]+$/.test(line) && line.includes("-");
}

function tableCells(row: string): string[] {
	return row
		.trim()
		.replace(/^\||\|$/g, "")
		.split("|")
		.map((c) => c.trim());
}

export function renderMarkdown(src: string): string {
	return renderEscaped(escapeHtml(src));
}

// Block parsing over already-escaped source (blockquotes recurse here so their
// contents aren't escaped twice).
function renderEscaped(escaped: string): string {
	const lines = escaped.split("\n");
	const at = (n: number): string => lines[n] ?? "";
	const out: string[] = [];
	let i = 0;

	while (i < lines.length) {
		const line = at(i);

		const fence = line.match(/^```(\S*)\s*$/);
		if (fence) {
			const buf: string[] = [];
			i++;
			while (i < lines.length && !/^```\s*$/.test(at(i))) buf.push(at(i++));
			i++; // closing fence
			const cls = fence[1] ? ` class="language-${fence[1]}"` : "";
			out.push(`<pre><code${cls}>${buf.join("\n")}</code></pre>`);
			continue;
		}

		const h = line.match(/^(#{1,6})\s+(.*)$/);
		if (h) {
			const [, hashes = "", text = ""] = h;
			out.push(`<h${hashes.length}>${inline(text)}</h${hashes.length}>`);
			i++;
			continue;
		}

		if (/^(---|\*\*\*|___)\s*$/.test(line)) {
			out.push("<hr>");
			i++;
			continue;
		}

		if (/^&gt;\s?/.test(line)) {
			const buf: string[] = [];
			while (i < lines.length && /^&gt;\s?/.test(at(i)))
				buf.push(at(i++).replace(/^&gt;\s?/, ""));
			out.push(`<blockquote>${renderEscaped(buf.join("\n"))}</blockquote>`);
			continue;
		}

		if (/^\s*[-*+]\s+/.test(line)) {
			const items: string[] = [];
			while (i < lines.length && /^\s*[-*+]\s+/.test(at(i)))
				items.push(at(i++).replace(/^\s*[-*+]\s+/, ""));
			out.push(
				`<ul>${items.map((it) => `<li>${inline(it)}</li>`).join("")}</ul>`,
			);
			continue;
		}

		if (/^\s*\d+\.\s+/.test(line)) {
			const items: string[] = [];
			while (i < lines.length && /^\s*\d+\.\s+/.test(at(i)))
				items.push(at(i++).replace(/^\s*\d+\.\s+/, ""));
			out.push(
				`<ol>${items.map((it) => `<li>${inline(it)}</li>`).join("")}</ol>`,
			);
			continue;
		}

		if (line.includes("|") && i + 1 < lines.length && isTableDelim(at(i + 1))) {
			const header = tableCells(line);
			i += 2; // header + delimiter
			const rows: string[][] = [];
			while (i < lines.length && at(i).includes("|") && at(i).trim())
				rows.push(tableCells(at(i++)));
			const th = header.map((c) => `<th>${inline(c)}</th>`).join("");
			const body = rows
				.map(
					(r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`,
				)
				.join("");
			out.push(
				`<table><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table>`,
			);
			continue;
		}

		if (line.trim() === "") {
			i++;
			continue;
		}

		const buf: string[] = [];
		while (
			i < lines.length &&
			at(i).trim() !== "" &&
			!isBlockStart(at(i)) &&
			!(at(i).includes("|") && isTableDelim(at(i + 1)))
		)
			buf.push(at(i++));
		out.push(`<p>${inline(buf.join(" "))}</p>`);
	}

	return out.join("\n");
}
