import { useCallback, useEffect, useState } from "react";

export type Role = "user" | "tech" | "admin" | null;

export interface AuthState {
  role: Role;
  username: string;
}

const BACKEND = import.meta.env.VITE_BACKEND_BASE || "/api";
const EMPTY_AUTH: AuthState = { role: null, username: "" };

type LoginResult = { ok: true } | { ok: false; error: string };

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>(EMPTY_AUTH);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(BACKEND + "/auth/me", { credentials: "same-origin" })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!active || !data?.authenticated) return;
        setAuth({ role: "user", username: data.display_name || "评审用户" });
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setIsReady(true);
      });
    return () => { active = false; };
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<LoginResult> => {
    try {
      const response = await fetch(BACKEND + "/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        return { ok: false, error: data.detail || "登录失败，请稍后重试。" };
      }
      setAuth({ role: "user", username: data.display_name || "评审用户" });
      return { ok: true };
    } catch {
      return { ok: false, error: "无法连接诊断服务，请检查网络后重试。" };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch(BACKEND + "/auth/logout", { method: "POST", credentials: "same-origin" });
    } finally {
      setAuth(EMPTY_AUTH);
    }
  }, []);

  return { auth, login, logout, isReady, isLoggedIn: auth.role !== null };
}
