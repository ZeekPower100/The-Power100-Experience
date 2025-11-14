'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';

// Types
interface Partner {
  id: number;
  company_name: string;
  logo_url: string | null;
  pcr_score: number;
  pcr_movement: number;
  quarter: string;
  year: number;
  focus_areas: string[];
  revenue_tier: string;
  avg_feedback_score: number;
  total_responses: number;
  analysis_snippet: string;
  slug: string;
}

interface RevenueRange {
  value: string;
  label: string;
}

interface FilterOptions {
  focus_areas: string[];
  revenue_ranges: RevenueRange[];
  feedback_tiers: string[];
}

export default function LivePCRsPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    focus_areas: [],
    revenue_ranges: [],
    feedback_tiers: []
  });
  const [fullFilterOptions, setFullFilterOptions] = useState<FilterOptions>({
    focus_areas: [],
    revenue_ranges: [],
    feedback_tiers: []
  });
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'FOCUS' | 'REVENUE' | 'FEEDBACK'>('ALL');
  const [activeFocusArea, setActiveFocusArea] = useState('ALL');
  const [activeRevenue, setActiveRevenue] = useState('ALL');
  const [activeFeedback, setActiveFeedback] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [showMethodologyModal, setShowMethodologyModal] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [currentQuarter, setCurrentQuarter] = useState<string>('');
  const [currentYear, setCurrentYear] = useState<number>(2025);

  // Fetch full filter options only once on mount
  useEffect(() => {
    fetchFullFilterOptions();
  }, []);

  // Fetch filtered partners when filters change
  useEffect(() => {
    fetchLivePCRs();
  }, [activeFocusArea, activeRevenue, activeFeedback]);

  // Fetch full filter options (unfiltered) - only once on mount
  const fetchFullFilterOptions = async () => {
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_BASE_URL}/public/live-pcrs`);
      const data = await response.json();

      if (data.success && data.filters) {
        setFullFilterOptions(data.filters);
      }
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  // Fetch filtered partners based on current filter selections
  const fetchLivePCRs = async () => {
    try {
      setLoading(true);
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

      const params = new URLSearchParams();
      if (activeFocusArea !== 'ALL') params.append('focus_area', activeFocusArea);
      if (activeRevenue !== 'ALL') params.append('revenue_range', activeRevenue);
      if (activeFeedback !== 'ALL') params.append('feedback_min', activeFeedback);

      const response = await fetch(`${API_BASE_URL}/public/live-pcrs?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setPartners(data.partners || []);
        // Set last updated timestamp
        if (data.last_updated) {
          const date = new Date(data.last_updated);
          setLastUpdated(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
        }
        // Get current quarter from first partner (if available)
        if (data.partners && data.partners.length > 0) {
          setCurrentQuarter(data.partners[0].quarter || 'Q4');
          setCurrentYear(data.partners[0].year || 2025);
        }
        // Don't update filter options - keep the full list
      }
    } catch (error) {
      console.error('Error fetching Live PCRs:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-power100-bg-grey">
      {/* Hero Title - Animated like homepage */}
      <div className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-white opacity-50"></div>
        <div className="relative max-w-7xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <h1 className="text-6xl md:text-7xl font-bold mb-6">
              <span className="text-black">Live </span>
              <span className="bg-gradient-to-r from-power100-red via-red-600 to-power100-red bg-clip-text text-transparent">
                PCRs
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto mb-4">
              Real-time PowerConfidence Ratings updated quarterly
            </p>

            {/* Quarter Badge + Last Updated */}
            <div className="flex items-center justify-center gap-3 text-sm text-gray-500">
              <span className="inline-flex items-center px-4 py-2 rounded-full bg-power100-red/10 text-power100-red font-semibold">
                {currentQuarter} {currentYear} Rankings
              </span>
              {lastUpdated && (
                <>
                  <span>•</span>
                  <span>Last Updated: {lastUpdated}</span>
                </>
              )}
            </div>

            {/* Learn More Link */}
            <button
              onClick={() => setShowMethodologyModal(true)}
              className="mt-4 text-sm text-power100-red hover:text-red-700 underline font-medium transition-colors"
            >
              Learn how PowerConfidence Ratings work →
            </button>
          </motion.div>
        </div>
      </div>

      {/* Filter Bar - Clean Single Row with Category Selection */}
      <div className="sticky top-0 z-40 bg-black shadow-xl">
        <div className="max-w-7xl mx-auto">
          {/* Main Category Bar */}
          <div className="flex items-center justify-center border-b-2 border-power100-red">
            <button
              onClick={() => {
                setActiveCategory('ALL');
                setActiveFocusArea('ALL');
                setActiveRevenue('ALL');
                setActiveFeedback('ALL');
              }}
              className={`
                px-8 py-4 font-bold text-sm tracking-wide uppercase
                border-r border-gray-700 transition-all duration-300
                ${activeCategory === 'ALL'
                  ? 'bg-power100-red text-white'
                  : 'text-white hover:bg-gray-900 hover:text-power100-red'
                }
              `}
            >
              ALL
            </button>
            <button
              onClick={() => {
                setActiveCategory('FOCUS');
                // Reset other category filters when switching to Focus
                setActiveRevenue('ALL');
                setActiveFeedback('ALL');
              }}
              className={`
                px-8 py-4 font-bold text-sm tracking-wide uppercase
                border-r border-gray-700 transition-all duration-300
                ${activeCategory === 'FOCUS'
                  ? 'bg-power100-red text-white'
                  : 'text-white hover:bg-gray-900 hover:text-power100-red'
                }
              `}
            >
              FOCUS AREAS
            </button>
            <button
              onClick={() => {
                setActiveCategory('REVENUE');
                // Reset other category filters when switching to Revenue
                setActiveFocusArea('ALL');
                setActiveFeedback('ALL');
              }}
              className={`
                px-8 py-4 font-bold text-sm tracking-wide uppercase
                border-r border-gray-700 transition-all duration-300
                ${activeCategory === 'REVENUE'
                  ? 'bg-power100-red text-white'
                  : 'text-white hover:bg-gray-900 hover:text-power100-red'
                }
              `}
            >
              REVENUE
            </button>
            <button
              onClick={() => {
                setActiveCategory('FEEDBACK');
                // Reset other category filters when switching to Feedback
                setActiveFocusArea('ALL');
                setActiveRevenue('ALL');
              }}
              className={`
                px-8 py-4 font-bold text-sm tracking-wide uppercase
                transition-all duration-300
                ${activeCategory === 'FEEDBACK'
                  ? 'bg-power100-red text-white'
                  : 'text-white hover:bg-gray-900 hover:text-power100-red'
                }
              `}
            >
              FEEDBACK
            </button>
          </div>
        </div>
      </div>

      {/* Subcategory Filter - Appears below main nav when category is selected */}
      {activeCategory !== 'ALL' && (
        <div className="bg-gray-100 border-b border-gray-300">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex flex-wrap gap-3 justify-center">
              {activeCategory === 'FOCUS' && (
                fullFilterOptions.focus_areas.map((area) => (
                  <button
                    key={area}
                    onClick={() => setActiveFocusArea(area)}
                    className={`
                      px-4 py-2 rounded-full font-semibold text-sm transition-all duration-300
                      ${activeFocusArea === area
                        ? 'bg-power100-red text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-200'
                      }
                    `}
                  >
                    {area}
                  </button>
                ))
              )}

              {activeCategory === 'REVENUE' && (
                fullFilterOptions.revenue_ranges.map((range) => (
                  <button
                    key={range.value}
                    onClick={() => setActiveRevenue(range.value)}
                    className={`
                      px-4 py-2 rounded-full font-semibold text-sm transition-all duration-300
                      ${activeRevenue === range.value
                        ? 'bg-power100-red text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-200'
                      }
                    `}
                  >
                    {range.label}
                  </button>
                ))
              )}

              {activeCategory === 'FEEDBACK' && (
                fullFilterOptions.feedback_tiers.map((tier) => (
                  <button
                    key={tier}
                    onClick={() => setActiveFeedback(tier)}
                    className={`
                      px-4 py-2 rounded-full font-semibold text-sm transition-all duration-300
                      ${activeFeedback === tier
                        ? 'bg-power100-red text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-200'
                      }
                    `}
                  >
                    {tier}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Partner Count + Movement Legend */}
      {!loading && partners.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 pt-6 pb-2">
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold text-gray-700">
              Showing <span className="text-power100-red">{partners.length}</span> {partners.length === 1 ? 'partner' : 'partners'}
            </div>

            {/* Movement Legend */}
            <div className="hidden md:flex items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4 text-green-600" />
                Improved
              </span>
              <span className="flex items-center gap-1">
                <Minus className="w-4 h-4 text-gray-500" />
                Stable
              </span>
              <span className="flex items-center gap-1">
                <TrendingDown className="w-4 h-4 text-red-600" />
                Declined
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Partner Cards */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-16 h-16 border-4 border-power100-red border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600">Loading Live PCRs...</p>
          </div>
        ) : partners.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-lg max-w-2xl mx-auto px-8 py-16">
            <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-4xl">🔍</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">No Partners Match These Filters</h3>
            <p className="text-gray-600 mb-6">Try selecting a different option or reset your filters to see all partners</p>
            <button
              onClick={() => {
                setActiveCategory('ALL');
                setActiveFocusArea('ALL');
                setActiveRevenue('ALL');
                setActiveFeedback('ALL');
              }}
              className="px-8 py-3 bg-power100-red text-white rounded-full font-semibold hover:bg-red-700 transition-all duration-300 shadow-lg"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8">
            {partners.map((partner, index) => (
              <motion.div
                key={partner.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 border-2 border-gray-100"
              >
                {/* Header: Logo + Company Name + PCR */}
                <div className="flex flex-col md:flex-row md:items-center gap-6 mb-6">
                  <div className="flex-shrink-0">
                    {partner.logo_url ? (
                      <img
                        src={partner.logo_url}
                        alt={`${partner.company_name} logo`}
                        className="w-24 h-24 object-contain rounded-lg"
                      />
                    ) : (
                      <div className="w-24 h-24 bg-gradient-to-br from-power100-red to-red-600 rounded-lg flex items-center justify-center">
                        <span className="text-white text-3xl font-bold">
                          {partner.company_name.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <h3 className="text-3xl font-bold text-gray-900 mb-3">{partner.company_name}</h3>
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="text-5xl font-bold bg-gradient-to-r from-power100-red to-red-600 bg-clip-text text-transparent">
                        {partner.pcr_score.toFixed(1)}
                      </div>

                      {/* Movement Indicator */}
                      <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold ${
                        partner.pcr_movement > 0
                          ? 'bg-green-100 text-green-700'
                          : partner.pcr_movement < 0
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {partner.pcr_movement > 0 ? (
                          <TrendingUp className="w-5 h-5" />
                        ) : partner.pcr_movement < 0 ? (
                          <TrendingDown className="w-5 h-5" />
                        ) : (
                          <Minus className="w-5 h-5" />
                        )}
                        <span>
                          {partner.pcr_movement > 0 ? '+' : ''}
                          {partner.pcr_movement.toFixed(1)} from {partner.quarter} {partner.year}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Focus Areas Pills */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {partner.focus_areas.map((area, idx) => (
                    <span
                      key={idx}
                      className="bg-red-100 text-power100-red px-4 py-2 rounded-full text-sm font-semibold"
                    >
                      {area}
                    </span>
                  ))}
                </div>

                {/* Stats Bar */}
                <div className="flex flex-wrap gap-6 text-gray-600 mb-6 text-sm md:text-base">
                  <span className="font-medium">Revenue: {partner.revenue_tier}</span>
                  <span className="border-l border-gray-300 pl-6 font-medium">
                    Feedback: {partner.avg_feedback_score}% ({partner.total_responses} responses)
                  </span>
                </div>

                {/* Analysis Paragraph */}
                <p className="text-gray-700 leading-relaxed mb-6">
                  {partner.analysis_snippet}
                </p>

                {/* View Profile CTA */}
                <a
                  href={`/partners/${partner.slug}`}
                  className="inline-flex items-center gap-2 text-power100-red hover:text-red-700 font-semibold transition-colors group"
                >
                  View Full Profile
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </a>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* PCR Methodology Modal */}
      {showMethodologyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold text-gray-900">How PowerConfidence Ratings Work</h2>
                <button
                  onClick={() => setShowMethodologyModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <span className="text-2xl">×</span>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="px-8 py-6 space-y-6">
              {/* Overview */}
              <div>
                <h3 className="text-xl font-bold text-power100-red mb-3">What is a PowerConfidence Rating?</h3>
                <p className="text-gray-700 leading-relaxed">
                  PowerConfidence Ratings (PCRs) are quarterly performance scores that measure partner quality,
                  reliability, and customer satisfaction. Updated every quarter, PCRs provide real-time insights
                  into which partners are delivering exceptional value.
                </p>
              </div>

              {/* How It's Calculated */}
              <div>
                <h3 className="text-xl font-bold text-power100-red mb-3">How PCRs Are Calculated</h3>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-green-600 font-bold">1</span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Customer Feedback Surveys</p>
                      <p className="text-gray-600 text-sm">Direct feedback from contractors who work with partners</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 font-bold">2</span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Service Delivery Metrics</p>
                      <p className="text-gray-600 text-sm">Response times, project completion rates, and support quality</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-purple-600 font-bold">3</span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Quarterly Review Calls</p>
                      <p className="text-gray-600 text-sm">In-depth discussions with customers about their experience</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Movement Indicators */}
              <div>
                <h3 className="text-xl font-bold text-power100-red mb-3">Understanding Movement</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-semibold text-gray-900">Improved (▲)</p>
                      <p className="text-gray-600 text-sm">PCR increased compared to last quarter</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Minus className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="font-semibold text-gray-900">Stable (━)</p>
                      <p className="text-gray-600 text-sm">PCR remained consistent with last quarter</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                    <TrendingDown className="w-5 h-5 text-red-600" />
                    <div>
                      <p className="font-semibold text-gray-900">Declined (▼)</p>
                      <p className="text-gray-600 text-sm">PCR decreased compared to last quarter</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Why It Matters */}
              <div>
                <h3 className="text-xl font-bold text-power100-red mb-3">Why PCRs Matter</h3>
                <p className="text-gray-700 leading-relaxed">
                  PCRs help contractors make informed decisions when selecting partners. Instead of relying solely
                  on marketing materials, you can see real performance data and customer satisfaction trends over time.
                  Partners with consistently high PCRs demonstrate reliability and quality service delivery.
                </p>
              </div>

              {/* CTA */}
              <div className="bg-gray-50 rounded-xl p-6 text-center">
                <p className="text-gray-700 mb-4">
                  Ready to find the right partner for your business?
                </p>
                <button
                  onClick={() => setShowMethodologyModal(false)}
                  className="px-8 py-3 bg-power100-red text-white rounded-full font-semibold hover:bg-red-700 transition-all duration-300 shadow-lg"
                >
                  Explore Partners
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
