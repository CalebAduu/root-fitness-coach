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

export default function WorkoutPlanPage() {
  const router = useRouter();
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  
  // Feedback form state
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState<number>(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackCategory, setFeedbackCategory] = useState("general");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Q&A Section State
  const [showQASection, setShowQASection] = useState(false);
  const [question, setQuestion] = useState("");
  const [qaAnswer, setQaAnswer] = useState("");
  const [qaSources, setQaSources] = useState<any[]>([]);
  const [isLoadingQA, setIsLoadingQA] = useState(false);
  const [qaHistory, setQaHistory] = useState<Array<{question: string, answer: string, sources: any[]}>>([]);
  
  // Nutrition plan state
  const [nutritionPlan, setNutritionPlan] = useState<any>(null);

  useEffect(() => {
    // Get workout plan from sessionStorage
    const storedPlan = sessionStorage.getItem("workoutPlan");
    const storedUserData = sessionStorage.getItem("userData");
    const storedProfileId = sessionStorage.getItem("profileId");
    const storedPlanId = sessionStorage.getItem("planId");
    const storedNutritionPlan = sessionStorage.getItem("nutritionPlan");

    if (storedPlan && storedUserData) {
      try {
        const plan = JSON.parse(storedPlan);
        const user = JSON.parse(storedUserData);
        setWorkoutPlan(plan);
        setUserData(user);
        setProfileId(storedProfileId);
        setPlanId(storedPlanId);
        
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
      // No plan found, redirect to home
      router.push("/");
    }
    setLoading(false);
  }, [router]);

  // Function to handle feedback submission
  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!feedbackText.trim() || feedbackRating === 0) {
      alert("Please provide both a rating and feedback text.");
      return;
    }

    setIsSubmittingFeedback(true);
    
    try {
      const response = await fetch("/api/submit-feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profileId,
          planId,
          rating: feedbackRating,
          feedback: feedbackText,
          category: feedbackCategory,
        }),
      });

      if (response.ok) {
        setFeedbackSubmitted(true);
        setShowFeedbackForm(false);
        setFeedbackRating(0);
        setFeedbackText("");
        setFeedbackCategory("general");
      } else {
        throw new Error("Failed to submit feedback");
      }
    } catch (error) {
      console.error("Error submitting feedback:", error);
      alert("Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const handleQAQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!question.trim()) {
      alert("Please enter a question.");
      return;
    }

    setIsLoadingQA(true);
    
    try {
      const response = await fetch("/api/rag-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: question,
          type: "general"
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setQaAnswer(data.answer);
        setQaSources(data.sources || []);
        
        // Add to history
        setQaHistory(prev => [...prev, {
          question: question,
          answer: data.answer,
          sources: data.sources || []
        }]);
        
        setQuestion("");
      } else {
        throw new Error("Failed to get answer");
      }
    } catch (error) {
      console.error("Error getting answer:", error);
      setQaAnswer("Sorry, I couldn't process your question right now. Please try again.");
      setQaSources([]);
    } finally {
      setIsLoadingQA(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading your workout plan...</p>
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
              <a href="/workout-plan" className="text-white px-3 py-2 text-sm font-medium bg-teal-500 rounded-lg">Dashboard</a>
              <a href="/workout" className="text-gray-300 hover:text-white px-3 py-2 text-sm font-medium">Workouts</a>
              <a href="#" className="text-gray-300 hover:text-white px-3 py-2 text-sm font-medium">Nutrition</a>
              <a href="#" className="text-gray-300 hover:text-white px-3 py-2 text-sm font-medium">Progress</a>
            </nav>

            {/* Login Button */}
            <div className="flex items-center">
              <button className="bg-teal-500 text-white px-6 py-2 rounded-lg hover:bg-teal-600 transition-colors">
                Login
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Your Personalized Workout Plan
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              Ready to crush your fitness goals with AI-powered guidance
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Your Fitness Hub Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden mb-12">
          {/* Card Header */}
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 p-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">Your Fitness Hub</h2>
                <p className="text-blue-100 text-lg">Ready to craft your fitness journey</p>
              </div>
              <button className="text-white p-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Card Content */}
          <div className="p-8">
            {/* Personal Information */}
            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Personal Information</h3>
              <div className="flex items-center space-x-6">
                <div className="w-16 h-16 bg-gradient-to-r from-teal-500 to-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xl font-bold">
                    {userData?.name ? userData.name.charAt(0).toUpperCase() : 'U'}
                  </span>
                </div>
                <div className="flex-1">
                  <h4 className="text-2xl font-bold text-gray-900">{userData?.name || "User"}</h4>
                  <div className="flex flex-wrap gap-4 mt-2">
                    <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">Age: {userData?.age || 25}</span>
                    <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">Height: {userData?.height || "5'10\""}</span>
                    <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">Weight: {userData?.weight || 150} lbs</span>
                    <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">Workout Days: {userData?.workoutDays || 3} days/week</span>
                    <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">Equipment: {userData?.gymAccess ? "Full Gym" : "Home"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Fitness Goals */}
            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Fitness Goals</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Build Muscle</h4>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full" style={{width: '70%'}}></div>
                  </div>
                  <p className="text-sm text-gray-600">70% Achieved</p>
                </div>
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-r from-teal-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Lose Weight</h4>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div className="bg-gradient-to-r from-teal-500 to-teal-600 h-2 rounded-full" style={{width: '50%'}}></div>
                  </div>
                  <p className="text-sm text-gray-600">50% To Go</p>
                </div>
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Build Strength</h4>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full" style={{width: '30%'}}></div>
                  </div>
                  <p className="text-sm text-gray-600">30% To Go</p>
                </div>
              </div>
            </div>

            {/* Experience Level */}
            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Experience Level</h3>
              <div className="bg-gray-50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-900">{userData?.experienceLevel || "Beginner"} Athlete</h4>
                  <span className="text-sm text-gray-600">Level 4 (80% to Advanced)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                  <div className="bg-gradient-to-r from-teal-500 to-purple-600 h-3 rounded-full" style={{width: '80%'}}></div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">5 out of 10 Advances</span>
                  <span className="text-sm text-gray-600">Full Gym READY</span>
                </div>
              </div>
            </div>

            {/* AI Message */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <img src="/logo.png" alt="Root AI" className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Root AI Says:</h4>
                  <p className="text-gray-700">"Consistent effort leads to lasting results. Keep up the great work this week!"</p>
                </div>
              </div>
              <div className="mt-4">
                <button className="bg-gradient-to-r from-teal-500 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-teal-600 hover:to-blue-700 transition-all duration-200">
                  Adjust Your Plan
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Workout Overview */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Your Workout Plan</h2>
            <button
              onClick={() => router.push("/workout")}
              className="bg-gradient-to-r from-teal-500 to-blue-600 text-white px-6 py-3 rounded-xl hover:from-teal-600 hover:to-blue-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              View Full Workout Plan
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {days.slice(0, 3).map((day) => {
              const dayData = workoutPlan.weeklyPlan[day];
              return (
                <div key={day} className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">{day}</h3>
                    <span className="bg-gradient-to-r from-teal-500 to-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                      {dayData.difficulty}
                    </span>
                  </div>
                  <h4 className="text-md font-semibold text-gray-700 mb-2">{dayData.focus}</h4>
                  <p className="text-sm text-gray-600 mb-3">{dayData.duration}</p>
                  <div className="text-sm text-gray-500 mb-3">
                    {dayData.exercises.length} exercises
                  </div>
                  <div className="space-y-1">
                    {dayData.exercises.slice(0, 2).map((exercise, index) => (
                      <button
                        key={index}
                        onClick={() => window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(exercise.name + ' proper form exercise')}`, '_blank')}
                        className="text-xs text-teal-600 hover:text-teal-800 font-medium transition-colors block"
                      >
                        {exercise.name} - View Form
                      </button>
                    ))}
                    {dayData.exercises.length > 2 && (
                      <span className="text-xs text-gray-500">+{dayData.exercises.length - 2} more exercises</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          {days.length > 3 && (
            <div className="text-center mt-6">
              <button
                onClick={() => router.push("/workout")}
                className="text-teal-600 hover:text-teal-700 font-medium"
              >
                View all {days.length} workout days →
              </button>
            </div>
          )}
        </div>

        {/* Nutrition Overview */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Your Nutrition Plan</h2>
            <button
              onClick={() => router.push("/nutrition")}
              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              View Nutrition Plan
            </button>
          </div>
          
          {nutritionPlan ? (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mr-4">
                  <span className="text-white text-xl">🍎</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Nutrition Plan Active</h3>
                  <p className="text-sm text-gray-600">Your personalized meal plan is ready</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{nutritionPlan.dailyCalories || '2000'}</div>
                  <div className="text-sm text-gray-600">Daily Calories</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{nutritionPlan.mealsPerDay || '3'}</div>
                  <div className="text-sm text-gray-600">Meals per Day</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{nutritionPlan.proteinGrams || '150'}</div>
                  <div className="text-sm text-gray-600">Protein (g)</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-6 border border-gray-200">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full flex items-center justify-center mr-4">
                  <span className="text-white text-xl">🍎</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">No Nutrition Plan Yet</h3>
                  <p className="text-sm text-gray-600">Get your personalized meal plan to complement your workout</p>
                </div>
              </div>
              <button
                onClick={() => router.push("/nutrition-onboarding")}
                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200"
              >
                Create Nutrition Plan
              </button>
            </div>
          )}
        </div>

        {/* Safety Notes */}
        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-2xl p-8 mb-12 shadow-lg">
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

        {/* Q&A Section */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 mb-12">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-gray-900">🤖 Ask Root About Your Workout</h3>
            <button
              onClick={() => setShowQASection(!showQASection)}
              className="bg-gradient-to-r from-teal-500 to-blue-600 text-white px-6 py-3 rounded-xl hover:from-teal-600 hover:to-blue-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              {showQASection ? "Hide Q&A" : "Ask a Question"}
            </button>
          </div>
          
          {showQASection && (
            <div className="space-y-6">
              {/* Question Form */}
              <form onSubmit={handleQAQuestion} className="space-y-4">
                <div>
                  <label className="block text-lg font-semibold text-gray-700 mb-3">
                    Ask me anything about your workout, exercises, or fitness!
                  </label>
                  <div className="flex space-x-4">
                    <input
                      type="text"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="e.g., How do I do a proper squat? What should I eat after a workout?"
                      className="flex-1 p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-teal-500/20 text-lg"
                      disabled={isLoadingQA}
                    />
                    <button
                      type="submit"
                      disabled={isLoadingQA || !question.trim()}
                      className="bg-gradient-to-r from-teal-500 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-teal-600 hover:to-blue-700 transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoadingQA ? "Thinking..." : "Ask"}
                    </button>
                  </div>
                </div>
              </form>

              {/* Current Answer */}
              {qaAnswer && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
                  <div className="flex items-start">
                    <span className="text-blue-500 mr-3 text-2xl">🤖</span>
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">Root's Answer:</h4>
                      <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-wrap">{qaAnswer}</p>
                      
                      {/* Sources */}
                      {qaSources.length > 0 && (
                        <div className="mt-4">
                          <h5 className="text-sm font-semibold text-gray-600 mb-2">Sources:</h5>
                          <div className="space-y-2">
                            {qaSources.map((source, index) => (
                              <div key={index} className="text-sm">
                                <a 
                                  href={source.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 underline"
                                >
                                  {source.title}
                                </a>
                                {source.relevanceScore && (
                                  <span className="text-gray-500 ml-2">
                                    (Relevance: {Math.round(source.relevanceScore * 100)}%)
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Q&A History */}
              {qaHistory.length > 0 && (
                <div className="border-t border-gray-200 pt-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Previous Questions & Answers</h4>
                  <div className="space-y-4">
                    {qaHistory.slice(0, 3).map((qa, index) => (
                      <div key={index} className="bg-gray-50 rounded-xl p-4">
                        <div className="mb-2">
                          <span className="text-sm font-semibold text-gray-600">Q:</span>
                          <p className="text-gray-800 ml-2 inline">{qa.question}</p>
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-gray-600">A:</span>
                          <p className="text-gray-700 ml-2 inline">{qa.answer.substring(0, 200)}...</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Example Questions */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">💡 Try asking:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    onClick={() => setQuestion("How do I do a proper push-up?")}
                    className="text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-teal-300 hover:bg-teal-50 transition-colors"
                  >
                    <span className="text-teal-600 font-medium">"How do I do a proper push-up?"</span>
                  </button>
                  <button
                    onClick={() => setQuestion("What should I eat after a workout?")}
                    className="text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-teal-300 hover:bg-teal-50 transition-colors"
                  >
                    <span className="text-teal-600 font-medium">"What should I eat after a workout?"</span>
                  </button>
                  <button
                    onClick={() => setQuestion("How many rest days should I take?")}
                    className="text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-teal-300 hover:bg-teal-50 transition-colors"
                  >
                    <span className="text-teal-600 font-medium">"How many rest days should I take?"</span>
                  </button>
                  <button
                    onClick={() => setQuestion("What are good beginner exercises?")}
                    className="text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-teal-300 hover:bg-teal-50 transition-colors"
                  >
                    <span className="text-teal-600 font-medium">"What are good beginner exercises?"</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Ask Root About Your Workout */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center relative">
                  {/* Robot head */}
                  <div className="w-8 h-8 bg-purple-300 rounded-full flex items-center justify-center">
                    {/* Eyes */}
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    </div>
                  </div>
                  {/* Antennae */}
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 flex space-x-1">
                    <div className="w-1 h-2 bg-yellow-400 rounded-full"></div>
                    <div className="w-1 h-2 bg-yellow-400 rounded-full"></div>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Ask Root About Your Workout</h3>
                <p className="text-gray-600 text-sm">Get personalized advice and tips</p>
              </div>
            </div>
            <button
              onClick={() => {
                // TODO: Implement chat functionality
                alert("Chat functionality coming soon!");
              }}
              className="bg-gradient-to-r from-teal-500 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-teal-600 hover:to-blue-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              Ask a Question
            </button>
          </div>
        </div>

        {/* Feedback Section */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-gray-900">💬 Share Your Feedback</h3>
            {!showFeedbackForm && !feedbackSubmitted && (
              <button
                onClick={() => setShowFeedbackForm(true)}
                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                Give Feedback
              </button>
            )}
          </div>
          
          {feedbackSubmitted && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 mb-6">
              <div className="flex items-center">
                <span className="text-green-500 mr-3 text-2xl">✅</span>
                <p className="text-green-800 text-lg">Thank you for your feedback! It helps us improve our workout plans.</p>
              </div>
            </div>
          )}

          {showFeedbackForm && (
            <form onSubmit={handleFeedbackSubmit} className="space-y-6">
              {/* Rating */}
              <div>
                <label className="block text-lg font-semibold text-gray-700 mb-3">
                  How would you rate this workout plan? *
                </label>
                <div className="flex space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFeedbackRating(star)}
                      className={`text-4xl transition-all duration-200 transform hover:scale-110 ${
                        star <= feedbackRating ? "text-yellow-400" : "text-gray-300"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {feedbackRating === 0 && "Please select a rating"}
                  {feedbackRating === 1 && "Poor"}
                  {feedbackRating === 2 && "Fair"}
                  {feedbackRating === 3 && "Good"}
                  {feedbackRating === 4 && "Very Good"}
                  {feedbackRating === 5 && "Excellent"}
                </p>
              </div>

              {/* Category */}
              <div>
                <label className="block text-lg font-semibold text-gray-700 mb-3">
                  Feedback Category
                </label>
                <select
                  value={feedbackCategory}
                  onChange={(e) => setFeedbackCategory(e.target.value)}
                  className="w-full p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-teal-500/20 text-lg"
                >
                  <option value="general">General Feedback</option>
                  <option value="difficulty">Difficulty Level</option>
                  <option value="exercises">Exercise Selection</option>
                  <option value="duration">Workout Duration</option>
                  <option value="progression">Progression</option>
                  <option value="suggestions">Suggestions</option>
                </select>
              </div>

              {/* Feedback Text */}
              <div>
                <label className="block text-lg font-semibold text-gray-700 mb-3">
                  Your Feedback *
                </label>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  rows={4}
                  className="w-full p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-teal-500/20 text-lg resize-none"
                  placeholder="Share your thoughts about this workout plan..."
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex space-x-4">
                <button
                  type="submit"
                  disabled={isSubmittingFeedback}
                  className="bg-gradient-to-r from-teal-500 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-teal-600 hover:to-blue-700 transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingFeedback ? "Submitting..." : "Submit Feedback"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowFeedbackForm(false)}
                  className="bg-gray-500 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-600 transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}