import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/app/auth/auth-context";
import AdminLayout from "@/app/components/AdminLayout";
import AdminHomePage from "@/app/components/AdminHomePage";
import AdminSettingsPage from "@/app/components/AdminSettingsPage";
import AdminTeamPage from "@/app/components/AdminTeamPage";
import AdminTemplatesPage from "@/app/components/AdminTemplatesPage";
import AppLayout from "@/app/components/AppLayout";
import Dashboard from "@/app/components/Dashboard";
import AiRecordSummaryPage from "@/app/components/AiRecordSummaryPage";
import LoginPage from "@/app/components/LoginPage";
import InquiryPage from "@/app/components/InquiryPage";
import AdminInquiriesPage from "@/app/components/AdminInquiriesPage";
import NursingRecordListPage from "@/app/components/NursingRecordListPage";
import OcrPage from "@/app/components/OcrPage";
import SettingsPage from "@/app/components/SettingsPage";
import VoiceRecordPage from "@/app/components/VoiceRecordPage";
import { ROUTES } from "@/app/navigation/routes";

function AppRoutes() {
  return (
    <Routes>
      <Route path={ROUTES.login} element={<LoginPage />} />
      <Route path={ROUTES.inquiry} element={<InquiryPage />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminHomePage />} />
        <Route path="team" element={<AdminTeamPage />} />
        <Route path="templates" element={<AdminTemplatesPage />} />
        <Route path="inquiries" element={<AdminInquiriesPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
        <Route path="users/:id" element={<Navigate to={ROUTES.adminRoot} replace />} />
      </Route>
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route
          path="records"
          element={<NursingRecordListPage />}
        />
        <Route path="patients" element={<Navigate to={ROUTES.records} replace />} />
        <Route path="patient/:id" element={<Navigate to={ROUTES.records} replace />} />
        <Route path="voice" element={<VoiceRecordPage />} />
        <Route path="ai/create" element={<Navigate to={ROUTES.aiSummary} replace />} />
        <Route path="ai/summary" element={<AiRecordSummaryPage />} />
        <Route path="ocr" element={<OcrPage />} />
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
