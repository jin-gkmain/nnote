import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/app/auth/auth-context";
import AdminLayout from "@/app/components/AdminLayout";
import AdminHomePage from "@/app/components/AdminHomePage";
import AdminSettingsPage from "@/app/components/AdminSettingsPage";
import AdminTeamPage from "@/app/components/AdminTeamPage";
import AdminTemplatesPage from "@/app/components/AdminTemplatesPage";
import AppLayout from "@/app/components/AppLayout";
import Dashboard from "@/app/components/Dashboard";
import AiRecordCreatePage from "@/app/components/AiRecordCreatePage";
import AiRecordSummaryPage from "@/app/components/AiRecordSummaryPage";
import LoginPage from "@/app/components/LoginPage";
import NursingRecordListPage from "@/app/components/NursingRecordListPage";
import OcrPage from "@/app/components/OcrPage";
import SettingsPage from "@/app/components/SettingsPage";
import VoiceRecordPage from "@/app/components/VoiceRecordPage";
import { ROUTES } from "@/app/navigation/routes";
import { queryKeys } from "@/app/query/query-keys";
import { usePatientsQuery } from "@/app/query/use-app-query";

export interface Patient {
  id: string;
  patientNumber: string;
  roomNumber: string;
  name: string;
  birthDate: string;
  gender: string;
  hasRecords: boolean;
  /** 목록 API에서 함께 내려옴 — 음성기록 환자 선택 테이블 등 */
  diagnosis?: string;
  attendingDoctor?: string;
}

function AppRoutes() {
  const queryClient = useQueryClient();
  const patientsQuery = usePatientsQuery();
  const patients = patientsQuery.data ?? [];

  const refreshPatients = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.patients.all });
  }, [queryClient]);

  return (
    <Routes>
      <Route path={ROUTES.login} element={<LoginPage />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminHomePage />} />
        <Route path="team" element={<AdminTeamPage />} />
        <Route path="templates" element={<AdminTemplatesPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
        <Route path="users/:id" element={<Navigate to={ROUTES.adminRoot} replace />} />
      </Route>
      <Route element={<AppLayout />}>
        <Route
          index
          element={<Dashboard onPatientAdded={refreshPatients} />}
        />
        <Route
          path="records"
          element={
            <NursingRecordListPage onPatientsMutated={refreshPatients} />
          }
        />
        <Route path="patients" element={<Navigate to={ROUTES.records} replace />} />
        <Route path="patient/:id" element={<Navigate to={ROUTES.records} replace />} />
        <Route
          path="voice"
          element={
            <VoiceRecordPage
              patients={patients}
              onPatientsRefresh={refreshPatients}
            />
          }
        />
        <Route
          path="ai/create"
          element={
            <AiRecordCreatePage
              patients={patients}
              onPatientsRefresh={refreshPatients}
            />
          }
        />
        <Route path="ai/summary" element={<AiRecordSummaryPage />} />
        <Route path="ocr" element={<OcrPage patients={patients} />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
