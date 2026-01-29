import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import PricingSection from "@/components/PricingSection";
import Footer from "@/components/Footer";

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
  return (
    <section id="solutions" className="py-24 bg-cream-dark">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block px-4 py-1 rounded-full bg-navy/10 text-navy text-sm font-semibold mb-4">
            Built For Everyone
          </span>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-navy mb-4">
            Solutions for <span className="text-gradient-gold">Every Role</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Whether you own a single horse or manage a large operation, Khail adapts to your needs.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <SolutionCard
            title="Horse Owners"
            description="Track your horse's health, schedule vet visits, and connect with local services."
            items={["Health Records", "Vet Scheduling", "Expense Tracking", "Community Access"]}
          />
          <SolutionCard
            title="Stable Owners"
            description="Manage your entire operation from boarding to staff to financials."
            items={["Boarding Management", "Staff Scheduling", "Billing & Invoices", "Client Portal"]}
            featured
          />
          <SolutionCard
            title="Veterinarians"
            description="Streamline your practice with digital case management and records."
            items={["Case Management", "Digital Records", "Lab Integration", "Client Communication"]}
          />
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
const CTASection = () => (
  <section className="py-24 bg-cream pattern-arabian">
    <div className="container mx-auto px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="font-display text-3xl md:text-5xl font-bold text-navy mb-6">
          Ready to Transform Your{" "}
          <span className="text-gradient-gold">Equestrian Business</span>?
        </h2>
        <p className="text-muted-foreground text-lg mb-10 max-w-2xl mx-auto">
          Join thousands of horse owners, stables, and veterinarians who trust Khail 
          to manage their operations. Start your free trial today.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="/auth?mode=signup"
            className="inline-flex items-center justify-center gap-2 h-14 px-10 rounded-full bg-gradient-to-r from-navy to-navy-light text-cream font-semibold shadow-navy hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
          >
            Start Free Trial
          </a>
          <a
            href="#"
            className="inline-flex items-center justify-center gap-2 h-14 px-10 rounded-full border-2 border-navy/20 text-navy font-semibold hover:bg-navy/5 transition-all duration-300"
          >
            Schedule Demo
          </a>
        </div>
      </div>
    </div>
  </section>
);

export default Index;
