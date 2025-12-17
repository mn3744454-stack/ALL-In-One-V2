import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";

const plans = [
  {
    name: "Starter",
    description: "Perfect for individual horse owners",
    price: "Free",
    period: "",
    features: [
      "Up to 3 horses",
      "Basic health records",
      "Mobile app access",
      "Community features",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Stable",
    description: "For small to medium stables",
    price: "299",
    period: "/month",
    currency: "SAR",
    features: [
      "Up to 50 horses",
      "Staff management",
      "Financial reports",
      "Clinic integration",
      "Priority support",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    description: "For large operations & businesses",
    price: "Custom",
    period: "",
    features: [
      "Unlimited horses",
      "Multi-location support",
      "Custom integrations",
      "Dedicated account manager",
      "SLA guarantee",
      "White-label options",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

const PricingSection = () => {
  return (
    <section id="pricing" className="py-24 bg-navy">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block px-4 py-1 rounded-full bg-gold/20 text-gold text-sm font-semibold mb-4">
            Simple Pricing
          </span>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-cream mb-4">
            Choose Your <span className="text-gradient-gold">Plan</span>
          </h2>
          <p className="text-cream/70 text-lg">
            Flexible pricing that scales with your needs. Start free and upgrade as you grow.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.name}
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
                    Most Popular
                  </span>
                </div>
              )}
              <CardHeader className="text-center pb-0">
                <CardTitle className="text-cream">{plan.name}</CardTitle>
                <p className="text-sm text-cream/60">{plan.description}</p>
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
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-cream/80">
                      <Check className="w-5 h-5 text-gold flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button 
                  variant={plan.popular ? "gold" : "hero-outline"} 
                  className="w-full"
                  asChild
                >
                  <Link to="/auth?mode=signup">{plan.cta}</Link>
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
