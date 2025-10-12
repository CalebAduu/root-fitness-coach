"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rest: string;
  notes?: string;
}

interface WorkoutDay {
  focus: string;
  exercises: Exercise[];
  duration: string;
  difficulty: string;
}

interface WorkoutPlan {
  userInfo: {
    name: string;
    age: number;
    height: string;
    weight: number;
    fitnessGoals: string;
    workoutDays: number;
  };
  weeklyPlan: {
    [day: string]: WorkoutDay;
  };
  recommendations: {
    warmup: string[];
    cooldown: string[];
    nutrition: string[];
    progression: string[];
  };
  safetyNotes: string[];
}

export default function WorkoutPage() {
  const router = useRouter();
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string>("");

  useEffect(() => {
    // Get workout plan from sessionStorage
    const storedPlan = sessionStorage.getItem("workoutPlan");
    const storedUserData = sessionStorage.getItem("userData");

    if (storedPlan && storedUserData) {
      try {
        const plan = JSON.parse(storedPlan);
        const user = JSON.parse(storedUserData);
        setWorkoutPlan(plan);
        setUserData(user);
        
        // Set Day 1 as selected, sorting keys as Day 1..N if applicable
        const dayKeys = Object.keys(plan.weeklyPlan).sort((a: string, b: string) => {
          const na = parseInt(a.replace(/[^0-9]/g, '')) || 0;
          const nb = parseInt(b.replace(/[^0-9]/g, '')) || 0;
          if (na && nb) return na - nb;
          return a.localeCompare(b);
        });
        if (dayKeys.length > 0) {
          setSelectedDay(dayKeys[0]);
        }
      } catch (error) {
        console.error("Error parsing stored data:", error);
        router.push("/");
      }
    } else {
      // No plan found, redirect to home
      router.push("/");
    }
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading your workout...</p>
        </div>
      </div>
    );
  }

  if (!workoutPlan || !userData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 text-lg mb-4">No workout plan found.</p>
          <button
            onClick={() => router.push("/")}
            className="bg-teal-500 text-white px-6 py-3 rounded-lg hover:bg-teal-600 transition-colors"
          >
            Go Back Home
          </button>
        </div>
      </div>
    );
  }

  const days = Object.keys(workoutPlan.weeklyPlan).sort((a: string, b: string) => {
    const na = parseInt(a.replace(/[^0-9]/g, '')) || 0;
    const nb = parseInt(b.replace(/[^0-9]/g, '')) || 0;
    if (na && nb) return na - nb;
    return a.localeCompare(b);
  });

  const selectedDayData = workoutPlan.weeklyPlan[selectedDay];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800">
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
              <a href="/workout" className="text-white px-3 py-2 text-sm font-medium bg-teal-500 rounded-lg">Workouts</a>
              <a href="/nutrition" className="text-gray-300 hover:text-white px-3 py-2 text-sm font-medium">Nutrition</a>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Weekly Schedule */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Weekly Schedule</h2>
          <div className="flex flex-wrap justify-center gap-4 mb-6">
            {days.map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-6 py-3 rounded-xl font-semibold text-lg transition-all duration-200 ${
                  selectedDay === day
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
                }`}
              >
                {day}
              </button>
            ))}
            <button className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-xl font-semibold text-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-lg">
              Start Session
            </button>
          </div>
        </div>

        {/* Selected Day Workout */}
        {selectedDayData && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Workout Card */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-1">{selectedDay} - {selectedDayData.focus}</h2>
                      <p className="text-orange-100">{selectedDayData.duration}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button className="bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/30 transition-colors flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {selectedDayData.difficulty}
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="space-y-6">
                    {selectedDayData.exercises.map((exercise, index) => (
                      <div key={index} className="bg-gray-50 rounded-xl p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">{exercise.name}</h3>
                            <button 
                              onClick={() => window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(exercise.name + ' proper form exercise')}`, '_blank')}
                              className="inline-flex items-center text-teal-600 hover:text-teal-800 font-medium transition-colors text-sm"
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              View Proper Form
                            </button>
                          </div>
                          <span className="bg-gradient-to-r from-teal-500 to-blue-600 text-white text-sm font-bold px-3 py-1 rounded-full">
                            Exercise {index + 1}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div className="bg-white rounded-lg p-4 text-center border border-gray-200">
                            <span className="text-xs text-gray-500 block mb-1 font-medium">Sets</span>
                            <span className="text-2xl font-bold text-gray-900">{exercise.sets}</span>
                          </div>
                          <div className="bg-white rounded-lg p-4 text-center border border-gray-200">
                            <span className="text-xs text-gray-500 block mb-1 font-medium">Reps</span>
                            <span className="text-2xl font-bold text-gray-900">{exercise.reps}</span>
                          </div>
                          <div className="bg-white rounded-lg p-4 text-center border border-gray-200">
                            <span className="text-xs text-gray-500 block mb-1 font-medium">Rest</span>
                            <span className="text-2xl font-bold text-gray-900">{exercise.rest}</span>
                          </div>
                        </div>
                        
                        {exercise.notes && (
                          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4">
                            <p className="text-yellow-800 flex items-start">
                              <span className="text-yellow-500 mr-2 mt-0.5 text-lg">💡</span>
                              <span className="leading-relaxed">{exercise.notes}</span>
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar Cards */}
            <div className="space-y-6">
              {/* Exercise List Card */}
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">{selectedDay} - {selectedDayData.focus}</h3>
                <div className="space-y-3">
                  {selectedDayData.exercises.map((exercise, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">{exercise.name}</span>
                        <span className="text-sm text-gray-600">{selectedDayData.duration}</span>
                      </div>
                      <button 
                        onClick={() => window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(exercise.name + ' proper form exercise')}`, '_blank')}
                        className="text-xs text-teal-600 hover:text-teal-800 font-medium transition-colors"
                      >
                        View Form →
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Coach Tip */}
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-6">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mr-3">
                    <span className="text-white text-lg">💡</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">AI Coach Tip</h3>
                </div>
                <p className="text-gray-700">Focus on form and control. Quality over quantity will lead to better results and prevent injuries.</p>
              </div>

              {/* Warmup & Cooldown */}
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Warmup & Cooldown</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                      <span className="text-orange-500 mr-2">🔥</span>
                      Warmup
                    </h4>
                    <ul className="space-y-1">
                      {workoutPlan.recommendations.warmup.slice(0, 3).map((item, index) => (
                        <li key={index} className="text-sm text-gray-600 flex items-center">
                          <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                      <span className="text-blue-500 mr-2">🧘</span>
                      Cooldown
                    </h4>
                    <ul className="space-y-1">
                      {workoutPlan.recommendations.cooldown.slice(0, 3).map((item, index) => (
                        <li key={index} className="text-sm text-gray-600 flex items-center">
                          <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Safety Notes */}
        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-2xl p-8 mt-12 shadow-lg">
          <div className="flex items-center mb-6">
            <div className="bg-gradient-to-r from-yellow-500 to-amber-600 p-4 rounded-full mr-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <h3 className="text-2xl font-bold text-yellow-800">Safety Notes</h3>
          </div>
          <ul className="space-y-3">
            {workoutPlan.safetyNotes.map((note, index) => (
              <li key={index} className="text-yellow-800 flex items-start">
                <span className="w-3 h-3 bg-yellow-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                <span className="leading-relaxed">{note}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
