'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, LogIn, Shield, TrendingUp, Award } from 'lucide-react';
import { motion } from 'framer-motion';
import { getApiUrl } from '@/utils/api';
import { safeJsonParse, safeJsonStringify, handleApiResponse, getFromStorage, setToStorage } from '../../../utils/jsonHelpers';

export default function PartnerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(getApiUrl('api/partner-auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: safeJsonStringify({ email, password }),
      });

      const data = await handleApiResponse(response);

      if (!response.ok) {
        throw new Error(data.message || 'Invalid credentials');
      }

      // Store partner token and info
      setToStorage('partnerToken', data.token);
      setToStorage('partnerInfo', data.partner);  // setToStorage will handle stringification

      // Redirect to partner dashboard
      router.push('/partner/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Side - Login Form */}
            <Card className="shadow-xl">
              <CardHeader className="space-y-1 pb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-8 h-8 text-red-600" />
                  <h1 className="text-2xl font-bold text-gray-900">Partner Portal</h1>
                </div>
                <CardTitle className="text-xl">Welcome Back</CardTitle>
                <CardDescription>
                  Sign in to access your PowerConfidence dashboard
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
                      placeholder="partner@company.com"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent pr-10"
                        placeholder="Enter your password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Signing in...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <LogIn className="w-4 h-4" />
                        Sign In
                      </span>
                    )}
                  </Button>

                  <div className="text-center text-sm">
                    <Link href="/partner/forgot-password" className="text-red-600 hover:text-red-700">
                      Forgot your password?
                    </Link>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">Need help?</span>
                    </div>
                  </div>

                  <div className="text-center text-sm text-gray-600">
                    Contact support at{' '}
                    <a href="mailto:partners@power100.io" className="text-red-600 hover:text-red-700">
                      partners@power100.io
                    </a>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Right Side - Benefits */}
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Your PowerConfidence Hub
                </h2>
                <p className="text-gray-600 mb-6">
                  Access your performance metrics, contractor feedback, and growth insights all in one place.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="space-y-4"
              >
                <Card className="border-2 border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <TrendingUp className="w-6 h-6 text-green-600 mt-1" />
                      <div>
                        <h3 className="font-semibold text-gray-900">Track Your Performance</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Monitor your PowerConfidence score trends and see how you rank among partners
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Award className="w-6 h-6 text-blue-600 mt-1" />
                      <div>
                        <h3 className="font-semibold text-gray-900">Contractor Feedback</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Access anonymized feedback and insights from your contractor relationships
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Shield className="w-6 h-6 text-red-600 mt-1" />
                      <div>
                        <h3 className="font-semibold text-gray-900">Actionable Insights</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Get personalized recommendations to improve your PowerConfidence score
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="bg-gray-50 rounded-lg p-4 border border-gray-200"
              >
                <p className="text-sm text-gray-600">
                  <strong>New to Power100?</strong> Contact your account manager to get your partner
                  portal credentials and start tracking your performance today.
                </p>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Back to main site link */}
        <div className="text-center mt-8">
          <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">
            ← Back to Power100 Experience
          </Link>
        </div>
      </div>
    </div>
  );
}