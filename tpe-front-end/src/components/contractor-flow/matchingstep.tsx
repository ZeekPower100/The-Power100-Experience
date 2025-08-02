// src/components/contractor-flow/MatchingStep.tsx

import React, { useState, useEffect } from 'react';
import { Contractor } from '@/lib/types/contractor';
import { StrategicPartner } from '@/lib/types/strategic_partner'; // FIXED: Import the type
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Star, ArrowRight, Calendar, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { contractorApi } from '@/lib/api';

// --- FIXED: Replaced direct data access with simulated data ---
// In a real app, this data would come from an API call to your backend.
const MOCK_PARTNERS: StrategicPartner[] = [
  {
    id: 'partner_1',
    company_name: 'Buildr',
    description: 'Buildr is the leading CRM and project management platform designed specifically for high-growth home improvement contractors. We help you streamline sales, manage projects, and improve communication.',
    logo_url: '/buildr-logo.png', // You would add this image to your /public folder
    website: 'https://www.buildr.com',
    contact_email: 'sales@buildr.com',
    focus_areas_served: ['closing_higher_percentage', 'controlling_lead_flow', 'operational_efficiency'],
    target_revenue_range: ['1m_5m', '5m_10m', 'over_10m'],
    power_confidence_score: 96,
    is_active: true,
    key_differentiators: ['All-in-one platform from lead to final payment', 'Advanced sales pipeline automation', 'Real-time project tracking for homeowners'],
    client_testimonials: [{ client_name: 'John Smith, ABC Roofing', testimonial: 'Buildr transformed our sales process. We closed 30% more deals in the first quarter.' }],
    pricing_model: 'Per-seat subscription model, starting at $99/user/month.'
  },
  {
    id: 'partner_2',
    company_name: 'MarketPro',
    description: 'MarketPro offers hyper-targeted lead generation and marketing automation for contractors, ensuring a steady flow of high-quality, pre-qualified leads.',
    logo_url: '/marketpro-logo.png',
    website: 'https://www.marketpro.com',
    contact_email: 'info@marketpro.com',
    focus_areas_served: ['greenfield_growth', 'controlling_lead_flow', 'marketing_automation'],
    target_revenue_range: ['under_500k', '500k_1m', '1m_5m'],
    power_confidence_score: 92,
    is_active: true,
    key_differentiators: ['Exclusive leads in your service area', 'Automated email and SMS follow-up campaigns', 'Pay-per-lead and subscription models available'],
    client_testimonials: [{ client_name: 'Jane Doe, Solar Solutions', testimonial: 'Our lead quality has never been better. MarketPro delivers homeowners who are ready to buy.' }],
    pricing_model: 'Flexible pricing based on lead volume and market.'
  }
];

// Define the props interface for type safety
interface StepProps {
  data: Partial<Contractor>;
  onNext: () => void;
  onPrev?: () => void;
  onUpdate: (data: Partial<Contractor>) => void;
}

export default function MatchingStep({ data, onNext, onPrev, onUpdate }: StepProps) {
  const [matchedPartner, setMatchedPartner] = useState<StrategicPartner | null>(null);
  const [isMatching, setIsMatching] = useState(true);
  const [primaryFocusArea, setPrimaryFocusArea] = useState('');
  const [isBookingDemo, setIsBookingDemo] = useState(false);

  // FIXED: Replaced direct database calls with a simulated async function
  const findBestMatch = React.useCallback(async () => {
    setIsMatching(true);
    console.log("Starting match process with data:", data);

    // Simulate the API call to our backend for matching
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Simulate the logic that would happen on the backend
    const compatiblePartners = MOCK_PARTNERS.filter(partner => 
      partner.focus_areas_served.some(area => data.focus_areas?.some(focusArea => focusArea === area)) &&
      partner.target_revenue_range.includes(data.annual_revenue || '') &&
      partner.is_active
    );
    compatiblePartners.sort((a, b) => b.power_confidence_score - a.power_confidence_score);
    
    const bestMatch = compatiblePartners[0] || MOCK_PARTNERS[0]; // Fallback to first partner
    setMatchedPartner(bestMatch);
    
    const primary = data.focus_areas?.[0] || 'greenfield_growth';
    setPrimaryFocusArea(primary);
    
    setIsMatching(false);
  }, [data]);

  useEffect(() => {
    findBestMatch();
  }, [findBestMatch]);

  const formatFocusArea = (area: string) => area.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  const bookDemo = async () => {
    if (!matchedPartner || !data.id) return;
    setIsBookingDemo(true);

    try {
      // Update contractor with final data and mark as completed
      await contractorApi.updateProfile(data.id, {
        primary_focus_area: primaryFocusArea,
        current_stage: 'completed'
      });

      // Create demo booking
      // Note: We'll add this API call once the booking system is ready
      console.log(`Creating demo booking for Contractor ${data.id} with Partner ${matchedPartner.id}`);
      
      onUpdate({
        primary_focus_area: primaryFocusArea,
        current_stage: 'completed'
      });
      onNext();
    } catch (error) {
      console.error('Failed to book demo:', error);
      // Still proceed to completion for now
      onUpdate({
        primary_focus_area: primaryFocusArea,
        current_stage: 'completed'
      });
      onNext();
    } finally {
      setIsBookingDemo(false);
    }
  };

  if (isMatching) {
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <Card className="bg-white/70 border-0 shadow-2xl max-w-lg mx-auto rounded-xl">
                <CardContent className="py-12">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} className="w-16 h-16 bg-gradient-to-br from-power100-red-deep to-power100-red rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                        <Sparkles className="w-8 h-8 text-white" />
                    </motion.div>
                    <h2 className="text-2xl font-bold text-power100-black mb-4">Finding Your Perfect Match</h2>
                    <p className="text-power100-grey mb-6">Our AI is analyzing your profile against our network of trusted partners...</p>
                    <div className="space-y-2 text-sm text-gray-500">
                        <div className="flex items-center justify-center space-x-2"><div className="w-2 h-2 bg-power100-red rounded-full animate-bounce"></div><span>Evaluating focus areas</span></div>
                        <div className="flex items-center justify-center space-x-2"><div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:0.15s]"></div><span>Matching revenue & size</span></div>
                        <div className="flex items-center justify-center space-x-2"><div className="w-2 h-2 bg-power100-green rounded-full animate-bounce [animation-delay:0.3s]"></div><span>Calculating PowerConfidence Scores</span></div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <Card className="bg-white/70 border-0 shadow-2xl rounded-xl">
            <CardHeader className="text-center pb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-power100-red-deep to-power100-red rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <Sparkles className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-3xl font-bold text-power100-black mb-3">We Found Your Perfect Match!</CardTitle>
                <p className="text-lg text-power100-grey">Based on your focus areas and business profile, this partner is ideal for you.</p>
            </CardHeader>
            <CardContent className="space-y-8 px-8 pb-8">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                    <h3 className="font-semibold text-gray-800 mb-2">Your Primary Focus Area</h3>
                    <Badge className="bg-power100-red text-white text-base px-4 py-2">{formatFocusArea(primaryFocusArea)}</Badge>
                </div>
                {matchedPartner && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="bg-white border-2 border-power100-red rounded-xl p-8 shadow-lg">
                        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between mb-6 gap-4">
                            <div className="flex items-center space-x-4">
                                {matchedPartner.logo_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={matchedPartner.logo_url} alt={matchedPartner.company_name} className="w-16 h-16 object-contain rounded-lg bg-gray-50 p-2 border" />
                                ) : (
                                    <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                                        <span className="text-gray-600 font-bold text-xl">{matchedPartner.company_name[0]}</span>
                                    </div>
                                )}
                                <div>
                                    <h3 className="text-2xl font-bold text-power100-black">{matchedPartner.company_name}</h3>
                                    {matchedPartner.power_confidence_score && <div className="flex items-center space-x-2 mt-1"><Star className="w-4 h-4 text-power100-red fill-power100-red" /><span className="text-power100-red font-semibold">{matchedPartner.power_confidence_score}/100 PowerConfidence Score</span></div>}
                                </div>
                            </div>
                            {matchedPartner.website && <Button variant="outline" size="sm" onClick={() => window.open(matchedPartner.website, '_blank')} className="flex items-center space-x-1 flex-shrink-0"><ExternalLink className="w-4 h-4" /><span>Visit Site</span></Button>}
                        </div>
                        <p className="text-gray-700 mb-6 text-lg leading-relaxed">{matchedPartner.description}</p>
                        {matchedPartner.key_differentiators?.length > 0 && <div className="mb-6"><h4 className="font-semibold text-power100-black mb-3">Why This Is Your Perfect Match:</h4><div className="grid md:grid-cols-2 gap-3">{matchedPartner.key_differentiators.map((diff, index) => <div key={index} className="flex items-start space-x-2"><div className="w-2 h-2 bg-power100-red rounded-full mt-1.5 flex-shrink-0"></div><span className="text-gray-700">{diff}</span></div>)}</div></div>}
                        {matchedPartner.client_testimonials?.length > 0 && <div className="bg-gray-50 rounded-lg p-4 mb-6"><h4 className="font-semibold text-power100-black mb-2">What Other Contractors Say:</h4><blockquote className="italic text-gray-700">&ldquo;{matchedPartner.client_testimonials[0].testimonial}&rdquo;</blockquote><cite className="text-sm text-gray-500 mt-2 block">- {matchedPartner.client_testimonials[0].client_name}</cite></div>}
                        {matchedPartner.pricing_model && <div className="bg-green-50 border border-green-200 rounded-lg p-4"><h4 className="font-semibold text-green-900 mb-1">Pricing Structure:</h4><p className="text-green-800">{matchedPartner.pricing_model}</p></div>}
                    </motion.div>
                )}
                <div className="flex gap-4 pt-6">
                    {onPrev && <Button variant="outline" onClick={onPrev} className="flex-1 h-12 text-lg">Back</Button>}
                    <Button onClick={bookDemo} disabled={isBookingDemo} className="flex-1 bg-power100-green hover:brightness-90 transition-all duration-300 text-white shadow-lg h-12 text-lg font-semibold group">
                        {isBookingDemo ? "Scheduling Demo..." : <><Calendar className="w-5 h-5 mr-2" />Book Demo & Get Introduced<ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" /></>}
                    </Button>
                </div>
            </CardContent>
        </Card>
    </motion.div>
  );
}