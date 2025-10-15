// ================================================================
// Guard Monitoring Admin Page - Phase 3 Day 5
// ================================================================
// Purpose: Protected admin page for Guard Monitoring Dashboard
// Route: /admin/guard-monitoring
// Auth: Client-side authentication required (FlexAuth)
// ================================================================

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import GuardMonitoringDashboard from '@/components/admin/GuardMonitoringDashboard';
import { authApi } from '@/lib/api';
import { getFromStorage, setToStorage } from '@/utils/jsonHelpers';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function GuardMonitoringPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });

  // Check authentication on mount
  const checkAuthAndLoadData = useCallback(async () => {
    // Check if already logged in
    const token = getFromStorage('authToken');

    if (token) {
      try {
        const response = await authApi.getMe();

        // The API returns { success: true, user: {...} }
        if (response && response.success && response.user && response.user.email) {
          setIsAuthenticated(true);
          setLoading(false);
        } else if (response && response.user && response.user.email) {
          // Handle case where success flag might be missing but user data is valid
          setIsAuthenticated(true);
          setLoading(false);
        } else {
          // Not a valid admin token - could be partner/contractor token
          // Only clear if we're sure it's invalid
          const timestamp = getFromStorage('authTokenTimestamp');
          if (!timestamp || response?.error || response?.message?.includes('not found')) {
            // This is either not an admin token or an expired one
            localStorage.removeItem('authToken');
            localStorage.removeItem('authTokenTimestamp');
          }
          setIsAuthenticated(false);
          setLoading(false);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        // Only clear tokens if we get a definitive auth error
        localStorage.removeItem('authToken');
        localStorage.removeItem('authTokenTimestamp');
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

  // Handle login form submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authApi.login(loginForm.email, loginForm.password);

      if (response && response.success && response.token) {
        setToStorage('authToken', response.token);
        setToStorage('authTokenTimestamp', Date.now().toString());
        setIsAuthenticated(true);
      } else {
        setError(response?.message || 'Invalid credentials');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-power100-bg-grey flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-power100-red mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-power100-bg-grey flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-power100-black">Admin Login</CardTitle>
            <p className="text-power100-grey">Access Guard Monitoring Dashboard</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-power100-red"
                  required
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-power100-red"
                  required
                />
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}
              <Button
                type="submit"
                className="w-full bg-power100-red hover:bg-red-700 text-white"
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Login'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show dashboard if authenticated
  return <GuardMonitoringDashboard />;
}
