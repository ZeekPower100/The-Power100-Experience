"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, ArrowRight, AlertCircle, CheckCircle, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import SessionService from '@/lib/sessionService';

export default function ResumePage() {
  const [email, setEmail] = useState('');
  const [sessionToken, setSessionToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasExistingSession, setHasExistingSession] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if user has an existing session
    const hasSession = SessionService.hasActiveSession();
    setHasExistingSession(hasSession);
  }, []);

  const handleResumeFromSession = async () => {
    setIsLoading(true);
    setError('');

    try {
      const sessionData = await SessionService.restoreSession();
      if (sessionData) {
        setSuccess('Session restored successfully! Redirecting...');
        setTimeout(() => {
          router.push('/contractorflow');
        }, 1500);
      } else {
        setError('No valid session found. Please use email or token method.');
        setHasExistingSession(false);
      }
    } catch (err) {
      setError('Failed to restore session. Please try another method.');
      setHasExistingSession(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResumeByEmail = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // For now, this is a placeholder - we could implement email-based session lookup
      // In a real implementation, this would send an email with a session link
      setError('Email-based resume is not yet implemented. Please use your session token if you have one.');
    } catch (err) {
      setError('Failed to send resume link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResumeByToken = async () => {
    if (!sessionToken) {
      setError('Please enter your session token');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const sessionData = await SessionService.restoreSession(sessionToken);
      if (sessionData) {
        setSuccess('Session restored successfully! Redirecting...');
        setTimeout(() => {
          router.push('/contractorflow');
        }, 1500);
      } else {
        setError('Invalid or expired session token');
      }
    } catch (err) {
      setError('Failed to restore session. Please check your token.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartNew = () => {
    // Clear any existing session
    SessionService.clearSession();
    router.push('/contractorflow');
  };

  return (
    <div className="min-h-screen bg-power100-bg-grey">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold text-power100-black">
            Resume Your Power100 Experience
          </h1>
          <p className="text-lg text-power100-grey mt-2">
            Continue where you left off or start fresh
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-2 gap-8">
          
          {/* Resume Existing Session */}
          {hasExistingSession && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.6 }}
            >
              <Card className="bg-white/70 border-0 shadow-2xl rounded-xl h-full">
                <CardHeader className="text-center pb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-power100-green to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <RefreshCw className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-power100-black">
                    Continue Your Session
                  </CardTitle>
                  <p className="text-power100-grey">
                    We found your previous session
                  </p>
                </CardHeader>
                
                <CardContent className="space-y-6 px-6 pb-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-green-800 font-medium">
                        Session found in your browser
                      </span>
                    </div>
                  </div>

                  {success && (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription className="text-green-800">{success}</AlertDescription>
                    </Alert>
                  )}

                  {error && !hasExistingSession && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button 
                    onClick={handleResumeFromSession}
                    disabled={isLoading}
                    className="w-full bg-power100-green hover:brightness-90 text-white h-12 text-lg font-semibold group"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                        Restoring...
                      </>
                    ) : (
                      <>
                        Continue Where I Left Off
                        <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Resume by Token */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Card className="bg-white/70 border-0 shadow-2xl rounded-xl h-full">
              <CardHeader className="text-center pb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-power100-red to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <User className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl font-bold text-power100-black">
                  Resume with Token
                </CardTitle>
                <p className="text-power100-grey">
                  Have a session token? Enter it here
                </p>
              </CardHeader>
              
              <CardContent className="space-y-6 px-6 pb-6">
                <div>
                  <Label htmlFor="sessionToken" className="text-sm font-semibold text-gray-700">
                    Session Token
                  </Label>
                  <Input
                    id="sessionToken"
                    type="text"
                    placeholder="Enter your session token"
                    value={sessionToken}
                    onChange={(e) => setSessionToken(e.target.value)}
                    className="mt-2 h-12"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Your session token was provided when you started the process
                  </p>
                </div>

                {error && hasExistingSession && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button 
                  onClick={handleResumeByToken}
                  disabled={isLoading || !sessionToken}
                  className="w-full bg-power100-red hover:brightness-90 text-white h-12 text-lg font-semibold group"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                      Restoring...
                    </>
                  ) : (
                    <>
                      Resume with Token
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Start New Flow */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.6, delay: 0.2 }}
            className={hasExistingSession ? "md:col-span-2" : ""}
          >
            <Card className="bg-white/70 border-0 shadow-2xl rounded-xl h-full">
              <CardHeader className="text-center pb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-gray-500 to-gray-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <ArrowRight className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl font-bold text-power100-black">
                  Start Fresh
                </CardTitle>
                <p className="text-power100-grey">
                  Begin a new Power100 Experience
                </p>
              </CardHeader>
              
              <CardContent className="space-y-6 px-6 pb-6">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-gray-700 text-sm">
                    Starting fresh will clear any existing session data and begin the experience from step 1.
                  </p>
                </div>

                <Button 
                  onClick={handleStartNew}
                  variant="outline"
                  className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 h-12 text-lg font-semibold group"
                >
                  Start New Experience
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Help Text */}
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 text-center"
        >
          <p className="text-power100-grey text-sm">
            Need help? Contact our support team at{' '}
            <a href="mailto:support@power100.io" className="text-power100-red hover:underline">
              support@power100.io
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}