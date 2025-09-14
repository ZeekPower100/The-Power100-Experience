'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  Star, 
  MessageSquare, 
  Users, 
  Send,
  BarChart3,
  RefreshCw 
} from 'lucide-react';
import { motion } from 'framer-motion';

interface PowerConfidenceAnalytics {
  partnerSummary: Array<{
    id: number;
    company_name: string;
    power_confidence_score: number;
    average_satisfaction: number;
    total_feedback_responses: number;
    feedback_trend: 'improving' | 'declining' | 'stable';
    total_contractors_matched: number;
    completed_demos: number;
    recent_satisfaction_avg: number;
  }>;
  systemMetrics: {
    total_active_partners: number;
    avg_powerconfidence_score: number;
    total_feedback_responses: number;
    avg_system_satisfaction: number;
    recent_responses: number;
  };
  quarterlyTrends: Array<{
    quarter: string;
    partners_with_feedback: number;
    total_responses: number;
    avg_satisfaction: number;
  }>;
}

const PowerConfidenceDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<PowerConfidenceAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_BASE_URL}/feedback/analytics/dashboard`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching PowerConfidence analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateAllScores = async () => {
    try {
      setUpdating(true);
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_BASE_URL}/feedback/powerconfidence/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        throw new Error('Failed to update scores');
      }

      // Refresh analytics after update
      await fetchAnalytics();
    } catch (error) {
      console.error('Error updating PowerConfidence scores:', error);
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading PowerConfidence analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-600">Failed to load analytics data</p>
        <Button onClick={fetchAnalytics} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <BarChart3 className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving':
        return 'bg-green-100 text-green-800';
      case 'declining':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">PowerConfidence Dashboard</h1>
          <p className="text-gray-600 mt-2">Monitor partner satisfaction and feedback trends</p>
        </div>
        <Button 
          onClick={updateAllScores} 
          disabled={updating}
          className="bg-red-600 hover:bg-red-700"
        >
          {updating ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Update All Scores
        </Button>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Partners</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics.systemMetrics.total_active_partners}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Star className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg PowerConfidence</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(analytics.systemMetrics.avg_powerconfidence_score)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <MessageSquare className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Responses</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics.systemMetrics.total_feedback_responses}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Satisfaction</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics.systemMetrics.avg_system_satisfaction?.toFixed(1) || 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="partners" className="space-y-4">
        <TabsList>
          <TabsTrigger value="partners">Partner Performance</TabsTrigger>
          <TabsTrigger value="trends">Quarterly Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="partners">
          <Card>
            <CardHeader>
              <CardTitle>Partner PowerConfidence Rankings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.partnerSummary.map((partner, index) => (
                  <motion.div
                    key={partner.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="text-lg font-semibold text-gray-400">
                        #{index + 1}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {partner.company_name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {partner.total_contractors_matched} contractors matched • {' '}
                          {partner.completed_demos} demos completed
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-6">
                      <div className="text-center">
                        <p className="text-lg font-bold text-red-600">
                          {partner.power_confidence_score}
                        </p>
                        <p className="text-xs text-gray-500">PowerConfidence</p>
                      </div>

                      <div className="text-center">
                        <p className="text-lg font-bold text-blue-600">
                          {partner.recent_satisfaction_avg?.toFixed(1) || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-500">Satisfaction</p>
                      </div>

                      <div className="text-center">
                        <p className="text-lg font-bold text-green-600">
                          {partner.total_feedback_responses}
                        </p>
                        <p className="text-xs text-gray-500">Responses</p>
                      </div>

                      <Badge className={getTrendColor(partner.feedback_trend)}>
                        {getTrendIcon(partner.feedback_trend)}
                        <span className="ml-1 capitalize">{partner.feedback_trend}</span>
                      </Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Quarterly Feedback Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.quarterlyTrends.map((trend, index) => (
                  <motion.div
                    key={trend.quarter}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg"
                  >
                    <div>
                      <h3 className="font-semibold text-gray-900">{trend.quarter}</h3>
                      <p className="text-sm text-gray-600">
                        {trend.partners_with_feedback} partners provided feedback
                      </p>
                    </div>

                    <div className="flex items-center space-x-6">
                      <div className="text-center">
                        <p className="text-lg font-bold text-green-600">
                          {trend.total_responses}
                        </p>
                        <p className="text-xs text-gray-500">Total Responses</p>
                      </div>

                      <div className="text-center">
                        <p className="text-lg font-bold text-blue-600">
                          {trend.avg_satisfaction?.toFixed(1) || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-500">Avg Satisfaction</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PowerConfidenceDashboard;