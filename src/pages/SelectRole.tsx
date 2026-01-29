import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Logo from "@/components/Logo";
import { 
  Building2, 
  Stethoscope, 
  FlaskConical, 
  GraduationCap, 
  User,
  Heart,
  ArrowRight,
  Check
} from "lucide-react";
import { toast } from "sonner";

const roles = [
  {
    id: "horse-owner",
    icon: Heart,
    title: "Horse Owner",
    description: "I own one or more horses and want to manage their health and care.",
    color: "from-rose-500 to-rose-400",
  },
  {
    id: "stable-owner",
    icon: Building2,
    title: "Stable Owner",
    description: "I own or manage a stable and need to manage horses, staff, and clients.",
    color: "from-gold to-gold-light",
  },
  {
    id: "veterinarian",
    icon: Stethoscope,
    title: "Veterinarian",
    description: "I provide veterinary services and need to manage cases and records.",
    color: "from-emerald-500 to-emerald-400",
  },
  {
    id: "lab-owner",
    icon: FlaskConical,
    title: "Lab Owner / Staff",
    description: "I work in a laboratory and need to manage samples and test results.",
    color: "from-blue-500 to-blue-400",
  },
  {
    id: "trainer",
    icon: GraduationCap,
    title: "Trainer / Academy",
    description: "I provide training services and manage students and lessons.",
    color: "from-purple-500 to-purple-400",
  },
  {
    id: "employee",
    icon: User,
    title: "Employee",
    description: "I work at a stable, clinic, or other equestrian business.",
    color: "from-teal-500 to-teal-400",
  },
];

const SelectRole = () => {
  const navigate = useNavigate();
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const toggleRole = (roleId: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId]
    );
  };

  const handleContinue = () => {
    if (selectedRoles.length === 0) {
      toast.error("Please select at least one role");
      return;
    }

    // Navigate based on primary role selection
    if (selectedRoles.includes("stable-owner")) {
      navigate("/create-profile/stable");
    } else if (selectedRoles.includes("veterinarian")) {
      navigate("/create-profile/clinic");
    } else if (selectedRoles.includes("lab-owner")) {
      navigate("/create-profile/lab");
    } else if (selectedRoles.includes("trainer")) {
      navigate("/create-profile/academy");
    } else {
      navigate("/create-profile/owner");
    }
  };

  return (
    <div className="min-h-screen bg-cream pattern-arabian flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <Logo className="justify-center mb-8" />
          <h1 className="font-display text-3xl md:text-4xl font-bold text-navy mb-4">
            What describes you best?
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Select all roles that apply. You can always add more roles later or join additional organizations.
          </p>
        </div>

        {/* Role Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {roles.map((role) => {
            const isSelected = selectedRoles.includes(role.id);
            return (
              <Card
                key={role.id}
                variant="elevated"
                className={`cursor-pointer transition-all duration-300 hover:-translate-y-1 ${
                  isSelected 
                    ? "ring-2 ring-gold border-gold shadow-gold" 
                    : "hover:shadow-lg"
                }`}
                onClick={() => toggleRole(role.id)}
              >
                <CardContent className="p-6 relative">
                  {isSelected && (
                    <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-gold flex items-center justify-center">
                      <Check className="w-4 h-4 text-navy" />
                    </div>
                  )}
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${role.color} flex items-center justify-center mb-4 shadow-lg`}>
                    <role.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-navy mb-2">
                    {role.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {role.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Continue Button */}
        <div className="flex justify-center">
          <Button
            variant="gold"
            size="xl"
            onClick={handleContinue}
            disabled={selectedRoles.length === 0}
            className="min-w-[200px]"
          >
            Continue
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Selected Count */}
        {selectedRoles.length > 0 && (
          <p className="text-center text-sm text-muted-foreground mt-4">
            {selectedRoles.length} role{selectedRoles.length > 1 ? "s" : ""} selected
          </p>
        )}
      </div>
    </div>
  );
};

export default SelectRole;
