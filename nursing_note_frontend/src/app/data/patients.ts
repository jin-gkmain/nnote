import type { Patient } from "@/app/App";

/**
 * 활성 환자 목록 조회 (API 호출)
 */
export const fetchPatients = async (): Promise<Patient[]> => {
  try {
    const response = await fetch("/api/patients");
    if (!response.ok) return [];
    return await response.json();
  } catch {
    console.error("환자 목록 조회 실패");
    return [];
  }
};

export interface DashboardStats {
  totalPatients: number;
  totalPatientsMomChange: number;
  todayVoiceRecords: number;
  voiceRecordsDodChange: number;
  todayAiNursingRecords: number;
  aiNursingRecordsDodChange: number;
}

export async function fetchPatientStats(): Promise<DashboardStats> {
  const response = await fetch("/api/patients/stats");
  if (!response.ok) throw new Error("통계 조회 실패");
  const raw = (await response.json()) as Partial<DashboardStats>;
  return {
    totalPatients: raw.totalPatients ?? 0,
    totalPatientsMomChange: raw.totalPatientsMomChange ?? 0,
    todayVoiceRecords: raw.todayVoiceRecords ?? 0,
    voiceRecordsDodChange: raw.voiceRecordsDodChange ?? 0,
    todayAiNursingRecords: raw.todayAiNursingRecords ?? 0,
    aiNursingRecordsDodChange: raw.aiNursingRecordsDodChange ?? 0,
  };
}

export async function createPatientRequest(body: {
  patientNumber: string;
  name: string;
  birthDate: string;
  gender: "남" | "여";
  roomNumber: string;
  diagnosis: string;
  admissionDate: string;
  attendingDoctor: string;
  allergies: string;
  bloodType: string;
  insurance: string;
  emergencyContact: string;
}): Promise<void> {
  const res = await fetch("/api/patients", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.ok) return;
  const data = (await res.json().catch(() => ({}))) as { message?: string | string[] };
  const msg = Array.isArray(data.message) ? data.message[0] : data.message;
  throw new Error(msg || "환자 등록에 실패했습니다.");
}
