import { Item, Project, QuoteSheetStore, STORAGE_KEY } from "./models";

const isBrowser = () => typeof window !== "undefined";

const emptyStore: QuoteSheetStore = { projects: [] };

function readStore(): QuoteSheetStore {
  if (!isBrowser()) return emptyStore;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore;
    const parsed = JSON.parse(raw) as QuoteSheetStore;
    if (!Array.isArray(parsed.projects)) return emptyStore;
    return parsed;
  } catch {
    return emptyStore;
  }
}

function writeStore(store: QuoteSheetStore) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore quota / serialization issues for this demo
  }
}

export function getProjects(): Project[] {
  return readStore().projects;
}

export function getProject(projectId: string): Project | undefined {
  return getProjects().find((p) => p.id === projectId);
}

export function saveProject(project: Project): Project {
  const store = readStore();
  const existingIndex = store.projects.findIndex((p) => p.id === project.id);
  if (existingIndex >= 0) {
    store.projects[existingIndex] = { ...project };
  } else {
    store.projects.push({ ...project });
  }
  writeStore(store);
  return project;
}

export function upsertItem(projectId: string, item: Item): Project | undefined {
  const store = readStore();
  const projectIndex = store.projects.findIndex((p) => p.id === projectId);
  if (projectIndex === -1) return undefined;

  const project = store.projects[projectIndex];
  const items = [...project.items];
  const existingIndex = items.findIndex((i) => i.id === item.id);
  if (existingIndex >= 0) {
    items[existingIndex] = { ...item };
  } else {
    items.push({ ...item });
  }

  const updatedProject: Project = { ...project, items };
  store.projects[projectIndex] = updatedProject;
  writeStore(store);
  return updatedProject;
}

export function deleteItem(
  projectId: string,
  itemId: string,
): Project | undefined {
  const store = readStore();
  const projectIndex = store.projects.findIndex((p) => p.id === projectId);
  if (projectIndex === -1) return undefined;

  const project = store.projects[projectIndex];
  const items = project.items.filter((i) => i.id !== itemId);
  const updatedProject: Project = { ...project, items };
  store.projects[projectIndex] = updatedProject;
  writeStore(store);
  return updatedProject;
}

export function createProject(input: {
  name: string;
  client: string;
  notes?: string;
}): Project {
  const now = new Date().toISOString();
  const project: Project = {
    id: crypto.randomUUID(),
    name: input.name,
    client: input.client,
    notes: input.notes,
    createdAt: now,
    items: [],
  };
  saveProject(project);
  return project;
}
