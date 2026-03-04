import type { Item, Project } from "@/lib/models";

async function readJson<T>(response: Response): Promise<T> {
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    const message =
      (body as { error?: string }).error || `Request failed (${response.status})`;
    throw new Error(message);
  }
  return body;
}

export async function fetchProjects(): Promise<Project[]> {
  const response = await fetch("/api/projects", { cache: "no-store" });
  const body = await readJson<{ projects: Project[] }>(response);
  return body.projects;
}

export async function fetchProject(projectId: string): Promise<Project | null> {
  const response = await fetch(`/api/projects/${projectId}`, {
    cache: "no-store",
  });

  if (response.status === 404) {
    return null;
  }

  const body = await readJson<{ project: Project }>(response);
  return body.project;
}

export async function createProject(input: {
  name: string;
  client: string;
  notes?: string;
}): Promise<Project> {
  const response = await fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await readJson<{ project: Project }>(response);
  return body.project;
}

export async function updateProject(project: Project): Promise<Project> {
  const response = await fetch(`/api/projects/${project.id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project }),
  });
  const body = await readJson<{ project: Project }>(response);
  return body.project;
}

export async function createOrUpdateItem(
  projectId: string,
  item: Item,
): Promise<Project> {
  const response = await fetch(`/api/projects/${projectId}/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ item }),
  });
  const body = await readJson<{ project: Project }>(response);
  return body.project;
}

export async function removeItem(
  projectId: string,
  itemId: string,
): Promise<Project> {
  const response = await fetch(`/api/projects/${projectId}/items/${itemId}`, {
    method: "DELETE",
  });
  const body = await readJson<{ project: Project }>(response);
  return body.project;
}
