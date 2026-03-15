import { basename } from "node:path";

export interface OpencodeEvent {
  sessionId: string;
  cwd: string;
  promptResponse: string;
  model: string;
  eventType: string;
}

export function isValidOpencodeEvent(data: unknown): data is Record<string, unknown> {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  return typeof obj.session_id === "string";
}

export function parseOpencodeEvent(raw: Record<string, unknown>): OpencodeEvent {
  return {
    sessionId: typeof raw.session_id === "string" ? raw.session_id : "",
    cwd: typeof raw.cwd === "string" ? raw.cwd : "",
    promptResponse: typeof raw.prompt_response === "string" ? raw.prompt_response : "",
    model: typeof raw.model === "string" ? raw.model : "",
    eventType: typeof raw.event_type === "string" ? raw.event_type : "",
  };
}

export function extractProjectName(cwd: string): string {
  return basename(cwd) || "unknown";
}
