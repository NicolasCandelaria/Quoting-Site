export type SourceImage = {
  id: string;
  file: File;
  dataUrl: string;
  naturalWidth: number;
  naturalHeight: number;
  decodeError?: string;
};

export type LayoutImageSlot = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type LayoutRow = {
  height: number;
  yOffset: number;
  images: LayoutImageSlot[];
};

export type CollageLayout = {
  rows: LayoutRow[];
  canvasWidth: number;
  canvasHeight: number;
};

