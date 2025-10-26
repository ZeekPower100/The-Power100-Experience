'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Target,
  CheckSquare,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Users,
  Activity,
  BarChart3,
  PieChart,
  RefreshCw,
  Calendar
} from 'lucide-react';

interface OverviewData {
  goals: {
    total_goals: string;
    active_goals: string;
    completed_goals: string;
    completion_rate: string;
  };
  actions: {
    total_actions: string;
    pending_actions: string;
    completed_actions: string;
    overdue_actions: string;
    completion_rate: string;
  };
  messages: {
    total_messages: string;
    sent_messages: string;
    responded_messages: string;
    response_rate: string;
    avg_outcome_rating: string | null;
  };
  trust: {
    avg_trust_score: string;
    min_trust_score: string;
    max_trust_score: string;
    high_trust_count: string;
    medium_trust_count: string;
    low_trust_count: string;
  };
  contractors: {
    total_contractors: string;
    active_contractors: string;
    new_contractors_30d: string;
  };
}

interface TrendData {
  date: string;
  created?: string;
  completed?: string;
  sent?: string;
  responded?: string;
  avg_trust_score?: string;
  contractors_tracked?: string;
}

interface SegmentData {
  trust_segment?: string;
  engagement_segment?: string;
  contractor_count: string;
  avg_trust_score?: string;
}

export default function IGEAnalyticsPage() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [trustSegments, setTrustSegments] = useState<SegmentData[]>([]);
  const [engagementSegments, setEngagementSegments] = useState<SegmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState('goals');
  const [selectedPeriod, setSelectedPeriod] = useState('30d');

  useEffect(() => {
    fetchAnalytics();
  }, []);

  useEffect(() => {
    fetchTrends();
  }, [selectedMetric, selectedPeriod]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [overviewRes, trustSegRes, engagementSegRes] = await Promise.all([
        fetch('/api/ige-monitor/analytics/overview'),
        fetch('/api/ige-monitor/analytics/segments/by-trust'),
        fetch('/api/ige-monitor/analytics/segments/by-engagement')
      ]);

      const overviewData = await overviewRes.json();
      const trustSegData = await trustSegRes.json();
      const engagementSegData = await engagementSegRes.json();

      if (overviewData.success) setOverview(overviewData.overview);
      if (trustSegData.success) setTrustSegments(trustSegData.segments);
      if (engagementSegData.success) setEngagementSegments(engagementSegData.segments);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrends = async () => {
    try {
      const response = await fetch(`/api/ige-monitor/analytics/trends/${selectedMetric}?period=${selectedPeriod}`);
      const data = await response.json();
      if (data.success) {
        setTrends(data.trends);
      }
    } catch (error) {
      console.error('Error fetching trends:', error);
    }
  };

  const getTrustColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSegmentColor = (segment: string) => {
    switch (segment) {
      case 'high': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-red-100 text-red-800';
      case 'highly_active': return 'bg-blue-100 text-blue-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'less_active': return 'bg-yellow-100 text-yellow-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading || !overview) {
    return (
      <div className="min-h-screen bg-power100-bg-grey flex items-center justify-center">
        <p className="text-gray-500">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-power100-bg-grey p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-power100-black">IGE Analytics Dashboard</h1>
            <p className="text-gray-600 mt-1">System-wide performance metrics and insights</p>
          </div>
          <Button
            onClick={fetchAnalytics}
            variant="outline"
            className="bg-white"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* System Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Goals Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center">
                <Target className="h-4 w-4 mr-2 text-blue-600" />
                Goals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-bold">{overview.goals.total_goals}</span>
                  <Badge className="bg-blue-100 text-blue-800">
                    {overview.goals.completion_rate}% complete
                  </Badge>
                </div>
                <div className="text-sm text-gray-600">
                  <div>Active: {overview.goals.active_goals}</div>
                  <div>Completed: {overview.goals.completed_goals}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center">
                <CheckSquare className="h-4 w-4 mr-2 text-orange-600" />
                Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-bold">{overview.actions.total_actions}</span>
                  <Badge className="bg-orange-100 text-orange-800">
                    {overview.actions.completion_rate}% complete
                  </Badge>
                </div>
                <div className="text-sm text-gray-600">
                  <div>Pending: {overview.actions.pending_actions}</div>
                  <div>Overdue: {overview.actions.overdue_actions}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Messages Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center">
                <MessageSquare className="h-4 w-4 mr-2 text-purple-600" />
                Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-bold">{overview.messages.sent_messages}</span>
                  <Badge className="bg-purple-100 text-purple-800">
                    {overview.messages.response_rate || '0'}% response
                  </Badge>
                </div>
                <div className="text-sm text-gray-600">
                  <div>Responded: {overview.messages.responded_messages}</div>
                  <div>Rating: {overview.messages.avg_outcome_rating || 'N/A'}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trust Score Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center">
                <TrendingUp className="h-4 w-4 mr-2 text-green-600" />
                Trust Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className={`text-3xl font-bold ${getTrustColor(parseFloat(overview.trust.avg_trust_score))}`}>
                    {parseFloat(overview.trust.avg_trust_score).toFixed(0)}
                  </span>
                  <Badge className="bg-green-100 text-green-800">
                    Avg
                  </Badge>
                </div>
                <div className="text-sm text-gray-600">
                  <div>High: {overview.trust.high_trust_count}</div>
                  <div>Medium: {overview.trust.medium_trust_count}</div>
                  <div>Low: {overview.trust.low_trust_count}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contractors Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2 text-power100-red" />
              Contractor Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-power100-black">{overview.contractors.total_contractors}</div>
                <div className="text-sm text-gray-600 mt-1">Total Contractors</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-green-600">{overview.contractors.active_contractors}</div>
                <div className="text-sm text-gray-600 mt-1">Active (Last 30 Days)</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600">{overview.contractors.new_contractors_30d}</div>
                <div className="text-sm text-gray-600 mt-1">New (Last 30 Days)</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trends Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-power100-red" />
                Trends Over Time
              </CardTitle>
              <div className="flex gap-2">
                <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                  <SelectTrigger className="w-40 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="goals">Goals</SelectItem>
                    <SelectItem value="actions">Actions</SelectItem>
                    <SelectItem value="messages">Messages</SelectItem>
                    <SelectItem value="trust">Trust Score</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-32 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="7d">7 Days</SelectItem>
                    <SelectItem value="30d">30 Days</SelectItem>
                    <SelectItem value="90d">90 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {trends.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No trend data available for this period</p>
            ) : (
              <div className="space-y-3">
                {trends.map((trend, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded">
                    <div className="flex items-center text-sm text-gray-600 w-32">
                      <Calendar className="h-4 w-4 mr-2" />
                      {new Date(trend.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                    {trend.created && (
                      <div className="flex-1">
                        <span className="text-sm font-medium">Created: </span>
                        <span className="text-lg font-bold text-blue-600">{trend.created}</span>
                      </div>
                    )}
                    {trend.completed && (
                      <div className="flex-1">
                        <span className="text-sm font-medium">Completed: </span>
                        <span className="text-lg font-bold text-green-600">{trend.completed}</span>
                      </div>
                    )}
                    {trend.sent && (
                      <div className="flex-1">
                        <span className="text-sm font-medium">Sent: </span>
                        <span className="text-lg font-bold text-purple-600">{trend.sent}</span>
                      </div>
                    )}
                    {trend.responded && (
                      <div className="flex-1">
                        <span className="text-sm font-medium">Responded: </span>
                        <span className="text-lg font-bold text-green-600">{trend.responded}</span>
                      </div>
                    )}
                    {trend.avg_trust_score && (
                      <div className="flex-1">
                        <span className="text-sm font-medium">Avg Trust: </span>
                        <span className={`text-lg font-bold ${getTrustColor(parseFloat(trend.avg_trust_score))}`}>
                          {parseFloat(trend.avg_trust_score).toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Segmentation Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Trust Segmentation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <PieChart className="h-5 w-5 mr-2 text-power100-red" />
                Contractors by Trust Score
              </CardTitle>
              <CardDescription>Distribution across trust levels</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {trustSegments.map((segment, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="flex items-center gap-3">
                      <Badge className={getSegmentColor(segment.trust_segment || '')}>
                        {segment.trust_segment?.toUpperCase()}
                      </Badge>
                      <span className="text-sm text-gray-600">
                        Avg: {segment.avg_trust_score ? parseFloat(segment.avg_trust_score).toFixed(1) : 'N/A'}
                      </span>
                    </div>
                    <div className="text-2xl font-bold">{segment.contractor_count}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Engagement Segmentation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2 text-power100-red" />
                Contractors by Engagement
              </CardTitle>
              <CardDescription>Distribution by activity level</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {engagementSegments.map((segment, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <Badge className={getSegmentColor(segment.engagement_segment || '')}>
                      {segment.engagement_segment?.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <div className="text-2xl font-bold">{segment.contractor_count}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
