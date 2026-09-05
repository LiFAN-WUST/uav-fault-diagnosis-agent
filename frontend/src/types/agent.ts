// Agent Chat types — block-based interleaved rendering

export type TextBlock = {
  type: "text";
  content: string;
};

export type ImageBlock = {
  type: "image";
  url: string;
  name?: string;
};

export type AttachmentBlock = {
  type: "attachment";
  kind: "log";
  name: string;
  meta?: string;
};

export type ProgressBlock = {
  type: "progress";
  content: string;
};

export type ToolBlock = {
  type: "tool";
  toolId: string;
  toolName: string;
  input: string;
  result: string | null;
  status: "running" | "done";
};

export type Block = TextBlock | ImageBlock | AttachmentBlock | ProgressBlock | ToolBlock;

export interface AgentMessage {
  id: string;
  role: "user" | "agent";
  blocks: Block[];
  status: "thinking" | "streaming" | "done" | "error";
  error?: string;
  createdAt: string;
  startedAtMs: number;
  endedAtMs?: number;
  activity?: string;
}

export interface AgentStreamEvent {
  type: "status" | "progress" | "tool_start" | "tool_end" | "text_chunk" | "done" | "error";
  content?: string;
  tool_id?: string;
  tool_name?: string;
  input?: string;
  result?: string;
}
