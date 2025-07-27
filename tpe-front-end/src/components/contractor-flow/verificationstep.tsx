
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle, Phone } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { motion } from "framer-motion";

export default function VerificationStep({ data, onComplete }) {
  const [formData, setFormData] = useState({
    name: data.name || "",
    email: data.email || "",
    phone: data.phone || "",
    company_name: data.company_name || "",
    company_website: data.company_website || ""
  });
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState("");

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError("");
  };

  const sendVerification = () => {
    if (!formData.name || !formData.email || !formData.phone || !formData.company_name) {
      setError("Please fill in all required fields");
      return;
    }

    // Simulate sending verification
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setVerificationCode(code);
    setVerificationSent(true);
    
    // In real implementation, this would send SMS
    console.log(`Verification code for ${formData.phone}: ${code}`);
  };

  const handleVerification = () => {
    setIsVerifying(true);
    
    // Simulate verification process
    setTimeout(() => {
      onComplete({
        ...formData,
        verification_status: "verified",
        current_stage: "focus_selection",
        verification_code: verificationCode
      });
    }, 1000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <Card className="bg-white/70 border-0 shadow-2xl">
        <CardHeader className="text-center pb-8">
          <div className="w-16 h-16 power100-red-gradient rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Phone className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold text-black mb-3">
            Welcome to Power100 Experience
          </CardTitle>
          <p className="text-lg text-[var(--power100-grey)]">
            Let's verify your information to get started with your personalized journey
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
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
                    className="mt-2 h-12 border-gray-300 focus:border-[var(--power100-red)]"
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
                    className="mt-2 h-12 border-gray-300 focus:border-[var(--power100-red)]"
                    placeholder="john@contractingcompany.com"
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
                    className="mt-2 h-12 border-gray-300 focus:border-[var(--power100-red)]"
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
                    className="mt-2 h-12 border-gray-300 focus:border-[var(--power100-red)]"
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
                  className="mt-2 h-12 border-gray-300 focus:border-[var(--power100-red)]"
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
                className="w-full bg-[var(--power100-green)] hover:bg-[#009e54] transition-all duration-300 text-white shadow-lg h-12 text-lg font-semibold"
              >
                Send Verification Text
              </Button>

              <div className="text-center text-sm text-gray-500">
                We'll send a verification code to confirm your identity and opt you in for AI coaching
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
                <p className="text-[var(--power100-grey)]">
                  We've sent a verification code to <strong>{formData.phone}</strong>
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  For demo purposes, your code is: <strong className="text-[var(--power100-red)]">{verificationCode}</strong>
                </p>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm">
                  ✓ By responding to this verification, you're opting in to receive AI coaching and strategic introductions from Power100
                </p>
              </div>

              <Button
                onClick={handleVerification}
                disabled={isVerifying}
                className="w-full bg-[var(--power100-green)] hover:bg-[#009e54] transition-all duration-300 text-white shadow-lg h-12 text-lg font-semibold"
              >
                {isVerifying ? "Verifying..." : "Confirm Verification"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
