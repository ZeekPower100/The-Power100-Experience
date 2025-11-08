// Public PCR Landing Page - No Authentication Required
// DATABASE-CHECKED: strategic_partners, partner_reports verified November 2, 2025
'use client';

import { useState, useEffect, use } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Star,
  Trophy,
  Users,
  Calendar,
  Download,
  CheckCircle,
  X
} from 'lucide-react';

interface PCRData {
  partner: {
    id: number;
    companyName: string;
    description: string;
    valueProposition: string;
    logoUrl: string | null;
    website: string | null;
    pcrScore: number;
    badges: string[];
    performanceTrend: string;
    engagementTier: string;
    differentiators: string;
    testimonials: Array<{
      author: string;
      company: string;
      quote: string;
      rating: number;
    }>;
    videos: Array<{
      url: string;
      title: string;
      duration: string;
      thumbnail: string | null;
    }>;
  };
  recentReports: Array<{
    id: number;
    quarter: string;
    year: number;
    reportType: string;
    reportData: any;
    viewCount: number;
  }>;
}

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default function PublicPCRPage({ params }: PageProps) {
  const [pcrData, setPCRData] = useState<PCRData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  // Helper function to extract YouTube video ID from various URL formats
  const extractYouTubeId = (url: string): string => {
    if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
      return url;
    }

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

    return url;
  };

  // Default videos if none provided
  const defaultVideos = [
    {
      url: 'https://www.youtube.com/watch?v=SI-q7Cwqut8',
      title: 'Introduction',
      duration: '2:45',
      thumbnail: null
    },
    {
      url: 'https://www.youtube.com/watch?v=Z3VoZ0V_H8k',
      title: 'Success Stories',
      duration: '4:12',
      thumbnail: null
    }
  ];

  const videos = pcrData?.partner?.videos && pcrData.partner.videos.length > 0
    ? pcrData.partner.videos
    : defaultVideos;

  useEffect(() => {
    loadPCRData();
  }, [slug]);

  // Handle ESC key to close video modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveVideo(null);
      }
    };

    if (activeVideo) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [activeVideo]);

  async function loadPCRData() {
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_BASE_URL}/reports/public/pcr/${slug}`);

      if (!response.ok) {
        throw new Error('PCR page not found');
      }

      const data = await response.json();
      setPCRData(data.pcr);
    } catch (error) {
      console.error('Error loading PCR data:', error);
      setError('PCR page not found or partner is inactive');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-power100-red"></div>
      </div>
    );
  }

  if (error || !pcrData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6">
          <p className="text-red-600">{error || 'PCR page not found'}</p>
          <Button onClick={loadPCRData} className="mt-4">Retry</Button>
        </Card>
      </div>
    );
  }

  const { partner, recentReports } = pcrData;

  // Calculate key metrics from recent reports
  const keyMetrics = [
    { metric: `${partner.pcrScore?.toFixed(0) || 'N/A'}`, label: 'PowerConfidence Score' },
    { metric: `${recentReports?.length || 0}`, label: 'Quarterly Reports' },
    { metric: `${partner.badges?.length || 0}`, label: 'Achievements' },
    { metric: `${partner.testimonials?.length || 0}`, label: 'Client Reviews' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-power100-red to-red-700 text-white py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-yellow-400 text-black">
                <Trophy className="h-4 w-4 mr-1" />
                Top-Tier Partner
              </Badge>
              <h1 className="text-5xl font-bold mb-4">{partner.companyName}</h1>
              <p className="text-2xl mb-6 text-white/90">{partner.valueProposition}</p>

              {/* Trust Badges */}
              {partner.badges && partner.badges.length > 0 && (
                <div className="flex flex-wrap gap-3 mb-8">
                  {partner.badges.map((badge, idx) => (
                    <Badge key={idx} className="bg-white/10 text-white border-white/20">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {badge}
                    </Badge>
                  ))}
                </div>
              )}

              {/* CTA Buttons */}
              <div className="flex gap-4">
                <Button
                  size="lg"
                  className="bg-power100-green hover:bg-green-600 text-white"
                  onClick={() => partner.website && window.open(partner.website, '_blank')}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Introduction
                </Button>
                <Button size="lg" variant="outline" className="bg-white text-power100-red hover:bg-gray-100">
                  <Download className="h-4 w-4 mr-2" />
                  Download Report
                </Button>
              </div>
            </div>

            {/* PowerConfidence Score Display */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-64 h-64 rounded-full bg-white/10 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-sm uppercase tracking-wide mb-2">PowerConfidence Rating</p>
                    <p className="text-8xl font-bold">{partner.pcrScore?.toFixed(0) || 'N/A'}</p>
                    <p className="text-xl mt-2">{partner.engagementTier || 'Elite Partner'}</p>
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
            {partner.description}
          </p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-2">Proven Results</h2>
          <p className="text-center text-gray-600 mb-10">*Based from verified Contractors through the Power100 Experience</p>
          <div className="grid md:grid-cols-4 gap-8">
            {keyMetrics.map((metric, idx) => (
              <div key={idx} className="text-center">
                <div className="text-4xl font-bold text-power100-red mb-2">{metric.metric}</div>
                <p className="text-gray-600">{metric.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* About Section */}
      {partner.differentiators && (
        <div className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Why Partners Choose {partner.companyName}</h2>
            <Card className="p-8">
              <p className="text-lg text-gray-700 leading-relaxed">{partner.differentiators}</p>
            </Card>
          </div>
        </div>
      )}

      {/* Testimonials */}
      {partner.testimonials && partner.testimonials.length > 0 && (
        <div className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">What Contractors Say</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {partner.testimonials.map((testimonial, idx) => (
                <Card key={idx} className="p-6">
                  <div className="flex mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-5 w-5 ${i < testimonial.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                      />
                    ))}
                  </div>
                  <p className="text-gray-700 mb-4 italic">&ldquo;{testimonial.quote}&rdquo;</p>
                  <div className="border-t pt-4">
                    <p className="font-semibold">{testimonial.author}</p>
                    <p className="text-sm text-gray-600">{testimonial.company}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Video Section */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Get To Know More About {partner.companyName}</h2>
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
                    <img
                      src={video.thumbnail || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                      alt={video.title}
                      className="absolute top-0 left-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                      style={{ objectFit: 'cover', objectPosition: 'center' }}
                      onError={(e) => {
                        if (video.thumbnail) {
                          (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
                        } else {
                          (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                        }
                      }}
                    />
                    {/* Play Button Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-20 h-20 bg-white/90 group-hover:bg-white rounded-full flex items-center justify-center transform group-hover:scale-110 transition-all shadow-2xl">
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

      {/* Recent Performance Reports */}
      {recentReports && recentReports.length > 0 && (
        <div className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Recent Performance Reports</h2>
            <div className="grid md:grid-cols-2 gap-8">
              {recentReports.map((report, idx) => (
                <Card key={idx} className="p-6">
                  <h3 className="text-xl font-bold mb-2">{report.quarter} {report.year}</h3>
                  <p className="text-gray-600 mb-4 capitalize">{report.reportType.replace('_', ' ')}</p>
                  {report.reportData?.performance_summary && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Satisfaction</p>
                        <p className="text-2xl font-bold text-power100-red">
                          {report.reportData.performance_summary.overall_satisfaction}/100
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">NPS Score</p>
                        <p className="text-2xl font-bold text-power100-red">
                          {report.reportData.performance_summary.nps_score}
                        </p>
                      </div>
                    </div>
                  )}
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
            Join hundreds of contractors who have revolutionized their company with {partner.companyName}
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              size="lg"
              className="bg-power100-green hover:bg-green-600 text-white"
              onClick={() => partner.website && window.open(partner.website, '_blank')}
            >
              <Calendar className="h-5 w-5 mr-2" />
              Schedule Your Introduction
            </Button>
            <Button size="lg" variant="outline" className="bg-white text-power100-red hover:bg-gray-100">
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
            <button
              onClick={() => setActiveVideo(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <X className="h-8 w-8" />
            </button>

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
