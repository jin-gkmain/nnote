import { authFetch } from "@/app/data/auth-api";

export type InquiryStatus = "pending" | "in_progress" | "completed";

export interface Inquiry {
  id: number;
  memberLoginId: string | null;
  replyEmail: string;
  title: string;
  content: string;
  status: InquiryStatus;
  isMember: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function createInquiry(payload: {
  replyEmail: string;
  title: string;
  content: string;
}, token?: string | null): Promise<{ id: number; ok: true }> {
  const response = await fetch(token ? "/api/inquiries/member" : "/api/inquiries", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => ({}))) as {
    id?: number;
    ok?: true;
    message?: string | string[];
  };
  if (!response.ok || typeof data.id !== "number") {
    const message = Array.isArray(data.message) ? data.message[0] : data.message;
    throw new Error(message || "문의 접수에 실패했습니다.");
  }
  return { id: data.id, ok: true };
}

export async function listInquiries(
  token: string,
  sort: "latest" | "oldest",
): Promise<Inquiry[]> {
  const response = await authFetch(`/api/inquiries?sort=${sort}`, token);
  if (!response.ok) throw new Error("문의 목록을 불러오지 못했습니다.");
  return (await response.json()) as Inquiry[];
}

export async function updateInquiryStatus(
  token: string,
  inquiryId: number,
  status: InquiryStatus,
): Promise<Inquiry> {
  const response = await authFetch(`/api/inquiries/${inquiryId}/status`, token, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  const data = (await response.json().catch(() => ({}))) as Inquiry & {
    message?: string;
  };
  if (!response.ok) throw new Error(data.message || "문의 상태 저장에 실패했습니다.");
  return data;
}
