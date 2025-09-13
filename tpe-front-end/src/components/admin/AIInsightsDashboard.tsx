"use client";

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  Target,
  AlertTriangle,
  Users,
  Calendar,
  BarChart3,
  Search,
  RefreshCw
} from 'lucide-react';
import { aiTrackingApi } from '@/lib/api';

interface Challenge {
  id: number;
  challenge: string;
  severity: string;
  open_to_solutions: boolean;
  resolved: boolean;
}

interface Goal {
  id: number;
  goal: string;
  priority: number;
  timeline: string | null;
}

interface ContractorProfile {
  id: number;
  name: string;
  engagement_score: number;
  churn_risk: number;
  lifecycle_stage: string;
  next_best_action: string | null;
  total_goals: number;
  open_challenges: number | Challenge[];
  recent_events: any[];
  active_goals: Goal[];
  recent_recommendations: any[];
}

interface AtRiskContractor {
  id: number;
  name: string;
  company_name: string;
  churn_risk: number;
  engagement_score: number;
  last_activity: string;
  days_inactive: number;
}

interface PowerUser {
  id: number;
  name: string;
  company_name: string;
  engagement_score: number;
  total_events: number;
  conversion_rate: number;
}

export default function AIInsightsDashboard() {
  const [loading, setLoading] = useState(true);
  const [selectedContractorId, setSelectedContractorId] = useState<string>('');
  const [contractorProfile, setContractorProfile] = useState<ContractorProfile | null>(null);
  const [atRiskContractors, setAtRiskContractors] = useState<AtRiskContractor[]>([]);
  const [powerUsers, setPowerUsers] = useState<PowerUser[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'profile' | 'at-risk' | 'power-users'>('overview');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load at-risk contractors
      const atRiskData = await aiTrackingApi.getAtRiskContractors();
      if (atRiskData?.at_risk_contractors) {
        setAtRiskContractors(atRiskData.at_risk_contractors);
      }

      // Load power users
      const powerData = await aiTrackingApi.getPowerUsers();
      if (powerData?.power_users) {
        setPowerUsers(powerData.power_users);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadContractorProfile = async () => {
    if (!selectedContractorId) return;
    
    setLoading(true);
    try {
      const profile = await aiTrackingApi.getContractorAIProfile(selectedContractorId);
      if (profile?.profile) {
        // Ensure open_challenges is properly formatted
        const formattedProfile = {
          ...profile.profile,
          open_challenges: profile.profile.open_challenges || [],
          active_goals: profile.profile.active_goals || [],
          recent_events: profile.profile.recent_events || [],
          recent_recommendations: profile.profile.recent_recommendations || []
        };
        setContractorProfile(formattedProfile);
      }

      const analyticsData = await aiTrackingApi.getEngagementAnalytics(selectedContractorId);
      if (analyticsData?.analytics) {
        setAnalytics(analyticsData.analytics);
      }
    } catch (error) {
      console.error('Error loading contractor profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLifecycleColor = (stage: string) => {
    switch (stage) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'engaged': return 'bg-purple-100 text-purple-800';
      case 'power_user': return 'bg-yellow-100 text-yellow-800';
      case 'at_risk': return 'bg-red-100 text-red-800';
      case 'churned': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getChurnRiskColor = (risk: number) => {
    if (risk >= 70) return 'text-red-600';
    if (risk >= 40) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getEngagementColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="h-8 w-8 text-power100-red" />
          <h1 className="text-3xl font-bold">AI Insights Dashboard</h1>
        </div>
        <Button onClick={loadDashboardData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b">
        <Button
          variant={activeTab === 'overview' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('overview')}
          className="rounded-b-none"
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          Overview
        </Button>
        <Button
          variant={activeTab === 'profile' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('profile')}
          className="rounded-b-none"
        >
          <Search className="h-4 w-4 mr-2" />
          Contractor Profile
        </Button>
        <Button
          variant={activeTab === 'at-risk' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('at-risk')}
          className="rounded-b-none"
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          At Risk ({atRiskContractors.length})
        </Button>
        <Button
          variant={activeTab === 'power-users' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('power-users')}
          className="rounded-b-none"
        >
          <TrendingUp className="h-4 w-4 mr-2" />
          Power Users ({powerUsers.length})
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-power100-red"></div>
        </div>
      ) : (
        <>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">At Risk</p>
                    <p className="text-2xl font-bold">{atRiskContractors.length}</p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-red-500" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Power Users</p>
                    <p className="text-2xl font-bold">{powerUsers.length}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-500" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg Engagement</p>
                    <p className="text-2xl font-bold">
                      {powerUsers.length > 0 
                        ? Math.round(powerUsers.reduce((sum, u) => sum + u.engagement_score, 0) / powerUsers.length)
                        : 0}
                    </p>
                  </div>
                  <Activity className="h-8 w-8 text-blue-500" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Today</p>
                    <p className="text-2xl font-bold">
                      {atRiskContractors.filter(c => c.days_inactive === 0).length + 
                       powerUsers.filter(u => u.total_events > 0).length}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-purple-500" />
                </div>
              </Card>
            </div>
          )}

          {/* Contractor Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="flex gap-4">
                <Input
                  type="text"
                  placeholder="Enter Contractor ID"
                  value={selectedContractorId}
                  onChange={(e) => setSelectedContractorId(e.target.value)}
                  className="max-w-xs"
                />
                <Button onClick={loadContractorProfile}>
                  Load Profile
                </Button>
              </div>

              {contractorProfile && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Profile Overview */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Profile Overview</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Name:</span>
                        <span className="font-medium">{contractorProfile.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Engagement Score:</span>
                        <span className={`font-bold ${getEngagementColor(contractorProfile.engagement_score)}`}>
                          {contractorProfile.engagement_score}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Churn Risk:</span>
                        <span className={`font-bold ${getChurnRiskColor(contractorProfile.churn_risk)}`}>
                          {contractorProfile.churn_risk}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Lifecycle Stage:</span>
                        <Badge className={getLifecycleColor(contractorProfile.lifecycle_stage)}>
                          {contractorProfile.lifecycle_stage.replace('_', ' ')}
                        </Badge>
                      </div>
                      {contractorProfile.next_best_action && (
                        <div className="mt-4 p-3 bg-blue-50 rounded">
                          <p className="text-sm font-medium text-blue-800">Next Best Action:</p>
                          <p className="text-sm text-blue-600">{contractorProfile.next_best_action}</p>
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* Goals & Challenges */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Goals & Challenges</h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Active Goals ({contractorProfile.active_goals.length})</p>
                        {contractorProfile.active_goals.slice(0, 3).map((goal, idx) => (
                          <div key={idx} className="p-2 bg-gray-50 rounded mb-2">
                            <p className="text-sm font-medium">{goal.goal}</p>
                            <p className="text-xs text-gray-500">Priority: {goal.priority}</p>
                          </div>
                        ))}
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-2">
                          Open Challenges ({Array.isArray(contractorProfile.open_challenges) 
                            ? contractorProfile.open_challenges.length 
                            : contractorProfile.open_challenges})
                        </p>
                        {Array.isArray(contractorProfile.open_challenges) && 
                         contractorProfile.open_challenges.length > 0 && 
                         contractorProfile.open_challenges.slice(0, 3).map((challenge, idx) => (
                          <div key={idx} className="p-2 bg-gray-50 rounded mb-2">
                            <p className="text-sm font-medium">{challenge.challenge}</p>
                            <p className="text-xs text-gray-500">Severity: {challenge.severity}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>

                  {/* Recent Activity */}
                  <Card className="p-6 lg:col-span-2">
                    <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
                    <div className="space-y-2">
                      {contractorProfile.recent_events.map((event, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center gap-3">
                            <Activity className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{event.event_type}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="outline">{event.channel}</Badge>
                            <span className="text-xs text-gray-500">
                              {new Date(event.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              )}
            </div>
          )}

          {/* At Risk Tab */}
          {activeTab === 'at-risk' && (
            <div className="space-y-4">
              {atRiskContractors.length === 0 ? (
                <Card className="p-12 text-center">
                  <AlertTriangle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No at-risk contractors identified</p>
                </Card>
              ) : (
                atRiskContractors.map((contractor) => (
                  <Card key={contractor.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                        <div>
                          <p className="font-medium">{contractor.name}</p>
                          <p className="text-sm text-gray-600">{contractor.company_name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Churn Risk</p>
                          <p className={`font-bold ${getChurnRiskColor(contractor.churn_risk)}`}>
                            {contractor.churn_risk}%
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Days Inactive</p>
                          <p className="font-bold">{contractor.days_inactive}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedContractorId(contractor.id.toString());
                            setActiveTab('profile');
                            loadContractorProfile();
                          }}
                        >
                          View Profile
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* Power Users Tab */}
          {activeTab === 'power-users' && (
            <div className="space-y-4">
              {powerUsers.length === 0 ? (
                <Card className="p-12 text-center">
                  <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No power users identified yet</p>
                </Card>
              ) : (
                powerUsers.map((user) => (
                  <Card key={user.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <TrendingUp className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-gray-600">{user.company_name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Engagement</p>
                          <p className={`font-bold ${getEngagementColor(user.engagement_score)}`}>
                            {user.engagement_score}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Total Events</p>
                          <p className="font-bold">{user.total_events}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedContractorId(user.id.toString());
                            setActiveTab('profile');
                            loadContractorProfile();
                          }}
                        >
                          View Profile
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}