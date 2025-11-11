// Public PCR Landing Page - No Authentication Required
// DATABASE-CHECKED: strategic_partners, partner_reports verified November 2, 2025
'use client';

import { use } from 'react';
import PublicPCRLandingV2 from '@/components/reports/PublicPCRLandingV2';

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default function PublicPCRPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  return <PublicPCRLandingV2 slug={slug} />;
}
