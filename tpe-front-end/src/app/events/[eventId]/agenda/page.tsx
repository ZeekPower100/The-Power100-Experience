'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Calendar, Users, Building2, TrendingUp, ArrowRight, Star, MapPin, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Recommendation {
  id: number;
  entity_type: 'speaker' | 'sponsor' | 'peer';
  entity_id: string;
  entity_name: string;
  reason: string;
  confidence_score: number;
  engagement: string;
  created_at: string;
}

export default function EventAgendaPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = params.eventId as string;
  const contractorId = searchParams.get('contractor');

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<any>(null);
  const [contractor, setContractor] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  useEffect(() => {
    if (!contractorId) {
      alert('Contractor ID is required');
      return;
    }
    loadData();
  }, [eventId, contractorId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Backend API base URL
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

      // Load event details
      const eventResponse = await fetch(`${API_BASE}/api/events/${eventId}`);
      if (eventResponse.ok) {
        const eventData = await eventResponse.json();
        setEvent(eventData.event || eventData);
      }

      // Load contractor details
      const contractorResponse = await fetch(`${API_BASE}/api/contractors/${contractorId}`);
      if (contractorResponse.ok) {
        const contractorData = await contractorResponse.json();
        setContractor(contractorData.contractor || contractorData);
      }

      // Load AI recommendations (optional - may not exist for all contractors)
      try {
        const recommendationsResponse = await fetch(`${API_BASE}/api/contractor-recommendations/contractor/${contractorId}`);
        if (recommendationsResponse.ok) {
          const recsData = await recommendationsResponse.json();
          setRecommendations(recsData.data || recsData.recommendations || []);
        }
      } catch (err) {
        // Recommendations are optional, continue without them
        console.log('No recommendations available');
      }

    } catch (error) {
      console.error('Error loading agenda:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSpeakerRecommendations = () => recommendations.filter(r => r.entity_type === 'speaker');
  const getSponsorRecommendations = () => recommendations.filter(r => r.entity_type === 'sponsor');
  const getPeerRecommendations = () => recommendations.filter(r => r.entity_type === 'peer');

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const getConfidenceBadge = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-power100-bg-grey flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-power100-red mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your personalized agenda...</p>
        </div>
      </div>
    );
  }

  const speakerRecs = getSpeakerRecommendations();
  const sponsorRecs = getSponsorRecommendations();
  const peerRecs = getPeerRecommendations();

  return (
    <div className="min-h-screen bg-power100-bg-grey">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-power100-red rounded-full flex items-center justify-center">
                <Calendar className="h-6 w-6 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-power100-black mb-2">
              Your Personalized Event Agenda
            </h1>
            <p className="text-xl text-gray-600 mb-2">
              {event?.name || 'Event'}
            </p>
            <p className="text-gray-500">
              Welcome, {contractor?.first_name || contractor?.name}! Here's your AI-curated experience.
            </p>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-900">{speakerRecs.length}</div>
              <div className="text-sm text-blue-700">Must-See Speakers</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <Building2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-900">{sponsorRecs.length}</div>
              <div className="text-sm text-green-700">Recommended Sponsors</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <TrendingUp className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-900">{peerRecs.length}</div>
              <div className="text-sm text-purple-700">Networking Matches</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-12 space-y-8">
        {/* Speakers Section */}
        {speakerRecs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <Users className="h-6 w-6 text-power100-red" />
              <h2 className="text-2xl font-bold text-power100-black">Must-See Speakers</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {speakerRecs.map((rec) => (
                <Card key={rec.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${getConfidenceBadge(rec.confidence_score)}`}>
                      {rec.confidence_score}% Match
                    </span>
                  </div>
                  <h3 className="font-bold text-lg text-power100-black mb-2">
                    {rec.entity_name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {rec.reason}
                  </p>
                  <div className="flex items-center text-xs text-gray-500 gap-2">
                    <Clock className="h-3 w-3" />
                    <span>Session details TBA</span>
                  </div>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {/* Sponsors Section */}
        {sponsorRecs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <Building2 className="h-6 w-6 text-power100-red" />
              <h2 className="text-2xl font-bold text-power100-black">Recommended Sponsors</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sponsorRecs.map((rec) => (
                <Card key={rec.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-green-600" />
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${getConfidenceBadge(rec.confidence_score)}`}>
                      {rec.confidence_score}% Match
                    </span>
                  </div>
                  <h3 className="font-bold text-lg text-power100-black mb-2">
                    {rec.entity_name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {rec.reason}
                  </p>
                  <div className="flex items-center text-xs text-gray-500 gap-2">
                    <MapPin className="h-3 w-3" />
                    <span>Visit their booth</span>
                  </div>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {/* Networking Section */}
        {peerRecs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="h-6 w-6 text-power100-red" />
              <h2 className="text-2xl font-bold text-power100-black">Networking Matches</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {peerRecs.map((rec) => (
                <Card key={rec.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-purple-600" />
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${getConfidenceBadge(rec.confidence_score)}`}>
                      {rec.confidence_score}% Match
                    </span>
                  </div>
                  <h3 className="font-bold text-lg text-power100-black mb-2">
                    {rec.entity_name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {rec.reason}
                  </p>
                  <div className="flex items-center text-xs text-gray-500 gap-2">
                    <Star className="h-3 w-3" />
                    <span>Great networking opportunity</span>
                  </div>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {recommendations.length === 0 && (
          <Card className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Your Agenda is Being Prepared
            </h3>
            <p className="text-gray-600 mb-6">
              Our AI is analyzing the best speakers, sponsors, and networking opportunities for you.
              Check back soon!
            </p>
          </Card>
        )}

        {/* CTA Section */}
        <Card className="bg-gradient-to-br from-power100-red to-red-700 text-white p-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-3">Ready for an Amazing Event?</h3>
            <p className="text-white/90 mb-6">
              Your personalized agenda is designed to maximize your ROI. Don't miss these connections!
            </p>
            <Button
              className="bg-white text-power100-red hover:bg-gray-100 font-semibold"
              onClick={() => {
                // Navigate to resources page when ready
                alert('Event resources coming soon!');
              }}
            >
              View Event Resources
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
