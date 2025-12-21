import { useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Loader2, Building2, ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { TenantCard } from "@/components/directory/TenantCard";
import { DirectoryFilters } from "@/components/directory/DirectoryFilters";
import { useDirectory, DirectoryFilters as Filters } from "@/hooks/useDirectory";

const Directory = () => {
  const [filters, setFilters] = useState<Filters>({});
  const { data: tenants, isLoading, error } = useDirectory(filters);

  return (
    <>
      <Helmet>
        <title>Business Directory | Khail</title>
        <meta
          name="description"
          content="Discover stables, veterinary clinics, laboratories, and equestrian services across Saudi Arabia."
        />
      </Helmet>

      <div className="min-h-screen bg-cream">
        <Navbar />

        {/* Hero Section */}
        <section className="relative pt-24 pb-12 md:pt-32 md:pb-16 bg-gradient-to-b from-navy to-navy-light overflow-hidden">
          <div className="absolute inset-0 pattern-arabian opacity-10" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-cream mb-4">
                Business Directory
              </h1>
              <p className="text-cream/80 text-lg md:text-xl">
                Discover stables, clinics, laboratories, and equestrian services
                across Saudi Arabia
              </p>
            </div>
          </div>
        </section>

        {/* Filters Section */}
        <section className="py-6 md:py-8 border-b border-border/50 bg-card sticky top-16 md:top-20 z-20">
          <div className="container mx-auto px-4">
            <DirectoryFilters filters={filters} onFiltersChange={setFilters} />
          </div>
        </section>

        {/* Results Section */}
        <section className="py-8 md:py-12">
          <div className="container mx-auto px-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-gold mb-4" />
                <p className="text-muted-foreground">Loading businesses...</p>
              </div>
            ) : error ? (
              <div className="text-center py-20">
                <p className="text-destructive mb-4">
                  Failed to load directory
                </p>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Try Again
                </Button>
              </div>
            ) : tenants && tenants.length > 0 ? (
              <>
                <p className="text-sm text-muted-foreground mb-6">
                  Showing {tenants.length} business
                  {tenants.length !== 1 ? "es" : ""}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {tenants.map((tenant) => (
                    <TenantCard key={tenant.id} tenant={tenant} />
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-20">
                <Building2 className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-display text-xl font-semibold text-navy mb-2">
                  No businesses found
                </h3>
                <p className="text-muted-foreground mb-6">
                  {filters.search || filters.type || filters.region
                    ? "Try adjusting your filters or search terms"
                    : "Be the first to list your business!"}
                </p>
                {(filters.search || filters.type || filters.region) && (
                  <Button variant="outline" onClick={() => setFilters({})}>
                    Clear Filters
                  </Button>
                )}
              </div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-12 md:py-16 bg-muted/50">
          <div className="container mx-auto px-4 text-center">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-navy mb-4">
              List Your Business
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Join hundreds of equestrian businesses on Khail and reach
              horse owners across Saudi Arabia.
            </p>
            <Button variant="gold" size="lg" asChild>
              <Link to="/auth?mode=signup">Get Started Free</Link>
            </Button>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
};

export default Directory;
