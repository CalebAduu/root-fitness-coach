"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppleIcon, TargetIcon, TrendingUpIcon } from "../components/icons";

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleGetStarted = () => {
    setIsLoading(true);
    // Navigate to chat onboarding
    router.push("/onboarding");
  };

  return (
    <div className="min-h-screen bg-slate-900 overflow-hidden">
      {/* Navigation */}
      <nav className="bg-slate-900/95 backdrop-blur-md border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <img src="/logo.png" alt="Root Fitness Logo" className="w-12 h-12 object-contain" />
              </div>
              <div className="ml-3">
                <h1 className="text-2xl font-bold text-white">ROOT FITNESS</h1>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-8">
                <a href="#features" className="text-slate-300 hover:text-orange-400 px-3 py-2 text-sm font-medium transition-all duration-200 relative group">
                  Features
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-orange-400 transition-all duration-200 group-hover:w-full"></span>
                </a>
                <a href="#testimonials" className="text-slate-300 hover:text-orange-400 px-3 py-2 text-sm font-medium transition-all duration-200 relative group">
                  Testimonials
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-orange-400 transition-all duration-200 group-hover:w-full"></span>
                </a>
                <a href="#pricing" className="text-slate-300 hover:text-orange-400 px-3 py-2 text-sm font-medium transition-all duration-200 relative group">
                  Pricing
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-orange-400 transition-all duration-200 group-hover:w-full"></span>
                </a>
                <svg className="w-5 h-5 text-slate-300 hover:text-orange-400 cursor-pointer transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - Full Screen Background */}
      <div className="relative h-screen w-full overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img 
            src="/background.png" 
            alt="Inspiring fitness with advanced prosthetics" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40"></div>
        </div>
        
        {/* Content Overlay */}
        <div className="relative z-10 h-full flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="max-w-3xl">
              <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
                Unlock Your Full Potential
              </h1>
              
              <div className="w-24 h-1 bg-orange-400 mb-8"></div>
              
              <h2 className="text-3xl md:text-4xl font-bold text-orange-400 mb-8">
                AI-Powered Fitness Tailored To <em>You</em>
              </h2>
              
              <p className="text-xl text-white mb-12 max-w-2xl leading-relaxed">
                Get personalized workouts, dynamic nutrition plans, and real-time guidance designed to achieve your unique health and strength goals.
              </p>
              
              <button 
                onClick={handleGetStarted}
                disabled={isLoading}
                className="bg-gradient-to-r from-orange-400 to-amber-500 text-white px-12 py-6 rounded-lg font-semibold text-xl hover:from-orange-500 hover:to-amber-600 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3 inline-block"></div>
                    Getting Started...
                  </>
                ) : (
                  "Start Your Free Trial"
                )}
              </button>
              
              <p className="text-white/80 text-lg mt-6">
                No Credit Card Required
              </p>
            </div>
          </div>
        </div>
        
        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10">
          <div className="animate-bounce">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div id="testimonials" className="py-24 bg-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Real People, Real Results</h2>
            <div className="w-24 h-1 bg-orange-400 mx-auto"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="flex items-center mb-4">
                <img 
                  src="https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face" 
                  alt="Jane D." 
                  className="w-16 h-16 rounded-full object-cover mr-4"
                />
                <div>
                  <div className="flex text-orange-400 mb-1">
                    ★★★★★
                  </div>
                  <p className="text-gray-600 text-sm">- Jane D.</p>
                </div>
              </div>
              <p className="text-gray-800 leading-relaxed">
                "This AI coach changed everything. I finally broke through plateaus and feel stronger than ever!"
              </p>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="flex items-center mb-4">
                <img 
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face" 
                  alt="Mark T." 
                  className="w-16 h-16 rounded-full object-cover mr-4"
                />
                <div>
                  <div className="flex text-orange-400 mb-1">
                    ★★★★★
                  </div>
                  <p className="text-gray-600 text-sm">- Mark T.</p>
                </div>
              </div>
              <p className="text-gray-800 leading-relaxed">
                "Lost 30 lbs and built muscle. The personalized plans are amazing and the results speak for themselves."
              </p>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="flex items-center mb-4">
                <img 
                  src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face" 
                  alt="Sarah L." 
                  className="w-16 h-16 rounded-full object-cover mr-4"
                />
                <div>
                  <div className="flex text-orange-400 mb-1">
                    ★★★★★
                  </div>
                  <p className="text-gray-600 text-sm">- Sarah L.</p>
                </div>
              </div>
              <p className="text-gray-800 leading-relaxed">
                "Consistent motivation and spot-on form correction. My fitness journey has reached a whole new level."
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-24 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Why Choose Root?</h2>
            <p className="text-lg text-slate-300 max-w-3xl mx-auto">
              Built by fitness enthusiasts, for fitness enthusiasts. Experience the future of personalized training.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-8 bg-slate-800 rounded-2xl hover:bg-slate-700 transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-orange-500/20">
                <TargetIcon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Personalized Plans</h3>
              <p className="text-slate-300 leading-relaxed">AI-generated workout programs designed specifically for your goals, experience level, and available equipment.</p>
            </div>

            <div className="text-center p-8 bg-slate-800 rounded-2xl hover:bg-slate-700 transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-orange-500/20">
                <TrendingUpIcon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Progressive Training</h3>
              <p className="text-slate-300 leading-relaxed">Smart progression tracking that automatically adjusts your workouts as you get stronger and more experienced.</p>
            </div>

            <div className="text-center p-8 bg-slate-800 rounded-2xl hover:bg-slate-700 transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-orange-500/20">
                <AppleIcon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Nutrition Guidance</h3>
              <p className="text-slate-300 leading-relaxed">Comprehensive nutrition plans that complement your training and help you achieve your fitness goals faster.</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24 bg-slate-800">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-6">Ready to Transform Your Fitness?</h2>
          <p className="text-lg text-slate-300 mb-10 leading-relaxed">
            Join thousands of users who have achieved their fitness goals with Root. 
            Start your personalized journey today.
          </p>
          
          <button 
            onClick={handleGetStarted}
            disabled={isLoading}
            className="bg-gradient-to-r from-orange-400 to-amber-500 text-white px-12 py-4 rounded-lg font-semibold text-xl hover:from-orange-500 hover:to-amber-600 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-2 inline-block"></div>
                Getting Started...
              </>
            ) : (
              "Start Your Free Trial"
            )}
          </button>
          
          <p className="text-slate-400 mt-6 text-sm">
            No Credit Card Required • Start Free • Cancel Anytime
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-6">
                <img src="/logo.png" alt="Root Fitness Logo" className="w-10 h-10 mr-3 object-contain" />
                <span className="text-xl font-bold text-white">ROOT FITNESS</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Your personal AI-powered fitness coach, available 24/7 to help you achieve your health and strength goals.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4 text-white">Programs</h3>
              <ul className="space-y-2">
                <li><a href="#features" className="text-slate-400 hover:text-orange-400 transition-colors duration-200">Strength Training</a></li>
                <li><a href="#" className="text-slate-400 hover:text-orange-400 transition-colors duration-200">Muscle Building</a></li>
                <li><a href="#" className="text-slate-400 hover:text-orange-400 transition-colors duration-200">Weight Loss</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4 text-white">Company</h3>
              <ul className="space-y-2">
                <li><a href="#about" className="text-slate-400 hover:text-orange-400 transition-colors duration-200">About</a></li>
                <li><a href="#testimonials" className="text-slate-400 hover:text-orange-400 transition-colors duration-200">Success Stories</a></li>
                <li><a href="#" className="text-slate-400 hover:text-orange-400 transition-colors duration-200">Careers</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4 text-white">Support</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-slate-400 hover:text-orange-400 transition-colors duration-200">Help Center</a></li>
                <li><a href="#" className="text-slate-400 hover:text-orange-400 transition-colors duration-200">Contact</a></li>
                <li><a href="#" className="text-slate-400 hover:text-orange-400 transition-colors duration-200">Privacy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-800 mt-12 pt-8 text-center">
            <p className="text-slate-400">&copy; 2024 Root Fitness. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}