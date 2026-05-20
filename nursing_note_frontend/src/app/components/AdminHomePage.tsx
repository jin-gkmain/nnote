import { useCallback, useState } from "react";
import { useAuth } from "@/app/auth/auth-context";
import { type AuthUser } from "@/app/data/auth-api";
import { AdminUserDetailModal } from "@/app/components/AdminUserDetailModal";
import { useTemplatesMapQuery, useUsersQuery } from "@/app/query/use-app-query";

function roleLabel(role: AuthUser["role"]): string {
  return role === "admin" ? "관리자" : "사용자";
}

export default function AdminHomePage() {
  const { token, user: actor } = useAuth();
  const [detailUserId, setDetailUserId] = useState<number | null>(null);
  const usersQuery = useUsersQuery(token);
  const templatesQuery = useTemplatesMapQuery();
  const users = usersQuery.data ?? [];
  const templateIds = Object.keys(templatesQuery.data ?? {}).sort();

  const nurseCount = users.filter((u) => u.role === "user").length;
  const templateCount = templateIds.length;
  const detailUser =
    detailUserId != null ? (users.find((u) => u.id === detailUserId) ?? null) : null;

  const closeUserDetail = useCallback(() => setDetailUserId(null), []);

  if (usersQuery.error || templatesQuery.error) {
    const message =
      (usersQuery.error instanceof Error && usersQuery.error.message) ||
      (templatesQuery.error instanceof Error && templatesQuery.error.message) ||
      "불러오기 실패";
    return <p className="text-sm text-red-600">{message}</p>;
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">관리자 홈</h1>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-gray-500">총 간호사 수</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">{nurseCount}</p>
              <p className="mt-0.5 text-xs text-gray-400">관리자 제외 사용자</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-gray-500">총 템플릿 수</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">{templateCount}</p>
              <p className="mt-0.5 text-xs text-gray-400">등록된 기록지 유형</p>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900">템플릿 목록</h2>
            <ul className="mt-3 divide-y divide-gray-100 text-sm text-gray-800">
              {templateIds.map((id) => (
                <li key={id} className="py-2 first:pt-0 last:pb-0">
                  {id}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900">계정 목록</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-600">
                  <th className="py-2 pr-3 font-medium">번호</th>
                  <th className="py-2 pr-3 font-medium">이름</th>
                  <th className="py-2 pr-3 font-medium">유저타입</th>
                  <th className="py-2 font-medium">상세보기</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-100">
                    <td className="py-2 pr-3 tabular-nums text-gray-900">{u.id}</td>
                    <td className="py-2 pr-3 text-gray-800">{u.name}</td>
                    <td className="py-2 pr-3 text-gray-800">{roleLabel(u.role)}</td>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => setDetailUserId(u.id)}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        상세보기
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {detailUserId != null ? (
        detailUser ? (
          <AdminUserDetailModal
            user={detailUser}
            actor={actor}
            token={token}
            onClose={closeUserDetail}
          />
        ) : usersQuery.isFetched ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
              <p className="text-sm text-gray-800">해당 사용자를 찾을 수 없습니다.</p>
              <button
                type="button"
                onClick={closeUserDetail}
                className="mt-4 w-full rounded-lg bg-gray-900 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                닫기
              </button>
            </div>
          </div>
        ) : null
      ) : null}
    </div>
  );
}
