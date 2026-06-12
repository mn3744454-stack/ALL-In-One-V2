// B2.5e Phase 2c — Direct-route fallback for the Contract Template editor.
// Renders the same shared <ContractTemplateEditorBody> used by the
// list-triggered SafeFormDialog.
import { useParams } from "react-router-dom";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MobilePageHeader } from "@/components/navigation";
import { useI18n } from "@/i18n";
import { ContractTemplateEditorBody } from "@/contracts/editor/ContractTemplateEditorBody";

export default function DashboardContractTemplateEditor() {
  const { templateId = "" } = useParams();
  const { t } = useI18n();

  return (
    <DashboardShell>
      <MobilePageHeader title={t("contracts.hub.forms")} />
      <div className="p-4 lg:p-8">
        <div className="mx-auto w-full max-w-6xl h-[calc(100vh-9rem)] min-h-[60vh] bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <ContractTemplateEditorBody templateId={templateId} />
        </div>
      </div>
    </DashboardShell>
  );
}
