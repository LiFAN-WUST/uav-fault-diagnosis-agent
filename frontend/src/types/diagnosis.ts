export type StepStatus = "pending" | "running" | "success" | "error";

export interface DiagnosisStep {
  id: string;
  title: string;
  role?: string;
  status: StepStatus;
  content?: string;
  detail?: string;
  startedAt?: string;
  finishedAt?: string;
}

export interface DiagnosisFinalReport {
  faultType: string;
  rootCause: string;
  riskLevel: string;
  evidence: string[];
  recommendation: string[];
  rawText?: string;
}

export interface DiagnosisStreamEvent {
  type: "step" | "log" | "final" | "error" | "done";
  step?: DiagnosisStep;
  message?: string;
  report?: DiagnosisFinalReport;
}

export type ChatMessage =
  | {
      id: string;
      type: "user";
      content: string;
      createdAt: string;
    }
  | {
      id: string;
      type: "assistant";
      content: string;
      createdAt: string;
    }
  | {
      id: string;
      type: "agent_run";
      steps: DiagnosisStep[];
      logs: string[];
      status: "running" | "done" | "error";
      createdAt: string;
    }
  | {
      id: string;
      type: "report";
      report: DiagnosisFinalReport;
      createdAt: string;
    };

export const DEFAULT_DIAGNOSIS_STEPS: DiagnosisStep[] = [
  { id: "received", title: "已接收任务", role: "系统", status: "pending" },
  { id: "intent", title: "分析意图", role: "系统", status: "pending" },
  { id: "structure", title: "结构专家分析", role: "MoE 专家", status: "pending" },
  { id: "power", title: "动力专家分析", role: "MoE 专家", status: "pending" },
  { id: "battery", title: "电池专家分析", role: "MoE 专家", status: "pending" },
  { id: "avionics", title: "航电专家分析", role: "MoE 专家", status: "pending" },
  { id: "vibration", title: "振动专家分析", role: "MoE 专家", status: "pending" },
  { id: "environment", title: "环境专家分析", role: "MoE 专家", status: "pending" },
  { id: "auditor", title: "审计总工程师消歧", role: "审计节点", status: "pending" },
  { id: "report", title: "生成综合诊断报告", role: "系统", status: "pending" },
];
