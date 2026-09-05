// UAV Diagnosis Backend API utilities
export const BACKEND_BASE = import.meta.env.VITE_BACKEND_BASE || "/api";

// Diagnosis
export async function callDiagnosis(question: string, csvContent?: string): Promise<string> {
  const res = await fetch(BACKEND_BASE + "/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, csv_content: csvContent || "" }),
  });
  if (!res.ok) throw new Error("Backend error: " + res.status);
  const data = await res.json();
  return data.answer || data.diagnosis || JSON.stringify(data).slice(0, 500);
}

// Streaming diagnosis
export async function* streamDiagnosis(question: string, csvContent?: string) {
  const res = await fetch(BACKEND_BASE + "/chat/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, csv_content: csvContent || "" }),
  });
  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (line.startsWith("data:")) {
        try {
          yield JSON.parse(line.slice(5).trim());
        } catch {}
      }
    }
  }
}

// RAG search
export async function ragSearch(query: string, k = 5) {
  const r = await fetch(BACKEND_BASE + "/rag/search?query=" + encodeURIComponent(query) + "&k=" + k, {
    method: "POST",
  });
  return r.json();
}

// KG context
export async function kgContext(motor: string, obs: Record<string, unknown>) {
  const r = await fetch(BACKEND_BASE + "/kg/context", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ candidate_motor: motor, observations: obs }),
  });
  return r.json();
}

// Diagnosis read
export async function diagnosisRead(caseId: string) {
  const r = await fetch(BACKEND_BASE + "/diagnosis/" + caseId);
  return r.json();
}

// Health check
export async function healthCheck() {
  const r = await fetch(BACKEND_BASE + "/health");
  return r.json();
}


// ── Admin ──
export async function adminStats() {
  const r = await fetch(BACKEND_BASE + "/admin/stats");
  return r.json();
}

export async function adminInfo() {
  const r = await fetch(BACKEND_BASE + "/admin/info");
  return r.json();
}

export async function adminHistory() {
  const r = await fetch(BACKEND_BASE + "/admin/history");
  return r.json();
}


// Streaming diagnosis with thinking steps
export async function* streamDiagnosisThink(question: string, csvContent?: string) {
  const res = await fetch(BACKEND_BASE + "/chat/think", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, csv_content: csvContent || "" }),
  });
  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (line.startsWith("event:")) {
        const eventType = line.slice(6).trim();
        continue;  // We handle in next line
      }
      if (line.startsWith("data:")) {
        try {
          const raw = line.slice(5).trim();
          const data = JSON.parse(raw);
          // Find the matching event type from buffer context
          yield { event: "step", step: data, raw };
        } catch {}
      }
    }
  }
}

// Resumable streaming with SSE parsing
export function streamDiagnosisThinkRaw(
  question: string,
  csvContent: string | undefined,
  onEvent: (type: string, data: string) => void,
  onError: (err: string) => void,
  onDone: () => void,
): AbortController {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch(BACKEND_BASE + "/chat/think", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, csv_content: csvContent || "" }),
        signal: controller.signal,
      });

      const reader = res.body?.getReader();
      if (!reader) { onError("No response body"); return; }

      const decoder = new TextDecoder();
      let buffer = "";
      let currentEvent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) { onDone(); break; }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("event:")) {
            currentEvent = trimmed.slice(6).trim();
          } else if (trimmed.startsWith("data:")) {
            try {
              const data = JSON.parse(trimmed.slice(5).trim());
              onEvent(currentEvent || "unknown", typeof data === "string" ? data : JSON.stringify(data));
            } catch {
              onEvent(currentEvent || "unknown", trimmed.slice(5).trim());
            }
            currentEvent = "";
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        onError(String(err));
      }
    }
  })();

  return controller;
}
// Legacy compatibility
export const FLOWISE_BASE = BACKEND_BASE;
export const NEO4J_TOOL_BASE = BACKEND_BASE;
export const PREDICTION_ID_DIAG = "";
export const PREDICTION_ID_FD = "";

export interface FlowiseResponse {
  text?: string; response?: string; answer?: string;
  [key: string]: unknown;
}

export async function callFlowise(question: string, uploads?: any[], flowId?: string): Promise<string> {
  return callDiagnosis(question);
}

export async function neo4jHealth() { return healthCheck(); }
export async function neo4jRagSearch(query: string, k = 5) { return ragSearch(query, k); }
export async function neo4jKgContext(motor: string, obs: Record<string, unknown>) { return kgContext(motor, obs); }
export async function neo4jDiagnosisRead(caseId: string) { return diagnosisRead(caseId); }
export async function neo4jDiagnosisWrite(data: Record<string, unknown>) {
  const r = await fetch(BACKEND_BASE + "/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return r.json();
}
