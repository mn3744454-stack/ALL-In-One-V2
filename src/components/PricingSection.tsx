import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import { useI18n } from "@/i18n";

const PricingSection = () => {
  const { t } = useI18n();

  const plans = [
    {
      nameKey: "landing.pricing.starter.name",
      descKey: "landing.pricing.starter.desc",
      price: t('landing.pricing.free'),
      period: "",
      featuresKeys: [
        "landing.pricing.starter.feature1",
        "landing.pricing.starter.feature2",
        "landing.pricing.starter.feature3",
        "landing.pricing.starter.feature4",
      ],
      ctaKey: "landing.pricing.starter.cta",
      popular: false,
    },
    {
      nameKey: "landing.pricing.stable.name",
      descKey: "landing.pricing.stable.desc",
      price: "299",
      period: t('landing.pricing.perMonth'),
      currency: t('landing.pricing.currency'),
      featuresKeys: [
        "landing.pricing.stable.feature1",
        "landing.pricing.stable.feature2",
        "landing.pricing.stable.feature3",
        "landing.pricing.stable.feature4",
        "landing.pricing.stable.feature5",
      ],
      ctaKey: "landing.pricing.stable.cta",
      popular: true,
    },
    {
      nameKey: "landing.pricing.enterprise.name",
      descKey: "landing.pricing.enterprise.desc",
      price: t('landing.pricing.custom'),
      period: "",
      featuresKeys: [
        "landing.pricing.enterprise.feature1",
        "landing.pricing.enterprise.feature2",
        "landing.pricing.enterprise.feature3",
        "landing.pricing.enterprise.feature4",
        "landing.pricing.enterprise.feature5",
        "landing.pricing.enterprise.feature6",
      ],
      ctaKey: "landing.pricing.enterprise.cta",
      popular: false,
    },
  ];

  return (
    <section id="pricing" className="py-24 bg-navy">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block px-4 py-1 rounded-full bg-gold/20 text-gold text-sm font-semibold mb-4">
            {t('landing.pricing.badge')}
          </span>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-cream mb-4">
            {t('landing.pricing.titlePart1')} <span className="text-gradient-gold">{t('landing.pricing.titleHighlight')}</span>
          </h2>
          <p className="text-cream/70 text-lg">
            {t('landing.pricing.subtitle')}
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.nameKey}
              variant="glass"
              className={`relative ${
                plan.popular 
                  ? "border-gold bg-navy-light scale-105 shadow-gold" 
                  : "bg-navy-light/50 border-cream/10"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 rounded-full bg-gradient-to-r from-gold to-gold-light text-navy text-xs font-bold uppercase tracking-wider">
                    {t('landing.pricing.popular')}
                  </span>
                </div>
              )}
              <CardHeader className="text-center pb-0">
                <CardTitle className="text-cream">{t(plan.nameKey)}</CardTitle>
                <p className="text-sm text-cream/60">{t(plan.descKey)}</p>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="text-center mb-6">
                  <span className="text-4xl md:text-5xl font-display font-bold text-cream">
                    {plan.currency && <span className="text-lg text-cream/60">{plan.currency} </span>}
                    {plan.price}
                  </span>
                  <span className="text-cream/60">{plan.period}</span>
                </div>
                
                <ul className="space-y-3 mb-8">
                  {plan.featuresKeys.map((featureKey) => (
                    <li key={featureKey} className="flex items-center gap-3 text-cream/80">
                      <Check className="w-5 h-5 text-gold flex-shrink-0" />
                      <span className="text-sm">{t(featureKey)}</span>
                    </li>
                  ))}
                </ul>

                <Button 
                  variant={plan.popular ? "gold" : "hero-outline"} 
                  className="w-full"
                  asChild
                >
                  <Link to="/auth?mode=signup">{t(plan.ctaKey)}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
