// src/components/contractor-flow/MatchingStep.tsx

import React, { useState, useEffect } from 'react';
import { Contractor } from '@/lib/types/contractor';
import { StrategicPartner } from '@/lib/types/strategic_partner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Sparkles, Star, ArrowRight, ArrowLeft, Calendar, ExternalLink, 
  BookOpen, Headphones, Users, Building2, CheckCircle, ChevronLeft, ChevronRight,
  TrendingUp, Award, Target, Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { contractorApi } from '@/lib/api';

interface StepProps {
  data: Partial<Contractor>;
  onNext: () => void;
  onPrev?: () => void;
  onUpdate: (data: Partial<Contractor>) => void;
}

// Focus area display names mapping
const focusAreaDisplayNames: { [key: string]: string } = {
  'greenfield_growth': 'Greenfield Growth',
  'closing_higher_percentage': 'Closing Higher %',
  'controlling_lead_flow': 'Lead Generation',
  'installation_quality': 'Installation Quality',
  'hiring_sales_leadership': 'Sales/Leadership',
  'marketing_automation': 'Marketing',
  'customer_retention': 'Customer Experience',
  'operational_efficiency': 'Operational Efficiency',
  'technology_integration': 'Technology',
  'financial_management': 'Financial Management',
  'Increasing Revenue': 'Revenue Growth',
  'Marketing & Sales': 'Marketing',
};

export default function MatchingStep({ data, onNext, onPrev, onUpdate }: StepProps) {
  const [matches, setMatches] = useState<{
    book: any | null;
    podcast: any | null;
    event: any | null;
    partners: any[];
  }>({
    book: null,
    podcast: null,
    event: null,
    partners: []
  });
  const [isMatching, setIsMatching] = useState(true);
  const [matchingProgress, setMatchingProgress] = useState(0);
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);
  const [currentFocusAreaIndex, setCurrentFocusAreaIndex] = useState(0);
  const [allFocusAreas, setAllFocusAreas] = useState<string[]>([]);
  const [isBookingDemo, setIsBookingDemo] = useState(false);

  useEffect(() => {
    // Set all focus areas from contractor data
    if (data.focus_areas) {
      const areas = typeof data.focus_areas === 'string' 
        ? JSON.parse(data.focus_areas) 
        : data.focus_areas;
      setAllFocusAreas(areas);
    }
    fetchAllMatches();
  }, [data.id, currentFocusAreaIndex]);

  const fetchAllMatches = async () => {
    if (!data.id) {
      console.error('No contractor ID available for matching');
      return;
    }

    setIsMatching(true);
    setMatchingProgress(0);

    // Simulate matching progress
    const progressInterval = setInterval(() => {
      setMatchingProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.random() * 20;
      });
    }, 200);

    try {
      // Fetch all matched content
      const matchResponse = await contractorApi.getAllMatches(data.id);
      console.log('All matches response:', matchResponse);
      
      setMatches({
        book: matchResponse.book,
        podcast: matchResponse.podcast,
        event: matchResponse.event,
        partners: matchResponse.partners || []
      });

      clearInterval(progressInterval);
      setMatchingProgress(100);
      
      setTimeout(() => {
        setIsMatching(false);
      }, 500);
    } catch (error) {
      console.error('Error fetching matches:', error);
      // Try the old matching endpoint as fallback
      try {
        const oldMatchResponse = await contractorApi.getMatches(data.id, currentFocusAreaIndex);
        setMatches({
          book: null,
          podcast: oldMatchResponse.podcastMatch || null,
          event: oldMatchResponse.eventMatch || null,
          partners: oldMatchResponse.matches || []
        });
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
      clearInterval(progressInterval);
      setMatchingProgress(100);
      setIsMatching(false);
    }
  };

  const navigateFocusArea = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentFocusAreaIndex > 0) {
      setCurrentFocusAreaIndex(currentFocusAreaIndex - 1);
    } else if (direction === 'next' && currentFocusAreaIndex < allFocusAreas.length - 1) {
      setCurrentFocusAreaIndex(currentFocusAreaIndex + 1);
    }
  };

  const handleBookDemo = async (partnerId: string) => {
    setSelectedPartner(partnerId);
    setIsBookingDemo(true);
    
    try {
      if (data.id) {
        await contractorApi.completeFlow(data.id, partnerId);
      }
      onUpdate({ selected_partner_id: partnerId });
      setTimeout(() => {
        onNext();
      }, 1500);
    } catch (error) {
      console.error('Error booking demo:', error);
      setIsBookingDemo(false);
    }
  };

  const currentFocusArea = allFocusAreas[currentFocusAreaIndex];
  const focusAreaDisplay = focusAreaDisplayNames[currentFocusArea] || currentFocusArea;

  if (isMatching) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-[600px] flex flex-col items-center justify-center"
      >
        <div className="text-center space-y-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-24 h-24 mx-auto"
          >
            <Sparkles className="w-full h-full text-power100-red" />
          </motion.div>
          
          <div>
            <h2 className="text-3xl font-bold text-power100-black mb-3">
              Finding Your Perfect Matches!
            </h2>
            <p className="text-lg text-power100-grey">
              Based on your focused areas: business profile, and current size/reach, here is the top Podcast, Event, and Ideal Partners for {focusAreaDisplay}
            </p>
          </div>

          <div className="w-64 mx-auto">
            <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
              <motion.div
                className="bg-power100-red h-full rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: `${matchingProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-sm text-power100-grey mt-2">
              {Math.round(matchingProgress)}% Complete
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <Card className="bg-white border-0 shadow-2xl rounded-xl">
        <CardHeader className="text-center pb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-power100-red to-red-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Star className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold text-power100-black mb-3">
            We Found Your Perfect Matches!
          </CardTitle>
          <p className="text-lg text-power100-grey mb-4">
            Based on your focused areas: business profile, and current size/reach, here is the top Podcast, Event, and Ideal Partners for Greenfield Growth.
          </p>

          {/* Focus Area Navigation */}
          {allFocusAreas.length > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateFocusArea('prev')}
                disabled={currentFocusAreaIndex === 0}
                className="h-10"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-1">Your Primary Focus Area</p>
                <Badge className="bg-power100-red text-white px-4 py-2 text-base">
                  {focusAreaDisplay}
                </Badge>
                <div className="flex gap-1 justify-center mt-2">
                  {allFocusAreas.map((_, index) => (
                    <div
                      key={index}
                      className={`h-2 w-2 rounded-full transition-all ${
                        index === currentFocusAreaIndex 
                          ? 'bg-power100-red w-6' 
                          : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateFocusArea('next')}
                disabled={currentFocusAreaIndex === allFocusAreas.length - 1}
                className="h-10"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-8 px-8 pb-8">
          {/* Book Section */}
          {matches.book && (
            <div className="border rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-lg text-power100-black">
                        {matches.book.title}
                      </h3>
                      <p className="text-sm text-gray-600">by {matches.book.author}</p>
                    </div>
                    <Badge className="bg-blue-50 text-blue-700">Book</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    {matches.book.description}
                  </p>
                  {matches.book.key_takeaways && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-gray-700 mb-1">Key Takeaways:</p>
                      <ul className="text-xs text-gray-600 list-disc list-inside">
                        {JSON.parse(matches.book.key_takeaways).slice(0, 3).map((takeaway: string, i: number) => (
                          <li key={i}>{takeaway}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(matches.book.amazon_url, '_blank')}
                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                  >
                    View on Amazon
                    <ExternalLink className="h-3 w-3 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Podcast Section */}
          {matches.podcast && (
            <div className="border rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Headphones className="h-6 w-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-lg text-power100-black">
                        {matches.podcast.name || matches.podcast.title}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Hosted by {matches.podcast.host} • {matches.podcast.frequency}
                      </p>
                    </div>
                    <Badge className="bg-purple-50 text-purple-700">Podcast</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    {matches.podcast.description}
                  </p>
                  <p className="text-xs text-gray-500 mb-3">
                    Topics Covered: {matches.podcast.topics ? 
                      (typeof matches.podcast.topics === 'string' ? 
                        JSON.parse(matches.podcast.topics).join(', ') : 
                        matches.podcast.topics.join(', ')) : 
                      'Various industry topics'}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(matches.podcast.website, '_blank')}
                    className="bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200"
                  >
                    Listen to Episodes
                    <ExternalLink className="h-3 w-3 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Event Section */}
          {matches.event && (
            <div className="border rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-lg text-power100-black">
                        {matches.event.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {matches.event.date} • {matches.event.location}
                      </p>
                    </div>
                    <Badge className="bg-green-50 text-green-700">Live Event</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    {matches.event.description}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                    <span>Format: {matches.event.format}</span>
                    <span>•</span>
                    <span>{matches.event.attendees || 'Industry professionals'}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(matches.event.website, '_blank')}
                    className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                  >
                    View Event Details
                    <ExternalLink className="h-3 w-3 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Partners Section */}
          {matches.partners.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-power100-black mb-4">
                Your Ideal Strategic Partners
              </h3>
              <div className="space-y-4">
                {matches.partners.map((partner: any) => (
                  <div 
                    key={partner.id} 
                    className={`border rounded-lg p-6 hover:shadow-md transition-all ${
                      selectedPartner === partner.id ? 'border-power100-green shadow-lg' : ''
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-6 w-6 text-power100-red" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-bold text-lg text-power100-black">
                              {partner.company_name}
                            </h3>
                            <div className="flex items-center gap-3 mt-1">
                              <Badge variant="secondary" className="bg-green-50 text-green-700">
                                {Math.round(partner.matchScore || 95)}% Match
                              </Badge>
                              <span className="text-sm text-gray-600">
                                PowerConfidence: {partner.powerconfidence_score || 85}/100
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-3">
                          {partner.description || partner.value_proposition || 'Strategic partner for your growth'}
                        </p>

                        {partner.key_differentiators && partner.key_differentiators !== '[]' && (
                          <div className="mb-3">
                            <p className="text-xs font-semibold text-gray-700 mb-1">Key Benefits:</p>
                            <ul className="text-xs text-gray-600 list-disc list-inside">
                              {(typeof partner.key_differentiators === 'string' ? 
                                JSON.parse(partner.key_differentiators) : 
                                partner.key_differentiators).slice(0, 3).map((diff: string, i: number) => (
                                <li key={i}>{diff}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {partner.matchReasons && partner.matchReasons.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {partner.matchReasons.slice(0, 3).map((reason: string, i: number) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                {reason}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleBookDemo(partner.id)}
                            disabled={isBookingDemo}
                            className="bg-power100-green hover:bg-green-600 text-white"
                          >
                            {isBookingDemo && selectedPartner === partner.id ? 
                              'Booking...' : 'Book Quarterly Report'
                            }
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(partner.website, '_blank')}
                          >
                            Learn More
                            <ExternalLink className="h-3 w-3 ml-2" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Explore Other Focus Areas Section */}
          {allFocusAreas.length > 1 && (
            <div className="bg-gray-50 rounded-lg p-6 text-center">
              <h3 className="font-semibold text-gray-800 mb-3">
                Explore Your Other Focus Areas
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                View personalized recommendations for your other selected focus areas
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {allFocusAreas.map((area, index) => (
                  <Button
                    key={index}
                    variant={index === currentFocusAreaIndex ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentFocusAreaIndex(index)}
                    className={index === currentFocusAreaIndex ? 
                      "bg-power100-red hover:bg-red-600" : ""
                    }
                  >
                    {focusAreaDisplayNames[area] || area}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 pt-6">
            {onPrev && (
              <Button
                variant="outline"
                onClick={onPrev}
                className="flex-1 h-12 text-lg"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Home
              </Button>
            )}
            <Button
              onClick={() => {
                if (selectedPartner) {
                  onUpdate({ selected_partner_id: selectedPartner });
                }
                onNext();
              }}
              className="flex-1 bg-power100-red hover:bg-red-600 text-white shadow-lg h-12 text-lg font-semibold group"
            >
              Next: Closing Higher Percentage
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}