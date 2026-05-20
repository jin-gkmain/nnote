export type SidebarNavId =
  | "home"
  | "voice"
  | "aiCreate"
  | "aiSummary"
  | "ocr"
  | "records"
  | "settings";

/** 현재 URL에 맞는 사이드바 하이라이트 */
export function getSidebarActiveId(pathname: string): SidebarNavId {
  if (pathname === "/") return "home";
  if (pathname === "/records") {
    return "records";
  }
  if (pathname.startsWith("/voice")) return "voice";
  if (pathname.startsWith("/ai/create")) return "aiCreate";
  if (pathname.startsWith("/ai/summary")) return "aiSummary";
  if (pathname.startsWith("/ocr")) return "ocr";
  if (pathname.startsWith("/settings")) return "settings";
  return "home";
}
