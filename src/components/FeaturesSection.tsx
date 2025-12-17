import { Card, CardContent } from "@/components/ui/card";
import { 
  Building2, 
  Stethoscope, 
  FlaskConical, 
  GraduationCap, 
  Truck, 
  Gavel,
  Users,
  Globe
} from "lucide-react";

const features = [
  {
    icon: Building2,
    title: "Stable Management",
    description: "Complete horse inventory, health records, feeding schedules, and staff management.",
    color: "from-gold to-gold-light",
  },
  {
    icon: Stethoscope,
    title: "Clinic & Veterinary",
    description: "Digital case management, treatment tracking, and veterinary consultations.",
    color: "from-emerald-500 to-emerald-400",
  },
  {
    icon: FlaskConical,
    title: "Laboratory Services",
    description: "Sample tracking, test results management, and lab report generation.",
    color: "from-blue-500 to-blue-400",
  },
  {
    icon: GraduationCap,
    title: "Training Academy",
    description: "Student enrollment, lesson scheduling, and progress tracking.",
    color: "from-purple-500 to-purple-400",
  },
  {
    icon: Truck,
    title: "Transport Services",
    description: "Horse transportation booking, route planning, and vehicle management.",
    color: "from-orange-500 to-orange-400",
  },
  {
    icon: Gavel,
    title: "Auctions",
    description: "Online horse auctions, bidding system, and transaction management.",
    color: "from-rose-500 to-rose-400",
  },
  {
    icon: Users,
    title: "Multi-Tenant System",
    description: "Manage multiple businesses with role-based access and permissions.",
    color: "from-teal-500 to-teal-400",
  },
  {
    icon: Globe,
    title: "Multi-Language",
    description: "Support for Arabic, English, Urdu, Hindi, Bengali, and Filipino.",
    color: "from-indigo-500 to-indigo-400",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 bg-cream pattern-arabian">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block px-4 py-1 rounded-full bg-gold/10 text-gold text-sm font-semibold mb-4">
            Powerful Features
          </span>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-navy mb-4">
            Everything You Need to{" "}
            <span className="text-gradient-gold">Excel</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            A comprehensive suite of tools designed for the modern equestrian industry, 
            from individual horse owners to large-scale operations.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card 
              key={feature.title}
              variant="elevated"
              className="group hover:-translate-y-1 cursor-pointer"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardContent className="p-6">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-display text-lg font-semibold text-navy mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
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
