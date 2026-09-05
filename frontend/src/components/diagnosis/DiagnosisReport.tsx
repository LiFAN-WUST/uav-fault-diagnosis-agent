import { AlertTriangle, ClipboardCheck, Wrench } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { DiagnosisFinalReport } from "../../types/diagnosis";

interface DiagnosisReportProps {
  report: DiagnosisFinalReport;
}

export function DiagnosisReport({ report }: DiagnosisReportProps) {
  return (
    <section className="rounded-lg border border-slate-800 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-sky-600" />
          <h2 className="text-sm font-semibold text-slate-900">综合诊断报告</h2>
          <span className="ml-auto rounded bg-slate-900 px-2 py-0.5 text-[11px] text-sky-100">
            风险等级：{report.riskLevel}
          </span>
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-2">
        <div className="space-y-3">
          <div>
            <div className="text-xs font-medium text-slate-500">故障类型</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{report.faultType}</div>
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">根因判断</div>
            <div className="mt-1 text-sm leading-relaxed text-slate-700">{report.rootCause}</div>
          </div>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-amber-800">
            <AlertTriangle className="h-3.5 w-3.5" />
            关键证据
          </div>
          <ul className="space-y-1 text-xs leading-relaxed text-amber-900">
            {report.evidence.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 lg:col-span-2">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-sky-900">
            <Wrench className="h-3.5 w-3.5" />
            维修建议
          </div>
          <ul className="space-y-1 text-xs leading-relaxed text-sky-950">
            {report.recommendation.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>

        {report.rawText && (
          <div className="lg:col-span-2">
            <div className="mb-2 text-xs font-medium text-slate-500">可追溯诊断链路</div>
            <div className="prose prose-sm max-w-none rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-700 prose-table:text-xs prose-th:bg-slate-100 prose-th:px-2 prose-th:py-1 prose-td:px-2 prose-td:py-1">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{report.rawText}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
