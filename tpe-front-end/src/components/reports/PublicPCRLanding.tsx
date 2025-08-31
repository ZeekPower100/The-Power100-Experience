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
  Users, 
  Building2,
  Play,
  Download,
  Calendar,
  Award,
  CheckCircle,
  PlayCircle,
  X
} from 'lucide-react';

interface PublicPCRProps {
  partnerId: string;
}

export default function PublicPCRLanding({ partnerId }: PublicPCRProps) {
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
      const data = await response.json();
      
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
      <div className="bg-gradient-to-r from-power100-red to-red-700 text-white py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-yellow-400 text-black">
                <Trophy className="h-4 w-4 mr-1" />
                {report.powerconfidence_score?.percentile || '99th percentile'}
              </Badge>
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
              <div className="flex gap-4">
                <Button size="lg" className="bg-power100-green hover:bg-green-600 text-white">
                  <Calendar className="h-4 w-4 mr-2" />
                  {report.cta?.primary?.text || 'Schedule Introduction'}
                </Button>
                <Button size="lg" variant="outline" className="bg-black hover:bg-gray-800 text-white">
                  <Download className="h-4 w-4 mr-2" />
                  {report.cta?.secondary?.text || 'Download Report'}
                </Button>
              </div>
            </div>

            {/* PowerConfidence Score Display */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-64 h-64 rounded-full bg-white/10 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-sm uppercase tracking-wide mb-2">PowerConfidence Rating</p>
                    <p className="text-8xl font-bold">{report.powerconfidence_score?.current || 99}</p>
                    <p className="text-xl mt-2">{report.powerconfidence_score?.label || 'Elite Partner'}</p>
                  </div>
                </div>
                <div className="absolute -top-4 -right-4">
                  <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center">
                    <Trophy className="h-8 w-8 text-black" />
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

      {/* Key Metrics */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-2">Proven Results</h2>
          <p className="text-center text-gray-600 mb-10">*Based from verified Contractors through the Power100 Experience</p>
          <div className="grid md:grid-cols-4 gap-8">
            {report.key_metrics?.map((metric: any, idx: number) => (
              <div key={idx} className="text-center">
                <div className="text-4xl font-bold text-power100-red mb-2">{metric.metric}</div>
                <p className="text-gray-600">{metric.label}</p>
              </div>
            ))}
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
        <div className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">What Contractors Say</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {report.testimonials.map((testimonial: any, idx: number) => (
                <Card key={idx} className="p-6">
                  <div className="flex mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-700 mb-4 italic">"{testimonial.quote}"</p>
                  <div className="border-t pt-4">
                    <p className="font-semibold">{testimonial.author}</p>
                    <p className="text-sm text-gray-600">{testimonial.company}</p>
                    {testimonial.revenue_tier && (
                      <Badge variant="outline" className="mt-2">{testimonial.revenue_tier}</Badge>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Video Section - Get To Know More About Destination Motivation */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Get To Know More About Destination Motivation</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {videos.map((video, idx) => {
              const videoId = extractYouTubeId(video.url);
              return (
                <div 
                  key={idx} 
                  className="relative group cursor-pointer"
                  onClick={() => setActiveVideo(videoId)}
                >
                  <div className="relative overflow-hidden rounded-xl shadow-lg bg-black aspect-video">
                    {/* Custom Thumbnail or YouTube Thumbnail */}
                    <img 
                      src={video.thumbnail || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                      alt={video.title}
                      className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
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
                      <div className="bg-power100-red/90 group-hover:bg-power100-red rounded-full p-4 transform group-hover:scale-110 transition-all shadow-2xl">
                        <PlayCircle className="h-12 w-12 text-white" fill="white" />
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
