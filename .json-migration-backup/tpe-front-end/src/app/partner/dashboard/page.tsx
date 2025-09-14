'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Award, 
  Users, 
  MessageSquare, 
  Calendar,
  Download,
  LogOut,
  Home,
  BarChart3,
  Target,
  Star,
  FileText
} from 'lucide-react';
import { motion } from 'framer-motion';
import { exportToPDF, exportToExcel } from '@/utils/exportReports';

interface PartnerData {
  id: number;
  company_name: string;
  contact_email: string;
  power_confidence_score: number;
  score_trend: 'up' | 'down' | 'stable';
  industry_rank: number;
  total_partners_in_category: number;
  recent_feedback_count: number;
  avg_satisfaction: number;
  total_contractors: number;
  active_contractors: number;
}

interface CategoryScore {
  category: string;
  score: number;
  trend: string;
  feedback_count: number;
}

interface QuarterlyScore {
  quarter: string;
  score: number;
  feedback_count: number;
}

export default function PartnerDashboard() {
  const router = useRouter();
  const [partnerData, setPartnerData] = useState<PartnerData | null>(null);
  const [categoryScores, setCategoryScores] = useState<CategoryScore[]>([]);
  const [quarterlyScores, setQuarterlyScores] = useState<QuarterlyScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchPartnerData();
  }, []);

  const fetchPartnerData = async () => {
    try {
      const token = localStorage.getItem('partnerToken');
      if (!token) {
        router.push('/partner/login');
        return;
      }

      // Mock data for now - will connect to real API
      setPartnerData({
        id: 1,
        company_name: 'TechFlow Solutions',
        contact_email: 'partner@techflow.com',
        power_confidence_score: 87,
        score_trend: 'up',
        industry_rank: 4,
        total_partners_in_category: 16,
        recent_feedback_count: 12,
        avg_satisfaction: 8.9,
        total_contractors: 45,
        active_contractors: 28
      });

      setCategoryScores([
        { category: 'Service Quality', score: 91, trend: 'up', feedback_count: 12 },
        { category: 'Communication', score: 88, trend: 'stable', feedback_count: 12 },
        { category: 'Results Delivered', score: 85, trend: 'up', feedback_count: 10 },
        { category: 'Value for Investment', score: 84, trend: 'down', feedback_count: 11 },
        { category: 'Technical Expertise', score: 89, trend: 'up', feedback_count: 12 }
      ]);

      setQuarterlyScores([
        { quarter: 'Q1 2024', score: 82, feedback_count: 15 },
        { quarter: 'Q2 2024', score: 85, feedback_count: 18 },
        { quarter: 'Q3 2024', score: 83, feedback_count: 12 },
        { quarter: 'Q4 2024', score: 87, feedback_count: 20 }
      ]);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching partner data:', error);
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('partnerToken');
    localStorage.removeItem('partnerInfo');
    router.push('/partner/login');
  };

  const handleExport = (format: 'pdf' | 'excel') => {
    if (!partnerData) return;

    const exportData = {
      partner: {
        ...partnerData,
        company_name: partnerData.company_name,
        contact_email: partnerData.contact_email,
        current_powerconfidence_score: partnerData.power_confidence_score,
        score_trend: partnerData.score_trend,
        service_categories: JSON.stringify(['Technology', 'Software']),
        total_contractor_engagements: partnerData.total_contractors,
        avg_contractor_satisfaction: partnerData.avg_satisfaction,
        recent_feedback_count: partnerData.recent_feedback_count
      },
      scoreHistory: quarterlyScores,
      categoryBreakdown: categoryScores.map(cat => ({
        category: cat.category,
        score: cat.score,
        weight: 20
      }))
    };

    if (format === 'pdf') {
      exportToPDF(exportData);
    } else {
      exportToExcel(exportData);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch(trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!partnerData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card>
          <CardContent className="p-8">
            <p className="text-gray-600">Unable to load partner data. Please try again.</p>
            <Button onClick={() => router.push('/partner/login')} className="mt-4">
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <Home className="w-6 h-6 text-red-600" />
              <h1 className="text-xl font-bold text-gray-900">Partner Portal</h1>
              <Badge variant="outline">{partnerData.company_name}</Badge>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => handleExport('pdf')}
                className="flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Export PDF
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExport('excel')}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export Excel
              </Button>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* PowerConfidence Score Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card className="bg-gradient-to-r from-red-600 to-red-700 text-white">
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                  <p className="text-red-100 text-sm mb-2">Your PowerConfidence Score</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold">{partnerData.power_confidence_score}</span>
                    <span className="text-2xl">/100</span>
                    {getTrendIcon(partnerData.score_trend)}
                  </div>
                  <p className="text-red-100 mt-2">
                    {partnerData.score_trend === 'up' ? '+3' : partnerData.score_trend === 'down' ? '-2' : '0'} points from last quarter
                  </p>
                </div>

                <div>
                  <p className="text-red-100 text-sm mb-2">Industry Ranking</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">#{partnerData.industry_rank}</span>
                    <span className="text-lg">of {partnerData.total_partners_in_category}</span>
                  </div>
                  <p className="text-red-100 mt-2">in your category</p>
                </div>

                <div>
                  <p className="text-red-100 text-sm mb-2">Performance Status</p>
                  <Badge className="bg-white text-red-600 text-lg px-4 py-2">
                    Excellent Performance
                  </Badge>
                  <p className="text-red-100 mt-2">{partnerData.recent_feedback_count} recent reviews</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs */}
        <div className="border-b mb-6">
          <div className="flex gap-6">
            {['overview', 'performance', 'feedback', 'insights'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 px-1 capitalize font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Users className="w-8 h-8 text-blue-600" />
                    <Badge variant="outline">Active</Badge>
                  </div>
                  <p className="text-2xl font-bold">{partnerData.active_contractors}</p>
                  <p className="text-sm text-gray-600">Active Contractors</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {partnerData.total_contractors} total all-time
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Star className="w-8 h-8 text-yellow-600" />
                  </div>
                  <p className="text-2xl font-bold">{partnerData.avg_satisfaction.toFixed(1)}/10</p>
                  <p className="text-sm text-gray-600">Avg Satisfaction</p>
                  <p className="text-xs text-gray-500 mt-1">
                    From recent feedback
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <MessageSquare className="w-8 h-8 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold">92%</p>
                  <p className="text-sm text-gray-600">Response Rate</p>
                  <p className="text-xs text-gray-500 mt-1">
                    To contractor inquiries
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Target className="w-8 h-8 text-purple-600" />
                  </div>
                  <p className="text-2xl font-bold">95%</p>
                  <p className="text-sm text-gray-600">Would Recommend</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Based on feedback
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Category Breakdown</CardTitle>
                <CardDescription>Your performance across key areas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {categoryScores.map((category, index) => (
                  <div key={index}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">{category.category}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">{category.score}/100</span>
                        {getTrendIcon(category.trend)}
                      </div>
                    </div>
                    <Progress value={category.score} className="h-2" />
                    <p className="text-xs text-gray-500 mt-1">
                      Based on {category.feedback_count} responses
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quarterly Trend</CardTitle>
                <CardDescription>Your score progression over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {quarterlyScores.map((quarter, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium">{quarter.quarter}</p>
                        <p className="text-sm text-gray-600">{quarter.feedback_count} responses</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold">{quarter.score}</p>
                        {index > 0 && (
                          <p className="text-sm text-gray-600">
                            {quarter.score > quarterlyScores[index-1].score ? (
                              <span className="text-green-600">
                                +{quarter.score - quarterlyScores[index-1].score}
                              </span>
                            ) : quarter.score < quarterlyScores[index-1].score ? (
                              <span className="text-red-600">
                                {quarter.score - quarterlyScores[index-1].score}
                              </span>
                            ) : (
                              <span className="text-gray-600">0</span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'feedback' && (
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Recent Feedback Highlights</CardTitle>
                <CardDescription>Anonymized contractor feedback from the last quarter</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded">
                    <div className="flex items-start gap-2">
                      <Award className="w-5 h-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-green-900">Strengths</p>
                        <ul className="mt-2 space-y-1 text-sm text-green-800">
                          <li>• "Excellent communication throughout the project"</li>
                          <li>• "Deep technical expertise and problem-solving skills"</li>
                          <li>• "Always delivers on time and within budget"</li>
                          <li>• "Great ROI tracking and reporting"</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                    <div className="flex items-start gap-2">
                      <Target className="w-5 h-5 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-yellow-900">Areas for Improvement</p>
                        <ul className="mt-2 space-y-1 text-sm text-yellow-800">
                          <li>• "Initial setup process could be more streamlined"</li>
                          <li>• "Would appreciate more frequent progress updates"</li>
                          <li>• "Documentation could be more comprehensive"</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    <div className="text-center p-4 bg-gray-50 rounded">
                      <p className="text-2xl font-bold text-gray-900">89%</p>
                      <p className="text-sm text-gray-600">Positive Sentiment</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded">
                      <p className="text-2xl font-bold text-gray-900">4.6/5</p>
                      <p className="text-sm text-gray-600">Average Rating</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded">
                      <p className="text-2xl font-bold text-gray-900">+67</p>
                      <p className="text-sm text-gray-600">NPS Score</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Personalized Recommendations</CardTitle>
                <CardDescription>Actions to improve your PowerConfidence score</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-blue-50 rounded">
                    <div className="bg-blue-600 text-white rounded-full p-1">
                      <BarChart3 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium">Improve Response Time</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Your average response time is 4.2 hours. Aim for under 4 hours to move into the top quartile.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-green-50 rounded">
                    <div className="bg-green-600 text-white rounded-full p-1">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium">Maintain Communication Excellence</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Your communication scores are your strongest area. Continue this strength to maintain your competitive advantage.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded">
                    <div className="bg-yellow-600 text-white rounded-full p-1">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium">Schedule Quarterly Reviews</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Consider implementing quarterly business reviews with your top contractors to maintain high satisfaction.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Next Steps</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="rounded" />
                    <span>Review and respond to recent feedback</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="rounded" />
                    <span>Update your partner profile with recent achievements</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="rounded" />
                    <span>Schedule check-ins with contractors showing lower satisfaction</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="rounded" />
                    <span>Share your PowerConfidence achievements with your team</span>
                  </label>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}