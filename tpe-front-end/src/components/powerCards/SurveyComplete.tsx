'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { CheckCircle, Heart, Trophy, TrendingUp } from 'lucide-react';

interface SurveyCompleteProps {
  partnerName?: string;
  onClose?: () => void;
}

const SurveyComplete: React.FC<SurveyCompleteProps> = ({ 
  partnerName = 'your partner',
  onClose 
}) => {
  return (
    <div className="min-h-screen bg-power100-bg-grey flex items-center justify-center">
      <div className="w-full max-w-2xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Contractor Flow Style Card */}
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            {/* Green checkmark icon at top center - matching contractor flow */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="flex justify-center mb-6"
            >
              <div className="w-12 h-12 bg-power100-green rounded-full flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
            </motion.div>

            {/* Thank You Message */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-8"
            >
              <h1 className="text-3xl font-bold text-power100-black mb-4">
                Thank You!
              </h1>
              <p className="text-lg text-power100-grey mb-6">
                Your feedback has been successfully submitted and will help improve 
                the experience for contractors working with {partnerName}.
              </p>
            </motion.div>

            {/* Impact Message */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-power100-bg-grey rounded-lg p-6 mb-8"
            >
              <div className="flex items-center justify-center gap-3 mb-4">
                <TrendingUp className="h-6 w-6 text-power100-red" />
                <h3 className="text-xl font-semibold text-power100-black">
                  Your Voice Matters
                </h3>
              </div>
              <p className="text-power100-grey">
                Your feedback directly impacts PowerConfidence scores and helps other 
                contractors make informed decisions about their business partnerships.
              </p>
            </motion.div>

            {/* Features Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="grid md:grid-cols-3 gap-6 mb-8"
            >
              <div className="text-center">
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Trophy className="h-6 w-6 text-blue-600" />
                </div>
                <h4 className="font-semibold text-power100-black mb-2">Anonymous</h4>
                <p className="text-sm text-power100-grey">
                  Your responses are completely anonymous and confidential
                </p>
              </div>
              
              <div className="text-center">
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <h4 className="font-semibold text-power100-black mb-2">Real Impact</h4>
                <p className="text-sm text-power100-grey">
                  Helps improve services and partner performance
                </p>
              </div>
              
              <div className="text-center">
                <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Heart className="h-6 w-6 text-purple-600" />
                </div>
                <h4 className="font-semibold text-power100-black mb-2">Community</h4>
                <p className="text-sm text-power100-grey">
                  Builds a stronger contractor community
                </p>
              </div>
            </motion.div>

            {/* Next Steps */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="border-t border-power100-grey/20 pt-8"
            >
              <h3 className="text-lg font-semibold text-power100-black mb-4">
                What Happens Next?
              </h3>
              <div className="text-left space-y-3 mb-8">
                <div className="flex items-start gap-3">
                  <div className="h-2 w-2 bg-power100-red rounded-full mt-2"></div>
                  <p className="text-power100-grey">
                    Your feedback is aggregated with others to calculate PowerConfidence scores
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-2 w-2 bg-power100-red rounded-full mt-2"></div>
                  <p className="text-power100-grey">
                    Partners receive quarterly reports to improve their services
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-2 w-2 bg-power100-red rounded-full mt-2"></div>
                  <p className="text-power100-grey">
                    Industry insights are shared with the contractor community
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Close Button - Contractor Flow Style */}
            {onClose && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.0 }}
                className="mt-8"
              >
                <Button
                  onClick={onClose}
                  className="w-full bg-power100-green hover:bg-green-600 text-white font-semibold py-3"
                >
                  Close Survey
                </Button>
              </motion.div>
            )}

            {/* Power100 Branding */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1 }}
              className="mt-8 pt-6 border-t border-power100-grey/20"
            >
              <p className="text-sm text-power100-grey">
                Powered by{' '}
                <span className="font-semibold text-power100-red">Power100 Experience</span>
                {' '}• Building stronger contractor partnerships
              </p>
            </motion.div>

          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SurveyComplete;