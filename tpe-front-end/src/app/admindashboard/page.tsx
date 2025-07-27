
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Contractor } from "@/entities/Contractor";
import { StrategicPartner } from "@/entities/StrategicPartner";
import { DemoBooking } from "@/entities/DemoBooking";
import { 
  Users, 
  Handshake, 
  Calendar, 
  TrendingUp, 
  Star,
  Clock,
  CheckCircle,
  ArrowRight,
  BarChart3,
  Target
} from "lucide-react";
import { motion } from "framer-motion";

export default function AdminDashboard() {
  const [contractors, setContractors] = useState([]);
  const [partners, setPartners] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [contractorsData, partnersData, bookingsData] = await Promise.all([
        Contractor.list("-created_date"),
        StrategicPartner.list("-created_date"),
        DemoBooking.list("-created_date")
      ]);
      
      setContractors(contractorsData);
      setPartners(partnersData);
      setBookings(bookingsData);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStageCount = (stage) => {
    return contractors.filter(c => c.current_stage === stage).length;
  };

  const getCompletionRate = () => {
    if (contractors.length === 0) return 0;
    return Math.round((getStageCount('completed') / contractors.length) * 100);
  };

  const getRecentContractors = () => {
    return contractors.slice(0, 5);
  };

  const getPendingBookings = () => {
    return bookings.filter(b => b.status === 'scheduled').length;
  };

  const statsCards = [
    {
      title: "Total Contractors",
      value: contractors.length,
      icon: Users,
      color: "bg-gray-700",
      description: `${getStageCount('completed')} completed the experience`
    },
    {
      title: "Active Partners", 
      value: partners.filter(p => p.is_active).length,
      icon: Handshake,
      color: "bg-[var(--power100-red)]", 
      description: `Avg confidence: ${Math.round(partners.reduce((sum, p) => sum + (p.power_confidence_score || 0), 0) / (partners.length || 1))}`
    },
    {
      title: "Demo Bookings",
      value: bookings.length,
      icon: Calendar,
      color: "bg-gray-700",
      description: `${getPendingBookings()} pending this week`
    },
    {
      title: "Completion Rate",
      value: `${getCompletionRate()}%`,
      icon: TrendingUp,
      color: "bg-[var(--power100-green)]",
      description: "Contractors who completed full flow"
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 power100-red-gradient rounded-xl flex items-center justify-center mx-auto mb-4"
          >
            <BarChart3 className="w-6 h-6 text-white" />
          </motion.div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--power100-bg-grey)] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-black mb-2">Admin Dashboard</h1>
              <p className="text-lg text-[var(--power100-grey)]">Power100 Experience Analytics & Management</p>
            </div>
            <div className="flex gap-3">
              <Link to={createPageUrl("ManagePartners")}>
                <Button variant="outline" className="h-11">
                  <Handshake className="w-4 h-4 mr-2" />
                  Manage Partners
                </Button>
              </Link>
              <Link to={createPageUrl("ManageBookings")}>
                <Button variant="outline" className="h-11">
                  <Calendar className="w-4 h-4 mr-2" />
                  View Bookings
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-6 mb-8">
          {statsCards.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="bg-white/70 border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center shadow-lg`}>
                      <stat.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-black">{stat.value}</div>
                      <div className="text-sm font-medium text-gray-500">{stat.title}</div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{stat.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Contractors */}
          <div className="lg:col-span-2">
            <Card className="bg-white/70 border-0 shadow-lg">
              <CardHeader className="border-b border-gray-100">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Users className="w-5 h-5 text-gray-600" />
                    <span>Recent Contractors</span>
                  </div>
                  <Badge variant="outline">{contractors.length} total</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100">
                  {getRecentContractors().map((contractor) => (
                    <div key={contractor.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                              <span className="text-gray-700 font-semibold text-sm">
                                {contractor.name ? contractor.name[0].toUpperCase() : 'C'}
                              </span>
                            </div>
                            <div>
                              <h4 className="font-semibold text-black">{contractor.name}</h4>
                              <p className="text-sm text-gray-600">{contractor.company_name}</p>
                            </div>
                          </div>
                          <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                            <span>{contractor.service_area}</span>
                            <span>•</span>
                            <span>{contractor.annual_revenue?.replace(/_/g, ' ')}</span>
                            {contractor.focus_areas && contractor.focus_areas.length > 0 && (
                              <>
                                <span>•</span>
                                <span>{contractor.focus_areas.length} focus areas</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge 
                            variant={contractor.current_stage === 'completed' ? 'default' : 'secondary'}
                            className={contractor.current_stage === 'completed' ? 'bg-green-100 text-green-800' : ''}
                          >
                            {contractor.current_stage?.replace(/_/g, ' ')}
                          </Badge>
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(contractor.created_date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {contractors.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No contractors have started the experience yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats & Actions */}
          <div className="space-y-6">
            {/* Pipeline Stats */}
            <Card className="bg-white/70 border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5 text-gray-600" />
                  <span>Pipeline Progress</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { stage: 'verification', label: 'Verification', icon: Clock },
                  { stage: 'focus_selection', label: 'Focus Areas', icon: Target },
                  { stage: 'profiling', label: 'Profiling', icon: Users },
                  { stage: 'matching', label: 'Matching', icon: Star },
                  { stage: 'completed', label: 'Completed', icon: CheckCircle }
                ].map((item) => {
                  const count = getStageCount(item.stage);
                  const percentage = contractors.length > 0 ? (count / contractors.length) * 100 : 0;
                  
                  return (
                    <div key={item.stage} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <item.icon className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-700">{item.label}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full power100-red-gradient rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-black w-8 text-right">{count}</span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Top Partners */}
            <Card className="bg-white/70 border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Star className="w-5 h-5 text-[var(--power100-red)]" />
                  <span>Top Partners</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {partners
                    .sort((a, b) => (b.power_confidence_score || 0) - (a.power_confidence_score || 0))
                    .slice(0, 3)
                    .map((partner) => (
                      <div key={partner.id} className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-black text-sm">{partner.company_name}</h4>
                          <p className="text-xs text-gray-500">
                            {partner.focus_areas_served?.length || 0} focus areas
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center space-x-1">
                            <Star className="w-3 h-3 text-[var(--power100-red)] fill-current" />
                            <span className="text-sm font-semibold text-[var(--power100-red)]">
                              {partner.power_confidence_score || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
                {partners.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">No partners added yet</p>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-white/70 border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link to={createPageUrl("ManagePartners")} className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <Handshake className="w-4 h-4 mr-2" />
                    Add New Partner
                  </Button>
                </Link>
                <Link to={createPageUrl("Welcome")} className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Test Contractor Flow
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
