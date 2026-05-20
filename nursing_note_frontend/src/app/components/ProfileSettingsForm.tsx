import { useEffect, useState } from "react";
import { type AuthUser } from "@/app/data/auth-api";
import { usePatchProfileMutation } from "@/app/query/use-app-query";

interface ProfileSettingsFormProps {
  user: AuthUser;
  token: string;
  onProfileSaved: () => void;
  /** 관리자 설정 페이지 등에서 제목 문구 조정 */
  heading?: string;
  description?: string;
}

export function ProfileSettingsForm({
  user,
  token,
  onProfileSaved,
  heading = "내 정보",
  description = "이름은 본인이 수정할 수 있으며, 소속 변경은 관리자만 가능합니다.",
}: ProfileSettingsFormProps) {
  const [name, setName] = useState(user.name);
  const [department, setDepartment] = useState(user.department);
  const [profileMsg, setProfileMsg] = useState("");
  const patchProfileMutation = usePatchProfileMutation(token, token);
  const isAdmin = user.role === "admin";

  useEffect(() => {
    setName(user.name);
    setDepartment(user.department);
  }, [user.name, user.department]);

  async function saveProfile() {
    setProfileMsg("");
    try {
      await patchProfileMutation.mutateAsync({
        name: name.trim(),
        department: isAdmin ? department.trim() : undefined,
      });
      setProfileMsg("저장되었습니다.");
      onProfileSaved();
    } catch (e) {
      setProfileMsg(e instanceof Error ? e.message : "저장 실패");
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
      <h2 className="text-base font-semibold text-gray-900">{heading}</h2>
      <p className="mt-1 text-xs text-gray-500">{description}</p>
      <div className="mt-4 grid max-w-md gap-4">
        <div>
          <label htmlFor="prof-name" className="mb-1 block text-sm font-medium text-gray-700">
            이름
          </label>
          <input
            id="prof-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
          />
        </div>
        <div>
          <label htmlFor="prof-dept" className="mb-1 block text-sm font-medium text-gray-700">
            소속
          </label>
          <input
            id="prof-dept"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            disabled={!isAdmin}
            className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm disabled:cursor-not-allowed disabled:bg-gray-100"
          />
        </div>
        <button
          type="button"
          disabled={patchProfileMutation.isPending}
          onClick={() => void saveProfile()}
          className="h-10 w-fit rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300"
        >
          {patchProfileMutation.isPending ? "저장 중…" : "프로필 저장"}
        </button>
        {profileMsg ? <p className="text-sm text-gray-700">{profileMsg}</p> : null}
      </div>
    </section>
  );
}
