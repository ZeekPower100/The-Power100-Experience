// src/components/contractor-flow/MatchingStep.tsx

import React, { useState, useEffect } from 'react';
import { Contractor } from '@/lib/types/contractor';
import { StrategicPartner } from '@/lib/types/strategic_partner'; // FIXED: Import the type
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Star, ArrowRight, ArrowLeft, Calendar, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { contractorApi } from '@/lib/api';
import { getApiUrl } from '@/utils/api';
import Image from 'next/image';
import { safeJsonParse, safeJsonStringify, handleApiResponse, getFromStorage, setToStorage } from '../../utils/jsonHelpers';

// Real matching will be done via API call to backend

// Define the props interface for type safety
interface StepProps {
  data: Partial<Contractor>;
  onNext: () => void;
  onPrev?: () => void;
  onUpdate: (data: Partial<Contractor>) => void;
}

export default function MatchingStep({ data, onNext, onPrev, onUpdate }: StepProps) {
  const [matchedPartners, setMatchedPartners] = useState<StrategicPartner[]>([]);
  const [podcastMatch, setPodcastMatch] = useState<any>(null);
  const [eventMatch, setEventMatch] = useState<any>(null);
  const [bookMatch, setBookMatch] = useState<any>(null);
  const [manufacturerMatch, setManufacturerMatch] = useState<any>(null);
  const [isMatching, setIsMatching] = useState(true);
  const [primaryFocusArea, setPrimaryFocusArea] = useState('');
  const [isBookingDemo, setIsBookingDemo] = useState(false);
  const [matchingProgress, setMatchingProgress] = useState(0);
  const [currentFocusAreaIndex, setCurrentFocusAreaIndex] = useState(0);
  const [allFocusAreas, setAllFocusAreas] = useState<string[]>([]);

  // Real API call to backend matching service
  const findBestMatch = React.useCallback(async (focusIndex: number = 0) => {
    if (!data.id) {
      console.error('No contractor ID available for matching');
      return;
    }

    setIsMatching(true);
    setMatchingProgress(0);
    console.log("Starting real match process with contractor ID:", data.id, "Focus area index:", focusIndex);

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
      // Call both matching APIs - original and new one with all entities
      const [matchResponse, allMatchesResponse] = await Promise.all([
        contractorApi.getMatches(data.id, focusIndex),
        contractorApi.getAllMatches(data.id).catch(err => {
          console.log('getAllMatches failed, continuing with original data:', err);
          return null;
        })
      ]);
      console.log('Match response:', matchResponse);
      console.log('All matches response:', allMatchesResponse);
      
      if (matchResponse.matches && matchResponse.matches.length > 0) {
        // Parse all partner matches
        const parsedPartners = matchResponse.matches.map((match: any) => ({
          ...match.partner,
          matchScore: match.matchScore,
          matchReasons: match.matchReasons,
          focus_areas_served: typeof match.partner.focus_areas_served === 'string' && match.partner.focus_areas_served !== '[object Object]'
            ? safeJsonParse(match.partner.focus_areas_served || '[]')
            : match.partner.focus_areas_served || [],
          target_revenue_range: typeof match.partner.target_revenue_range === 'string' && match.partner.target_revenue_range !== '[object Object]'
            ? safeJsonParse(match.partner.target_revenue_range || '[]')
            : match.partner.target_revenue_range || [],
          key_differentiators: typeof match.partner.key_differentiators === 'string' && match.partner.key_differentiators !== '[object Object]'
            ? safeJsonParse(match.partner.key_differentiators || '[]')
            : match.partner.key_differentiators || [],
          client_testimonials: typeof match.partner.client_testimonials === 'string' && match.partner.client_testimonials !== '[object Object]'
            ? safeJsonParse(match.partner.client_testimonials || '[]')
            : match.partner.client_testimonials || []
        }));
        
        setMatchedPartners(parsedPartners);
      } else {
        console.warn('No matches found for contractor');
        setMatchedPartners([]);
      }
      
      // Set podcast, event, book, and manufacturer matches
      // Use new API response if available, fallback to original
      if (allMatchesResponse) {
        console.log('Setting matches from new API');
        console.log('Book from API:', allMatchesResponse.book);
        setBookMatch(allMatchesResponse.book || null);
        setPodcastMatch(allMatchesResponse.podcast || matchResponse.podcastMatch || null);
        setEventMatch(allMatchesResponse.event || matchResponse.eventMatch || null);
      } else {
        // Fallback to original API response
        console.log('Using original API response for podcast/event');
        setPodcastMatch(matchResponse.podcastMatch || null);
        setEventMatch(matchResponse.eventMatch || null);
      }
      
      if (matchResponse.manufacturerMatch) {
        console.log('Setting manufacturer match:', matchResponse.manufacturerMatch);
        setManufacturerMatch(matchResponse.manufacturerMatch);
      } else {
        console.log('No manufacturer match found');
      }
      
      // Store all focus areas and current focus area from the response with debugging
      console.log('Full matchResponse:', matchResponse);
      console.log('data.focus_areas:', data.focus_areas);
      
      // Handle allFocusAreas - fallback to data.focus_areas if backend doesn't provide it
      if (matchResponse.allFocusAreas && Array.isArray(matchResponse.allFocusAreas) && matchResponse.allFocusAreas.length > 0) {
        console.log('Set allFocusAreas from response:', matchResponse.allFocusAreas);
        setAllFocusAreas(matchResponse.allFocusAreas);
      } else if (data.focus_areas) {
        // Fallback to using the contractor's focus areas from frontend data
        let focusAreasArray = [];
        if (Array.isArray(data.focus_areas)) {
          focusAreasArray = data.focus_areas;
        } else if (typeof data.focus_areas === 'string') {
          try {
            const parsed = safeJsonParse(data.focus_areas);
            if (Array.isArray(parsed)) {
              focusAreasArray = parsed;
            }
          } catch (e) {
            console.log('Could not parse focus_areas string:', e);
          }
        }
        console.log('Set allFocusAreas from data.focus_areas:', focusAreasArray);
        setAllFocusAreas(focusAreasArray);
      } else {
        console.log('No focus areas available, using empty array');
        setAllFocusAreas([]);
      }
      
      console.log('allFocusAreas length:', allFocusAreas.length);
      
      if (matchResponse.currentFocusArea) {
        setPrimaryFocusArea(matchResponse.currentFocusArea);
      } else {
        const primary = data.focus_areas?.[focusIndex] || data.focus_areas?.[0] || 'greenfield_growth';
        setPrimaryFocusArea(primary);
      }
      setCurrentFocusAreaIndex(focusIndex);
      
    } catch (error) {
      console.error('Error getting matches:', error);
    } finally {
      clearInterval(progressInterval);
      setMatchingProgress(100);
      setTimeout(() => {
        setIsMatching(false);
      }, 500);
    }
  }, [data.id, data.focus_areas, currentFocusAreaIndex]);

  useEffect(() => {
    findBestMatch(currentFocusAreaIndex);
  }, [findBestMatch, currentFocusAreaIndex]);

  const handleNextFocusArea = async () => {
    const nextIndex = currentFocusAreaIndex + 1;
    if (nextIndex < allFocusAreas.length) {
      // Track focus area exploration
      try {
        await fetch(getApiUrl('api/data-collection/interaction'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: safeJsonStringify({
            type: 'focus_area_exploration',
            contractor_id: data.id,
            from_focus_area: allFocusAreas[currentFocusAreaIndex],
            to_focus_area: allFocusAreas[nextIndex],
            focus_area_index: nextIndex,
            total_focus_areas: allFocusAreas.length,
            direction: 'forward',
            timestamp: new Date().toISOString()
          })
        });
      } catch (error) {
        console.error('Failed to track focus area exploration:', error);
      }
      
      setCurrentFocusAreaIndex(nextIndex);
      findBestMatch(nextIndex);
    }
  };

  const handlePrevFocusArea = async () => {
    const prevIndex = currentFocusAreaIndex - 1;
    if (prevIndex >= 0) {
      // Track focus area exploration
      try {
        await fetch(getApiUrl('api/data-collection/interaction'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: safeJsonStringify({
            type: 'focus_area_exploration',
            contractor_id: data.id,
            from_focus_area: allFocusAreas[currentFocusAreaIndex],
            to_focus_area: allFocusAreas[prevIndex],
            focus_area_index: prevIndex,
            total_focus_areas: allFocusAreas.length,
            direction: 'backward',
            timestamp: new Date().toISOString()
          })
        });
      } catch (error) {
        console.error('Failed to track focus area exploration:', error);
      }
      
      setCurrentFocusAreaIndex(prevIndex);
      findBestMatch(prevIndex);
    }
  };

  const formatFocusArea = (area: string) => area.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  
  // Helper function to fix logo URLs (serve from frontend, not backend)
  const getLogoUrl = (logoUrl: string) => {
    if (!logoUrl) return '';
    // If it's already a full URL, return as-is
    if (logoUrl.startsWith('http')) return logoUrl;
    // If it starts with /logos/, serve from frontend
    if (logoUrl.startsWith('/logos/')) return logoUrl;
    return logoUrl;
  };

  const bookDemo = async () => {
    if (!matchedPartners.length || !data.id) return;
    setIsBookingDemo(true);

    try {
      // Update contractor with final data and mark as completed
      await contractorApi.updateProfile(data.id, {
        primary_focus_area: primaryFocusArea,
        current_stage: 'completed'
      });

      // Create demo booking
      // Note: We'll add this API call once the booking system is ready
      console.log(`Creating demo booking for Contractor ${data.id} with Partners`);
      
      onUpdate({
        primary_focus_area: primaryFocusArea,
        current_stage: 'completed'
      });
      
      onNext();
    } catch (error) {
      console.error('Failed to complete booking:', error);
      // Still proceed to next step
      onNext();
    } finally {
      setIsBookingDemo(false);
    }
  };

  // Show loading animation while matching
  if (isMatching) {
    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Card className="bg-white/70 border-0 shadow-2xl rounded-xl">
                <CardHeader className="text-center pb-8">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg p-2">
                        <Image 
                            src="/power100-logo.png" 
                            alt="Power100 Logo" 
                            width={48} 
                            height={48}
                            className="animate-pulse"
                        />
                    </div>
                    <CardTitle className="text-3xl font-bold text-power100-black mb-3">Finding Your Perfect Matches...</CardTitle>
                    <p className="text-lg text-power100-grey">Our AI is analyzing thousands of potential partners to find the best fit for your business.</p>
                </CardHeader>
                <CardContent className="px-8 pb-8">
                    <div className="bg-gray-50 rounded-lg p-6">
                        <div className="space-y-4">
                            <div className="flex justify-between text-sm text-gray-600 mb-2">
                                <span>Analyzing matches...</span>
                                <span>{Math.round(matchingProgress)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <motion.div className="bg-gradient-to-r from-power100-red to-power100-green h-2 rounded-full" initial={{ width: "0%" }} animate={{ width: `${matchingProgress}%` }} transition={{ duration: 0.5 }} />
                            </div>
                        </div>
                    </div>
                    <div className="space-y-3 mt-6 text-center text-gray-600">
                        <div className="flex items-center justify-center space-x-2"><div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div><span>Analyzing focus areas</span></div>
                        <div className="flex items-center justify-center space-x-2"><div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:0.15s]"></div><span>Matching revenue & size</span></div>
                        <div className="flex items-center justify-center space-x-2"><div className="w-2 h-2 bg-power100-green rounded-full animate-bounce [animation-delay:0.3s]"></div><span>Calculating PowerConfidence Ratings</span></div>
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
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg p-2">
                    <Image 
                        src="/power100-logo.png" 
                        alt="Power100 Logo" 
                        width={48} 
                        height={48}
                    />
                </div>
                <CardTitle className="text-3xl font-bold text-power100-black mb-3">We Found Your Perfect Matches!</CardTitle>
                <p className="text-lg text-power100-grey">Based on your focused areas selected, business profile, and current tech stack, here is the top Podcast, Event, and ideal Partners for Greenfield Growth.</p>
            </CardHeader>
            <CardContent className="space-y-8 px-8 pb-8">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                    <h3 className="font-semibold text-gray-800 mb-2">
                      {currentFocusAreaIndex === 0 ? 'Your Primary Focus Area' : `Focus Area ${currentFocusAreaIndex + 1} of ${allFocusAreas.length}`}
                    </h3>
                    <Badge className="bg-power100-red text-white text-base px-4 py-2">{formatFocusArea(primaryFocusArea)}</Badge>
                    {allFocusAreas.length > 1 && (
                      <div className="mt-4 flex justify-center gap-2">
                        {allFocusAreas.map((_, index) => (
                          <div
                            key={index}
                            className={`w-2 h-2 rounded-full ${
                              index === currentFocusAreaIndex ? 'bg-power100-red' : 'bg-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                </div>
                
                {/* Book Match - FIRST */}
                {bookMatch && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.05 }} className="bg-white border-2 border-power100-red rounded-xl p-8 shadow-lg">
                    <div className="flex items-center space-x-4 mb-6">
                      {console.log('Rendering book with cover_image_url:', bookMatch.cover_image_url)}
                      {bookMatch.cover_image_url ? (
                        <div className="w-16 h-20 rounded-lg overflow-hidden bg-white border-2 border-gray-200 flex items-center justify-center">
                          <img src={bookMatch.cover_image_url} alt={bookMatch.title} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/>
                          </svg>
                        </div>
                      )}
                      <div>
                        <h3 className="text-2xl font-bold text-power100-black">{bookMatch.title}</h3>
                        <p className="text-gray-600">by {bookMatch.author}</p>
                        <Badge className="bg-blue-100 text-blue-700 bg-opacity-100 mt-1">
                          Must-Read Book
                        </Badge>
                      </div>
                    </div>
                    <p className="text-gray-700 mb-4">{bookMatch.description}</p>
                    
                    {bookMatch.key_takeaways && (
                      <div className="mb-4">
                        <h4 className="font-semibold text-power100-black mb-2">Key Takeaways:</h4>
                        <div className="space-y-2">
                          {(Array.isArray(bookMatch.key_takeaways) ? bookMatch.key_takeaways : typeof bookMatch.key_takeaways === 'string' && bookMatch.key_takeaways.startsWith('[') ? safeJsonParse(bookMatch.key_takeaways) : []).slice(0, 3).map((takeaway: string, index: number) => (
                            <div key={index} className="flex items-start space-x-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                              <span className="text-gray-700">{takeaway}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <Button 
                      variant="outline" 
                      onClick={() => window.open(bookMatch.amazon_url || '#', '_blank')} 
                      className="w-full"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View on Amazon
                    </Button>
                  </motion.div>
                )}
                
                {/* Podcast Match - SECOND */}
                {podcastMatch && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="bg-white border-2 border-power100-red rounded-xl p-8 shadow-lg">
                    <div className="flex items-center space-x-4 mb-6">
                      {console.log('Podcast logo_url:', podcastMatch.logo_url)}
                      {podcastMatch.logo_url ? (
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-white border-2 border-gray-200 flex items-center justify-center p-2">
                          <img src={getLogoUrl(podcastMatch.logo_url)} alt={podcastMatch.name} className="max-w-full max-h-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/></svg>
                        </div>
                      )}
                      <div>
                        <h3 className="text-2xl font-bold text-power100-black">{podcastMatch.name}</h3>
                        <p className="text-gray-600">Hosted by {podcastMatch.host}</p>
                        <Badge className="bg-purple-100 text-purple-700 mt-1">{podcastMatch.frequency}</Badge>
                      </div>
                    </div>
                    <p className="text-gray-700 mb-4">{podcastMatch.description}</p>
                    {podcastMatch.matchReasons && (
                      <div className="mb-4">
                        <h4 className="font-semibold text-power100-black mb-2">Why This Podcast Is Perfect For You:</h4>
                        <div className="space-y-2">
                          {podcastMatch.matchReasons.map((reason: string, index: number) => (
                            <div key={index} className="flex items-start space-x-2">
                              <div className="w-2 h-2 bg-purple-500 rounded-full mt-1.5 flex-shrink-0"></div>
                              <span className="text-gray-700">{reason}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {podcastMatch.topics && (
                      <div className="mb-4">
                        <h4 className="font-semibold text-power100-black mb-2">Topics Covered:</h4>
                        <div className="flex flex-wrap gap-2">
                          {(Array.isArray(podcastMatch.topics) ? podcastMatch.topics : typeof podcastMatch.topics === 'string' ? podcastMatch.topics.split(',').map(t => t.trim()) : [])?.map((topic: string, index: number) => (
                            <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {podcastMatch.website && <Button variant="outline" onClick={() => window.open(podcastMatch.website, '_blank')} className="w-full"><ExternalLink className="w-4 h-4 mr-2" />Listen to Episodes</Button>}
                  </motion.div>
                )}
                
                {/* Event Match - SECOND */}
                {eventMatch && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="bg-white border-2 border-power100-red rounded-xl p-8 shadow-lg">
                    <div className="flex items-center space-x-4 mb-6">
                      {console.log('Event logo_url:', eventMatch.logo_url)}
                      {eventMatch.logo_url ? (
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-white border-2 border-gray-200 flex items-center justify-center p-2">
                          <img src={getLogoUrl(eventMatch.logo_url)} alt={eventMatch.name} className="max-w-full max-h-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                          <Calendar className="w-8 h-8 text-white" />
                        </div>
                      )}
                      <div>
                        <h3 className="text-2xl font-bold text-power100-black">{eventMatch.name || eventMatch.title}</h3>
                        <p className="text-gray-600">{eventMatch.date || 'Coming Soon'}</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <Badge className="bg-blue-100 text-blue-700 bg-opacity-100">
                            {eventMatch.location || 'Virtual Conference'}
                          </Badge>
                          <Badge className="bg-green-100 text-green-700 bg-opacity-100">
                            {eventMatch.format || 'Live Event'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-700 mb-4">
                      {eventMatch.description || 'A battle-tested playbook to generate 200 to 500 qualified leads every single month. Join top contractors who are transforming their lead generation strategies.'}
                    </p>
                    
                    {/* Key Takeaways */}
                    <div className="mb-4">
                      <h4 className="font-semibold text-power100-black mb-2">Key Takeaways:</h4>
                      <div className="space-y-2">
                        <div className="flex items-start space-x-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                          <span className="text-gray-700">Battle-tested playbook to generate 200-500 qualified leads monthly</span>
                        </div>
                        <div className="flex items-start space-x-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                          <span className="text-gray-700">Direct strategies from contractors doing $10M+ annually</span>
                        </div>
                        <div className="flex items-start space-x-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                          <span className="text-gray-700">Proven systems to double close rates and increase average tickets</span>
                        </div>
                      </div>
                    </div>
                    {eventMatch.matchReasons && (
                      <div className="mb-4">
                        <h4 className="font-semibold text-power100-black mb-2">Why You Should Attend:</h4>
                        <div className="space-y-2">
                          {eventMatch.matchReasons.map((reason: string, index: number) => (
                            <div key={index} className="flex items-start space-x-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                              <span className="text-gray-700">{reason}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {eventMatch.attendees && (
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <p className="text-gray-700">
                          <strong>Expected Attendees:</strong> {eventMatch.attendees || '500+ Top Contractors'}
                        </p>
                      </div>
                    )}
                    {eventMatch.website && <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white" onClick={() => window.open(eventMatch.website, '_blank')}><Calendar className="w-4 h-4 mr-2" />Register for Event</Button>}
                  </motion.div>
                )}
                
                {/* Manufacturer Match - THIRD - TEMPORARILY HIDDEN */}
                {/* manufacturerMatch && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="bg-white border-2 border-power100-red rounded-xl p-8 shadow-lg">
                    <div className="flex items-center space-x-4 mb-6">
                      {console.log('Manufacturer logo_url:', manufacturerMatch.logo_url)}
                      {manufacturerMatch.logo_url ? (
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-white border-2 border-gray-200 flex items-center justify-center p-2">
                          <img src={getLogoUrl(manufacturerMatch.logo_url)} alt={manufacturerMatch.company_name} className="max-w-full max-h-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                          </svg>
                        </div>
                      )}
                      <div>
                        <h3 className="text-2xl font-bold text-power100-black">{manufacturerMatch.company_name}</h3>
                        <p className="text-gray-600">
                          {manufacturerMatch.price_range} • {manufacturerMatch.lead_time || '2-4 weeks delivery'}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <Badge className="bg-orange-100 text-orange-700 bg-opacity-100">
                            {manufacturerMatch.powerconfidence_score}% PowerConfidence
                          </Badge>
                          {manufacturerMatch.contractor_rating && (
                            <Badge className="bg-yellow-100 text-yellow-700 bg-opacity-100">
                              ⭐ {manufacturerMatch.contractor_rating}/5 Rating
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-700 mb-4">{manufacturerMatch.description}</p>
                    
                    {manufacturerMatch.product_categories && manufacturerMatch.product_categories.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-semibold text-power100-black mb-2">Product Categories:</h4>
                        <div className="flex flex-wrap gap-2">
                          {manufacturerMatch.product_categories?.map((category: string, index: number) => (
                            <Badge key={index} className="bg-gray-100 text-gray-700 bg-opacity-100">{category}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {manufacturerMatch.matchReasons && (
                      <div className="mb-4">
                        <h4 className="font-semibold text-power100-black mb-2">Why This Manufacturer Is Perfect For You:</h4>
                        <div className="space-y-2">
                          {manufacturerMatch.matchReasons.map((reason: string, index: number) => (
                            <div key={index} className="flex items-start space-x-2">
                              <div className="w-2 h-2 bg-orange-500 rounded-full mt-1.5 flex-shrink-0"></div>
                              <span className="text-gray-700">{reason}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {manufacturerMatch.brands_carried && (
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <p className="text-gray-700">
                          <strong>Featured Brands:</strong> {
                            typeof manufacturerMatch.brands_carried === 'string' 
                              ? safeJsonParse(manufacturerMatch.brands_carried).join(', ')
                              : manufacturerMatch.brands_carried.join(', ')
                          }
                        </p>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-2">
                      {manufacturerMatch.website && (
                        <Button 
                          variant="outline" 
                          onClick={() => window.open(manufacturerMatch.website, '_blank')} 
                          className="w-full"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View Catalog
                        </Button>
                      )}
                      <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                        Request Quote
                      </Button>
                    </div>
                  </motion.div>
                )} */}
                
                {/* Partner Matches - FOURTH (Side by Side) */}
                {matchedPartners.length > 0 && (
                  <>
                    {/* Enticing Headline */}
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      transition={{ duration: 0.5, delay: 0.2 }}
                      className="text-center mb-6"
                    >
                      <h2 className="text-2xl md:text-3xl font-bold text-power100-black mb-2">
                        Your Strategic Partners for {formatFocusArea(allFocusAreas[currentFocusAreaIndex] || primaryFocusArea)}
                      </h2>
                      <p className="text-lg text-gray-600">
                        Based on your goals and current challenges, these partners deliver the highest impact solutions
                      </p>
                    </motion.div>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                    {matchedPartners.map((partner, idx) => (
                    <motion.div key={partner.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.3 + idx * 0.1 }} className="bg-white border-2 border-power100-red rounded-xl p-6 shadow-lg">
                        <div className="flex flex-col items-start mb-4">
                            <div className="flex items-center space-x-3 mb-3">
                                {console.log('Partner', partner.company_name, 'logo_url:', partner.logo_url)}
                                {partner.logo_url ? (
                                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-white border-2 border-gray-200 flex items-center justify-center p-2">
                                        <img src={getLogoUrl(partner.logo_url)} alt={partner.company_name} className="max-w-full max-h-full object-contain" />
                                    </div>
                                ) : (
                                    <div className="w-14 h-14 bg-gray-200 rounded-lg flex items-center justify-center">
                                        <span className="text-gray-600 font-bold text-lg">{partner.company_name?.[0] || 'P'}</span>
                                    </div>
                                )}
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-power100-black">{partner.company_name}</h3>
                                    {partner.powerconfidence_score && <div className="flex items-center space-x-1 mt-1"><Star className="w-3 h-3 text-power100-red fill-power100-red" /><span className="text-power100-red font-semibold text-sm">{partner.powerconfidence_score}/100 PowerConfidence</span></div>}
                                </div>
                            </div>
                            {partner.website && <Button variant="outline" size="sm" onClick={() => window.open(partner.website, '_blank')} className="flex items-center space-x-1 w-full mb-3"><ExternalLink className="w-3 h-3" /><span>Visit Site</span></Button>}
                        </div>
                        {/* Dynamic Partner Summary Based on Focus Area */}
                        <div className="text-gray-700 mb-4 text-sm leading-relaxed">
                          {(() => {
                            const focusArea = allFocusAreas[currentFocusAreaIndex] || primaryFocusArea;
                            let summary = partner.description;
                            
                            // Customize summary based on focus area
                            if (focusArea === 'controlling_lead_flow') {
                              summary = `Based on your focus on controlling lead flow, ${partner.company_name} specializes in ${partner.description}. Their proven systems help contractors like you generate predictable, high-quality leads while reducing acquisition costs.`;
                            } else if (focusArea === 'hiring_sales_leadership') {
                              summary = `With your priority on hiring sales leadership, ${partner.company_name} offers ${partner.description}. They help contractors build high-performing sales teams that close more deals and drive sustainable growth.`;
                            } else if (focusArea === 'closing_higher_percentage') {
                              summary = `To address your goal of closing a higher percentage of leads, ${partner.company_name} provides ${partner.description}. Their clients typically see a 15-30% improvement in close rates within the first 90 days.`;
                            } else if (focusArea === 'operational_efficiency') {
                              summary = `For improving operational efficiency, ${partner.company_name} delivers ${partner.description}. They help contractors streamline operations, reduce costs, and scale profitably.`;
                            } else if (focusArea === 'customer_experience') {
                              summary = `To enhance customer experience, ${partner.company_name} specializes in ${partner.description}. Their solutions help contractors build lasting customer relationships and generate more referrals.`;
                            } else if (focusArea === 'revenue_growth') {
                              summary = `Focused on revenue growth, ${partner.company_name} provides ${partner.description}. Their strategies have helped contractors achieve 2-3x revenue growth within 12-18 months.`;
                            } else if (focusArea === 'greenfield_growth') {
                              summary = `For expanding into new markets, ${partner.company_name} offers ${partner.description}. They specialize in helping contractors successfully enter and dominate new territories.`;
                            } else if (focusArea === 'technology_systems' || focusArea === 'technology_integration') {
                              summary = `To modernize your technology stack, ${partner.company_name} delivers ${partner.description}. Their solutions integrate seamlessly to create a connected, efficient operation.`;
                            }
                            
                            return <p>{summary}</p>;
                          })()}
                        </div>
                        {/* AI Match Reasons - displays recommendation_reason and is_hot_streak from ai_recommendations */}
                        {partner.matchReasons && partner.matchReasons.length > 0 && (
                          <div className="mb-4 bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-3">
                            <h4 className="font-semibold text-orange-900 mb-2 text-sm flex items-center gap-2">
                              <Sparkles className="w-4 h-4" />
                              Why This Partner:
                            </h4>
                            <div className="space-y-1">
                              {partner.matchReasons.map((reason: string, index: number) => (
                                <div key={index} className="flex items-start space-x-2">
                                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-1.5 flex-shrink-0"></div>
                                  <span className="text-orange-800 text-sm">{reason}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {partner.key_differentiators?.length > 0 && <div className="mb-4"><h4 className="font-semibold text-power100-black mb-2 text-sm">Key Benefits:</h4><div className="space-y-2">{partner.key_differentiators.map((diff, index) => <div key={index} className="flex items-start space-x-2"><div className="w-1.5 h-1.5 bg-power100-red rounded-full mt-1.5 flex-shrink-0"></div><span className="text-gray-700 text-sm">{diff}</span></div>)}</div></div>}
                        {partner.pricing_model && <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4"><h4 className="font-semibold text-green-900 mb-1 text-sm">Pricing:</h4><p className="text-green-800 text-sm">{partner.pricing_model}</p></div>}
                        <div className="space-y-2">
                          <Button 
                            className="w-full bg-green-500 hover:bg-green-600 text-white"
                            onClick={() => {
                              // For Destination Motivation (ID 4), redirect to demo reports
                              if (partner.id === 4 || partner.name === 'Destination Motivation') {
                                window.open('/demo/dm-reports', '_blank');
                              } else {
                                // For other partners, could show a message or different action
                                alert('Reports coming soon for this partner');
                              }
                            }}
                          >
                            <span className="text-sm">View Quarterly Reports</span>
                          </Button>
                          <Button 
                            className="w-full bg-green-500 hover:bg-green-600 text-white"
                            onClick={() => {
                              // For Destination Motivation (ID 4), redirect to contractor report
                              if (partner.id === 4 || partner.name === 'Destination Motivation') {
                                window.open('/demo/dm-reports?report=contractor', '_blank');
                              } else {
                                // For other partners, could show a message or different action
                                alert('Customer stories coming soon for this partner');
                              }
                            }}
                          >
                            <span className="text-sm">Hear from Similar Customers</span>
                          </Button>
                          <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white">
                            <span className="text-sm">Schedule Introduction</span>
                          </Button>
                        </div>
                    </motion.div>
                    ))}
                  </div>
                  </>
                )}
                
                {/* Focus Area Navigation Section */}
                {allFocusAreas.length > 1 && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-power100-black mb-3 text-center">Explore Your Other Focus Areas</h3>
                    <p className="text-gray-700 mb-4 text-center">
                      View personalized recommendations for your other selected focus areas
                    </p>
                    <div className="flex justify-center gap-4">
                      {currentFocusAreaIndex > 0 && (
                        <Button 
                          variant="outline"
                          className="flex items-center gap-2 px-4 py-2"
                          onClick={handlePrevFocusArea}
                        >
                          <ArrowLeft className="w-4 h-4" />
                          Previous: {formatFocusArea(allFocusAreas[currentFocusAreaIndex - 1])}
                        </Button>
                      )}
                      {currentFocusAreaIndex < allFocusAreas.length - 1 && (
                        <Button 
                          className="bg-power100-red hover:bg-red-600 text-white flex items-center gap-2 px-4 py-2"
                          onClick={handleNextFocusArea}
                        >
                          Next: {formatFocusArea(allFocusAreas[currentFocusAreaIndex + 1])}
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="flex justify-center pt-6">
                    <Button variant="outline" onClick={onPrev} className="px-8">Back to Home</Button>
                </div>
            </CardContent>
        </Card>
    </motion.div>
  );
}