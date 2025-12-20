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
  GraduationCap
} from "lucide-react";
import { toast } from "sonner";
import { useTenant } from "@/contexts/TenantContext";

type TenantType = "stable" | "clinic" | "lab" | "academy";

interface CreateStableProfileProps {
  tenantType?: TenantType;
}

const tenantTypeConfig: Record<TenantType, { title: string; description: string; icon: React.ElementType }> = {
  stable: { title: "Stable", description: "Manage your stable and horses", icon: Building2 },
  clinic: { title: "Clinic", description: "Veterinary clinic management", icon: Stethoscope },
  lab: { title: "Laboratory", description: "Lab and testing management", icon: FlaskConical },
  academy: { title: "Academy", description: "Training and education center", icon: GraduationCap },
};

const CreateStableProfile = ({ tenantType = "stable" }: CreateStableProfileProps) => {
  const navigate = useNavigate();
  const { createTenant } = useTenant();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    address: "",
    city: "",
    country: "Saudi Arabia",
    phone: "",
    email: "",
    capacity: "",
    website: "",
  });

  const config = tenantTypeConfig[tenantType];
  const Icon = config.icon;

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
        validation: "Validation Error",
        tenant_insert: "Failed to create organization",
        member_insert: "Failed to assign ownership",
      };
      
      const title = stepLabels[error.step] || "Error";
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

    toast.success(`${config.title} profile created successfully!`);
    navigate("/dashboard");
    setLoading(false);
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-cream pattern-arabian py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Logo className="justify-center mb-6" />
          <div className="flex items-center justify-center gap-2 mb-4">
            <Icon className="w-6 h-6 text-gold" />
            <h1 className="font-display text-3xl font-bold text-navy">
              Create Your {config.title} Profile
            </h1>
          </div>
          <p className="text-muted-foreground">
            {config.description}
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <StepIndicator step={1} current={step} label="Basic Info" />
          <div className="w-12 h-0.5 bg-border" />
          <StepIndicator step={2} current={step} label="Location" />
          <div className="w-12 h-0.5 bg-border" />
          <StepIndicator step={3} current={step} label="Contact" />
        </div>

        {/* Form Card */}
        <Card variant="elevated" className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-navy">
              {step === 1 && "Basic Information"}
              {step === 2 && "Location Details"}
              {step === 3 && "Contact Information"}
            </CardTitle>
            <CardDescription>
              {step === 1 && `Start with your ${config.title.toLowerCase()}'s name and description`}
              {step === 2 && `Help clients find your ${config.title.toLowerCase()}`}
              {step === 3 && "How can people reach you?"}
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
                        className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-gold text-navy flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                      >
                        <Upload className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-center text-sm text-muted-foreground">
                    Upload your {config.title.toLowerCase()} logo
                  </p>

                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-navy font-medium">
                      {config.title} Name *
                    </Label>
                    <div className="relative">
                      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="name"
                        placeholder={`Enter your ${config.title.toLowerCase()} name`}
                        value={formData.name}
                        onChange={(e) => updateField("name", e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-navy font-medium">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      placeholder={`Tell us about your ${config.title.toLowerCase()}, facilities, and services...`}
                      value={formData.description}
                      onChange={(e) => updateField("description", e.target.value)}
                      rows={4}
                      className="resize-none"
                    />
                  </div>

                  {tenantType === "stable" && (
                    <div className="space-y-2">
                      <Label htmlFor="capacity" className="text-navy font-medium">
                        Horse Capacity
                      </Label>
                      <Input
                        id="capacity"
                        type="number"
                        placeholder="Maximum number of horses"
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
                      Street Address *
                    </Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="address"
                        placeholder="Enter your street address"
                        value={formData.address}
                        onChange={(e) => updateField("address", e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-navy font-medium">
                        City *
                      </Label>
                      <Input
                        id="city"
                        placeholder="City"
                        value={formData.city}
                        onChange={(e) => updateField("city", e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country" className="text-navy font-medium">
                        Country *
                      </Label>
                      <Input
                        id="country"
                        placeholder="Country"
                        value={formData.country}
                        onChange={(e) => updateField("country", e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Map Placeholder */}
                  <div className="w-full h-48 rounded-xl bg-muted border border-border flex items-center justify-center">
                    <p className="text-muted-foreground text-sm">
                      📍 Map integration coming soon
                    </p>
                  </div>
                </div>
              )}

              {/* Step 3: Contact */}
              {step === 3 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-navy font-medium">
                      Phone Number *
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+966 XX XXX XXXX"
                        value={formData.phone}
                        onChange={(e) => updateField("phone", e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactEmail" className="text-navy font-medium">
                      Business Email *
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="contactEmail"
                        type="email"
                        placeholder={`${config.title.toLowerCase()}@example.com`}
                        value={formData.email}
                        onChange={(e) => updateField("email", e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website" className="text-navy font-medium">
                      Website (Optional)
                    </Label>
                    <Input
                      id="website"
                      type="url"
                      placeholder={`https://www.your${config.title.toLowerCase()}.com`}
                      value={formData.website}
                      onChange={(e) => updateField("website", e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8 pt-6 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => step > 1 ? setStep(step - 1) : navigate("/select-role")}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>

                {step < 3 ? (
                  <Button
                    type="button"
                    variant="gold"
                    onClick={() => setStep(step + 1)}
                    disabled={step === 1 && !formData.name}
                  >
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button type="submit" variant="gold" disabled={loading}>
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-navy/30 border-t-navy rounded-full animate-spin" />
                        Creating...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Complete Setup
                        <ArrowRight className="w-4 h-4" />
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
  <div className="flex flex-col items-center gap-2">
    <div
      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
        current >= step
          ? "bg-gold text-navy"
          : "bg-muted text-muted-foreground"
      }`}
    >
      {step}
    </div>
    <span className={`text-xs font-medium ${current >= step ? "text-navy" : "text-muted-foreground"}`}>
      {label}
    </span>
  </div>
);

export default CreateStableProfile;
