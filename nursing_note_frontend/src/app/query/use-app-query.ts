import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import {
  adminApproveVerificationRequest,
  adminListVerificationRequests,
  adminPatchUserRequest,
  adminRejectVerificationRequest,
  createUserRequest,
  createMyVerificationRequest,
  deleteTemplateUiRequest,
  deleteUserRequest,
  getMyVerificationRequest,
  listUsersRequest,
  meRequest,
  postTemplateUiTemplateRequest,
  patchProfileRequest,
  putTemplateUiRequest,
  type AuthUser,
  type AdminVerificationRequestListItem,
  type MyVerificationInfo,
} from "@/app/data/auth-api";
import {
  requestAiDraft,
  requestOcr,
  requestStt,
  type AiDraftRequest,
  type SttResponse,
} from "@/app/data/ai-api";
import type { SttEngineChoice } from "@/app/data/stt-engine-preference";
import { getPreferredSttEngine } from "@/app/data/stt-engine-preference";
import {
  createRecord,
  deleteRecord,
  fetchRecordDashboardStats,
  fetchMergedRecentRecordsForSummary,
  fetchRecentCreatedRecords,
  fetchRecentUpdatedRecords,
  fetchRecordById,
  fetchRecordListPage,
  updateRecord,
  updateRecordEmrStatus,
  type RecordCreationSource,
  type RecordListSort,
} from "@/app/data/nursingRecords";
import {
  fetchTemplateUiConfigMap,
  fetchTemplateSectionPresets,
  fieldConfigsToSectionMap,
  mergeTemplateFieldOverrides,
  type TemplateSectionMap,
  type TemplateUiFieldConfig,
} from "@/app/data/template-field-registry";
import {
  fetchMyInputAssistSettings,
  requestInputAutocomplete,
  updateMyInputAssistSettings,
  type AutocompleteRequestPayload,
  type InputAssistSettings,
} from "@/app/data/input-assist-api";
import type { VoiceRecordTemplateId } from "@/app/data/voiceRecordTemplates";
import { queryKeys } from "@/app/query/query-keys";

interface RecordListQueryParams {
  page: number;
  pageSize: number;
  sort: RecordListSort;
  search: string;
}

export function useMeQuery(token: string | null) {
  return useQuery({
    queryKey: queryKeys.auth.me(token),
    queryFn: () => meRequest(token!),
    enabled: Boolean(token),
  });
}

export function useUsersQuery(token: string | null) {
  return useQuery({
    queryKey: queryKeys.users.all(token),
    queryFn: () => listUsersRequest(token!),
    enabled: Boolean(token),
  });
}

export function useMyVerificationQuery(token: string | null) {
  return useQuery({
    queryKey: queryKeys.verification.my(token),
    queryFn: () => getMyVerificationRequest(token!),
    enabled: Boolean(token),
  });
}

export function useCreateMyVerificationRequestMutation(token: string, meToken: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { department: string; licenseNumber: string }) =>
      createMyVerificationRequest(token, payload),
    onSuccess: async () => {
      await invalidateByKeys(queryClient, [
        queryKeys.verification.my(meToken),
        queryKeys.auth.me(meToken),
      ]);
    },
  });
}

export function useAdminVerificationRequestsQuery(
  token: string | null,
  status: "pending" | "approved" | "rejected" | "all" = "pending",
) {
  const keyStatus = status === "all" ? "all" : status;
  return useQuery({
    queryKey: queryKeys.verification.adminRequests(token, keyStatus),
    queryFn: async (): Promise<AdminVerificationRequestListItem[]> => {
      return adminListVerificationRequests(token!, status === "all" ? {} : { status });
    },
    enabled: Boolean(token),
  });
}

export function useAdminApproveVerificationRequestMutation(token: string, meToken: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestId: number) => adminApproveVerificationRequest(token, requestId),
    onSuccess: async () => {
      await invalidateByKeys(queryClient, [
        queryKeys.verification.adminRequests(meToken, "pending"),
        queryKeys.users.all(meToken),
      ]);
    },
  });
}

export function useAdminRejectVerificationRequestMutation(token: string, meToken: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { requestId: number; reason?: string }) =>
      adminRejectVerificationRequest(token, payload.requestId, { reason: payload.reason }),
    onSuccess: async () => {
      await invalidateByKeys(queryClient, [
        queryKeys.verification.adminRequests(meToken, "pending"),
        queryKeys.users.all(meToken),
      ]);
    },
  });
}

export function useAdminPatchUserMutation(token: string, meToken: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      userId: number;
      body: { name?: string; department?: string; isActive?: boolean };
    }) => adminPatchUserRequest(token, payload.userId, payload.body),
    onSuccess: async () => {
      await invalidateByKeys(queryClient, [queryKeys.users.all(meToken)]);
    },
  });
}

export function useTemplatesMapQuery() {
  return useQuery({
    queryKey: queryKeys.templates.map,
    queryFn: fetchTemplateUiConfigMap,
  });
}

export function useTemplatePresetsQuery(token: string | null) {
  return useQuery({
    queryKey: queryKeys.templates.presets(token),
    queryFn: () => fetchTemplateSectionPresets(token!),
    enabled: Boolean(token),
  });
}

export function useInputAssistSettingsQuery(token: string | null) {
  return useQuery({
    queryKey: queryKeys.inputAssist.settings(token),
    queryFn: () => fetchMyInputAssistSettings(token!),
    enabled: Boolean(token),
  });
}

export function useMergedTemplateFieldsQuery(templateId: VoiceRecordTemplateId) {
  const mapQuery = useTemplatesMapQuery();
  return useQuery({
    queryKey: queryKeys.templates.merged(templateId),
    queryFn: async () => {
      const map = mapQuery.data ?? (await fetchTemplateUiConfigMap());
      return mergeTemplateFieldOverrides(templateId, map[templateId]?.sections ?? null);
    },
    enabled: Boolean(templateId),
  });
}

export function useRecordStatsQuery() {
  return useQuery({
    queryKey: queryKeys.records.stats,
    queryFn: fetchRecordDashboardStats,
  });
}

export function useRecordListPageQuery(params: RecordListQueryParams) {
  return useQuery({
    queryKey: queryKeys.records.list(params),
    queryFn: () => fetchRecordListPage(params),
  });
}

export function useRecordDetailQuery(recordId: number | null) {
  return useQuery({
    queryKey: queryKeys.records.detail(recordId ?? -1),
    queryFn: () => fetchRecordById(recordId!),
    enabled: recordId != null,
  });
}

export function useRecentCreatedRecordsQuery(limit = 10) {
  return useQuery({
    queryKey: queryKeys.records.recentCreated(limit),
    queryFn: () => fetchRecentCreatedRecords(limit),
  });
}

export function useRecentUpdatedRecordsQuery(limit = 10) {
  return useQuery({
    queryKey: queryKeys.records.recentUpdated(limit),
    queryFn: () => fetchRecentUpdatedRecords(limit),
  });
}

export function useMergedSummaryRecordsQuery(limit = 50) {
  return useQuery({
    queryKey: queryKeys.records.mergedForSummary(limit),
    queryFn: () => fetchMergedRecentRecordsForSummary(limit),
  });
}

function invalidateByKeys(queryClient: ReturnType<typeof useQueryClient>, keys: QueryKey[]) {
  return Promise.all(keys.map((key) => queryClient.invalidateQueries({ queryKey: key })));
}

export function useCreateUserMutation(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { loginId: string; password: string; name: string }) =>
      createUserRequest(token, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all(token) });
    },
  });
}

export function useDeleteUserMutation(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => deleteUserRequest(token, userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all(token) });
    },
  });
}

export function usePatchProfileMutation(token: string, meToken: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { name?: string; department?: string }) => patchProfileRequest(token, body),
    onSuccess: async (user) => {
      queryClient.setQueryData(queryKeys.auth.me(meToken), user as AuthUser);
      await invalidateByKeys(queryClient, [queryKeys.users.all(token)]);
    },
  });
}

export function usePutTemplateUiMutation(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      templateId: string;
      sections?: TemplateSectionMap;
      fields?: TemplateUiFieldConfig[];
      /** 설정 화면 저장 시 생략하면 표시 제목은 변경하지 않음 */
      displayTitle?: string | null;
    }) =>
      putTemplateUiRequest(
        token,
        payload.templateId,
        payload.sections ?? fieldConfigsToSectionMap(payload.fields ?? []),
        payload.displayTitle,
      ),
    onSuccess: async (_d, payload) => {
      await invalidateByKeys(queryClient, [
        queryKeys.templates.map,
        queryKeys.templates.merged(payload.templateId),
      ]);
    },
  });
}

export function useCreateTemplateUiMutation(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      templateId: string;
      sections: TemplateSectionMap;
      displayTitle?: string;
    }) => postTemplateUiTemplateRequest(token, payload),
    onSuccess: async (_d, payload) => {
      await invalidateByKeys(queryClient, [
        queryKeys.templates.map,
        queryKeys.templates.merged(payload.templateId),
      ]);
    },
  });
}

export function useDeleteTemplateUiMutation(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (templateId: string) => deleteTemplateUiRequest(token, templateId),
    onSuccess: async (_data, templateId) => {
      await invalidateByKeys(queryClient, [
        queryKeys.templates.map,
        queryKeys.templates.merged(templateId),
        queryKeys.records.recentCreated(10),
        queryKeys.records.recentUpdated(10),
        queryKeys.records.mergedForSummary(50),
        queryKeys.records.stats,
      ]);
      await queryClient.invalidateQueries({ queryKey: ["records"] });
    },
  });
}

export function useCreateRecordMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      body: {
        recordType: string;
        documentNumber: string;
        recordDate: string;
        recordTime: string;
        title: string;
        data: Record<string, unknown>;
        creationSource?: RecordCreationSource;
      };
    }) => createRecord(payload.body),
    onSuccess: async (_data, payload) => {
      await invalidateByKeys(queryClient, [
        queryKeys.records.recentCreated(10),
        queryKeys.records.recentUpdated(10),
        queryKeys.records.mergedForSummary(50),
        queryKeys.records.stats,
      ]);
    },
  });
}

export function useUpdateRecordMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      recordId: string | number;
      body: {
        documentNumber?: string;
        recordDate?: string;
        recordTime?: string;
        title?: string;
        data?: Record<string, unknown>;
      };
    }) => updateRecord(payload.recordId, payload.body),
    onSuccess: async (_data, payload) => {
      await invalidateByKeys(queryClient, [
        queryKeys.records.detail(Number(payload.recordId)),
        queryKeys.records.recentUpdated(10),
        queryKeys.records.mergedForSummary(50),
      ]);
    },
  });
}

export function useDeleteRecordMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { recordId: string | number }) =>
      deleteRecord(payload.recordId),
    onSuccess: async (_data, payload) => {
      await invalidateByKeys(queryClient, [
        queryKeys.records.recentCreated(10),
        queryKeys.records.recentUpdated(10),
        queryKeys.records.mergedForSummary(50),
        queryKeys.records.stats,
      ]);
    },
  });
}

export function useUpdateRecordEmrStatusMutation(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { recordId: string | number; status: "pending" | "sent" }) =>
      updateRecordEmrStatus(token!, payload.recordId, payload.status),
    onSuccess: async (_data, payload) => {
      await invalidateByKeys(queryClient, [
        queryKeys.records.detail(Number(payload.recordId)),
        queryKeys.records.recentCreated(10),
        queryKeys.records.recentUpdated(10),
        queryKeys.records.mergedForSummary(50),
        queryKeys.records.stats,
      ]);
    },
  });
}

export function useAiDraftMutation<T = Record<string, unknown>>() {
  return useMutation({
    mutationFn: (payload: AiDraftRequest) => requestAiDraft<T>(payload),
  });
}

export function useOcrMutation() {
  return useMutation({
    mutationFn: (file: File) => requestOcr(file),
  });
}

export function useSttMutation() {
  return useMutation<
    SttResponse,
    Error,
    { audio: File | Blob; engine?: SttEngineChoice }
  >({
    mutationFn: ({ audio, engine }) =>
      requestStt(audio, { engine: engine ?? getPreferredSttEngine() }),
  });
}

export function useUpdateInputAssistSettingsMutation(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: InputAssistSettings) => updateMyInputAssistSettings(token!, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.inputAssist.settings(token) });
    },
  });
}

export function useInputAutocompleteMutation(token: string | null) {
  return useMutation({
    mutationFn: (payload: AutocompleteRequestPayload) => requestInputAutocomplete(token!, payload),
  });
}
