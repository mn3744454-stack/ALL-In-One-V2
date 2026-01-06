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
          branch_data:branches(name),
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
  const breedName = horse.breed_data?.name || horse.breed || "Unknown breed";
  const colorName = horse.color_data?.name || horse.color;

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-cream/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between h-16 px-4 lg:px-8 max-w-6xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/dashboard/horses")}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Horses
          </Button>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={() => setShowEditWizard(true)}
            >
              <Pencil className="w-4 h-4" />
              <span className="hidden sm:inline">Edit</span>
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              className="gap-2"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 lg:p-8 space-y-6">
        {/* Hero Section */}
        <Card variant="elevated">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start gap-6">
              {/* Avatar */}
              <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center shrink-0 overflow-hidden mx-auto md:mx-0">
                {horse.avatar_url ? (
                  <img 
                    src={horse.avatar_url} 
                    alt={horse.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Heart className="w-16 h-16 text-gold" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2">
                  <Badge className={typeBadgeProps.className}>
                    {typeBadgeProps.label}
                  </Badge>
                  <Badge variant="secondary" className={horse.status === 'active' ? 'bg-success/10 text-success' : ''}>
                    {horse.status || 'draft'}
                  </Badge>
                </div>
                
                <h1 className="font-display text-2xl md:text-3xl font-bold text-navy mb-1">
                  {horse.name}
                </h1>
                {horse.name_ar && (
                  <p className="text-lg text-muted-foreground mb-3" dir="rtl">
                    {horse.name_ar}
                  </p>
                )}

                <p className="text-muted-foreground mb-4">
                  {breedName}
                  {colorName && ` • ${colorName}`}
                </p>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-muted-foreground">
                  {ageParts && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      {formattedAge}
                    </span>
                  )}
                  {horse.branch_data?.name && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" />
                      {horse.branch_data.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Physical Specs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Ruler className="w-5 h-5 text-gold" />
                Physical Specifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {horse.height && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Height</span>
                  <span className="font-medium">{horse.height} cm</span>
                </div>
              )}
              {horse.weight && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Weight</span>
                  <span className="font-medium">{horse.weight} kg</span>
                </div>
              )}
              {!horse.height && !horse.weight && (
                <p className="text-muted-foreground text-sm">No physical specs recorded</p>
              )}
            </CardContent>
          </Card>

          {/* Identification */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-gold" />
                Identification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {horse.microchip_number && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Microchip</span>
                  <span className="font-mono text-sm">{horse.microchip_number}</span>
                </div>
              )}
              {horse.passport_number && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Passport</span>
                  <span className="font-mono text-sm">{horse.passport_number}</span>
                </div>
              )}
              {horse.ueln && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">UELN</span>
                  <span className="font-mono text-sm">{horse.ueln}</span>
                </div>
              )}
              {!horse.microchip_number && !horse.passport_number && !horse.ueln && (
                <p className="text-muted-foreground text-sm">No identification recorded</p>
              )}
            </CardContent>
          </Card>

          {/* Pedigree */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5 text-gold" />
                Pedigree
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {horse.father_name && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sire (Father)</span>
                  <span className="font-medium">{horse.father_name}</span>
                </div>
              )}
              {horse.mother_name && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dam (Mother)</span>
                  <span className="font-medium">{horse.mother_name}</span>
                </div>
              )}
              {!horse.father_name && !horse.mother_name && (
                <p className="text-muted-foreground text-sm">No pedigree information recorded</p>
              )}
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5 text-gold" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {horse.branch_data?.name && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Branch</span>
                  <span className="font-medium">{horse.branch_data.name}</span>
                </div>
              )}
              {horse.stable_data?.name && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Stable</span>
                  <span className="font-medium">{horse.stable_data.name}</span>
                </div>
              )}
              {!horse.branch_data?.name && !horse.stable_data?.name && (
                <p className="text-muted-foreground text-sm">No location assigned</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Media Gallery */}
        {((horse.images && horse.images.length > 0) || (horse.videos && horse.videos.length > 0)) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Media Gallery</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {horse.images?.map((url, index) => (
                  <div key={`img-${index}`} className="aspect-square rounded-xl overflow-hidden bg-muted">
                    <img src={url} alt={`${horse.name} ${index + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
                {horse.videos?.map((url, index) => (
                  <div key={`vid-${index}`} className="aspect-square rounded-xl overflow-hidden bg-muted">
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
              <CardTitle className="text-lg">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">{horse.notes}</p>
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
      </main>

      {/* Edit Wizard */}
      <HorseWizard
        open={showEditWizard}
        onOpenChange={setShowEditWizard}
        mode="edit"
        existingHorse={horse as HorseData}
        onSuccess={() => {
          setShowEditWizard(false);
          fetchHorse(); // Refresh data
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {horse.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the horse
              and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default HorseProfile;
