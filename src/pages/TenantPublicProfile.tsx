import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Calendar, MessageSquare, Building2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { TenantHeader } from "@/components/directory/TenantHeader";
import { TenantContactInfo } from "@/components/directory/TenantContactInfo";
import { usePublicTenant } from "@/hooks/usePublicTenant";

const TenantPublicProfile = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: tenant, isLoading, error } = usePublicTenant(slug);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="min-h-screen bg-cream">
        <Navbar />
        <div className="container mx-auto px-4 py-32 text-center">
          <Building2 className="w-20 h-20 text-muted-foreground/30 mx-auto mb-6" />
          <h1 className="font-display text-3xl font-bold text-navy mb-4">
            Business Not Found
          </h1>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            This business profile is not available or may have been removed.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="outline" asChild>
              <Link to="/directory">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Directory
              </Link>
            </Button>
            <Button variant="gold" asChild>
              <Link to="/">Go Home</Link>
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{tenant.display_name} | Khail</title>
        <meta
          name="description"
          content={
            tenant.public_description ||
            `${tenant.display_name} - ${tenant.type} on Khail`
          }
        />
      </Helmet>

      <div className="min-h-screen bg-cream">
        <Navbar />

        {/* Back Link */}
        <div className="pt-20 md:pt-24">
          <div className="container mx-auto px-4 py-4">
            <Link
              to="/directory"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Directory
            </Link>
          </div>
        </div>

        {/* Header */}
        <TenantHeader tenant={tenant} />

        {/* Content */}
        <section className="py-8 md:py-12">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-8">
                {/* About */}
                {tenant.public_description && (
                  <Card variant="elevated">
                    <CardHeader>
                      <CardTitle className="text-lg text-navy">
                        About
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground whitespace-pre-line">
                        {tenant.public_description}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Tags */}
                {tenant.tags && tenant.tags.length > 0 && (
                  <Card variant="elevated">
                    <CardHeader>
                      <CardTitle className="text-lg text-navy">
                        Services & Specialties
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {tenant.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-sm"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Services Placeholder */}
                <Card variant="elevated" className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="font-semibold text-navy mb-2">
                      Services & Booking
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Service listings and online booking coming soon
                    </p>
                  </CardContent>
                </Card>

                {/* Posts Placeholder */}
                <Card variant="elevated" className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="font-semibold text-navy mb-2">
                      Posts & Updates
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Business posts and updates coming soon
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                <TenantContactInfo tenant={tenant} />

                {/* CTA Card */}
                <Card variant="elevated" className="bg-gradient-to-br from-gold/10 to-transparent border-gold/20">
                  <CardContent className="py-6 text-center">
                    <h4 className="font-semibold text-navy mb-2">
                      Looking for similar services?
                    </h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Explore more businesses in our directory
                    </p>
                    <Button variant="gold" className="w-full" asChild>
                      <Link to="/directory">Browse Directory</Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
};

export default TenantPublicProfile;
