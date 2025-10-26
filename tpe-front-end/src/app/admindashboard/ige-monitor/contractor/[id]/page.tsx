'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Building,
  Calendar,
  Target,
  CheckSquare,
  MessageSquare,
  TrendingUp,
  Clock,
  Activity
} from 'lucide-react';
import IGEManualActions from '@/components/admin/IGEManualActions';

interface ContractorDetail {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  company_name: string;
  revenue_tier: string;
  created_at: string;
  last_activity_at: string;
  focus_areas: string;
  current_stage: string;
  team_size: string;
  trust_score: number;
  metrics: {
    active_goals: number;
    completed_goals: number;
    total_goals: number;
    pending_actions: number;
    completed_actions: number;
    total_actions: number;
    messages_sent: number;
    total_messages: number;
  };
}

interface Goal {
  id: number;
  goal_description: string;
  goal_type: string;
  priority_score: number;
  status: string;
  target_milestone: string;
  current_progress: number;
  created_at: string;
  completed_at: string | null;
}

interface Action {
  id: number;
  title: string;
  description: string;
  action_type: string;
  priority: number;
  status: string;
  due_date: string;
  created_at: string;
  completed_at: string | null;
  ai_generated: boolean;
}

interface Message {
  id: number;
  message_content: string;
  message_type: string;
  ai_reasoning: string;
  sent_at: string;
  created_at: string;
}

interface TrustIndicator {
  id: number;
  cumulative_trust_score: number;
  confidence_impact: number;
  indicator_description: string;
  indicator_type: string;
  recorded_at: string;
}

interface TimelineItem {
  type: string;
  timestamp: string;
  description: string;
  delta?: number;
  category?: string;
  message_type?: string;
}

export default function ContractorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const contractorId = params.id as string;

  const [contractor, setContractor] = useState<ContractorDetail | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [trustHistory, setTrustHistory] = useState<TrustIndicator[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'timeline' | 'goals' | 'actions' | 'messages' | 'trust'>('timeline');

  useEffect(() => {
    if (contractorId) {
      fetchContractorDetail();
    }
  }, [contractorId]);

  const fetchContractorDetail = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/ige-monitor/contractor/${contractorId}`);
      const data = await response.json();

      if (data.success) {
        setContractor(data.contractor);
        setGoals(data.goals || []);
        setActions(data.actions || []);
        setMessages(data.messages || []);
        setTrustHistory(data.trust_history || []);
        setTimeline(data.timeline || []);
      }
    } catch (error) {
      console.error('Error fetching contractor detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrustScoreColor = (score: number) => {
    if (score >= 70) return 'bg-green-100 text-green-800';
    if (score >= 40) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-power100-bg-grey flex items-center justify-center">
        <p className="text-gray-500">Loading contractor details...</p>
      </div>
    );
  }

  if (!contractor) {
    return (
      <div className="min-h-screen bg-power100-bg-grey flex items-center justify-center">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">Contractor not found</p>
            <Button
              onClick={() => router.push('/admindashboard/ige-monitor')}
              className="mt-4 bg-power100-red hover:bg-red-700 text-white"
            >
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-power100-bg-grey p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Back Button */}
        <Button
          onClick={() => router.push('/admindashboard/ige-monitor')}
          variant="outline"
          className="bg-white"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        {/* Contractor Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              {/* Left: Contractor Info */}
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-power100-red flex items-center justify-center text-white text-2xl font-bold">
                    {contractor.first_name?.[0] || '?'}{contractor.last_name?.[0] || '?'}
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-power100-black">
                      {contractor.first_name} {contractor.last_name}
                    </h1>
                    {contractor.company_name && (
                      <p className="text-lg text-gray-600 flex items-center mt-1">
                        <Building className="h-4 w-4 mr-2" />
                        {contractor.company_name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center text-gray-600">
                    <Mail className="h-4 w-4 mr-2" />
                    {contractor.email}
                  </div>
                  {contractor.phone && (
                    <div className="flex items-center text-gray-600">
                      <Phone className="h-4 w-4 mr-2" />
                      {contractor.phone}
                    </div>
                  )}
                  <div className="flex items-center text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    Joined {formatDate(contractor.created_at)}
                  </div>
                  {contractor.current_stage && (
                    <div className="flex items-center text-gray-600">
                      <Activity className="h-4 w-4 mr-2" />
                      Stage: {contractor.current_stage}
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Trust Score */}
              <div className="text-center">
                <div className="text-sm text-gray-500 mb-2">Trust Score</div>
                <Badge className={`${getTrustScoreColor(contractor.trust_score)} text-3xl font-bold px-6 py-3`}>
                  {contractor.trust_score}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <Target className="h-4 w-4 mr-2 text-blue-600" />
                Goals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{contractor.metrics.active_goals}</div>
              <p className="text-sm text-gray-500 mt-1">
                {contractor.metrics.completed_goals} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <CheckSquare className="h-4 w-4 mr-2 text-orange-600" />
                Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{contractor.metrics.pending_actions}</div>
              <p className="text-sm text-gray-500 mt-1">
                {contractor.metrics.completed_actions} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <MessageSquare className="h-4 w-4 mr-2 text-purple-600" />
                Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{contractor.metrics.messages_sent}</div>
              <p className="text-sm text-gray-500 mt-1">
                {contractor.metrics.total_messages} total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <Clock className="h-4 w-4 mr-2 text-green-600" />
                Last Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">{formatDate(contractor.last_activity_at)}</div>
              <p className="text-sm text-gray-500 mt-1">{formatTime(contractor.last_activity_at)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Phase 3A: Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Manually manage goals, actions, messages, and trust scores</CardDescription>
          </CardHeader>
          <CardContent>
            <IGEManualActions
              contractorId={contractor.id}
              contractorName={`${contractor.first_name} ${contractor.last_name}`}
              onSuccess={fetchContractorDetail}
            />
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          {[
            { key: 'timeline', label: 'Timeline', icon: Clock },
            { key: 'goals', label: 'Goals', icon: Target },
            { key: 'actions', label: 'Actions', icon: CheckSquare },
            { key: 'messages', label: 'Messages', icon: MessageSquare },
            { key: 'trust', label: 'Trust History', icon: TrendingUp }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as typeof activeTab)}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors flex items-center ${
                activeTab === key
                  ? 'border-power100-red text-power100-red'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="h-4 w-4 mr-2" />
              {label} ({
                key === 'timeline' ? timeline.length :
                key === 'goals' ? goals.length :
                key === 'actions' ? actions.length :
                key === 'messages' ? messages.length :
                trustHistory.length
              })
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'timeline' && (
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
              <CardDescription>Recent IGE activity for this contractor</CardDescription>
            </CardHeader>
            <CardContent>
              {timeline.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No timeline activity yet</p>
              ) : (
                <div className="space-y-4">
                  {timeline.map((item, index) => (
                    <div key={index} className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                        {item.type === 'trust_score' && <TrendingUp className="h-5 w-5 text-blue-600" />}
                        {item.type === 'goal_completed' && <Target className="h-5 w-5 text-green-600" />}
                        {item.type === 'action_completed' && <CheckSquare className="h-5 w-5 text-orange-600" />}
                        {item.type === 'message_sent' && <MessageSquare className="h-5 w-5 text-purple-600" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.description}</p>
                        {item.category && (
                          <Badge className="mt-1 text-xs bg-gray-100 text-gray-700">{item.category}</Badge>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(item.timestamp)} at {formatTime(item.timestamp)}
                        </p>
                      </div>
                      {item.delta !== undefined && (
                        <div className={`text-sm font-semibold ${item.delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {item.delta >= 0 ? '+' : ''}{item.delta}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'goals' && (
          <Card>
            <CardHeader>
              <CardTitle>Goals</CardTitle>
              <CardDescription>AI-identified goals for this contractor</CardDescription>
            </CardHeader>
            <CardContent>
              {goals.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No goals yet</p>
              ) : (
                <div className="space-y-4">
                  {goals.map((goal) => (
                    <div key={goal.id} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{goal.goal_description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className={getStatusColor(goal.status)}>{goal.status}</Badge>
                            {goal.goal_type && (
                              <Badge className="bg-gray-100 text-gray-700">{goal.goal_type}</Badge>
                            )}
                          </div>
                          {goal.target_milestone && (
                            <p className="text-sm text-gray-600 mt-2">Target: {goal.target_milestone}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">Created {formatDate(goal.created_at)}</p>
                        </div>
                        {goal.priority_score > 0 && (
                          <div className="text-right">
                            <div className="text-xs text-gray-500">Priority</div>
                            <div className="text-lg font-bold">{goal.priority_score}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'actions' && (
          <Card>
            <CardHeader>
              <CardTitle>Action Items</CardTitle>
              <CardDescription>Pending and completed action items</CardDescription>
            </CardHeader>
            <CardContent>
              {actions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No action items yet</p>
              ) : (
                <div className="space-y-4">
                  {actions.map((action) => (
                    <div key={action.id} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{action.title || action.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className={getStatusColor(action.status)}>{action.status}</Badge>
                            {action.action_type && (
                              <Badge className="bg-gray-100 text-gray-700">{action.action_type}</Badge>
                            )}
                            {action.ai_generated && (
                              <Badge className="bg-purple-100 text-purple-700">AI Generated</Badge>
                            )}
                          </div>
                          {action.due_date && (
                            <p className="text-sm text-gray-600 mt-2">Due: {formatDate(action.due_date)}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">Created {formatDate(action.created_at)}</p>
                        </div>
                        {action.priority > 0 && (
                          <div className="text-right">
                            <div className="text-xs text-gray-500">Priority</div>
                            <div className="text-lg font-bold">{action.priority}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'messages' && (
          <Card>
            <CardHeader>
              <CardTitle>Proactive Messages</CardTitle>
              <CardDescription>AI-generated messages sent to this contractor</CardDescription>
            </CardHeader>
            <CardContent>
              {messages.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No messages sent yet</p>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div key={message.id} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <Badge className="bg-purple-100 text-purple-700">{message.message_type}</Badge>
                        {message.sent_at && (
                          <span className="text-xs text-gray-500">
                            {formatDate(message.sent_at)} at {formatTime(message.sent_at)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{message.message_content}</p>
                      {message.ai_reasoning && (
                        <p className="text-xs text-gray-500 mt-2 italic">AI Reasoning: {message.ai_reasoning}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'trust' && (
          <Card>
            <CardHeader>
              <CardTitle>Trust Score History</CardTitle>
              <CardDescription>Changes to contractor trust score over time</CardDescription>
            </CardHeader>
            <CardContent>
              {trustHistory.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No trust score history yet</p>
              ) : (
                <div className="space-y-4">
                  {trustHistory.map((indicator) => (
                    <div key={indicator.id} className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0">
                      <div className="flex-shrink-0 text-right">
                        <div className={`text-2xl font-bold ${getTrustScoreColor(indicator.cumulative_trust_score).replace('bg-', 'text-')}`}>
                          {indicator.cumulative_trust_score}
                        </div>
                        <div className={`text-sm font-semibold ${indicator.confidence_impact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {indicator.confidence_impact >= 0 ? '+' : ''}{indicator.confidence_impact}
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{indicator.indicator_description}</p>
                        <Badge className="mt-1 text-xs bg-gray-100 text-gray-700">{indicator.indicator_type}</Badge>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(indicator.recorded_at)} at {formatTime(indicator.recorded_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
