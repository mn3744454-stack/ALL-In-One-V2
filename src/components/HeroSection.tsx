import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowLeft, Play } from "lucide-react";
import heroImage from "@/assets/hero-horse.jpg";
import { useI18n } from "@/i18n";

const HeroSection = () => {
  const { t, dir } = useI18n();
  const isRTL = dir === 'rtl';
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Arabian horse in golden desert"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="absolute inset-0 bg-navy/40" />
      </div>

      {/* Arabian Pattern Overlay */}
      <div className="absolute inset-0 pattern-arabian opacity-30" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 pt-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cream/10 backdrop-blur-sm border border-cream/20 mb-8 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
            <span className="text-sm text-cream/90 font-medium">
              {t('landing.hero.badge')}
            </span>
          </div>

          {/* Main Heading */}
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-cream mb-6 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            {t('landing.hero.titlePart1')}{" "}
            <span className="text-gradient-gold">{t('landing.hero.titleHighlight')}</span>{" "}
            {t('landing.hero.titlePart2')}
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-cream/80 max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            {t('landing.hero.subtitle')}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: "0.3s" }}>
            <Button variant="hero" size="xl" asChild>
              <Link to="/auth?mode=signup">
                {t('landing.hero.startTrial')}
                <ArrowIcon className="w-5 h-5" />
              </Link>
            </Button>
            <Button variant="hero-outline" size="xl">
              <Play className="w-5 h-5" />
              {t('landing.hero.watchDemo')}
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-16 pt-16 border-t border-cream/10 animate-fade-in" style={{ animationDelay: "0.5s" }}>
            <Stat value="10K+" label={t('landing.hero.statHorses')} />
            <Stat value="500+" label={t('landing.hero.statStables')} />
            <Stat value="98%" label={t('landing.hero.statSatisfaction')} />
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-float">
        <div className="w-6 h-10 rounded-full border-2 border-cream/30 flex items-start justify-center p-2">
          <div className="w-1 h-2 bg-cream/50 rounded-full animate-bounce" />
        </div>
      </div>
    </section>
  );
};

const Stat = ({ value, label }: { value: string; label: string }) => (
  <div className="text-center">
    <div className="font-display text-2xl md:text-4xl font-bold text-gold mb-1">{value}</div>
    <div className="text-sm text-cream/60">{label}</div>
  </div>
);

export default HeroSection;
