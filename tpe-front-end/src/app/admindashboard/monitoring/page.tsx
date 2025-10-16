'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Home, RefreshCw, AlertCircle, Activity, Users, TrendingUp, Clock } from 'lucide-react';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { getFromStorage, setToStorage } from '@/utils/jsonHelpers';

interface MonitoringMetrics {
  sessionStats: Array<{
    session_type: string;
    session_count: string;
    avg_duration: string | null;
  }>;
  agentDistribution: Array<{
    session_type: string;
    count: string;
    percentage: string;
  }>;
  recentActivity: {
    total_sessions: string;
    active_sessions: string;
    completed_sessions: string;
  };
  errorCount: string;
  totalStats: {
    total_sessions: string;
    first_session: string | null;
    last_session: string | null;
  };
}

export default function MonitoringDashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<MonitoringMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginLoading, setLoginLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const checkAuth = useCallback(async () => {
    const token = getFromStorage('authToken');

    if (token) {
      try {
        const response = await authApi.getMe();

        if (response && response.success && response.user && response.user.email) {
          setIsAuthenticated(true);
        } else if (response && response.user && response.user.email) {
          setIsAuthenticated(true);
        } else {
          const timestamp = getFromStorage('authTokenTimestamp');
          if (!timestamp || response?.error || response?.message?.includes('not found')) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('authTokenTimestamp');
          }
          setIsAuthenticated(false);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('authTokenTimestamp');
        setIsAuthenticated(false);
        setIsLoading(false);
      }
    } else {
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setAuthError(null);

    try {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('authToken');
      localStorage.removeItem('authTokenTimestamp');

      const response = await authApi.login(loginForm.email, loginForm.password);
      setToStorage('authToken', response.token);
      setToStorage('authTokenTimestamp', Date.now().toString());
      setIsAuthenticated(true);
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  };

  const fetchMetrics = async () => {
    setError(null);

    try {
      const baseUrl = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
        ? ''
        : 'http://localhost:5000';

      const response = await fetch(`${baseUrl}/api/state-machine/monitoring`);
      const data = await response.json();

      if (data.success && data.metrics) {
        setMetrics(data.metrics);
        setLastUpdated(new Date().toLocaleString());
        setIsLoading(false);
      } else {
        throw new Error('Failed to fetch metrics');
      }
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError('Failed to load monitoring data. The system may not have any sessions yet.');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchMetrics();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!autoRefresh || !isAuthenticated) return;

    const interval = setInterval(() => {
      fetchMetrics();
    }, 10000);

    return () => clearInterval(interval);
  }, [autoRefresh, isAuthenticated]);

  const handleRefresh = () => {
    setIsLoading(true);
    fetchMetrics();
  };

  if (isLoading && !metrics) {
    return (
      <div className="min-h-screen bg-power100-bg-grey p-8">
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
            <CardTitle className="text-2xl font-bold text-power100-black">Admin Login Required</CardTitle>
            <p className="text-power100-grey">Access the Production Monitoring Dashboard</p>
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
              {authError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{authError}</AlertDescription>
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
              <div className="text-center mt-4">
                <Link href="/admindashboard">
                  <Button variant="outline" className="w-full">
                    <Home className="h-4 w-4 mr-2" />
                    Back to Dashboard
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-power100-bg-grey p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-power100-black mb-2">
                Production Monitoring Dashboard
              </h1>
              <p className="text-power100-grey">
                Real-time metrics for AI Concierge state machine and session tracking
              </p>
            </div>
            <Link href="/admindashboard">
              <Button variant="outline" className="gap-2">
                <Home className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={handleRefresh}
              variant="outline"
              className="gap-2"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Now
            </Button>
            <Button
              onClick={() => setAutoRefresh(!autoRefresh)}
              variant={autoRefresh ? 'default' : 'outline'}
              className="gap-2"
            >
              <Activity className="h-4 w-4" />
              Auto-Refresh: {autoRefresh ? 'ON' : 'OFF'}
            </Button>
            {lastUpdated && (
              <span className="text-sm text-power100-grey">
                Last updated: {lastUpdated}
              </span>
            )}
          </div>
        </div>

        {error && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-power100-grey">Total Sessions</CardTitle>
              <Users className="h-4 w-4 text-power100-grey" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-power100-black">
                {metrics?.totalStats.total_sessions || '0'}
              </div>
              <p className="text-xs text-power100-grey mt-1">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-power100-grey">Active Now</CardTitle>
              <Activity className="h-4 w-4 text-power100-green" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-power100-green">
                {metrics?.recentActivity.active_sessions || '0'}
              </div>
              <p className="text-xs text-power100-grey mt-1">Last hour</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-power100-grey">Recent Activity</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-power100-black">
                {metrics?.recentActivity.total_sessions || '0'}
              </div>
              <p className="text-xs text-power100-grey mt-1">Last hour</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-power100-grey">Error Count</CardTitle>
              <AlertCircle className={`h-4 w-4 ${parseInt(metrics?.errorCount || '0') > 0 ? 'text-power100-red' : 'text-power100-grey'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${parseInt(metrics?.errorCount || '0') > 0 ? 'text-power100-red' : 'text-power100-green'}`}>
                {metrics?.errorCount || '0'}
              </div>
              <p className="text-xs text-power100-grey mt-1">Last hour</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-bold text-power100-black">Session Stats (24h)</CardTitle>
            </CardHeader>
            <CardContent>
              {metrics?.sessionStats && metrics.sessionStats.length > 0 ? (
                <div className="space-y-4">
                  {metrics.sessionStats.map((stat) => (
                    <div key={stat.session_type} className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-power100-black capitalize">
                          {stat.session_type.replace('_', ' ')}
                        </p>
                        <p className="text-sm text-power100-grey">
                          Avg duration: {parseFloat(stat.avg_duration || '0').toFixed(1)} min
                        </p>
                      </div>
                      <div className="text-2xl font-bold text-power100-black">
                        {stat.session_count}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-power100-grey text-center py-8">No session data in last 24 hours</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-bold text-power100-black">Agent Distribution (24h)</CardTitle>
            </CardHeader>
            <CardContent>
              {metrics?.agentDistribution && metrics.agentDistribution.length > 0 ? (
                <div className="space-y-4">
                  {metrics.agentDistribution.map((dist) => (
                    <div key={dist.session_type}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-power100-black capitalize">
                          {dist.session_type.replace('_', ' ')}
                        </p>
                        <p className="text-lg font-bold text-power100-black">
                          {parseFloat(dist.percentage).toFixed(1)}%
                        </p>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-power100-red h-2 rounded-full transition-all duration-300"
                          style={{ width: `${dist.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-power100-grey text-center py-8">No agent distribution data</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold text-power100-black">Recent Activity (Last Hour)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-blue-50 rounded-lg">
                <Clock className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                <p className="text-3xl font-bold text-blue-600">{metrics?.recentActivity.total_sessions || '0'}</p>
                <p className="text-sm text-power100-grey mt-1">Total Sessions</p>
              </div>
              <div className="text-center p-6 bg-green-50 rounded-lg">
                <Activity className="h-8 w-8 text-power100-green mx-auto mb-2" />
                <p className="text-3xl font-bold text-power100-green">{metrics?.recentActivity.active_sessions || '0'}</p>
                <p className="text-sm text-power100-grey mt-1">Active Sessions</p>
              </div>
              <div className="text-center p-6 bg-gray-50 rounded-lg">
                <TrendingUp className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                <p className="text-3xl font-bold text-gray-700">{metrics?.recentActivity.completed_sessions || '0'}</p>
                <p className="text-sm text-power100-grey mt-1">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-power100-black">System Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-power100-grey">First Session:</span>
                <span className="font-semibold text-power100-black">
                  {metrics?.totalStats.first_session
                    ? new Date(metrics.totalStats.first_session).toLocaleString()
                    : 'No sessions yet'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-power100-grey">Last Session:</span>
                <span className="font-semibold text-power100-black">
                  {metrics?.totalStats.last_session
                    ? new Date(metrics.totalStats.last_session).toLocaleString()
                    : 'No sessions yet'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-power100-grey">Auto-Refresh Interval:</span>
                <span className="font-semibold text-power100-black">10 seconds</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
