import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useI18n } from "@/i18n";
import { Plus, MapPin, Pencil } from "lucide-react";
import { useLocations, type Location, type CreateLocationData } from "@/hooks/movement/useLocations";
import { Badge } from "@/components/ui/badge";

export function LocationsManager() {
  const { t } = useI18n();
  const { locations, activeLocations, canManage, createLocation, updateLocation, toggleLocationActive, isCreating, isUpdating } = useLocations();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [formData, setFormData] = useState<CreateLocationData>({
    name: "",
    city: "",
    address: "",
  });

  const handleOpenCreate = () => {
    setEditingLocation(null);
    setFormData({ name: "", city: "", address: "" });
    setDialogOpen(true);
  };

  const handleOpenEdit = (location: Location) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      city: location.city || "",
      address: location.address || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;

    if (editingLocation) {
      await updateLocation({ id: editingLocation.id, name: formData.name, city: formData.city, address: formData.address });
    } else {
      await createLocation(formData);
    }
    setDialogOpen(false);
  };

  const handleToggleActive = async (location: Location) => {
    await toggleLocationActive({ id: location.id, isActive: !location.is_active });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t("movement.locations.title")}</h3>
          <p className="text-sm text-muted-foreground">
            {activeLocations.length} {t("movement.locations.activeLabel")}
          </p>
        </div>
        {canManage && (
          <Button onClick={handleOpenCreate} size="sm">
            <Plus className="h-4 w-4 me-2" />
            {t("movement.locations.addLocation")}
          </Button>
        )}
      </div>

      {/* Locations List */}
      {locations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h4 className="font-medium mb-1">{t("movement.locations.noLocations")}</h4>
            <p className="text-sm text-muted-foreground mb-4">
              {t("movement.locations.addFirst")}
            </p>
            {canManage && (
              <Button onClick={handleOpenCreate}>
                <Plus className="h-4 w-4 me-2" />
                {t("movement.locations.addLocation")}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {locations.map((location) => (
            <Card
              key={location.id}
              className={location.is_active ? "" : "opacity-60"}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-medium truncate">{location.name}</span>
                      {location.is_demo && (
                        <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
                          Demo
                        </Badge>
                      )}
                    </div>
                    {location.city && (
                      <p className="text-sm text-muted-foreground ms-6">{location.city}</p>
                    )}
                    {location.address && (
                      <p className="text-xs text-muted-foreground ms-6 truncate">{location.address}</p>
                    )}
                  </div>
                  
                  {canManage && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleOpenEdit(location)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Switch
                        checked={location.is_active}
                        onCheckedChange={() => handleToggleActive(location)}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingLocation
                ? t("movement.locations.editLocation")
                : t("movement.locations.addLocation")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("movement.locations.name")} *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t("movement.locations.namePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">{t("movement.locations.city")}</Label>
              <Input
                id="city"
                value={formData.city || ""}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder={t("movement.locations.cityPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">{t("movement.locations.address")}</Label>
              <Input
                id="address"
                value={formData.address || ""}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder={t("movement.locations.addressPlaceholder")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name.trim() || isCreating || isUpdating}
            >
              {editingLocation ? t("common.update") : t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
