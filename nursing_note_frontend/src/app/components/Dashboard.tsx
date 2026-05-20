import { UserPlus } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import AddPatientModal from "@/app/components/AddPatientModal";
import { RecordDetailOverlay } from "@/app/components/record-detail-overlay";
import {
  type DashboardRecordRow,
} from "@/app/data/nursingRecords";
import { queryKeys } from "@/app/query/query-keys";
import {
  usePatientStatsQuery,
  useRecentCreatedRecordsQuery,
  useRecentUpdatedRecordsQuery,
} from "@/app/query/use-app-query";

function formatSignedDelta(n: number): string {
  if (n === 0) return "0";
  return n > 0 ? `+${n}` : `${n}`;
}

interface DashboardProps {
  onPatientAdded: () => void;
}

function emrStatusLabel(status: DashboardRecordRow["emrSyncStatus"]): string {
  return status === "sent" ? "EMR 전송 후" : "EMR 전송 전";
}

export default function Dashboard({ onPatientAdded }: DashboardProps) {
  const queryClient = useQueryClient();
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [detailRecordId, setDetailRecordId] = useState<number | null>(null);
  const statsQuery = usePatientStatsQuery();
  const recentCreatedQuery = useRecentCreatedRecordsQuery(10);
  const recentUpdatedQuery = useRecentUpdatedRecordsQuery(10);
  const recentCreated = recentCreatedQuery.data ?? [];
  const recentUpdated = recentUpdatedQuery.data ?? [];
  const stats = statsQuery.data ?? {
    totalPatients: 0,
    totalPatientsMomChange: 0,
    todayVoiceRecords: 0,
    voiceRecordsDodChange: 0,
    todayAiNursingRecords: 0,
    aiNursingRecordsDodChange: 0,
  };

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
          void queryClient.invalidateQueries({ queryKey: queryKeys.patients.stats });
        }}
      />
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl text-gray-900 md:text-2xl">
          안녕하세요, <span className="font-bold">TEST</span>님
        </h1>
        <button
          type="button"
          onClick={() => setShowAddPatientModal(true)}
          className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <UserPlus className="h-4 w-4" />
          환자 추가
        </button>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-6 lg:grid-cols-4">
        <div className="flex flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
          <div className="mb-2 text-xs text-gray-600 md:text-sm">총 환자수</div>
          <div className="flex-1 text-right text-2xl font-bold text-gray-900 md:text-4xl">
            {stats.totalPatients}
          </div>
          <div className="mt-2 border-t border-gray-100 pt-2 text-right text-xs text-gray-500">
            전월 대비{" "}
            <span
              className={
                stats.totalPatientsMomChange > 0
                  ? "font-semibold text-emerald-600"
                  : stats.totalPatientsMomChange < 0
                    ? "font-semibold text-rose-600"
                    : "font-medium text-gray-600"
              }
            >
              {formatSignedDelta(stats.totalPatientsMomChange)}
            </span>
          </div>
          <div className="mt-0.5 text-right text-[10px] text-gray-400">
            현재 입원 중
          </div>
        </div>
        <div className="flex flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
          <div className="mb-2 text-xs text-gray-600 md:text-sm">
            오늘 생성한 음성기록
          </div>
          <div className="flex-1 text-right text-2xl font-bold text-gray-900 md:text-4xl">
            {stats.todayVoiceRecords}
          </div>
          <div className="mt-2 border-t border-gray-100 pt-2 text-right text-xs text-gray-500">
            전일 대비{" "}
            <span
              className={
                stats.voiceRecordsDodChange > 0
                  ? "font-semibold text-emerald-600"
                  : stats.voiceRecordsDodChange < 0
                    ? "font-semibold text-rose-600"
                    : "font-medium text-gray-600"
              }
            >
              {formatSignedDelta(stats.voiceRecordsDodChange)}
            </span>
          </div>
        </div>
        <div className="flex flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
          <div className="mb-2 text-xs text-gray-600 md:text-sm">
            오늘 생성한 AI 간호기록
          </div>
          <div className="flex-1 text-right text-2xl font-bold text-gray-900 md:text-4xl">
            {stats.todayAiNursingRecords}
          </div>
          <div className="mt-2 border-t border-gray-100 pt-2 text-right text-xs text-gray-500">
            전일 대비{" "}
            <span
              className={
                stats.aiNursingRecordsDodChange > 0
                  ? "font-semibold text-emerald-600"
                  : stats.aiNursingRecordsDodChange < 0
                    ? "font-semibold text-rose-600"
                    : "font-medium text-gray-600"
              }
            >
              {formatSignedDelta(stats.aiNursingRecordsDodChange)}
            </span>
          </div>
        </div>
        <div className="flex flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
          <div className="mb-2 text-xs text-gray-600 md:text-sm">
            EMR 연동 상태
          </div>
          <div className="flex-1 text-right text-lg font-semibold text-emerald-700 md:text-xl">
            연동 정상
          </div>
          <div className="mt-2 border-t border-gray-100 pt-2 text-right text-xs text-gray-500">
            마지막 동기화: 2026-04-06 14:30
          </div>
          <div className="mt-0.5 text-right text-[10px] text-gray-400">
            (데모 데이터)
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
          <h3 className="mb-4 text-lg font-bold text-gray-900 md:text-xl">
            최근 생성한 기록
          </h3>
          <div className="w-full min-w-0">
            <div className="dashboard-table-scroll-x -mx-1 overflow-x-auto">
              <table className="w-full min-w-[560px] table-fixed text-sm">
                <colgroup>
                  <col className="w-[18%]" />
                  <col className="w-[22%]" />
                  <col className="w-[28%]" />
                  <col className="w-[14%]" />
                  <col className="w-[18%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-gray-200 text-gray-600">
                    <th className="py-2 pr-3 text-left align-middle font-medium whitespace-nowrap">
                      기록번호
                    </th>
                    <th className="px-2 py-2 text-center align-middle font-medium whitespace-nowrap">
                      기록일시
                    </th>
                    <th className="px-2 py-2 text-left align-middle font-medium">
                      제목
                    </th>
                    <th className="px-2 py-2 text-center align-middle font-medium whitespace-nowrap">
                      상태
                    </th>
                    <th className="py-2 pl-3 text-center align-middle font-medium whitespace-nowrap">
                      상세보기
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentCreated.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-8 text-center text-gray-500"
                      >
                        생성된 기록이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    recentCreated.map((row) => (
                      <tr
                        key={`c-${row.id}`}
                        className="border-b border-gray-100 last:border-0"
                      >
                        <td className="py-3 pr-3 text-left align-middle font-medium text-gray-900">
                          {row.documentNumber}
                        </td>
                        <td className="px-2 py-3 text-center align-middle whitespace-nowrap text-gray-700">
                          {row.recordDateTime}
                        </td>
                        <td className="px-2 py-3 text-left align-middle text-gray-800">
                          <span className="line-clamp-2" title={row.title}>
                            {row.title ?? row.documentNumber}
                          </span>
                        </td>
                        <td className="px-2 py-3 text-center align-middle">
                          <span
                            className={
                              row.emrSyncStatus === "sent"
                                ? "inline-flex justify-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800"
                                : "inline-flex justify-center rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900"
                            }
                          >
                            {emrStatusLabel(row.emrSyncStatus)}
                          </span>
                        </td>
                        <td className="py-3 pl-3 text-center align-middle">
                          <button
                            type="button"
                            onClick={() => openRecordDetail(row)}
                            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
                          >
                            상세
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
          <h3 className="mb-4 text-lg font-bold text-gray-900 md:text-xl">
            최근 수정한 기록
          </h3>
          <div className="w-full min-w-0">
            <div className="dashboard-table-scroll-x -mx-1 overflow-x-auto">
              <table className="w-full min-w-[560px] table-fixed text-sm">
                <colgroup>
                  <col className="w-[18%]" />
                  <col className="w-[22%]" />
                  <col className="w-[28%]" />
                  <col className="w-[14%]" />
                  <col className="w-[18%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-gray-200 text-gray-600">
                    <th className="py-2 pr-3 text-left align-middle font-medium whitespace-nowrap">
                      기록번호
                    </th>
                    <th className="px-2 py-2 text-center align-middle font-medium whitespace-nowrap">
                      기록일시
                    </th>
                    <th className="px-2 py-2 text-left align-middle font-medium">
                      제목
                    </th>
                    <th className="px-2 py-2 text-center align-middle font-medium whitespace-nowrap">
                      상태
                    </th>
                    <th className="py-2 pl-3 text-center align-middle font-medium whitespace-nowrap">
                      상세보기
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentUpdated.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-8 text-center text-gray-500"
                      >
                        수정된 기록이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    recentUpdated.map((row) => (
                      <tr
                        key={`u-${row.id}`}
                        className="border-b border-gray-100 last:border-0"
                      >
                        <td className="py-3 pr-3 text-left align-middle font-medium text-gray-900">
                          {row.documentNumber}
                        </td>
                        <td className="px-2 py-3 text-center align-middle whitespace-nowrap text-gray-700">
                          {row.recordDateTime}
                        </td>
                        <td className="px-2 py-3 text-left align-middle text-gray-800">
                          <span className="line-clamp-2" title={row.title}>
                            {row.title ?? row.documentNumber}
                          </span>
                        </td>
                        <td className="px-2 py-3 text-center align-middle">
                          <span
                            className={
                              row.emrSyncStatus === "sent"
                                ? "inline-flex justify-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800"
                                : "inline-flex justify-center rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900"
                            }
                          >
                            {emrStatusLabel(row.emrSyncStatus)}
                          </span>
                        </td>
                        <td className="py-3 pl-3 text-center align-middle">
                          <button
                            type="button"
                            onClick={() => openRecordDetail(row)}
                            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
                          >
                            상세
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {showAddPatientModal && (
        <AddPatientModal
          onClose={() => setShowAddPatientModal(false)}
          onSuccess={() => {
            onPatientAdded();
            void queryClient.invalidateQueries({ queryKey: queryKeys.patients.stats });
            void queryClient.invalidateQueries({ queryKey: queryKeys.records.recentCreated(10) });
            void queryClient.invalidateQueries({ queryKey: queryKeys.records.recentUpdated(10) });
          }}
        />
      )}
    </>
  );
}
