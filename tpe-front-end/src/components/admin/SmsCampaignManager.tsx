'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Send, 
  MessageSquare, 
  Users, 
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  Eye,
  TrendingUp 
} from 'lucide-react';
import { motion } from 'framer-motion';

interface SmsCampaign {
  id: number;
  campaign_name: string;
  message_template: string;
  partner_id?: number;
  partner_name?: string;
  target_audience: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  total_recipients: number;
  total_delivered: number;
  total_responses: number;
  created_at: string;
  sent_at?: string;
}

interface SmsAnalytics {
  campaignPerformance: {
    total_campaigns: number;
    completed_campaigns: number;
    total_messages_sent: number;
    total_delivered: number;
    avg_delivery_rate: number;
    avg_response_rate: number;
  };
  subscriptionStats: {
    total_subscriptions: number;
    active_subscriptions: number;
    recent_opt_outs: number;
  };
}

interface Partner {
  id: number;
  company_name: string;
}

const SmsCampaignManager: React.FC = () => {
  const [campaigns, setCampaigns] = useState<SmsCampaign[]>([]);
  const [analytics, setAnalytics] = useState<SmsAnalytics | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // New campaign form state
  const [newCampaign, setNewCampaign] = useState({
    campaign_name: '',
    message_template: '',
    partner_id: '',
    target_audience: 'all_partners',
    scheduled_at: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      
      // Fetch campaigns
      const campaignResponse = await fetch('/api/sms/campaigns', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const campaignData = await campaignResponse.json();
      
      // Fetch analytics
      const analyticsResponse = await fetch('/api/sms/analytics', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const analyticsData = await analyticsResponse.json();
      
      // Fetch partners
      const partnerResponse = await fetch('/api/partners', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const partnerData = await partnerResponse.json();

      setCampaigns(campaignData.campaigns || []);
      setAnalytics(analyticsData);
      setPartners(partnerData.partners || []);
    } catch (error) {
      console.error('Error fetching SMS data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createCampaign = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/sms/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          campaignName: newCampaign.campaign_name,
          messageTemplate: newCampaign.message_template,
          partnerId: newCampaign.partner_id ? parseInt(newCampaign.partner_id) : null,
          targetAudience: newCampaign.target_audience,
          scheduledAt: newCampaign.scheduled_at || null
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create campaign');
      }

      // Reset form and close dialog
      setNewCampaign({
        campaign_name: '',
        message_template: '',
        partner_id: '',
        target_audience: 'all_partners',
        scheduled_at: ''
      });
      setShowCreateDialog(false);
      
      // Refresh data
      await fetchData();
    } catch (error) {
      console.error('Error creating campaign:', error);
    }
  };

  const launchCampaign = async (campaignId: number) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/sms/campaigns/${campaignId}/launch`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to launch campaign');
      }

      // Refresh data
      await fetchData();
    } catch (error) {
      console.error('Error launching campaign:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'sent':
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <MessageSquare className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'sent':
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading SMS campaigns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">SMS Campaign Manager</h1>
          <p className="text-gray-600 mt-2">Manage feedback collection and customer communication</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-red-600 hover:bg-red-700">
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create SMS Campaign</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="campaign_name">Campaign Name</Label>
                <Input
                  id="campaign_name"
                  value={newCampaign.campaign_name}
                  onChange={(e) => setNewCampaign({...newCampaign, campaign_name: e.target.value})}
                  placeholder="Q1 2025 Feedback Collection"
                />
              </div>

              <div>
                <Label htmlFor="target_audience">Target Audience</Label>
                <Select 
                  value={newCampaign.target_audience} 
                  onValueChange={(value) => setNewCampaign({...newCampaign, target_audience: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_partners">All Partner Customers</SelectItem>
                    <SelectItem value="specific_partner">Specific Partner</SelectItem>
                    <SelectItem value="recent_demos">Recent Demo Attendees</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newCampaign.target_audience === 'specific_partner' && (
                <div>
                  <Label htmlFor="partner_id">Select Partner</Label>
                  <Select 
                    value={newCampaign.partner_id} 
                    onValueChange={(value) => setNewCampaign({...newCampaign, partner_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a partner" />
                    </SelectTrigger>
                    <SelectContent>
                      {partners.map((partner) => (
                        <SelectItem key={partner.id} value={partner.id.toString()}>
                          {partner.company_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label htmlFor="message_template">Message Template</Label>
                <Textarea
                  id="message_template"
                  value={newCampaign.message_template}
                  onChange={(e) => setNewCampaign({...newCampaign, message_template: e.target.value})}
                  placeholder="Hi {contractor_name}! How was your experience with {partner_name}? Share your feedback: {survey_link}"
                  rows={4}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use variables: {'{contractor_name}'}, {'{partner_name}'}, {'{survey_link}'}
                </p>
              </div>

              <Button onClick={createCampaign} className="w-full">
                Create Campaign
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Analytics Overview */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Send className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Campaigns</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {analytics.campaignPerformance.total_campaigns}
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
                  <p className="text-sm font-medium text-gray-600">Messages Sent</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {analytics.campaignPerformance.total_messages_sent}
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
                  <p className="text-sm font-medium text-gray-600">Delivery Rate</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {analytics.campaignPerformance.avg_delivery_rate?.toFixed(1) || '0'}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Subscribers</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {analytics.subscriptionStats.active_subscriptions}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Campaign List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No campaigns created yet</p>
              <Button 
                onClick={() => setShowCreateDialog(true)}
                className="mt-4"
              >
                Create Your First Campaign
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {campaigns.map((campaign, index) => (
                <motion.div
                  key={campaign.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(campaign.status)}
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {campaign.campaign_name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {campaign.partner_name ? `${campaign.partner_name} customers` : 'All partners'} • {' '}
                        Created {new Date(campaign.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="text-center">
                      <p className="text-lg font-bold text-blue-600">
                        {campaign.total_recipients}
                      </p>
                      <p className="text-xs text-gray-500">Recipients</p>
                    </div>

                    <div className="text-center">
                      <p className="text-lg font-bold text-green-600">
                        {campaign.total_delivered}
                      </p>
                      <p className="text-xs text-gray-500">Delivered</p>
                    </div>

                    <div className="text-center">
                      <p className="text-lg font-bold text-purple-600">
                        {campaign.total_responses}
                      </p>
                      <p className="text-xs text-gray-500">Responses</p>
                    </div>

                    <Badge className={getStatusColor(campaign.status)}>
                      {campaign.status}
                    </Badge>

                    {campaign.status === 'pending' && (
                      <Button 
                        size="sm"
                        onClick={() => launchCampaign(campaign.id)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Launch
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SmsCampaignManager;