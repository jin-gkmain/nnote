import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { Patient } from "@/app/App";

interface SelectPatientForVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: Patient[];
  /** 선택 완료 시 선택된 환자만 넘김 */
  onConfirm: (patient: Patient) => void;
}

/**
 * 음성기록용 환자 선택 모달 — 행 클릭으로 1명 선택 후 하단 버튼으로 확정
 */
export default function SelectPatientForVoiceModal({
  isOpen,
  onClose,
  patients,
  onConfirm,
}: SelectPatientForVoiceModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) setSelectedId(null);
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedPatient =
    selectedId != null
      ? patients.find((p) => p.id === selectedId)
      : undefined;

  const handleConfirm = () => {
    if (!selectedPatient) return;
    onConfirm(selectedPatient);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-patient-modal-title"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2
            id="voice-patient-modal-title"
            className="text-lg font-bold text-gray-900"
          >
            환자 선택
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2.5 text-gray-600 transition-colors hover:bg-gray-100"
            aria-label="닫기"
          >
            <X className="h-7 w-7" strokeWidth={2} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-5 py-4">
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-900">
                    등록번호
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-900">이름</th>
                  <th className="px-4 py-3 font-semibold text-gray-900">병실</th>
                  <th className="px-4 py-3 font-semibold text-gray-900">
                    진료과
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-900">
                    주치의
                  </th>
                </tr>
              </thead>
              <tbody>
                {patients.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      등록된 환자가 없습니다.
                    </td>
                  </tr>
                ) : (
                  patients.map((patient, index) => {
                    const isSelected = selectedId === patient.id;
                    return (
                      <tr
                        key={patient.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedId(patient.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedId(patient.id);
                          }
                        }}
                        className={`cursor-pointer border-b border-gray-100 transition-colors ${
                          index % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                        } ${
                          isSelected
                            ? "bg-blue-50 ring-2 ring-inset ring-blue-400"
                            : "hover:bg-gray-100/80"
                        }`}
                      >
                        <td className="px-4 py-3 text-gray-900">
                          {patient.patientNumber}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {patient.name}
                        </td>
                        <td className="px-4 py-3 text-gray-900">
                          {patient.roomNumber}
                        </td>
                        <td className="px-4 py-3 text-gray-900">
                          {patient.diagnosis ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-900">
                          {patient.attendingDoctor ?? "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="border-t border-gray-200 px-5 py-4">
          <button
            type="button"
            disabled={!selectedPatient}
            onClick={handleConfirm}
            className="w-full rounded-lg bg-blue-600 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
          >
            선택완료
          </button>
        </div>
      </div>
    </div>
  );
}
