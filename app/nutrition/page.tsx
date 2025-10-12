"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import NutritionPlanDisplay from "../../components/NutritionPlanDisplay";

export default function NutritionPage() {
  const router = useRouter();
  const [nutritionPlan, setNutritionPlan] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get nutrition plan and user data from sessionStorage
    const storedNutritionPlan = sessionStorage.getItem("nutritionPlan");
    const storedUserData = sessionStorage.getItem("userData");

    if (storedUserData) {
      try {
        const user = JSON.parse(storedUserData);
        setUserData(user);
        
        // Load nutrition plan if it exists
        if (storedNutritionPlan) {
          try {
            const nutrition = JSON.parse(storedNutritionPlan);
            setNutritionPlan(nutrition);
          } catch (error) {
            console.error("Error parsing nutrition plan:", error);
          }
        }
      } catch (error) {
        console.error("Error parsing stored data:", error);
        router.push("/");
      }
    } else {
      // No user data found, redirect to home
      router.push("/");
    }
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-700 text-lg">Loading your nutrition plan...</p>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-700 text-lg mb-4">No user data found.</p>
          <button
            onClick={() => router.push("/")}
            className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Go Back Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-black border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <img src="/logo.png" alt="Root Fitness Logo" className="w-8 h-8 mr-3" />
                <span className="text-white text-xl font-bold">Root Fitness</span>
              </div>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex space-x-8">
              <a href="/workout-plan" className="text-gray-300 hover:text-white px-3 py-2 text-sm font-medium">Dashboard</a>
              <a href="/workout" className="text-gray-300 hover:text-white px-3 py-2 text-sm font-medium">Workouts</a>
              <a href="/nutrition" className="text-white px-3 py-2 text-sm font-medium bg-blue-600 rounded-lg">Nutrition</a>
              <a href="#" className="text-gray-300 hover:text-white px-3 py-2 text-sm font-medium">Progress</a>
            </nav>

            {/* Back Button */}
            <div className="flex items-center">
              <button
                onClick={() => router.push("/workout-plan")}
                className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Your Nutrition Plan
            </h1>
            <p className="text-xl text-gray-200 max-w-2xl mx-auto">
              Fuel your fitness journey with personalized nutrition guidance
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* User Info Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-12">
          <div className="flex items-center space-x-6">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xl font-bold">
                {userData?.name ? userData.name.charAt(0).toUpperCase() : 'U'}
              </span>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-black mb-2">Welcome back, {userData?.name || "User"}!</h2>
              <p className="text-gray-600">Here's your personalized nutrition plan</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500 mb-1">Fitness Goal</div>
              <div className="text-lg font-semibold text-black">{userData?.fitnessGoals || "General fitness"}</div>
            </div>
          </div>
        </div>

        {/* Nutrition Plan Content */}
        {nutritionPlan ? (
          <NutritionPlanDisplay nutritionPlan={nutritionPlan} />
        ) : (
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-2xl p-8 mb-12 shadow-lg">
            <div className="flex items-center mb-8">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-full mr-6">
                <span className="text-3xl">🍎</span>
              </div>
              <div>
                <h3 className="text-3xl font-bold text-black mb-2">Personalized Nutrition Planning</h3>
                <p className="text-gray-600 text-lg">Get a customized nutrition plan tailored to your specific goals</p>
              </div>
            </div>
            
            <div className="text-center">
              <div className="bg-white rounded-xl p-8 shadow-md border border-gray-200 max-w-2xl mx-auto">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-3xl">🥗</span>
                </div>
                <h4 className="text-2xl font-bold text-black mb-4">Ready to Fuel Your Fitness Journey?</h4>
                <p className="text-gray-600 mb-8 leading-relaxed">
                  Answer a few quick questions about your nutrition goals and get a personalized meal plan, 
                  dietary guidelines, and nutrition recommendations designed specifically for your fitness objectives.
                </p>
                <button
                  onClick={() => router.push("/nutrition-onboarding")}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  🍎 Get My Nutrition Plan
                </button>
                <p className="text-sm text-gray-500 mt-4">
                  Takes 2-3 minutes • Completely personalized • Free
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Nutrition Tips */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          <h3 className="text-2xl font-bold text-black mb-6">💡 Nutrition Tips</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white text-lg">💧</span>
                </div>
                <h4 className="text-lg font-semibold text-black">Stay Hydrated</h4>
              </div>
              <p className="text-gray-700 text-sm">Drink at least 8 glasses of water daily. Proper hydration supports muscle function and recovery.</p>
            </div>
            
            <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-6 border border-orange-200">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white text-lg">🥩</span>
                </div>
                <h4 className="text-lg font-semibold text-black">Protein Power</h4>
              </div>
              <p className="text-gray-700 text-sm">Include lean protein in every meal to support muscle growth and repair.</p>
            </div>
            
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white text-lg">🥬</span>
                </div>
                <h4 className="text-lg font-semibold text-black">Eat Your Greens</h4>
              </div>
              <p className="text-gray-700 text-sm">Fill half your plate with vegetables for essential vitamins and minerals.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


