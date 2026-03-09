export type PriceTier = {
  qty: number;
  pricePerUnitDDP: number;
  productionPlusTransitTime: string;
};

export type Item = {
  id: string;
  name: string;
  shortDescription: string;
  images: string[];
  previewImageIndex: number;
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
  /**
   * Basis for per-unit pricing displayed in tables and PDFs.
   * "DDP" = Delivered Duty Paid (default), "FOB" = Free On Board.
   */
  pricingBasis: "DDP" | "FOB";
  /**
   * Billboard Worldwide primary contact name for this project.
   */
  contactName?: string;
  /**
   * Quote/project date set by the account manager (e.g. YYYY-MM-DD).
   * Shown in header, on client views, and in PDFs.
   */
  quoteDate?: string;
  items: Item[];
};

export type QuoteSheetStore = {
  projects: Project[];
};

export const STORAGE_KEY = "quoteSheet.v1";
