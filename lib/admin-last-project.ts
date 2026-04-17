const LAST_ADMIN_PROJECT_KEY = "quote-sheet:last-admin-project-id";

export function rememberAdminProjectContext(projectId: string): void {
  if (typeof window === "undefined") return;
  const id = projectId.trim();
  if (!id) return;
  try {
    localStorage.setItem(LAST_ADMIN_PROJECT_KEY, id);
  } catch {
    /* ignore */
  }
}

export function getLastAdminProjectId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LAST_ADMIN_PROJECT_KEY);
    const id = raw?.trim() ?? "";
    return id.length > 0 ? id : null;
  } catch {
    return null;
  }
}
