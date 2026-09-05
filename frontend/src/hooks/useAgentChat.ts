import { useState, useCallback, useRef } from "react";
import type { AgentMessage, AgentStreamEvent } from "../types/agent";
import { createId } from "../utils/createId";

const BACKEND = import.meta.env.VITE_BACKEND_BASE || "/api";
const ROUTE_LEAK_RE = /\b(structure_expert|propulsion_expert|battery_expert|avionics_expert|vibration_expert|environment_expert|structure|propulsion|battery|avionics|vibration|environment|auditor|END)\b/gi;

type SendMessageOptions = {
  imageBase64?: string | null;
  imageName?: string | null;
  logContent?: string | null;
  logName?: string | null;
  logLines?: number;
};

export function useAgentChat() {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const forceNewTextBlockRef = useRef(false);
  const sessionIdRef = useRef(createId());

  const now = () => new Date().toLocaleTimeString("zh-CN", { hour12: false });

  const sendMessage = useCallback(async (question: string, options: SendMessageOptions = {}) => {
    forceNewTextBlockRef.current = false;
    const startedAtMs = Date.now();
    const userBlocks: AgentMessage["blocks"] = [];
    if (question.trim()) {
      userBlocks.push({ type: "text", content: question });
    }
    if (options.imageBase64) {
      userBlocks.push({ type: "image", url: options.imageBase64, name: options.imageName || "现场图片" });
    }
    if (options.logContent) {
      userBlocks.push({
        type: "attachment",
        kind: "log",
        name: options.logName || "飞行日志",
        meta: options.logLines ? `${options.logLines} 条记录` : undefined,
      });
    }
    const userMsg: AgentMessage = {
      id: createId(), role: "user", blocks: userBlocks,
      status: "done", createdAt: now(), startedAtMs, endedAtMs: startedAtMs,
    };
    const agentMsg: AgentMessage = {
      id: createId(), role: "agent", blocks: [],
      status: "thinking", createdAt: now(), startedAtMs, activity: "正在思考",
    };

    setMessages(prev => [...prev, userMsg, agentMsg]);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const requestQuestion = [
        question,
        options.imageBase64 ? `[已上传现场图片：${options.imageName || "现场图片"}]` : "",
        options.logContent ? `[已上传飞行日志：${options.logName || "飞行日志"}，${options.logLines || 0}条记录]` : "",
      ].filter(Boolean).join("\n\n");

      const res = await fetch(BACKEND + "/chat/agent-stream", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: requestQuestion,
          image_base64: options.imageBase64 || "",
          log_content: options.logContent || "",
          session_id: sessionIdRef.current,
        }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error("Backend " + res.status);

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No body");

      const decoder = new TextDecoder("utf-8");
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          const t = line.trim();
          if (!t) continue;
          try { applyEvent(agentMsg.id, JSON.parse(t)); } catch {}
        }
      }
      if (buf.trim()) {
        try { applyEvent(agentMsg.id, JSON.parse(buf.trim())); } catch {}
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        const detail = err instanceof Error ? err.message : String(err);
        updateMsg(agentMsg.id, {
          status: "error",
          error: detail,
          endedAtMs: Date.now(),
          blocks: [{
            type: "text",
            content: `诊断请求未完成：${detail}。请重新发送；若持续出现，请稍后重试。`,
          }],
        });
      }
    } finally {
      setIsStreaming(false);
      updateMsg(agentMsg.id, m => ({
        ...m,
        status: m.status === "error" ? "error" : "done",
        endedAtMs: m.endedAtMs || Date.now(),
      }));
    }
  }, []);

  const normalizeActivity = (value?: string) => {
    const text = value || "";
    if (text.includes("专家分析中")) return "正在运行专家";
    if (text.includes("审计汇总")) return "正在汇总报告";
    if (text.includes("理解故障")) return "正在理解问题";
    if (text.includes("总调度") || text.includes("Supervisor")) return "正在思考";
    return text || "正在思考";
  };

  const cleanProgressText = (value?: string) =>
    (value || "")
      .replace(ROUTE_LEAK_RE, "")
      .replace(/\*\*/g, "")
      .replace(/__/g, "")
      .replace(/`/g, "")
      .replace(/^#+\s*/gm, "")
      .replace(/^>\s?/gm, "")
      .replace(/已调度\s+/g, "已调度")
      .trim();

  const cleanAnswerText = (value?: string) =>
    (value || "")
      .replace(ROUTE_LEAK_RE, "")
      .replace(/已调度\s+/g, "已调度")
      .replace(/\n{3,}/g, "\n\n");

  const applyEvent = (msgId: string, evt: AgentStreamEvent) => {
    const { type, content, tool_id, tool_name, input, result } = evt;

    switch (type) {
      case "status":
        updateMsg(msgId, {
          status: "streaming",
          activity: normalizeActivity(content),
        });
        forceNewTextBlockRef.current = true;
        break;
      case "progress":
        if (content) {
          const cleaned = cleanProgressText(content);
          if (!cleaned) break;
          updateMsg(msgId, m => ({
            ...m,
            status: "streaming",
            blocks: [...m.blocks, { type: "progress", content: cleaned }],
          }));
        }
        forceNewTextBlockRef.current = true;
        break;
      case "text_chunk": {
        const text = content || "";
        if (!text) break;
        updateMsg(msgId, m => {
          const blocks = [...m.blocks];
          const last = blocks[blocks.length - 1];
          // Merge into last text block if one exists AND no force-new flag
          if (!forceNewTextBlockRef.current && last && last.type === "text") {
            blocks[blocks.length - 1] = { ...last, content: cleanAnswerText(last.content + text) };
          } else {
            const cleaned = cleanAnswerText(text);
            if (!cleaned.trim()) return { ...m, blocks, status: "streaming" };
            blocks.push({ type: "text", content: cleaned });
            forceNewTextBlockRef.current = false;
          }
          return { ...m, blocks, status: "streaming" };
        });
        break;
      }
      case "tool_start": {
        forceNewTextBlockRef.current = true;
        const id = tool_id || createId();
        updateMsg(msgId, m => ({
          ...m,
          status: "streaming",
          blocks: [
            ...m.blocks,
            {
              type: "tool",
              toolId: id,
              toolName: tool_name || "",
              input: input || "",
              result: null,
              status: "running",
            },
          ],
        }));
        break;
      }
      case "tool_end": {
        forceNewTextBlockRef.current = true;
        updateMsg(msgId, m => ({
          ...m,
          blocks: m.blocks.map(b =>
            b.type === "tool" && b.toolId === tool_id
              ? { ...b, result: result || "", status: "done" as const }
              : b
          ),
        }));
        break;
      }
      case "done":
        updateMsg(msgId, { status: "done", endedAtMs: Date.now() });
        break;
      case "error":
        updateMsg(msgId, m => ({
          status: "error",
          error: content || "Unknown error",
          endedAtMs: Date.now(),
          blocks: [
            ...m.blocks,
            {
              type: "text",
              content: content || "诊断过程出错，请检查后端大模型配置。",
            },
          ],
        }));
        break;
    }
  };

  const updateMsg = (id: string, updater: Partial<AgentMessage> | ((m: AgentMessage) => Partial<AgentMessage>)) => {
    setMessages(prev => prev.map(m => {
      if (m.id !== id) return m;
      const patch = typeof updater === "function" ? updater(m) : updater;
      return { ...m, ...patch };
    }));
  };

  const cancel = () => abortRef.current?.abort();
  const clear = useCallback((nextSessionId = createId()) => {
    setMessages([]);
    abortRef.current?.abort();
    sessionIdRef.current = nextSessionId;
  }, []);
  const setSessionId = useCallback((sessionId: string) => {
    sessionIdRef.current = sessionId;
  }, []);
  const restoreMessages = useCallback((snapshot: AgentMessage[], sessionId?: string) => {
    abortRef.current?.abort();
    setIsStreaming(false);
    sessionIdRef.current = sessionId || createId();
    setMessages(snapshot);
  }, []);

  return { messages, isStreaming, sendMessage, cancel, clear, restoreMessages, setSessionId };
}
