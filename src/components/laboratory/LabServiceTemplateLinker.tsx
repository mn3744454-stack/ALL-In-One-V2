/**
 * Phase 10: Template → Service linker action component
 * Used in LabTemplatesManager to publish/link a template to a service.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link2, Plus, FileText } from "lucide-react";
import { LabServiceFormDialog } from "./LabServiceFormDialog";
import { useLabServices, type LabService, type CreateLabServiceInput } from "@/hooks/laboratory/useLabServices";
import { useI18n } from "@/i18n";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLabServiceTemplates } from "@/hooks/laboratory/useLabServiceTemplates";

interface Props {
  templateId: string;
  templateName: string;
  templateNameAr?: string | null;
  templateCategory?: string | null;
}

export function LabServiceTemplateLinker({ templateId, templateName, templateNameAr, templateCategory }: Props) {
  const { t } = useI18n();
  const { services, createService, updateService, isCreating, isUpdating } = useLabServices();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<LabService | null>(null);

  const handleCreateNew = async (data: CreateLabServiceInput & { id?: string }) => {
    if (data.id) {
      await updateService(data as CreateLabServiceInput & { id: string });
    } else {
      await createService(data);
    }
  };

  const handleLinkToExisting = (service: LabService) => {
    setSelectedService(service);
    setLinkDialogOpen(false);
    setCreateDialogOpen(true);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Link2 className="h-4 w-4 me-1" />
            Publish / Link
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => { setSelectedService(null); setCreateDialogOpen(true); }}>
            <Plus className="h-4 w-4 me-2" />
            Create New Service
          </DropdownMenuItem>
          {services.length > 0 && (
            <DropdownMenuItem onClick={() => setLinkDialogOpen(true)}>
              <FileText className="h-4 w-4 me-2" />
              Link to Existing Service
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create new service dialog with this template locked */}
      <LabServiceFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        service={selectedService}
        onSubmit={handleCreateNew}
        isLoading={isCreating || isUpdating}
        lockedTemplateId={templateId}
      />

      {/* Pick existing service dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Select Service</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[300px]">
            <div className="space-y-1">
              {services.map((svc) => (
                <div
                  key={svc.id}
                  className="p-3 rounded-md cursor-pointer hover:bg-accent text-sm"
                  onClick={() => handleLinkToExisting(svc)}
                >
                  <div className="font-medium">{svc.name}</div>
                  {svc.name_ar && <div className="text-xs text-muted-foreground" dir="rtl">{svc.name_ar}</div>}
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
