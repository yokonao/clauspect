// The salient text of a tool call: which input field(s) best represent it.
// Full length, no truncation — search indexes this and the conversation view
// truncates it for display. MCP/unknown tools have arbitrary input, so we
// don't guess; the tool name and raw JSON link are enough.
export function toolInputText(
	name: string,
	input: Record<string, unknown>,
): string {
	switch (name) {
		case "Bash":
			return String(input.command ?? "");
		case "Read":
		case "Write":
		case "Edit":
			return String(input.file_path ?? "");
		case "NotebookEdit":
			return String(input.notebook_path ?? "");
		case "WebSearch":
			return String(input.query ?? "");
		case "WebFetch":
			return String(input.url ?? "");
		case "Agent":
			return String(input.description ?? input.prompt ?? "");
		case "Skill":
			return String(input.skill ?? "");
		case "Monitor":
			return String(input.command ?? input.description ?? "");
		case "LSP":
			return `${input.operation} ${input.filePath}:${input.line}`;
		case "TaskCreate":
		case "TaskUpdate":
		case "TaskGet":
			return String(input.subject ?? input.taskId ?? "");
		case "AskUserQuestion": {
			const questions = input.questions;
			if (!Array.isArray(questions)) return "";
			return questions
				.map((q) => (q as { question?: string }).question ?? "")
				.filter(Boolean)
				.join(" / ");
		}
		default:
			return "";
	}
}
