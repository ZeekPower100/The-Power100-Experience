// DATABASE-CHECKED: ai_concierge_goals, contractor_action_items, ai_proactive_messages, ai_trust_indicators
// DATE: October 24, 2025
// REFERENCE: PHASE-3A-FIELD-REFERENCE.md

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Target, CheckSquare, MessageSquare, TrendingUp } from 'lucide-react';

interface IGEManualActionsProps {
  contractorId: number;
  contractorName: string;
  onSuccess: () => void;
}

export default function IGEManualActions({ contractorId, contractorName, onSuccess }: IGEManualActionsProps) {
  const [activeModal, setActiveModal] = useState<'goal' | 'action' | 'message' | 'trust' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Goal Form State
  const [goalForm, setGoalForm] = useState({
    goal_type: '',
    goal_description: '',
    target_milestone: '',
    priority_score: 5
  });

  // Action Form State
  const [actionForm, setActionForm] = useState({
    title: '',
    action_type: '',
    description: '',
    priority: 5,
    due_date: ''
  });

  // Message Form State
  const [messageForm, setMessageForm] = useState({
    message_type: '',
    message_content: '',
    send_immediately: true
  });

  // Trust Form State
  const [trustForm, setTrustForm] = useState({
    adjustment: 0,
    reason: ''
  });

  const resetForms = () => {
    setGoalForm({ goal_type: '', goal_description: '', target_milestone: '', priority_score: 5 });
    setActionForm({ title: '', action_type: '', description: '', priority: 5, due_date: '' });
    setMessageForm({ message_type: '', message_content: '', send_immediately: true });
    setTrustForm({ adjustment: 0, reason: '' });
    setError(null);
  };

  const handleCreateGoal = async () => {
    if (!goalForm.goal_type || !goalForm.goal_description) {
      setError('Goal type and description are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/ige-monitor/contractor/${contractorId}/goal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(goalForm)
      });

      const data = await response.json();

      if (data.success) {
        setActiveModal(null);
        resetForms();
        onSuccess();
      } else {
        setError(data.error || 'Failed to create goal');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAction = async () => {
    if (!actionForm.title || !actionForm.action_type) {
      setError('Title and action type are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/ige-monitor/contractor/${contractorId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actionForm)
      });

      const data = await response.json();

      if (data.success) {
        setActiveModal(null);
        resetForms();
        onSuccess();
      } else {
        setError(data.error || 'Failed to create action');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageForm.message_type || !messageForm.message_content) {
      setError('Message type and content are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/ige-monitor/contractor/${contractorId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageForm)
      });

      const data = await response.json();

      if (data.success) {
        setActiveModal(null);
        resetForms();
        onSuccess();
      } else {
        setError(data.error || 'Failed to send message');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustTrust = async () => {
    if (!trustForm.reason || trustForm.adjustment === 0) {
      setError('Adjustment value and reason are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/ige-monitor/contractor/${contractorId}/trust-adjustment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trustForm)
      });

      const data = await response.json();

      if (data.success) {
        setActiveModal(null);
        resetForms();
        onSuccess();
      } else {
        setError(data.error || 'Failed to adjust trust score');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Quick Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Button
          onClick={() => setActiveModal('goal')}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Target className="h-4 w-4 mr-2" />
          Create Goal
        </Button>
        <Button
          onClick={() => setActiveModal('action')}
          className="bg-orange-600 hover:bg-orange-700 text-white"
        >
          <CheckSquare className="h-4 w-4 mr-2" />
          Create Action
        </Button>
        <Button
          onClick={() => setActiveModal('message')}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Send Message
        </Button>
        <Button
          onClick={() => setActiveModal('trust')}
          className="bg-power100-green hover:bg-green-600 text-white"
        >
          <TrendingUp className="h-4 w-4 mr-2" />
          Adjust Trust
        </Button>
      </div>

      {/* Create Goal Modal */}
      <Dialog open={activeModal === 'goal'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Create Goal for {contractorName}</DialogTitle>
            <p className="text-sm text-gray-500 mt-1">Add a new goal for this contractor</p>
          </DialogHeader>

          <div className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Goal Type *</label>
              <Select
                value={goalForm.goal_type}
                onValueChange={(value) => setGoalForm({ ...goalForm, goal_type: value })}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select goal type" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="revenue_growth">Revenue Growth</SelectItem>
                  <SelectItem value="team_expansion">Team Expansion</SelectItem>
                  <SelectItem value="process_improvement">Process Improvement</SelectItem>
                  <SelectItem value="market_expansion">Market Expansion</SelectItem>
                  <SelectItem value="customer_retention">Customer Retention</SelectItem>
                  <SelectItem value="product_development">Product Development</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Goal Description *</label>
              <Textarea
                value={goalForm.goal_description}
                onChange={(e) => setGoalForm({ ...goalForm, goal_description: e.target.value })}
                placeholder="Describe the goal..."
                className="bg-white"
                rows={3}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Target Milestone (Optional)</label>
              <Input
                type="date"
                value={goalForm.target_milestone}
                onChange={(e) => setGoalForm({ ...goalForm, target_milestone: e.target.value })}
                className="bg-white"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Priority (1-10)</label>
              <Input
                type="number"
                min="1"
                max="10"
                value={goalForm.priority_score}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setGoalForm({ ...goalForm, priority_score: isNaN(val) ? 5 : val });
                }}
                className="bg-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setActiveModal(null)} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateGoal}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? 'Creating...' : 'Create Goal'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Action Modal */}
      <Dialog open={activeModal === 'action'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Create Action for {contractorName}</DialogTitle>
            <p className="text-sm text-gray-500 mt-1">Add a new action item for this contractor</p>
          </DialogHeader>

          <div className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Title *</label>
              <Input
                value={actionForm.title}
                onChange={(e) => setActionForm({ ...actionForm, title: e.target.value })}
                placeholder="Action title..."
                className="bg-white"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Action Type *</label>
              <Select
                value={actionForm.action_type}
                onValueChange={(value) => setActionForm({ ...actionForm, action_type: value })}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select action type" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="follow_up">Follow Up</SelectItem>
                  <SelectItem value="demo_prep">Demo Prep</SelectItem>
                  <SelectItem value="email_intro">Email Intro</SelectItem>
                  <SelectItem value="implement_tool">Implement Tool</SelectItem>
                  <SelectItem value="contact_peer">Contact Peer</SelectItem>
                  <SelectItem value="research_partner">Research Partner</SelectItem>
                  <SelectItem value="schedule_meeting">Schedule Meeting</SelectItem>
                  <SelectItem value="review_content">Review Content</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Description (Optional)</label>
              <Textarea
                value={actionForm.description}
                onChange={(e) => setActionForm({ ...actionForm, description: e.target.value })}
                placeholder="Additional details..."
                className="bg-white"
                rows={3}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Due Date (Optional)</label>
              <Input
                type="date"
                value={actionForm.due_date}
                onChange={(e) => setActionForm({ ...actionForm, due_date: e.target.value })}
                className="bg-white"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Priority (1-10)</label>
              <Input
                type="number"
                min="1"
                max="10"
                value={actionForm.priority}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setActionForm({ ...actionForm, priority: isNaN(val) ? 5 : val });
                }}
                className="bg-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setActiveModal(null)} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateAction}
              disabled={loading}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {loading ? 'Creating...' : 'Create Action'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Message Modal */}
      <Dialog open={activeModal === 'message'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Send Message to {contractorName}</DialogTitle>
            <p className="text-sm text-gray-500 mt-1">Send a proactive message to this contractor</p>
          </DialogHeader>

          <div className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Message Type *</label>
              <Select
                value={messageForm.message_type}
                onValueChange={(value) => setMessageForm({ ...messageForm, message_type: value })}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select message type" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="check_in">Check In</SelectItem>
                  <SelectItem value="milestone_follow_up">Milestone Follow-up</SelectItem>
                  <SelectItem value="resource_suggestion">Resource Suggestion</SelectItem>
                  <SelectItem value="encouragement">Encouragement</SelectItem>
                  <SelectItem value="course_correction">Course Correction</SelectItem>
                  <SelectItem value="celebration">Celebration</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Message Content *</label>
              <Textarea
                value={messageForm.message_content}
                onChange={(e) => setMessageForm({ ...messageForm, message_content: e.target.value })}
                placeholder="Write your message..."
                className="bg-white"
                rows={5}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="send_immediately"
                checked={messageForm.send_immediately}
                onChange={(e) => setMessageForm({ ...messageForm, send_immediately: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="send_immediately" className="text-sm text-gray-700">
                Send immediately (otherwise queue for delivery)
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setActiveModal(null)} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {loading ? 'Sending...' : 'Send Message'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Adjust Trust Modal */}
      <Dialog open={activeModal === 'trust'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Adjust Trust Score for {contractorName}</DialogTitle>
            <p className="text-sm text-gray-500 mt-1">Manually adjust the contractor's trust score</p>
          </DialogHeader>

          <div className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Adjustment (-100 to +100) *</label>
              <Input
                type="number"
                min="-100"
                max="100"
                value={trustForm.adjustment}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setTrustForm({ ...trustForm, adjustment: isNaN(val) ? 0 : val });
                }}
                placeholder="e.g., +10 or -5"
                className="bg-white"
              />
              <p className="text-xs text-gray-500 mt-1">
                Positive values increase trust, negative values decrease it
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Reason *</label>
              <Textarea
                value={trustForm.reason}
                onChange={(e) => setTrustForm({ ...trustForm, reason: e.target.value })}
                placeholder="Explain why this adjustment is being made..."
                className="bg-white"
                rows={4}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setActiveModal(null)} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleAdjustTrust}
              disabled={loading}
              className="bg-power100-green hover:bg-green-600 text-white"
            >
              {loading ? 'Adjusting...' : 'Adjust Trust Score'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
