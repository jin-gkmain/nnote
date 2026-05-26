import {
  normalizeTemplateFieldOptions,
  type TemplateSectionMap,
} from "@/app/data/template-field-registry";

export const AUTH_TOKEN_STORAGE_KEY = "nursing_note_access_token";

export type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";

export interface AuthUser {
  id: number;
  loginId: string;
  name: string;
  department: string;
  role: "admin" | "user";
  isActive: boolean;
  verificationStatus: VerificationStatus;
}

export function readStoredToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

export function writeStoredToken(token: string | null): void {
  if (token) localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  else localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
}

export async function loginRequest(
  loginId: string,
  password: string,
): Promise<{ accessToken: string; user: AuthUser }> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ loginId, password }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    accessToken?: string;
    user?: AuthUser;
    message?: string;
  };
  if (!res.ok || !data.accessToken || !data.user) {
    throw new Error(data.message || "로그인에 실패했습니다.");
  }
  return { accessToken: data.accessToken, user: data.user };
}

export async function meRequest(token: string): Promise<AuthUser | null> {
  const res = await fetch("/api/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as AuthUser;
}

export async function authFetch(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return fetch(path, { ...init, headers });
}

export async function patchProfileRequest(
  token: string,
  body: { name?: string; department?: string },
): Promise<AuthUser> {
  const res = await authFetch("/api/users/me", token, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as AuthUser & { message?: string };
  if (!res.ok) {
    throw new Error(data.message || "프로필 저장에 실패했습니다.");
  }
  return data as AuthUser;
}

export type MyVerificationInfo = {
  verificationStatus: VerificationStatus;
  lastRequest: null | {
    id: number;
    status: "pending" | "approved" | "rejected";
    departmentSnapshot: string;
    licenseNumber: string;
    rejectedReason: string | null;
    createdAt: string;
    reviewedAt: string | null;
    reviewedByUserId: number | null;
  };
};

export async function getMyVerificationRequest(token: string): Promise<MyVerificationInfo> {
  const res = await authFetch("/api/users/me/verification", token);
  const data = (await res.json().catch(() => ({}))) as
    | MyVerificationInfo
    | { message?: string };
  if (!res.ok) {
    throw new Error(
      typeof (data as any).message === "string"
        ? String((data as any).message)
        : "인증 상태를 불러오지 못했습니다.",
    );
  }
  return data as MyVerificationInfo;
}

export async function createMyVerificationRequest(
  token: string,
  payload: { department: string; licenseNumber: string },
): Promise<{ requestId: number; verificationStatus: VerificationStatus }> {
  const res = await authFetch("/api/users/me/verification-requests", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as
    | { requestId?: number; verificationStatus?: VerificationStatus; message?: string }
    | { message?: string };
  if (!res.ok || typeof (data as any).requestId !== "number") {
    throw new Error(
      typeof (data as any).message === "string"
        ? String((data as any).message)
        : "인증 요청에 실패했습니다.",
    );
  }
  return {
    requestId: Number((data as any).requestId),
    verificationStatus: ((data as any).verificationStatus ??
      "pending") as VerificationStatus,
  };
}

export type AdminVerificationRequestListItem = {
  id: number;
  userId: number;
  userLoginId: string;
  userName: string;
  departmentSnapshot: string;
  licenseNumber: string;
  status: "pending" | "approved" | "rejected";
  rejectedReason: string | null;
  createdAt: string;
};

export async function adminListVerificationRequests(
  token: string,
  params: { status?: "pending" | "approved" | "rejected" } = {},
): Promise<AdminVerificationRequestListItem[]> {
  const qs = params.status ? `?status=${encodeURIComponent(params.status)}` : "";
  const res = await authFetch(`/api/admin/verification-requests${qs}`, token);
  if (!res.ok) throw new Error("인증 요청 목록을 불러오지 못했습니다.");
  return (await res.json()) as AdminVerificationRequestListItem[];
}

export async function adminApproveVerificationRequest(
  token: string,
  requestId: number,
): Promise<void> {
  const res = await authFetch(`/api/admin/verification-requests/${requestId}/approve`, token, {
    method: "POST",
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || "승인에 실패했습니다.");
  }
}

export async function adminRejectVerificationRequest(
  token: string,
  requestId: number,
  payload: { reason?: string },
): Promise<void> {
  const res = await authFetch(`/api/admin/verification-requests/${requestId}/reject`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || "반려에 실패했습니다.");
  }
}

export async function adminPatchUserRequest(
  token: string,
  userId: number,
  payload: { name?: string; department?: string; isActive?: boolean },
): Promise<AuthUser> {
  const res = await authFetch(`/api/users/${userId}`, token, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as AuthUser & { message?: string };
  if (!res.ok) {
    throw new Error(data.message || "사용자 수정에 실패했습니다.");
  }
  return data as AuthUser;
}

export async function listUsersRequest(token: string): Promise<AuthUser[]> {
  const res = await authFetch("/api/users", token);
  if (!res.ok) throw new Error("사용자 목록을 불러오지 못했습니다.");
  return (await res.json()) as AuthUser[];
}

export async function createUserRequest(
  token: string,
  body: { loginId: string; password: string; name: string },
): Promise<AuthUser> {
  const res = await authFetch("/api/users", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as AuthUser & { message?: string };
  if (!res.ok) {
    throw new Error(
      typeof data.message === "string" ? data.message : "사용자 추가에 실패했습니다.",
    );
  }
  return data as AuthUser;
}

export async function deleteUserRequest(token: string, userId: number): Promise<void> {
  const res = await authFetch(`/api/users/${userId}`, token, { method: "DELETE" });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || "삭제에 실패했습니다.");
  }
}

export async function putTemplateUiRequest(
  token: string,
  templateId: string,
  sections: TemplateSectionMap,
  displayTitle?: string | null,
): Promise<void> {
  const body = {
    title: displayTitle ?? undefined,
    sections: Object.entries(sections).map(([sectionName, columns], sectionIndex) => ({
      sectionKey: sectionName.replace(/\s+/g, "-").slice(0, 96) || `section-${sectionIndex + 1}`,
      title: sectionName,
      displayOrder: sectionIndex + 1,
      repeatable: false,
      fields: Object.entries(columns).map(([fieldKey, def], fieldIndex) => ({
        fieldKey,
        label: def.label ?? fieldKey,
        type: def.type,
        description: def.description ?? "",
        aiHint: def.aiHint ?? "",
        inputSources: def.inputSources ?? [],
        sourceRow: def.sourceRow ?? 0,
        sourceDefinition: def.sourceDefinition ?? "",
        displayOrder: fieldIndex + 1,
        options: normalizeTemplateFieldOptions(def.optionDetails, def.options),
        conditions: def.conditions ?? [],
      })),
    })),
  };
  if (displayTitle !== undefined) {
    body.title = displayTitle ?? "";
  }
  const res = await authFetch(
    `/api/templates/${encodeURIComponent(templateId)}`,
    token,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || "템플릿 저장에 실패했습니다.");
  }
}

export async function postTemplateUiTemplateRequest(
  token: string,
  payload: {
    templateId: string;
    sections: TemplateSectionMap;
    displayTitle?: string;
  },
): Promise<void> {
  const res = await authFetch(`/api/settings/template-ui/templates`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || "템플릿 추가에 실패했습니다.");
  }
}

export type DeleteTemplateUiResponse = {
  ok: true;
  templateId: string;
  deletedRecords: number;
  removedTemplateRow: boolean;
};

export async function deleteTemplateUiRequest(
  token: string,
  templateId: string,
): Promise<DeleteTemplateUiResponse> {
  const res = await authFetch(
    `/api/settings/template-ui/${encodeURIComponent(templateId)}`,
    token,
    { method: "DELETE" },
  );
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || "템플릿 삭제에 실패했습니다.");
  }
  return (await res.json()) as DeleteTemplateUiResponse;
}
