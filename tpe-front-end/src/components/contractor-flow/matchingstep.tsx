// @ts-nocheck
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

// Real matching will be done via API call to backend

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
  const [matchingProgress, setMatchingProgress] = useState(0);

  // Real API call to backend matching service
  const findBestMatch = React.useCallback(async () => {
    if (!data.id) {
      console.error('No contractor ID available for matching');
      return;
    }

    setIsMatching(true);
    setMatchingProgress(0);
    console.log("Starting real match process with contractor ID:", data.id);

    // Simulate matching progress for better UX
    const progressInterval = setInterval(() => {
      setMatchingProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90; // Stay at 90% until real matching completes
        }
        return prev + Math.random() * 20;
      });
    }, 200);

    try {
      // Call the real backend matching API
      const matchResponse = await contractorApi.getMatches(data.id);
      console.log('Match response:', matchResponse);
      
      if (matchResponse.matches && matchResponse.matches.length > 0) {
        // Get the top match from the real algorithm
        const topMatch = matchResponse.matches[0];
        
        // Parse JSON fields from the backend
        const parsedPartner = {
          ...topMatch.partner,
          focus_areas_served: typeof topMatch.partner.focus_areas_served === 'string' && topMatch.partner.focus_areas_served !== '[object Object]'
            ? JSON.parse(topMatch.partner.focus_areas_served || '[]')
            : topMatch.partner.focus_areas_served || [],
          target_revenue_range: typeof topMatch.partner.target_revenue_range === 'string' && topMatch.partner.target_revenue_range !== '[object Object]'
            ? JSON.parse(topMatch.partner.target_revenue_range || '[]')
            : topMatch.partner.target_revenue_range || [],
          key_differentiators: typeof topMatch.partner.key_differentiators === 'string' && topMatch.partner.key_differentiators !== '[object Object]'
            ? JSON.parse(topMatch.partner.key_differentiators || '[]')
            : topMatch.partner.key_differentiators || [],
          client_testimonials: typeof topMatch.partner.client_testimonials === 'string' && topMatch.partner.client_testimonials !== '[object Object]'
            ? JSON.parse(topMatch.partner.client_testimonials || '[]')
            : topMatch.partner.client_testimonials || []
        };
        
        setMatchedPartner(parsedPartner);
      } else {
        console.warn('No matches found for contractor');
        // Handle case where no matches are found
        setMatchedPartner(null);
      }
      
      const primary = data.focus_areas?.[0] || 'greenfield_growth';
      setPrimaryFocusArea(primary);
      
    } catch (error) {
      console.error('Error getting matches:', error);
      // Handle error - maybe show an error state
      setMatchedPartner(null);
    } finally {
      clearInterval(progressInterval);
      setMatchingProgress(100);
      setTimeout(() => setIsMatching(false), 500); // Short delay to show 100%
    }
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
        current_stage: 'completed' as const
      });

      // Create demo booking
      // Note: We'll add this API call once the booking system is ready
      console.log(`Creating demo booking for Contractor ${data.id} with Partner ${matchedPartner.id}`);
      
      onUpdate({
        primary_focus_area: primaryFocusArea,
        current_stage: 'completed' as const
      });
      onNext();
    } catch (error) {
      console.error('Failed to book demo:', error);
      // Still proceed to completion for now
      onUpdate({
        primary_focus_area: primaryFocusArea,
        current_stage: 'completed' as const
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