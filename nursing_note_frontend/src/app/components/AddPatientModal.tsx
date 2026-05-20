import { useState } from "react";
import { X, UserPlus, Loader2 } from "lucide-react";
import { useCreatePatientMutation } from "@/app/query/use-app-query";

interface AddPatientModalProps {
  onClose: () => void;
  /** 환자 등록 성공 후 호출 — 부모에서 목록 새로고침에 사용 */
  onSuccess: () => void;
}

/**
 * 환자 추가 모달
 *
 * 흐름: 폼 입력 → POST /api/patients → 성공 시 부모에 알림
 * - CreatePatientDto에 맞춰 필수 필드를 입력받음
 * - 유효성 검사 후 API 호출
 */
export default function AddPatientModal({
  onClose,
  onSuccess,
}: AddPatientModalProps) {
  // ─── 폼 상태 ─────────────────────────────────────────────
  const [form, setForm] = useState({
    patientNumber: "",
    name: "",
    birthDate: "",
    gender: "여" as "남" | "여",
    roomNumber: "",
    diagnosis: "",
    admissionDate: new Date().toISOString().slice(0, 10), // 오늘 날짜 기본값
    attendingDoctor: "",
    allergies: "",
    bloodType: "",
    insurance: "",
    emergencyContact: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const createPatientMutation = useCreatePatientMutation();

  // ─── 입력 핸들러 ──────────────────────────────────────────
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // ─── 제출 핸들러 ──────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // 간단한 프론트엔드 유효성 검사
    if (!form.patientNumber.trim()) return setError("환자번호를 입력해주세요.");
    if (!form.name.trim()) return setError("이름을 입력해주세요.");
    if (!form.birthDate) return setError("생년월일을 입력해주세요.");
    if (!form.roomNumber.trim()) return setError("호실을 입력해주세요.");
    if (!form.diagnosis.trim()) return setError("진단명을 입력해주세요.");
    if (!form.attendingDoctor.trim()) return setError("담당의사를 입력해주세요.");
    if (!form.bloodType.trim()) return setError("혈액형을 입력해주세요.");
    if (!form.insurance.trim()) return setError("보험유형을 입력해주세요.");
    if (!form.emergencyContact.trim()) return setError("비상연락처를 입력해주세요.");

    setIsSubmitting(true);

    try {
      await createPatientMutation.mutateAsync(form);
      alert("환자가 등록되었습니다.");
      onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "서버 연결에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── 공통 입력 필드 스타일 ────────────────────────────────
  const inputClass =
    "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-lg shadow-lg overflow-hidden flex flex-col mx-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">
              새 환자 등록
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 본문 — 폼 */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 환자번호 */}
            <div>
              <label className={labelClass}>
                환자번호 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="patientNumber"
                value={form.patientNumber}
                onChange={handleChange}
                placeholder="예: P-001"
                className={inputClass}
              />
            </div>

            {/* 이름 */}
            <div>
              <label className={labelClass}>
                이름 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="환자 이름"
                className={inputClass}
              />
            </div>

            {/* 생년월일 */}
            <div>
              <label className={labelClass}>
                생년월일 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="birthDate"
                value={form.birthDate}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            {/* 성별 */}
            <div>
              <label className={labelClass}>
                성별 <span className="text-red-500">*</span>
              </label>
              <select
                name="gender"
                value={form.gender}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="여">여</option>
                <option value="남">남</option>
              </select>
            </div>

            {/* 호실 */}
            <div>
              <label className={labelClass}>
                호실 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="roomNumber"
                value={form.roomNumber}
                onChange={handleChange}
                placeholder="예: 301호"
                className={inputClass}
              />
            </div>

            {/* 진단명 */}
            <div>
              <label className={labelClass}>
                진단명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="diagnosis"
                value={form.diagnosis}
                onChange={handleChange}
                placeholder="예: 폐렴"
                className={inputClass}
              />
            </div>

            {/* 입원일 */}
            <div>
              <label className={labelClass}>
                입원일 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="admissionDate"
                value={form.admissionDate}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            {/* 담당의사 */}
            <div>
              <label className={labelClass}>
                담당의사 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="attendingDoctor"
                value={form.attendingDoctor}
                onChange={handleChange}
                placeholder="예: 김의사"
                className={inputClass}
              />
            </div>

            {/* 혈액형 */}
            <div>
              <label className={labelClass}>
                혈액형 <span className="text-red-500">*</span>
              </label>
              <select
                name="bloodType"
                value={form.bloodType}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="">선택</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>

            {/* 보험유형 */}
            <div>
              <label className={labelClass}>
                보험유형 <span className="text-red-500">*</span>
              </label>
              <select
                name="insurance"
                value={form.insurance}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="">선택</option>
                <option value="건강보험">건강보험</option>
                <option value="의료급여">의료급여</option>
                <option value="자동차보험">자동차보험</option>
                <option value="산재보험">산재보험</option>
                <option value="비급여">비급여</option>
              </select>
            </div>

            {/* 비상연락처 */}
            <div>
              <label className={labelClass}>
                비상연락처 <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="emergencyContact"
                value={form.emergencyContact}
                onChange={handleChange}
                placeholder="예: 010-1234-5678"
                className={inputClass}
              />
            </div>

            {/* 알러지 (선택) */}
            <div>
              <label className={labelClass}>알러지</label>
              <input
                type="text"
                name="allergies"
                value={form.allergies}
                onChange={handleChange}
                placeholder="예: 페니실린 (없으면 비워두세요)"
                className={inputClass}
              />
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}
        </form>

        {/* 푸터 */}
        <div className="flex justify-end gap-2 p-5 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                등록 중...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                환자 등록
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
