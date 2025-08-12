"use client";

import React from 'react';
import './globals.css';
// import { createPageUrl } from '@/lib/utils'; // <-- Bypassed for now
import { Users, Calendar, BarChart3, Building2, Menu, X, Shield } from "lucide-react";
import { usePathname } from 'next/navigation'; 
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react'; 

interface LayoutProps {
  children: React.ReactNode;
  currentPageName?: string;
}

export default function Layout({ children, currentPageName }: LayoutProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>{currentPageName ? `Power100 Experience | ${currentPageName}` : 'Power100 Experience'}</title>
      </head>
      <body className="min-h-screen bg-power100-bg-grey" suppressHydrationWarning>
      <nav className="bg-black shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-0 group">
              <div className="relative">
                <Image 
                  src="/power100-logo.png" 
                  alt="Power100 Logo" 
                  width={80} 
                  height={80} 
                  className="w-20 h-20 object-contain object-left"
                  style={{ marginTop: '-2px' }}
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Power100</h1>
                <p className="text-white text-xs font-medium opacity-90">Experience</p>
              </div>
            </Link>
            
            <div className="hidden md:flex items-center space-x-6">
              {/* Show admin navigation when in admin section */}
              {pathname.includes('admin') && (
                <>
                  <Link href="/admindashboard" className="flex items-center space-x-2 px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-900 transition-colors">
                    <BarChart3 className="w-4 h-4" />
                    <span className="font-medium">Dashboard</span>
                  </Link>
                  <Link href="/admindashboard/partners" className="flex items-center space-x-2 px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-900 transition-colors">
                    <Users className="w-4 h-4" />
                    <span className="font-medium">Partners</span>
                  </Link>
                  <Link href="/admindashboard/partners-enhanced" className="flex items-center space-x-2 px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-900 transition-colors">
                    <Shield className="w-4 h-4" />
                    <span className="font-medium">Enhanced Partners</span>
                  </Link>
                  <Link href="/admindashboard/bookings" className="flex items-center space-x-2 px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-900 transition-colors">
                    <Calendar className="w-4 h-4" />
                    <span className="font-medium">Bookings</span>
                  </Link>
                </>
              )}
              
              {/* Show main navigation on homepage and non-admin/non-partner-portal pages */}
              {!pathname.includes('partner-portal') && !pathname.includes('admin') && (
                <>
                  <Link href="/contractorflow" className="flex items-center space-x-2 px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-900 transition-colors">
                    <Users className="w-4 h-4" />
                    <span className="font-medium">Start Experience</span>
                  </Link>
                  <Link href="/partner-portal" className="flex items-center space-x-2 px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-900 transition-colors">
                    <Building2 className="w-4 h-4" />
                    <span className="font-medium">Partner Portal</span>
                  </Link>
                  <Link href="/admindashboard" className="flex items-center space-x-2 px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-900 transition-colors">
                    <BarChart3 className="w-4 h-4" />
                    <span className="font-medium">Admin</span>
                  </Link>
                </>
              )}
              
              {/* Mobile menu button */}
              <button
                className="md:hidden p-2 rounded-md text-gray-300 hover:text-white hover:bg-gray-900"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
        
        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-gray-900 border-t border-gray-800">
            <div className="px-4 py-2 space-y-1">
              {pathname.includes('admin') ? (
                <>
                  <Link 
                    href="/admindashboard" 
                    className="flex items-center space-x-2 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>Dashboard</span>
                  </Link>
                  <Link 
                    href="/admindashboard/partners" 
                    className="flex items-center space-x-2 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Users className="w-4 h-4" />
                    <span>Partners</span>
                  </Link>
                  <Link 
                    href="/admindashboard/bookings" 
                    className="flex items-center space-x-2 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Bookings</span>
                  </Link>
                </>
              ) : !pathname.includes('partner-portal') ? (
                <>
                  <Link 
                    href="/contractorflow" 
                    className="flex items-center space-x-2 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Crown className="w-4 h-4" />
                    <span>Start Experience</span>
                  </Link>
                  <Link 
                    href="/partner-portal" 
                    className="flex items-center space-x-2 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Partner Portal</span>
                  </Link>
                  <Link 
                    href="/admindashboard" 
                    className="flex items-center space-x-2 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>Admin</span>
                  </Link>
                </>
              ) : null}
            </div>
          </div>
        )}
      </nav>
      
      <main className="min-h-screen">
        {children}
      </main>
      
      <footer className="bg-[#121212] mt-12">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-3">
              <div className="w-6 h-6 bg-[#FB0401] rounded-md flex items-center justify-center">
                <Crown className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-semibold text-sm">Power100 Experience</span>
            </div>
            <div className="mt-3 pt-3 border-t border-white/20">
              <p className="text-gray-400 text-xs">
                © 2024 Power100. All rights reserved. | 
                <span className="ml-1">concierge@power100.io</span>
              </p>
            </div>
          </div>
        </div>
      </footer>
      </body>
    </html>
  );
}