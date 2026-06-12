// B2.5e Phase 3a — Contract Template (Form) editor dialog with guarded close.
import { useCallback, useRef, useState } from "react";
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
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  busyRef.current = busy;

  const handleDirty = useCallback((d: boolean) => setDirty(d), []);
  const handleBusy = useCallback((b: boolean) => setBusy(b), []);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next && busyRef.current) return;
      if (!next) {
        setDirty(false);
        setBusy(false);
      }
      onOpenChange(next);
    },
    [onOpenChange],
  );

  return (
    <SafeFormDialog
      open={open}
      onOpenChange={handleOpenChange}
      isDirty={dirty}
      className="w-[95vw] max-w-6xl max-h-[90vh] p-0 rounded-2xl flex flex-col overflow-hidden gap-0"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {templateId ? (
        <ContractTemplateEditorBody
          templateId={templateId}
          inDialog
          onDirtyChange={handleDirty}
          onBusyChange={handleBusy}
        />
      ) : null}
    </SafeFormDialog>
  );
}
