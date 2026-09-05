import { FormEvent, useState } from "react";
import { ArrowRight, KeyRound, ShieldCheck, UserRound } from "lucide-react";

interface Props {
  onLogin: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
}

export default function LoginPage({ onLogin }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!username.trim() || !password.trim() || isSubmitting) return;

    setError("");
    setIsSubmitting(true);
    const result = await onLogin(username, password);
    setIsSubmitting(false);
    if (!result.ok) setError(result.error || "登录失败，请重试。");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f8] px-5 py-10 text-neutral-900">
      <section className="w-full max-w-[420px]">
        <div className="mb-9 text-center">
          <img src="/cap-logo.png" alt="CAP 参赛项目标识" className="mx-auto mb-5 h-14 w-auto object-contain" />
          <p className="text-xs font-medium tracking-[0.16em] text-neutral-400">第二届综合交通运输大模型智能体创新应用大赛</p>
          <h1 className="mt-3 text-[26px] font-semibold tracking-[-0.04em]">巡影追踪</h1>
          <p className="mt-2 text-sm leading-6 text-neutral-500">基于条件路由的多智能体协同无人机故障诊断系统</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-[0_12px_42px_rgba(0,0,0,0.05)]">
          <label htmlFor="review-username" className="mb-2 block text-sm font-medium text-neutral-700">
            评审账号
          </label>
          <div className="relative">
            <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              id="review-username"
              autoFocus
              autoComplete="username"
              value={username}
              onChange={(event) => { setUsername(event.target.value); setError(""); }}
              placeholder="输入评审账号"
              className="h-11 w-full rounded-xl border border-neutral-300 bg-white pl-10 pr-4 text-sm outline-none transition placeholder:text-neutral-400 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"
            />
          </div>

          <label htmlFor="review-password" className="mb-2 mt-4 block text-sm font-medium text-neutral-700">
            访问密码
          </label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              id="review-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => { setPassword(event.target.value); setError(""); }}
              placeholder="输入评审访问密码"
              className="h-11 w-full rounded-xl border border-neutral-300 bg-white pl-10 pr-4 text-sm outline-none transition placeholder:text-neutral-400 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"
            />
          </div>
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={!username.trim() || !password.trim() || isSubmitting}
            className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            {isSubmitting ? "正在验证…" : "进入系统"}
            {!isSubmitting && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>

        <div className="mt-5 flex items-center justify-center gap-1.5 text-xs text-neutral-400">
          <ShieldCheck className="h-3.5 w-3.5" />
          仅供赛事评审与演示使用
        </div>
      </section>
    </main>
  );
}
