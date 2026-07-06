import { z } from "zod";

// --- Assistant message content blocks ---

const ThinkingContentSchema = z.object({
	type: z.literal("thinking"),
	thinking: z.string(),
	signature: z.string().optional(),
});

const TextContentSchema = z.object({
	type: z.literal("text"),
	text: z.string(),
});

const ToolUseContentSchema = z.object({
	type: z.literal("tool_use"),
	id: z.string(),
	name: z.string(),
	input: z.record(z.string(), z.unknown()),
	caller: z.object({ type: z.string() }).optional(),
});

const AssistantContentBlockSchema = z.discriminatedUnion("type", [
	ThinkingContentSchema,
	TextContentSchema,
	ToolUseContentSchema,
]);

// --- User message content blocks ---

const ToolResultContentSchema = z.object({
	type: z.literal("tool_result"),
	tool_use_id: z.string(),
	content: z.union([z.string(), z.array(z.unknown())]),
	is_error: z.boolean().optional(),
});

const ImageSourceSchema = z.object({
	type: z.string(),
	media_type: z.string().optional(),
	data: z.string().optional(),
	url: z.string().optional(),
});

const ImageContentSchema = z.object({
	type: z.literal("image"),
	source: ImageSourceSchema,
});

const UserContentBlockSchema = z.discriminatedUnion("type", [
	ToolResultContentSchema,
	TextContentSchema,
	ImageContentSchema,
]);

// --- Message usage ---

const CacheCreationSchema = z.object({
	ephemeral_5m_input_tokens: z.number().optional(),
	ephemeral_1h_input_tokens: z.number().optional(),
});

const ServerToolUseSchema = z.object({
	web_search_requests: z.number().optional(),
	web_fetch_requests: z.number().optional(),
});

const IterationSchema = z.object({
	input_tokens: z.number(),
	output_tokens: z.number(),
	cache_read_input_tokens: z.number().optional(),
	cache_creation_input_tokens: z.number().optional(),
	cache_creation: CacheCreationSchema.optional(),
	type: z.string().optional(),
});

const MessageUsageSchema = z.object({
	input_tokens: z.number(),
	cache_creation_input_tokens: z.number().optional(),
	cache_read_input_tokens: z.number().optional(),
	output_tokens: z.number(),
	server_tool_use: ServerToolUseSchema.optional(),
	service_tier: z.string().nullable().optional(),
	cache_creation: CacheCreationSchema.optional(),
	inference_geo: z.string().nullable().optional(),
	iterations: z.array(IterationSchema).nullable().optional(),
	speed: z.string().nullable().optional(),
});

// --- Common session entry fields ---

const BaseEntrySchema = z.object({
	uuid: z.string().optional(),
	timestamp: z.string().optional(),
	userType: z.string().optional(),
	entrypoint: z.string().optional(),
	cwd: z.string().optional(),
	sessionId: z.string().optional(),
	version: z.string().optional(),
	gitBranch: z.string().optional(),
});

// --- Entry types ---

const AssistantMessageSchema = z.object({
	model: z.string().optional(),
	id: z.string(),
	type: z.literal("message"),
	role: z.literal("assistant"),
	content: z.array(AssistantContentBlockSchema),
	stop_reason: z.string().nullable().optional(),
	stop_sequence: z.string().nullable().optional(),
	stop_details: z.unknown().optional(),
	usage: MessageUsageSchema.optional(),
});

export const AssistantEntrySchema = BaseEntrySchema.extend({
	type: z.literal("assistant"),
	parentUuid: z.string().nullable(),
	isSidechain: z.boolean(),
	message: AssistantMessageSchema,
});

const UserMessageSchema = z.object({
	role: z.literal("user"),
	content: z.union([z.string(), z.array(UserContentBlockSchema)]),
});

export const UserEntrySchema = BaseEntrySchema.extend({
	type: z.literal("user"),
	parentUuid: z.string().nullable(),
	isSidechain: z.boolean(),
	promptId: z.string().optional(),
	message: UserMessageSchema,
	permissionMode: z.string().optional(),
	toolUseResult: z
		.union([
			z.record(z.string(), z.unknown()),
			z.string(),
			z.array(z.unknown()),
		])
		.optional(),
});

// --- Attachment sub-types ---

const HookSuccessAttachmentSchema = z.object({
	type: z.literal("hook_success"),
	hookName: z.string(),
	toolUseID: z.string().optional(),
	hookEvent: z.string(),
	content: z.string(),
	stdout: z.string(),
	stderr: z.string(),
	exitCode: z.number(),
	command: z.string(),
	durationMs: z.number(),
});

const SkillListingAttachmentSchema = z.object({
	type: z.literal("skill_listing"),
	content: z.string(),
});

const AsyncHookResponseAttachmentSchema = z.object({
	type: z.literal("async_hook_response"),
	processId: z.string(),
	hookName: z.string(),
	hookEvent: z.string(),
	response: z.record(z.string(), z.unknown()),
	stdout: z.string(),
	stderr: z.string(),
	exitCode: z.number(),
});

const TaskReminderAttachmentSchema = z.object({
	type: z.literal("task_reminder"),
	content: z.array(z.unknown()),
	itemCount: z.number(),
});

const CommandPermissionsAttachmentSchema = z.object({
	type: z.literal("command_permissions"),
	allowedTools: z.array(z.string()).optional(),
	model: z.unknown().optional(),
});

const QueuedCommandAttachmentSchema = z.object({
	type: z.literal("queued_command"),
	prompt: z.string(),
	commandMode: z.string().optional(),
});

const AutoModeAttachmentSchema = z.object({
	type: z.literal("auto_mode"),
	reminderType: z.string().optional(),
});

const EditedTextFileAttachmentSchema = z.object({
	type: z.literal("edited_text_file"),
	filename: z.string(),
	snippet: z.string(),
});

const DeferredToolsDeltaAttachmentSchema = z.object({
	type: z.literal("deferred_tools_delta"),
	addedNames: z.array(z.string()),
	addedLines: z.array(z.string()).optional(),
	removedNames: z.array(z.string()),
});

const FileContentSchema = z
	.object({
		type: z.string(),
		file: z
			.object({
				filePath: z.string(),
				content: z.string(),
				numLines: z.number().optional(),
				startLine: z.number().optional(),
				totalLines: z.number().optional(),
			})
			.optional(),
		error: z.string().optional(),
	})
	.passthrough();

const FileAttachmentSchema = z.object({
	type: z.literal("file"),
	filename: z.string(),
	content: FileContentSchema,
	displayPath: z.string().optional(),
});

const AlreadyReadFileAttachmentSchema = z.object({
	type: z.literal("already_read_file"),
	filename: z.string(),
	content: FileContentSchema,
	displayPath: z.string().optional(),
});

const DiagnosticRangeSchema = z.object({
	start: z.object({ line: z.number(), character: z.number() }),
	end: z.object({ line: z.number(), character: z.number() }),
});

const DiagnosticItemSchema = z.object({
	message: z.string(),
	severity: z.string().optional(),
	range: DiagnosticRangeSchema.optional(),
	source: z.string().optional(),
	code: z.string().optional(),
});

const DiagnosticsAttachmentSchema = z.object({
	type: z.literal("diagnostics"),
	files: z.array(
		z.object({
			uri: z.string(),
			diagnostics: z.array(DiagnosticItemSchema),
		}),
	),
	isNew: z.boolean().optional(),
});

const InvokedSkillSchema = z.object({
	name: z.string(),
	path: z.string().optional(),
	content: z.string().optional(),
});

const InvokedSkillsAttachmentSchema = z.object({
	type: z.literal("invoked_skills"),
	skills: z.array(InvokedSkillSchema),
});

const NestedMemoryContentSchema = z.object({
	path: z.string(),
	type: z.string().optional(),
	content: z.string().optional(),
	contentDiffersFromDisk: z.boolean().optional(),
});

const NestedMemoryAttachmentSchema = z.object({
	type: z.literal("nested_memory"),
	path: z.string(),
	content: NestedMemoryContentSchema,
	displayPath: z.string().optional(),
});

const AgentListingDeltaAttachmentSchema = z.object({
	type: z.literal("agent_listing_delta"),
	addedTypes: z.array(z.string()),
	addedLines: z.array(z.string()).optional(),
	removedTypes: z.array(z.string()).optional(),
});

// Hook that failed without blocking the turn — same shape as hook_success minus
// the assembled `content`.
const HookNonBlockingErrorAttachmentSchema = z.object({
	type: z.literal("hook_non_blocking_error"),
	hookName: z.string(),
	toolUseID: z.string().optional(),
	hookEvent: z.string(),
	stderr: z.string(),
	stdout: z.string(),
	exitCode: z.number(),
	command: z.string().optional(),
	durationMs: z.number().optional(),
});

// Hook that blocked a tool; carries the message shown to the model.
const HookBlockingErrorAttachmentSchema = z.object({
	type: z.literal("hook_blocking_error"),
	hookName: z.string(),
	toolUseID: z.string().optional(),
	hookEvent: z.string(),
	blockingError: z
		.object({
			blockingError: z.string().optional(),
			command: z.string().optional(),
		})
		.passthrough(),
});

const DateChangeAttachmentSchema = z.object({
	type: z.literal("date_change"),
	newDate: z.string(),
});

const CompactFileReferenceAttachmentSchema = z.object({
	type: z.literal("compact_file_reference"),
	filename: z.string(),
	displayPath: z.string().optional(),
});

const DynamicSkillAttachmentSchema = z.object({
	type: z.literal("dynamic_skill"),
	skillDir: z.string(),
	skillNames: z.array(z.string()),
	displayPath: z.string().optional(),
});

const OpenedFileInIdeAttachmentSchema = z.object({
	type: z.literal("opened_file_in_ide"),
	filename: z.string(),
});

const SelectedLinesInIdeAttachmentSchema = z.object({
	type: z.literal("selected_lines_in_ide"),
	ideName: z.string().optional(),
	lineStart: z.number(),
	lineEnd: z.number(),
	filename: z.string(),
	content: z.string(),
	displayPath: z.string().optional(),
});

const PlanModeAttachmentSchema = z.object({
	type: z.literal("plan_mode"),
	reminderType: z.string().optional(),
	isSubAgent: z.boolean().optional(),
	planFilePath: z.string().optional(),
	planExists: z.boolean().optional(),
});

const PlanModeExitAttachmentSchema = z.object({
	type: z.literal("plan_mode_exit"),
	planFilePath: z.string().optional(),
	planExists: z.boolean().optional(),
});

const McpInstructionsDeltaAttachmentSchema = z.object({
	type: z.literal("mcp_instructions_delta"),
	addedNames: z.array(z.string()),
	addedBlocks: z.array(z.string()).optional(),
	removedNames: z.array(z.string()),
});

const AttachmentPayloadSchema = z.discriminatedUnion("type", [
	HookSuccessAttachmentSchema,
	SkillListingAttachmentSchema,
	AsyncHookResponseAttachmentSchema,
	TaskReminderAttachmentSchema,
	CommandPermissionsAttachmentSchema,
	QueuedCommandAttachmentSchema,
	AutoModeAttachmentSchema,
	EditedTextFileAttachmentSchema,
	DeferredToolsDeltaAttachmentSchema,
	FileAttachmentSchema,
	AlreadyReadFileAttachmentSchema,
	DiagnosticsAttachmentSchema,
	InvokedSkillsAttachmentSchema,
	NestedMemoryAttachmentSchema,
	AgentListingDeltaAttachmentSchema,
	HookNonBlockingErrorAttachmentSchema,
	HookBlockingErrorAttachmentSchema,
	DateChangeAttachmentSchema,
	CompactFileReferenceAttachmentSchema,
	DynamicSkillAttachmentSchema,
	OpenedFileInIdeAttachmentSchema,
	SelectedLinesInIdeAttachmentSchema,
	PlanModeAttachmentSchema,
	PlanModeExitAttachmentSchema,
	McpInstructionsDeltaAttachmentSchema,
]);

export const AttachmentEntrySchema = BaseEntrySchema.extend({
	type: z.literal("attachment"),
	parentUuid: z.string().nullable(),
	isSidechain: z.boolean(),
	attachment: AttachmentPayloadSchema,
});

// --- System entry ---

const TurnDurationSystemEntrySchema = BaseEntrySchema.extend({
	type: z.literal("system"),
	subtype: z.literal("turn_duration"),
	parentUuid: z.string().nullable(),
	isSidechain: z.boolean(),
	durationMs: z.number().optional(),
});

const StopHookSummarySystemEntrySchema = BaseEntrySchema.extend({
	type: z.literal("system"),
	subtype: z.literal("stop_hook_summary"),
	parentUuid: z.string().nullable(),
	isSidechain: z.boolean(),
	hookCount: z.number().optional(),
	hookInfos: z.array(z.record(z.string(), z.unknown())).optional(),
	hookErrors: z.array(z.unknown()).optional(),
	preventedContinuation: z.boolean().optional(),
	stopReason: z.string().optional(),
	hasOutput: z.boolean().optional(),
	level: z.string().optional(),
	toolUseID: z.string().optional(),
});

const AwaySummarySystemEntrySchema = BaseEntrySchema.extend({
	type: z.literal("system"),
	subtype: z.literal("away_summary"),
	content: z.string(),
	isMeta: z.boolean().optional(),
});

const InformationalSystemEntrySchema = BaseEntrySchema.extend({
	type: z.literal("system"),
	subtype: z.literal("informational"),
	parentUuid: z.string().nullable().optional(),
	isSidechain: z.boolean().optional(),
	content: z.string(),
	isMeta: z.boolean().optional(),
	level: z.string().optional(),
});

const ScheduledTaskFireSystemEntrySchema = BaseEntrySchema.extend({
	type: z.literal("system"),
	subtype: z.literal("scheduled_task_fire"),
	parentUuid: z.string().nullable().optional(),
	isSidechain: z.boolean().optional(),
	content: z.string(),
	isMeta: z.boolean().optional(),
	level: z.string().optional(),
});

const ApiErrorSystemEntrySchema = BaseEntrySchema.extend({
	type: z.literal("system"),
	subtype: z.literal("api_error"),
	parentUuid: z.string().nullable().optional(),
	isSidechain: z.boolean().optional(),
	level: z.string().optional(),
	error: z.record(z.string(), z.unknown()).optional(),
	retryInMs: z.number().optional(),
	retryAttempt: z.number().optional(),
	maxRetries: z.number().optional(),
});

const LocalCommandSystemEntrySchema = BaseEntrySchema.extend({
	type: z.literal("system"),
	subtype: z.literal("local_command"),
	parentUuid: z.string().nullable().optional(),
	isSidechain: z.boolean().optional(),
	content: z.string(),
	isMeta: z.boolean().optional(),
	level: z.string().optional(),
});

const CompactBoundarySystemEntrySchema = BaseEntrySchema.extend({
	type: z.literal("system"),
	subtype: z.literal("compact_boundary"),
	parentUuid: z.string().nullable().optional(),
	logicalParentUuid: z.string().nullable().optional(),
	isSidechain: z.boolean().optional(),
	content: z.string().optional(),
	isMeta: z.boolean().optional(),
	level: z.string().optional(),
	compactMetadata: z.record(z.string(), z.unknown()).optional(),
	slug: z.string().optional(),
});

export const SystemEntrySchema = z.discriminatedUnion("subtype", [
	TurnDurationSystemEntrySchema,
	StopHookSummarySystemEntrySchema,
	AwaySummarySystemEntrySchema,
	InformationalSystemEntrySchema,
	ScheduledTaskFireSystemEntrySchema,
	ApiErrorSystemEntrySchema,
	LocalCommandSystemEntrySchema,
	CompactBoundarySystemEntrySchema,
]);

// --- Other simple entry types ---

export const PermissionModeEntrySchema = z.object({
	type: z.literal("permission-mode"),
	permissionMode: z.string(),
	sessionId: z.string(),
});

export const LastPromptEntrySchema = z.object({
	type: z.literal("last-prompt"),
	lastPrompt: z.string().optional(),
	leafUuid: z.string().optional(),
	sessionId: z.string(),
});

export const FileHistorySnapshotEntrySchema = z.object({
	type: z.literal("file-history-snapshot"),
	messageId: z.string(),
	snapshot: z.object({
		messageId: z.string(),
		trackedFileBackups: z.record(z.string(), z.unknown()),
		timestamp: z.string(),
	}),
	isSnapshotUpdate: z.boolean(),
});

export const PrLinkEntrySchema = z.object({
	type: z.literal("pr-link"),
	sessionId: z.string(),
	prNumber: z.number(),
	prUrl: z.string(),
	prRepository: z.string(),
	timestamp: z.string(),
});

export const QueueOperationEntrySchema = z.object({
	type: z.literal("queue-operation"),
	operation: z.string(),
	timestamp: z.string(),
	sessionId: z.string(),
	content: z.string().optional(),
});

const WorktreeSessionSchema = z.object({
	originalCwd: z.string(),
	worktreePath: z.string(),
	worktreeName: z.string().optional(),
	worktreeBranch: z.string().optional(),
	originalBranch: z.string().optional(),
	originalHeadCommit: z.string().optional(),
	sessionId: z.string().optional(),
});

export const WorktreeStateEntrySchema = z.object({
	type: z.literal("worktree-state"),
	worktreeSession: WorktreeSessionSchema.nullable(),
	sessionId: z.string().optional(),
});

export const AgentNameEntrySchema = z.object({
	type: z.literal("agent-name"),
	agentName: z.string(),
	sessionId: z.string().optional(),
});

export const CustomTitleEntrySchema = z.object({
	type: z.literal("custom-title"),
	customTitle: z.string(),
	sessionId: z.string().optional(),
});

export const AiTitleEntrySchema = z.object({
	type: z.literal("ai-title"),
	aiTitle: z.string(),
	sessionId: z.string().optional(),
});

export const ModeEntrySchema = z.object({
	type: z.literal("mode"),
	mode: z.string(),
	sessionId: z.string().optional(),
});

// --- Top-level discriminated union ---

export const SessionEntrySchema = z.discriminatedUnion("type", [
	AssistantEntrySchema,
	UserEntrySchema,
	AttachmentEntrySchema,
	PermissionModeEntrySchema,
	LastPromptEntrySchema,
	FileHistorySnapshotEntrySchema,
	PrLinkEntrySchema,
	QueueOperationEntrySchema,
	WorktreeStateEntrySchema,
	AgentNameEntrySchema,
	CustomTitleEntrySchema,
	AiTitleEntrySchema,
	ModeEntrySchema,
]);

// SystemEntry uses a nested discriminatedUnion, so handle separately
export const AnyEntrySchema = z.union([SessionEntrySchema, SystemEntrySchema]);

export type AssistantEntry = z.infer<typeof AssistantEntrySchema>;
export type UserEntry = z.infer<typeof UserEntrySchema>;
export type AttachmentEntry = z.infer<typeof AttachmentEntrySchema>;
export type SystemEntry = z.infer<typeof SystemEntrySchema>;
export type PermissionModeEntry = z.infer<typeof PermissionModeEntrySchema>;
export type LastPromptEntry = z.infer<typeof LastPromptEntrySchema>;
export type FileHistorySnapshotEntry = z.infer<
	typeof FileHistorySnapshotEntrySchema
>;
export type PrLinkEntry = z.infer<typeof PrLinkEntrySchema>;
export type QueueOperationEntry = z.infer<typeof QueueOperationEntrySchema>;
export type WorktreeStateEntry = z.infer<typeof WorktreeStateEntrySchema>;
export type AgentNameEntry = z.infer<typeof AgentNameEntrySchema>;
export type CustomTitleEntry = z.infer<typeof CustomTitleEntrySchema>;
export type AiTitleEntry = z.infer<typeof AiTitleEntrySchema>;
export type ModeEntry = z.infer<typeof ModeEntrySchema>;
export type AnyEntry = z.infer<typeof AnyEntrySchema>;

export interface ParsedSessionJsonl {
	entries: AnyEntry[];
	parseErrors: Array<{ lineNumber: number; raw: string; error: string }>;
}

export function parseEntries(text: string): ParsedSessionJsonl {
	const lines = text.split("\n");

	const entries: AnyEntry[] = [];
	const parseErrors: Array<{ lineNumber: number; raw: string; error: string }> =
		[];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]?.trim();
		if (!line) continue;

		let raw: unknown;
		try {
			raw = JSON.parse(line);
		} catch (e) {
			parseErrors.push({
				lineNumber: i + 1,
				raw: line.slice(0, 200),
				error: String(e),
			});
			continue;
		}

		const result = AnyEntrySchema.safeParse(raw);
		if (result.success) {
			entries.push(result.data);
		} else {
			parseErrors.push({
				lineNumber: i + 1,
				raw: line.slice(0, 200),
				error: result.error.issues
					.map((iss) => `${iss.path.join(".")}: ${iss.message}`)
					.join("; "),
			});
		}
	}

	return { entries, parseErrors };
}
