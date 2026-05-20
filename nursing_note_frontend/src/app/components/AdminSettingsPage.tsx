import { useAuth } from "@/app/auth/auth-context";
import { ProfileSettingsForm } from "@/app/components/ProfileSettingsForm";

export default function AdminSettingsPage() {
  const { user, token, refreshMe } = useAuth();
  if (!user || !token) return null;
  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">설정</h1>
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
