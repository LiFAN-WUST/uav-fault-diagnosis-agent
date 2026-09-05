import React, { useState, useEffect } from "react";
import { Users, Shield, Activity, BarChart3, Search, UserCog, RefreshCw } from "lucide-react";
import type { AuthState } from "../hooks/useAuth";
import { adminStats, adminHistory, adminInfo } from "../utils/api";
import { BACKEND_BASE } from "../utils/api";

interface Props {
  auth: AuthState;
}

interface StatItem {
  label: string;
  value: string | number;
  icon: React.FC<{ className?: string }>;
  color: string;
}

interface HistoryEntry {
  id: string;
  question: string;
  answer_summary: string;
  expert_count: number;
  confidence: number;
  timestamp: string;
  severity: string;
}

const severityColor: Record<string, string> = {
  "高": "bg-red-100 text-red-700",
  "中": "bg-amber-100 text-amber-700",
  "低": "bg-emerald-100 text-emerald-700",
};

export default function AdminDashboard({ auth }: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState({ online_users: 0, today_diagnoses: 0, active_agents: 0, system_health: "检查中..." });
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sysInfo, setSysInfo] = useState({
    backend_version: "v2.0 MoE",
    llm_model: "deepseek-v4-pro",
    neo4j_connected: null,
    embed_model: "bge-m3",
    architecture: "6路并行 + 审计消歧"
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [s, h, info] = await Promise.all([adminStats(), adminHistory(), adminInfo()]);
      if (s.ok) setStats(s);
      if (h.ok) setHistory(h.history || []);
      if (info.ok) setSysInfo(info);
    } catch (e) {
      console.error("Admin fetch error:", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const filtered = history.filter(
    (h) => h.question.includes(searchTerm) || h.answer_summary.includes(searchTerm)
  );

  const statItems: StatItem[] = [
    { label: "在线用户", value: stats.online_users, icon: Users, color: "text-emerald-600 bg-emerald-50" },
    { label: "今日诊断", value: stats.today_diagnoses, icon: Activity, color: "text-blue-600 bg-blue-50" },
    { label: "活跃Agent", value: stats.active_agents, icon: Shield, color: "text-amber-600 bg-amber-50" },
    { label: "系统健康", value: stats.system_health, icon: BarChart3, color: "text-emerald-600 bg-emerald-50" },
  ];

  return (
    <div className="flex flex-1 overflow-hidden flex-col h-full">
      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 pb-4">
        {statItems.map((stat, i) => (
          <div key={i} className="bg-white border border-neutral-200 rounded-xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-800">{stat.value}</p>
              <p className="text-xs text-neutral-400">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-6 px-6 pb-6 overflow-hidden">
        {/* Diagnosis History */}
        <div className="flex-1 bg-white border border-neutral-200 rounded-xl flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCog className="w-4 h-4 text-neutral-500" />
              <span className="font-semibold text-sm text-neutral-700">诊断记录</span>
              <span className="text-xs text-neutral-300">({history.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-neutral-300 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="搜索诊断记录..."
                  className="pl-7 pr-3 py-1.5 border border-neutral-200 rounded-md text-xs w-44 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <button
                onClick={fetchData}
                disabled={loading}
                className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors"
                title="刷新"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-left sticky top-0">
                <tr>
                  <th className="px-5 py-2.5 text-xs font-medium text-neutral-400 uppercase">ID</th>
                  <th className="px-5 py-2.5 text-xs font-medium text-neutral-400 uppercase">问题</th>
                  <th className="px-5 py-2.5 text-xs font-medium text-neutral-400 uppercase">摘要</th>
                  <th className="px-5 py-2.5 text-xs font-medium text-neutral-400 uppercase">专家</th>
                  <th className="px-5 py-2.5 text-xs font-medium text-neutral-400 uppercase">时间</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-neutral-400">
                      {loading ? "加载中..." : history.length === 0 ? "暂无诊断记录，去用户端发一条试试" : "无匹配结果"}
                    </td>
                  </tr>
                ) : (
                  filtered.map((h) => (
                    <tr key={h.id} className="border-t border-neutral-50 hover:bg-neutral-50/50 transition-colors">
                      <td className="px-5 py-3 font-mono text-xs text-neutral-400">{h.id}</td>
                      <td className="px-5 py-3 text-neutral-700 max-w-[200px] truncate">{h.question}</td>
                      <td className="px-5 py-3 text-neutral-500 max-w-[250px] truncate">{h.answer_summary}</td>
                      <td className="px-5 py-3">
                        <span className="text-xs text-amber-600 font-medium">{h.expert_count}路并行</span>
                      </td>
                      <td className="px-5 py-3 text-xs text-neutral-400">{h.timestamp}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar: Stats Summary */}
        <div className="w-full md:w-[300px] bg-white border border-neutral-200 rounded-xl flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-500" />
            <span className="font-semibold text-sm text-neutral-700">系统信息</span>
          </div>
          <div className="flex-1 p-5 space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-400">后端版本</span>
                <span className="text-neutral-700 font-mono">{sysInfo.backend_version}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-400">LLM 模型</span>
                <select value={sysInfo.llm_model} onChange={async (e) => { const m = e.target.value; await fetch(BACKEND_BASE+"/admin/model", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({model:m}) }); setSysInfo({...sysInfo, llm_model:m}); }} className="text-neutral-700 text-sm border border-neutral-300 rounded px-2 py-0.5 bg-white cursor-pointer hover:border-amber-400">
                  <option value="deepseek-v4-pro">deepseek-v4-pro</option>
                  <option value="deepseek-v4-flash">deepseek-v4-flash</option>
                </select>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-400">知识图谱</span>
                <span className={sysInfo.neo4j_connected ? "text-emerald-600" : "text-red-400"}>Neo4j {sysInfo.neo4j_connected ? "已连接" : "未连接"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-400">嵌入模型</span>
                <span className="text-neutral-700">{sysInfo.embed_model} (Ollama)</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-400">架构模式</span>
                <span className="text-neutral-700 font-mono text-xs">{sysInfo.architecture || "6路并行 + 审计消歧"}</span>
              </div>
            </div>
            <hr className="border-neutral-100" />
            <div className="text-xs text-neutral-400 space-y-1">
              <p>UAV Fault Diagnosis Research</p>
              <p>Private Research Prototype</p>
              <p className="text-neutral-300">Maintainer access only</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
