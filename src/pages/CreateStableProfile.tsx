import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Logo from "@/components/Logo";
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail,
  ArrowRight,
  ArrowLeft,
  Upload,
  Camera,
  Stethoscope,
  FlaskConical,
  GraduationCap,
  Heart,
  Pill,
  Gavel,
  Truck,
  User
} from "lucide-react";
import { toast } from "sonner";
import { useTenant } from "@/contexts/TenantContext";
import { useI18n } from "@/i18n/I18nContext";

type TenantType = "stable" | "clinic" | "lab" | "academy" | "pharmacy" | "transport" | "auction" | "horse_owner" | "trainer" | "doctor";

interface CreateStableProfileProps {
  tenantType?: TenantType;
}

const CreateStableProfile = ({ tenantType = "stable" }: CreateStableProfileProps) => {
  const navigate = useNavigate();
  const { createTenant } = useTenant();
  const { t, dir } = useI18n();
  const isRTL = dir === 'rtl';
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    address: "",
    city: "",
    country: t('createProfile.saudiArabia'),
    phone: "",
    email: "",
    capacity: "",
    website: "",
  });

  const tenantTypeConfig: Record<TenantType, { titleKey: string; descriptionKey: string; icon: React.ElementType }> = {
    stable: { titleKey: "createProfile.tenantTypes.stable", descriptionKey: "createProfile.tenantTypes.stableDesc", icon: Building2 },
    clinic: { titleKey: "createProfile.tenantTypes.clinic", descriptionKey: "createProfile.tenantTypes.clinicDesc", icon: Stethoscope },
    lab: { titleKey: "createProfile.tenantTypes.lab", descriptionKey: "createProfile.tenantTypes.labDesc", icon: FlaskConical },
    academy: { titleKey: "createProfile.tenantTypes.academy", descriptionKey: "createProfile.tenantTypes.academyDesc", icon: GraduationCap },
    horse_owner: { titleKey: "createProfile.tenantTypes.horse_owner", descriptionKey: "createProfile.tenantTypes.horse_ownerDesc", icon: Heart },
    pharmacy: { titleKey: "createProfile.tenantTypes.pharmacy", descriptionKey: "createProfile.tenantTypes.pharmacyDesc", icon: Pill },
    transport: { titleKey: "createProfile.tenantTypes.transport", descriptionKey: "createProfile.tenantTypes.transportDesc", icon: Truck },
    auction: { titleKey: "createProfile.tenantTypes.auction", descriptionKey: "createProfile.tenantTypes.auctionDesc", icon: Gavel },
    trainer: { titleKey: "createProfile.tenantTypes.trainer", descriptionKey: "createProfile.tenantTypes.trainerDesc", icon: GraduationCap },
    doctor: { titleKey: "createProfile.tenantTypes.doctor", descriptionKey: "createProfile.tenantTypes.doctorDesc", icon: Stethoscope },
  };

  const config = tenantTypeConfig[tenantType];
  const Icon = config.icon;
  const tenantTitle = t(config.titleKey);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await createTenant({
      name: formData.name,
      type: tenantType,
      description: formData.description,
      address: `${formData.address}, ${formData.city}, ${formData.country}`,
      phone: formData.phone,
      email: formData.email,
    });
    
    if (error) {
      // Build detailed error message from structured error
      const stepLabels: Record<string, string> = {
        validation: t('createProfile.errors.validation'),
        tenant_insert: t('createProfile.errors.tenantInsert'),
        member_insert: t('createProfile.errors.memberInsert'),
      };
      
      const title = stepLabels[error.step] || t('common.error');
      const description = [
        error.message,
        error.code && `Code: ${error.code}`,
        error.hint,
      ].filter(Boolean).join(" • ");
      
      toast.error(title, {
        description: description || undefined,
        duration: 10000,
      });
      
      setLoading(false);
      return;
    }

    toast.success(`${tenantTitle} ${t('createProfile.profileCreatedSuffix')}`);
    navigate("/dashboard");
    setLoading(false);
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const BackArrow = isRTL ? ArrowRight : ArrowLeft;
  const ForwardArrow = isRTL ? ArrowLeft : ArrowRight;

  return (
    <div className="min-h-screen w-full bg-cream pattern-arabian py-8 sm:py-12 px-4 overflow-x-hidden">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <Logo className="justify-center mb-4 sm:mb-6" />
          <div className="flex items-center justify-center gap-2 mb-3 sm:mb-4">
            <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-gold shrink-0" />
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-navy">
              {t('createProfile.createYourProfile')} {tenantTitle}
            </h1>
          </div>
          <p className="text-muted-foreground text-sm sm:text-base">
            {t(config.descriptionKey)}
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-1 sm:gap-2 mb-6 sm:mb-8">
          <StepIndicator step={1} current={step} label={t('createProfile.steps.basicInfo')} />
          <div className="w-6 sm:w-12 h-0.5 bg-border" />
          <StepIndicator step={2} current={step} label={t('createProfile.steps.location')} />
          <div className="w-6 sm:w-12 h-0.5 bg-border" />
          <StepIndicator step={3} current={step} label={t('createProfile.steps.contact')} />
        </div>

        {/* Form Card */}
        <Card variant="elevated" className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-navy">
              {step === 1 && t('createProfile.basicInformation')}
              {step === 2 && t('createProfile.locationDetails')}
              {step === 3 && t('createProfile.contactInformation')}
            </CardTitle>
            <CardDescription>
              {step === 1 && `${t('createProfile.startWithName')} ${tenantTitle}`}
              {step === 2 && `${t('createProfile.helpClientsFind')} ${tenantTitle}`}
              {step === 3 && t('createProfile.howCanPeopleReach')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              {/* Step 1: Basic Info */}
              {step === 1 && (
                <div className="space-y-6">
                  {/* Logo Upload */}
                  <div className="flex justify-center">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-2xl bg-muted border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-gold transition-colors">
                        <Camera className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <button
                        type="button"
                        className={`absolute -bottom-2 ${isRTL ? '-left-2' : '-right-2'} w-8 h-8 rounded-full bg-gold text-navy flex items-center justify-center shadow-md hover:scale-110 transition-transform`}
                      >
                        <Upload className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-center text-sm text-muted-foreground">
                    {t('createProfile.uploadLogo')} {tenantTitle}
                  </p>

                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-navy font-medium">
                      {t('createProfile.nameLabel')} {tenantTitle} *
                    </Label>
                    <div className="relative">
                      <Icon className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="name"
                        placeholder={`${t('createProfile.enterName')} ${tenantTitle}`}
                        value={formData.name}
                        onChange={(e) => updateField("name", e.target.value)}
                        className="ps-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-navy font-medium">
                      {t('createProfile.description')}
                    </Label>
                    <Textarea
                      id="description"
                      placeholder={`${t('createProfile.descriptionPlaceholder')} ${tenantTitle}...`}
                      value={formData.description}
                      onChange={(e) => updateField("description", e.target.value)}
                      rows={4}
                      className="resize-none"
                    />
                  </div>

                  {tenantType === "stable" && (
                    <div className="space-y-2">
                      <Label htmlFor="capacity" className="text-navy font-medium">
                        {t('createProfile.horseCapacity')}
                      </Label>
                      <Input
                        id="capacity"
                        type="number"
                        placeholder={t('createProfile.maxHorses')}
                        value={formData.capacity}
                        onChange={(e) => updateField("capacity", e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Location */}
              {step === 2 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-navy font-medium">
                      {t('createProfile.streetAddress')} *
                    </Label>
                    <div className="relative">
                      <MapPin className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="address"
                        placeholder={t('createProfile.enterStreetAddress')}
                        value={formData.address}
                        onChange={(e) => updateField("address", e.target.value)}
                        className="ps-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-navy font-medium">
                        {t('createProfile.city')} *
                      </Label>
                      <Input
                        id="city"
                        placeholder={t('createProfile.city')}
                        value={formData.city}
                        onChange={(e) => updateField("city", e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country" className="text-navy font-medium">
                        {t('createProfile.country')} *
                      </Label>
                      <Input
                        id="country"
                        placeholder={t('createProfile.country')}
                        value={formData.country}
                        onChange={(e) => updateField("country", e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Map Placeholder */}
                  <div className="w-full h-48 rounded-xl bg-muted border border-border flex items-center justify-center">
                    <p className="text-muted-foreground text-sm">
                      📍 {t('createProfile.mapComingSoon')}
                    </p>
                  </div>
                </div>
              )}

              {/* Step 3: Contact */}
              {step === 3 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-navy font-medium">
                      {t('createProfile.phoneNumber')} *
                    </Label>
                    <div className="relative">
                      <Phone className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+966 XX XXX XXXX"
                        value={formData.phone}
                        onChange={(e) => updateField("phone", e.target.value)}
                        className="ps-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactEmail" className="text-navy font-medium">
                      {t('createProfile.businessEmail')} *
                    </Label>
                    <div className="relative">
                      <Mail className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="contactEmail"
                        type="email"
                        placeholder={`${tenantTitle.toLowerCase()}@example.com`}
                        value={formData.email}
                        onChange={(e) => updateField("email", e.target.value)}
                        className="ps-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website" className="text-navy font-medium">
                      {t('createProfile.websiteOptional')}
                    </Label>
                    <Input
                      id="website"
                      type="url"
                      placeholder={`https://www.your${tenantTitle.toLowerCase()}.com`}
                      value={formData.website}
                      onChange={(e) => updateField("website", e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 mt-8 pt-6 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full sm:w-auto"
                  onClick={() => step > 1 ? setStep(step - 1) : navigate("/select-role")}
                >
                  <BackArrow className={`w-4 h-4 ${isRTL ? 'ms-2' : 'me-2'}`} />
                  {t('common.back')}
                </Button>

                {step < 3 ? (
                  <Button
                    type="button"
                    variant="gold"
                    className="w-full sm:w-auto"
                    onClick={() => setStep(step + 1)}
                    disabled={step === 1 && !formData.name}
                  >
                    {t('createProfile.continue')}
                    <ForwardArrow className={`w-4 h-4 ${isRTL ? 'me-2' : 'ms-2'}`} />
                  </Button>
                ) : (
                  <Button type="submit" variant="gold" className="w-full sm:w-auto" disabled={loading}>
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-navy/30 border-t-navy rounded-full animate-spin" />
                        {t('createProfile.creating')}
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        {t('createProfile.completeSetup')}
                        <ForwardArrow className="w-4 h-4" />
                      </span>
                    )}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const StepIndicator = ({ step, current, label }: { step: number; current: number; label: string }) => (
  <div className="flex flex-col items-center gap-1 sm:gap-2">
    <div
      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold transition-all ${
        current >= step
          ? "bg-gold text-navy"
          : "bg-muted text-muted-foreground"
      }`}
    >
      {step}
    </div>
    <span className={`text-[10px] sm:text-xs font-medium hidden sm:block ${current >= step ? "text-navy" : "text-muted-foreground"}`}>
      {label}
    </span>
  </div>
);

export default CreateStableProfile;
