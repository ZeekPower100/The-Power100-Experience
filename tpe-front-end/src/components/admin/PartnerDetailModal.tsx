'use client';

import React, { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, Minus, Calendar, Users, MessageSquare, AlertCircle, Award, Target, Phone, Mail, Globe, MapPin, Download, FileText, FileSpreadsheet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { exportToPDF, exportToExcel, exportToCSV } from '@/utils/exportReports';

interface PartnerDetailModalProps {
  partner: any;
  isOpen: boolean;
  onClose: () => void;
}

const PartnerDetailModal: React.FC<PartnerDetailModalProps> = ({ partner, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  if (!isOpen || !partner) return null;

  // Mock historical data for demonstration
  const scoreHistory = [
    { quarter: 'Q1 2024', score: 82, feedback_count: 15 },
    { quarter: 'Q2 2024', score: 85, feedback_count: 18 },
    { quarter: 'Q3 2024', score: 83, feedback_count: 12 },
    { quarter: 'Q4 2024', score: partner.current_powerconfidence_score || 87, feedback_count: 20 }
  ];

  const categoryBreakdown = [
    { category: 'Communication', score: 92, weight: 30 },
    { category: 'Service Quality', score: 88, weight: 25 },
    { category: 'Technical Expertise', score: 85, weight: 20 },
    { category: 'Response Time', score: 90, weight: 15 },
    { category: 'Value for Money', score: 82, weight: 10 }
  ];

  const recentFeedback = [
    { date: '2025-01-05', contractor: 'ABC Construction', rating: 5, comment: 'Excellent service and support' },
    { date: '2025-01-03', contractor: 'XYZ Builders', rating: 4, comment: 'Good overall, could improve response time' },
    { date: '2024-12-28', contractor: 'Demo Contractors', rating: 5, comment: 'Outstanding partner, highly recommend' }
  ];

  const insights = [
    { type: 'success', message: 'Communication scores improved by 8% this quarter' },
    { type: 'warning', message: 'Response time slightly below target (4.2 hours vs 4.0 target)' },
    { type: 'info', message: '95% of contractors would recommend this partner' }
  ];

  const getTrendIcon = (trend: string) => {
    switch(trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getInsightIcon = (type: string) => {
    switch(type) {
      case 'success': return <Award className="w-4 h-4 text-green-500" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default: return <Target className="w-4 h-4 text-blue-500" />;
    }
  };

  const handleExport = (format: 'pdf' | 'excel' | 'csv') => {
    const exportData = {
      partner,
      scoreHistory,
      categoryBreakdown,
      insights
    };

    switch(format) {
      case 'pdf':
        exportToPDF(exportData);
        break;
      case 'excel':
        exportToExcel(exportData);
        break;
      case 'csv':
        exportToCSV(exportData);
        break;
    }
    setExportMenuOpen(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-2">{partner.company_name}</h2>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <Globe className="w-4 h-4" />
                  {partner.website || 'No website'}
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  {partner.contact_email}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  {partner.contact_phone || 'No phone'}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* PowerConfidence Score Hero */}
          <div className="mt-6 bg-white bg-opacity-10 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">PowerConfidence Score</p>
                <div className="flex items-center gap-2">
                  <span className="text-4xl font-bold">{partner.current_powerconfidence_score || 87}</span>
                  <span className="text-2xl">/100</span>
                  {getTrendIcon(partner.score_trend || 'stable')}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm opacity-90">Trend</p>
                <p className="text-lg font-semibold">
                  {partner.score_trend === 'up' ? '+3' : partner.score_trend === 'down' ? '-2' : '0'} points
                </p>
                <p className="text-xs opacity-75">vs last quarter</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex gap-4 px-6">
            {['overview', 'history', 'feedback', 'insights'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 px-4 capitalize font-medium border-b-2 transition-colors ${
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

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 320px)' }}>
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Category Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {categoryBreakdown.map((category, index) => (
                    <div key={index}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">{category.category}</span>
                        <span className="text-sm text-gray-600">{category.score}/100</span>
                      </div>
                      <Progress value={category.score} className="h-2" />
                      <p className="text-xs text-gray-500 mt-1">Weight: {category.weight}%</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Partner Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Partner Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <Badge variant={partner.status === 'active' ? 'default' : 'secondary'}>
                      {partner.status || 'Active'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Service Categories</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {(() => {
                        let categories = [];
                        try {
                          const parsed = JSON.parse(partner.service_categories);
                          categories = Array.isArray(parsed) ? parsed : [partner.service_categories];
                        } catch {
                          categories = partner.service_categories ? [partner.service_categories] : ['IT Services', 'Marketing'];
                        }
                        return categories.map((cat: string, idx: number) => (
                          <Badge key={idx} variant="outline">{cat}</Badge>
                        ));
                      })()}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Feedback</p>
                    <p className="text-lg font-semibold">{partner.recent_feedback_count || 20} responses</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Average Rating</p>
                    <p className="text-lg font-semibold">4.6 / 5.0</p>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg">Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded">
                      <Users className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                      <p className="text-2xl font-bold">45</p>
                      <p className="text-sm text-gray-600">Active Clients</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 text-green-600" />
                      <p className="text-2xl font-bold">92%</p>
                      <p className="text-sm text-gray-600">Response Rate</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded">
                      <Calendar className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                      <p className="text-2xl font-bold">4.2h</p>
                      <p className="text-sm text-gray-600">Avg Response Time</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded">
                      <Award className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
                      <p className="text-2xl font-bold">95%</p>
                      <p className="text-sm text-gray-600">Would Recommend</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">PowerConfidence Score History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {scoreHistory.map((quarter, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded">
                        <div>
                          <p className="font-medium">{quarter.quarter}</p>
                          <p className="text-sm text-gray-600">{quarter.feedback_count} feedback responses</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold">{quarter.score}</p>
                          <p className="text-sm text-gray-600">
                            {index > 0 && (
                              <span className={quarter.score > scoreHistory[index-1].score ? 'text-green-600' : 'text-red-600'}>
                                {quarter.score > scoreHistory[index-1].score ? '+' : ''}{quarter.score - scoreHistory[index-1].score} pts
                              </span>
                            )}
                          </p>
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
                  <CardTitle className="text-lg">Recent Feedback</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentFeedback.map((feedback, index) => (
                      <div key={index} className="border-b pb-4 last:border-0">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium">{feedback.contractor}</p>
                            <p className="text-sm text-gray-600">{feedback.date}</p>
                          </div>
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <span key={i} className={i < feedback.rating ? 'text-yellow-500' : 'text-gray-300'}>★</span>
                            ))}
                          </div>
                        </div>
                        <p className="text-gray-700">{feedback.comment}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'insights' && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Actionable Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {insights.map((insight, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded">
                        {getInsightIcon(insight.type)}
                        <p className="text-sm">{insight.message}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-green-600">•</span>
                      <span className="text-sm">Continue focus on communication excellence - it's your strongest category</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-600">•</span>
                      <span className="text-sm">Consider implementing automated response system to improve response time</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600">•</span>
                      <span className="text-sm">Schedule quarterly business reviews with top clients to maintain high satisfaction</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Last updated: {new Date().toLocaleDateString()}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <div className="relative">
                <Button 
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => setExportMenuOpen(!exportMenuOpen)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Report
                </Button>
                
                {exportMenuOpen && (
                  <div className="absolute bottom-full right-0 mb-2 bg-white border rounded-lg shadow-lg z-10 min-w-[150px]">
                    <div className="p-2">
                      <button
                        onClick={() => handleExport('pdf')}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 rounded"
                      >
                        <FileText className="w-4 h-4" />
                        Export as PDF
                      </button>
                      <button
                        onClick={() => handleExport('excel')}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 rounded"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                        Export as Excel
                      </button>
                      <button
                        onClick={() => handleExport('csv')}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 rounded"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                        Export as CSV
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartnerDetailModal;