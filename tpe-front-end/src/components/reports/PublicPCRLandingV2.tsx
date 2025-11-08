'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getApiUrl } from '@/utils/api';
import {
  Star,
  Trophy,
  TrendingDown,
  TrendingUp,
  Users,
  Building2,
  Play,
  Download,
  Calendar,
  Award,
  CheckCircle,
  X,
  Quote,
  ArrowRight
} from 'lucide-react';
import { safeJsonParse, safeJsonStringify, handleApiResponse, getFromStorage, setToStorage } from '../../utils/jsonHelpers';

interface PublicPCRProps {
  partnerId: string;
}

export default function PublicPCRLandingV2({ partnerId }: PublicPCRProps) {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  // Helper function to extract YouTube video ID from various URL formats
  const extractYouTubeId = (url: string): string => {
    // If it's already just an ID, return it
    if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
      return url;
    }
    
    // Handle various YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return url; // Return original if no match
  };

  // Video configuration - use from API if available, otherwise use defaults
  const defaultVideos = [
    {
      url: 'https://www.youtube.com/watch?v=SI-q7Cwqut8',
      title: 'Introduction to Destination Motivation',
      duration: '2:45',
      thumbnail: null
    },
    {
      url: 'https://www.youtube.com/watch?v=Z3VoZ0V_H8k',
      title: 'Success Stories & Case Studies',
      duration: '4:12',
      thumbnail: null
    },
    {
      url: 'https://www.youtube.com/watch?v=Zj7QnujoHiA',
      title: 'Team Building Strategies That Work',
      duration: '3:28',
      thumbnail: null
    },
    {
      url: 'https://www.youtube.com/watch?v=y1Ry6gRKf10',
      title: 'What Our Clients Say',
      duration: '5:15',
      thumbnail: null
    }
  ];
  
  // Use videos from API if available, otherwise use defaults
  const videos = report?.partner?.videos && report.partner.videos.length > 0 
    ? report.partner.videos 
    : defaultVideos;

  useEffect(() => {
    fetchReport();
  }, [partnerId]);

  // Handle ESC key to close video modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveVideo(null);
      }
    };
    
    if (activeVideo) {
      document.addEventListener('keydown', handleEsc);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [activeVideo]);

  const fetchReport = async () => {
    try {
      setError(null);
      const url = getApiUrl(`api/reports/pcr/${partnerId}`);
      console.log('Fetching PCR report from:', url);
      
      const response = await fetch(url);
      const data = await handleApiResponse(response);
      
      if (data.success) {
        setReport(data.report);
      } else {
        setError('Failed to load report');
      }
    } catch (error) {
      console.error('Error fetching PCR report:', error);
      setError('Error loading report. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-power100-red"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6">
          <p className="text-red-600">{error}</p>
          <Button onClick={fetchReport} className="mt-4">Retry</Button>
        </Card>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-black via-gray-900 to-black text-white py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-yellow-400 text-black">
                <Trophy className="h-4 w-4 mr-1" />
                {report.powerconfidence_score?.percentile || '99th percentile'}
              </Badge>

              {/* Power100 Logo */}
              <div className="mb-6">
                <img
                  src="/power100-logo.png"
                  alt="Power100"
                  className="h-16 w-auto"
                />
              </div>

              <h1 className="text-5xl font-bold mb-4">{report.partner?.name || 'Partner'}</h1>
              <p className="text-2xl mb-6 text-white/90">{report.partner?.tagline || ''}</p>
              
              {/* Trust Badges */}
              <div className="flex flex-wrap gap-3 mb-8">
                {report.trust_badges?.map((badge: string, idx: number) => (
                  <Badge key={idx} className="bg-white/10 text-white border-white/20">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {badge}
                  </Badge>
                ))}
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button className="group bg-green-500 text-white px-8 py-4 rounded-full hover:bg-green-600 transition-all duration-300 flex items-center justify-center gap-2 text-lg font-semibold shadow-xl">
                  <Calendar className="w-5 h-5" />
                  {report.cta?.primary?.text || 'Schedule Introduction'}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>

                <button className="bg-black/40 backdrop-blur-sm text-white border-2 border-white/30 px-8 py-4 rounded-full hover:bg-black/60 transition-all duration-300 flex items-center justify-center gap-2 text-lg font-semibold shadow-xl">
                  <Download className="w-5 h-5" />
                  {report.cta?.secondary?.text || 'Download Report'}
                </button>
              </div>
            </div>

            {/* PowerConfidence Score Display */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-yellow-400 rounded-3xl blur-2xl opacity-30 animate-pulse"></div>
                <div className="relative bg-white rounded-3xl p-8 shadow-2xl transform hover:scale-105 transition-transform duration-300">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-400 rounded-full mb-4">
                      <Star className="w-10 h-10 text-white" fill="currentColor" />
                    </div>

                    <p className="text-sm text-gray-600 uppercase tracking-wider mb-2 font-semibold">PowerConfidence Rating</p>

                    <div className="text-8xl font-bold text-red-600 mb-2">{report.powerconfidence_score?.current || 99}</div>

                    <p className="text-xl font-semibold text-gray-800">{report.powerconfidence_score?.label || 'Elite Partner'}</p>

                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Performance Metrics</p>
                      <div className="grid grid-cols-2 gap-4 text-left">
                        {report.key_metrics?.slice(0, 2).map((metric: any, idx: number) => (
                          <div key={idx}>
                            <p className="text-2xl font-bold text-green-600">{metric.metric}</p>
                            <p className="text-xs text-gray-600">{metric.label.split(' ').slice(0, 3).join(' ')}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p className="text-center mt-8 text-white/80 max-w-3xl mx-auto">
            {report.powerconfidence_score?.description || 'Top 1% of all strategic partners'}
          </p>
        </div>
      </div>

      {/* Summary Section */}
      {(report.partner?.ai_extended_summary || report.partner?.value_proposition) && (
        <div className="py-20 bg-white">
          <div className="max-w-5xl mx-auto px-4">
            {/* AI-Generated Section Title */}
            {report.partner?.ai_summary_title && (
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-8 italic leading-relaxed">
                {report.partner.ai_summary_title}
              </h2>
            )}

            {/* Extended Summary - Support multiple paragraphs */}
            <div className="text-left space-y-6 text-gray-700 text-lg leading-relaxed">
              {(() => {
                // Prefer ai_extended_summary, fallback to value_proposition
                const content = report.partner.ai_extended_summary || report.partner.value_proposition;

                if (typeof content === 'string' && content.includes('\n\n')) {
                  // Split into paragraphs if double newlines exist
                  return content.split('\n\n').map((paragraph: string, idx: number) => (
                    <p key={idx}>{paragraph}</p>
                  ));
                } else {
                  // Render as single paragraph
                  return <p>{content}</p>;
                }
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Focus Areas Section */}
      {report.partner?.focus_areas_served && report.partner.focus_areas_served.length > 0 && (
        <div className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <div className="inline-block bg-red-100 text-red-600 px-4 py-2 rounded-full text-sm font-semibold mb-4">Growth Areas</div>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Areas We Help Contractors Grow</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {report.partner.focus_areas_served.map((area: string, idx: number) => (
                <div key={idx} className="group bg-white rounded-2xl p-6 shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 text-center">
                  <div className="flex justify-center mb-4">
                    <div className="w-14 h-14 rounded-xl bg-green-100 flex items-center justify-center group-hover:bg-green-600 transition-colors">
                      <TrendingUp className="h-7 w-7 text-green-600 group-hover:text-white transition-colors" />
                    </div>
                  </div>
                  <p className="font-semibold text-gray-900 capitalize">
                    {area.replace(/_/g, ' ')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-block bg-red-100 text-red-600 px-4 py-2 rounded-full text-sm font-semibold mb-4">Proven Results</div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Real Results from Verified Contractors</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">Through the Power100 Experience, contractors consistently achieve measurable improvements</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {report.key_metrics?.map((metric: any, idx: number) => {
              const gradients = [
                'from-green-500 to-emerald-600',
                'from-blue-500 to-cyan-600',
                'from-purple-500 to-violet-600',
                'from-orange-500 to-red-600'
              ];
              const gradient = gradients[idx % gradients.length];

              return (
                <div key={idx} className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                  <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300`}></div>
                  <div className="relative">
                    <div className={`inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br ${gradient} rounded-xl mb-4`}>
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <div className={`text-5xl font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent mb-2`}>{metric.metric}</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{metric.label}</h3>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Score Breakdown */}
      {report.score_breakdown && (
        <div className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Why Partners Choose {report.partner?.name || 'Us'}</h2>
            <div className="grid md:grid-cols-4 gap-6">
              {Object.entries(report.score_breakdown).map(([key, data]: [string, any]) => (
                <Card key={key} className="p-6 text-center">
                  <div className="mb-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-power100-red/10">
                      <Star className="h-8 w-8 text-power100-red" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold mb-1">{data.score}/{data.max}</p>
                  <p className="text-gray-600">{data.label}</p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Testimonials */}
      {report.testimonials && report.testimonials.length > 0 && (
        <div className="py-20 bg-gradient-to-b from-gray-50 to-white">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-16">
              <div className="inline-block bg-red-100 text-red-600 px-4 py-2 rounded-full text-sm font-semibold mb-4">Client Success Stories</div>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">What Contractors Say</h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-12">
              {report.testimonials.map((testimonial: any, idx: number) => (
                <div key={idx} className="group bg-white rounded-2xl p-8 shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 relative">
                  <Quote className="absolute top-6 right-6 w-12 h-12 text-red-600 opacity-10 group-hover:opacity-20 transition-opacity" />
                  <div className="flex gap-1 mb-4">
                    {[1,2,3,4,5].map((i) => (<Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />))}
                  </div>
                  <p className="text-gray-700 text-lg leading-relaxed mb-6 relative z-10">"{testimonial.quote}"</p>
                  <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                    <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center text-white font-bold">
                      {testimonial.author.split(' ').map((n: string) => n[0]).join('')}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{testimonial.author}</p>
                      <p className="text-sm text-gray-600">{testimonial.company}</p>
                      {testimonial.revenue_tier && (
                        <span className="text-xs text-gray-500">{testimonial.revenue_tier}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Video Section - Get To Know More About Partner */}
      <div className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-block bg-red-100 text-red-600 px-4 py-2 rounded-full text-sm font-semibold mb-4">See It In Action</div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Get To Know More About {report.partner?.name || 'Our Partner'}</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {videos.map((video, idx) => {
              const videoId = extractYouTubeId(video.url);
              return (
                <div 
                  key={idx} 
                  className="relative group cursor-pointer"
                  onClick={() => setActiveVideo(videoId)}
                >
                  <div className="relative overflow-hidden rounded-xl shadow-lg bg-gray-900" style={{ paddingBottom: '56.25%' }}>
                    {/* Custom Thumbnail or YouTube Thumbnail - Force 16:9 aspect ratio */}
                    <img 
                      src={video.thumbnail || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                      alt={video.title}
                      className="absolute top-0 left-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                      style={{ objectFit: 'cover', objectPosition: 'center' }}
                      onError={(e) => {
                        // Fallback to YouTube thumbnail if custom thumbnail fails
                        if (video.thumbnail) {
                          (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
                        } else {
                          // Fallback to default quality if maxres not available
                          (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                        }
                      }}
                    />
                    {/* Play Button Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-20 h-20 bg-white/90 group-hover:bg-white rounded-full flex items-center justify-center transform group-hover:scale-110 transition-all shadow-2xl">
                        {/* Custom triangular play button */}
                        <svg 
                          viewBox="0 0 24 24" 
                          className="w-8 h-8 ml-1"
                          fill="none"
                        >
                          <path 
                            d="M8 5.14v13.72c0 .9 1 1.45 1.76.97l10.48-6.86a1.1 1.1 0 0 0 0-1.94L9.76 4.17A1.11 1.11 0 0 0 8 5.14Z" 
                            fill="currentColor"
                            className="text-power100-red"
                          />
                        </svg>
                      </div>
                    </div>
                    {/* Video Title Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                      <h3 className="text-white font-semibold text-lg">{video.title}</h3>
                      <p className="text-white/80 text-sm">{video.duration}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Case Studies */}
      {report.case_studies && report.case_studies.length > 0 && (
        <div className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Success Stories</h2>
            <div className="grid md:grid-cols-2 gap-8">
              {report.case_studies.map((study: any, idx: number) => (
                <Card key={idx} className="p-8">
                  <h3 className="text-xl font-bold mb-2">{study.title}</h3>
                  <p className="text-gray-600 mb-4">{study.client_type}</p>
                  <div className="space-y-3 mb-6">
                    {study.results.map((result: string, ridx: number) => (
                      <div key={ridx} className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                        <span className="font-medium">{result}</span>
                      </div>
                    ))}
                  </div>
                  <Button className="w-full">{study.cta}</Button>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Final CTA */}
      <div className="py-20 bg-gradient-to-r from-power100-red to-red-700 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Transform Your Team?</h2>
          <p className="text-xl mb-8 text-white/90">
            Join 500+ contractors who have revolutionized their company culture with {report.partner?.name || 'our partner'}
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" className="bg-power100-green hover:bg-green-600 text-white">
              <Calendar className="h-5 w-5 mr-2" />
              Schedule Your Introduction
            </Button>
            <Button size="lg" variant="outline" className="bg-black hover:bg-gray-800 text-white">
              <Users className="h-5 w-5 mr-2" />
              View All Success Stories
            </Button>
          </div>
        </div>
      </div>

      {/* Video Modal */}
      {activeVideo && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setActiveVideo(null)}
        >
          <div 
            className="relative w-full max-w-5xl mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setActiveVideo(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <X className="h-8 w-8" />
            </button>
            
            {/* YouTube Embed */}
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden shadow-2xl">
              <iframe
                src={`https://www.youtube.com/embed/${activeVideo}?autoplay=1&rel=0&modestbranding=1`}
                title="YouTube video player"
                className="absolute inset-0 w-full h-full"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            
            {/* Optional: Video Title Below */}
            <div className="mt-4 text-center">
              <p className="text-white text-lg font-semibold">
                {videos.find(v => extractYouTubeId(v.url) === activeVideo)?.title}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
