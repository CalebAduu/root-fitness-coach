"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import NutritionPlanDisplay from "../../components/NutritionPlanDisplay";
import AppHeader from "../../components/AppHeader";
import { AppleIcon, BulbIcon, DropletIcon, LeafIcon, MeatIcon, PlateIcon } from "../../components/icons";

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-700 text-lg">Loading your nutrition plan...</p>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-700 text-lg mb-4">No user data found.</p>
          <button
            onClick={() => router.push("/")}
            className="bg-gradient-to-r from-teal-500 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-teal-600 hover:to-blue-700 transition-colors"
          >
            Go Back Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader
        active="nutrition"
        rightSlot={
          <button
            onClick={() => router.push("/workout-plan")}
            className="bg-white/10 text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-colors border border-white/10"
          >
            ← Back to Dashboard
          </button>
        }
      />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-teal-600 via-blue-600 to-indigo-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Your Nutrition Plan
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              Fuel your fitness journey with personalized nutrition guidance
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* User Info Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-12">
          <div className="flex items-center space-x-6">
            <div className="w-16 h-16 bg-gradient-to-r from-teal-500 to-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xl font-bold">
                {userData?.name ? userData.name.charAt(0).toUpperCase() : 'U'}
              </span>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome back, {userData?.name || "User"}!</h2>
              <p className="text-gray-600">Here's your personalized nutrition plan</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500 mb-1">Fitness Goal</div>
              <div className="text-lg font-semibold text-gray-900">{userData?.fitnessGoals || "General fitness"}</div>
            </div>
          </div>
        </div>

        {/* Nutrition Plan Content */}
        {nutritionPlan ? (
          <NutritionPlanDisplay nutritionPlan={nutritionPlan} />
        ) : (
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-2xl p-8 mb-12 shadow-lg">
            <div className="flex items-center mb-8">
              <div className="bg-gradient-to-r from-teal-500 to-blue-600 p-4 rounded-full mr-6">
                <AppleIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-3xl font-bold text-gray-900 mb-2">Personalized Nutrition Planning</h3>
                <p className="text-gray-600 text-lg">Get a customized nutrition plan tailored to your specific goals</p>
              </div>
            </div>
            
            <div className="text-center">
              <div className="bg-white rounded-xl p-8 shadow-md border border-gray-200 max-w-2xl mx-auto">
                <div className="w-20 h-20 bg-gradient-to-r from-teal-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <PlateIcon className="w-9 h-9 text-white" />
                </div>
                <h4 className="text-2xl font-bold text-gray-900 mb-4">Ready to Fuel Your Fitness Journey?</h4>
                <p className="text-gray-600 mb-8 leading-relaxed">
                  Answer a few quick questions about your nutrition goals and get a personalized meal plan, 
                  dietary guidelines, and nutrition recommendations designed specifically for your fitness objectives.
                </p>
                <button
                  onClick={() => router.push("/nutrition-onboarding")}
                  className="bg-gradient-to-r from-teal-500 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-teal-600 hover:to-blue-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl inline-flex items-center gap-2"
                >
                  <AppleIcon className="w-5 h-5" />
                  Get My Nutrition Plan
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
          <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <BulbIcon className="w-6 h-6 text-amber-500" />
            Nutrition Tips
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mr-3">
                  <DropletIcon className="w-5 h-5 text-white" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900">Stay Hydrated</h4>
              </div>
              <p className="text-gray-700 text-sm">Drink at least 8 glasses of water daily. Proper hydration supports muscle function and recovery.</p>
            </div>
            
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full flex items-center justify-center mr-3">
                  <MeatIcon className="w-5 h-5 text-white" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900">Protein Power</h4>
              </div>
              <p className="text-gray-700 text-sm">Include lean protein in every meal to support muscle growth and repair.</p>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mr-3">
                  <LeafIcon className="w-5 h-5 text-white" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900">Eat Your Greens</h4>
              </div>
              <p className="text-gray-700 text-sm">Fill half your plate with vegetables for essential vitamins and minerals.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


