import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { RecordDetailOverlay } from "@/app/components/record-detail-overlay";
import {
  type RecordListItem,
  type RecordListSort,
} from "@/app/data/nursingRecords";
import { classificationLabelForTemplate } from "@/app/data/recordTitle";
import { ROUTES } from "@/app/navigation/routes";
import { queryKeys } from "@/app/query/query-keys";
import { useRecordListPageQuery, useTemplatesMapQuery } from "@/app/query/use-app-query";

const PAGE_SIZE = 20;
const PAGE_BLOCK_SIZE = 10;

const SORT_OPTIONS: { value: RecordListSort; label: string }[] = [
  { value: "record_date_desc", label: "기록일시 최신순" },
  { value: "record_date_asc", label: "기록일시 오래된순" },
  { value: "created_desc", label: "최근 생성순" },
  { value: "updated_desc", label: "최근 수정순" },
  { value: "document_number_asc", label: "기록번호 오름차순" },
];

function formatStatus(emrSyncStatus: "pending" | "sent"): string {
  return emrSyncStatus === "sent" ? "전송완료" : "대기";
}

function formatCreationSource(source: RecordListItem["creationSource"]): string {
  if (source === "voice") return "음성";
  if (source === "record_based") return "기록기반";
  if (source === "ai") return "AI";
  if (source === "ocr") return "OCR";
  return "직접";
}

export default function NursingRecordListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<RecordListSort>("record_date_desc");
  const [searchInput, setSearchInput] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [detailRecordId, setDetailRecordId] = useState<number | null>(null);
  const recordListQuery = useRecordListPageQuery({
    page,
    pageSize: PAGE_SIZE,
    sort,
    search: searchKeyword,
  });
  const templatesMapQuery = useTemplatesMapQuery();
  const rows: RecordListItem[] = recordListQuery.data?.items ?? [];
  const total = recordListQuery.data?.total ?? 0;
  const isLoading = recordListQuery.isLoading || recordListQuery.isFetching;

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);
  const canPrev = page > 1;
  const canNext = page < totalPages;
  const { pageButtons, blockStart, blockEnd } = useMemo(() => {
    const blockStartIdx = Math.floor((page - 1) / PAGE_BLOCK_SIZE) * PAGE_BLOCK_SIZE + 1;
    const blockEndIdx = Math.min(totalPages, blockStartIdx + PAGE_BLOCK_SIZE - 1);
    const buttons = Array.from(
      { length: blockEndIdx - blockStartIdx + 1 },
      (_, i) => blockStartIdx + i,
    );
    return { pageButtons: buttons, blockStart: blockStartIdx, blockEnd: blockEndIdx };
  }, [page, totalPages]);
  const canJumpPrevBlock = blockStart > 1;
  const canJumpNextBlock = blockEnd < totalPages;
  const jumpToPrevBlock = () => setPage(Math.max(1, blockStart - PAGE_BLOCK_SIZE));
  const jumpToNextBlock = () => setPage(Math.min(totalPages, blockStart + PAGE_BLOCK_SIZE));

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-7.5rem)] w-full max-w-[720px] flex-col lg:max-w-none">
      <RecordDetailOverlay
        recordId={detailRecordId}
        onClose={() => setDetailRecordId(null)}
        onRecordChanged={() => {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.records.list({ page, pageSize: PAGE_SIZE, sort, search: searchKeyword }),
          });
        }}
      />
      <div className="mb-5 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-[28px] font-bold leading-tight text-[#111827] sm:text-3xl">
            기록목록
          </h1>
          <button
            type="button"
            onClick={() => navigate(ROUTES.aiSummary)}
            className="h-10 shrink-0 rounded-lg bg-[#3B82F6] px-4 text-sm font-bold text-white shadow-sm hover:bg-[#2563EB]"
          >
            기록기반 생성
          </button>
        </div>
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              setSearchKeyword(searchInput.trim());
              setPage(1);
            }}
            placeholder="기록번호 / 제목 / 분류 검색"
            className="h-11 min-w-0 flex-1 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#111827] shadow-sm sm:w-64 sm:flex-none"
          />
          <button
            type="button"
            onClick={() => {
              setSearchKeyword(searchInput.trim());
              setPage(1);
            }}
            className="h-11 rounded-lg border border-[#E5E7EB] bg-white px-4 text-sm font-semibold text-[#374151] shadow-sm hover:bg-[#EFF6FF]"
          >
            검색
          </button>
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as RecordListSort);
              setPage(1);
            }}
            className="h-11 w-full rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#111827] shadow-sm sm:w-auto"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:hidden">
        {isLoading ? (
          <div className="mobile-app-card px-5 py-10 text-center text-sm text-[#9CA3AF]">
            기록 목록을 불러오는 중...
          </div>
        ) : rows.length === 0 ? (
          <div className="mobile-app-card px-5 py-10 text-center text-sm text-[#9CA3AF]">
            표시할 기록이 없습니다.
          </div>
        ) : (
          rows.map((row) => (
            <button
              key={`${row.id}-${row.clientRecordId}-mobile`}
              type="button"
              onClick={() => setDetailRecordId(row.id)}
              className="mobile-app-card w-full px-5 py-4 text-left transition-transform active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className={
                    row.emrSyncStatus === "sent"
                      ? "rounded-md bg-[#10B981] px-2.5 py-1 text-xs font-semibold text-white"
                      : "rounded-md border border-[#10B981] bg-[#ECFDF5] px-2.5 py-1 text-xs font-semibold text-[#059669]"
                  }
                >
                  {formatStatus(row.emrSyncStatus)}
                </span>
                <span className="shrink-0 text-xs text-[#9CA3AF]">
                  {row.recordDateTime}
                </span>
              </div>
              <p className="mt-3 truncate text-base font-medium text-[#111827]">
                {row.documentNumber}-{row.title}
              </p>
              <div className="mt-5 flex items-center justify-between gap-3 text-xs text-[#9CA3AF]">
                <span className="truncate">
                  {formatCreationSource(row.creationSource)} /{" "}
                  {classificationLabelForTemplate(
                    row.recordType,
                    templatesMapQuery.data,
                  )}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-[#111827]" />
              </div>
            </button>
          ))
        )}
      </div>

      <div className="dashboard-table-scroll-x hidden min-h-0 flex-1 overflow-auto overscroll-contain rounded-xl border border-gray-200 bg-white [-webkit-overflow-scrolling:touch] lg:block">
        <table className="min-w-[900px] w-full table-fixed border-collapse">
          <colgroup>
            <col className="w-[13%]" />
            <col className="w-[16%]" />
            <col className="w-[31%]" />
            <col className="w-[14%]" />
            <col className="w-[9%]" />
            <col className="w-[9%]" />
            <col className="w-[8%]" />
          </colgroup>
          <thead className="sticky top-0 z-[1] bg-[#e8f0ff]">
            <tr className="text-left text-sm text-blue-700 sm:text-base">
              <th className="px-4 py-3 align-middle font-semibold whitespace-nowrap">기록번호</th>
              <th className="px-4 py-3 align-middle font-semibold whitespace-nowrap">기록일시</th>
              <th className="px-4 py-3 align-middle font-semibold">제목</th>
              <th className="px-4 py-3 align-middle font-semibold">분류</th>
              <th className="px-4 py-3 align-middle font-semibold whitespace-nowrap">상태</th>
              <th className="px-4 py-3 align-middle font-semibold whitespace-nowrap">작성방법</th>
              <th className="px-4 py-3 align-middle text-center font-semibold whitespace-nowrap">
                상세보기
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="px-4 py-8 text-sm text-gray-500" colSpan={7}>
                  기록 목록을 불러오는 중...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-sm text-gray-500" colSpan={7}>
                  표시할 기록이 없습니다.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={`${row.id}-${row.clientRecordId}`} className="border-t border-gray-100">
                  <td className="px-4 py-3 align-middle text-sm text-gray-900 whitespace-nowrap">
                    {row.documentNumber}
                  </td>
                  <td className="px-4 py-3 align-middle text-sm text-gray-700 whitespace-nowrap">
                    {row.recordDateTime}
                  </td>
                  <td className="px-4 py-3 align-middle text-sm text-gray-900">
                    <span className="block truncate" title={row.title}>
                      {row.title}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-middle text-sm text-gray-700">
                    <span
                      className="block truncate"
                      title={classificationLabelForTemplate(
                        row.recordType,
                        templatesMapQuery.data,
                      )}
                    >
                      {classificationLabelForTemplate(
                        row.recordType,
                        templatesMapQuery.data,
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-middle text-sm text-gray-700 whitespace-nowrap">
                    {formatStatus(row.emrSyncStatus)}
                  </td>
                  <td className="px-4 py-3 align-middle text-sm text-gray-700 whitespace-nowrap">
                    {formatCreationSource(row.creationSource)}
                  </td>
                  <td className="px-4 py-3 align-middle text-center">
                    <button
                      type="button"
                      onClick={() => setDetailRecordId(row.id)}
                      className="rounded-md border border-blue-200 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50"
                    >
                      상세보기
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-col items-stretch gap-3 lg:flex-row lg:items-center">
        <p className="text-sm text-gray-600 lg:w-48 lg:shrink-0">
          총 {total}건 · {page}/{totalPages} 페이지
        </p>
        <div className="flex flex-1 flex-wrap items-center justify-center gap-1">
          <button
            type="button"
            disabled={!canJumpPrevBlock}
            onClick={jumpToPrevBlock}
            aria-label="이전 10페이지 구간"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronsLeft className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            disabled={!canPrev}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            aria-label="이전 페이지"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          {pageButtons.map((pageNo) => (
            <button
              key={pageNo}
              type="button"
              onClick={() => setPage(pageNo)}
              className={`min-w-[2.25rem] rounded-lg px-2.5 py-1.5 text-sm font-medium ${
                pageNo === page
                  ? "bg-blue-600 text-white"
                  : "border border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {pageNo}
            </button>
          ))}
          <button
            type="button"
            disabled={!canNext}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            aria-label="다음 페이지"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            disabled={!canJumpNextBlock}
            onClick={jumpToNextBlock}
            aria-label="다음 10페이지 구간"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronsRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="hidden lg:block lg:w-48 lg:shrink-0" aria-hidden />
      </div>
    </div>
  );
}
