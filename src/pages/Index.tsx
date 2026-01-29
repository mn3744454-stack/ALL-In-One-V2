import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import PricingSection from "@/components/PricingSection";
import Footer from "@/components/Footer";
import { useI18n } from "@/i18n";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <SolutionsSection />
        <PricingSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

// Solutions Section
const SolutionsSection = () => {
  const { t } = useI18n();

  const solutions = [
    {
      titleKey: "landing.solutions.owners.title",
      descKey: "landing.solutions.owners.desc",
      itemKeys: [
        "landing.solutions.owners.item1",
        "landing.solutions.owners.item2",
        "landing.solutions.owners.item3",
        "landing.solutions.owners.item4",
      ],
      featured: false,
    },
    {
      titleKey: "landing.solutions.stables.title",
      descKey: "landing.solutions.stables.desc",
      itemKeys: [
        "landing.solutions.stables.item1",
        "landing.solutions.stables.item2",
        "landing.solutions.stables.item3",
        "landing.solutions.stables.item4",
      ],
      featured: true,
    },
    {
      titleKey: "landing.solutions.vets.title",
      descKey: "landing.solutions.vets.desc",
      itemKeys: [
        "landing.solutions.vets.item1",
        "landing.solutions.vets.item2",
        "landing.solutions.vets.item3",
        "landing.solutions.vets.item4",
      ],
      featured: false,
    },
  ];

  return (
    <section id="solutions" className="py-24 bg-cream-dark">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block px-4 py-1 rounded-full bg-navy/10 text-navy text-sm font-semibold mb-4">
            {t('landing.solutions.badge')}
          </span>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-navy mb-4">
            {t('landing.solutions.titlePart1')} <span className="text-gradient-gold">{t('landing.solutions.titleHighlight')}</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            {t('landing.solutions.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {solutions.map((solution) => (
            <SolutionCard
              key={solution.titleKey}
              title={t(solution.titleKey)}
              description={t(solution.descKey)}
              items={solution.itemKeys.map(key => t(key))}
              featured={solution.featured}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

const SolutionCard = ({ 
  title, 
  description, 
  items, 
  featured = false 
}: { 
  title: string; 
  description: string; 
  items: string[];
  featured?: boolean;
}) => (
  <div className={`rounded-3xl p-8 transition-all duration-300 ${
    featured 
      ? "bg-gradient-to-br from-navy to-navy-light text-cream shadow-navy scale-105" 
      : "bg-card border border-border/50 shadow-md hover:shadow-lg"
  }`}>
    <h3 className={`font-display text-2xl font-bold mb-3 ${featured ? "text-cream" : "text-navy"}`}>
      {title}
    </h3>
    <p className={`text-sm mb-6 ${featured ? "text-cream/80" : "text-muted-foreground"}`}>
      {description}
    </p>
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className={`flex items-center gap-3 text-sm ${featured ? "text-cream/90" : "text-foreground"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${featured ? "bg-gold" : "bg-gold"}`} />
          {item}
        </li>
      ))}
    </ul>
  </div>
);

// CTA Section
const CTASection = () => {
  const { t } = useI18n();

  return (
    <section className="py-24 bg-cream pattern-arabian">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-5xl font-bold text-navy mb-6">
            {t('landing.cta.titlePart1')}{" "}
            <span className="text-gradient-gold">{t('landing.cta.titleHighlight')}</span>?
          </h2>
          <p className="text-muted-foreground text-lg mb-10 max-w-2xl mx-auto">
            {t('landing.cta.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/auth?mode=signup"
              className="inline-flex items-center justify-center gap-2 h-14 px-10 rounded-full bg-gradient-to-r from-navy to-navy-light text-cream font-semibold shadow-navy hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
            >
              {t('landing.cta.startTrial')}
            </a>
            <a
              href="#"
              className="inline-flex items-center justify-center gap-2 h-14 px-10 rounded-full border-2 border-navy/20 text-navy font-semibold hover:bg-navy/5 transition-all duration-300"
            >
              {t('landing.cta.scheduleDemo')}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Index;
