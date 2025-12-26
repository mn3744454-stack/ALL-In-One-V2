import { useState, useEffect } from "react";
import { useTenantCapabilities } from "@/hooks/useTenantCapabilities";
import { useHorseOrderTypes } from "@/hooks/useHorseOrderTypes";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sliders, Building2, ExternalLink } from "lucide-react";

interface CapabilitiesManagerProps {
  trigger?: React.ReactNode;
}

export function CapabilitiesManager({ trigger }: CapabilitiesManagerProps) {
  const isMobile = useIsMobile();
  const { capabilities, loading: capLoading, canManage, upsertCapability, getCapabilityForCategory } = useTenantCapabilities();
  const { categories, loading: typesLoading } = useHorseOrderTypes();
  
  const [open, setOpen] = useState(false);

  const loading = capLoading || typesLoading;

  const handleToggle = async (category: string, field: "has_internal" | "allow_external", value: boolean) => {
    const existing = getCapabilityForCategory(category);
    const updates = {
      has_internal: existing?.has_internal ?? false,
      allow_external: existing?.allow_external ?? true,
      [field]: value,
    };
    await upsertCapability(category, updates);
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="gap-2">
      <Sliders className="w-4 h-4" />
      Capabilities
    </Button>
  );

  const content = (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Configure which service modes are available for each order category.
        This determines whether orders can use internal resources, external providers, or both.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No categories defined yet.</p>
          <p className="text-sm">Add order types with categories first.</p>
        </div>
      ) : (
        <ScrollArea className="h-[400px]">
          <div className="space-y-3 pr-4">
            {categories.map((category) => {
              const cap = getCapabilityForCategory(category);
              const hasInternal = cap?.has_internal ?? false;
              const allowExternal = cap?.allow_external ?? true;

              return (
                <Card key={category}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">
                        {category}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Configure available service modes for {category} orders
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <Label htmlFor={`internal-${category}`} className="text-sm font-medium">
                            Internal Resources
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Use your organization's own staff/resources
                          </p>
                        </div>
                      </div>
                      {canManage ? (
                        <Switch
                          id={`internal-${category}`}
                          checked={hasInternal}
                          onCheckedChange={(checked) => handleToggle(category, "has_internal", checked)}
                        />
                      ) : (
                        <Badge variant={hasInternal ? "default" : "secondary"}>
                          {hasInternal ? "Enabled" : "Disabled"}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <Label htmlFor={`external-${category}`} className="text-sm font-medium">
                            External Providers
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Allow third-party service providers
                          </p>
                        </div>
                      </div>
                      {canManage ? (
                        <Switch
                          id={`external-${category}`}
                          checked={allowExternal}
                          onCheckedChange={(checked) => handleToggle(category, "allow_external", checked)}
                        />
                      ) : (
                        <Badge variant={allowExternal ? "default" : "secondary"}>
                          {allowExternal ? "Enabled" : "Disabled"}
                        </Badge>
                      )}
                    </div>

                    {/* Warning if neither is enabled */}
                    {!hasInternal && !allowExternal && (
                      <p className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                        ⚠️ At least one mode should be enabled for orders to be created
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}

      <div className="pt-4 border-t text-xs text-muted-foreground">
        <p className="font-medium mb-1">How it works:</p>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>Internal:</strong> Orders handled by your own team (vet, trainer, etc.)</li>
          <li><strong>External:</strong> Orders outsourced to external providers</li>
          <li>When both are enabled, users can choose during order creation</li>
        </ul>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{trigger || defaultTrigger}</SheetTrigger>
        <SheetContent side="bottom" className="h-[85vh]">
          <SheetHeader>
            <SheetTitle>Service Capabilities</SheetTitle>
          </SheetHeader>
          <div className="mt-4">{content}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Service Capabilities</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
