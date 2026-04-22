export type ArtApprovalStatus =
  | "draft"
  | "with_designer"
  | "ready_for_client"
  | "approved"
  | "changes_requested";

export type ArtApprovalDecisionType = "approved" | "changes_requested";

export type ArtApprovalSummary = {
  id: string;
  title: string;
  clientName: string;
  status: ArtApprovalStatus;
  round: number;
  optionalProjectId?: string;
  optionalItemId?: string;
  notes?: string;
  reviewTokenHash?: string;
  readyForClientAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type ArtApproval = ArtApprovalSummary;

export type ArtApprovalAllowlistedEmail = {
  id: string;
  artApprovalId: string;
  email: string;
  createdAt: string;
};

export type ArtApprovalFile = {
  id: string;
  artApprovalId: string;
  storagePath: string;
  originalName: string;
  contentType?: string;
  sizeBytes: number;
  uploadedBy: string;
  createdAt: string;
};

export type ArtApprovalDecision = {
  id: string;
  artApprovalId: string;
  round: number;
  decisionType: ArtApprovalDecisionType;
  verifiedEmail: string;
  typedFullName: string;
  comment?: string;
  decidedAt: string;
};

export type ArtApprovalDetail = ArtApprovalSummary & {
  allowlistedEmails: ArtApprovalAllowlistedEmail[];
  files: ArtApprovalFile[];
  decisions: ArtApprovalDecision[];
};

export type CreateArtApprovalInput = {
  title: string;
  clientName: string;
  notes?: string;
  optionalProjectId?: string;
  optionalItemId?: string;
};

export type UpdateArtApprovalInput = {
  title?: string;
  clientName?: string;
  status?: ArtApprovalStatus;
  notes?: string;
  optionalProjectId?: string;
  optionalItemId?: string;
};

export type UpdateArtApprovalAllowlistInput = {
  emails: string[];
};

export type ClientDecisionPayload = {
  decisionType: ArtApprovalDecisionType;
  typedFullName: string;
  comment?: string;
  confirmed: boolean;
};

export type RequestOtpPayload = {
  email: string;
};

export type VerifyOtpPayload = {
  email: string;
  otp: string;
};
