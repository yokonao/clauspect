import type { HitKind, SearchHit } from "../../session/search";
import type { SearchData } from "../data";
import { shortName } from "./format";
import { renderPage, Shell } from "./shell";

const KIND_LABEL: Record<HitKind, string> = {
	user: "User",
	assistant: "Assistant",
	thinking: "Thinking",
	tool: "Tool",
};

function Hit(props: { sessionId: string; hit: SearchHit }) {
	const { sessionId, hit } = props;
	const href = hit.uuid
		? `/sessions/${sessionId}/raw#entry-${hit.uuid}`
		: `/sessions/${sessionId}`;
	return (
		<a class="hit" href={href}>
			<span class="hit-kind">{KIND_LABEL[hit.kind]}</span>
			<span class="hit-snippet">
				{hit.before}
				<mark>{hit.match}</mark>
				{hit.after}
			</span>
		</a>
	);
}

export function searchPage(data: SearchData): string {
	const { query, results, totalHits } = data;
	return renderPage(
		<Shell title="clauspect — search">
			<div class="container">
				<a href="/" class="back">
					← Back to sessions
				</a>
				<form class="toolbar" method="get" action="/search">
					<input
						type="text"
						name="q"
						value={query}
						placeholder="Search conversation text…"
						aria-label="Search conversation text"
						autocomplete="off"
						autofocus
					/>
					<button type="submit" class="btn">
						Search
					</button>
					{query ? (
						<span class="count">
							{totalHits} hit{totalHits !== 1 ? "s" : ""} / {results.length}{" "}
							session{results.length !== 1 ? "s" : ""}
						</span>
					) : null}
				</form>

				{!query ? (
					<div class="state">Enter a search term</div>
				) : results.length === 0 ? (
					<div class="state">No hits</div>
				) : (
					<div class="results">
						{results.map((r) => (
							<div class="result">
								<a class="result-head" href={`/sessions/${r.session.id}`}>
									<span class="title">{r.session.title || "Untitled"}</span>
									<span class="badge" title={r.session.directory}>
										{shortName(r.session.directory)}
									</span>
								</a>
								<div class="hits">
									{r.hits.map((h) => (
										<Hit sessionId={r.session.id} hit={h} />
									))}
									{r.totalHits > r.hits.length ? (
										<a class="more" href={`/sessions/${r.session.id}`}>
											+{r.totalHits - r.hits.length} more
										</a>
									) : null}
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</Shell>,
	);
}
