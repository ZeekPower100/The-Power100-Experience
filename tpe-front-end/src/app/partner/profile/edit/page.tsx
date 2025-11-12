'use client';

import { useRouter } from 'next/navigation';
import PartnerProfileEditor from '@/components/partner/PartnerProfileEditor';

export default function PartnerProfileEditPage() {
  const router = useRouter();

  const handleClose = () => {
    router.push('/partner/dashboard');
  };

  const handleSave = () => {
    // Redirect back to dashboard after successful save
    router.push('/partner/dashboard');
  };

  return (
    <div className="min-h-screen bg-power100-bg-grey py-8">
      <div className="max-w-6xl mx-auto px-4">
        <PartnerProfileEditor
          onClose={handleClose}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}
