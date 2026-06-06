// B2.5e production — Contract document JSON model.
// Re-exports the validated prototype shape, promoted to production.
export type {
  Align, FontSizePreset, ColorToken,
  Mark, MarkBold, MarkItalic, MarkUnderline, MarkColor, MarkFontSize,
  TextNode, VariableNode, Inline,
  ParagraphBlock, HeadingBlock, ListItemBlock, BulletListBlock, OrderedListBlock, Block,
  BodyDoc,
  VariableValueType, VariableDef,
  Section, ContractTemplateDoc, VariableValues,
} from "@/contracts/prototype/contractDocTypes";

export const EMPTY_BODY_DOC = {
  type: "doc" as const,
  content: [
    {
      type: "paragraph" as const,
      attrs: { align: "start" as const },
      content: [],
    },
  ],
};

export type ContractType = "boarding" | "training" | "reproduction" | "custom";

export type ContractTemplateStatus = "draft" | "published" | "archived";

export type ContractDocumentStatus =
  | "draft" | "sent_for_review" | "approved" | "rejected" | "cancelled" | "archived";

export interface ContractTemplateRow {
  id: string;
  tenant_id: string;
  contract_type: ContractType;
  name: string;
  name_ar: string | null;
  description: string | null;
  description_ar: string | null;
  status: ContractTemplateStatus;
  current_version_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContractTemplateVersionRow {
  id: string;
  template_id: string;
  version_no: number;
  document_schema_version: number;
  body_json: any;
  variables_json: any[];
  status: ContractTemplateStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContractDocumentRow {
  id: string;
  tenant_id: string;
  contract_type: ContractType;
  source_template_id: string | null;
  source_template_version_id: string | null;
  title: string;
  title_ar: string | null;
  boarding_contract_id: string | null;
  recipient_tenant_id: string | null;
  status: ContractDocumentStatus;
  document_json: any;
  variables_json: any[];
  variable_values: Record<string, string | number | null>;
  snapshot_json: any | null;
  snapshot_taken_at: string | null;
  sent_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContractDocumentEventRow {
  id: string;
  document_id: string;
  event_type: string;
  actor_tenant_id: string | null;
  actor_user_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}
