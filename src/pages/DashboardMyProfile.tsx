import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MobilePageHeader } from "@/components/navigation";
import { useI18n } from "@/i18n";
import { useUpdateProfile } from "@/hooks/usePublicProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, User, Phone, MapPin, Globe, FileText, Save } from "lucide-react";

const DashboardMyProfile = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const updateProfile = useUpdateProfile();

  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    bio: "",
    location: "",
    website: "",
  });
  const [isDirty, setIsDirty] = useState(false);

  // Populate form when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        bio: (profile as any).bio || "",
        location: (profile as any).location || "",
        website: (profile as any).website || "",
      });
      setIsDirty(false);
    }
  }, [profile]);

  if (authLoading) {
    return (
      <DashboardShell>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gold" />
        </div>
      </DashboardShell>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleSave = () => {
    updateProfile.mutate({
      full_name: formData.full_name || undefined,
      phone: formData.phone || undefined,
      bio: formData.bio || undefined,
      location: formData.location || undefined,
      website: formData.website || undefined,
    }, {
      onSuccess: () => setIsDirty(false),
    });
  };

  const initials = formData.full_name
    ? formData.full_name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <DashboardShell>
      <MobilePageHeader title={t("myProfile.title")} backTo="/dashboard" />

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="mb-6">
          <h2 className="font-display text-xl font-semibold text-navy mb-1">
            {t("myProfile.title")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("myProfile.subtitle")}
          </p>
        </div>

        {/* Avatar + Name Header */}
        <Card variant="elevated" className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-gold/10 text-gold text-lg font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-lg font-semibold text-navy truncate">
                  {formData.full_name || t("myProfile.unnamed")}
                </h3>
                <p className="text-sm text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Info */}
        <Card variant="elevated" className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-gold" />
              {t("myProfile.personalInfo")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name" className="text-navy font-medium">
                {t("myProfile.fullName")}
              </Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={e => updateField("full_name", e.target.value)}
                placeholder={t("myProfile.fullNamePlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-navy font-medium">
                {t("myProfile.phone")}
              </Label>
              <div className="relative">
                <Phone className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={e => updateField("phone", e.target.value)}
                  placeholder="+966 5XXXXXXXX"
                  className="ps-10"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio" className="text-navy font-medium">
                {t("myProfile.bio")}
              </Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={e => updateField("bio", e.target.value)}
                placeholder={t("myProfile.bioPlaceholder")}
                rows={3}
                className="resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Location & Web */}
        <Card variant="elevated" className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5 text-gold" />
              {t("myProfile.locationAndWeb")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="location" className="text-navy font-medium">
                {t("myProfile.location")}
              </Label>
              <Input
                id="location"
                value={formData.location}
                onChange={e => updateField("location", e.target.value)}
                placeholder={t("myProfile.locationPlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website" className="text-navy font-medium">
                {t("myProfile.website")}
              </Label>
              <div className="relative">
                <Globe className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={e => updateField("website", e.target.value)}
                  placeholder="https://example.com"
                  className="ps-10"
                  dir="ltr"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button
          variant="gold"
          size="lg"
          className="w-full"
          onClick={handleSave}
          disabled={!isDirty || updateProfile.isPending}
        >
          {updateProfile.isPending ? (
            <>
              <Loader2 className="w-4 h-4 me-2 animate-spin" />
              {t("common.saving")}
            </>
          ) : (
            <>
              <Save className="w-4 h-4 me-2" />
              {t("common.save")}
            </>
          )}
        </Button>
      </div>

      {/* Sticky save bar */}
      {isDirty && (
        <div className="fixed bottom-0 inset-x-0 bg-background/95 backdrop-blur-sm border-t border-border p-3 z-50 lg:ps-64">
          <div className="container mx-auto max-w-2xl flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{t("myProfile.unsavedChanges")}</p>
            <Button
              variant="gold"
              size="sm"
              onClick={handleSave}
              disabled={updateProfile.isPending}
            >
              {updateProfile.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t("common.save")
              )}
            </Button>
          </div>
        </div>
      )}
    </DashboardShell>
  );
};

export default DashboardMyProfile;
