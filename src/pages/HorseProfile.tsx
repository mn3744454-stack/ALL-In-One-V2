import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  User,
  Ruler,
  FileText
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { 
  getCurrentAgeParts, 
  formatCurrentAge, 
  getHorseTypeLabel, 
  getHorseTypeBadgeProps 
} from "@/lib/horseClassification";
import { HorseWizard, HorseData } from "@/components/horses/HorseWizard";
import { OwnershipTimeline } from "@/components/horses/OwnershipTimeline";
import { CurrentOwnership } from "@/components/horses/CurrentOwnership";
import { HorseLabSection } from "@/components/laboratory/HorseLabSection";
import { HorseVetSection } from "@/components/vet/HorseVetSection";
import { HorseAssignedStaff } from "@/components/hr/HorseAssignedStaff";
import { HorseSharesPanel } from "@/components/horses/HorseSharesPanel";
import { useI18n } from "@/i18n";

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
  breed_data?: { name: string } | null;
  color_data?: { name: string } | null;
  branch_data?: { name: string } | null;
  stable_data?: { name: string } | null;
}

const HorseProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, dir } = useI18n();
  const [horse, setHorse] = useState<Horse | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditWizard, setShowEditWizard] = useState(false);

  useEffect(() => {
    if (id) {
      fetchHorse();
    }
  }, [id]);

  const fetchHorse = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("horses")
        .select(`
          *,
          breed_data:horse_breeds(name),
          color_data:horse_colors(name),
          branch_data:branches!branch_id(name),
          stable_data:stables(name)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      setHorse(data);
    } catch (error: any) {
      console.error("Error fetching horse:", error);
      toast({
        title: "Error",
        description: "Failed to load horse details",
        variant: "destructive",
      });
      navigate("/dashboard/horses");
    } finally {
      setLoading(false);
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
        title: "Horse deleted",
        description: `${horse.name} has been removed.`,
      });
      navigate("/dashboard/horses");
    } catch (error: any) {
      console.error("Error deleting horse:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete horse",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!horse) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <h2 className="font-display text-xl font-semibold text-navy mb-2">Horse not found</h2>
          <Button onClick={() => navigate("/dashboard/horses")}>Go Back</Button>
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

  return (
    <div className="min-h-screen bg-background" dir={dir}>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
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
          
          <div className="flex items-center gap-1.5 sm:gap-2">
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
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-3 sm:p-4 lg:p-8 space-y-4 sm:space-y-6">
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
                    {typeBadgeProps.label}
                  </Badge>
                  <Badge variant="secondary" className={horse.status === 'active' ? 'bg-success/10 text-success' : ''}>
                    {horse.status || 'draft'}
                  </Badge>
                </div>
                
                <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-1">
                  {horse.name}
                </h1>
                {horse.name_ar && (
                  <p className="text-base sm:text-lg text-muted-foreground mb-3" dir="rtl">
                    {horse.name_ar}
                  </p>
                )}

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
                      {horse.branch_data.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details Grid */}
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

          {/* Pedigree */}
          <Card>
            <CardHeader className="pb-2 sm:pb-4">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-gold" />
                {t('horses.profile.pedigree')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 sm:space-y-3">
              {horse.father_name && (
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-muted-foreground">{t('horses.profile.sire')}</span>
                  <span className="font-medium">{horse.father_name}</span>
                </div>
              )}
              {horse.mother_name && (
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-muted-foreground">{t('horses.profile.dam')}</span>
                  <span className="font-medium">{horse.mother_name}</span>
                </div>
              )}
              {!horse.father_name && !horse.mother_name && (
                <p className="text-muted-foreground text-xs sm:text-sm">{t('horses.profile.noPedigree')}</p>
              )}
            </CardContent>
          </Card>

          {/* Location */}
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
                  <span className="font-medium">{horse.branch_data.name}</span>
                </div>
              )}
              {horse.stable_data?.name && (
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-muted-foreground">{t('horses.profile.stable')}</span>
                  <span className="font-medium">{horse.stable_data.name}</span>
                </div>
              )}
              {!horse.branch_data?.name && !horse.stable_data?.name && (
                <p className="text-muted-foreground text-xs sm:text-sm">{t('horses.profile.noLocation')}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Media Gallery */}
        {((horse.images && horse.images.length > 0) || (horse.videos && horse.videos.length > 0)) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">{t('horses.profile.mediaGallery')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-4">
                {horse.images?.map((url, index) => (
                  <div key={`img-${index}`} className="aspect-square rounded-lg sm:rounded-xl overflow-hidden bg-muted">
                    <img src={url} alt={`${horse.name} ${index + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
                {horse.videos?.map((url, index) => (
                  <div key={`vid-${index}`} className="aspect-square rounded-lg sm:rounded-xl overflow-hidden bg-muted">
                    <video src={url} className="w-full h-full object-cover" controls />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
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

        {/* Vet & Health Section */}
        <HorseVetSection horseId={horse.id} horseName={horse.name} />

        {/* Laboratory Section */}
        <HorseLabSection horseId={horse.id} horseName={horse.name} />

        {/* Assigned Staff Section */}
        <HorseAssignedStaff horseId={horse.id} horseName={horse.name} />

        {/* Current Ownership */}
        <CurrentOwnership horseId={horse.id} horseName={horse.name} />

        {/* Ownership Timeline */}
        <OwnershipTimeline horseId={horse.id} />

        {/* Sharing Links */}
        <HorseSharesPanel horseId={horse.id} horseName={horse.name} />
      </main>

      {/* Edit Wizard */}
      <HorseWizard
        open={showEditWizard}
        onOpenChange={setShowEditWizard}
        mode="edit"
        existingHorse={horse as HorseData}
        onSuccess={() => {
          setShowEditWizard(false);
          fetchHorse();
        }}
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
