// src/components/contractor-flow/CompletionStep.tsx

import React from 'react';
import { useRouter } from 'next/navigation'; // FIXED: Use Next.js router
import { Contractor } from '@/lib/types/contractor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Calendar, Mail, Phone, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';

// FIXED: Define the props interface for type safety
interface StepProps {
  data: Partial<Contractor>;
}

export default function CompletionStep({ data }: StepProps) {
  const router = useRouter(); // FIXED: Use the correct hook

  const nextSteps = [
    { icon: Mail, title: 'Introduction Email Sent', description: "We've sent a personalized introduction email to your partner from concierge@power100.io." },
    { icon: Calendar, title: 'Demo Scheduled', description: 'Your partner will reach out within 24 hours to schedule your personalized demo.' },
    { icon: Phone, title: 'Follow-Up Call', description: "We'll call you after the demo to gather feedback and explore additional solutions." }
  ];

  const formatFocusArea = (area: string = '') => area.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
      <Card className="bg-white/70 border-0 shadow-2xl rounded-xl">
        <CardHeader className="text-center pb-8">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: 'spring', stiffness: 200 }} className="w-20 h-20 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <CardTitle className="text-4xl font-bold text-power100-black mb-4">🎉 You&apos;re All Set!</CardTitle>
            <p className="text-xl text-power100-grey mb-6 leading-relaxed">
              Welcome to the Power100 Experience, <strong>{data.name}</strong>!<br />
              Your perfect partner match has been confirmed.
            </p>
          </motion.div>
        </CardHeader>
        
        <CardContent className="space-y-8 px-8 pb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="bg-red-50 border border-red-200 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Image 
                src="/power100-logo.png" 
                alt="Power100 Logo" 
                width={48} 
                height={48} 
                className="w-12 h-12 object-contain"
              />
              <h3 className="text-xl font-bold text-red-900">Your Power100 Experience Summary</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div><span className="font-semibold text-red-800">Company:</span><p className="text-red-700">{data.company_name}</p></div>
              <div><span className="font-semibold text-red-800">Primary Focus:</span><p className="text-red-700">{formatFocusArea(data.primary_focus_area)}</p></div>
              <div><span className="font-semibold text-red-800">Service Area:</span><p className="text-red-700">{data.service_area}</p></div>
              <div><span className="font-semibold text-red-800">Team Size:</span><p className="text-red-700">{data.team_size} employees</p></div>
            </div>
          </motion.div>

          <div>
            <h3 className="text-2xl font-bold text-power100-black mb-6 text-center">What Happens Next</h3>
            <div className="space-y-4">
              {nextSteps.map((step, index) => (
                <motion.div key={step.title} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.9 + index * 0.1 }} className="flex items-start space-x-4 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                  <div className="w-10 h-10 bg-gradient-to-br from-power100-red-deep to-power100-red rounded-xl flex items-center justify-center flex-shrink-0">
                    <step.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-power100-black mb-1">{step.title}</h4>
                    <p className="text-gray-600 text-sm">{step.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {data.opted_in_coaching && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }} className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h4 className="font-semibold text-gray-900 mb-2">🤖 Weekly AI Coaching Activated</h4>
              <p className="text-gray-800 text-sm">You&apos;ll receive weekly check-ins from our AI Concierge to review progress, challenges, and receive strategic introductions to additional partners.</p>
            </motion.div>
          )}

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            <h4 className="font-semibold text-power100-black mb-2">Need Help or Have Questions?</h4>
            <p className="text-gray-600 mb-4">Your Power100 Concierge is always available.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <div className="flex items-center justify-center space-x-2 text-gray-700"><Mail className="w-4 h-4" /><span className="font-medium">concierge@power100.io</span></div>
              <div className="flex items-center justify-center space-x-2 text-gray-700"><Phone className="w-4 h-4" /><span className="font-medium">Text: POWER100 to [your #]</span></div>
            </div>
          </div>

          <div className="flex gap-4 pt-6">
            {/* FIXED: Replaced navigate(createPageUrl(...)) with router.push(...) */}
            <Button onClick={() => router.push('/')} variant="outline" className="flex-1 h-12 text-lg">Back to Home</Button>
            <Button onClick={() => router.push('/admindashboard')} className="flex-1 bg-power100-green hover:brightness-90 transition-all duration-300 text-white shadow-lg h-12 text-lg font-semibold group">
              View Admin Dashboard<ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}