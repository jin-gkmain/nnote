import type { RecordListSort } from "@/app/data/nursingRecords";

export const queryKeys = {
  auth: {
    me: (token: string | null) => ["auth", "me", token ?? "anonymous"] as const,
  },
  verification: {
    my: (token: string | null) => ["verification", "my", token ?? "anonymous"] as const,
    adminRequests: (token: string | null, status: string) =>
      ["verification", "admin-requests", status, token ?? "anonymous"] as const,
  },
  users: {
    all: (token: string | null) => ["users", token ?? "anonymous"] as const,
  },
  templates: {
    map: ["templates", "ui-config"] as const,
    merged: (templateId: string) => ["templates", "merged", templateId] as const,
    presets: (token: string | null) => ["templates", "presets", token ?? "anonymous"] as const,
  },
  inputAssist: {
    settings: (token: string | null) => ["input-assist", "settings", token ?? "anonymous"] as const,
  },
  records: {
    stats: ["records", "stats"] as const,
    list: (params: { page: number; pageSize: number; sort: RecordListSort; search: string }) =>
      ["records", "list", params] as const,
    detail: (recordId: number) => ["records", "detail", recordId] as const,
    recentCreated: (limit: number) => ["records", "recent-created", limit] as const,
    recentUpdated: (limit: number) => ["records", "recent-updated", limit] as const,
    mergedForSummary: (limit: number) => ["records", "merged-summary", limit] as const,
  },
} as const;
