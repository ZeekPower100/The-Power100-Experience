"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { contractorApi, partnerApi, bookingApi, authApi } from "@/lib/api";
import { 
  Users, 
  Handshake, 
  Calendar, 
  Star,
  ArrowRight,
  BarChart3,
  Target,
  AlertTriangle,
  Search,
  MessageSquare,
  Shield
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

interface Contractor {
  id: string;
  name: string;
  company_name: string;
  email: string;
  current_stage?: string;
  created_at: string;
}

interface Partner {
  id: string;
  company_name: string;
  power_confidence_score?: number;
  is_active: boolean;
}

interface Booking {
  id: string;
  status: string;
  scheduled_date: string;
  created_at: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentContractors, setRecentContractors] = useState<Contractor[]>([]);
  const [topPartners, setTopPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginLoading, setLoginLoading] = useState(false);

  const checkAuthAndLoadData = useCallback(async () => {
    // Check if already logged in
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        await authApi.getMe();
        setIsAuthenticated(true);
        loadDashboardData();
      } catch {
        // Token is invalid, remove it
        localStorage.removeItem('authToken');
        setIsAuthenticated(false);
        setLoading(false);
      }
    } else {
      setIsAuthenticated(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuthAndLoadData();
  }, [checkAuthAndLoadData]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setError(null);

    try {
      const response = await authApi.login(loginForm.email, loginForm.password);
      localStorage.setItem('authToken', response.token);
      setIsAuthenticated(true);
      loadDashboardData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  };

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load data from multiple endpoints
      const [contractorsResponse, partnersResponse, bookingsResponse] = await Promise.all([
        contractorApi.getAll({ limit: 10 }).catch(() => ({ contractors: [], count: 0 })),
        partnerApi.getAll().catch(() => ({ partners: [] })), // Get all partners for accurate stats
        bookingApi.getAll({ limit: 5 }).catch(() => ({ bookings: [] }))
      ]);

      // Calculate stats from the data
      const contractorStats = {
        total: contractorsResponse.count || contractorsResponse.contractors?.length || 0,
        completed: contractorsResponse.contractors?.filter((c: Contractor) => c.current_stage === 'completed').length || 0,
        new_this_week: contractorsResponse.contractors?.filter((c: Contractor) => {
          const createdDate = new Date(c.created_at);
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
        active: partnersResponse.partners?.filter((p: Partner) => p.is_active).length || 0,
        avg_confidence_score: partnersResponse.partners?.length > 0
          ? Math.round(partnersResponse.partners.reduce((sum: number, p: Partner) => sum + (p.power_confidence_score || 0), 0) / partnersResponse.partners.length)
          : 0
      };

      const bookingStats = {
        total: bookingsResponse.bookings?.length || 0,
        upcoming: bookingsResponse.bookings?.filter((b: Booking) => b.status === 'scheduled' && new Date(b.scheduled_date) > new Date()).length || 0,
        completed: bookingsResponse.bookings?.filter((b: Booking) => b.status === 'completed').length || 0,
        new_this_week: bookingsResponse.bookings?.filter((b: Booking) => {
          const createdDate = new Date(b.created_at);
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
      
      // Parse JSON fields for partners and select top performers with safe parsing
      const parsedPartners = (partnersResponse.partners || []).map((partner: any) => {
        const safeJsonParse = (jsonString: any, fallback: any = []) => {
          if (!jsonString || typeof jsonString !== 'string') {
            return Array.isArray(jsonString) ? jsonString : fallback;
          }
          
          if (jsonString === '[object Object]') {
            return fallback;
          }
          
          try {
            return JSON.parse(jsonString);
          } catch (error) {
            console.warn('Failed to parse JSON:', jsonString, error);
            return fallback;
          }
        };

        return {
          ...partner,
          focus_areas_served: safeJsonParse(partner.focus_areas_served, []),
          target_revenue_range: safeJsonParse(partner.target_revenue_range, []),
          geographic_regions: safeJsonParse(partner.geographic_regions, []),
          service_categories: safeJsonParse(partner.service_categories, [])
        };
      });
      
      setTopPartners(parsedPartners.slice(0, 8)); // Show top 8 partners in dashboard

    } catch (err: unknown) {
      console.error('Dashboard error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-power100-bg-grey flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-power100-black">Admin Login</CardTitle>
            <p className="text-power100-grey">Access the Power100 Dashboard</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  id="email"
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-power100-red"
                  placeholder="admin@power100.io"
                  required
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  id="password"
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-power100-red"
                  placeholder="Enter your password"
                  required
                />
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button
                type="submit"
                disabled={loginLoading}
                className="w-full bg-power100-red hover:bg-red-700 text-white"
              >
                {loginLoading ? 'Logging in...' : 'Login'}
              </Button>
              <div className="text-center text-sm text-gray-500 mt-4">
                <p>Development credentials:</p>
                <p className="font-mono text-xs">admin@power100.io / admin123</p>
              </div>
            </form>
          </CardContent>
        </Card>
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

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-power100-black mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Link href="/admindashboard/search">
              <Card className="bg-white hover:shadow-lg transition-all duration-300 cursor-pointer border-2 hover:border-power100-red">
                <CardContent className="p-6 text-center">
                  <Search className="w-8 h-8 text-power100-red mx-auto mb-3" />
                  <h3 className="font-semibold text-power100-black">Advanced Search</h3>
                  <p className="text-sm text-power100-grey mt-1">Search contractors and partners</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/admindashboard/partners-enhanced">
              <Card className="bg-white hover:shadow-lg transition-all duration-300 cursor-pointer border-2 hover:border-power100-red">
                <CardContent className="p-6 text-center">
                  <Shield className="w-8 h-8 text-power100-red mx-auto mb-3" />
                  <h3 className="font-semibold text-power100-black">Enhanced Partners</h3>
                  <p className="text-sm text-power100-grey mt-1">Advanced partner management & PowerConfidence</p>
                </CardContent>
              </Card>
            </Link>
            
            <Card className="bg-gray-50 cursor-not-allowed opacity-60">
              <CardContent className="p-6 text-center">
                <Users className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-600">Manage Contractors</h3>
                <p className="text-sm text-gray-500 mt-1">Coming soon</p>
              </CardContent>
            </Card>
            
            <Link href="/admindashboard/powerconfidence">
              <Card className="bg-white hover:shadow-lg transition-all duration-300 cursor-pointer border-2 hover:border-power100-red">
                <CardContent className="p-6 text-center">
                  <MessageSquare className="w-8 h-8 text-power100-red mx-auto mb-3" />
                  <h3 className="font-semibold text-power100-black">PowerConfidence</h3>
                  <p className="text-sm text-power100-grey mt-1">Manage feedback & SMS campaigns</p>
                </CardContent>
              </Card>
            </Link>
          </div>
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
                <Link href="/admindashboard/search" className="block">
                  <Button variant="outline" className="w-full justify-start h-11">
                    <Search className="w-4 h-4 mr-2" />
                    Advanced Search
                  </Button>
                </Link>
                <Link href="/admindashboard/partners-enhanced" className="block">
                  <Button variant="outline" className="w-full justify-start h-11">
                    <Handshake className="w-4 h-4 mr-2" />
                    Manage Partners
                  </Button>
                </Link>
                <Link href="/admindashboard/partners-enhanced" className="block">
                  <Button variant="outline" className="w-full justify-start h-11">
                    <Shield className="w-4 h-4 mr-2" />
                    Enhanced Partners
                  </Button>
                </Link>
                <Link href="/admindashboard/bookings" className="block">
                  <Button variant="outline" className="w-full justify-start h-11">
                    <Calendar className="w-4 h-4 mr-2" />
                    View Bookings
                  </Button>
                </Link>
                <Link href="/ai-coach" className="block">
                  <Button variant="outline" className="w-full justify-start h-11">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    AI Coach Demo
                  </Button>
                </Link>
                <Link href="/contractorflow" className="block">
                  <Button variant="outline" className="w-full justify-start h-11">
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Test Contractor Flow
                  </Button>
                </Link>
                <Link href="/admindashboard/powerconfidence" className="block">
                  <Button variant="outline" className="w-full justify-start h-11">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    PowerConfidence
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