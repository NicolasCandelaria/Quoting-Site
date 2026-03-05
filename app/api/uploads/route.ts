import { NextResponse } from "next/server";
import {
  uploadFile,
  isSupabaseStorageConfigured,
} from "@/lib/server/supabase-storage";

export async function POST(request: Request) {
  if (!isSupabaseStorageConfigured()) {
    return NextResponse.json(
      { error: "Supabase Storage is not configured." },
      { status: 503 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file." }, { status: 400 });
  }

  try {
    const url = await uploadFile(file);
    return NextResponse.json({ url }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
