// B2.5e Phase 2c — Direct-route fallback for the Contract Document editor.
// Renders the same shared <ContractDocumentEditorBody> used by the
// list-triggered SafeFormDialog. No backend / lifecycle / TipTap changes.
import { useParams } from "react-router-dom";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MobilePageHeader } from "@/components/navigation";
import { useI18n } from "@/i18n";
import { ContractDocumentEditorBody } from "@/contracts/editor/ContractDocumentEditorBody";

export default function DashboardContractDocumentEditor() {
  const { documentId = "" } = useParams();
  const { t } = useI18n();

  return (
    <DashboardShell>
      <MobilePageHeader title={t("contracts.hub.documents")} />
      <div className="p-4 lg:p-8">
        <div className="mx-auto w-full max-w-6xl h-[calc(100vh-9rem)] min-h-[60vh] bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <ContractDocumentEditorBody documentId={documentId} />
        </div>
      </div>
    </DashboardShell>
  );
}
