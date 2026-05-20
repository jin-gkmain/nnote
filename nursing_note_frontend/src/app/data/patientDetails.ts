// 환자 상세 정보 타입 정의
export interface PatientDetailInfo {
  diagnosis: string;
  age: number;
  gender: string;
  admissionDate: string;
  roomNumber: string;
  attendingDoctor: string;
  allergies: string;
  bloodType: string;
  insurance: string;
  emergencyContact: string;
}

/**
 * 환자 상세 정보 조회 (API 호출)
 */
export const fetchPatientDetail = async (
  patientId: string,
): Promise<PatientDetailInfo | null> => {
  try {
    const response = await fetch(`/api/patients/${patientId}`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    console.error("환자 상세 조회 실패");
    return null;
  }
};
