import type { Child } from "hono/jsx";
import { CSS } from "./styles";

export function Shell(props: { title: string; children: Child }) {
	return (
		<html lang="ja">
			<head>
				<meta charset="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<title>{props.title}</title>
				<style dangerouslySetInnerHTML={{ __html: CSS }} />
			</head>
			<body>
				<header>
					<span class="mark" aria-hidden="true" />
					<h1>clauspect</h1>
					<span class="sub">Session History</span>
				</header>
				{props.children}
			</body>
		</html>
	);
}

// Renders a full page component to an HTML document string.
export function renderPage(node: Child): string {
	return `<!DOCTYPE html>\n${node}`;
}
