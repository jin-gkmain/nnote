import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/app/auth/auth-context";
import { useCreateMyVerificationRequestMutation, useMyVerificationQuery } from "@/app/query/use-app-query";
import type { AuthUser, VerificationStatus } from "@/app/data/auth-api";

function statusLabel(status: VerificationStatus): string {
  switch (status) {
    case "unverified":
      return "미인증";
    case "pending":
      return "심사중";
    case "verified":
      return "인증완료";
    case "rejected":
      return "반려";
  }
}

function statusColor(status: VerificationStatus): string {
  switch (status) {
    case "verified":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "pending":
      return "bg-amber-50 text-amber-800 border-amber-200";
    case "rejected":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "unverified":
    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
}

export function NurseVerificationSection({ user, token }: { user: AuthUser; token: string }) {
  const { refreshMe } = useAuth();
  const myQuery = useMyVerificationQuery(token);
  const createMutation = useCreateMyVerificationRequestMutation(token, token);

  const effectiveStatus: VerificationStatus = (myQuery.data?.verificationStatus ??
    user.verificationStatus) as VerificationStatus;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [department, setDepartment] = useState(user.department ?? "");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [message, setMessage] = useState("");

  const canRequest = effectiveStatus === "unverified" || effectiveStatus === "rejected";
  const modalDepartment = useMemo(() => department, [department]);

  useEffect(() => {
    if (!isModalOpen) {
      setDepartment(user.department ?? "");
      setLicenseNumber("");
      setMessage("");
    }
  }, [isModalOpen]);

  async function submitRequest() {
    setMessage("");
    const ln = licenseNumber.trim();
    const dept = department.trim();
    if (!dept) {
      setMessage("소속을 입력해 주세요.");
      return;
    }
    if (!ln) {
      setMessage("면허번호를 입력해 주세요.");
      return;
    }
    try {
      await createMutation.mutateAsync({ department: dept, licenseNumber: ln });
      setMessage("인증 요청을 전송했습니다. 관리자 승인을 기다려 주세요.");
      await refreshMe();
      setIsModalOpen(false);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "인증 요청에 실패했습니다.");
    }
  }

  const last = myQuery.data?.lastRequest ?? null;

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">계정 인증</h2>
          <p className="mt-1 text-xs text-gray-500">
            EMR 전송은 인증 완료 상태에서만 가능합니다. 소속 변경은 관리자만 할 수 있습니다.
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusColor(
            effectiveStatus,
          )}`}
        >
          {statusLabel(effectiveStatus)}
        </span>
      </div>

      <div className="mt-4 grid gap-3 text-sm text-gray-700">
        <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-3">
          <div className="text-xs font-semibold text-gray-600">현재 소속</div>
          <div className="mt-1 font-medium text-gray-900">{modalDepartment || "-"}</div>
        </div>

        {last ? (
          <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-3">
            <div className="text-xs font-semibold text-gray-600">최근 요청</div>
            <div className="mt-1 grid gap-1">
              <div>
                <span className="text-xs text-gray-500">상태</span>{" "}
                <span className="font-medium text-gray-900">{last.status}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500">면허번호</span>{" "}
                <span className="font-medium text-gray-900">{last.licenseNumber}</span>
              </div>
              {last.rejectedReason ? (
                <div>
                  <span className="text-xs text-gray-500">반려 사유</span>{" "}
                  <span className="font-medium text-gray-900">{last.rejectedReason}</span>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!canRequest || createMutation.isPending}
          onClick={() => setIsModalOpen(true)}
          className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {effectiveStatus === "pending" ? "심사중" : "인증 요청하기"}
        </button>
        {message ? <p className="text-sm text-gray-700">{message}</p> : null}
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-gray-900">인증 요청</h3>
                <p className="mt-1 text-xs text-gray-500">
                  소속은 현재 설정된 값으로 자동 포함되며, 변경은 관리자만 가능합니다.
                </p>
              </div>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
                onClick={() => setIsModalOpen(false)}
              >
                닫기
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">소속</label>
                <input
                  value={modalDepartment}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">면허번호</label>
                <input
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
                  placeholder="예: 12345678"
                />
              </div>
              {message ? <p className="text-sm text-rose-600">{message}</p> : null}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="h-10 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                type="button"
                disabled={createMutation.isPending}
                onClick={() => void submitRequest()}
                className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {createMutation.isPending ? "전송 중…" : "요청 전송"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

