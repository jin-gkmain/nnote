import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/app/auth/auth-context";
import { RecordDetailOverlay } from "@/app/components/record-detail-overlay";
import { classificationLabelForTemplate } from "@/app/data/recordTitle";
import {
  type DashboardRecordRow,
} from "@/app/data/nursingRecords";
import { ROUTES } from "@/app/navigation/routes";
import type { TemplateUiConfigMap } from "@/app/data/template-field-registry";
import { queryKeys } from "@/app/query/query-keys";
import {
  useRecordStatsQuery,
  useRecentCreatedRecordsQuery,
  useRecentUpdatedRecordsQuery,
  useTemplatesMapQuery,
} from "@/app/query/use-app-query";
import { formatTodayYmd } from "@/app/utils/formatTodayYmd";

function emrStatusLabel(status: DashboardRecordRow["emrSyncStatus"]): string {
  return status === "sent" ? "전송완료" : "미전송";
}

function pickKeywords(records: DashboardRecordRow[], templatesMap?: TemplateUiConfigMap) {
  const stopwords = new Set([
    "기록",
    "기록지",
    "간호",
    "음성",
    "OCR",
    "기반",
    "생성",
  ]);
  const words = records
    .flatMap((row) => [
      row.title,
      classificationLabelForTemplate(row.recordType, templatesMap),
    ])
    .flatMap((value) => value.split(/[\s\-_/·,()[\]]+/))
    .map((word) => word.trim())
    .filter((word) => word.length >= 2 && !stopwords.has(word));
  return [...new Set(words)].slice(0, 8);
}

function RecordCard({
  row,
  templatesMap,
  onOpen,
}: {
  row: DashboardRecordRow;
  templatesMap?: TemplateUiConfigMap;
  onOpen: (row: DashboardRecordRow) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(row)}
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
          {emrStatusLabel(row.emrSyncStatus)}
        </span>
        <span className="shrink-0 text-xs text-[#9CA3AF]">{row.recordDateTime}</span>
      </div>
      <div className="mt-3 flex items-center text-base font-medium text-[#111827]">
        <span className="min-w-0 truncate">
          {row.documentNumber}-{row.title || row.recordType}
        </span>
        <ChevronRight className="ml-1 h-4 w-4 shrink-0 text-[#111827]" />
      </div>
      <p className="mt-5 text-xs text-[#9CA3AF]">
        {classificationLabelForTemplate(row.recordType, templatesMap)}
      </p>
    </button>
  );
}

export default function Dashboard() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [detailRecordId, setDetailRecordId] = useState<number | null>(null);
  const statsQuery = useRecordStatsQuery();
  const recentCreatedQuery = useRecentCreatedRecordsQuery(10);
  const recentUpdatedQuery = useRecentUpdatedRecordsQuery(10);
  const templatesMapQuery = useTemplatesMapQuery();
  const recentCreated = recentCreatedQuery.data ?? [];
  const recentUpdated = recentUpdatedQuery.data ?? [];
  const stats = statsQuery.data ?? {
    totalRecords: 0,
    todayVoiceRecords: 0,
    voiceRecordsDodChange: 0,
    todayRecordBasedRecords: 0,
    recordBasedRecordsDodChange: 0,
    todayOcrRecords: 0,
    ocrRecordsDodChange: 0,
    pendingEmrRecords: 0,
    sentEmrRecords: 0,
  };
  const todayCreatedTotal =
    stats.todayVoiceRecords + stats.todayRecordBasedRecords + stats.todayOcrRecords;
  const keywords = useMemo(
    () => pickKeywords([...recentCreated, ...recentUpdated], templatesMapQuery.data),
    [recentCreated, recentUpdated, templatesMapQuery.data],
  );
  const displayName = user?.name?.trim() || user?.loginId?.trim() || "간호사";

  const openRecordDetail = (row: DashboardRecordRow) => {
    setDetailRecordId(row.id);
  };

  return (
    <>
      <RecordDetailOverlay
        recordId={detailRecordId}
        onClose={() => setDetailRecordId(null)}
        onRecordChanged={() => {
          void queryClient.invalidateQueries({ queryKey: queryKeys.records.recentCreated(10) });
          void queryClient.invalidateQueries({ queryKey: queryKeys.records.recentUpdated(10) });
          void queryClient.invalidateQueries({ queryKey: queryKeys.records.stats });
        }}
      />

      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-9 lg:max-w-none">
        <section className="pt-1 lg:pt-0">
          <p className="text-base text-[#6B7280]">안녕하세요,</p>
          <h1 className="mt-1 text-[34px] font-bold leading-tight text-[#111827] sm:text-4xl">
            {displayName}님
          </h1>
        </section>

        <section>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-[#111827]">TODAY</h2>
            <span className="text-base text-[#6B7280]">{formatTodayYmd()}</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="mobile-app-card flex min-h-[122px] flex-col items-center justify-center px-2">
              <div className="text-4xl font-bold text-[#3B82F6]">{todayCreatedTotal}</div>
              <div className="mt-3 text-sm text-[#6B7280]">작성 기록</div>
            </div>
            <div className="mobile-app-card flex min-h-[122px] flex-col items-center justify-center px-2">
              <div className="text-4xl font-bold text-[#3B82F6]">
                {stats.todayRecordBasedRecords}
              </div>
              <div className="mt-3 text-sm text-[#6B7280]">기록기반 생성</div>
            </div>
            <div className="mobile-app-card flex min-h-[122px] flex-col items-center justify-center px-2">
              <div className="text-4xl font-bold text-[#3B82F6]">{stats.sentEmrRecords}</div>
              <div className="mt-3 text-sm text-[#6B7280]">EMR 전송</div>
            </div>
          </div>
          <p className="mt-3 text-right text-xs text-[#9CA3AF]">
            총 기록 {stats.totalRecords}건 · 미전송 {stats.pendingEmrRecords}건
          </p>
        </section>

        <section>
          <h2 className="mb-5 text-2xl font-bold text-[#111827]">주요 키워드</h2>
          <div className="mobile-app-card p-4">
            <div className="mb-5 grid grid-cols-2 rounded-md bg-[#F3F4F6] p-1 text-sm font-semibold text-[#6B7280]">
              <div className="rounded-md bg-white py-2 text-center text-[#111827] shadow-sm">
                생성 키워드
              </div>
              <div className="py-2 text-center">요약 키워드</div>
            </div>
            {keywords.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {keywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-full bg-[#EFF6FF] px-4 py-2 text-sm font-bold text-[#2563EB]"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            ) : (
              <p className="py-5 text-center text-sm text-[#9CA3AF]">
                최근 기록에서 표시할 키워드가 없습니다.
              </p>
            )}
          </div>
        </section>

        <section>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-[#111827]">최근 생성기록</h2>
            <button
              type="button"
              onClick={() => navigate(ROUTES.records)}
              className="text-sm font-bold text-[#2563EB]"
            >
              전체보기
            </button>
          </div>
          <div className="flex flex-col gap-4">
            {recentCreated.length === 0 ? (
              <div className="mobile-app-card px-5 py-10 text-center text-sm text-[#9CA3AF]">
                생성된 기록이 없습니다.
              </div>
            ) : (
              recentCreated.slice(0, 6).map((row) => (
                <RecordCard
                  key={`c-${row.id}`}
                  row={row}
                  templatesMap={templatesMapQuery.data}
                  onOpen={openRecordDetail}
                />
              ))
            )}
          </div>
        </section>

        <section className="hidden lg:block">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-[#111827]">최근 수정기록</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
            {recentUpdated.slice(0, 6).map((row) => (
              <RecordCard
                key={`u-${row.id}`}
                row={row}
                templatesMap={templatesMapQuery.data}
                onOpen={openRecordDetail}
              />
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
