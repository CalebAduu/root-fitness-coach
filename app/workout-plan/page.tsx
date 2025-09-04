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
  const [selectedDay, setSelectedDay] = useState<string>("");
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

  useEffect(() => {
    // Get workout plan from sessionStorage
    const storedPlan = sessionStorage.getItem("workoutPlan");
    const storedUserData = sessionStorage.getItem("userData");
    const storedProfileId = sessionStorage.getItem("profileId");
    const storedPlanId = sessionStorage.getItem("planId");

    if (storedPlan && storedUserData) {
      try {
        const plan = JSON.parse(storedPlan);
        const user = JSON.parse(storedUserData);
        setWorkoutPlan(plan);
        setUserData(user);
        setProfileId(storedProfileId);
        setPlanId(storedPlanId);
        
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
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
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
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
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
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <img src="/logo.png" alt="Root Fitness Logo" className="w-10 h-10" />
              </div>
              <div className="ml-3">
                <h1 className="text-xl font-bold text-gray-900">Root Fitness</h1>
              </div>
            </div>
            <button
              onClick={() => router.push("/")}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              ← Back to Chat
            </button>
          </div>
        </div>
      </nav>

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
        {/* User Profile Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 mb-12">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl text-white">👤</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome back, {userData?.name || "User"}!</h2>
            <p className="text-gray-600">Here's your customized fitness journey</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-xl">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-white text-lg">🎯</span>
              </div>
              <p className="text-sm text-gray-600 mb-1">Goal</p>
              <p className="font-semibold text-gray-900">{userData?.fitnessGoals || "General fitness"}</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-xl">
              <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-white text-lg">💪</span>
              </div>
              <p className="text-sm text-gray-600 mb-1">Level</p>
              <p className="font-semibold text-gray-900">{userData?.experienceLevel || "Beginner"}</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-xl">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-white text-lg">📅</span>
              </div>
              <p className="text-sm text-gray-600 mb-1">Workout Days</p>
              <p className="font-semibold text-gray-900">{userData?.workoutDays || 3} days/week</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-xl">
              <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-white text-lg">🏋️</span>
              </div>
              <p className="text-sm text-gray-600 mb-1">Equipment</p>
              <p className="font-semibold text-gray-900">{userData?.gymAccess ? "Full Gym" : "Home"}</p>
            </div>
          </div>
          
          {userData?.gender && (
            <div className="mt-6 text-center">
              <span className="inline-flex items-center bg-gradient-to-r from-pink-500 to-rose-600 text-white px-4 py-2 rounded-full text-sm font-medium">
                <span className="mr-2">🎭</span>
                {userData.gender}
              </span>
            </div>
          )}
        </div>

        {/* Weekly Schedule */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Your Weekly Schedule</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {days.map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`p-4 rounded-xl font-semibold text-lg transition-all duration-200 transform hover:scale-105 ${
                  selectedDay === day
                    ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg"
                    : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Day Workout */}
        {selectedDayData && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 mb-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">{selectedDay} - {selectedDayData.focus}</h2>
              <div className="flex items-center justify-center space-x-8 text-gray-600">
                <div className="flex items-center">
                  <span className="text-2xl mr-2">⏱️</span>
                  <span className="text-lg">{selectedDayData.duration}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-2xl mr-2">📊</span>
                  <span className="text-lg">{selectedDayData.difficulty}</span>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {selectedDayData.exercises.map((exercise, index) => (
                <div key={index} className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-6 border border-gray-100 hover:shadow-md transition-all duration-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{exercise.name}</h3>
                      <a
                        href={`https://www.youtube.com/results?search_query=${encodeURIComponent(exercise.name + ' proper form exercise')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium transition-colors"
                      >
                        <span className="mr-2">🎥</span>
                        See proper form
                      </a>
                    </div>
                    <span className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-bold px-4 py-2 rounded-full">
                      Exercise {index + 1}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
                      <span className="text-xs text-gray-500 block mb-1 font-medium">Sets</span>
                      <span className="text-2xl font-bold text-gray-900">{exercise.sets}</span>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
                      <span className="text-xs text-gray-500 block mb-1 font-medium">Reps</span>
                      <span className="text-2xl font-bold text-gray-900">{exercise.reps}</span>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
                      <span className="text-xs text-gray-500 block mb-1 font-medium">Rest</span>
                      <span className="text-2xl font-bold text-gray-900">{exercise.rest}</span>
                    </div>
                  </div>
                  
                  {exercise.notes && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-blue-800 flex items-start">
                        <span className="text-blue-500 mr-2 mt-0.5 text-lg">💡</span>
                        <span className="leading-relaxed">{exercise.notes}</span>
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Nutrition Section */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-8 mb-12 shadow-lg">
          <div className="flex items-center mb-8">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4 rounded-full mr-6">
              <span className="text-3xl">🍎</span>
            </div>
            <div>
              <h3 className="text-3xl font-bold text-green-800 mb-2">Your Personalized Nutrition Plan</h3>
              <p className="text-green-600 text-lg">Fuel your fitness journey with these tailored recommendations</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl p-6 shadow-md border border-green-100">
              <h4 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="text-green-600 mr-3 text-2xl">🥗</span>
                Daily Nutrition Guidelines
              </h4>
              <ul className="space-y-3">
                {workoutPlan.recommendations.nutrition.map((item, index) => (
                  <li key={index} className="text-gray-700 flex items-start">
                    <span className="w-3 h-3 bg-green-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-md border border-green-100">
              <h4 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="text-green-600 mr-3 text-2xl">📈</span>
                Progress & Progression
              </h4>
              <ul className="space-y-3">
                {workoutPlan.recommendations.progression.map((item, index) => (
                  <li key={index} className="text-gray-700 flex items-start">
                    <span className="w-3 h-3 bg-purple-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Warmup & Cooldown Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 mb-12">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">🔥 Warmup & Cooldown</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-6 border border-orange-200">
              <h4 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="text-orange-500 mr-3 text-2xl">🔥</span>
                Warmup Routine
              </h4>
              <ul className="space-y-3">
                {workoutPlan.recommendations.warmup.map((item, index) => (
                  <li key={index} className="text-gray-700 flex items-center">
                    <span className="w-3 h-3 bg-orange-500 rounded-full mr-3"></span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
              <h4 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="text-blue-500 mr-3 text-2xl">🧘</span>
                Cooldown Routine
              </h4>
              <ul className="space-y-3">
                {workoutPlan.recommendations.cooldown.map((item, index) => (
                  <li key={index} className="text-gray-700 flex items-center">
                    <span className="w-3 h-3 bg-blue-500 rounded-full mr-3"></span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
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
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 mb-12">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-gray-900">🤖 Ask Root About Your Workout</h3>
            <button
              onClick={() => setShowQASection(!showQASection)}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
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
                      className="flex-1 p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 text-lg"
                      disabled={isLoadingQA}
                    />
                    <button
                      type="submit"
                      disabled={isLoadingQA || !question.trim()}
                      className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
                    className="text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    <span className="text-blue-600 font-medium">"How do I do a proper push-up?"</span>
                  </button>
                  <button
                    onClick={() => setQuestion("What should I eat after a workout?")}
                    className="text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    <span className="text-blue-600 font-medium">"What should I eat after a workout?"</span>
                  </button>
                  <button
                    onClick={() => setQuestion("How many rest days should I take?")}
                    className="text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    <span className="text-blue-600 font-medium">"How many rest days should I take?"</span>
                  </button>
                  <button
                    onClick={() => setQuestion("What are good beginner exercises?")}
                    className="text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    <span className="text-blue-600 font-medium">"What are good beginner exercises?"</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Feedback Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
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
                  className="w-full p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 text-lg"
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
                  className="w-full p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 text-lg resize-none"
                  placeholder="Share your thoughts about this workout plan..."
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex space-x-4">
                <button
                  type="submit"
                  disabled={isSubmittingFeedback}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
