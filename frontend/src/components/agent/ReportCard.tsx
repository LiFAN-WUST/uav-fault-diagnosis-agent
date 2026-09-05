import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FileText, Download } from "lucide-react";

interface ReportCardProps {
  content: string;
}

export function ReportCard({ content }: ReportCardProps) {
  const handleExport = () => {
    console.log("导出中...");
    // TODO: integrate jsPDF or window.print()
  };

  return (
    <div className="relative bg-white rounded-xl shadow-lg border border-blue-200/60 p-6 mt-4 w-full">
      {/* Export button */}
      <button
        onClick={handleExport}
        className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 hover:shadow-sm transition-all duration-200 active:scale-95"
      >
        <Download size={13} />
        <span className="hidden sm:inline">导出 PDF 报告</span>
      </button>

      {/* Header */}
      <div className="flex items-center gap-3 mb-5 pr-24">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
          <FileText size={16} className="text-white" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-neutral-800">综合诊断报告</h3>
          <p className="text-[11px] text-neutral-400">审计总工程师 &middot; 多专家消歧汇总</p>
        </div>
      </div>

      {/* Markdown body */}
      <div className="prose prose-blue prose-sm max-w-none
        prose-headings:text-neutral-800 prose-headings:font-bold
        prose-h2:text-base prose-h2:mt-6 prose-h2:mb-3 prose-h2:pb-1.5 prose-h2:border-b prose-h2:border-neutral-200
        prose-h3:text-sm prose-h3:mt-4 prose-h3:mb-2
        prose-p:text-neutral-600 prose-p:leading-relaxed
        prose-strong:text-neutral-800
        prose-table:text-xs prose-table:border-collapse
        prose-th:bg-blue-50 prose-th:text-blue-900 prose-th:font-semibold prose-th:px-3 prose-th:py-2 prose-th:border prose-th:border-blue-200
        prose-td:px-3 prose-td:py-2 prose-td:border prose-td:border-neutral-200
        prose-tr:even:bg-neutral-50/50
        prose-li:text-neutral-600 prose-li:marker:text-blue-500
        prose-code:bg-neutral-100 prose-code:text-amber-700 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-[11px] prose-code:before:content-none prose-code:after:content-none
        prose-pre:bg-neutral-900 prose-pre:text-emerald-300 prose-pre:rounded-lg prose-pre:shadow-inner
        prose-blockquote:border-l-4 prose-blockquote:border-blue-400 prose-blockquote:bg-blue-50/50 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:not-italic prose-blockquote:text-neutral-600
        prose-hr:border-neutral-200
      ">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {content}
        </ReactMarkdown>
      </div>

      {/* Footer */}
      <div className="mt-6 pt-3 border-t border-neutral-100 flex items-center justify-between text-[10px] text-neutral-400">
        <span>UAV Fault Diagnosis System v3.0 &middot; Research Prototype</span>
        <span>{new Date().toLocaleString("zh-CN")}</span>
      </div>
    </div>
  );
}

/** Heuristic: detect if a text block is the auditor's final report. */
export function isAuditorReport(content: string, blockIndex: number, totalBlocks: number): boolean {
  if (!content || content.length < 80) return false;
  // The supervisor always outputs blockquotes; the auditor outputs structured markdown
  const hasHeaders = /^#{1,4}\s/.test(content);
  const hasTable = /\|.*\|/.test(content);
  const hasList = /^[\s]*[-*+]\s/.test(content);
  const isLastBlock = blockIndex === totalBlocks - 1;
  return (hasHeaders || hasTable || (hasList && content.length > 200)) && isLastBlock;
}
