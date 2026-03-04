import type { Item } from "@/lib/models";

type ItemImageCompat = Item & {
  imageBase64?: string;
  images?: string[];
  previewImageIndex?: number;
};

export function getItemPreviewImage(item: Item): string {
  const source = item as ItemImageCompat;
  const images = Array.isArray(source.images) ? source.images : [];
  const previewIndex =
    typeof source.previewImageIndex === "number" ? source.previewImageIndex : 0;

  if (images[previewIndex]) {
    return images[previewIndex];
  }

  if (images[0]) {
    return images[0];
  }

  return source.imageBase64 ?? "";
}
