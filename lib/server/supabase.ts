import type { Item, Project } from "@/lib/models";
import { uploadItemImages } from "./supabase-storage";

type ItemCompat = Partial<Item> & {
  imageBase64?: string;
};

type SupabaseRowProject = {
  id: string;
  name: string;
  client: string;
  notes: string | null;
  created_at: string;
};

type SupabaseRowItem = {
  id: string;
  project_id: string;
  name: string;
  short_description: string;
  image_urls?: string[] | null;
  preview_image_index?: number | null;
  image_base64?: string | null;
  material: string;
  size: string;
  logo: string;
  pre_production_sample_time: string;
  pre_production_sample_fee: string;
  packing_details: string;
  price_tiers: Item["priceTiers"];
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function assertSupabaseConfigured() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
}

function headers() {
  assertSupabaseConfigured();
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY as string,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY as string}`,
    "Content-Type": "application/json",
  };
}

function isMissingColumnError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    (message.includes("42703") && message.includes("column")) ||
    message.includes("PGRST204") ||
    (message.includes("Could not find") && message.includes("column"))
  );
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  assertSupabaseConfigured();
  const url = `${SUPABASE_URL}/rest/v1${path}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      ...headers(),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${body}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function normalizeImageUrls(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string" && v.length > 0);
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed)
        ? parsed.filter((v): v is string => typeof v === "string" && v.length > 0)
        : value.length > 0
          ? [value]
          : [];
    } catch {
      return value.length > 0 ? [value] : [];
    }
  }
  return [];
}

function toItem(row: SupabaseRowItem): Item {
  const fallbackImage = row.image_base64 ?? "";
  const fromUrls = normalizeImageUrls(row.image_urls);
  const images =
    fromUrls.length > 0 ? fromUrls : fallbackImage ? [fallbackImage] : [];

  const previewImageIndex =
    typeof row.preview_image_index === "number" && row.preview_image_index >= 0
      ? Math.min(row.preview_image_index, Math.max(images.length - 1, 0))
      : 0;

  return {
    id: row.id,
    name: row.name,
    shortDescription: row.short_description,
    images,
    previewImageIndex,
    material: row.material,
    size: row.size,
    logo: row.logo,
    preProductionSampleTime: row.pre_production_sample_time,
    preProductionSampleFee: row.pre_production_sample_fee,
    packingDetails: row.packing_details,
    priceTiers: Array.isArray(row.price_tiers) ? row.price_tiers : [],
  };
}

function toProject(row: SupabaseRowProject, items: Item[]): Project {
  return {
    id: row.id,
    name: row.name,
    client: row.client,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    items,
  };
}

function getItemImages(item: Item) {
  const source = item as ItemCompat;
  const images =
    Array.isArray(source.images) && source.images.length > 0
      ? source.images
      : source.imageBase64
        ? [source.imageBase64]
        : [];
  const previewImageIndex =
    typeof source.previewImageIndex === "number" && source.previewImageIndex >= 0
      ? Math.min(source.previewImageIndex, Math.max(images.length - 1, 0))
      : 0;

  return { images, previewImageIndex };
}

function toItemInsertWithAllImageColumns(projectId: string, item: Item) {
  const { images, previewImageIndex } = getItemImages(item);

  return {
    id: item.id,
    project_id: projectId,
    name: item.name,
    short_description: item.shortDescription,
    image_urls: images,
    preview_image_index: previewImageIndex,
    image_base64: images[previewImageIndex] ?? images[0] ?? null,
    material: item.material,
    size: item.size,
    logo: item.logo,
    pre_production_sample_time: item.preProductionSampleTime,
    pre_production_sample_fee: item.preProductionSampleFee,
    packing_details: item.packingDetails,
    price_tiers: item.priceTiers,
  };
}

function toItemInsertWithGalleryColumns(projectId: string, item: Item) {
  const { images, previewImageIndex } = getItemImages(item);

  return {
    id: item.id,
    project_id: projectId,
    name: item.name,
    short_description: item.shortDescription,
    image_urls: images,
    preview_image_index: previewImageIndex,
    material: item.material,
    size: item.size,
    logo: item.logo,
    pre_production_sample_time: item.preProductionSampleTime,
    pre_production_sample_fee: item.preProductionSampleFee,
    packing_details: item.packingDetails,
    price_tiers: item.priceTiers,
  };
}

function toItemInsertWithLegacyColumn(projectId: string, item: Item) {
  const { images, previewImageIndex } = getItemImages(item);

  return {
    id: item.id,
    project_id: projectId,
    name: item.name,
    short_description: item.shortDescription,
    image_base64: images[previewImageIndex] ?? images[0] ?? null,
    material: item.material,
    size: item.size,
    logo: item.logo,
    pre_production_sample_time: item.preProductionSampleTime,
    pre_production_sample_fee: item.preProductionSampleFee,
    packing_details: item.packingDetails,
    price_tiers: item.priceTiers,
  };
}

async function listItemsFromSupabase(projectId?: string) {
  const projectFilter = projectId ? `&project_id=eq.${projectId}` : "";

  const queryCandidates = [
    `/items?select=id,project_id,name,short_description,image_urls,preview_image_index,image_base64,material,size,logo,pre_production_sample_time,pre_production_sample_fee,packing_details,price_tiers${projectFilter}`,
    `/items?select=id,project_id,name,short_description,image_urls,preview_image_index,material,size,logo,pre_production_sample_time,pre_production_sample_fee,packing_details,price_tiers${projectFilter}`,
    `/items?select=id,project_id,name,short_description,image_base64,material,size,logo,pre_production_sample_time,pre_production_sample_fee,packing_details,price_tiers${projectFilter}`,
  ];

  let lastError: unknown;

  for (const query of queryCandidates) {
    try {
      return await request<SupabaseRowItem[]>(query);
    } catch (error) {
      if (!isMissingColumnError(error)) {
        throw error;
      }
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Could not read items.");
}

export async function listProjectsFromSupabase(): Promise<Project[]> {
  const projectRows = await request<SupabaseRowProject[]>(
    "/projects?select=id,name,client,notes,created_at&order=created_at.desc",
  );

  if (projectRows.length === 0) return [];

  const itemRows = await listItemsFromSupabase();

  return projectRows.map((project) => {
    const items = itemRows
      .filter((item) => item.project_id === project.id)
      .map(toItem);
    return toProject(project, items);
  });
}

export async function getProjectFromSupabase(
  projectId: string,
): Promise<Project | undefined> {
  const projects = await request<SupabaseRowProject[]>(
    `/projects?select=id,name,client,notes,created_at&id=eq.${projectId}&limit=1`,
  );

  const project = projects[0];
  if (!project) return undefined;

  const itemRows = await listItemsFromSupabase(projectId);

  return toProject(project, itemRows.map(toItem));
}

export async function createProjectInSupabase(input: {
  name: string;
  client: string;
  notes?: string;
}): Promise<Project> {
  const rows = await request<SupabaseRowProject[]>(
    "/projects?select=id,name,client,notes,created_at",
    {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify([
        {
          name: input.name,
          client: input.client,
          notes: input.notes ?? null,
        },
      ]),
    },
  );

  const row = rows[0];
  return toProject(row, []);
}

export async function saveProjectInSupabase(project: Project): Promise<Project> {
  const rows = await request<SupabaseRowProject[]>(
    "/projects?id=eq." + project.id + "&select=id,name,client,notes,created_at",
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        name: project.name,
        client: project.client,
        notes: project.notes ?? null,
      }),
    },
  );

  const row = rows[0];
  if (!row) {
    throw new Error("Project not found while updating.");
  }

  const current = await getProjectFromSupabase(project.id);
  return toProject(row, current?.items ?? []);
}

async function upsertItemWithPayload(payload: unknown) {
  return request<SupabaseRowItem[]>("/items?on_conflict=id&select=id", {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify([payload]),
  });
}

export async function upsertItemInSupabase(
  projectId: string,
  item: Item,
): Promise<Project | undefined> {
  const { images, previewImageIndex } = getItemImages(item);

  // Upload any data-URL images to Supabase Storage; keep existing http(s) URLs
  let imageUrls = images;
  if (images.some((s) => s.startsWith("data:"))) {
    imageUrls = await uploadItemImages(images, item.id);
  }

  const itemWithStorageUrls: Item = {
    ...item,
    images: imageUrls,
    previewImageIndex,
  };

  // Backup: store preview image as base64 when it was originally base64
  const backupBase64 =
    images.length > 0 && images[0]!.startsWith("data:")
      ? images[previewImageIndex] ?? images[0] ?? null
      : null;

  const legacyPayload = {
    ...toItemInsertWithLegacyColumn(projectId, itemWithStorageUrls),
    ...(backupBase64 ? { image_base64: backupBase64 } : {}),
  };
  const fullPayload = {
    ...toItemInsertWithAllImageColumns(projectId, itemWithStorageUrls),
    ...(backupBase64 ? { image_base64: backupBase64 } : {}),
  };
  const galleryPayload = toItemInsertWithGalleryColumns(
    projectId,
    itemWithStorageUrls,
  );

  // When we have multiple images, only use payloads that store image_urls so we don't lose any.
  const payloadCandidates =
    imageUrls.length <= 1
      ? [fullPayload, galleryPayload, legacyPayload]
      : [fullPayload, galleryPayload];

  let lastError: unknown;

  for (const payload of payloadCandidates) {
    try {
      await upsertItemWithPayload(payload);
      return getProjectFromSupabase(projectId);
    } catch (error) {
      if (!isMissingColumnError(error)) {
        throw error;
      }
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Could not save item due to schema mismatch.");
}

export async function deleteItemInSupabase(
  projectId: string,
  itemId: string,
): Promise<Project | undefined> {
  await request<void>(`/items?id=eq.${itemId}`, { method: "DELETE" });
  return getProjectFromSupabase(projectId);
}

export async function deleteProjectInSupabase(
  projectId: string,
): Promise<void> {
  await request<void>(`/items?project_id=eq.${projectId}`, {
    method: "DELETE",
  });
  await request<void>(`/projects?id=eq.${projectId}`, { method: "DELETE" });
}

export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}
