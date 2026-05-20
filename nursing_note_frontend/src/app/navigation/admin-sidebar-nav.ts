export type AdminSidebarNavId = "home" | "team" | "templates" | "settings";

export function getAdminSidebarActiveId(pathname: string): AdminSidebarNavId {
  if (pathname === "/admin" || pathname === "/admin/") return "home";
  if (pathname.startsWith("/admin/team")) return "team";
  if (pathname.startsWith("/admin/templates")) return "templates";
  if (pathname.startsWith("/admin/settings")) return "settings";
  if (pathname.startsWith("/admin/users")) return "home";
  return "home";
}
