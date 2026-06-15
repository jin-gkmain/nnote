import { useState } from "react";
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
  const stats = statsQuery.data;
  const todayCreatedTotal = stats
    ? stats.todayVoiceRecords + stats.todayRecordBasedRecords + stats.todayOcrRecords
    : null;
  const displayName = user?.name?.trim() || user?.loginId?.trim() || "간호사";
  const dashboardError =
    statsQuery.error ?? recentCreatedQuery.error ?? recentUpdatedQuery.error;

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

      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-8 lg:max-w-none lg:gap-9">
        {dashboardError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {dashboardError instanceof Error
              ? dashboardError.message
              : "대시보드 데이터를 불러오지 못했습니다."}
          </div>
        ) : null}
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
          <div className="grid grid-cols-3 gap-2 lg:gap-4">
            <div className="mobile-app-card flex min-h-[112px] flex-col items-center justify-center px-1.5 lg:min-h-[122px] lg:px-2">
              <div className="text-[32px] font-bold leading-none text-[#3B82F6] lg:text-4xl">
                {todayCreatedTotal ?? "—"}
              </div>
              <div className="mt-3 text-center text-xs leading-tight text-[#6B7280] lg:text-sm">
                작성 기록
              </div>
            </div>
            <div className="mobile-app-card flex min-h-[112px] flex-col items-center justify-center px-1.5 lg:min-h-[122px] lg:px-2">
              <div className="text-[32px] font-bold leading-none text-[#3B82F6] lg:text-4xl">
                {stats?.todayRecordBasedRecords ?? "—"}
              </div>
              <div className="mt-3 text-center text-xs leading-tight text-[#6B7280] lg:text-sm">
                기록기반 생성
              </div>
            </div>
            <div className="mobile-app-card flex min-h-[112px] flex-col items-center justify-center px-1.5 lg:min-h-[122px] lg:px-2">
              <div className="text-[32px] font-bold leading-none text-[#3B82F6] lg:text-4xl">
                {stats?.sentEmrRecords ?? "—"}
              </div>
              <div className="mt-3 text-center text-xs leading-tight text-[#6B7280] lg:text-sm">
                EMR 전송
              </div>
            </div>
          </div>
          {stats ? (
            <p className="mt-3 text-right text-xs text-[#9CA3AF]">
              총 기록 {stats.totalRecords}건 · 미전송 {stats.pendingEmrRecords}건
            </p>
          ) : (
            <p className="mt-3 text-right text-xs text-[#9CA3AF]">
              {statsQuery.isLoading ? "통계를 불러오는 중입니다." : "통계를 표시할 수 없습니다."}
            </p>
          )}
        </section>

        <section>
          <h2 className="mb-5 text-2xl font-bold text-[#111827]">주요 키워드</h2>
          <div className="mobile-app-card flex min-h-[96px] items-center justify-center p-4 text-center text-sm text-[#9CA3AF]">
            아직 집계된 주요 키워드가 없습니다.
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
            {recentCreatedQuery.isLoading ? (
              <div className="mobile-app-card px-5 py-10 text-center text-sm text-[#9CA3AF]">
                최근 기록을 불러오는 중입니다.
              </div>
            ) : recentCreated.length === 0 ? (
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
