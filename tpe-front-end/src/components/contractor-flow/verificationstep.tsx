// src/components/contractor-flow/VerificationStep.tsx

import React, { useState } from 'react';
import { Contractor } from '@/lib/types/contractor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Phone } from 'lucide-react';
import { motion } from 'framer-motion';
import { contractorApi } from '@/lib/api';
import SessionService from '@/lib/sessionService';

interface StepProps {
  data: Partial<Contractor>;
  onNext: () => void;
  onPrev?: () => void;
  onUpdate: (data: Partial<Contractor>) => void;
}

export default function VerificationStep({ data, onNext, onUpdate }: StepProps) {
  const [formData, setFormData] = useState({
    name: data.name || '',
    email: data.email || '',
    phone: data.phone || '',
    company_name: data.company_name || '',
    company_website: data.company_website || '',
  });
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const sendVerification = async () => {
    if (!formData.name || !formData.email || !formData.phone || !formData.company_name) {
      setError('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await contractorApi.startVerification(formData);
      
      // Update contractor data with response
      onUpdate({
        ...formData,
        id: response.contractor.id,
        verification_status: 'pending'
      });

      setVerificationSent(true);
      
      // In development, show a mock code for testing
      if (process.env.NODE_ENV === 'development') {
        console.log('🔐 Development Mode: Use code "123456" to verify');
        setError(''); // Clear any errors
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerification = async () => {
    if (!verificationCode) {
      setError('Please enter the verification code');
      return;
    }

    if (!data.id) {
      setError('Contractor ID not found. Please try again.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await contractorApi.verifyCode(data.id, verificationCode);
      
      // Update contractor status
      const updatedContractor = {
        ...data,
        verification_status: 'verified',
        opted_in_coaching: true
      };
      
      onUpdate(updatedContractor);

      // Create session for verified contractor
      if (data.id) {
        try {
          await SessionService.createSession(data.id, 2); // Move to step 2 (focus selection)
        } catch (sessionError) {
          console.warn('Failed to create session, but verification succeeded:', sessionError);
        }
      }

      // Move to next step
      onNext();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid verification code');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card className="border-2 border-power100-red">
        <CardHeader className="text-center pb-6">
          <CardTitle className="text-2xl font-bold text-power100-black mb-2">
            Let&apos;s verify your information to get started.
          </CardTitle>
          <p className="text-power100-grey">
            We&apos;ll send a verification code to confirm your identity and opt you in for AI coaching.
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!verificationSent ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="John Smith"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="john@company.com"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="(555) 123-4567"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="company_name">Company Name *</Label>
                  <Input
                    id="company_name"
                    type="text"
                    value={formData.company_name}
                    onChange={(e) => handleInputChange('company_name', e.target.value)}
                    placeholder="ABC Construction"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="company_website">Company Website (Optional)</Label>
                <Input
                  id="company_website"
                  type="url"
                  value={formData.company_website}
                  onChange={(e) => handleInputChange('company_website', e.target.value)}
                  placeholder="https://www.company.com"
                  className="mt-1"
                />
              </div>

              <Button
                onClick={sendVerification}
                disabled={isLoading}
                className="w-full bg-power100-red hover:bg-red-700 text-white py-3 text-lg font-semibold"
              >
                <Phone className="w-5 h-5 mr-2" />
                {isLoading ? 'Sending...' : 'Send Verification Text'}
              </Button>

              <div className="text-center text-sm text-gray-500 pt-2">
                We&apos;ll send a code to confirm your identity and opt you in for AI coaching.
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-6"
            >
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-power100-green rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-power100-black mb-2">
                  Verification Code Sent!
                </h3>
                <p className="text-power100-grey mb-4">
                  We&apos;ve sent a verification code to <strong>{formData.phone}</strong>
                </p>
              </div>

              <div className="max-w-xs mx-auto">
                <Label htmlFor="verification_code">Enter Verification Code</Label>
                <Input
                  id="verification_code"
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  className="mt-1 text-center text-lg tracking-widest"
                  maxLength={6}
                />
              </div>

              {process.env.NODE_ENV === 'development' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-yellow-800 text-sm">
                    <strong>Development Mode:</strong> Use code &quot;123456&quot; for testing
                  </p>
                </div>
              )}

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm">
                  ✓ By proceeding, you&apos;re opting in to receive AI coaching and strategic introductions from Power100.
                </p>
              </div>

              <Button
                onClick={handleVerification}
                disabled={isLoading || !verificationCode}
                className="w-full bg-power100-green hover:bg-green-700 text-white py-3 text-lg font-semibold"
              >
                {isLoading ? 'Verifying...' : 'Verify & Continue'}
              </Button>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}