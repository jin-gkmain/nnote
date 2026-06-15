import { useState } from "react";
import { useAuth } from "@/app/auth/auth-context";
import { ROUTES } from "@/app/navigation/routes";
import logoImg from "@/assets/logo.png";
import { Link, useLocation, useNavigate } from "react-router-dom";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from =
    (location.state as { from?: string } | null)?.from ?? ROUTES.settings;

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await login(loginId.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-dvh bg-[#f9fafb] text-black">
      <main className="mx-auto min-h-dvh w-full max-w-[390px] pt-11">
        <header className="flex h-[34px] items-center justify-between px-3.5">
          <img src={logoImg} alt="간호일지 AI" className="h-[34px] w-9 object-contain" />
          <Link
            to={ROUTES.inquiry}
            className="text-base font-bold leading-none text-black hover:text-[#155dfc]"
          >
            Contact
          </Link>
        </header>

        <section className="ml-[23px] mt-[42px] w-[340px] max-w-[calc(100%-46px)]">
          <h1 className="text-[36px] font-bold leading-none tracking-normal text-black">
            Login
          </h1>
          <p className="mt-3 text-base font-normal leading-none text-black">
            아이디와 비밀번호를 입력해주세요
          </p>
        </section>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="ml-[23px] mt-[55px] w-[340px] max-w-[calc(100%-46px)]"
        >
          <div>
            <label htmlFor="login-id" className="mb-[11px] block text-base font-bold leading-none text-black">
              이메일 아이디
            </label>
            <input
              id="login-id"
              autoComplete="username"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              className="h-[45px] w-full rounded-[5px] border border-black/10 bg-white px-3 text-base text-black outline-none transition focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/20"
            />
          </div>
          <div className="mt-[23px]">
            <label htmlFor="login-pw" className="mb-[11px] block text-base font-bold leading-none text-black">
              비밀번호
            </label>
            <input
              id="login-pw"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-[45px] w-full rounded-[5px] border border-black/10 bg-white px-3 text-base text-black outline-none transition focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/20"
            />
          </div>
          {error ? (
            <p className="mt-4 rounded-[5px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={isSubmitting || !loginId.trim() || !password}
            className="mt-[39px] h-[60px] w-full rounded-[5px] bg-[#3b82f6] text-base font-bold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-[#3b82f6]"
          >
            {isSubmitting ? "확인 중…" : "로그인"}
          </button>
        </form>
      </main>
    </div>
  );
}
