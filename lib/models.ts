export type PriceTier = {
  qty: number;
  pricePerUnitDDP: number;
  productionPlusTransitTime: string;
};

export type Item = {
  id: string;
  name: string;
  shortDescription: string;
  imageBase64: string;
  material: string;
  size: string;
  logo: string;
  preProductionSampleTime: string;
  preProductionSampleFee: string;
  packingDetails: string;
  priceTiers: PriceTier[];
};

export type Project = {
  id: string;
  name: string;
  client: string;
  notes?: string;
  createdAt: string;
  items: Item[];
};

export type QuoteSheetStore = {
  projects: Project[];
};

export const STORAGE_KEY = "quoteSheet.v1";
