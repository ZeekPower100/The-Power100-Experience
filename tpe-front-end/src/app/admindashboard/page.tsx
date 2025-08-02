"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { contractorApi, partnerApi, bookingApi } from "@/lib/api";
import { 
  Users, 
  Handshake, 
  Calendar, 
  TrendingUp, 
  Star,
  Clock,
  CheckCircle,
  ArrowRight,
  BarChart3,
  Target,
  AlertTriangle
} from "lucide-react";
import { motion } from "framer-motion";

interface DashboardStats {
  contractors: {
    total: number;
    completed: number;
    new_this_week: number;
    completion_rate: number;
  };
  partners: {
    total: number;
    active: number;
    avg_confidence_score: number;
  };
  bookings: {
    total: number;
    upcoming: number;
    completed: number;
    new_this_week: number;
  };
}

interface RecentContractor {
  id: string;
  name: string;
  company_name: string;
  email: string;
  current_stage?: string;
  created_at: string;
}

interface RecentPartner {
  id: string;
  company_name: string;
  power_confidence_score?: number;
  is_active: boolean;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentContractors, setRecentContractors] = useState<RecentContractor[]>([]);
  const [topPartners, setTopPartners] = useState<RecentPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load data from multiple endpoints
      const [contractorsResponse, partnersResponse, bookingsResponse] = await Promise.all([
        contractorApi.getAll({ limit: 10 }).catch(() => ({ contractors: [], count: 0 })),
        partnerApi.getAll({ limit: 5 }).catch(() => ({ partners: [] })),
        bookingApi.getAll({ limit: 5 }).catch(() => ({ bookings: [] }))
      ]);

      // Calculate stats from the data
      const contractorStats = {
        total: contractorsResponse.count || contractorsResponse.contractors?.length || 0,
        completed: contractorsResponse.contractors?.filter((c: any) => c.current_stage === 'completed').length || 0,
        new_this_week: contractorsResponse.contractors?.filter((c: any) => {
          const createdDate = new Date(c.created_at || c.created_date);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return createdDate > weekAgo;
        }).length || 0,
        completion_rate: 0
      };

      contractorStats.completion_rate = contractorStats.total > 0 
        ? Math.round((contractorStats.completed / contractorStats.total) * 100)
        : 0;

      const partnerStats = {
        total: partnersResponse.partners?.length || 0,
        active: partnersResponse.partners?.filter((p: any) => p.is_active).length || 0,
        avg_confidence_score: partnersResponse.partners?.length > 0
          ? Math.round(partnersResponse.partners.reduce((sum: number, p: any) => sum + (p.power_confidence_score || 0), 0) / partnersResponse.partners.length)
          : 0
      };

      const bookingStats = {
        total: bookingsResponse.bookings?.length || 0,
        upcoming: bookingsResponse.bookings?.filter((b: any) => b.status === 'scheduled' && new Date(b.scheduled_date) > new Date()).length || 0,
        completed: bookingsResponse.bookings?.filter((b: any) => b.status === 'completed').length || 0,
        new_this_week: bookingsResponse.bookings?.filter((b: any) => {
          const createdDate = new Date(b.created_at || b.created_date);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return createdDate > weekAgo;
        }).length || 0
      };

      setStats({
        contractors: contractorStats,
        partners: partnerStats,
        bookings: bookingStats
      });

      setRecentContractors(contractorsResponse.contractors?.slice(0, 5) || []);
      setTopPartners(partnersResponse.partners?.slice(0, 3) || []);

    } catch (err: any) {
      console.error('Dashboard error:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getStageCount = (stage: string) => {
    return recentContractors.filter(c => c.current_stage === stage).length;
  };

  const getStageColor = (stage: string) => {
    const colors = {
      verification: "bg-yellow-500",
      focus_selection: "bg-blue-500", 
      profiling: "bg-purple-500",
      matching: "bg-orange-500",
      completed: "bg-power100-green"
    };
    return colors[stage as keyof typeof colors] || "bg-gray-500";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-power100-bg-grey p-6">
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-power100-red"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-power100-bg-grey p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center space-x-4 mb-4"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-power100-red to-red-700 rounded-xl flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-power100-black">Power100 Dashboard</h1>
              <p className="text-lg text-power100-grey">Power100 Experience Analytics & Management</p>
            </div>
          </motion.div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error}. Some features may use fallback data.
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Contractors */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="bg-white hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Contractors</p>
                    <p className="text-2xl font-bold text-power100-black">{stats?.contractors.total || 0}</p>
                    <p className="text-xs text-green-600">+{stats?.contractors.new_this_week || 0} this week</p>
                  </div>
                  <Users className="w-8 h-8 text-power100-red" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Active Partners */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="bg-white hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Partners</p>
                    <p className="text-2xl font-bold text-power100-black">{stats?.partners.active || 0}</p>
                    <p className="text-xs text-gray-500">of {stats?.partners.total || 0} total</p>
                  </div>
                  <Handshake className="w-8 h-8 text-power100-red" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Demo Bookings */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="bg-white hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Demo Bookings</p>
                    <p className="text-2xl font-bold text-power100-black">{stats?.bookings.total || 0}</p>
                    <p className="text-xs text-blue-600">{stats?.bookings.upcoming || 0} upcoming</p>
                  </div>
                  <Calendar className="w-8 h-8 text-power100-red" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Completion Rate */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="bg-white hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                    <p className="text-2xl font-bold text-power100-black">{stats?.contractors.completion_rate || 0}%</p>
                    <p className="text-xs text-green-600">{stats?.contractors.completed || 0} completed</p>
                  </div>
                  <Target className="w-8 h-8 text-power100-red" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Contractors */}
          <div className="lg:col-span-2">
            <Card className="bg-white">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl font-semibold">Recent Contractors</CardTitle>
                <Link href="/admindashboard/contractors">
                  <Button variant="outline" className="h-11">
                    <Users className="w-4 h-4 mr-2" />
                    View All
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentContractors.length > 0 ? (
                    recentContractors.map((contractor, index) => (
                      <motion.div 
                        key={contractor.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center justify-between p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-power100-red rounded-full flex items-center justify-center text-white font-semibold">
                            {contractor.name?.charAt(0) || 'C'}
                          </div>
                          <div>
                            <h4 className="font-medium text-power100-black">{contractor.name}</h4>
                            <p className="text-sm text-gray-500">{contractor.company_name}</p>
                            <p className="text-xs text-gray-400">{contractor.email}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge 
                            variant="secondary" 
                            className={`${getStageColor(contractor.current_stage || 'verification')} text-white`}
                          >
                            {(contractor.current_stage || 'verification').replace('_', ' ')}
                          </Badge>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(contractor.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No contractors found</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/admindashboard/partners" className="block">
                  <Button variant="outline" className="w-full justify-start h-11">
                    <Handshake className="w-4 h-4 mr-2" />
                    Manage Partners
                  </Button>
                </Link>
                <Link href="/admindashboard/bookings" className="block">
                  <Button variant="outline" className="w-full justify-start h-11">
                    <Calendar className="w-4 h-4 mr-2" />
                    View Bookings
                  </Button>
                </Link>
                <Link href="/contractorflow" className="block">
                  <Button variant="outline" className="w-full justify-start h-11">
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Test Contractor Flow
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Top Partners */}
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Top Strategic Partners</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topPartners.length > 0 ? (
                    topPartners.map((partner, index) => (
                      <motion.div 
                        key={partner.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center justify-between"
                      >
                        <div>
                          <h4 className="font-medium text-power100-black">{partner.company_name}</h4>
                          <div className="flex items-center space-x-1 mt-1">
                            <Star className="w-3 h-3 text-power100-red fill-current" />
                            <span className="text-sm font-semibold text-power100-red">
                              {partner.power_confidence_score || 0}/100
                            </span>
                          </div>
                        </div>
                        <Badge variant={partner.is_active ? "default" : "secondary"}>
                          {partner.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      <Handshake className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No partners found</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Flow Progress */}
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Flow Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { stage: 'verification', label: 'Verification', count: getStageCount('verification') },
                    { stage: 'focus_selection', label: 'Focus Selection', count: getStageCount('focus_selection') },
                    { stage: 'profiling', label: 'Profiling', count: getStageCount('profiling') },
                    { stage: 'matching', label: 'Matching', count: getStageCount('matching') },
                    { stage: 'completed', label: 'Completed', count: getStageCount('completed') }
                  ].map((item) => (
                    <div key={item.stage} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${getStageColor(item.stage)}`}></div>
                        <span className="text-sm text-gray-700">{item.label}</span>
                      </div>
                      <span className="text-sm font-semibold text-power100-black">{item.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}