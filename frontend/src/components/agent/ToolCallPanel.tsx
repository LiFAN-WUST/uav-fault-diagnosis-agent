import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Loader2, Terminal } from "lucide-react";
import type { ToolBlock } from "../../types/agent";

export function ToolBlockItem({ tool }: { tool: ToolBlock }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isDone = tool.status === "done";
  const isRunning = tool.status === "running";

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  return (
    <div
      className={`transition-all duration-300 ease-out text-[13px] ${
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
    >
      <button
        onClick={() => isDone && setOpen(!open)}
        className="group flex items-center gap-2 text-left text-neutral-400 hover:text-neutral-600 transition-colors"
      >
        <Terminal size={16} className="text-neutral-400" />
        <span className="text-[13px]">
          {isRunning ? "正在运行命令" : "已运行 1 条命令"}
        </span>
        {tool.toolName && (
          <span className="text-[13px] text-neutral-400 hidden sm:inline">
            {tool.toolName}
          </span>
        )}
        <span className="relative flex h-2 w-2 shrink-0 ml-1">
          {isRunning ? (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neutral-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-neutral-400" />
            </>
          ) : (
            <span className="inline-flex rounded-full h-2 w-2 bg-neutral-300" />
          )}
        </span>
        {isDone && (
          open ? <ChevronDown size={14} className="text-neutral-400" />
               : <ChevronRight size={14} className="text-neutral-400" />
        )}
        {isRunning && <Loader2 size={14} className="animate-spin text-neutral-400" />}
      </button>

      <div
        className={`transition-all duration-200 ease-out overflow-hidden ${
          open && isDone ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="mt-2 ml-7 space-y-2 border-l border-neutral-200 pl-3">
          {tool.input && (
            <div>
              <div className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold mb-1">Input</div>
              <pre className="text-neutral-500 bg-neutral-50 rounded-md p-2.5 max-h-20 overflow-auto whitespace-pre-wrap break-all text-[11px] leading-relaxed font-mono">
                {tool.input}
              </pre>
            </div>
          )}
          {tool.result && (
            <div>
              <div className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold mb-1">Result</div>
              <pre className="text-neutral-500 bg-neutral-50 rounded-md p-2.5 max-h-32 overflow-auto whitespace-pre-wrap break-all text-[11px] leading-relaxed font-mono">
                {tool.result}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
