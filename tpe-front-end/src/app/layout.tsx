"use client";

import React from 'react';
import './globals.css';
// import { createPageUrl } from '@/lib/utils'; // <-- Bypassed for now
import { Crown, Users, Calendar, BarChart3 } from "lucide-react";
import { usePathname } from 'next/navigation'; 
import Link from 'next/link'; 

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const pathname = usePathname();
  
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>Power100 Experience</title>
      </head>
      <body className="min-h-screen bg-power100-bg-grey" suppressHydrationWarning>
      <nav className="bg-black shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="relative">
                <div className="w-10 h-10 bg-[#FB0401] rounded-md flex items-center justify-center">
                  <Crown className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Power100</h1>
                <p className="text-white text-xs font-medium opacity-90">Experience</p>
              </div>
            </Link>
            
            {pathname.includes('admin') && (
              <div className="hidden md:flex items-center space-x-8">
                <Link href="/admindashboard" className="flex items-center space-x-2 px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-900 transition-colors">
                  <BarChart3 className="w-4 h-4" />
                  <span className="font-medium">Dashboard</span>
                </Link>
                <Link href="/admindashboard/partners" className="flex items-center space-x-2 px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-900 transition-colors">
                  <Users className="w-4 h-4" />
                  <span className="font-medium">Partners</span>
                </Link>
                <Link href="/admindashboard/bookings" className="flex items-center space-x-2 px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-900 transition-colors">
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium">Bookings</span>
                </Link>
              </div>
            )}
          </div>
        </div>
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