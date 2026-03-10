import { Item, Project, QuoteSheetStore, STORAGE_KEY } from "./models";

type LegacyItem = Partial<Item> & {
  imageBase64?: string;
};

type LegacyProject = Omit<Project, "items"> & {
  items?: LegacyItem[];
};

const isBrowser = () => typeof window !== "undefined";

const emptyStore: QuoteSheetStore = { projects: [] };

function normalizeItem(item: LegacyItem): Item {
  const images = Array.isArray(item.images)
    ? item.images.filter((image): image is string => typeof image === "string" && image.length > 0)
    : item.imageBase64
      ? [item.imageBase64]
      : [];

  const previewImageIndex =
    typeof item.previewImageIndex === "number" && item.previewImageIndex >= 0
      ? Math.min(item.previewImageIndex, Math.max(images.length - 1, 0))
      : 0;

  return {
    id: item.id ?? crypto.randomUUID(),
    name: item.name ?? "",
    shortDescription: item.shortDescription ?? "",
    images,
    previewImageIndex,
    material: item.material ?? "",
    size: item.size ?? "",
    logo: item.logo ?? "",
    preProductionSampleTime: item.preProductionSampleTime ?? "",
    preProductionSampleFee: item.preProductionSampleFee ?? "",
    packingDetails: item.packingDetails ?? "",
    baseColor: typeof item.baseColor === "string" ? item.baseColor : undefined,
    additionalNotes: typeof item.additionalNotes === "string" ? item.additionalNotes : undefined,
    priceTiers: Array.isArray(item.priceTiers) ? item.priceTiers : [],
  };
}

function normalizeProject(project: LegacyProject): Project {
  return {
    id: project.id,
    name: project.name,
    client: project.client,
    notes: project.notes,
    createdAt: project.createdAt,
    pricingBasis:
      project.pricingBasis === "FOB" || project.pricingBasis === "DDP"
        ? project.pricingBasis
        : "DDP",
    contactName: project.contactName,
    quoteDate: project.quoteDate,
    items: Array.isArray(project.items) ? project.items.map(normalizeItem) : [],
  };
}

function readStore(): QuoteSheetStore {
  if (!isBrowser()) return emptyStore;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore;
    const parsed = JSON.parse(raw) as { projects?: LegacyProject[] };
    if (!Array.isArray(parsed.projects)) return emptyStore;

    return {
      projects: parsed.projects.map(normalizeProject),
    };
  } catch {
    return emptyStore;
  }
}

function writeStore(store: QuoteSheetStore): boolean {
  if (!isBrowser()) return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    return true;
  } catch {
    return false;
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

  const didSave = writeStore(store);
  if (!didSave) return undefined;

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

  const didSave = writeStore(store);
  if (!didSave) return undefined;

  return updatedProject;
}

export function createProject(input: {
  name: string;
  client: string;
  notes?: string;
  pricingBasis?: "DDP" | "FOB";
  contactName?: string;
  quoteDate?: string;
}): Project {
  const now = new Date().toISOString();
  const project: Project = {
    id: crypto.randomUUID(),
    name: input.name,
    client: input.client,
    notes: input.notes,
    createdAt: now,
    pricingBasis:
      input.pricingBasis === "FOB" || input.pricingBasis === "DDP"
        ? input.pricingBasis
        : "DDP",
    contactName: input.contactName,
    quoteDate: input.quoteDate,
    items: [],
  };
  saveProject(project);
  return project;
}
