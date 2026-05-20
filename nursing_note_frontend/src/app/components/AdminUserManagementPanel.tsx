import { useEffect, useMemo, useState } from "react";
import { type AuthUser } from "@/app/data/auth-api";
import {
  useAdminApproveVerificationRequestMutation,
  useAdminPatchUserMutation,
  useAdminRejectVerificationRequestMutation,
  useAdminVerificationRequestsQuery,
  useCreateUserMutation,
  useDeleteUserMutation,
  useUsersQuery,
} from "@/app/query/use-app-query";

interface AdminUserManagementPanelProps {
  token: string;
  actorUser: AuthUser;
}

export function AdminUserManagementPanel({ token, actorUser }: AdminUserManagementPanelProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [newLoginId, setNewLoginId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [adminMsg, setAdminMsg] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectRequestId, setRejectRequestId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const usersQuery = useUsersQuery(token);
  const createUserMutation = useCreateUserMutation(token);
  const deleteUserMutation = useDeleteUserMutation(token);
  const patchUserMutation = useAdminPatchUserMutation(token, token);
  const verificationPendingQuery = useAdminVerificationRequestsQuery(token, "pending");
  const approveMutation = useAdminApproveVerificationRequestMutation(token, token);
  const rejectMutation = useAdminRejectVerificationRequestMutation(token, token);

  const [deptDraftByUserId, setDeptDraftByUserId] = useState<Record<number, string>>({});

  useEffect(() => {
    const next: Record<number, string> = {};
    for (const u of usersQuery.data ?? []) {
      next[u.id] = u.department ?? "";
    }
    setDeptDraftByUserId(next);
  }, [usersQuery.data]);

  async function addUser() {
    setAdminMsg("");
    try {
      await createUserMutation.mutateAsync({
        loginId: newLoginId.trim(),
        password: newPassword,
        name: newName.trim(),
      });
      setAddOpen(false);
      setNewLoginId("");
      setNewPassword("");
      setNewName("");
      setAdminMsg("사용자가 추가되었습니다.");
    } catch (e) {
      setAdminMsg(e instanceof Error ? e.message : "추가 실패");
    }
  }

  async function removeUser(id: number) {
    if (!window.confirm("이 사용자를 삭제할까요?")) return;
    setAdminMsg("");
    try {
      await deleteUserMutation.mutateAsync(id);
      setAdminMsg("삭제되었습니다.");
    } catch (e) {
      setAdminMsg(e instanceof Error ? e.message : "삭제 실패");
    }
  }

  async function saveDepartment(userId: number) {
    setAdminMsg("");
    try {
      await patchUserMutation.mutateAsync({
        userId,
        body: { department: (deptDraftByUserId[userId] ?? "").trim() },
      });
      setAdminMsg("소속이 저장되었습니다.");
    } catch (e) {
      setAdminMsg(e instanceof Error ? e.message : "저장 실패");
    }
  }

  async function setUserActive(userId: number, isActive: boolean) {
    if (!isActive) {
      if (!window.confirm("비활성화하면 해당 계정은 로그인할 수 없고, 기존 세션도 곧 사용할 수 없습니다. 진행할까요?")) {
        return;
      }
    }
    setAdminMsg("");
    try {
      await patchUserMutation.mutateAsync({ userId, body: { isActive } });
      setAdminMsg(isActive ? "계정이 활성화되었습니다." : "계정이 비활성화되었습니다.");
    } catch (e) {
      setAdminMsg(e instanceof Error ? e.message : "계정 상태 변경 실패");
    }
  }

  async function approveRequest(requestId: number) {
    if (!window.confirm("이 인증 요청을 승인할까요?")) return;
    setAdminMsg("");
    try {
      await approveMutation.mutateAsync(requestId);
      setAdminMsg("승인 처리되었습니다.");
    } catch (e) {
      setAdminMsg(e instanceof Error ? e.message : "승인 실패");
    }
  }

  function openReject(requestId: number) {
    setRejectReason("");
    setRejectRequestId(requestId);
    setRejectOpen(true);
  }

  async function submitReject() {
    if (!rejectRequestId) return;
    setAdminMsg("");
    try {
      await rejectMutation.mutateAsync({ requestId: rejectRequestId, reason: rejectReason.trim() });
      setAdminMsg("반려 처리되었습니다.");
      setRejectOpen(false);
      setRejectRequestId(null);
      setRejectReason("");
    } catch (e) {
      setAdminMsg(e instanceof Error ? e.message : "반려 실패");
    }
  }

  const pendingItems = useMemo(() => verificationPendingQuery.data ?? [], [verificationPendingQuery.data]);

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-gray-900">사용자 관리</h2>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          사용자 추가
        </button>
      </div>
      <p className="mt-1 text-xs text-gray-500">추가되는 계정은 일반 사용자(role: user)입니다.</p>

      <div className="mt-6 rounded-xl border border-gray-100 bg-gray-50/50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-900">간호사 인증 요청(대기)</h3>
          <span className="text-xs text-gray-500">
            {verificationPendingQuery.isFetching ? "불러오는 중…" : `총 ${pendingItems.length}건`}
          </span>
        </div>
        {verificationPendingQuery.error ? (
          <p className="mt-2 text-sm text-red-600">
            {verificationPendingQuery.error instanceof Error
              ? verificationPendingQuery.error.message
              : "요청 목록 오류"}
          </p>
        ) : pendingItems.length ? (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-600">
                  <th className="py-2 pr-4 font-medium">요청 ID</th>
                  <th className="py-2 pr-4 font-medium">사용자</th>
                  <th className="py-2 pr-4 font-medium">소속(스냅샷)</th>
                  <th className="py-2 pr-4 font-medium">면허번호</th>
                  <th className="py-2 pr-4 font-medium">요청일</th>
                  <th className="py-2 font-medium">처리</th>
                </tr>
              </thead>
              <tbody>
                {pendingItems.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100">
                    <td className="py-2 pr-4 font-mono text-gray-900">{r.id}</td>
                    <td className="py-2 pr-4 text-gray-800">
                      {r.userName}{" "}
                      <span className="font-mono text-xs text-gray-500">({r.userLoginId})</span>
                    </td>
                    <td className="py-2 pr-4 text-gray-700">{r.departmentSnapshot || "—"}</td>
                    <td className="py-2 pr-4 font-mono text-gray-900">{r.licenseNumber}</td>
                    <td className="py-2 pr-4 text-gray-700">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={approveMutation.isPending || rejectMutation.isPending}
                          onClick={() => void approveRequest(r.id)}
                          className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:bg-gray-300"
                        >
                          승인
                        </button>
                        <button
                          type="button"
                          disabled={approveMutation.isPending || rejectMutation.isPending}
                          onClick={() => openReject(r.id)}
                          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-100"
                        >
                          반려
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-2 text-sm text-gray-600">대기 중인 요청이 없습니다.</p>
        )}
      </div>

      {usersQuery.error ? (
        <p className="mt-2 text-sm text-red-600">
          {usersQuery.error instanceof Error ? usersQuery.error.message : "목록 오류"}
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-600">
                <th className="py-2 pr-4 font-medium">로그인 ID</th>
                <th className="py-2 pr-4 font-medium">이름</th>
                <th className="py-2 pr-4 font-medium">소속</th>
                <th className="py-2 pr-4 font-medium">역할</th>
                <th className="py-2 pr-4 font-medium">인증</th>
                <th className="py-2 pr-4 font-medium">계정</th>
                <th className="py-2 font-medium">삭제</th>
              </tr>
            </thead>
            <tbody>
              {(usersQuery.data ?? []).map((u) => (
                <tr key={u.id} className="border-b border-gray-100">
                  <td className="py-2 pr-4 font-mono text-gray-900">{u.loginId}</td>
                  <td className="py-2 pr-4 text-gray-800">{u.name}</td>
                  <td className="py-2 pr-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        value={deptDraftByUserId[u.id] ?? ""}
                        onChange={(e) =>
                          setDeptDraftByUserId((prev) => ({ ...prev, [u.id]: e.target.value }))
                        }
                        className="h-9 w-56 rounded-md border border-gray-300 px-2 text-sm"
                      />
                      <button
                        type="button"
                        disabled={patchUserMutation.isPending}
                        onClick={() => void saveDepartment(u.id)}
                        className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300"
                      >
                        저장
                      </button>
                    </div>
                  </td>
                  <td className="py-2 pr-4 text-gray-800">{u.role}</td>
                  <td className="py-2 pr-4 text-gray-800">{u.verificationStatus}</td>
                  <td className="py-2 pr-4">
                    <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center">
                      <span
                        className={`text-xs font-semibold ${
                          u.isActive ? "text-emerald-700" : "text-gray-500"
                        }`}
                      >
                        {u.isActive ? "활성" : "비활성"}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {u.isActive && u.id !== actorUser.id ? (
                          <button
                            type="button"
                            disabled={patchUserMutation.isPending}
                            onClick={() => void setUserActive(u.id, false)}
                            className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            비활성화
                          </button>
                        ) : null}
                        {!u.isActive ? (
                          <button
                            type="button"
                            disabled={patchUserMutation.isPending}
                            onClick={() => void setUserActive(u.id, true)}
                            className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:bg-emerald-300"
                          >
                            활성화
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="py-2">
                    <button
                      type="button"
                      disabled={u.id === actorUser.id || deleteUserMutation.isPending}
                      onClick={() => void removeUser(u.id)}
                      className="text-sm text-red-600 hover:underline disabled:cursor-not-allowed disabled:text-gray-300"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {adminMsg ? <p className="mt-3 text-sm text-gray-700">{adminMsg}</p> : null}

      {rejectOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-xl">
            <h3 className="text-lg font-semibold text-gray-900">인증 요청 반려</h3>
            <p className="mt-1 text-xs text-gray-500">반려 사유는 선택입니다.</p>
            <div className="mt-4">
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="min-h-28 w-full rounded-lg border border-gray-300 p-3 text-sm"
                placeholder="예: 면허번호 확인 불가"
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectOpen(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700"
              >
                닫기
              </button>
              <button
                type="button"
                disabled={rejectMutation.isPending}
                onClick={() => void submitReject()}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-rose-300"
              >
                {rejectMutation.isPending ? "처리 중..." : "반려"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {addOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-xl">
            <h3 className="text-lg font-semibold text-gray-900">사용자 추가</h3>
            <div className="mt-4 space-y-3">
              <input
                placeholder="로그인 ID"
                value={newLoginId}
                onChange={(e) => setNewLoginId(e.target.value)}
                className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
              />
              <input
                placeholder="임시 비밀번호 (4자 이상)"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
              />
              <input
                placeholder="이름"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700"
              >
                닫기
              </button>
              <button
                type="button"
                disabled={newLoginId.trim().length < 2 || newPassword.length < 4 || !newName.trim()}
                onClick={() => void addUser()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-blue-300"
              >
                {createUserMutation.isPending ? "추가 중..." : "추가"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
