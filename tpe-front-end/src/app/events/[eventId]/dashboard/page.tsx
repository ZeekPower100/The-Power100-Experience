'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { TrendingUp, Users, Building2, MessageSquare, Star, BarChart3, Award, Activity } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface PCRScore {
  id: number;
  pcr_type: string;
  entity_id: number;
  entity_name: string;
  explicit_score: number;
  sentiment_score: number;
  final_pcr_score: number;
  response_received: string;
}

export default function EventDashboardPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<any>(null);
  const [pcrScores, setPcrScores] = useState<PCRScore[]>([]);
  const [stats, setStats] = useState({
    totalAttendees: 0,
    checkedIn: 0,
    profilesCompleted: 0,
    overallPCR: 0,
    speakerPCR: 0,
    sponsorPCR: 0,
    peerPCR: 0
  });

  useEffect(() => {
    loadDashboardData();
  }, [eventId]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load event details
      const eventResponse = await fetch(`/api/events/${eventId}`);
      if (eventResponse.ok) {
        const eventData = await eventResponse.json();
        setEvent(eventData);
      }

      // Load PCR scores (we'll need to create this endpoint)
      try {
        const pcrResponse = await fetch(`/api/events/${eventId}/pcr/breakdown`);
        if (pcrResponse.ok) {
          const pcrData = await pcrResponse.json();
          setPcrScores(pcrData.scores || []);

          // Calculate averages by type
          const speakers = pcrData.scores?.filter((s: PCRScore) => s.pcr_type === 'speaker') || [];
          const sponsors = pcrData.scores?.filter((s: PCRScore) => s.pcr_type === 'sponsor') || [];
          const peers = pcrData.scores?.filter((s: PCRScore) => s.pcr_type === 'peer') || [];

          const avgSpeaker = speakers.length > 0
            ? speakers.reduce((sum: number, s: PCRScore) => sum + s.final_pcr_score, 0) / speakers.length
            : 0;
          const avgSponsor = sponsors.length > 0
            ? sponsors.reduce((sum: number, s: PCRScore) => sum + s.final_pcr_score, 0) / sponsors.length
            : 0;
          const avgPeer = peers.length > 0
            ? peers.reduce((sum: number, s: PCRScore) => sum + s.final_pcr_score, 0) / peers.length
            : 0;

          const overall = (avgSpeaker + avgSponsor + avgPeer) / 3;

          setStats(prev => ({
            ...prev,
            overallPCR: Math.round(overall),
            speakerPCR: Math.round(avgSpeaker),
            sponsorPCR: Math.round(avgSponsor),
            peerPCR: Math.round(avgPeer)
          }));
        }
      } catch (pcrError) {
        console.log('PCR data not available yet');
      }

      // Load attendance stats
      try {
        const attendeesResponse = await fetch(`/api/event-check-in/event/${eventId}/attendees`);
        if (attendeesResponse.ok) {
          const attendeesData = await attendeesResponse.json();
          setStats(prev => ({
            ...prev,
            totalAttendees: attendeesData.total || 0,
            checkedIn: attendeesData.checked_in || 0,
            profilesCompleted: attendeesData.attendees?.filter((a: any) => a.profile_completion_status === 'completed').length || 0
          }));
        }
      } catch (statsError) {
        console.log('Stats not available');
      }

    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPCRColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPCRBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-50 border-green-200';
    if (score >= 60) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  const getPCRGradient = (score: number) => {
    if (score >= 80) return 'from-green-500 to-green-600';
    if (score >= 60) return 'from-yellow-500 to-yellow-600';
    return 'from-red-500 to-red-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-power100-bg-grey flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-power100-red mx-auto mb-4"></div>
          <p className="text-gray-600">Loading event dashboard...</p>
        </div>
      </div>
    );
  }

  const speakerScores = pcrScores.filter(s => s.pcr_type === 'speaker');
  const sponsorScores = pcrScores.filter(s => s.pcr_type === 'sponsor');
  const peerScores = pcrScores.filter(s => s.pcr_type === 'peer');

  return (
    <div className="min-h-screen bg-power100-bg-grey">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-power100-red to-red-700 text-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <BarChart3 className="h-10 w-10" />
              <h1 className="text-4xl font-bold">Event Performance Dashboard</h1>
            </div>
            <p className="text-xl text-white/90 mb-6">
              {event?.name || 'Event'} - PowerConfidence Analytics
            </p>

            {/* Overall PCR Score - Big and Prominent */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <div className="text-center">
                <p className="text-white/80 text-lg mb-2">Overall Event PowerConfidence Rating</p>
                <div className="flex items-center justify-center gap-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                    className="text-7xl font-bold"
                  >
                    {stats.overallPCR}%
                  </motion.div>
                  <Award className="h-16 w-16 text-yellow-300" />
                </div>
                <p className="text-white/70 mt-2">
                  Based on {pcrScores.length} contractor responses
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Attendees</p>
                  <p className="text-3xl font-bold text-power100-black">{stats.totalAttendees}</p>
                </div>
                <Users className="h-10 w-10 text-blue-500" />
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Checked In</p>
                  <p className="text-3xl font-bold text-power100-black">{stats.checkedIn}</p>
                </div>
                <Activity className="h-10 w-10 text-green-500" />
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Profiles Completed</p>
                  <p className="text-3xl font-bold text-power100-black">{stats.profilesCompleted}</p>
                </div>
                <TrendingUp className="h-10 w-10 text-purple-500" />
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">PCR Responses</p>
                  <p className="text-3xl font-bold text-power100-black">{pcrScores.length}</p>
                </div>
                <MessageSquare className="h-10 w-10 text-orange-500" />
              </div>
            </Card>
          </motion.div>
        </div>

        {/* PCR Breakdown Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Speaker PCR */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className={`p-6 border-2 ${getPCRBgColor(stats.speakerPCR)}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 bg-gradient-to-br ${getPCRGradient(stats.speakerPCR)} rounded-full flex items-center justify-center`}>
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Speaker PCR</h3>
                  <p className="text-sm text-gray-600">{speakerScores.length} ratings</p>
                </div>
              </div>
              <div className={`text-5xl font-bold ${getPCRColor(stats.speakerPCR)} mb-4`}>
                {stats.speakerPCR}%
              </div>
              <div className="space-y-2">
                {speakerScores.slice(0, 3).map((score) => (
                  <div key={score.id} className="flex justify-between items-center text-sm">
                    <span className="text-gray-700 truncate flex-1">{score.entity_name}</span>
                    <span className={`font-semibold ${getPCRColor(score.final_pcr_score)}`}>
                      {Math.round(score.final_pcr_score)}%
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>

          {/* Sponsor PCR */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className={`p-6 border-2 ${getPCRBgColor(stats.sponsorPCR)}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 bg-gradient-to-br ${getPCRGradient(stats.sponsorPCR)} rounded-full flex items-center justify-center`}>
                  <Building2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Sponsor PCR</h3>
                  <p className="text-sm text-gray-600">{sponsorScores.length} ratings</p>
                </div>
              </div>
              <div className={`text-5xl font-bold ${getPCRColor(stats.sponsorPCR)} mb-4`}>
                {stats.sponsorPCR}%
              </div>
              <div className="space-y-2">
                {sponsorScores.slice(0, 3).map((score) => (
                  <div key={score.id} className="flex justify-between items-center text-sm">
                    <span className="text-gray-700 truncate flex-1">{score.entity_name}</span>
                    <span className={`font-semibold ${getPCRColor(score.final_pcr_score)}`}>
                      {Math.round(score.final_pcr_score)}%
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>

          {/* Peer Matching PCR */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Card className={`p-6 border-2 ${getPCRBgColor(stats.peerPCR)}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 bg-gradient-to-br ${getPCRGradient(stats.peerPCR)} rounded-full flex items-center justify-center`}>
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Peer Matching PCR</h3>
                  <p className="text-sm text-gray-600">{peerScores.length} ratings</p>
                </div>
              </div>
              <div className={`text-5xl font-bold ${getPCRColor(stats.peerPCR)} mb-4`}>
                {stats.peerPCR}%
              </div>
              <div className="space-y-2">
                {peerScores.slice(0, 3).map((score) => (
                  <div key={score.id} className="flex justify-between items-center text-sm">
                    <span className="text-gray-700 truncate flex-1">{score.entity_name}</span>
                    <span className={`font-semibold ${getPCRColor(score.final_pcr_score)}`}>
                      {Math.round(score.final_pcr_score)}%
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Empty State */}
        {pcrScores.length === 0 && (
          <Card className="p-12 text-center">
            <Star className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              No PCR Data Yet
            </h3>
            <p className="text-gray-600">
              PowerConfidence ratings will appear here as contractors provide feedback on their event experience.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
