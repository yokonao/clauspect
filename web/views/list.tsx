import type { SessionListData } from "../data";
import { abs, rel, shortName } from "./format";
import { renderPage, Shell } from "./shell";

// Filters already-rendered rows in place — no fetch, no HTML generation.
const filterScript = `
const rows = () => [...document.querySelectorAll("#tbody tr.row")];

function apply() {
  const q = document.getElementById("q").value.toLowerCase();
  const p = document.getElementById("proj").value;
  let n = 0;
  for (const r of rows()) {
    const show = (!p || r.dataset.dir === p) &&
      (!q || r.dataset.id.includes(q) || r.dataset.dir.toLowerCase().includes(q) ||
        r.dataset.title.toLowerCase().includes(q));
    r.hidden = !show;
    if (show) n++;
  }
  document.getElementById("cnt").textContent = n + " session" + (n !== 1 ? "s" : "");
}

document.getElementById("q").addEventListener("input", apply);
document.getElementById("proj").addEventListener("change", () => {
  const v = document.getElementById("proj").value;
  const u = new URL(location.href);
  v ? u.searchParams.set("project", v) : u.searchParams.delete("project");
  history.replaceState({}, "", u);
  apply();
});
apply();
`;

export function listPage(
	data: SessionListData,
	selected?: string | null,
): string {
	const { sessions, projects } = data;
	const now = new Date();
	return renderPage(
		<Shell title="clauspect — Session History">
			<div class="container">
				<div class="toolbar">
					<input
						type="text"
						id="q"
						placeholder="Search by title, project or session ID…"
						aria-label="Search sessions by title, project or session ID"
						autocomplete="off"
					/>
					<select id="proj" aria-label="Filter by project">
						<option value="">All projects</option>
						{projects.map((p) => (
							<option value={p} selected={p === selected}>
								{shortName(p)}
							</option>
						))}
					</select>
					<span class="count" id="cnt" aria-live="polite" />
					<a class="btn right" href="/search">
						Full-text search →
					</a>
				</div>
				<table>
					<thead>
						<tr>
							<th>Title</th>
							<th>Project</th>
							<th>Updated</th>
						</tr>
					</thead>
					<tbody id="tbody">
						{sessions.length === 0 ? (
							<tr>
								<td colspan={3} class="state">
									No sessions found
								</td>
							</tr>
						) : (
							sessions.map((s) => (
								<tr
									class="row"
									data-title={s.title || ""}
									data-dir={s.directory}
									data-id={s.id}
									onclick={`location.href='/sessions/${s.id}'`}
								>
									<td>
										<a class="row-link" href={`/sessions/${s.id}`}>
											{s.title ? (
												<span class="title">{s.title}</span>
											) : (
												<>
													<span class="title untitled">Untitled</span>
													<span class="sub-id">{s.id}</span>
												</>
											)}
										</a>
									</td>
									<td>
										<span class="badge" title={s.directory}>
											{shortName(s.directory)}
										</span>
									</td>
									<td>
										<span class="ts" title={abs(s.mtime)}>
											{rel(s.mtime, now)}
										</span>
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
			<script dangerouslySetInnerHTML={{ __html: filterScript }} />
		</Shell>,
	);
}
