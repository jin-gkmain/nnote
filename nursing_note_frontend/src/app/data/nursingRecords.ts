import { authFetch } from "@/app/data/auth-api";
// 간호기록 타입 정의
export interface NursingRecord {
  id: string;
  date: string;
  time: string;
  documentNumber: string;
  /** record_type(템플릿·레거시 분류) */
  category: string;
  /** 사용자 지정 기록 제목 */
  title: string;
  soapie: string;
  checked: boolean;
}

/**
 * 프론트 표기용 날짜(예: "2026. 2. 11")를 API용 YYYY-MM-DD로 변환
 */
export function toRecordDate(koreanDate: string): string {
  if (!koreanDate || typeof koreanDate !== "string") {
    return new Date().toISOString().slice(0, 10);
  }
  const normalized = koreanDate.replace(/\s/g, "").replace(/\./g, "-");
  const parts = normalized.split("-").map((p) => p.trim().padStart(2, "0"));
  if (parts.length >= 3) {
    const [y, m, d] = parts;
    return `${y}-${m}-${d}`;
  }
  return new Date().toISOString().slice(0, 10);
}

/**
 * 시간 문자열을 API용 HH:MM으로 정규화 (앞 5자리)
 */
export function toRecordTime(timeStr: string): string {
  if (!timeStr || typeof timeStr !== "string") {
    return new Date().toTimeString().slice(0, 5);
  }
  const match = timeStr.match(/\d{1,2}:\d{1,2}/);
  return match ? match[0] : new Date().toTimeString().slice(0, 5);
}

/**
 * 환자별 전체 기록 조회 (API 호출)
 * - 백엔드에서 3종 기록(간호기록/인계/임상관찰)을 합쳐서 반환
 */
export const fetchPatientRecords = async (
  patientId: string,
): Promise<NursingRecord[]> => {
  try {
    const response = await fetch(`/api/patients/${patientId}/records`);
    if (!response.ok) return [];
    return await response.json();
  } catch {
    console.error("기록 조회 실패");
    return [];
  }
};

/**
 * 통합 기록 생성 — 단일 records 테이블에 JSON + record_type으로 저장
 */
export const createRecord = async (
  patientId: string,
  body: {
    recordType: string;
    documentNumber: string;
    recordDate: string;
    recordTime: string;
    title: string;
    data: Record<string, unknown>;
    /** 통계용: 수동 / 음성기록 / AI 초안 저장 */
    creationSource?: "manual" | "voice" | "ai" | "ocr";
  },
): Promise<{ id: number }> => {
  const response = await fetch("/api/records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      patientId: Number(patientId),
      recordType: body.recordType,
      documentNumber: body.documentNumber,
      recordDate: body.recordDate,
      recordTime: body.recordTime,
      title: body.title,
      data: body.data,
      creationSource: body.creationSource ?? "manual",
    }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(err || "기록 저장 실패");
  }
  return response.json();
};

/**
 * 통합 기록 수정 — PUT /api/records/:id
 */
export const updateRecord = async (
  recordId: string | number,
  body: {
    documentNumber?: string;
    recordDate?: string;
    recordTime?: string;
    title?: string;
    data?: Record<string, unknown>;
  },
): Promise<void> => {
  const response = await fetch(`/api/records/${recordId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(err || "기록 수정 실패");
  }
};

export const updateRecordEmrStatus = async (
  token: string,
  recordId: string | number,
  emrSyncStatus: "pending" | "sent",
): Promise<void> => {
  const response = await authFetch(`/api/records/${recordId}/emr-status`, token, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emrSyncStatus }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(err || "EMR 전송 상태 변경 실패");
  }
};

/**
 * 통합 기록 삭제 — DELETE /api/records/:id
 */
export const deleteRecord = async (
  recordId: string | number,
): Promise<void> => {
  const response = await fetch(`/api/records/${recordId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(err || "기록 삭제 실패");
  }
};

/**
 * 하위 호환을 위한 동기 함수 (빈 배열 반환)
 * 컴포넌트에서 fetchPatientRecords로 마이그레이션 완료 시 제거 예정
 */
export const getPatientRecords = (
  _patientId: string,
): NursingRecord[] => {
  return [];
};

/** 대시보드 최근 기록 API 응답 (백엔드 records/recent/*) */
export interface DashboardRecordRow {
  id: number;
  patientId: number;
  recordType: string;
  title: string;
  documentNumber: string;
  recordDateTime: string;
  emrSyncStatus: "pending" | "sent";
  clientRecordId: string;
  patient: {
    id: string;
    patientNumber: string;
    roomNumber: string;
    name: string;
    birthDate: string;
    gender: string;
    hasRecords: boolean;
  };
}

export interface RecordListItem extends DashboardRecordRow {
  creationSource: "manual" | "voice" | "ai" | "ocr";
}

/** GET /api/records/:id */
export interface RecordDetailResponse {
  id: number;
  patientId: number;
  recordType: string;
  title: string;
  documentNumber: string;
  recordDate: string;
  recordTime: string;
  data: Record<string, unknown>;
  creationSource: "manual" | "voice" | "ai" | "ocr";
  emrSyncStatus: "pending" | "sent";
  patient: {
    patientNumber: string;
    name: string;
  };
}

export async function fetchRecordById(recordId: number): Promise<RecordDetailResponse> {
  const response = await fetch(`/api/records/${recordId}`);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "기록을 불러오지 못했습니다.");
  }
  return response.json();
}

export interface RecordListPageResponse {
  total: number;
  items: RecordListItem[];
}

export type RecordListSort =
  | "record_date_desc"
  | "record_date_asc"
  | "created_desc"
  | "updated_desc"
  | "document_number_asc";

export const fetchRecentCreatedRecords = async (
  limit = 10,
): Promise<DashboardRecordRow[]> => {
  try {
    const res = await fetch(
      `/api/records/recent/created?limit=${limit}`,
    );
    if (!res.ok) return [];
    return await res.json();
  } catch {
    console.error("최근 생성 기록 조회 실패");
    return [];
  }
};

export const fetchRecentUpdatedRecords = async (
  limit = 10,
): Promise<DashboardRecordRow[]> => {
  try {
    const res = await fetch(
      `/api/records/recent/updated?limit=${limit}`,
    );
    if (!res.ok) return [];
    return await res.json();
  } catch {
    console.error("최근 수정 기록 조회 실패");
    return [];
  }
};

export const fetchRecordListPage = async ({
  page = 1,
  pageSize = 20,
  sort = "record_date_desc",
  search = "",
}: {
  page?: number;
  pageSize?: number;
  sort?: RecordListSort;
  search?: string;
}): Promise<RecordListPageResponse> => {
  try {
    const q = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      sort,
      search,
    });
    const res = await fetch(`/api/records?${q.toString()}`);
    if (!res.ok) return { total: 0, items: [] };
    return await res.json();
  } catch {
    console.error("기록 목록 조회 실패");
    return { total: 0, items: [] };
  }
};

/** Parse dashboard recordDateTime for sort order (e.g. "2026.4.14 14:30"). */
export function parseDashboardRecordDateTime(recordDateTime: string): number {
  const trimmed = recordDateTime.trim();
  const spaceIdx = trimmed.lastIndexOf(" ");
  if (spaceIdx <= 0) return 0;
  const datePart = trimmed.slice(0, spaceIdx).replace(/\s/g, "");
  const timePart = trimmed.slice(spaceIdx + 1).trim();
  const dateSegs = datePart.split(".").filter((s) => s.length > 0);
  if (dateSegs.length < 3) return 0;
  const [y, mo, da] = dateSegs.map((p) => p.padStart(2, "0"));
  const timeMatch = timePart.match(/^(\d{1,2}):(\d{1,2})/);
  const hh = timeMatch ? timeMatch[1].padStart(2, "0") : "00";
  const mm = timeMatch ? timeMatch[2].padStart(2, "0") : "00";
  const t = Date.parse(`${y}-${mo}-${da}T${hh}:${mm}:00`);
  return Number.isNaN(t) ? 0 : t;
}

/** Merged recent created+updated rows for AI summary picker; dedupe by id, newest first. */
export async function fetchMergedRecentRecordsForSummary(
  limitPerSource = 50,
): Promise<DashboardRecordRow[]> {
  const [created, updated] = await Promise.all([
    fetchRecentCreatedRecords(limitPerSource),
    fetchRecentUpdatedRecords(limitPerSource),
  ]);
  const byId = new Map<number, DashboardRecordRow>();
  for (const row of created) byId.set(row.id, row);
  for (const row of updated) byId.set(row.id, row);
  return [...byId.values()].sort(
    (a, b) =>
      parseDashboardRecordDateTime(b.recordDateTime) -
      parseDashboardRecordDateTime(a.recordDateTime),
  );
}
