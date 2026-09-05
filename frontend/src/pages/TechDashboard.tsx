import React, { useState, useRef, useEffect, DragEvent } from "react";
import { Send, Upload, FileText, X, RefreshCw, Wrench, Database } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm";
import { callFlowise } from "../utils/api";
import type { AuthState } from "../hooks/useAuth";

interface Message {
  id: string;
  role: "system" | "user" | "agent";
  content: string;
  timestamp: string;
  isError?: boolean;
}

interface Props {
  auth: AuthState;
}

export default function TechDashboard({ auth }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      role: "system",
      content: `技术诊断终端已就绪，${auth.username}。请接入黑匣子飞行数据、上传受损照片，并输入诊断问题。`,
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [isDragOverImg, setIsDragOverImg] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [logContent, setLogContent] = useState<string | null>(null);
  const [logName, setLogName] = useState<string | null>(null);
  const [logLines, setLogLines] = useState<number>(0);
  const [isDragOverLog, setIsDragOverLog] = useState(false);
  const logInputRef = useRef<HTMLInputElement>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const addSystemMsg = (content: string) => {
    setMessages((prev) => [
      ...prev,
      { id: `sys-${Date.now()}`, role: "system", content, timestamp: new Date().toLocaleTimeString() },
    ]);
  };

  // Image handlers
  const processImage = (file: File) => {
    if (!file.type.startsWith("image/")) { addSystemMsg("请上传 JPEG/PNG/BMP/WebP 格式图片。"); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setImagePreview(e.target.result as string);
        setImageName(file.name);
        addSystemMsg(`已加载视觉快照: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
      }
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => { setImagePreview(null); setImageName(null); };

  // Log handlers
  const processLog = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        const text = e.target.result as string;
        const lines = text.split("\n").filter((l) => l.trim());
        setLogContent(text);
        setLogName(file.name);
        setLogLines(lines.length);
        addSystemMsg(`已加载黑匣子数据: ${file.name} (${lines.length} 条记录, ${(file.size / 1024).toFixed(1)} KB)`);
      }
    };
    reader.readAsText(file);
  };

  const clearLog = () => { setLogContent(null); setLogName(null); setLogLines(0); };

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text && !imagePreview && !logContent) return;
    setInputText("");
    setIsLoading(true);

    const query = text || "请基于上传的飞行数据和受损照片进行综合故障诊断。";
    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: "user", content: query, timestamp: new Date().toLocaleTimeString() },
    ]);

    try {
      const uploads = imagePreview
        ? [{ data: imagePreview, type: "file", name: imageName || "damage.png", mime: "image/png" }]
        : [];

      let fullQuery = query;
      if (logContent) {
        fullQuery += `\n\n[黑匣子审计数据]\n文件名: ${logName}\n记录数: ${logLines}\n数据内容:\n${logContent.slice(0, 8000)}\n\n请结合飞行数据与描述进行深度技术诊断。`;
      }

      const result = await callFlowise(fullQuery, uploads);
      setMessages((prev) => [
        ...prev,
        { id: `agent-${Date.now()}`, role: "agent", content: result, timestamp: new Date().toLocaleTimeString() },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages((prev) => [
        ...prev,
        { id: `err-${Date.now()}`, role: "agent", content: `[遥测总线异常] ${msg}`, timestamp: new Date().toLocaleTimeString(), isError: true },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([{ id: `reset-${Date.now()}`, role: "system", content: "诊断终端已重置。", timestamp: new Date().toLocaleTimeString() }]);
    setImagePreview(null); setImageName(null);
    setLogContent(null); setLogName(null); setLogLines(0);
    setInputText("");
  };

  return (
    <div className="flex flex-1 overflow-hidden flex-col md:flex-row h-full">
      {/* Left Sidebar - Data Upload */}
      <div className="w-full md:w-[300px] bg-neutral-50/70 border-r border-neutral-200 flex flex-col p-5 gap-5 shrink-0 overflow-y-auto">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Wrench className="w-4 h-4 text-amber-600" />
            <span className="font-mono text-xs font-semibold text-neutral-500 uppercase tracking-wider">技术诊断面板</span>
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed">
            接入飞行数据日志与视觉证据，系统将结合多源数据进行深度故障分析。
          </p>
        </div>

        {/* Black Box Log Upload */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOverLog(true); }}
          onDragLeave={() => setIsDragOverLog(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragOverLog(false); if (e.dataTransfer.files?.[0]) processLog(e.dataTransfer.files[0]); }}
          onClick={() => logInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors cursor-pointer ${isDragOverLog ? "border-amber-400 bg-amber-50" : "border-neutral-300 hover:border-neutral-400"}`}
        >
          {logContent ? (
            <div className="relative">
              <Database className="w-5 h-5 text-amber-500 mx-auto mb-1" />
              <p className="text-xs text-neutral-600 font-medium truncate">{logName}</p>
              <p className="text-[10px] text-neutral-400">{logLines} 条记录</p>
              <button onClick={(e) => { e.stopPropagation(); clearLog(); }} className="absolute top-0 right-0 bg-white/80 rounded-full p-0.5 hover:bg-white cursor-pointer">
                <X className="w-3 h-3 text-neutral-500" />
              </button>
            </div>
          ) : (
            <div className="py-3">
              <Database className="w-6 h-6 text-neutral-300 mx-auto mb-1.5" />
              <p className="text-xs text-neutral-400">黑匣子飞行数据</p>
              <p className="text-[10px] text-neutral-300 mt-0.5">CSV / TXT / LOG</p>
            </div>
          )}
        </div>
        <input ref={logInputRef} type="file" accept=".csv,.txt,.log,.json" className="hidden" onChange={(e) => { if (e.target.files?.[0]) processLog(e.target.files[0]); }} />

        {/* Image Upload */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOverImg(true); }}
          onDragLeave={() => setIsDragOverImg(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragOverImg(false); if (e.dataTransfer.files?.[0]) processImage(e.dataTransfer.files[0]); }}
          onClick={() => imageInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors cursor-pointer ${isDragOverImg ? "border-amber-400 bg-amber-50" : "border-neutral-300 hover:border-neutral-400"}`}
        >
          {imagePreview ? (
            <div className="relative">
              <img src={imagePreview} alt="preview" className="w-full h-28 object-cover rounded-lg mb-1.5" />
              <p className="text-xs text-neutral-500 truncate">{imageName}</p>
              <button onClick={(e) => { e.stopPropagation(); clearImage(); }} className="absolute top-1 right-1 bg-white/80 rounded-full p-0.5 hover:bg-white cursor-pointer">
                <X className="w-3 h-3 text-neutral-500" />
              </button>
            </div>
          ) : (
            <div className="py-3">
              <FileText className="w-6 h-6 text-neutral-300 mx-auto mb-1.5" />
              <p className="text-xs text-neutral-400">受损快照</p>
              <p className="text-[10px] text-neutral-300 mt-0.5">JPEG / PNG / BMP</p>
            </div>
          )}
        </div>
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) processImage(e.target.files[0]); }} />

        {/* Data Status */}
        <div className="bg-white border border-neutral-200 rounded-lg p-3">
          <p className="text-[10px] text-neutral-400 uppercase font-semibold mb-2">审计数据状态</p>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between"><span className="text-neutral-500">飞行日志</span><span className={logContent ? "text-emerald-600" : "text-neutral-300"}>{logContent ? `已加载 (${logLines}行)` : "未接入"}</span></div>
            <div className="flex justify-between"><span className="text-neutral-500">视觉快照</span><span className={imagePreview ? "text-emerald-600" : "text-neutral-300"}>{imagePreview ? "已加载" : "未接入"}</span></div>
          </div>
        </div>

        <button onClick={handleReset} className="flex items-center justify-center gap-2 w-full py-2 border border-neutral-300 rounded-lg text-xs text-neutral-500 hover:bg-neutral-100 transition-colors cursor-pointer mt-auto">
          <RefreshCw className="w-3 h-3" /> 重置终端
        </button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === "user" ? "bg-neutral-800 text-white"
                  : m.role === "system" ? "bg-amber-50 text-amber-800 border border-amber-100"
                  : m.isError ? "bg-red-50 text-red-700 border border-red-100"
                  : "bg-neutral-100 text-neutral-700"
                }`}
              >
                {m.role === "agent" && !m.isError ? (
                <div className="prose prose-sm max-w-none prose-table:text-xs prose-th:bg-neutral-100 prose-th:px-2 prose-th:py-1 prose-td:px-2 prose-td:py-1 prose-code:bg-neutral-200 prose-code:px-1 prose-code:rounded prose-pre:bg-neutral-800 prose-pre:text-neutral-100">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {m.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{m.content}</p>
              )}
                <span className="text-[10px] opacity-50 mt-1 block">{m.timestamp}</span>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-neutral-100 rounded-xl px-4 py-3 text-sm text-neutral-400 animate-pulse">
                Agent 工作流执行中，正在分析多源数据...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-neutral-200 p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="输入诊断问题或技术分析需求..."
              className="flex-1 px-4 py-2.5 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || (!inputText.trim() && !imagePreview && !logContent)}
              className="px-4 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
