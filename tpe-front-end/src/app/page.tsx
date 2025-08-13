"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button"; // Assuming this is from a component library like shadcn/ui
import { Card, CardContent } from "@/components/ui/card"; // Assuming this is from a component library like shadcn/ui
import { ArrowRight, Shield, Target, Users, Zap } from "lucide-react";
import { motion } from "framer-motion";
import Image from 'next/image';

export default function HomePage() {
  const router = useRouter();

  const benefits = [
    {
      icon: Target,
      title: "Precision Matching",
      description: "AI-powered algorithm pairs you with partners based on your specific business goals and revenue tier"
    },
    {
      icon: Shield,
      title: "Verified Trust",
      description: "All partners are ranked using our PowerConfidence Score built from real client feedback"
    },
    {
      icon: Zap,
      title: "Accelerated Growth", 
      description: "Get connected to solutions that contractors like you are already using to scale successfully"
    },
    {
      icon: Users,
      title: "Ongoing Support",
      description: "Access to dedicated AI concierge for continued guidance and optimization"
    }
  ];

  return (
    // The main container now uses theme colors for its default background
    <div className="min-h-screen bg-power100-bg-grey"> 
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-power100-white">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-50 opacity-5"></div>
        
        <div className="relative max-w-7xl mx-auto px-6 py-20">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="mb-8"
            >
              <div className="inline-flex items-center space-x-2 bg-power100-white px-6 py-3 rounded-full border border-gray-200 mb-6">
                <Image 
                  src="/power100-logo.png" 
                  alt="Power100 Logo" 
                  width={40} 
                  height={40} 
                  className="w-10 h-10 object-contain"
                />
                <span className="text-power100-grey font-semibold text-sm">The Power100 Experience</span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold text-power100-black mb-6 leading-tight">
                Your Personal 
                <span className="text-power100-red"> Concierge</span>
                <br />
                to Business Growth
              </h1>
              
              <p className="text-xl text-power100-grey mb-8 leading-relaxed max-w-3xl mx-auto">
                Connect with the most trusted strategic partners in home improvement. 
                Our AI-driven platform matches you with solutions that contractors like you 
                are already using to scale successfully.
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <Button
                onClick={() => router.push("/experience")}
                size="lg"
                className="bg-power100-green hover:brightness-90 transition-all duration-300 text-power100-white px-12 py-3 text-lg font-semibold rounded-lg group"
              >
                Start Your Experience
                <ArrowRight className="w-5 h-5 ml-2 group-hover-translate-x-1 transition-transform" />
              </Button>
              <p className="text-sm text-gray-500 mt-4">Takes only 5 minutes • No cost • Immediate results</p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="py-20 bg-power100-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-power100-black mb-6">
              Why Contractors Choose{' '}
              <span className="text-power100-red">Power100</span>
            </h2>
            <p className="text-lg text-power100-grey max-w-2xl mx-auto">
              Join thousands of contractors who have found their perfect growth partners through our platform
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="bg-power100-white hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 border h-full rounded-lg">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-power100-red rounded-lg flex items-center justify-center mx-auto mb-4">
                      <benefit.icon className="w-6 h-6 text-power100-white" />
                    </div>
                    <h3 className="text-lg font-bold text-power100-black mb-2">{benefit.title}</h3>
                    <p className="text-power100-grey text-sm leading-relaxed">{benefit.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16 bg-power100-black">
        <div className="max-w-4xl mx-auto text-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl font-bold text-power100-white mb-4">
              Ready to Find Your Perfect Partner?
            </h2>
            <p className="text-lg text-gray-300 mb-8 leading-relaxed">
              Our AI concierge guides you through a personalized experience to identify your business
              goals and connect you with the ideal strategic partner.
            </p>
            <Button
              onClick={() => router.push("/experience")}
              size="lg"
              className="bg-power100-green hover:brightness-90 transition-all duration-300 text-power100-white px-8 py-3 text-base font-semibold rounded-lg group"
            >
              Begin Your Journey
              <ArrowRight className="w-4 h-4 ml-2 group-hover-translate-x-1 transition-transform" />
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Admin Access */}
      <div className="bg-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <Button
            onClick={() => router.push("/admindashboard")}
            variant="outline"
            className="text-gray-600 hover:text-power100-black"
          >
            Admin Dashboard Access
          </Button>
        </div>
      </div>
    </div>
  );
}