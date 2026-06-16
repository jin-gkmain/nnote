import { useNavigate } from "react-router-dom";
import { useAuth } from "@/app/auth/auth-context";
import { ProfileSettingsForm } from "@/app/components/ProfileSettingsForm";
import { ROUTES } from "@/app/navigation/routes";

export default function AdminSettingsPage() {
  const { user, token, refreshMe } = useAuth();
  const navigate = useNavigate();
  if (!user || !token) return null;
  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">설정</h1>
      <section className="rounded-xl border border-blue-100 bg-blue-50/70 p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">일반 모드</h2>
            <p className="mt-1 text-xs text-gray-600">
              기록 작성과 조회 화면으로 돌아갑니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate(ROUTES.home)}
            className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800"
          >
            일반 모드로 전환
          </button>
        </div>
      </section>
      <ProfileSettingsForm
        user={user}
        token={token}
        onProfileSaved={() => void refreshMe()}
        heading="내 정보"
        description="관리자 프로필입니다. 이름·소속은 본인이 수정할 수 있습니다."
      />
    </div>
  );
}
