'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Award,
  Target,
  Users,
  BarChart3,
  Trophy
} from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface DashboardData {
  momentum: {
    hot_streak: number;
    stable: number;
    declining: number;
  };
  trends: {
    improving: number;
    stable: number;
    declining: number;
    new: number;
  };
  badges: {
    total: number;
    average: string;
  };
  scores: {
    average: string;
    min: string;
    max: string;
    total: number;
  };
}

interface ScoreDistribution {
  range: string;
  count: number;
  averageScore: string;
}

interface TopPerformer {
  partnerId: number;
  companyName: string;
  finalPCR: number;
  basePCR: number;
  momentum: number;
  trend: string;
  tier: string;
  badgeCount: number;
}

interface BadgeDistribution {
  type: string;
  name: string;
  category: string;
  icon: string;
  count: number;
}

export default function PCRAnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [scoreDistribution, setScoreDistribution] = useState<ScoreDistribution[]>([]);
  const [topPerformers, setTopPerformers] = useState<TopPerformer[]>([]);
  const [badgeDistribution, setBadgeDistribution] = useState<BadgeDistribution[]>([]);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  async function fetchAnalyticsData() {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        router.push('/admindashboard');
        return;
      }

      // Fetch all analytics data in parallel
      const [dashboardRes, scoresRes, performersRes, badgesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/pcr/dashboard`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/admin/pcr/score-distribution`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/admin/pcr/top-performers?limit=10`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/admin/pcr/badge-distribution`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      const dashboard = await dashboardRes.json();
      const scores = await scoresRes.json();
      const performers = await performersRes.json();
      const badges = await badgesRes.json();

      if (dashboard.success) setDashboardData(dashboard.data);
      if (scores.success) setScoreDistribution(scores.data.distribution);
      if (performers.success) setTopPerformers(performers.data.performers);
      if (badges.success) setBadgeDistribution(badges.data.distribution);

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  }

  function getMomentumIcon(modifier: number) {
    if (modifier === 5) return <TrendingUp className="h-5 w-5 text-green-600" />;
    if (modifier === -3) return <TrendingDown className="h-5 w-5 text-red-600" />;
    return <Minus className="h-5 w-5 text-gray-500" />;
  }

  function getMomentumLabel(modifier: number) {
    if (modifier === 5) return 'Hot Streak';
    if (modifier === -3) return 'Declining';
    return 'Stable';
  }

  function getTierBadge(tier: string) {
    const colors = {
      platinum: 'bg-purple-100 text-purple-800 border-purple-300',
      gold: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      free: 'bg-gray-100 text-gray-800 border-gray-300'
    };
    return colors[tier as keyof typeof colors] || colors.free;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-power100-bg-grey flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-power100-red mx-auto"></div>
          <p className="mt-4 text-power100-grey">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-power100-bg-grey p-8">
        <div className="text-center">
          <p className="text-power100-grey">No analytics data available</p>
        </div>
      </div>
    );
  }

  const momentumTotal = dashboardData.momentum.hot_streak + dashboardData.momentum.stable + dashboardData.momentum.declining;

  return (
    <div className="min-h-screen bg-power100-bg-grey">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <Button
              variant="outline"
              onClick={() => router.push('/admindashboard')}
              className="mb-4"
            >
              ← Back to Dashboard
            </Button>
            <h1 className="text-3xl font-bold text-power100-black">PCR Analytics</h1>
            <p className="text-power100-grey mt-1">PowerConfidence Rating System Overview</p>
          </div>
          <Button
            onClick={() => fetchAnalyticsData()}
            className="bg-power100-green hover:bg-green-600 text-white"
          >
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8 space-y-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-power100-grey">Average PCR</p>
                <p className="text-3xl font-bold text-power100-black mt-1">
                  {dashboardData.scores.average}
                </p>
                <p className="text-xs text-power100-grey mt-1">
                  Range: {dashboardData.scores.min} - {dashboardData.scores.max}
                </p>
              </div>
              <Target className="h-10 w-10 text-power100-red" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-power100-grey">Total Partners</p>
                <p className="text-3xl font-bold text-power100-black mt-1">
                  {dashboardData.scores.total}
                </p>
                <p className="text-xs text-power100-grey mt-1">
                  {dashboardData.trends.improving} improving
                </p>
              </div>
              <Users className="h-10 w-10 text-power100-red" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-power100-grey">Total Badges</p>
                <p className="text-3xl font-bold text-power100-black mt-1">
                  {dashboardData.badges.total}
                </p>
                <p className="text-xs text-power100-grey mt-1">
                  {dashboardData.badges.average} avg per partner
                </p>
              </div>
              <Award className="h-10 w-10 text-power100-red" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-power100-grey">Hot Streak</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {dashboardData.momentum.hot_streak}
                </p>
                <p className="text-xs text-power100-grey mt-1">
                  {momentumTotal > 0 ? Math.round((dashboardData.momentum.hot_streak / momentumTotal) * 100) : 0}% of partners
                </p>
              </div>
              <TrendingUp className="h-10 w-10 text-green-600" />
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Momentum Distribution */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="h-6 w-6 text-power100-red" />
              <h2 className="text-xl font-bold text-power100-black">Momentum Distribution</h2>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <span className="font-semibold">Hot Streak (+5)</span>
                  </div>
                  <span className="text-sm text-power100-grey">{dashboardData.momentum.hot_streak} partners</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-green-600 h-3 rounded-full transition-all"
                    style={{ width: momentumTotal > 0 ? `${(dashboardData.momentum.hot_streak / momentumTotal) * 100}%` : '0%' }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Minus className="h-5 w-5 text-gray-500" />
                    <span className="font-semibold">Stable (0)</span>
                  </div>
                  <span className="text-sm text-power100-grey">{dashboardData.momentum.stable} partners</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gray-500 h-3 rounded-full transition-all"
                    style={{ width: momentumTotal > 0 ? `${(dashboardData.momentum.stable / momentumTotal) * 100}%` : '0%' }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-red-600" />
                    <span className="font-semibold">Declining (-3)</span>
                  </div>
                  <span className="text-sm text-power100-grey">{dashboardData.momentum.declining} partners</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-red-600 h-3 rounded-full transition-all"
                    style={{ width: momentumTotal > 0 ? `${(dashboardData.momentum.declining / momentumTotal) * 100}%` : '0%' }}
                  ></div>
                </div>
              </div>
            </div>
          </Card>

          {/* Performance Trends */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="h-6 w-6 text-power100-red" />
              <h2 className="text-xl font-bold text-power100-black">Performance Trends</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-3xl font-bold text-green-600">{dashboardData.trends.improving || 0}</p>
                <p className="text-sm text-power100-grey mt-1">Improving</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-3xl font-bold text-blue-600">{dashboardData.trends.stable || 0}</p>
                <p className="text-sm text-power100-grey mt-1">Stable</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-3xl font-bold text-red-600">{dashboardData.trends.declining || 0}</p>
                <p className="text-sm text-power100-grey mt-1">Declining</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-3xl font-bold text-gray-600">{dashboardData.trends.new || 0}</p>
                <p className="text-sm text-power100-grey mt-1">New</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Badge Distribution */}
        {badgeDistribution.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Award className="h-6 w-6 text-power100-red" />
              <h2 className="text-xl font-bold text-power100-black">Badge Distribution</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {badgeDistribution.map((badge) => (
                <div key={badge.type} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{badge.icon}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-power100-black">{badge.name}</p>
                      <p className="text-sm text-power100-grey capitalize">{badge.category}</p>
                    </div>
                    <span className="text-2xl font-bold text-power100-red">{badge.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Score Distribution & Top Performers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Score Distribution */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="h-6 w-6 text-power100-red" />
              <h2 className="text-xl font-bold text-power100-black">Score Distribution</h2>
            </div>
            <div className="space-y-3">
              {scoreDistribution.map((range) => (
                <div key={range.range}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold">{range.range}</span>
                    <span className="text-sm text-power100-grey">{range.count} partners (avg: {range.averageScore})</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-power100-red h-2 rounded-full transition-all"
                      style={{ width: `${(range.count / dashboardData.scores.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Top Performers */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Trophy className="h-6 w-6 text-power100-red" />
              <h2 className="text-xl font-bold text-power100-black">Top Performers</h2>
            </div>
            <div className="space-y-3">
              {topPerformers.slice(0, 5).map((performer, index) => (
                <div key={performer.partnerId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-power100-red text-white flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-power100-black truncate">{performer.companyName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded border ${getTierBadge(performer.tier)}`}>
                        {performer.tier}
                      </span>
                      {performer.badgeCount > 0 && (
                        <span className="text-xs text-power100-grey">{performer.badgeCount} badges</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold text-power100-red">{performer.finalPCR.toFixed(2)}</p>
                    {getMomentumIcon(performer.momentum)}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
