'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Info,
  ArrowRight,
  BookOpen,
  Briefcase,
  Podcast
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface CategoryScores {
  leadership: number;
  culture: number;
  growth: number;
  satisfaction: number;
  nps: number;
}

interface LatestQuarter {
  quarter: string;
  year: number;
  response_rate: number;
  total_responses: number;
  total_employees: number;
  category_scores: CategoryScores;
  base_score: number;
  trend_modifier: number;
  final_ceo_pcr: number;
}

interface QuarterHistory {
  quarter: string;
  year: number;
  final_ceo_pcr: number;
  base_score: number;
  trend_modifier: number;
  response_rate: number;
}

interface DashboardData {
  contractor_id: number;
  company_name: string;
  current_ceo_pcr: number;
  previous_ceo_pcr: number;
  ceo_pcr_trend: 'improving' | 'stable' | 'declining' | 'new';
  total_employees: number;
  latest_quarter: LatestQuarter | null;
  history: QuarterHistory[];
}

interface Alert {
  type: 'error' | 'warning' | 'info' | 'success';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  message: string;
  action: string;
  action_link: string;
}

interface Recommendation {
  category: string;
  priority: 'high' | 'medium' | 'low';
  current_score: number;
  target_score: number;
  issue: string;
  suggestions: Array<{
    action: string;
    impact: string;
    timeframe: string;
  }>;
}

interface Resource {
  type: 'book' | 'partner' | 'podcast';
  id?: number;
  title?: string;
  name?: string;
  author?: string;
  description: string;
  reason: string;
  category: string;
}

export default function CeoDashboardPage() {
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [recommendations, setRecommendations] = useState<{
    summary: string;
    recommendations: Recommendation[];
    resources: Resource[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // For demo purposes, using contractor ID 193
  const contractorId = 193;

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch dashboard data
      const dashboardResponse = await fetch(`http://localhost:5000/api/ceo-dashboard/${contractorId}`);
      if (!dashboardResponse.ok) throw new Error('Failed to fetch dashboard data');
      const dashboardJson = await dashboardResponse.json();
      setDashboardData(dashboardJson.data);

      // Fetch alerts
      const alertsResponse = await fetch(`http://localhost:5000/api/ceo-dashboard/${contractorId}/alerts`);
      if (!alertsResponse.ok) throw new Error('Failed to fetch alerts');
      const alertsJson = await alertsResponse.json();
      setAlerts(alertsJson.alerts);

      // Fetch AI recommendations
      const recommendationsResponse = await fetch(`http://localhost:5000/api/ceo-dashboard/${contractorId}/recommendations`);
      if (!recommendationsResponse.ok) throw new Error('Failed to fetch recommendations');
      const recommendationsJson = await recommendationsResponse.json();
      setRecommendations(recommendationsJson.data);

      setLoading(false);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="w-6 h-6 text-green-600" />;
      case 'declining':
        return <TrendingDown className="w-6 h-6 text-red-600" />;
      default:
        return <Minus className="w-6 h-6 text-gray-600" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving':
        return 'text-green-600';
      case 'declining':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressBarColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const categoryLabels: Record<keyof CategoryScores, string> = {
    leadership: 'Leadership Effectiveness',
    culture: 'Company Culture',
    growth: 'Growth & Development',
    satisfaction: 'Overall Satisfaction',
    nps: 'Employee Recommendation'
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-power100-bg-grey flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-power100-green mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your CEO dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="min-h-screen bg-power100-bg-grey flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-6">{error || 'Unable to load dashboard data'}</p>
          <button
            onClick={() => fetchDashboardData()}
            className="bg-power100-green hover:bg-green-600 text-white px-6 py-3 rounded-full font-semibold transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const chartData = [...dashboardData.history]
    .reverse()
    .map(h => ({
      name: `${h.quarter}-${h.year}`,
      score: h.final_ceo_pcr,
      responseRate: h.response_rate
    }));

  return (
    <div className="min-h-screen bg-power100-bg-grey">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">CEO PowerConfidence Dashboard</h1>
              <p className="text-gray-600 mt-1">{dashboardData.company_name}</p>
            </div>
            <button
              onClick={() => router.push('/contractor/dashboard')}
              className="bg-white border-2 border-gray-200 text-gray-700 px-6 py-2 rounded-full font-semibold hover:bg-gray-50 transition-colors"
            >
              Back to Main Dashboard
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alerts Section */}
        {alerts.length > 0 && (
          <div className="mb-8 space-y-4">
            {alerts.map((alert, index) => (
              <div
                key={index}
                className={`bg-white rounded-2xl shadow-md p-6 border-l-4 ${
                  alert.type === 'error' ? 'border-red-600' :
                  alert.type === 'warning' ? 'border-yellow-600' :
                  alert.type === 'success' ? 'border-green-600' :
                  'border-blue-600'
                }`}
              >
                <div className="flex items-start gap-4">
                  {getAlertIcon(alert.type)}
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 mb-1">{alert.title}</h3>
                    <p className="text-gray-600 mb-3">{alert.message}</p>
                    <button className="text-power100-green hover:text-green-700 font-semibold flex items-center gap-2">
                      {alert.action} <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Score & Categories */}
          <div className="lg:col-span-2 space-y-8">
            {/* Score Overview Card */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="text-center mb-6">
                <div className={`text-7xl font-bold ${getScoreColor(dashboardData.current_ceo_pcr)} mb-2`}>
                  {dashboardData.current_ceo_pcr.toFixed(1)}
                </div>
                <div className="text-xl text-gray-600">CEO PowerConfidence Rating</div>

                {/* Trend Indicator */}
                <div className="flex items-center justify-center mt-4 gap-2">
                  {getTrendIcon(dashboardData.ceo_pcr_trend)}
                  <span className={`text-lg font-semibold ${getTrendColor(dashboardData.ceo_pcr_trend)}`}>
                    {dashboardData.ceo_pcr_trend.charAt(0).toUpperCase() + dashboardData.ceo_pcr_trend.slice(1)}
                    {dashboardData.latest_quarter && dashboardData.latest_quarter.trend_modifier !== 0 && (
                      <span className="ml-2">
                        ({dashboardData.latest_quarter.trend_modifier > 0 ? '+' : ''}
                        {dashboardData.latest_quarter.trend_modifier} pts)
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Survey Stats */}
              {dashboardData.latest_quarter && (
                <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-gray-200">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900">
                      {dashboardData.latest_quarter.response_rate.toFixed(0)}%
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Response Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900">
                      {dashboardData.latest_quarter.total_responses}/{dashboardData.latest_quarter.total_employees}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Responses</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900">
                      {dashboardData.latest_quarter.quarter}-{dashboardData.latest_quarter.year}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Latest Survey</div>
                  </div>
                </div>
              )}
            </div>

            {/* Category Breakdown */}
            {dashboardData.latest_quarter && (
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <BarChart3 className="w-6 h-6 text-power100-green" />
                  Category Scores
                </h2>

                <div className="space-y-6">
                  {Object.entries(dashboardData.latest_quarter.category_scores).map(([key, score]) => (
                    <div key={key}>
                      <div className="flex justify-between mb-2">
                        <span className="font-semibold text-gray-900">
                          {categoryLabels[key as keyof CategoryScores]}
                        </span>
                        <span className={`font-bold ${getScoreColor(score)}`}>
                          {score.toFixed(1)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-4">
                        <div
                          className={`${getProgressBarColor(score)} h-4 rounded-full transition-all duration-500`}
                          style={{ width: `${score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quarterly Trend Chart */}
            {chartData.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Quarterly Trend</h2>

                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 105]} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#28a745"
                      strokeWidth={3}
                      name="CEO PCR Score"
                      dot={{ fill: '#28a745', r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>

                {/* Quarterly Table */}
                <div className="mt-6">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-3 font-semibold text-gray-700">Quarter</th>
                        <th className="text-right py-3 font-semibold text-gray-700">Score</th>
                        <th className="text-right py-3 font-semibold text-gray-700">Change</th>
                        <th className="text-right py-3 font-semibold text-gray-700">Response Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.history.map((quarter, index) => {
                        const nextQuarter = dashboardData.history[index + 1];
                        const change = nextQuarter ? quarter.final_ceo_pcr - nextQuarter.final_ceo_pcr : null;

                        return (
                          <tr key={`${quarter.quarter}-${quarter.year}`} className="border-b border-gray-100">
                            <td className="py-3 text-gray-900">
                              {quarter.quarter}-{quarter.year}
                            </td>
                            <td className="text-right font-semibold text-gray-900">
                              {quarter.final_ceo_pcr.toFixed(1)}
                            </td>
                            <td className={`text-right font-semibold ${
                              change === null ? 'text-gray-400' :
                              change > 0 ? 'text-green-600' :
                              change < 0 ? 'text-red-600' :
                              'text-gray-600'
                            }`}>
                              {change === null ? '—' :
                               `${change > 0 ? '+' : ''}${change.toFixed(1)}`}
                            </td>
                            <td className="text-right text-gray-600">
                              {quarter.response_rate.toFixed(0)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - AI Recommendations */}
          <div className="space-y-8">
            {/* AI Summary */}
            {recommendations && (
              <>
                <div className="bg-gradient-to-br from-power100-green to-green-600 rounded-2xl shadow-lg p-8 text-white">
                  <h2 className="text-2xl font-bold mb-4">AI Cultural Intelligence</h2>
                  <p className="text-white/90 leading-relaxed">
                    {recommendations.summary}
                  </p>
                </div>

                {/* Recommendations */}
                {recommendations.recommendations.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-lg p-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Recommendations</h2>

                    <div className="space-y-6">
                      {recommendations.recommendations.map((rec, index) => (
                        <div key={index} className="border-l-4 border-power100-green pl-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                              rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {rec.priority.toUpperCase()}
                            </span>
                            <h3 className="font-bold text-gray-900">{rec.category}</h3>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{rec.issue}</p>
                          <ul className="space-y-2">
                            {rec.suggestions.slice(0, 2).map((suggestion, sIndex) => (
                              <li key={sIndex} className="text-sm text-gray-700 flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 text-power100-green mt-0.5 flex-shrink-0" />
                                <span>{suggestion.action}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resources */}
                {recommendations.resources.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-lg p-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Recommended Resources</h2>

                    <div className="space-y-4">
                      {recommendations.resources.map((resource, index) => (
                        <div key={index} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start gap-3">
                            {resource.type === 'book' && <BookOpen className="w-5 h-5 text-power100-green flex-shrink-0 mt-1" />}
                            {resource.type === 'partner' && <Briefcase className="w-5 h-5 text-power100-green flex-shrink-0 mt-1" />}
                            {resource.type === 'podcast' && <Podcast className="w-5 h-5 text-power100-green flex-shrink-0 mt-1" />}

                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 mb-1">
                                {resource.title || resource.name}
                              </h4>
                              {resource.author && (
                                <p className="text-sm text-gray-600 mb-2">by {resource.author}</p>
                              )}
                              <p className="text-sm text-gray-700 mb-2">{resource.reason}</p>
                              <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                {resource.type.charAt(0).toUpperCase() + resource.type.slice(1)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>

              <div className="space-y-3">
                <button className="w-full bg-power100-green hover:bg-green-600 text-white py-3 px-4 rounded-xl font-semibold transition-colors flex items-center justify-between">
                  <span>View Employee List</span>
                  <Users className="w-5 h-5" />
                </button>

                <button className="w-full bg-white border-2 border-gray-200 hover:bg-gray-50 text-gray-700 py-3 px-4 rounded-xl font-semibold transition-colors flex items-center justify-between">
                  <span>Download Report</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
