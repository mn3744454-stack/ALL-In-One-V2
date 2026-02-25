import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import Logo from "@/components/Logo";
import { 
  Building2, 
  Stethoscope, 
  FlaskConical, 
  GraduationCap, 
  Heart,
  ArrowRight,
  Pill,
  Gavel,
  Truck,
} from "lucide-react";
import { useI18n } from "@/i18n/I18nContext";

const SelectRole = () => {
  const navigate = useNavigate();
  const { t, dir } = useI18n();
  const isRTL = dir === 'rtl';

  const roles = [
    {
      id: "horse-owner",
      icon: Heart,
      titleKey: "selectRole.horseOwner",
      descriptionKey: "selectRole.horseOwnerDesc",
      color: "from-rose-500 to-rose-400",
    },
    {
      id: "stable-owner",
      icon: Building2,
      titleKey: "selectRole.stableOwner",
      descriptionKey: "selectRole.stableOwnerDesc",
      color: "from-gold to-gold-light",
    },
    {
      id: "veterinarian",
      icon: Stethoscope,
      titleKey: "selectRole.veterinarian",
      descriptionKey: "selectRole.veterinarianDesc",
      color: "from-emerald-500 to-emerald-400",
    },
    {
      id: "doctor",
      icon: Stethoscope,
      titleKey: "selectRole.doctor",
      descriptionKey: "selectRole.doctorDesc",
      color: "from-cyan-500 to-cyan-400",
    },
    {
      id: "lab-owner",
      icon: FlaskConical,
      titleKey: "selectRole.labOwner",
      descriptionKey: "selectRole.labOwnerDesc",
      color: "from-blue-500 to-blue-400",
    },
    {
      id: "trainer",
      icon: GraduationCap,
      titleKey: "selectRole.trainer",
      descriptionKey: "selectRole.trainerDesc",
      color: "from-purple-500 to-purple-400",
    },
    {
      id: "academy",
      icon: GraduationCap,
      titleKey: "selectRole.academy",
      descriptionKey: "selectRole.academyDesc",
      color: "from-violet-500 to-violet-400",
    },
    {
      id: "pharmacy",
      icon: Pill,
      titleKey: "selectRole.pharmacy",
      descriptionKey: "selectRole.pharmacyDesc",
      color: "from-orange-500 to-orange-400",
    },
    {
      id: "transport",
      icon: Truck,
      titleKey: "selectRole.transport",
      descriptionKey: "selectRole.transportDesc",
      color: "from-amber-600 to-amber-500",
    },
    {
      id: "auction",
      icon: Gavel,
      titleKey: "selectRole.auction",
      descriptionKey: "selectRole.auctionDesc",
      color: "from-red-500 to-red-400",
    },
  ];

  const roleToRoute: Record<string, string> = {
    "horse-owner": "/create-profile/horse-owner",
    "stable-owner": "/create-profile/stable",
    "veterinarian": "/create-profile/clinic",
    "doctor": "/create-profile/doctor",
    "lab-owner": "/create-profile/lab",
    "trainer": "/create-profile/trainer",
    "academy": "/create-profile/academy",
    "pharmacy": "/create-profile/pharmacy",
    "transport": "/create-profile/transport",
    "auction": "/create-profile/auction",
  };

  const handleSelectRole = (roleId: string) => {
    navigate(roleToRoute[roleId] || "/create-profile/horse-owner");
  };

  return (
    <div className="min-h-screen bg-cream pattern-arabian flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <Logo className="justify-center mb-8" />
          <h1 className="font-display text-3xl md:text-4xl font-bold text-navy mb-4">
            {t('selectRole.title')}
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            {t('selectRole.subtitle')}
          </p>
        </div>

        {/* Role Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {roles.map((role) => (
            <Card
              key={role.id}
              variant="elevated"
              className="cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:ring-2 hover:ring-gold/50"
              onClick={() => handleSelectRole(role.id)}
            >
              <CardContent className="p-6">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${role.color} flex items-center justify-center mb-4 shadow-lg`}>
                  <role.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-display text-lg font-semibold text-navy mb-2">
                  {t(role.titleKey)}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t(role.descriptionKey)}
                </p>
                <div className={`mt-4 flex items-center gap-1 text-sm font-medium text-gold`}>
                  {t('selectRole.continue')}
                  <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SelectRole;
