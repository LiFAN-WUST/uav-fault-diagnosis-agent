import { useState, useRef, useEffect, useLayoutEffect, type FormEvent } from "react";
import { ArrowUp, Square, Trash2, Bot, Upload, FileText, X, Download, ChevronDown, ChevronRight, History, PanelLeftClose, Plus, Clock3 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { useAgentChat } from "../../hooks/useAgentChat";
import { createId } from "../../utils/createId";
import type { AgentMessage, ProgressBlock, TextBlock, ToolBlock } from "../../types/agent";
import type { AuthState } from "../../hooks/useAuth";
import { AgentProcessPanel, getProcessBlocks } from "./AgentProcessPanel";

interface AgentChatViewProps {
  auth?: AuthState;
  demoMode?: boolean;
}

type ChatHistoryItem = {
  id: string;
  sessionId: string;
  title: string;
  createdAt: string;
  updatedAt?: string;
  messages?: AgentMessage[];
};

const HISTORY_STORAGE_KEY = "uav-diagnosis-history-v2";

const DEMO_CASES = [
  {
    title: "起飞后动力不足坠落",
    desc: "电量仍显示较高，但飞行中提示电池异常并发生坠落。",
    prompt: "我的无人机起飞后飞了大概40秒左右，突然动力不足直接掉了下来。\n当时电量显示还有85%，但掉下来之前提示过一次电池异常。\n坠机后发现螺旋桨边缘有轻微缺口，机臂上也有一些擦痕。\n飞行环境是室外，有一点风，气温不高。\n请问这种情况一般可能是什么原因？",
  },
  {
    title: "M3 电机输出异常",
    desc: "单个电机输出异常，机体伴随明显振动。",
    prompt: "M3电机输出异常，飞行时机体有明显振动，帮我完成故障诊断并给出维修优先级。",
  },
  {
    title: "巡检中振动突然增大",
    desc: "飞行高度基本稳定，但机体振动明显变大。",
    prompt: "无人机巡检过程中振动突然增大，但高度基本稳定，可能是什么原因？",
  },
  {
    title: "参考历史相似故障",
    desc: "结合历史维修经验，辅助判断可能原因。",
    prompt: "M3号电机疑似损坏，机身振动加重，请参考历史经验给出诊断。",
  },
];

const WELCOME_PROMPTS = [
  "有什么无人机问题吗？",
  "无人机哪里不太正常？",
  "今天想排查哪一类故障？",
  "把你看到的无人机异常告诉我吧。",
  "需要我帮你看看无人机的故障吗？",
];

function pickWelcomePrompt() {
  return WELCOME_PROMPTS[Math.floor(Math.random() * WELCOME_PROMPTS.length)];
}

function historySnapshot(messages: AgentMessage[]) {
  return messages.map(message => ({
    ...message,
    blocks: message.blocks.filter(block => block.type !== "image"),
  }));
}

export function AgentChatView({ auth, demoMode = false }: AgentChatViewProps) {
  const { messages, isStreaming, sendMessage, cancel, clear, restoreMessages, setSessionId } = useAgentChat();
  const [input, setInput] = useState("");
  const [welcomePrompt, setWelcomePrompt] = useState(pickWelcomePrompt);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [history, setHistory] = useState<ChatHistoryItem[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) || "[]");
      return Array.isArray(saved)
        ? saved.filter((item): item is ChatHistoryItem => Boolean(item?.sessionId && item?.messages?.length))
        : [];
    } catch {
      return [];
    }
  });
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messageContentRef = useRef<HTMLDivElement>(null);
  const showLogTools = auth?.role !== "user" || demoMode;

  // Image upload
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Log upload
  const [logContent, setLogContent] = useState<string | null>(null);
  const [logName, setLogName] = useState<string | null>(null);
  const [logLines, setLogLines] = useState<number>(0);
  const logInputRef = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const scrollToLatest = () => {
      scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: "auto" });
    };

    const frameId = window.requestAnimationFrame(scrollToLatest);
    const resizeObserver = typeof ResizeObserver === "undefined" || !messageContentRef.current
      ? null
      : new ResizeObserver(scrollToLatest);
    if (resizeObserver && messageContentRef.current) resizeObserver.observe(messageContentRef.current);

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver?.disconnect();
    };
  }, [messages, isStreaming]);

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, 12)));
    } catch {}
  }, [history]);

  useEffect(() => {
    if (!activeHistoryId) return;
    const lastAgent = [...messages].reverse().find(message => message.role === "agent");
    if (!lastAgent || !["done", "error"].includes(lastAgent.status)) return;
    const snapshot = historySnapshot(messages);
    const updatedAt = new Date().toLocaleTimeString("zh-CN", { hour12: false });
    setHistory(previous => previous.map(item => item.id === activeHistoryId
      ? { ...item, messages: snapshot, updatedAt }
      : item,
    ));
  }, [activeHistoryId, messages]);

  const ensureConversation = (question: string) => {
    const cleanQuestion = question.trim();
    if (!cleanQuestion) return;
    if (activeHistoryId) {
      const updatedAt = new Date().toLocaleTimeString("zh-CN", { hour12: false });
      setHistory(previous => previous.map(item => item.id === activeHistoryId ? { ...item, updatedAt } : item));
      return;
    }

    const sessionId = createId();
    const entry: ChatHistoryItem = {
      id: sessionId,
      sessionId,
      title: cleanQuestion.replace(/\s+/g, " ").slice(0, 34),
      createdAt: new Date().toLocaleTimeString("zh-CN", { hour12: false }),
    };
    setSessionId(sessionId);
    setActiveHistoryId(sessionId);
    setHistory(previous => [entry, ...previous].slice(0, 12));
  };

  const processImage = (file: File) => {
    setUploadError(null);
    if (!file.type.startsWith("image/")) {
      setUploadError("请选择图片文件。支持 JPG、PNG、WEBP 等常见格式。");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setUploadError("图片不能超过 8 MB，请压缩后再上传。");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setImagePreview(e.target.result as string);
        setImageName(file.name);
      }
    };
    reader.onerror = () => setUploadError("图片读取失败，请重新选择文件。");
    reader.readAsDataURL(file);
  };
  const clearImage = () => {
    setImagePreview(null);
    setImageName(null);
    setUploadError(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const processLog = (file: File) => {
    setUploadError(null);
    const extension = file.name.toLowerCase().split(".").pop() || "";
    if (!(file.type.startsWith("text/") || ["log", "txt", "csv", "bin"].includes(extension))) {
      setUploadError("请选择 CSV、LOG、TXT 或 BIN 格式的飞行日志。");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setUploadError("日志不能超过 8 MB，请截取需要诊断的片段后再上传。");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        const text = e.target.result as string;
        if (!text.trim()) {
          setUploadError("日志文件为空，请选择包含飞行记录的文件。");
          return;
        }
        setLogContent(text);
        setLogName(file.name);
        setLogLines(text.split("\n").filter(l => l.trim()).length);
      }
    };
    reader.onerror = () => setUploadError("日志读取失败，请重新选择文件。");
    reader.readAsText(file);
  };
  const clearLog = () => {
    setLogContent(null);
    setLogName(null);
    setLogLines(0);
    setUploadError(null);
    if (logInputRef.current) logInputRef.current.value = "";
  };

  const handleSend = (override?: string) => {
    const q = (override ?? input).trim();
    if (!q && !imagePreview && !(showLogTools && logContent)) return;
    const query = q || "请基于上传的飞行数据和受损照片进行综合故障诊断。";
    setInput("");
    ensureConversation(query);
    sendMessage(query, {
      imageBase64: imagePreview,
      imageName,
      logContent: showLogTools ? logContent : null,
      logName,
      logLines,
    });
    clearImage();
    clearLog();
  };

  const inputDisabled = isStreaming;
  const sendDisabled = isStreaming || (!input.trim() && !imagePreview && !(showLogTools && logContent));

  const resetChat = () => {
    clear();
    setActiveHistoryId(null);
    clearImage();
    clearLog();
    setInput("");
    setWelcomePrompt(pickWelcomePrompt());
  };

  return (
    <div className="flex h-full bg-white">
      {historyOpen && (
        <HistorySidebar
          history={history}
          onClose={() => setHistoryOpen(false)}
          onNewChat={() => { resetChat(); setHistoryOpen(false); }}
          onSelect={(item) => {
            resetChat();
            if (item.messages?.length) {
              setActiveHistoryId(item.id);
              restoreMessages(item.messages, item.sessionId);
            }
            setHistoryOpen(false);
          }}
        />
      )}
      <div className="flex-1 flex flex-col min-w-0">
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { if (e.target.files?.[0]) processImage(e.target.files[0]); }} />
        <input ref={logInputRef} type="file" accept=".log,.txt,.csv,.bin" className="hidden"
          onChange={(e) => { if (e.target.files?.[0]) processLog(e.target.files[0]); }} />
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-200 bg-neutral-50 shrink-0">
          <div className="flex items-center gap-2">
            <Bot size={16} className="text-amber-600" />
            <span className="text-sm font-medium text-neutral-600">
              无人机故障智能诊断系统
            </span>
          </div>
          <div className="flex items-center gap-1">
          <button
            onClick={() => setHistoryOpen(prev => !prev)}
            className={`p-1 rounded text-neutral-400 hover:text-neutral-600 hover:bg-neutral-200 transition-colors ${historyOpen ? "bg-neutral-200 text-neutral-700" : ""}`}
            title="诊断历史"
          >
            <History size={14} />
          </button>
          <button onClick={resetChat}
            className="p-1 rounded text-neutral-400 hover:text-neutral-600 hover:bg-neutral-200 transition-colors"
            title="清空">
            <Trash2 size={14} />
          </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollContainerRef} className={`scrollbar-none flex-1 min-h-0 ${
          messages.length === 0 ? "overflow-hidden px-6 py-0" : "overflow-y-auto px-8 pb-2 pt-10"
        }`}>
          <div ref={messageContentRef} className={`mx-auto flex w-full max-w-[780px] flex-col ${
            messages.length === 0 ? "h-full justify-center" : "gap-8 pb-4"
          }`}>
          {messages.map(msg => (
            <div key={msg.id} className={`group flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
              <div className={`text-[15px] leading-7 flex flex-col space-y-5 ${
                msg.role === "user"
                  ? "w-fit max-w-[min(68%,620px)] rounded-[24px] px-5 py-3.5 bg-neutral-100/80 text-neutral-800 border border-neutral-200/80"
                  : msg.status === "error"
                  ? "w-full max-w-[860px] text-red-700"
                  : "w-full max-w-[860px] text-neutral-900"
              }`}>
                {/* Interleaved blocks: text -> tool -> text -> tool in time order */}
                {msg.role === "user" && msg.blocks.map((block, i) => (
                  block.type === "text" ? (
                    <p key={i} className="text-[13px] leading-7 text-neutral-700 whitespace-pre-wrap">{block.content}</p>
                  ) : block.type === "image" ? (
                    <img
                      key={i}
                      src={block.url}
                      alt={block.name || "上传图片"}
                      className="max-h-44 max-w-[260px] rounded-xl border border-neutral-200 object-cover"
                    />
                  ) : block.type === "attachment" ? (
                    <div key={i} className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-600">
                      <FileText className="h-4 w-4 text-neutral-400" />
                      <span className="max-w-[220px] truncate">{block.name}</span>
                      {block.meta && <span className="text-neutral-400">{block.meta}</span>}
                    </div>
                  ) : null
                ))}
                {msg.role === "agent" && <AgentMessageBody msg={msg} />}
              </div>
              {msg.role === "user" && (
                <span className="mt-1 pr-1 text-[10px] text-neutral-400 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                  {msg.createdAt}
                </span>
              )}
            </div>
          ))}

          {/* Empty state */}
          {messages.length === 0 && (
            <div className="flex w-full flex-col items-center justify-center px-6 py-4">
              <h1 className="mb-10 text-center text-3xl font-normal leading-tight tracking-tight text-neutral-900">
                {welcomePrompt}
              </h1>
              <div className="w-full max-w-[780px]">
                <PendingAttachments
                  imagePreview={imagePreview}
                  imageName={imageName}
                  logName={showLogTools ? logName : null}
                  logLines={showLogTools ? logLines : 0}
                  onClearImage={clearImage}
                  onClearLog={clearLog}
                />
                {uploadError && <div className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600" role="alert">{uploadError}</div>}
                <ChatInputBar
                  value={input}
                  onChange={setInput}
                  onSend={handleSend}
                  onCancel={cancel}
                  onUploadImage={() => imageInputRef.current?.click()}
                  onUploadLog={() => logInputRef.current?.click()}
                  canUploadLog={showLogTools}
                  disabled={inputDisabled}
                  sendDisabled={sendDisabled}
                  large
                />
                {demoMode ? (
                  <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {DEMO_CASES.map(item => (
                      <button
                        key={item.title}
                        type="button"
                        onClick={() => handleSend(item.prompt)}
                        disabled={isStreaming}
                        className="rounded-xl border border-neutral-200 bg-white p-4 text-left transition-colors hover:border-neutral-300 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <div className="text-sm font-medium text-neutral-900">{item.title}</div>
                        <div className="mt-1 text-xs leading-5 text-neutral-400">{item.desc}</div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="mt-6 grid gap-2 text-sm text-neutral-400">
                    <button
                      type="button"
                      onClick={() => setInput("我的无人机起飞后飞了大概40秒左右，突然动力不足直接掉了下来。\n当时电量显示还有85%，但掉下来之前提示过一次电池异常。\n坠机后发现螺旋桨边缘有轻微缺口，机臂上也有一些擦痕。\n飞行环境是室外，有一点风，气温不高。\n请问这种情况一般可能是什么原因？")}
                      className="block w-full rounded-xl px-3 py-2 text-left transition-colors hover:bg-neutral-50 hover:text-neutral-600"
                    >
                      起飞后动力不足坠落
                    </button>
                    <button
                      type="button"
                      onClick={() => setInput("无人机飞行时振动变大，可能是什么原因？")}
                      className="block w-full rounded-xl px-3 py-2 text-left transition-colors hover:bg-neutral-50 hover:text-neutral-600"
                    >
                      无人机飞行时振动变大，可能是什么原因？
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          </div>
        </div>

        {messages.length > 0 && (
          <div className="z-10 shrink-0 bg-white/95 px-8 pb-4 pt-3 backdrop-blur-sm">
            <div className="mx-auto w-full max-w-[780px]">
              <PendingAttachments
                imagePreview={imagePreview}
                imageName={imageName}
                logName={showLogTools ? logName : null}
                logLines={showLogTools ? logLines : 0}
                onClearImage={clearImage}
                onClearLog={clearLog}
              />
              {uploadError && <div className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600" role="alert">{uploadError}</div>}
              <ChatInputBar
                value={input}
                onChange={setInput}
                onSend={handleSend}
                onCancel={cancel}
                onUploadImage={() => imageInputRef.current?.click()}
                onUploadLog={() => logInputRef.current?.click()}
                canUploadLog={showLogTools}
                disabled={inputDisabled}
                sendDisabled={sendDisabled}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function HistorySidebar({
  history,
  onClose,
  onNewChat,
  onSelect,
}: {
  history: ChatHistoryItem[];
  onClose: () => void;
  onNewChat: () => void;
  onSelect: (item: ChatHistoryItem) => void;
}) {
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-neutral-200 bg-neutral-50/80">
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-medium text-neutral-700">
          <History className="h-4 w-4 text-neutral-400" />
          <span>诊断历史</span>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-1 text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-neutral-700" title="收起历史">
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>
      <button type="button" onClick={onNewChat} className="mx-3 mt-3 flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-left text-xs text-neutral-600 transition-colors hover:border-neutral-300 hover:text-neutral-900">
        <Plus className="h-3.5 w-3.5" />
        <span>新建诊断</span>
      </button>
      <div className="scrollbar-none flex-1 overflow-y-auto px-2 py-3">
        {history.length === 0 ? (
          <div className="flex flex-col items-center px-4 pt-16 text-center text-xs leading-5 text-neutral-400">
            <Clock3 className="mb-3 h-5 w-5 text-neutral-300" />
            <span>完成一次诊断后，记录会显示在这里</span>
          </div>
        ) : (
          <div className="space-y-1">
            {history.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item)}
                disabled={!item.messages?.length}
                className="w-full rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="truncate text-xs text-neutral-700">{item.title}</div>
                <div className="mt-1 text-[10px] text-neutral-400">{item.updatedAt || item.createdAt}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

function ChatInputBar({
  value,
  onChange,
  onSend,
  onCancel,
  onUploadImage,
  onUploadLog,
  canUploadLog = false,
  disabled,
  sendDisabled,
  large = false,
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onCancel: () => void;
  onUploadImage?: () => void;
  onUploadLog?: () => void;
  canUploadLog?: boolean;
  disabled: boolean;
  sendDisabled: boolean;
  large?: boolean;
}) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    const nextHeight = Math.min(textarea.scrollHeight, 160);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > 160 ? "auto" : "hidden";
  }, [value]);

  const handleUploadClick = () => {
    if (disabled) return;
    if (canUploadLog && onUploadLog) {
      setUploadOpen(prev => !prev);
      return;
    }
    onUploadImage?.();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!disabled && !sendDisabled) onSend();
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className={`relative flex items-center gap-2 rounded-[30px] border border-neutral-200 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.08)] transition-shadow focus-within:shadow-[0_12px_40px_rgba(0,0,0,0.10)] ${large ? "px-4 py-2.5" : "px-3 py-2.5"}`}>
      {uploadOpen && (
        <div className="absolute bottom-full left-3 z-20 mb-2 w-36 overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 text-sm shadow-lg">
          <button
            type="button"
            onClick={() => {
              setUploadOpen(false);
              onUploadImage?.();
            }}
            className="block w-full px-3 py-2 text-left text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
          >
            上传图片
          </button>
          {canUploadLog && (
            <button
              type="button"
              onClick={() => {
                setUploadOpen(false);
                onUploadLog?.();
              }}
              className="block w-full px-3 py-2 text-left text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
            >
              上传日志
            </button>
          )}
        </div>
      )}
      <button
        type="button"
        onClick={handleUploadClick}
        disabled={disabled}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors"
        title={canUploadLog ? "添加图片或日志" : "上传图片"}
      >
        <Upload className="h-4 w-4" />
      </button>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            formRef.current?.requestSubmit();
          }
        }}
        placeholder="问问翼诊"
        disabled={disabled}
        rows={1}
        className="min-h-9 min-w-0 flex-1 resize-none overflow-y-hidden bg-transparent py-1.5 text-[13px] leading-6 text-neutral-900 placeholder:text-neutral-300 focus:outline-none disabled:opacity-50"
      />
      {disabled ? (
        <button
          type="button"
          onClick={onCancel}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-neutral-600 hover:bg-neutral-300 transition-colors"
          title="停止"
        >
          <Square className="h-4 w-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => formRef.current?.requestSubmit()}
          disabled={sendDisabled}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-white hover:bg-neutral-700 disabled:bg-neutral-300 disabled:cursor-not-allowed transition-colors"
          title="发送"
        >
          <ArrowUp className="h-5 w-5 stroke-[2.5]" />
        </button>
      )}
    </form>
  );
}

function PendingAttachments({
  imagePreview,
  imageName,
  logName,
  logLines,
  onClearImage,
  onClearLog,
}: {
  imagePreview: string | null;
  imageName: string | null;
  logName: string | null;
  logLines: number;
  onClearImage: () => void;
  onClearLog: () => void;
}) {
  if (!imagePreview && !logName) return null;

  return (
    <div className="mb-3 flex flex-wrap gap-2">
      {imagePreview && (
        <div className="group relative h-20 w-20 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
          <img src={imagePreview} alt={imageName || "待发送图片"} className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={onClearImage}
            className="absolute right-1 top-1 rounded-full bg-white/90 p-0.5 text-neutral-400 shadow-sm opacity-0 transition-opacity group-hover:opacity-100 hover:text-neutral-700"
            title="移除图片"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {logName && (
        <div className="group relative flex h-20 min-w-48 items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-3">
          <FileText className="h-5 w-5 text-neutral-400" />
          <div className="min-w-0">
            <div className="truncate text-xs text-neutral-700">{logName}</div>
            <div className="mt-0.5 text-[11px] text-neutral-400">{logLines} 条记录</div>
          </div>
          <button
            type="button"
            onClick={onClearLog}
            className="absolute right-2 top-2 rounded-full bg-white/90 p-0.5 text-neutral-400 shadow-sm opacity-0 transition-opacity group-hover:opacity-100 hover:text-neutral-700"
            title="移除日志"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

function isTextBlock(block: AgentMessage["blocks"][number]): block is TextBlock {
  return block.type === "text";
}

function AgentMessageBody({ msg }: { msg: AgentMessage }) {
  const processBlocks = getProcessBlocks(msg.blocks);
  const progressBlocks = processBlocks.filter((block): block is ProgressBlock => block.type === "progress");
  const textBlocks = msg.blocks.filter(isTextBlock);
  const toolBlocks = msg.blocks.filter((block): block is ToolBlock => block.type === "tool");
  const isActive = msg.status === "thinking" || msg.status === "streaming";
  const reportText = textBlocks.map(block => block.content).join("\n\n").trim();

  return (
    <>
      <AgentProcessPanel
        blocks={processBlocks}
        startedAtMs={msg.startedAtMs}
        endedAtMs={msg.endedAtMs}
        isActive={isActive}
        activity={msg.activity}
      />

      {textBlocks.map((block, index) => {
        return (
          <div key={index} className="w-full max-w-full">
            <ReportTextBlock content={block.content} isStreaming={isActive} />
          </div>
        );
      })}

      <EvidenceSummary tools={toolBlocks} progressBlocks={progressBlocks} />

      {msg.status === "done" && reportText && (
        <div className="pt-1">
          <button
            type="button"
            onClick={() => exportReportAsPdf(reportText)}
            className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-3 py-1.5 text-xs text-neutral-500 transition-colors hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-800"
          >
            <Download className="h-3.5 w-3.5" />
            导出 PDF 报告
          </button>
        </div>
      )}
    </>
  );
}

function formatReportText(content: string) {
  let normalized = (content || "")
    .replace(/\r\n/g, "\n")
    .replace(/(?:^|\n)\s*#{1,6}\s*(?=\n|$)/g, "\n")
    .replace(/(?:^|\n)\s*#{0,6}\s*初步诊断结论\s*：?\s*/g, "\n### 初步诊断结论\n\n")
    .replace(/(?:^|\n)\s*#{0,6}\s*(可能原因排序)\s*：?\s*/g, "\n#### $1\n\n")
    .replace(/(?:^|\n)\s*#{0,6}\s*(为什么这样判断)\s*：?\s*/g, "\n#### $1\n\n")
    .replace(/(?:^|\n)\s*#{0,6}\s*(建议先检查)\s*：?\s*/g, "\n#### $1\n\n")
    .replace(/(?:^|\n)\s*#{0,6}\s*(是否建议继续飞)\s*：?\s*/g, "\n#### $1\n\n")
    .replace(/(?:^|\n)\s*#{0,6}\s*(还需要补充的信息)\s*：?\s*/g, "\n#### $1\n\n")
    .replace(/(?:^|\n)\s*#{0,6}\s*(最终诊断报告|诊断结论|置信度|故障因果链|专家意见一致点|专家意见分歧点|维修建议(?:（按优先级）)?)\s*：?\s*/g, "\n#### $1\n\n")
    .replace(/([^\n])\s*(\d+\.\s*(?:\*\*\[[高低中]\]\*\*|\[[高低中]\])?)/g, "$1\n$2")
    .replace(/(^|\n)\s*(\d+)\.\s*/g, "$1$2. ");
  return normalized
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanStreamingMarkdown(content: string) {
  return (content || "")
    .replace(/^\s*#{1,6}\s*$/gm, "")
    .replace(/^\s*#{1,6}\s*/gm, "")
    .replace(/\*\*/g, "")
    .replace(/__/g, "")
    .replace(/`/g, "")
    .replace(/^>\s?/gm, "");
}

const markdownComponents: Components = {
  h1: ({ children }) => <h1 className="mt-5 text-lg font-semibold leading-7 tracking-tight text-neutral-950 first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="mt-5 text-base font-semibold leading-7 text-neutral-950 first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-5 text-lg font-semibold leading-7 text-neutral-950 first:mt-0">{children}</h3>,
  h4: ({ children }) => <h4 className="mt-4 text-[15px] font-semibold leading-6 text-neutral-900 first:mt-0">{children}</h4>,
  p: ({ children }) => <p className="mt-2 break-words text-[15px] leading-7 text-neutral-900 first:mt-0">{children}</p>,
  ul: ({ children }) => <ul className="mt-2 list-disc space-y-1 pl-6 text-[15px] leading-7 text-neutral-900">{children}</ul>,
  ol: ({ children }) => <ol className="mt-2 list-decimal space-y-1 pl-6 text-[15px] leading-7 text-neutral-900">{children}</ol>,
  li: ({ children }) => <li className="break-words pl-1 leading-7">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-neutral-950">{children}</strong>,
  blockquote: ({ children }) => <blockquote className="my-4 border-l-2 border-neutral-300 pl-4 text-neutral-600">{children}</blockquote>,
  hr: () => <hr className="my-6 border-neutral-200" />,
  table: ({ children }) => (
    <div className="my-4 max-w-full overflow-x-auto rounded-lg border border-neutral-200">
      <table className="min-w-full border-collapse text-left text-[12px]">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="whitespace-nowrap border-b border-neutral-200 bg-neutral-50 px-3 py-2 font-semibold text-neutral-700">{children}</th>,
  td: ({ children }) => <td className="border-b border-neutral-100 px-3 py-2 align-top text-neutral-700">{children}</td>,
  pre: ({ children }) => <pre className="my-4 max-w-full overflow-x-auto rounded-xl bg-neutral-900 p-4 text-[12px] leading-6 text-neutral-100">{children}</pre>,
  code: ({ className, children, ...props }) => (
    <code className={`${className || ""} rounded bg-neutral-100 px-1.5 py-0.5 text-[12px] text-neutral-800`} {...props}>{children}</code>
  ),
};

function ReportTextBlock({ content, isStreaming }: { content: string; isStreaming: boolean }) {
  if (isStreaming) {
    return <div className="max-w-full whitespace-pre-wrap break-words leading-7 text-neutral-900">{cleanStreamingMarkdown(content)}</div>;
  }
  const renderedContent = formatReportText(content);
  return (
    <div className="max-w-full break-words overflow-visible text-[15px]">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {renderedContent}
      </ReactMarkdown>
    </div>
  );
}

function EvidenceSummary({ tools, progressBlocks }: { tools: ToolBlock[]; progressBlocks: ProgressBlock[] }) {
  const [open, setOpen] = useState(false);
  const finished = tools.filter(tool => tool.status === "done");
  const experienceProgress = progressBlocks.filter(block =>
    block.content.includes("经验库复用") ||
    block.content.includes("诊断经验已写入") ||
    block.content.includes("相似维修记录") ||
    block.content.includes("历史维修记录") ||
    block.content.includes("经验库暂无") ||
    block.content.includes("经验库暂时")
  );
  if (finished.length === 0 && experienceProgress.length === 0) return null;

  const knowledgeCount = finished.filter(tool => tool.toolName.includes("知识")).length;
  const experienceCount = finished.filter(tool => tool.toolName.includes("经验")).length;
  const kgCount = finished.filter(tool => tool.toolName.includes("图谱")).length;
  const reused = experienceProgress.some(block => block.content.includes("经验库复用") || block.content.includes("命中") || block.content.includes("相似维修记录"));
  const saved = experienceProgress.some(block => block.content.includes("诊断经验已写入"));

  return (
    <div className="w-full border-l border-neutral-200 pl-3">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="flex items-center gap-2 text-xs text-neutral-400 transition-colors hover:text-neutral-700"
      >
        <FileText className="h-3.5 w-3.5" />
        <span>证据链摘要</span>
        {finished.length > 0 && <span>工具 {finished.length} 次</span>}
        {knowledgeCount > 0 && <span>知识库 {knowledgeCount}</span>}
        {experienceCount > 0 && <span>经验库 {experienceCount}</span>}
        {kgCount > 0 && <span>图谱 {kgCount}</span>}
        {reused && <span>已复用经验</span>}
        {saved && <span>已回写经验</span>}
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
      </button>
      {open && (
        <div className="mt-3 space-y-2 text-[11px] leading-5 text-neutral-500">
          {experienceProgress.map((block, index) => (
            <div key={`experience-${index}`} className="rounded-lg bg-neutral-50 px-3 py-2">
              <div className="font-medium text-neutral-700">经验闭环</div>
              <div className="mt-1 break-words">{block.content}</div>
            </div>
          ))}
          {finished.map((tool, index) => (
            <div key={tool.toolId || index} className="rounded-lg bg-neutral-50 px-3 py-2">
              <div className="font-medium text-neutral-700">{index + 1}. {tool.toolName || "工具调用"}</div>
              {tool.input && <div className="mt-1 break-words">输入：{tool.input}</div>}
              {tool.result && <div className="mt-1 break-words">结果：{tool.result}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function exportReportAsPdf(reportText: string) {
  const win = window.open("", "_blank", "width=900,height=720");
  if (!win) return;
  const escaped = formatReportText(reportText)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  win.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>无人机故障诊断报告</title>
        <style>
          body { font-family: "Microsoft YaHei", Arial, sans-serif; margin: 42px; color: #171717; }
          h1 { font-size: 22px; font-weight: 600; margin: 0 0 20px; }
          .meta { color: #737373; font-size: 12px; margin-bottom: 24px; }
          pre { white-space: pre-wrap; word-break: break-word; font-family: inherit; font-size: 13px; line-height: 1.8; }
          @media print { body { margin: 28mm 22mm; } }
        </style>
      </head>
      <body>
        <h1>无人机故障诊断报告</h1>
        <div class="meta">由 UAV Supervisor 多智能体诊断系统生成 · ${new Date().toLocaleString("zh-CN")}</div>
        <pre>${escaped}</pre>
        <script>window.onload = () => setTimeout(() => window.print(), 200);</script>
      </body>
    </html>
  `);
  win.document.close();
}
