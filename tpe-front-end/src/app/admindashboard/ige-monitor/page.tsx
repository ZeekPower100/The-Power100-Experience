'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Target,
  MessageSquare,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Brain,
  Zap,
  BarChart3,
  RefreshCw
} from 'lucide-react';

interface SystemHealth {
  trust_score: {
    current: string;
    change_7d: string;
  };
  active_goals: {
    current: number;
    change_7d: number;
  };
  response_rate: {
    current: number;
    total_sent: number;
    total_responded: number;
  };
  action_rate: {
    current: number;
    total_sent: number;
    total_actions: number;
  };
}

interface RecentActivity {
  activity_type: string;
  activity_time: string;
  first_name: string;
  last_name: string;
  activity_detail: string;
  contractor_id: number;
  entity_id: number;
}

interface SystemAlerts {
  low_trust_contractors: number;
  stale_goals: number;
  unanswered_questions: number;
}

export default function IGEMonitorDashboard() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [activity, setActivity] = useState<RecentActivity[]>([]);
  const [alerts, setAlerts] = useState<SystemAlerts | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setRefreshing(true);

      const [healthRes, activityRes, alertsRes] = await Promise.all([
        fetch('/api/ige-monitor/system-health'),
        fetch('/api/ige-monitor/recent-activity'),
        fetch('/api/ige-monitor/system-alerts')
      ]);

      const healthData = await healthRes.json();
      const activityData = await activityRes.json();
      const alertsData = await alertsRes.json();

      if (healthData.success) setHealth(healthData.metrics);
      if (activityData.success) setActivity(activityData.activity);
      if (alertsData.success) setAlerts(alertsData.alerts);
    } catch (error) {
      console.error('Error fetching IGE monitoring data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'goal_created': return <Target className="h-4 w-4 text-blue-500" />;
      case 'goal_completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'message_sent': return <MessageSquare className="h-4 w-4 text-purple-500" />;
      case 'trust_increased': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'trust_decreased': return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'question_answered': return <Brain className="h-4 w-4 text-indigo-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'goal_created': return 'bg-blue-50 border-blue-200';
      case 'goal_completed': return 'bg-green-50 border-green-200';
      case 'message_sent': return 'bg-purple-50 border-purple-200';
      case 'trust_increased': return 'bg-green-50 border-green-200';
      case 'trust_decreased': return 'bg-red-50 border-red-200';
      case 'question_answered': return 'bg-indigo-50 border-indigo-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const formatActivityType = (type: string) => {
    return type.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getTrustScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600 bg-green-100';
    if (score >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-power100-bg-grey flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-power100-red mx-auto mb-4" />
          <p className="text-gray-600">Loading IGE monitoring data...</p>
        </div>
      </div>
    );
  }

  const trustScore = parseFloat(health?.trust_score.current || '0');
  const trustChange = parseFloat(health?.trust_score.change_7d || '0');

  return (
    <div className="min-h-screen bg-power100-bg-grey p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-power100-black">
              Internal Goal Engine Monitor
            </h1>
            <p className="text-gray-600 mt-1">
              Real-time monitoring of Phase 3 IGE system performance
            </p>
          </div>

          <Button
            onClick={fetchData}
            disabled={refreshing}
            className="bg-power100-red hover:bg-red-700 text-white"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* System Alerts */}
        {alerts && (alerts.low_trust_contractors > 0 || alerts.stale_goals > 0 || alerts.unanswered_questions > 0) && (
          <Card className="border-l-4 border-l-yellow-500 bg-yellow-50">
            <CardHeader>
              <CardTitle className="flex items-center text-yellow-800">
                <AlertTriangle className="h-5 w-5 mr-2" />
                System Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {alerts.low_trust_contractors > 0 && (
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                    <div className="flex items-center">
                      <TrendingDown className="h-5 w-5 text-red-500 mr-2" />
                      <span className="text-sm font-medium">Low Trust Contractors</span>
                    </div>
                    <Badge variant="destructive">{alerts.low_trust_contractors}</Badge>
                  </div>
                )}

                {alerts.stale_goals > 0 && (
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 text-orange-500 mr-2" />
                      <span className="text-sm font-medium">Stale Goals</span>
                    </div>
                    <Badge variant="outline" className="bg-orange-100 text-orange-800">
                      {alerts.stale_goals}
                    </Badge>
                  </div>
                )}

                {alerts.unanswered_questions > 0 && (
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                    <div className="flex items-center">
                      <MessageSquare className="h-5 w-5 text-blue-500 mr-2" />
                      <span className="text-sm font-medium">Unanswered Questions</span>
                    </div>
                    <Badge variant="outline" className="bg-blue-100 text-blue-800">
                      {alerts.unanswered_questions}
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

          {/* Trust Score */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Average Trust Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div className={`text-3xl font-bold px-3 py-1 rounded-lg ${getTrustScoreColor(trustScore)}`}>
                  {health?.trust_score.current}
                </div>
                <div className="flex items-center">
                  {trustChange > 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                  ) : trustChange < 0 ? (
                    <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                  ) : null}
                  <span className={`text-sm ${trustChange > 0 ? 'text-green-600' : trustChange < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                    {trustChange > 0 ? '+' : ''}{health?.trust_score.change_7d} (7d)
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                System-wide average trust level
              </p>
            </CardContent>
          </Card>

          {/* Active Goals */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Active Goals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div className="text-3xl font-bold text-blue-600">
                  {health?.active_goals.current || 0}
                </div>
                <div className="flex items-center">
                  {(health?.active_goals.change_7d || 0) > 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                  ) : (health?.active_goals.change_7d || 0) < 0 ? (
                    <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                  ) : null}
                  <span className={`text-sm ${(health?.active_goals.change_7d || 0) > 0 ? 'text-green-600' : (health?.active_goals.change_7d || 0) < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                    {(health?.active_goals.change_7d || 0) > 0 ? '+' : ''}{health?.active_goals.change_7d || 0} (7d)
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Currently tracked goals
              </p>
            </CardContent>
          </Card>

          {/* Response Rate */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Response Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div className="text-3xl font-bold text-purple-600">
                  {health?.response_rate.current || 0}%
                </div>
                <div className="text-sm text-gray-600">
                  {health?.response_rate.total_responded || 0}/{health?.response_rate.total_sent || 0}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Contractors responding to messages
              </p>
            </CardContent>
          </Card>

          {/* Action Rate */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Action Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div className="text-3xl font-bold text-green-600">
                  {health?.action_rate.current || 0}%
                </div>
                <div className="text-sm text-gray-600">
                  {health?.action_rate.total_actions || 0}/{health?.action_rate.total_sent || 0}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Messages leading to contractor action
              </p>
            </CardContent>
          </Card>

        </div>

        {/* Recent Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2 text-power100-red" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Latest 20 IGE system events
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No recent activity</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activity.map((item, index) => (
                  <div
                    key={index}
                    className={`flex items-start p-3 rounded-lg border ${getActivityColor(item.activity_type)}`}
                  >
                    <div className="mr-3 mt-0.5">
                      {getActivityIcon(item.activity_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-gray-900">
                          {formatActivityType(item.activity_type)}
                        </p>
                        <span className="text-xs text-gray-500">
                          {formatTimeAgo(item.activity_time)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-1">
                        <span className="font-medium">
                          {item.first_name} {item.last_name}
                        </span>
                        {' — '}
                        {item.activity_detail}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Users className="h-3 w-3" />
                        Contractor ID: {item.contractor_id}
                        <span className="mx-1">•</span>
                        Entity ID: {item.entity_id}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center">
                <Brain className="h-4 w-4 mr-2 text-indigo-600" />
                AI Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Trust Score</span>
                  <span className="text-sm font-medium">{health?.trust_score.current || 0}/100</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Response Rate</span>
                  <span className="text-sm font-medium">{health?.response_rate.current || 0}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Action Rate</span>
                  <span className="text-sm font-medium">{health?.action_rate.current || 0}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center">
                <Target className="h-4 w-4 mr-2 text-blue-600" />
                Goal Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Active Goals</span>
                  <span className="text-sm font-medium">{health?.active_goals.current || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">7-Day Change</span>
                  <span className={`text-sm font-medium ${(health?.active_goals.change_7d || 0) > 0 ? 'text-green-600' : (health?.active_goals.change_7d || 0) < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                    {(health?.active_goals.change_7d || 0) > 0 ? '+' : ''}{health?.active_goals.change_7d || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Stale Goals</span>
                  <span className="text-sm font-medium">{alerts?.stale_goals || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center">
                <Zap className="h-4 w-4 mr-2 text-yellow-600" />
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Health</span>
                  <Badge variant="outline" className="bg-green-100 text-green-800">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Operational
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Alerts</span>
                  <span className="text-sm font-medium">
                    {(alerts?.low_trust_contractors || 0) + (alerts?.stale_goals || 0) + (alerts?.unanswered_questions || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Auto-Refresh</span>
                  <Badge variant="outline" className="bg-blue-100 text-blue-800">
                    30s
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

      </div>
    </div>
  );
}
