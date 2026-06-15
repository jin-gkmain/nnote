import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/app/auth/auth-context";
import { createInquiry } from "@/app/data/inquiries-api";
import { ROUTES } from "@/app/navigation/routes";

export default function InquiryPage() {
  const { user, token } = useAuth();
  const [replyEmail, setReplyEmail] = useState(user?.loginId.includes("@") ? user.loginId : "");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [submittedId, setSubmittedId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const result = await createInquiry({
        replyEmail: replyEmail.trim(),
        title: title.trim(),
        content: content.trim(),
      }, token);
      setSubmittedId(result.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "문의 접수에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-dvh bg-[#f9fafb] text-[#1f2024]">
      <main className="mx-auto min-h-dvh w-full max-w-[560px] px-[clamp(1rem,5vw,1.5rem)] pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
        <header className="grid h-12 grid-cols-[44px_minmax(0,1fr)_44px] items-center">
          <Link
            to={ROUTES.login}
            className="flex h-11 w-11 items-center justify-center rounded-md text-gray-700 hover:bg-gray-100"
            aria-label="로그인으로 돌아가기"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-center text-xl font-bold">문의사항</h1>
        </header>

        {submittedId ? (
          <section className="mx-auto mt-[clamp(4rem,18vh,8rem)] max-w-md text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-[#3b82f6]" />
            <h2 className="mt-5 text-2xl font-bold">문의가 접수되었습니다</h2>
            <p className="mt-3 text-sm leading-6 text-gray-500">
              접수번호 {submittedId}
              <br />
              입력한 이메일로 답변을 안내해 드립니다.
            </p>
            <Link
              to={ROUTES.login}
              className="mt-10 inline-flex h-12 w-full items-center justify-center rounded-[5px] bg-[#3b82f6] font-semibold text-white"
            >
              확인
            </Link>
          </section>
        ) : (
          <form
            onSubmit={(event) => void submit(event)}
            className="mt-8 grid grid-cols-1 gap-6 landscape:mt-4 min-[480px]:landscape:grid-cols-2"
          >
            <div className="min-[480px]:landscape:col-span-2">
              <p className="text-2xl font-bold">무엇을 도와드릴까요?</p>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                서비스 이용 중 궁금한 점이나 불편한 내용을 남겨주세요.
              </p>
            </div>

            <label className="block min-w-0">
              <span className="mb-2 block text-sm font-semibold">답변 받을 이메일</span>
              <input
                type="email"
                required
                value={replyEmail}
                onChange={(event) => setReplyEmail(event.target.value)}
                className="h-12 w-full rounded-[5px] border border-[#e5e7eb] bg-white px-3 outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-blue-100"
                placeholder="name@example.com"
              />
            </label>

            <label className="block min-w-0">
              <span className="mb-2 block text-sm font-semibold">문의 제목</span>
              <input
                required
                minLength={2}
                maxLength={200}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="h-12 w-full rounded-[5px] border border-[#e5e7eb] bg-white px-3 outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-blue-100"
                placeholder="문의 제목을 입력해주세요"
              />
            </label>

            <label className="block min-w-0 min-[480px]:landscape:col-span-2">
              <span className="mb-2 block text-sm font-semibold">문의 내용</span>
              <textarea
                required
                minLength={5}
                maxLength={5000}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                className="min-h-52 w-full resize-y rounded-[5px] border border-[#e5e7eb] bg-white px-3 py-3 leading-6 outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-blue-100 landscape:min-h-32"
                placeholder="문의 내용을 자세히 입력해주세요"
              />
              <span className="mt-1 block text-right text-xs text-gray-400">
                {content.length}/5000
              </span>
            </label>

            <label className="flex min-w-0 cursor-pointer items-start gap-3 rounded-[5px] border border-[#e5e7eb] bg-white p-4 min-[480px]:landscape:col-span-2">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(event) => setAgreed(event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#3b82f6]"
              />
              <span className="text-sm leading-5 text-gray-600">
                문의 답변을 위한 이메일 수집 및 이용에 동의합니다.
              </span>
            </label>

            {error ? (
              <p className="text-sm text-red-600 min-[480px]:landscape:col-span-2">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={
                isSubmitting ||
                !agreed ||
                !replyEmail.trim() ||
                title.trim().length < 2 ||
                content.trim().length < 5
              }
              className="h-[60px] w-full rounded-[5px] bg-[#3b82f6] font-bold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-300 min-[480px]:landscape:col-span-2"
            >
              {isSubmitting ? "접수 중..." : "문의 접수"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
