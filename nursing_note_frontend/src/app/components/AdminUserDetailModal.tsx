import { useEffect, useState } from "react";
import { type AuthUser, type VerificationStatus } from "@/app/data/auth-api";
import { useDeleteUserMutation } from "@/app/query/use-app-query";

function roleLabel(role: AuthUser["role"]): string {
  return role === "admin" ? "관리자" : "사용자";
}

function verificationLabel(status: VerificationStatus): string {
  switch (status) {
    case "unverified":
      return "미인증";
    case "pending":
      return "심사중";
    case "verified":
      return "인증완료";
    case "rejected":
      return "반려";
    default:
      return status;
  }
}

interface AdminUserDetailModalProps {
  user: AuthUser | null;
  actor: AuthUser | null;
  token: string | null;
  onClose: () => void;
}

export function AdminUserDetailModal({ user, actor, token, onClose }: AdminUserDetailModalProps) {
  const [actionMsg, setActionMsg] = useState("");
  const deleteUserMutation = useDeleteUserMutation(token ?? "");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!user) return null;

  const canDelete = actor && user.id !== actor.id;

  async function removeUser() {
    if (!window.confirm("이 사용자를 삭제할까요?")) return;
    setActionMsg("");
    try {
      await deleteUserMutation.mutateAsync(user.id);
      onClose();
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : "삭제 실패");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-user-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="admin-user-detail-title" className="text-lg font-semibold text-gray-900">
            계정 상세
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
          >
            닫기
          </button>
        </div>

        <dl className="mt-4 rounded-xl border border-gray-100 bg-gray-50/50 p-4 text-sm">
          <div className="grid gap-1 border-b border-gray-100 py-3 first:pt-0">
            <dt className="text-xs font-medium text-gray-500">번호</dt>
            <dd className="font-mono text-gray-900">{user.id}</dd>
          </div>
          <div className="grid gap-1 border-b border-gray-100 py-3">
            <dt className="text-xs font-medium text-gray-500">로그인 ID</dt>
            <dd className="font-mono text-gray-900">{user.loginId}</dd>
          </div>
          <div className="grid gap-1 border-b border-gray-100 py-3">
            <dt className="text-xs font-medium text-gray-500">이름</dt>
            <dd className="text-gray-900">{user.name}</dd>
          </div>
          <div className="grid gap-1 border-b border-gray-100 py-3">
            <dt className="text-xs font-medium text-gray-500">소속</dt>
            <dd className="text-gray-900">{user.department || "—"}</dd>
          </div>
          <div className="grid gap-1 border-b border-gray-100 py-3">
            <dt className="text-xs font-medium text-gray-500">유저타입</dt>
            <dd className="text-gray-900">{roleLabel(user.role)}</dd>
          </div>
          <div className="grid gap-1 border-b border-gray-100 py-3">
            <dt className="text-xs font-medium text-gray-500">계정 상태</dt>
            <dd className="text-gray-900">{user.isActive ? "활성" : "비활성"}</dd>
          </div>
          {user.role === "user" ? (
            <div className="grid gap-1 py-3 last:pb-0">
              <dt className="text-xs font-medium text-gray-500">인증 상태</dt>
              <dd className="text-gray-900">{verificationLabel(user.verificationStatus)}</dd>
            </div>
          ) : (
            <div className="grid gap-1 py-3 last:pb-0">
              <dt className="text-xs font-medium text-gray-500">인증 상태</dt>
              <dd className="text-gray-500">관리자 계정에는 적용되지 않습니다.</dd>
            </div>
          )}
        </dl>

        {actionMsg ? <p className="mt-3 text-sm text-red-600">{actionMsg}</p> : null}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          {canDelete ? (
            <button
              type="button"
              disabled={deleteUserMutation.isPending}
              onClick={() => void removeUser()}
              className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              사용자 삭제
            </button>
          ) : (
            <p className="w-full text-xs text-gray-500 sm:w-auto">본인 계정은 여기서 삭제할 수 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
}
