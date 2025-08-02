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

// FIXED: Define the props interface for type safety and clarity
interface StepProps {
  data: Partial<Contractor>;
  onComplete: (data: Partial<Contractor>) => void;
  // onBack is not used in this step, but we keep it for consistency
}

export default function VerificationStep({ data, onComplete }: StepProps) {
  const [formData, setFormData] = useState({
    name: data.name || '',
    email: data.email || '',
    phone: data.phone || '',
    company_name: data.company_name || '',
    company_website: data.company_website || '',
  });
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const sendVerification = () => {
    if (!formData.name || !formData.email || !formData.phone || !formData.company_name) {
      setError('Please fill in all required fields');
      return;
    }
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setVerificationCode(code);
    setVerificationSent(true);
    console.log(`Verification code for ${formData.phone}: ${code}`);
  };

  const handleVerification = () => {
    setIsVerifying(true);
    setTimeout(() => {
      onComplete({
        ...formData,
        verification_status: 'verified',
      });
    }, 1000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <Card className="bg-white/70 border-0 shadow-2xl rounded-xl">
        <CardHeader className="text-center pb-8">
          {/* FIXED: Replaced custom gradient class with Tailwind utilities */}
          <div className="w-16 h-16 bg-gradient-to-br from-power100-red-deep to-power100-red rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Phone className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold text-power100-black mb-3">
            Welcome to Power100 Experience
          </CardTitle>
          {/* FIXED: Used Tailwind utility class for color */}
          <p className="text-lg text-power100-grey">
            Let&apos;s verify your information to get started.
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6 px-8 pb-8">
          {!verificationSent ? (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="name" className="text-sm font-semibold text-gray-700">
                    Full Name *
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="mt-2 h-12 border-gray-300 focus:border-power100-red focus:ring-1 focus:ring-power100-red"
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
                    Work Email *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="mt-2 h-12 border-gray-300 focus:border-power100-red focus:ring-1 focus:ring-power100-red"
                    placeholder="john@contracting.com"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="phone" className="text-sm font-semibold text-gray-700">
                    Cell Phone *
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="mt-2 h-12 border-gray-300 focus:border-power100-red focus:ring-1 focus:ring-power100-red"
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <Label htmlFor="company_name" className="text-sm font-semibold text-gray-700">
                    Company Name *
                  </Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => handleInputChange('company_name', e.target.value)}
                    className="mt-2 h-12 border-gray-300 focus:border-power100-red focus:ring-1 focus:ring-power100-red"
                    placeholder="ABC Contracting"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="company_website" className="text-sm font-semibold text-gray-700">
                  Company Website
                </Label>
                <Input
                  id="company_website"
                  value={formData.company_website}
                  onChange={(e) => handleInputChange('company_website', e.target.value)}
                  className="mt-2 h-12 border-gray-300 focus:border-power100-red focus:ring-1 focus:ring-power100-red"
                  placeholder="https://www.yourcompany.com"
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={sendVerification}
                // FIXED: Used theme color and utility hover effect
                className="w-full bg-power100-green hover:brightness-90 transition-all duration-300 text-white shadow-lg h-12 text-lg font-semibold"
              >
                Send Verification Text
              </Button>

              <div className="text-center text-sm text-gray-500 pt-2">
                We&apos;ll send a code to confirm your identity and opt you in for AI coaching.
              </div>
            </div>
          ) : (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-black mb-2">
                  Verification Code Sent
                </h3>
                <p className="text-power100-grey">
                  We&apos;ve sent a verification code to <strong>{formData.phone}</strong>
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  For demo purposes, your code is: <strong className="text-power100-red">{verificationCode}</strong>
                </p>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm">
                  ✓ By proceeding, you&apos;re opting in to receive AI coaching and strategic introductions from Power100.
                </p>
              </div>

              <Button
                onClick={handleVerification}
                disabled={isVerifying}
                className="w-full bg-power100-green hover:brightness-90 transition-all duration-300 text-white shadow-lg h-12 text-lg font-semibold"
              >
                {isVerifying ? "Verifying..." : "Confirm & Continue"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}