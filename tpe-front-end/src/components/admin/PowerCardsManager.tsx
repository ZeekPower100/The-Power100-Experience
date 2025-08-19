'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const PowerCardsManager: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-power100-black">Power Cards Management</h1>
          <p className="text-power100-grey mt-2">
            Manage quarterly feedback surveys and PowerConfidence scoring
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Power Cards System</CardTitle>
          <CardDescription>
            Quarterly feedback collection system is ready for testing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-power100-grey">
            The Power Cards feedback loop system has been successfully implemented with:
          </p>
          <ul className="list-disc ml-6 mt-4 space-y-2 text-power100-grey">
            <li>Anonymous survey generation with unique links</li>
            <li>PowerConfidence scoring with weighted algorithms</li>
            <li>Variance tracking for quarterly comparisons</li>
            <li>Integration with partner management system</li>
          </ul>
          
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-2">✅ System Ready for Testing</h3>
            <p className="text-green-700 text-sm">
              Power Cards infrastructure is complete. Test survey links can be generated through the admin interface.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PowerCardsManager;