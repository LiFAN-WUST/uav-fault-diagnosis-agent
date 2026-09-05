import { ChevronDown, Terminal } from "lucide-react";
import { useState } from "react";
import type { DiagnosisStep } from "../../types/diagnosis";
import { TimelineStep } from "./TimelineStep";

interface DiagnosisTimelineProps {
  steps: DiagnosisStep[];
  logs: string[];
  status: "running" | "done" | "error";
}

export function DiagnosisTimeline({ steps, logs, status }: DiagnosisTimelineProps) {
  const [logsOpen, setLogsOpen] = useState(false);
  const runningStep = steps.find((step) => step.status === "running");

  return (
    <section className="text-slate-100">
      <div className="border-b border-slate-800 px-4 py-2.5">
        <div className="font-mono text-[11px] text-slate-400">
          {status === "running" ? `正在执行：${runningStep?.title ?? "等待节点"}` : "执行节点已结束"}
        </div>
      </div>

      <div className="divide-y divide-slate-800/80">
        {steps.map((step) => (
          <TimelineStep key={step.id} step={step} />
        ))}
      </div>

      <div className="border-t border-slate-800">
        <button
          type="button"
          onClick={() => setLogsOpen((value) => !value)}
          className="flex w-full items-center gap-2 px-4 py-2.5 text-left font-mono text-[11px] text-slate-400 transition-colors hover:bg-slate-900/60 hover:text-slate-200"
        >
          <Terminal className="h-3.5 w-3.5 text-sky-300" />
          <span>查看执行日志 {logs.length} 条</span>
          <ChevronDown className={`ml-auto h-3.5 w-3.5 transition-transform ${logsOpen ? "rotate-180" : ""}`} />
        </button>

        {logsOpen && (
          <div className="max-h-52 space-y-1 overflow-y-auto border-t border-slate-800 bg-slate-950/80 px-4 py-3 font-mono text-[11px] leading-relaxed text-slate-400">
            {logs.length === 0 ? (
              <div className="text-slate-600">暂无执行日志。</div>
            ) : (
              logs.map((log, index) => (
                <div key={`${log}-${index}`} className="truncate">
                  {log}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </section>
  );
}
