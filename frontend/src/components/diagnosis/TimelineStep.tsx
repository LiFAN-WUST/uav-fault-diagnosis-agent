import { ChevronDown, CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";
import { useState } from "react";
import type { DiagnosisStep } from "../../types/diagnosis";

interface TimelineStepProps {
  step: DiagnosisStep;
}

const statusStyles = {
  pending: {
    icon: <Circle className="h-3.5 w-3.5 text-slate-600" />,
    row: "bg-slate-950",
    text: "text-slate-400",
    label: "等待中",
  },
  running: {
    icon: <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-300" />,
    row: "bg-sky-950/35",
    text: "text-sky-100",
    label: "分析中",
  },
  success: {
    icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />,
    row: "bg-slate-950",
    text: "text-slate-100",
    label: "已完成",
  },
  error: {
    icon: <XCircle className="h-3.5 w-3.5 text-red-400" />,
    row: "bg-red-950/25",
    text: "text-red-100",
    label: "失败",
  },
};

export function TimelineStep({ step }: TimelineStepProps) {
  const [expanded, setExpanded] = useState(false);
  const style = statusStyles[step.status];
  const hasDetail = Boolean(step.detail || step.content);

  return (
    <div className={`${style.row} px-4 py-2.5 transition-colors`}>
      <div className="flex min-h-[52px] items-start gap-3">
        <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">{style.icon}</div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className={`truncate text-sm font-medium ${style.text}`}>{step.title}</h3>
            {step.role && (
              <span className="hidden rounded border border-slate-800 px-1.5 py-0.5 text-[10px] text-slate-500 sm:inline">
                {step.role}
              </span>
            )}
            <span className="ml-auto shrink-0 text-[11px] text-slate-500">{style.label}</span>
          </div>

          {step.content && (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-400">{step.content}</p>
          )}
        </div>

        {hasDetail && (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="mt-0.5 rounded p-1 text-slate-600 transition-colors hover:bg-slate-900 hover:text-slate-200"
            title={expanded ? "收起详情" : "展开详情"}
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>

      {expanded && hasDetail && (
        <div className="ml-8 mt-2 rounded-md border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs leading-relaxed text-slate-300">
          {step.detail || step.content}
        </div>
      )}
    </div>
  );
}
