import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/app/auth/auth-context";
import {
  listInquiries,
  updateInquiryStatus,
  type Inquiry,
  type InquiryStatus,
} from "@/app/data/inquiries-api";
import { queryKeys } from "@/app/query/query-keys";

const STATUS_LABEL: Record<InquiryStatus, string> = {
  pending: "미처리",
  in_progress: "처리 중",
  completed: "처리완료",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export default function AdminInquiriesPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [sort, setSort] = useState<"latest" | "oldest">("latest");
  const [selected, setSelected] = useState<Inquiry | null>(null);
  const [draftStatus, setDraftStatus] = useState<InquiryStatus>("pending");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const inquiriesQuery = useQuery({
    queryKey: queryKeys.inquiries.list(token, sort),
    queryFn: () => listInquiries(token!, sort),
    enabled: Boolean(token),
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: InquiryStatus }) =>
      updateInquiryStatus(token!, id, status),
    onSuccess: async (updated) => {
      setSelected(updated);
      await queryClient.invalidateQueries({ queryKey: ["inquiries"] });
    },
  });

  const inquiries = inquiriesQuery.data ?? [];
  const totalPages = Math.max(1, Math.ceil(inquiries.length / pageSize));
  const visible = useMemo(
    () => inquiries.slice((page - 1) * pageSize, page * pageSize),
    [inquiries, page],
  );

  function openDetail(inquiry: Inquiry) {
    setSelected(inquiry);
    setDraftStatus(inquiry.status);
  }

  if (selected) {
    return (
      <div className="mx-auto w-full max-w-3xl pb-[calc(9rem+env(safe-area-inset-bottom))] lg:pb-8">
        <header className="grid grid-cols-[44px_1fr_44px] items-center">
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="flex h-11 w-11 items-center justify-center rounded-md hover:bg-gray-100"
            aria-label="문의 목록으로 돌아가기"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-center text-2xl font-bold text-[#1f2024]">문의 상세</h1>
        </header>

        <div className="mt-6 flex flex-wrap items-center gap-2 sm:mt-8">
          <span className="rounded-sm bg-[#3b82f6] px-2 py-1 text-xs font-semibold text-white">
            {selected.isMember ? "회원" : "비회원"}
          </span>
          <span className="rounded-sm border border-[#3b82f6] px-2 py-1 text-xs font-semibold text-[#155dfc]">
            {STATUS_LABEL[selected.status]}
          </span>
          <span className="basis-full text-xs text-gray-400 min-[360px]:ml-auto min-[360px]:basis-auto">
            {formatDate(selected.createdAt)} · #{selected.id}
          </span>
        </div>

        <section className="mt-5 space-y-5 rounded-[8px] border border-[#e5e7eb] bg-white p-[clamp(1rem,5vw,1.25rem)]">
          {selected.memberLoginId ? (
            <div>
              <p className="text-xs text-gray-400">회원 ID</p>
              <p className="mt-1 break-all text-sm font-medium">{selected.memberLoginId}</p>
            </div>
          ) : null}
          <div>
            <p className="text-xs text-gray-400">답변 이메일</p>
            <p className="mt-1 break-all text-sm font-medium">{selected.replyEmail}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">문의 제목</p>
            <p className="mt-1 text-base font-semibold">{selected.title}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">문의 내용</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">
              {selected.content}
            </p>
          </div>
        </section>

        <fieldset className="mt-7">
          <legend className="text-sm font-semibold">처리 상태</legend>
          <div className="mt-3 grid grid-cols-1 gap-2 min-[340px]:grid-cols-3">
            {(Object.keys(STATUS_LABEL) as InquiryStatus[]).map((status) => (
              <label
                key={status}
                className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[5px] border text-sm ${
                  draftStatus === status
                    ? "border-[#3b82f6] bg-blue-50 font-semibold text-[#155dfc]"
                    : "border-[#e5e7eb] bg-white text-gray-600"
                }`}
              >
                <input
                  type="radio"
                  name="inquiry-status"
                  value={status}
                  checked={draftStatus === status}
                  onChange={() => setDraftStatus(status)}
                  className="sr-only"
                />
                {STATUS_LABEL[status]}
              </label>
            ))}
          </div>
        </fieldset>

        {statusMutation.error ? (
          <p className="mt-4 text-sm text-red-600">
            {statusMutation.error instanceof Error
              ? statusMutation.error.message
              : "상태 저장에 실패했습니다."}
          </p>
        ) : null}

        <div className="fixed inset-x-0 bottom-[calc(clamp(60px,9vh,68px)+env(safe-area-inset-bottom))] z-20 border-t border-gray-100 bg-white/95 px-[clamp(1rem,5vw,1.5rem)] py-3 backdrop-blur lg:static lg:mt-8 lg:border-0 lg:bg-transparent lg:p-0">
          <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="h-12 rounded-[5px] border border-[#e5e7eb] bg-white font-semibold text-gray-600"
            >
              취소
            </button>
            <button
              type="button"
              disabled={statusMutation.isPending || draftStatus === selected.status}
              onClick={() =>
                statusMutation.mutate({ id: selected.id, status: draftStatus })
              }
              className="h-12 rounded-[5px] bg-[#3b82f6] font-semibold text-white disabled:bg-gray-300"
            >
              {statusMutation.isPending ? "저장 중..." : "확인"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl pb-20 lg:pb-0">
      <div className="flex items-end justify-between">
        <h1 className="text-2xl font-bold text-[#1f2024]">문의사항</h1>
        <select
          value={sort}
          onChange={(event) => {
            setSort(event.target.value as "latest" | "oldest");
            setPage(1);
          }}
          className="h-9 rounded-[5px] border border-[#e5e7eb] bg-white px-3 text-sm"
          aria-label="문의 정렬"
        >
          <option value="latest">최신순</option>
          <option value="oldest">오래된순</option>
        </select>
      </div>

      <div className="mt-6 overflow-hidden rounded-[8px] border border-[#e5e7eb] bg-white">
        <div className="grid grid-cols-[44px_minmax(0,1fr)_72px] border-b border-[#e5e7eb] bg-gray-50 px-3 py-3 text-center text-xs font-semibold text-gray-500 sm:grid-cols-[60px_1fr_1.4fr_72px]">
          <span>번호</span>
          <span className="hidden sm:block">이메일</span>
          <span>문의제목</span>
          <span>상세</span>
        </div>
        {inquiriesQuery.isLoading ? (
          <p className="px-4 py-12 text-center text-sm text-gray-400">
            문의를 불러오는 중입니다.
          </p>
        ) : inquiriesQuery.error ? (
          <p className="px-4 py-12 text-center text-sm text-red-600">
            문의 목록을 불러오지 못했습니다.
          </p>
        ) : visible.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-gray-400">
            접수된 문의가 없습니다.
          </p>
        ) : (
          visible.map((inquiry) => (
            <div
              key={inquiry.id}
              className="grid min-h-16 grid-cols-[44px_minmax(0,1fr)_72px] items-center border-b border-[#e5e7eb] px-3 text-sm last:border-b-0 sm:grid-cols-[60px_1fr_1.4fr_72px]"
            >
              <span className="text-center text-gray-500">{inquiry.id}</span>
              <span className="hidden truncate px-2 text-gray-500 sm:block">
                {inquiry.replyEmail}
              </span>
              <div className="min-w-0 px-2">
                <p className="truncate font-medium">{inquiry.title}</p>
                <p className="mt-1 text-xs text-gray-400 sm:hidden">
                  {STATUS_LABEL[inquiry.status]}
                </p>
              </div>
              <button
                type="button"
                onClick={() => openDetail(inquiry)}
                className="h-8 rounded-[5px] border border-[#3b82f6] text-xs font-semibold text-[#155dfc] hover:bg-blue-50"
              >
                보기
              </button>
            </div>
          ))
        )}
      </div>

      <div className="mt-6 flex items-center justify-center gap-3">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage((current) => current - 1)}
          className="flex h-9 w-9 items-center justify-center rounded-[5px] border border-[#e5e7eb] bg-white disabled:opacity-30"
          aria-label="이전 페이지"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-[#155dfc]">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => setPage((current) => current + 1)}
          className="flex h-9 w-9 items-center justify-center rounded-[5px] border border-[#e5e7eb] bg-white disabled:opacity-30"
          aria-label="다음 페이지"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
