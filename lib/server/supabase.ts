import type { Item, Project } from "@/lib/models";

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
  image_urls: string[] | null;
  preview_image_index: number | null;
  image_base64: string | null;
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

function toItem(row: SupabaseRowItem): Item {
  const fallbackImage = row.image_base64 ?? "";
  const images =
    Array.isArray(row.image_urls) && row.image_urls.length > 0
      ? row.image_urls
      : fallbackImage
        ? [fallbackImage]
        : [];

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

function toItemInsert(projectId: string, item: Item) {
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

export async function listProjectsFromSupabase(): Promise<Project[]> {
  const projectRows = await request<SupabaseRowProject[]>(
    "/projects?select=id,name,client,notes,created_at&order=created_at.desc",
  );

  if (projectRows.length === 0) return [];

  const itemRows = await request<SupabaseRowItem[]>(
    "/items?select=id,project_id,name,short_description,image_urls,preview_image_index,image_base64,material,size,logo,pre_production_sample_time,pre_production_sample_fee,packing_details,price_tiers",
  );

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

  const itemRows = await request<SupabaseRowItem[]>(
    `/items?select=id,project_id,name,short_description,image_urls,preview_image_index,image_base64,material,size,logo,pre_production_sample_time,pre_production_sample_fee,packing_details,price_tiers&project_id=eq.${projectId}`,
  );

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

export async function upsertItemInSupabase(
  projectId: string,
  item: Item,
): Promise<Project | undefined> {
  await request<SupabaseRowItem[]>("/items?on_conflict=id&select=id", {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify([toItemInsert(projectId, item)]),
  });

  return getProjectFromSupabase(projectId);
}

export async function deleteItemInSupabase(
  projectId: string,
  itemId: string,
): Promise<Project | undefined> {
  await request<void>(`/items?id=eq.${itemId}`, { method: "DELETE" });
  return getProjectFromSupabase(projectId);
}

export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}
