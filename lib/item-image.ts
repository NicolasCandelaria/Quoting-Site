import type { Item } from "@/lib/models";

type ItemImageCompat = Item & {
  imageBase64?: string;
  images?: string[];
  previewImageIndex?: number;
};

export function getItemPreviewImage(item: Item): string {
  const source = item as ItemImageCompat;

  if (typeof source.imageBase64 === "string" && source.imageBase64) {
    return source.imageBase64;
  }

  const images = Array.isArray(source.images) ? source.images : [];
  const previewIndex =
    typeof source.previewImageIndex === "number" ? source.previewImageIndex : 0;

  return images[previewIndex] || images[0] || "";
}
