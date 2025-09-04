"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleGetStarted = () => {
    setIsLoading(true);
    // Navigate to chat onboarding
    router.push("/onboarding");
  };

  return (
    <div className="min-h-screen bg-gray-900 overflow-hidden">
      {/* Navigation */}
      <nav className="bg-gray-900/95 backdrop-blur-md border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <img src="/logo.png" alt="Root Fitness Logo" className="w-10 h-10" />
              </div>
                              <div className="ml-3">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">ROOT FITNESS</h1>
                </div>
              </div>
              <div className="hidden md:block">
                <div className="ml-10 flex items-baseline space-x-4">
                  <a href="#features" className="text-gray-300 hover:text-blue-400 px-3 py-2 rounded-md text-sm font-bold transition-all duration-200 hover:scale-105">FEATURES</a>
                  <a href="#about" className="text-gray-300 hover:text-blue-400 px-3 py-2 rounded-md text-sm font-bold transition-all duration-200 hover:scale-105">ABOUT</a>
                  <a href="#contact" className="text-gray-300 hover:text-blue-400 px-3 py-2 rounded-md text-sm font-bold transition-all duration-200 hover:scale-105">CONTACT</a>
                </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          <img 
            src="/background.png" 
            alt="Gym Background" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/60"></div>
        </div>
        
        {/* Background gym elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-96 h-96 bg-blue-500/20 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
          <div className="absolute top-40 right-20 w-80 h-80 bg-purple-500/20 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
          <div className="absolute bottom-20 left-20 w-72 h-72 bg-blue-400/20 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{animationDelay: '4s'}}></div>
          
          {/* Gym equipment silhouettes */}
          <div className="absolute top-32 right-32 text-white/20 text-9xl animate-pulse">🏋️‍♂️</div>
          <div className="absolute bottom-32 left-32 text-white/20 text-8xl animate-pulse" style={{animationDelay: '1s'}}>💪</div>
          <div className="absolute top-1/2 left-1/4 text-white/20 text-7xl animate-pulse" style={{animationDelay: '3s'}}>🏃‍♂️</div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left Column - Content */}
            <div className="text-center lg:text-left relative z-10">
              <div className="inline-flex items-center justify-center w-28 h-28 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-8 shadow-2xl transform hover:scale-110 transition-all duration-300 border-4 border-blue-300">
                <img src="/logo.png" alt="Root Fitness Logo" className="w-16 h-16" />
              </div>
              
              <div className="mb-6">
                <span className="inline-flex items-center px-6 py-3 rounded-full text-sm font-bold bg-blue-500 text-white mb-4 shadow-lg">
                  🚀 AI-POWERED GYM REVOLUTION
                </span>
              </div>
              
              <h1 className="text-6xl md:text-7xl font-black text-white mb-6 leading-tight">
                LIFT HEAVIER
                <span className="block bg-gradient-to-r from-blue-400 via-purple-500 to-blue-400 bg-clip-text text-transparent animate-pulse">
                  GET STRONGER
                </span>
              </h1>
              
              <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Transform your body with AI-powered workout plans designed by elite trainers. 
                Get personalized strength training, muscle building routines, and nutrition guidance 
                that adapts to your progress in real-time.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-6 justify-center lg:justify-start">
                <button 
                  onClick={handleGetStarted}
                  disabled={isLoading}
                  className="group relative px-12 py-6 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 text-white rounded-2xl font-black text-xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden border-2 border-blue-300"
                >
                  <span className="relative z-10 flex items-center">
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                        GETTING STARTED...
                      </>
                    ) : (
                      <>
                        💪 START LIFTING NOW
                        <svg className="ml-3 w-6 h-6 group-hover:translate-x-2 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </>
                    )}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </button>
                
                <button className="px-12 py-6 border-2 border-blue-500 text-blue-400 rounded-2xl font-black text-xl hover:bg-blue-500 hover:text-white transition-all duration-300 transform hover:scale-105 group">
                  <span className="flex items-center">
                    📚 VIEW WORKOUTS
                    <svg className="ml-3 w-6 h-6 group-hover:rotate-12 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </span>
                </button>
              </div>
              
              {/* Gym stats */}
              <div className="mt-12 flex items-center justify-center lg:justify-start space-x-8">
                <div className="text-center">
                  <div className="text-3xl font-black text-blue-400">15K+</div>
                  <div className="text-sm text-gray-400 font-bold">ACTIVE LIFTERS</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-black text-purple-400">98%</div>
                  <div className="text-sm text-gray-400 font-bold">STRENGTH GAINS</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-black text-blue-400">24/7</div>
                  <div className="text-sm text-gray-400 font-bold">AI COACHING</div>
                </div>
              </div>
            </div>

            {/* Right Column - Gym Visual */}
            <div className="relative">
              <div className="relative z-10">
                <div className="bg-gray-800/80 backdrop-blur-sm rounded-3xl p-12 shadow-2xl border border-blue-500/20 transform hover:scale-105 transition-all duration-500">
                  <div className="text-center">
                    <div className="w-44 h-44 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-400 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl animate-pulse border-4 border-blue-300">
                      <span className="text-9xl">🏋️‍♂️</span>
                    </div>
                    <h3 className="text-3xl font-black text-white mb-4">ELITE TRAINING AI</h3>
                    <p className="text-gray-300 text-lg mb-6">Your personal strength coach</p>
                    
                    {/* Gym features */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <span className="w-3 h-3 bg-blue-400 rounded-full"></span>
                        <span className="text-gray-300 font-bold">Progressive Overload</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
                        <span className="text-gray-300 font-bold">Form Correction</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="w-3 h-3 bg-blue-400 rounded-full"></span>
                        <span className="text-gray-300 font-bold">Muscle Targeting</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
                        <span className="text-gray-300 font-bold">Recovery Tracking</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating gym elements */}
              <div className="absolute -top-6 -right-6 w-32 h-32 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full opacity-60 animate-bounce"></div>
              <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-gradient-to-r from-purple-500 to-blue-400 rounded-full opacity-60 animate-bounce" style={{animationDelay: '1s'}}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-32 bg-gray-800 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-black text-white mb-6">WHY CHOOSE ROOT?</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Built by lifters, for lifters. Experience the future of strength training with AI-powered personalization.
            </p>
          </div>
          
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="group text-center p-10 rounded-3xl bg-gradient-to-br from-gray-700 to-gray-800 border border-blue-500/20 hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-4 hover:scale-105 hover:border-blue-400/40">
                <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg border-2 border-blue-300">
                  <span className="text-5xl">🎯</span>
                </div>
                <h3 className="text-2xl font-black text-white mb-4">BUILD MASS</h3>
                <p className="text-gray-300 text-lg leading-relaxed">AI-generated hypertrophy programs designed to maximize muscle growth. Every set, rep, and rest period is optimized for your body type and goals.</p>
              </div>
              
              <div className="group text-center p-10 rounded-3xl bg-gradient-to-br from-gray-700 to-gray-800 border border-purple-500/20 hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-4 hover:scale-105 hover:border-purple-400/40">
                <div className="w-24 h-24 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg border-2 border-purple-300">
                  <span className="text-5xl">💪</span>
                </div>
                <h3 className="text-2xl font-black text-white mb-4">GAIN STRENGTH</h3>
                <p className="text-gray-300 text-lg leading-relaxed">Progressive overload programs that continuously challenge your limits. Our AI tracks your progress and adjusts weights automatically for maximum strength gains.</p>
              </div>
              
              <div className="group text-center p-10 rounded-3xl bg-gradient-to-br from-gray-700 to-gray-800 border border-blue-500/20 hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-4 hover:scale-105 hover:border-blue-400/40">
                <div className="w-24 h-24 bg-gradient-to-r from-blue-400 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg border-2 border-blue-300">
                  <span className="text-5xl">⚡</span>
                </div>
                <h3 className="text-2xl font-black text-white mb-4">OPTIMIZE RECOVERY</h3>
                <p className="text-gray-300 text-lg leading-relaxed">Smart recovery tracking and nutrition guidance. Get personalized recommendations for rest days, stretching, and supplements to maximize your gains.</p>
              </div>
            </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-32 bg-gradient-to-br from-gray-900 to-black relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-black text-white mb-6">YOUR JOURNEY TO STRENGTH</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              From beginner to beast in three simple steps
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center group">
              <div className="relative">
                <div className="w-28 h-28 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6 text-white text-4xl font-black shadow-2xl group-hover:scale-110 transition-transform duration-300 border-4 border-orange-300">
                  1
                </div>
                <div className="absolute -top-2 -right-2 w-10 h-10 bg-orange-400 rounded-full flex items-center justify-center text-white text-sm font-black animate-pulse">
                  🏋️‍♂️
                </div>
              </div>
              <h3 className="text-2xl font-black text-white mb-4">TELL US YOUR GOALS</h3>
              <p className="text-gray-300 text-lg leading-relaxed">Share your current strength, goals, and available equipment. Our AI analyzes your profile to create the perfect program.</p>
            </div>
            
            <div className="text-center group">
              <div className="relative">
                <div className="w-28 h-28 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 text-white text-4xl font-black shadow-2xl group-hover:scale-110 transition-transform duration-300 border-4 border-red-300">
                  2
                </div>
                <div className="absolute -top-2 -right-2 w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white text-sm font-black animate-pulse" style={{animationDelay: '1s'}}>
                  🚀
                </div>
              </div>
              <h3 className="text-2xl font-black text-white mb-4">GET YOUR PROGRAM</h3>
              <p className="text-gray-300 text-lg leading-relaxed">Receive a personalized workout plan with exercises, sets, reps, and progression schemes tailored to your goals.</p>
            </div>
            
            <div className="text-center group">
              <div className="relative">
                <div className="w-28 h-28 bg-gradient-to-r from-orange-400 to-red-500 rounded-full flex items-center justify-center mx-auto mb-6 text-white text-4xl font-black shadow-2xl group-hover:scale-110 transition-transform duration-300 border-4 border-orange-300">
                  3
                </div>
                <div className="absolute -top-2 -right-2 w-10 h-10 bg-orange-400 rounded-full flex items-center justify-center text-white text-sm font-black animate-pulse" style={{animationDelay: '2s'}}>
                  💪
                </div>
              </div>
              <h3 className="text-2xl font-black text-white mb-4">LIFT & PROGRESS</h3>
              <p className="text-gray-300 text-lg leading-relaxed">Follow your program, track your progress, and watch your AI coach adapt your plan as you get stronger.</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-32 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-500 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-blue-500/20"></div>
          <div className="absolute top-20 left-20 w-96 h-96 bg-white/10 rounded-full filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-white/10 rounded-full filter blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        </div>
        
        <div className="relative max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-5xl font-black text-white mb-6">READY TO GET STRONG?</h2>
          <p className="text-xl text-blue-100 mb-10 leading-relaxed">
            Join thousands of lifters who have transformed their bodies with Root. 
            Start your strength journey today and become the strongest version of yourself.
          </p>
          
          <button 
            onClick={handleGetStarted}
            disabled={isLoading}
            className="group relative px-14 py-8 bg-white text-blue-600 rounded-2xl font-black text-2xl hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden border-4 border-blue-300"
          >
            <span className="relative z-10 flex items-center">
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600 mr-3"></div>
                  GETTING STARTED...
                </>
              ) : (
                <>
                  🏋️‍♂️ START LIFTING TODAY
                  <svg className="ml-3 w-7 h-7 group-hover:translate-x-2 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </span>
          </button>
          
          <p className="text-blue-200 mt-6 text-sm font-bold">
            ✨ NO CREDIT CARD REQUIRED • START FREE • CANCEL ANYTIME
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div>
              <div className="flex items-center mb-6">
                <img src="/logo.png" alt="Root Fitness Logo" className="w-10 h-10 mr-3" />
                <span className="text-2xl font-black bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">ROOT FITNESS</span>
              </div>
              <p className="text-gray-400 text-lg leading-relaxed">
                Your personal AI-powered strength coach, available 24/7 to help you build muscle, 
                gain strength, and transform your body. Built by lifters, for lifters.
              </p>
            </div>
            
            <div>
              <h3 className="text-xl font-black mb-6 text-white">PROGRAMS</h3>
              <ul className="space-y-3">
                <li><a href="#features" className="text-gray-400 hover:text-blue-400 transition-colors duration-200 hover:translate-x-1 inline-block font-bold">Strength Training</a></li>
                <li><a href="#" className="text-gray-400 hover:text-blue-400 transition-colors duration-200 hover:translate-x-1 inline-block font-bold">Muscle Building</a></li>
                <li><a href="#" className="text-gray-400 hover:text-blue-400 transition-colors duration-200 hover:translate-x-1 inline-block font-bold">Powerlifting</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-xl font-black mb-6 text-white">COMPANY</h3>
              <ul className="space-y-3">
                <li><a href="#about" className="text-gray-400 hover:text-blue-400 transition-colors duration-200 hover:translate-x-1 inline-block font-bold">About</a></li>
                <li><a href="#" className="text-gray-400 hover:text-blue-400 transition-colors duration-200 hover:translate-x-1 inline-block font-bold">Success Stories</a></li>
                <li><a href="#" className="text-gray-400 hover:text-blue-400 transition-colors duration-200 hover:translate-x-1 inline-block font-bold">Careers</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-xl font-black mb-6 text-white">SUPPORT</h3>
              <ul className="space-y-3">
                <li><a href="#contact" className="text-gray-400 hover:text-blue-400 transition-colors duration-200 hover:translate-x-1 inline-block font-bold">Help Center</a></li>
                <li><a href="#" className="text-gray-400 hover:text-blue-400 transition-colors duration-200 hover:translate-x-1 inline-block font-bold">Contact</a></li>
                <li><a href="#" className="text-gray-400 hover:text-blue-400 transition-colors duration-200 hover:translate-x-1 inline-block font-bold">Privacy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-16 pt-8 text-center">
            <p className="text-gray-400 font-bold">&copy; 2024 ROOT FITNESS. ALL RIGHTS RESERVED. BUILT WITH 💪 FOR LIFTERS.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}