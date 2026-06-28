import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  ChevronLeft, 
  Heart, 
  Pencil, 
  Trash2, 
  MapPin, 
  Clock, 
  Ruler,
  FileText
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { mapHorseDeleteError } from "@/lib/horseErrorMessages";
import { 
  getCurrentAgeParts, 
  formatCurrentAge, 
  getHorseTypeLabel, 
  getHorseTypeBadgeProps 
} from "@/lib/horseClassification";
import { HorseWizard, HorseData } from "@/components/horses/HorseWizard";
import { OwnershipTimeline } from "@/components/horses/OwnershipTimeline";
import { CurrentOwnership } from "@/components/horses/CurrentOwnership";
import { HorseMediaGallery } from "@/components/horses/HorseMediaGallery";
import { HorseLabSection } from "@/components/laboratory/HorseLabSection";
import { HorseVetSection } from "@/components/vet/HorseVetSection";
import { HorseBreedingSection } from "@/components/breeding/HorseBreedingSection";
import { HorseAssignedStaff } from "@/components/hr/HorseAssignedStaff";
import { HorseSharesPanel } from "@/components/horses/HorseSharesPanel";
import { useI18n, isRTL } from "@/i18n";
import { HorseLocationSection } from "@/components/movement/HorseLocationSection";
import { HorseMovementTimeline } from "@/components/movement/HorseMovementTimeline";
import { HorseLifecycleChip } from "@/components/horses/HorseLifecycleChip";
import { useHorseLifecycleState } from "@/hooks/movement/useHorseLifecycleStates";
import { HorseAdmissionCard } from "@/components/housing/HorseAdmissionCard";
import { HorseProfileCareNotes } from "@/components/housing/HorseProfileCareNotes";
import { HorseProfileCompleteness } from "@/components/horses/HorseProfileCompleteness";
import { PedigreeSection } from "@/components/horses/PedigreeSection";
import { OffspringSection } from "@/components/horses/OffspringSection";
import { BilingualName } from "@/components/ui/BilingualName";
import { useHorseFile } from "@/hooks/useHorseFile";
import { useHorseFileAccess } from "@/hooks/useHorseFileAccess";
import { HorseAccessBadge } from "@/components/horses/HorseAccessBadge";
import { displayLocationName } from "@/lib/displayHelpers";

interface Horse {
  id: string;
  name: string;
  name_ar?: string | null;
  gender: string;
  status?: string | null;
  birth_date?: string | null;
  birth_at?: string | null;
  avatar_url?: string | null;
  breed?: string | null;
  color?: string | null;
  is_gelded?: boolean;
  breeding_role?: string | null;
  height?: number | null;
  weight?: number | null;
  microchip_number?: string | null;
  passport_number?: string | null;
  ueln?: string | null;
  notes?: string | null;
  mane_marks?: string | null;
  body_marks?: string | null;
  legs_marks?: string | null;
  distinctive_marks_notes?: string | null;
  mother_name?: string | null;
  father_name?: string | null;
  images?: string[] | null;
  videos?: string[] | null;
  current_location_id?: string | null;
  current_area_id?: string | null;
  housing_unit_id?: string | null;
  breed_data?: { name: string } | null;
  color_data?: { name: string } | null;
  branch_data?: { name: string; id: string } | null;
  stable_data?: { name: string } | null;
  area_data?: { id: string; name: string; name_ar: string | null; facility_type?: string | null } | null;
  unit_data?: { id: string; code: string; name: string | null; name_ar: string | null } | null;
}

const HorseProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, dir, lang } = useI18n();
  const queryClient = useQueryClient();
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id ?? activeTenant?.tenant_id ?? null;
  const { horse, loading, refresh: refreshHorse } = useHorseFile(id);
  // Phase 1.e.f.8.1.3 — access envelope is the backend source of truth.
  // Frontend MUST NOT compute the mode itself.
  const { access, loading: accessLoading, isError: accessError } = useHorseFileAccess(id, tenantId);
  const accessMode = access?.mode ?? null;
  // Phase 1.e.f.8.1.3.r1.correction — fail closed.
  // Edit/Delete are allowed only for explicitly confirmed write-capable modes.
  // null/undefined/unknown/error access after load must NOT enable writes.
  const canUseLegacyWriteActions =
    accessMode === "owner_authority" ||
    accessMode === "current_host_operational";
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditWizard, setShowEditWizard] = useState(false);
  // Phase 1.e.f.8.1.4.a — tab shell state is local-only (no URL/deep-link).
  const [activeTab, setActiveTab] = useState<string>("overview");
  const { state: lifecycleState, status: opStatus } = useHorseLifecycleState(id);

  const handleEditSuccess = () => {
    setShowEditWizard(false);
    refreshHorse();
    // Keep horse list in sync after manual edits.
    if (tenantId) {
      queryClient.invalidateQueries({ queryKey: ["horses", tenantId] });
    }
  };

  const handleDelete = async () => {
    if (!horse) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("horses")
        .delete()
        .eq("id", horse.id);

      if (error) throw error;

      toast({
        title: t('horses.horseDeleted'),
        description: t('horses.horseDeletedDesc').replace('{{name}}', horse.name),
      });
      navigate("/dashboard/horses");
    } catch (error: any) {
      const friendly = mapHorseDeleteError(error, t);
      toast({
        title: friendly.title,
        description: friendly.description,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (loading || accessLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Phase 1.e.f.8.1.3.r1.correction — fail closed after load.
  // If the access RPC errored, returned no envelope, returned no mode, or
  // explicitly said no_access, render an isolated safe shell with NO
  // identity (no name, owner, location, tenant, stable, admission).
  const accessUnconfirmedOrDenied =
    accessError || !access || !accessMode || accessMode === "no_access";
  if (accessUnconfirmedOrDenied) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center" dir={dir}>
        <div className="text-center max-w-md px-4">
          <h2 className="font-display text-xl font-semibold text-navy mb-2">
            {t('horses.notFound')}
          </h2>
          <Button onClick={() => navigate("/dashboard/horses")}>{t('common.back')}</Button>
        </div>
      </div>
    );
  }


  if (!horse) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <h2 className="font-display text-xl font-semibold text-navy mb-2">{t('horses.notFound')}</h2>
          <Button onClick={() => navigate("/dashboard/horses")}>{t('common.back')}</Button>
        </div>
      </div>
    );
  }

  const ageParts = getCurrentAgeParts({
    gender: horse.gender,
    birth_date: horse.birth_date,
    birth_at: horse.birth_at,
    is_gelded: horse.is_gelded,
    breeding_role: horse.breeding_role,
  });

  const horseType = getHorseTypeLabel({
    gender: horse.gender,
    birth_date: horse.birth_date,
    birth_at: horse.birth_at,
    is_gelded: horse.is_gelded,
    breeding_role: horse.breeding_role,
  });

  const typeBadgeProps = getHorseTypeBadgeProps(horseType);
  const formattedAge = formatCurrentAge(ageParts);
  const breedName = horse.breed_data?.name || horse.breed || t('horses.unknownBreed');
  const colorName = horse.color_data?.name || horse.color;

  const isIntakeDraft = horse.status === 'intake_draft';

  return (
    <div className="h-dvh flex flex-col bg-background overflow-hidden" dir={dir}>
      {/* Header — sits above the scroll region, always visible */}
      <header className="shrink-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border/50 shadow-sm">
        <div className="flex items-center justify-between h-14 sm:h-16 px-3 sm:px-4 lg:px-8 max-w-6xl mx-auto">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate("/dashboard/horses")}
            className="gap-1 sm:gap-2"
          >
            <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
            <span className="hidden sm:inline">{t('horses.backToHorses')}</span>
          </Button>
          
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
            {accessMode && <HorseAccessBadge mode={accessMode} snapshotOnly={access?.snapshot_only} />}
            {canUseLegacyWriteActions && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 sm:gap-2 h-8 sm:h-9 px-2 sm:px-3"
                  onClick={() => setShowEditWizard(true)}
                >
                  <Pencil className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('common.edit')}</span>
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1 sm:gap-2 h-8 sm:h-9 px-2 sm:px-3"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('common.delete')}</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-6xl mx-auto p-3 sm:p-4 lg:p-8">
        {/*
          Phase 1.e.f.8.1.4.a — Tab Shell Only.
          The tab shell sits inside the existing access-gated render path; the
          fail-closed shell (see top of this component) is unchanged and still
          short-circuits no_access / error / null envelopes BEFORE this code
          runs. Tab state is local; no URL/deep-link, no projection RPC, no
          new data hook. Sections are the same legacy components, only
          reorganized.
        */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <TabsList className="w-full justify-start overflow-x-auto flex-nowrap h-auto p-1">
            <TabsTrigger value="overview" className="shrink-0">
              {t('horses.profile.tabs.overview')}
            </TabsTrigger>
            <TabsTrigger value="housing-movement" className="shrink-0">
              {t('horses.profile.tabs.housingMovement')}
            </TabsTrigger>
            <TabsTrigger value="pedigree-breeding" className="shrink-0">
              {t('horses.profile.tabs.pedigreeBreeding')}
            </TabsTrigger>
            <TabsTrigger value="more" className="shrink-0">
              {t('horses.profile.tabs.more')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 sm:space-y-6 mt-0">
            {/* Hero Section */}
            <Card variant="elevated">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
                  {/* Avatar */}
                  <div className="relative w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-2xl bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center shrink-0 overflow-hidden">
                    {horse.avatar_url ? (
                      <img
                        src={horse.avatar_url}
                        alt={horse.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Heart className="w-10 sm:w-16 h-10 sm:h-16 text-gold" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 text-center sm:text-start">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
                      <Badge className={typeBadgeProps.className}>
                        {isRTL(lang) ? typeBadgeProps.labelAr : typeBadgeProps.label}
                      </Badge>
                      {opStatus !== 'unknown' ? (
                        <HorseLifecycleChip state={lifecycleState} size="sm" />
                      ) : isIntakeDraft ? (
                        <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30">
                          {t('horses.status.intake_draft')}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className={horse.status === 'active' ? 'bg-success/10 text-success' : ''}>
                          {t(`horses.status.${horse.status || 'draft'}`)}
                        </Badge>
                      )}
                    </div>

                    <BilingualName
                      name={horse.name}
                      nameAr={horse.name_ar}
                      primaryClassName="font-display text-xl sm:text-2xl md:text-3xl font-bold text-foreground"
                      secondaryClassName="text-base sm:text-lg"
                      className="mb-3"
                    />

                    <p className="text-sm sm:text-base text-muted-foreground mb-4">
                      {breedName}
                      {colorName && ` • ${colorName}`}
                    </p>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                      {ageParts && (
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          {formattedAge}
                        </span>
                      )}
                      {horse.branch_data?.name && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          {displayLocationName(horse.branch_data.name, (horse.branch_data as any).name_ar, (horse.branch_data as any).city, lang)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Profile Completeness Warning */}
            <HorseProfileCompleteness horse={horse} onEdit={() => setShowEditWizard(true)} />

            {/* Active Admission Card */}
            <HorseAdmissionCard horseId={horse.id} />

            {/* Details Grid: Physical Specs + Identification + Location summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* Physical Specs */}
              <Card>
                <CardHeader className="pb-2 sm:pb-4">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Ruler className="w-4 h-4 sm:w-5 sm:h-5 text-gold" />
                    {t('horses.profile.physicalSpecs')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 sm:space-y-3">
                  {horse.height && (
                    <div className="flex justify-between text-sm sm:text-base">
                      <span className="text-muted-foreground">{t('horses.profile.height')}</span>
                      <span className="font-medium">{horse.height} cm</span>
                    </div>
                  )}
                  {horse.weight && (
                    <div className="flex justify-between text-sm sm:text-base">
                      <span className="text-muted-foreground">{t('horses.profile.weight')}</span>
                      <span className="font-medium">{horse.weight} kg</span>
                    </div>
                  )}
                  {!horse.height && !horse.weight && (
                    <p className="text-muted-foreground text-xs sm:text-sm">{t('horses.profile.noPhysicalSpecs')}</p>
                  )}
                </CardContent>
              </Card>

              {/* Identification */}
              <Card>
                <CardHeader className="pb-2 sm:pb-4">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-gold" />
                    {t('horses.profile.identification')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 sm:space-y-3">
                  {horse.microchip_number && (
                    <div className="flex justify-between text-sm sm:text-base">
                      <span className="text-muted-foreground">{t('horses.profile.microchip')}</span>
                      <span className="font-mono text-xs sm:text-sm">{horse.microchip_number}</span>
                    </div>
                  )}
                  {horse.passport_number && (
                    <div className="flex justify-between text-sm sm:text-base">
                      <span className="text-muted-foreground">{t('horses.profile.passport')}</span>
                      <span className="font-mono text-xs sm:text-sm">{horse.passport_number}</span>
                    </div>
                  )}
                  {horse.ueln && (
                    <div className="flex justify-between text-sm sm:text-base">
                      <span className="text-muted-foreground">{t('horses.profile.ueln')}</span>
                      <span className="font-mono text-xs sm:text-sm">{horse.ueln}</span>
                    </div>
                  )}
                  {!horse.microchip_number && !horse.passport_number && !horse.ueln && (
                    <p className="text-muted-foreground text-xs sm:text-sm">{t('horses.profile.noIdentification')}</p>
                  )}
                </CardContent>
              </Card>

              {/* Location summary card */}
              <Card>
                <CardHeader className="pb-2 sm:pb-4">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-gold" />
                    {t('horses.profile.location')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 sm:space-y-3">
                  {horse.branch_data?.name && (
                    <div className="flex justify-between text-sm sm:text-base">
                      <span className="text-muted-foreground">{t('horses.profile.branch')}</span>
                      <span className="font-medium">
                        {displayLocationName(horse.branch_data.name, (horse.branch_data as any).name_ar, (horse.branch_data as any).city, lang)}
                      </span>
                    </div>
                  )}
                  {horse.area_data?.name && (
                    <div className="flex justify-between text-sm sm:text-base">
                      <span className="text-muted-foreground">{t('housing.admissions.detail.facility')}</span>
                      <span className="font-medium">
                        {displayLocationName(horse.area_data.name, horse.area_data.name_ar, null, lang)}
                        {horse.area_data.facility_type && (
                          <span className="text-muted-foreground text-sm ms-1">({t(`housing.facilityTypes.${horse.area_data.facility_type}`)})</span>
                        )}
                      </span>
                    </div>
                  )}
                  {horse.unit_data && (
                    <div className="flex justify-between text-sm sm:text-base">
                      <span className="text-muted-foreground">{t('housing.admissions.detail.unit')}</span>
                      <span className="font-medium">
                        {horse.unit_data.code}
                        {(horse.unit_data.name || horse.unit_data.name_ar) && (
                          <> — {displayLocationName(horse.unit_data.name, horse.unit_data.name_ar, null, lang)}</>
                        )}
                      </span>
                    </div>
                  )}
                  {!horse.branch_data?.name && !horse.area_data?.name && (
                    <p className="text-muted-foreground text-xs sm:text-sm">{t('horses.profile.noLocation')}</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="housing-movement" className="space-y-4 sm:space-y-6 mt-0">
            <HorseLocationSection
              horseId={horse.id}
              currentLocation={horse.branch_data ? { id: horse.branch_data.id, name: horse.branch_data.name, name_ar: (horse.branch_data as any).name_ar ?? null, city: (horse.branch_data as any).city ?? null } : null}
              currentArea={horse.area_data}
              currentUnit={horse.unit_data}
              homeLocation={horse.branch_data ? { id: horse.branch_data.id, name: horse.branch_data.name, name_ar: (horse.branch_data as any).name_ar ?? null, city: (horse.branch_data as any).city ?? null } : null}
            />
            <HorseMovementTimeline horseId={horse.id} />
            <HorseProfileCareNotes horseId={horse.id} />
          </TabsContent>

          <TabsContent value="pedigree-breeding" className="space-y-4 sm:space-y-6 mt-0">
            <PedigreeSection
              horseId={horse.id}
              fatherName={horse.father_name}
              motherName={horse.mother_name}
            />
            <OffspringSection horseId={horse.id} gender={horse.gender} />
            <HorseBreedingSection
              horseId={horse.id}
              horseName={horse.name}
              gender={horse.gender}
              birthDate={horse.birth_date}
              birthAt={horse.birth_at}
              isGelded={horse.is_gelded}
              breedingRole={horse.breeding_role}
            />
          </TabsContent>

          <TabsContent value="more" className="space-y-4 sm:space-y-6 mt-0">
            <HorseMediaGallery
              images={horse.images}
              videos={horse.videos}
              horseName={horse.name}
            />
            {horse.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">{t('horses.profile.notes')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm whitespace-pre-wrap">{horse.notes}</p>
                </CardContent>
              </Card>
            )}
            <HorseVetSection horseId={horse.id} horseName={horse.name} />
            <HorseLabSection horseId={horse.id} horseName={horse.name} />
            <HorseAssignedStaff horseId={horse.id} horseName={horse.name} />
            <CurrentOwnership horseId={horse.id} horseName={horse.name} />
            <OwnershipTimeline horseId={horse.id} />
            <HorseSharesPanel horseId={horse.id} horseName={horse.name} />
          </TabsContent>
        </Tabs>
        </div>
      </main>

      {/* Edit Wizard */}
      <HorseWizard
        open={showEditWizard}
        onOpenChange={setShowEditWizard}
        mode="edit"
        existingHorse={horse as HorseData}
        onSuccess={handleEditSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('horses.deleteConfirm.title').replace('{{name}}', horse.name)}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('horses.deleteConfirm.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? t('horses.deleteConfirm.deleting') : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default HorseProfile;
