import { expect, test } from "bun:test";
import { renderMarkdown } from "./markdown";

test("headings", () => {
	expect(renderMarkdown("# Hi")).toBe("<h1>Hi</h1>");
	expect(renderMarkdown("### Deep")).toBe("<h3>Deep</h3>");
});

test("inline bold, italic, code", () => {
	expect(renderMarkdown("**a** *b* `c`")).toBe(
		"<p><strong>a</strong> <em>b</em> <code>c</code></p>",
	);
});

test("fenced code block preserves content and skips inline", () => {
	expect(renderMarkdown("```ts\nconst x = **1**;\n```")).toBe(
		'<pre><code class="language-ts">const x = **1**;</code></pre>',
	);
});

test("unordered and ordered lists", () => {
	expect(renderMarkdown("- a\n- b")).toBe("<ul><li>a</li><li>b</li></ul>");
	expect(renderMarkdown("1. a\n2. b")).toBe("<ol><li>a</li><li>b</li></ol>");
});

test("links only allow safe schemes", () => {
	expect(renderMarkdown("[x](https://example.com)")).toBe(
		'<p><a href="https://example.com" target="_blank" rel="noopener">x</a></p>',
	);
	expect(renderMarkdown("[x](javascript:alert(1))")).toBe(
		"<p>[x](javascript:alert(1))</p>",
	);
});

test("escapes raw HTML so it cannot inject", () => {
	expect(renderMarkdown("<script>alert(1)</script>")).toBe(
		"<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>",
	);
});

test("code span content is escaped, not executed", () => {
	expect(renderMarkdown("`<b>`")).toBe("<p><code>&lt;b&gt;</code></p>");
});

test("blockquote and rule", () => {
	expect(renderMarkdown("> quoted")).toBe(
		"<blockquote><p>quoted</p></blockquote>",
	);
	expect(renderMarkdown("---")).toBe("<hr>");
});

test("paragraph joins soft-wrapped lines", () => {
	expect(renderMarkdown("one\ntwo")).toBe("<p>one two</p>");
});

test("GFM table", () => {
	const md = "| a | b |\n|---|---|\n| 1 | `x` |";
	expect(renderMarkdown(md)).toBe(
		"<table><thead><tr><th>a</th><th>b</th></tr></thead>" +
			"<tbody><tr><td>1</td><td><code>x</code></td></tr></tbody></table>",
	);
});

test("pipe in prose is not a table", () => {
	expect(renderMarkdown("a | b")).toBe("<p>a | b</p>");
});
