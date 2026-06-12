// B2.5e Phase 2c — Contract Template (Form) editor dialog (list → modal).
import { useState } from "react";
import { SafeFormDialog } from "@/components/ui/safe-form-dialog";
import { useRTL } from "@/hooks/useRTL";
import { ContractTemplateEditorBody } from "./ContractTemplateEditorBody";

interface Props {
  templateId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContractTemplateEditorDialog({ templateId, open, onOpenChange }: Props) {
  const { isRTL } = useRTL();
  const [dirty, setDirty] = useState(false);

  return (
    <SafeFormDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setDirty(false);
        onOpenChange(next);
      }}
      isDirty={dirty}
      className="w-[95vw] max-w-6xl max-h-[90vh] p-0 rounded-2xl flex flex-col overflow-hidden gap-0"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {templateId ? (
        <ContractTemplateEditorBody
          templateId={templateId}
          inDialog
          onDirtyChange={setDirty}
          onRequestClose={() => onOpenChange(false)}
        />
      ) : null}
    </SafeFormDialog>
  );
}
