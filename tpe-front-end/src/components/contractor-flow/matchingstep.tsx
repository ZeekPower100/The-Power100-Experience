
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StrategicPartner } from "@/entities/StrategicPartner";
import { DemoBooking } from "@/entities/DemoBooking";
import { Sparkles, Star, ArrowRight, Calendar, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

export default function MatchingStep({ data, onComplete, onBack, contractorId }) {
  const [matchedPartner, setMatchedPartner] = useState(null);
  const [isMatching, setIsMatching] = useState(true);
  const [primaryFocusArea, setPrimaryFocusArea] = useState("");
  const [isBookingDemo, setIsBookingDemo] = useState(false);

  useEffect(() => {
    findBestMatch();
  }, []);

  const findBestMatch = async () => {
    // Simulate AI matching process
    setIsMatching(true);
    
    // Get all partners
    const partners = await StrategicPartner.list();
    
    // Simple matching algorithm based on focus areas and revenue
    const compatiblePartners = partners.filter(partner => 
      partner.focus_areas_served.some(area => data.focus_areas.includes(area)) &&
      partner.target_revenue_range.includes(data.annual_revenue) &&
      partner.is_active
    );
    
    // Sort by PowerConfidence Score
    compatiblePartners.sort((a, b) => (b.power_confidence_score || 0) - (a.power_confidence_score || 0));
    
    setTimeout(() => {
      const bestMatch = compatiblePartners[0] || partners[0]; // Fallback to first partner
      setMatchedPartner(bestMatch);
      
      // Determine primary focus area (simulate AI decision)
      const primary = data.focus_areas[0] || "greenfield_growth";
      setPrimaryFocusArea(primary);
      
      setIsMatching(false);
    }, 3000);
  };

  const formatFocusArea = (area) => {
    return area.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const bookDemo = async () => {
    if (!matchedPartner || !contractorId) return;
    
    setIsBookingDemo(true);
    
    try {
      // Create demo booking
      const booking = await DemoBooking.create({
        contractor_id: contractorId,
        partner_id: matchedPartner.id,
        focus_area: primaryFocusArea,
        status: "scheduled"
      });
      
      // Simulate sending introduction email
      setTimeout(() => {
        onComplete({
          assigned_partner_id: matchedPartner.id,
          primary_focus_area: primaryFocusArea,
          current_stage: "completed",
          demo_scheduled_date: new Date().toISOString()
        });
      }, 2000);
      
    } catch (error) {
      console.error("Error booking demo:", error);
      setIsBookingDemo(false);
    }
  };

  if (isMatching) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-20"
      >
        <Card className="bg-white/70 border-0 shadow-2xl max-w-lg mx-auto">
          <CardContent className="py-12">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 power100-red-gradient rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg"
            >
              <Sparkles className="w-8 h-8 text-white" />
            </motion.div>
            <h2 className="text-2xl font-bold text-black mb-4">
              Finding Your Perfect Match
            </h2>
            <p className="text-[var(--power100-grey)] mb-6">
              Our AI is analyzing your business profile against our network of trusted strategic partners...
            </p>
            <div className="space-y-2 text-sm text-gray-500">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-[var(--power100-red)] rounded-full animate-bounce"></div>
                <span>Evaluating focus areas compatibility</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-150"></div>
                <span>Matching revenue and company size</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce delay-300"></div>
                <span>Calculating PowerConfidence Scores</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <Card className="bg-white/70 border-0 shadow-2xl">
        <CardHeader className="text-center pb-8">
          <div className="w-16 h-16 power100-red-gradient rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold text-black mb-3">
            We Found Your Perfect Match!
          </CardTitle>
          <p className="text-lg text-[var(--power100-grey)]">
            Based on your focus areas and business profile, here's the partner that's ideal for you
          </p>
        </CardHeader>
        
        <CardContent className="space-y-8">
          {/* Primary Focus Area */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-6">
            <h3 className="font-semibold text-gray-800 mb-2">Your Primary Focus Area</h3>
            <Badge className="bg-[var(--power100-red)] text-white text-base px-4 py-2">
              {formatFocusArea(primaryFocusArea)}
            </Badge>
            <p className="text-sm text-gray-600 mt-2">
              This appears to be your highest priority based on your responses. Would you like us to focus on a different area instead?
            </p>
          </div>

          {/* Partner Match */}
          {matchedPartner && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="bg-white border-2 border-[var(--power100-red)] rounded-xl p-8 shadow-lg"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center space-x-4">
                  {matchedPartner.logo_url ? (
                    <img 
                      src={matchedPartner.logo_url} 
                      alt={matchedPartner.company_name}
                      className="w-16 h-16 object-contain rounded-lg bg-gray-50 p-2"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg flex items-center justify-center">
                      <span className="text-gray-600 font-bold text-xl">
                        {matchedPartner.company_name[0]}
                      </span>
                    </div>
                  )}
                  <div>
                    <h3 className="text-2xl font-bold text-black">{matchedPartner.company_name}</h3>
                    {matchedPartner.power_confidence_score && (
                      <div className="flex items-center space-x-2 mt-1">
                        <Star className="w-4 h-4 text-[var(--power100-red)] fill-current" />
                        <span className="text-[var(--power100-red)] font-semibold">
                          {matchedPartner.power_confidence_score}/100 PowerConfidence Score
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                {matchedPartner.website && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(matchedPartner.website, '_blank')}
                    className="flex items-center space-x-1"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Visit Site</span>
                  </Button>
                )}
              </div>

              <p className="text-gray-700 mb-6 text-lg leading-relaxed">
                {matchedPartner.description}
              </p>

              {/* Key Differentiators */}
              {matchedPartner.key_differentiators && matchedPartner.key_differentiators.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-black mb-3">Why This Partner Is Perfect For You:</h4>
                  <div className="grid md:grid-cols-2 gap-3">
                    {matchedPartner.key_differentiators.map((diff, index) => (
                      <div key={index} className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-[var(--power100-red)] rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-gray-700">{diff}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Testimonials */}
              {matchedPartner.client_testimonials && matchedPartner.client_testimonials.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-black mb-2">What Other Contractors Say:</h4>
                  <blockquote className="italic text-gray-700">
                    "{matchedPartner.client_testimonials[0].testimonial}"
                  </blockquote>
                  <cite className="text-sm text-gray-500 mt-2 block">
                    - {matchedPartner.client_testimonials[0].client_name}
                  </cite>
                </div>
              )}

              {/* Pricing */}
              {matchedPartner.pricing_model && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-1">Pricing Structure:</h4>
                  <p className="text-green-800">{matchedPartner.pricing_model}</p>
                </div>
              )}
            </motion.div>
          )}

          <div className="flex gap-4 pt-6">
            <Button
              variant="outline"
              onClick={onBack}
              className="flex-1 h-12 text-lg"
            >
              Back
            </Button>
            <Button
              onClick={bookDemo}
              disabled={isBookingDemo}
              className="flex-1 bg-[var(--power100-green)] hover:bg-[#009e54] transition-all duration-300 text-white shadow-lg h-12 text-lg font-semibold group"
            >
              {isBookingDemo ? (
                "Scheduling Demo..."
              ) : (
                <>
                  <Calendar className="w-5 h-5 mr-2" />
                  Book Demo & Get Introduced
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
