import { Card, CardContent } from "@/components/ui/card";
import { 
  Building2, 
  Stethoscope, 
  FlaskConical, 
  GraduationCap, 
  Truck, 
  Gavel,
  Users,
  Globe,
  LucideIcon
} from "lucide-react";
import { useI18n } from "@/i18n";

interface FeatureConfig {
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
  color: string;
}

const featureConfigs: FeatureConfig[] = [
  {
    icon: Building2,
    titleKey: "landing.features.stable.title",
    descKey: "landing.features.stable.desc",
    color: "from-gold to-gold-light",
  },
  {
    icon: Stethoscope,
    titleKey: "landing.features.clinic.title",
    descKey: "landing.features.clinic.desc",
    color: "from-emerald-500 to-emerald-400",
  },
  {
    icon: FlaskConical,
    titleKey: "landing.features.lab.title",
    descKey: "landing.features.lab.desc",
    color: "from-blue-500 to-blue-400",
  },
  {
    icon: GraduationCap,
    titleKey: "landing.features.academy.title",
    descKey: "landing.features.academy.desc",
    color: "from-purple-500 to-purple-400",
  },
  {
    icon: Truck,
    titleKey: "landing.features.transport.title",
    descKey: "landing.features.transport.desc",
    color: "from-orange-500 to-orange-400",
  },
  {
    icon: Gavel,
    titleKey: "landing.features.auctions.title",
    descKey: "landing.features.auctions.desc",
    color: "from-rose-500 to-rose-400",
  },
  {
    icon: Users,
    titleKey: "landing.features.multiTenant.title",
    descKey: "landing.features.multiTenant.desc",
    color: "from-teal-500 to-teal-400",
  },
  {
    icon: Globe,
    titleKey: "landing.features.multiLang.title",
    descKey: "landing.features.multiLang.desc",
    color: "from-indigo-500 to-indigo-400",
  },
];

const FeaturesSection = () => {
  const { t } = useI18n();

  return (
    <section id="features" className="py-24 bg-cream pattern-arabian">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block px-4 py-1 rounded-full bg-gold/10 text-gold text-sm font-semibold mb-4">
            {t('landing.features.badge')}
          </span>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-navy mb-4">
            {t('landing.features.titlePart1')}{" "}
            <span className="text-gradient-gold">{t('landing.features.titleHighlight')}</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            {t('landing.features.subtitle')}
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {featureConfigs.map((feature, index) => (
            <Card 
              key={feature.titleKey}
              variant="elevated"
              className="group hover:-translate-y-1 cursor-pointer"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardContent className="p-6">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-display text-lg font-semibold text-navy mb-2">
                  {t(feature.titleKey)}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t(feature.descKey)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
