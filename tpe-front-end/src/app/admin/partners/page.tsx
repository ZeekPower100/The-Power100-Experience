"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { partnerApi, authApi } from '@/lib/api';
import { StrategicPartner } from '@/lib/types/strategic_partner';
import { Plus, Edit2, Trash2, AlertTriangle, Building2, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import PartnerForm from '@/components/admin/PartnerForm';

export default function PartnersManagement() {
  const [partners, setPartners] = useState<StrategicPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingPartner, setEditingPartner] = useState<StrategicPartner | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const checkAuthAndLoadData = useCallback(async () => {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        await authApi.getMe();
        setIsAuthenticated(true);
        loadPartners();
      } catch {
        localStorage.removeItem('authToken');
        setIsAuthenticated(false);
        setLoading(false);
      }
    } else {
      setIsAuthenticated(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuthAndLoadData();
  }, [checkAuthAndLoadData]);

  const loadPartners = async () => {
    try {
      setLoading(true);
      setError(null); // Clear previous errors
      const response = await partnerApi.getAll();
      // Parse JSON fields from the database with error handling
      const parsedPartners = (response.partners || []).map((partner: any) => {
        const safeParseJson = (field: any, fallback: any = []) => {
          if (typeof field === 'string') {
            // Check for [object Object] strings
            if (field === '[object Object]') {
              return fallback;
            }
            try {
              return JSON.parse(field);
            } catch (error) {
              return fallback;
            }
          }
          return field || fallback;
        };

        return {
          ...partner,
          focus_areas_served: safeParseJson(partner.focus_areas_served, []),
          target_revenue_range: safeParseJson(partner.target_revenue_range, []),
          geographic_regions: safeParseJson(partner.geographic_regions, []),
          key_differentiators: safeParseJson(partner.key_differentiators, []),
          client_testimonials: safeParseJson(partner.client_testimonials, [])
        };
      });
      
      setPartners(parsedPartners);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load partners');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPartner = () => {
    setEditingPartner(null);
    setShowForm(true);
  };

  const handleEditPartner = (partner: StrategicPartner) => {
    setEditingPartner(partner);
    setShowForm(true);
  };

  const handleDeletePartner = async (partnerId: string) => {
    if (!confirm('Are you sure you want to delete this partner? This action cannot be undone.')) {
      return;
    }

    try {
      await partnerApi.delete(partnerId);
      await loadPartners();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete partner');
    }
  };

  const handleFormSuccess = async () => {
    setEditingPartner(null);
    setShowForm(false);
    // Small delay to ensure state updates
    setTimeout(() => {
      loadPartners();
    }, 100);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingPartner(null);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-power100-bg-grey flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-power100-black">Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-power100-grey mb-4">Please log in to access partner management.</p>
            <Button onClick={() => window.location.href = '/admindashboard'}>
              Go to Admin Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showForm) {
    return (
      <PartnerForm
        partner={editingPartner}
        onSuccess={handleFormSuccess}
        onCancel={handleFormCancel}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-power100-bg-grey p-6">
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-power100-red"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-power100-bg-grey p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-power100-black">Strategic Partners</h1>
            <p className="text-power100-grey mt-2">
              Manage your {partners.length} strategic partners and their profiles
            </p>
          </div>
          <Button
            onClick={handleAddPartner}
            className="bg-power100-red hover:bg-red-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Partner
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Partners Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {partners.map((partner) => (
            <motion.div
              key={partner.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="h-full hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      {partner.logo_url ? (
                        <img 
                          src={partner.logo_url} 
                          alt={`${partner.company_name} logo`}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-power100-bg-grey rounded-lg flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-power100-grey" />
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-lg">{partner.company_name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={partner.is_active ? "default" : "secondary"}>
                            {partner.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          {partner.power_confidence_score > 0 && (
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 text-yellow-500 fill-current" />
                              <span className="text-xs text-power100-grey">
                                {partner.power_confidence_score}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {partner.description && (
                      <p className="text-sm text-power100-grey overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {partner.description}
                      </p>
                    )}

                    {partner.focus_areas_served && partner.focus_areas_served.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-power100-grey mb-1">Focus Areas:</p>
                        <div className="flex flex-wrap gap-1">
                          {partner.focus_areas_served.slice(0, 3).map((area, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {area.replace(/_/g, ' ')}
                            </Badge>
                          ))}
                          {partner.focus_areas_served.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{partner.focus_areas_served.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {partner.target_revenue_range && partner.target_revenue_range.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-power100-grey mb-1">Revenue Range:</p>
                        <div className="flex flex-wrap gap-1">
                          {partner.target_revenue_range.slice(0, 2).map((range, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {range.replace(/_/g, ' ').replace(/k/g, 'K').replace(/m/g, 'M')}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-3 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditPartner(partner)}
                        className="flex-1"
                      >
                        <Edit2 className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeletePartner(partner.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}

          {/* Empty State */}
          {partners.length === 0 && (
            <div className="col-span-full">
              <Card className="text-center py-12">
                <CardContent>
                  <Building2 className="h-16 w-16 text-power100-grey mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-power100-black mb-2">
                    No partners yet
                  </h3>
                  <p className="text-power100-grey mb-6">
                    Add your first strategic partner to get started with the matching system.
                  </p>
                  <Button
                    onClick={handleAddPartner}
                    className="bg-power100-red hover:bg-red-700 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Partner
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}