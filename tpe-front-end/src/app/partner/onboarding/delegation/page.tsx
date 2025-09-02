'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, Users, Send, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { getApiUrl } from '@/utils/api';

interface TeamMember {
  name: string;
  email: string;
  title: string;
}

export default function DelegationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedMember, setSelectedMember] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [partnerId, setPartnerId] = useState('');

  useEffect(() => {
    // Load saved form data and extract team members from Step 2
    const savedData = localStorage.getItem('partner_application_data');
    const savedPartnerId = localStorage.getItem('partner_application_id');
    
    if (savedData) {
      const formData = JSON.parse(savedData);
      setCompanyName(formData.company_name || '');
      
      // Extract team members from Step 2 contacts
      const members: TeamMember[] = [];
      
      // Add CEO if available
      if (formData.ceo_name && formData.ceo_email) {
        members.push({
          name: formData.ceo_name,
          email: formData.ceo_email,
          title: formData.ceo_title || 'CEO'
        });
      }
      
      // Add CX Contact
      if (formData.cx_name && formData.cx_email) {
        members.push({
          name: formData.cx_name,
          email: formData.cx_email,
          title: formData.cx_title || 'Customer Experience'
        });
      }
      
      // Add Sales Contact
      if (formData.sales_name && formData.sales_email) {
        members.push({
          name: formData.sales_name,
          email: formData.sales_email,
          title: formData.sales_title || 'Sales'
        });
      }
      
      // Add Onboarding Contact
      if (formData.onboarding_name && formData.onboarding_email) {
        members.push({
          name: formData.onboarding_name,
          email: formData.onboarding_email,
          title: formData.onboarding_title || 'Onboarding'
        });
      }
      
      // Add Marketing Contact
      if (formData.marketing_name && formData.marketing_email) {
        members.push({
          name: formData.marketing_name,
          email: formData.marketing_email,
          title: formData.marketing_title || 'Marketing'
        });
      }
      
      setTeamMembers(members);
    }
    
    if (savedPartnerId) {
      setPartnerId(savedPartnerId);
    }
  }, []);

  const handleContinueToPreOnboarding = () => {
    // Ensure form data is preserved and navigate to Step 8
    const savedData = localStorage.getItem('partner_application_data');
    const savedPartnerId = localStorage.getItem('partner_application_id');
    
    if (!savedData || !savedPartnerId) {
      // If no saved data, we need to alert the user
      alert('Session data not found. Please start the partner profile process again.');
      router.push('/partner/onboarding');
      return;
    }
    
    // Navigate to onboarding form at Step 8
    router.push('/partner/onboarding?step=8');
  };

  const handleDelegatePreOnboarding = async () => {
    if (!selectedMember) {
      alert('Please select a team member to delegate to');
      return;
    }

    setLoading(true);
    try {
      // Find the selected team member
      const member = teamMembers.find(m => m.email === selectedMember);
      
      if (!member) {
        throw new Error('Selected team member not found');
      }

      // Send delegation email (this would be an API call in production)
      const response = await fetch(getApiUrl('api/partners/delegate-portfolio'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnerId: partnerId,
          delegateTo: member,
          companyName: companyName
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send delegation email');
      }

      // Clear local storage
      localStorage.removeItem('partner_application_data');
      localStorage.removeItem('partner_application_id');

      // Redirect to success page with delegation confirmation
      router.push('/partner/onboarding/success?delegated=true');
      
    } catch (error) {
      console.error('Delegation error:', error);
      alert('Failed to delegate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-power100-bg-grey flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <Card className="bg-white shadow-lg border-0">
          <CardContent className="p-8">
            {/* Success Icon */}
            <div className="flex justify-center mb-8">
              <div className="w-20 h-20 bg-power100-green rounded-full flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-white" />
              </div>
            </div>

            {/* Success Message */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-power100-black mb-4">
                Partner Profile Created Successfully!
              </h2>
              <p className="text-lg text-power100-grey mb-2">
                {companyName ? `${companyName}'s` : 'Your'} partner profile has been created and is pending review.
              </p>
              <p className="text-power100-grey">
                To complete your PowerConfidence ranking, we need pre-onboarding information including client demos and references.
              </p>
            </div>

            {/* Delegation Options */}
            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <h3 className="text-xl font-semibold text-power100-black mb-4">
                Complete Your Pre-onboarding
              </h3>
              
              <p className="text-power100-grey mb-6">
                The pre-onboarding section requires uploading client demos and gathering references from both clients and employees. 
                This information is essential for calculating your PowerConfidence ranking.
              </p>

              <div className="space-y-6">
                {/* Option 1: Complete Now */}
                <div className="border-2 border-gray-200 rounded-lg p-4 hover:border-power100-green transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-power100-green rounded-full flex items-center justify-center flex-shrink-0">
                      <ArrowRight className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-power100-black mb-2">
                        Complete Pre-onboarding Now
                      </h4>
                      <p className="text-sm text-power100-grey mb-3">
                        Continue to Step 8 to upload demos and provide references yourself.
                      </p>
                      <Button
                        onClick={handleContinueToPreOnboarding}
                        className="bg-power100-green hover:bg-green-700 text-white"
                        disabled={loading}
                      >
                        Complete Pre-onboarding
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Option 2: Delegate */}
                <div className="border-2 border-gray-200 rounded-lg p-4 hover:border-power100-red transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-power100-red rounded-full flex items-center justify-center flex-shrink-0">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-power100-black mb-2">
                        Delegate to Team Member
                      </h4>
                      <p className="text-sm text-power100-grey mb-3">
                        Send the pre-onboarding section to a team member who can gather demos and references.
                      </p>
                      
                      {teamMembers.length > 0 ? (
                        <div className="space-y-3">
                          <div>
                            <Label htmlFor="delegate">Select Team Member</Label>
                            <Select value={selectedMember} onValueChange={setSelectedMember}>
                              <SelectTrigger id="delegate" className="w-full">
                                <SelectValue placeholder="Choose a team member" />
                              </SelectTrigger>
                              <SelectContent>
                                {teamMembers.map((member) => (
                                  <SelectItem key={member.email} value={member.email}>
                                    {member.name} - {member.title}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <Button
                            onClick={handleDelegatePreOnboarding}
                            className="bg-power100-red hover:bg-red-700 text-white"
                            disabled={loading || !selectedMember}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            {loading ? 'Sending...' : 'Delegate Pre-onboarding'}
                          </Button>
                        </div>
                      ) : (
                        <p className="text-sm text-yellow-600">
                          No team members found. Please complete the pre-onboarding yourself.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> The pre-onboarding section includes:
              </p>
              <ul className="text-sm text-yellow-800 mt-2 space-y-1 ml-4">
                <li>• Company logo upload</li>
                <li>• At least 5 client demo videos or links</li>
                <li>• At least 5 client references for PowerCard evaluations</li>
                <li>• At least 5 employee references for culture assessment</li>
              </ul>
              <p className="text-sm text-yellow-800 mt-2">
                This information is crucial for your PowerConfidence ranking and partner matching effectiveness.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}