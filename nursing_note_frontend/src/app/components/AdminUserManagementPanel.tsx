import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  CircleUserRound,
  Plus,
  Search,
  ShieldCheck,
  UserRoundCheck,
  Users,
} from "lucide-react";
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
  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState<"all" | "active" | "inactive">("all");
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
  const users = usersQuery.data ?? [];
  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("ko");
    return users.filter((user) => {
      if (accountFilter === "active" && !user.isActive) return false;
      if (accountFilter === "inactive" && user.isActive) return false;
      if (!keyword) return true;
      return [user.name, user.loginId, user.department]
        .join(" ")
        .toLocaleLowerCase("ko")
        .includes(keyword);
    });
  }, [accountFilter, search, users]);
  const activeCount = users.filter((user) => user.isActive).length;
  const verifiedCount = users.filter((user) => user.verificationStatus === "verified").length;

  const verificationLabel: Record<AuthUser["verificationStatus"], string> = {
    unverified: "미인증",
    pending: "심사 중",
    verified: "인증 완료",
    rejected: "반려",
  };

  return (
    <section className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">사용자 관리</h2>
          <p className="mt-1 text-sm text-gray-500">계정 상태와 간호사 인증을 관리합니다.</p>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="inline-flex h-11 items-center gap-2 rounded-[5px] bg-[#3b82f6] px-4 text-sm font-semibold text-white hover:bg-blue-600"
        >
          <Plus className="h-4 w-4" />
          사용자 추가
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {[
          { label: "전체 팀원", value: users.length, icon: Users, color: "text-[#155dfc]" },
          { label: "활성 계정", value: activeCount, icon: UserRoundCheck, color: "text-emerald-600" },
          { label: "인증 완료", value: verifiedCount, icon: BadgeCheck, color: "text-violet-600" },
          { label: "인증 대기", value: pendingItems.length, icon: ShieldCheck, color: "text-amber-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-[8px] border border-[#e5e7eb] bg-white p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-gray-500">{label}</span>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-[#1f2024]">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-[8px] border border-[#e5e7eb] bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">간호사 인증 요청</h3>
            <p className="mt-1 text-xs text-gray-500">면허번호와 요청 당시 소속을 확인해주세요.</p>
          </div>
          <span className="rounded-sm bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
            {verificationPendingQuery.isFetching ? "불러오는 중..." : `대기 ${pendingItems.length}건`}
          </span>
        </div>
        {verificationPendingQuery.error ? (
          <p className="mt-2 text-sm text-red-600">
            {verificationPendingQuery.error instanceof Error
              ? verificationPendingQuery.error.message
              : "요청 목록 오류"}
          </p>
        ) : pendingItems.length ? (
          <>
            <div className="mt-4 space-y-3 md:hidden">
              {pendingItems.map((request) => (
                <article key={request.id} className="rounded-[8px] border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900">{request.userName}</p>
                      <p className="mt-1 truncate text-xs text-gray-500">{request.userLoginId}</p>
                    </div>
                    <span className="shrink-0 text-xs text-gray-400">#{request.id}</span>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 text-sm">
                    <div>
                      <dt className="text-xs text-gray-400">소속</dt>
                      <dd className="mt-1 font-medium text-gray-700">{request.departmentSnapshot || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-400">면허번호</dt>
                      <dd className="mt-1 break-all font-medium text-gray-700">{request.licenseNumber}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-xs text-gray-400">요청일</dt>
                      <dd className="mt-1 text-gray-600">{new Date(request.createdAt).toLocaleString("ko-KR")}</dd>
                    </div>
                  </dl>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button type="button" disabled={approveMutation.isPending || rejectMutation.isPending} onClick={() => openReject(request.id)} className="h-10 rounded-[5px] border border-gray-300 bg-white text-sm font-semibold text-gray-600 disabled:opacity-50">반려</button>
                    <button type="button" disabled={approveMutation.isPending || rejectMutation.isPending} onClick={() => void approveRequest(request.id)} className="h-10 rounded-[5px] bg-emerald-600 text-sm font-semibold text-white disabled:bg-gray-300">승인</button>
                  </div>
                </article>
              ))}
            </div>
            <div className="mt-4 hidden overflow-x-auto md:block">
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
          </>
        ) : (
          <div className="mt-4 flex min-h-20 items-center justify-center rounded-[5px] bg-gray-50 text-sm text-gray-500">
            대기 중인 요청이 없습니다.
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">팀원 검색</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="이름, 로그인 ID, 소속 검색"
            className="h-11 w-full rounded-[5px] border border-[#e5e7eb] bg-white pl-10 pr-3 text-sm outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <div className="grid grid-cols-3 rounded-[5px] border border-[#e5e7eb] bg-white p-1 sm:w-64" aria-label="계정 상태 필터">
          {([
            ["all", "전체"],
            ["active", "활성"],
            ["inactive", "비활성"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setAccountFilter(value)}
              className={`h-9 rounded-[4px] text-xs font-semibold ${
                accountFilter === value ? "bg-blue-50 text-[#155dfc]" : "text-gray-500"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {usersQuery.error ? (
        <p className="mt-2 text-sm text-red-600">
          {usersQuery.error instanceof Error ? usersQuery.error.message : "목록 오류"}
        </p>
      ) : (
        <>
        <div className="mt-4 space-y-3 md:hidden">
          {filteredUsers.map((user) => (
            <article key={user.id} className="rounded-[8px] border border-[#e5e7eb] bg-white p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#155dfc]">
                  <CircleUserRound className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-gray-900">{user.name}</p>
                    {user.id === actorUser.id ? <span className="text-[10px] font-semibold text-[#155dfc]">내 계정</span> : null}
                  </div>
                  <p className="mt-1 break-all text-xs text-gray-500">{user.loginId}</p>
                </div>
                <span className={`shrink-0 rounded-sm px-2 py-1 text-[10px] font-semibold ${user.isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                  {user.isActive ? "활성" : "비활성"}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="rounded-sm bg-gray-100 px-2 py-1 text-gray-600">{user.role === "admin" ? "관리자" : "일반 사용자"}</span>
                <span className={`rounded-sm px-2 py-1 ${user.verificationStatus === "verified" ? "bg-blue-50 text-[#155dfc]" : "bg-gray-100 text-gray-500"}`}>
                  {verificationLabel[user.verificationStatus]}
                </span>
              </div>
              <div className="mt-4">
                <label className="text-xs font-medium text-gray-500">소속</label>
                <div className="mt-1.5 flex gap-2">
                  <input value={deptDraftByUserId[user.id] ?? ""} onChange={(event) => setDeptDraftByUserId((previous) => ({ ...previous, [user.id]: event.target.value }))} placeholder="소속 입력" className="h-10 min-w-0 flex-1 rounded-[5px] border border-gray-300 px-3 text-sm" />
                  <button type="button" disabled={patchUserMutation.isPending} onClick={() => void saveDepartment(user.id)} className="h-10 shrink-0 rounded-[5px] border border-[#3b82f6] px-3 text-xs font-semibold text-[#155dfc] disabled:opacity-50">저장</button>
                </div>
              </div>
              {user.id !== actorUser.id ? (
                <div className="mt-4 flex items-center justify-end gap-3 border-t border-gray-100 pt-3">
                  <button type="button" disabled={deleteUserMutation.isPending} onClick={() => void removeUser(user.id)} className="text-xs font-semibold text-red-500 disabled:text-gray-300">삭제</button>
                  <button type="button" disabled={patchUserMutation.isPending} onClick={() => void setUserActive(user.id, !user.isActive)} className={`h-9 rounded-[5px] px-3 text-xs font-semibold ${user.isActive ? "border border-gray-300 bg-white text-gray-600" : "bg-emerald-600 text-white"}`}>
                    {user.isActive ? "비활성화" : "활성화"}
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
        <div className="mt-4 hidden overflow-x-auto rounded-[8px] border border-[#e5e7eb] bg-white md:block">
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
              {filteredUsers.map((u) => (
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
                  <td className="py-2 pr-4 text-gray-800">
                    {u.role === "admin" ? "관리자" : "일반 사용자"}
                  </td>
                  <td className="py-2 pr-4 text-gray-800">
                    {verificationLabel[u.verificationStatus]}
                  </td>
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
        {filteredUsers.length === 0 ? (
          <div className="mt-4 flex min-h-28 items-center justify-center rounded-[8px] border border-[#e5e7eb] bg-white text-sm text-gray-500">
            조건에 맞는 팀원이 없습니다.
          </div>
        ) : null}
        </>
      )}
      {adminMsg ? <p className="mt-3 text-sm text-gray-700">{adminMsg}</p> : null}

      {rejectOpen ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 shadow-xl sm:rounded-xl sm:p-5">
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
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 shadow-xl sm:rounded-xl sm:p-5">
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
