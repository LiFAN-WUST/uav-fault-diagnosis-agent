import React from "react";
import { NavLink } from "react-router-dom";
import { Shield, LogOut } from "lucide-react";
import type { AuthState } from "../hooks/useAuth";

interface Props {
  auth: AuthState;
  onLogout: () => void;
  children: React.ReactNode;
}

const roleLabels: Record<string, string> = {
  admin: "系统管理员",
  tech: "维修工程师",
  user: "无人机操作员",
};

const homePaths: Record<string, string> = {
  admin: "/admin",
  tech: "/tech/dashboard",
  user: "/user",
};

export default function Layout({ auth, onLogout, children }: Props) {
  const homePath = homePaths[auth.role || ""] || "/login";
  const agentPath = auth.role === "tech" ? "/tech" : auth.role === "user" ? "/user" : "/agent";

  return (
    <div className="h-screen bg-white flex font-sans antialiased text-neutral-800 overflow-hidden">
      <div className="w-full max-w-[1360px] h-full flex flex-col bg-white overflow-hidden mx-auto">
        {/* Header */}
        <div className="bg-neutral-50 border-b border-neutral-200/80 px-4 py-2.5 flex items-center justify-between select-none shrink-0">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-600" />
            <span className="font-mono text-xs tracking-wider text-neutral-500 uppercase font-medium">
              无人机故障智能诊断系统 v2.5
              <span className="text-[10px] text-neutral-300 hidden sm:inline ml-1">| Research Prototype</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <NavLink
              to={homePath}
              className={({ isActive }) =>
                `text-xs transition-colors ${isActive ? "text-neutral-800" : "text-neutral-400 hover:text-neutral-700"}`
              }
            >
              工作台
            </NavLink>
            {auth.role !== "admin" && (
              <NavLink
                to={agentPath}
                className={({ isActive }) =>
                  `text-xs transition-colors ${isActive ? "text-neutral-800" : "text-neutral-400 hover:text-neutral-700"}`
                }
              >
                Agent 诊断
              </NavLink>
            )}
            <span className="text-xs text-neutral-400">
              {roleLabels[auth.role || ""]} · {auth.username}
            </span>
            <button
              onClick={onLogout}
              className="flex items-center gap-1 text-xs text-neutral-400 hover:text-red-500 transition-colors cursor-pointer"
            >
              <LogOut className="w-3 h-3" />
              退出
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
