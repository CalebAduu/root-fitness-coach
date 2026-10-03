"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import WhisperVoiceInput from "../../components/WhisperVoiceInput";
import { AppleIcon, ChatBubbleIcon, HeartIcon, MicIcon, NoteIcon, RocketIcon, RunningIcon, ScaleIcon } from "../../components/icons";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
}

interface NutritionData {
  goal: string;
  allergies?: string[];
  dietaryPattern?: string;
  medicalConditions?: string[];
  mealFrequency?: string;
  mealPreparation?: string;
  alcoholConsumption?: string;
  rateOfLoss?: string;
  previousDiets?: string[];
  challenges?: string[];
  proteinIntake?: string;
  supplements?: string[];
  energyNeeds?: string;
  healthManagement?: string[];
  nutrientMonitoring?: string[];
  healthConcerns?: string[];
  calorieGuidance?: string;
  mealPreferences?: string[];
  portionGuidance?: string;
}

const NUTRITION_GOALS = {
  general: {
    name: "General Information",
    description: "Basic nutrition preferences and dietary information",
    questions: [
      "Do you have any food allergies or intolerances (e.g., dairy, gluten, nuts)?",
      "Do you follow or prefer a specific dietary pattern (e.g., Mediterranean, American, vegetarian, vegan, ketogenic, intermittent fasting)?",
      "Do you have any medical conditions that affect diet (e.g., diabetes, hypertension, high cholesterol)?",
      "How many meals and snacks do you typically eat in a day?",
      "How often do you prepare meals at home versus eating out?",
      "Do you consume alcohol, and if so, how frequently?"
    ]
  },
  weight_loss: {
    name: "Weight Loss",
    description: "Personalized nutrition for weight loss goals",
    questions: [
      "What is your desired rate of weight loss (gradual, moderate, rapid)?",
      "Have you followed any weight loss diets before, and what challenges did you face?",
      "Do you tend to struggle more with portion sizes, snacking, or food choices?"
    ]
  },
  sports_performance: {
    name: "Sports Performance",
    description: "Nutrition optimization for athletic performance",
    questions: [
      "Do you require higher protein intake to support training or recovery?",
      "Do you use or plan to use performance-related supplements (e.g., protein powders, creatine, electrolytes)?",
      "Do you experience difficulties meeting energy needs during periods of heavy training?"
    ]
  },
  health_maintenance: {
    name: "Health Maintenance",
    description: "Nutrition for managing health conditions and wellness",
    questions: [
      "Are you currently managing cholesterol, blood pressure, or blood sugar through diet?",
      "Do you monitor your intake of specific nutrients (e.g., fiber, sodium, added sugar)?",
      "Are there particular health concerns you want your diet to address (e.g., gut health, heart health, longevity)?"
    ]
  },
  get_active: {
    name: "Get Active",
    description: "Nutrition guidance for starting an active lifestyle",
    questions: [
      "Do you want guidance on a balanced daily calorie intake for starting an active lifestyle?",
      "Do you have preferences for simpler, easy-to-prepare meals and snacks?",
      "Are you looking for portion guidance to help structure your eating habits?"
    ]
  }
};

export default function NutritionOnboardingPage() {
  const router = useRouter();
  const [selectedGoal, setSelectedGoal] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [nutritionData, setNutritionData] = useState<NutritionData | null>(null);
  const [useVoiceInput, setUseVoiceInput] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Initialize messages when goal is selected
  useEffect(() => {
    if (selectedGoal && messages.length === 0) {
      const goalInfo = NUTRITION_GOALS[selectedGoal as keyof typeof NUTRITION_GOALS];
      const welcomeMessage: Message = {
        id: "1",
        text: `Great choice! Let's personalize your ${goalInfo.name.toLowerCase()} nutrition plan. I'll ask you a few questions to understand your needs better. ${goalInfo.questions[0]}`,
        sender: "bot",
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [selectedGoal, messages.length]);

  // Function to parse nutrition data from conversation
  const parseNutritionData = (messages: Message[], goal: string): NutritionData | null => {
    const userMessages = messages.filter(msg => msg.sender === "user");
    const goalInfo = NUTRITION_GOALS[goal as keyof typeof NUTRITION_GOALS];
    
    // Check if we have enough responses - need exactly the number of questions
    if (userMessages.length < goalInfo.questions.length) {
      return null;
    }

    // Check if the last bot message indicates completion. The AI is instructed to append
    // this exact control token to its final message - matching it directly is far more
    // reliable than matching its (creative, temperature>0) celebratory wording.
    const lastBotMessage = messages.filter(msg => msg.sender === "bot").pop();
    if (!lastBotMessage?.text.includes("[NUTRITION_COMPLETE]")) {
      return null;
    }

    const data: NutritionData = { goal };

    // Parse responses based on goal
    if (goal === "general") {
      data.allergies = userMessages[0]?.text || "";
      data.dietaryPattern = userMessages[1]?.text || "";
      data.medicalConditions = userMessages[2]?.text || "";
      data.mealFrequency = userMessages[3]?.text || "";
      data.mealPreparation = userMessages[4]?.text || "";
      data.alcoholConsumption = userMessages[5]?.text || "";
    } else if (goal === "weight_loss") {
      data.rateOfLoss = userMessages[0]?.text || "";
      data.previousDiets = userMessages[1]?.text || "";
      data.challenges = userMessages[2]?.text || "";
    } else if (goal === "sports_performance") {
      data.proteinIntake = userMessages[0]?.text || "";
      data.supplements = userMessages[1]?.text || "";
      data.energyNeeds = userMessages[2]?.text || "";
    } else if (goal === "health_maintenance") {
      data.healthManagement = userMessages[0]?.text || "";
      data.nutrientMonitoring = userMessages[1]?.text || "";
      data.healthConcerns = userMessages[2]?.text || "";
    } else if (goal === "get_active") {
      data.calorieGuidance = userMessages[0]?.text || "";
      data.mealPreferences = userMessages[1]?.text || "";
      data.portionGuidance = userMessages[2]?.text || "";
    }

    return data;
  };

  // Function to generate nutrition plan
  const generateNutritionPlan = async (nutritionData: NutritionData) => {
    setIsGeneratingPlan(true);
    
    try {
      const response = await fetch("/api/generate-nutrition-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(nutritionData),
      });

      if (!response.ok) {
        throw new Error("Failed to generate nutrition plan");
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Store the nutrition plan
      sessionStorage.setItem("nutritionPlan", JSON.stringify(result));
      sessionStorage.setItem("nutritionData", JSON.stringify(nutritionData));
      
      // Add success message
      const successMessage: Message = {
        id: Date.now().toString(),
        text: "🎉 Your personalized nutrition plan has been generated! Redirecting you to view it...",
        sender: "bot",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, successMessage]);
      
      // Navigate back to workout plan page
      setTimeout(() => {
        router.push("/workout-plan");
      }, 2000);
      
    } catch (error) {
      console.error("Error generating nutrition plan:", error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        text: "Sorry, I had trouble generating your nutrition plan. Please try again!",
        sender: "bot",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  // Watch for nutrition data completion
  useEffect(() => {
    if (selectedGoal && messages.length > 0 && !isGeneratingPlan) {
      const parsedData = parseNutritionData(messages, selectedGoal);
      if (parsedData && !nutritionData) {
        setNutritionData(parsedData);
        generateNutritionPlan(parsedData);
      }
    }
  }, [messages, selectedGoal, isGeneratingPlan, nutritionData]);

  // overrideText lets voice input send its transcript directly, since state set via
  // setInputValue isn't visible to this closure until the next render.
  const handleSubmit = async (e?: React.FormEvent, overrideText?: string) => {
    e?.preventDefault();
    const messageText = (overrideText ?? inputValue).trim();

    if (messageText && !isLoading && !isGeneratingPlan) {
      setIsLoading(true);

      // Add user message
      const userMessage: Message = {
        id: Date.now().toString(),
        text: messageText,
        sender: "user",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, userMessage]);
      setInputValue("");
      
      try {
        // Convert messages to AI SDK format
        const aiMessages = messages.concat(userMessage).map(msg => ({
          role: msg.sender === "user" ? "user" : "assistant",
          content: msg.text
        }));

        // Call the nutrition chat API
        const response = await fetch("/api/nutrition-chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: aiMessages,
            goal: selectedGoal,
            currentQuestionIndex: currentQuestionIndex
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to get response");
        }

        // Handle streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let botMessage = "";
        let messageId = (Date.now() + 1).toString();

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            botMessage += chunk;
            
            // Update the message in real-time
            setMessages(prev => {
              const updatedMessages = [...prev];
              const existingBotMessage = updatedMessages.find(msg => msg.id === messageId);
              
              if (existingBotMessage) {
                existingBotMessage.text = botMessage;
              } else {
                updatedMessages.push({
                  id: messageId,
                  text: botMessage,
                  sender: "bot",
                  timestamp: new Date()
                });
              }
              
              return updatedMessages;
            });
          }
        }

        // Update question index
        setCurrentQuestionIndex(prev => prev + 1);
        
      } catch (error) {
        console.error("Chat error:", error);
        const errorMessage: Message = {
          id: Date.now().toString(),
          text: "Sorry, I'm having trouble connecting right now. Please try again!",
          sender: "bot",
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Goal selection screen
  if (!selectedGoal) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="relative overflow-hidden bg-gradient-to-r from-teal-600 via-blue-600 to-indigo-700 shadow-2xl">
          <div className="absolute inset-0 bg-black/5"></div>
          <div className="relative px-6 py-8 text-center">
            <div className="flex items-center justify-center mb-4">
              <img src="/logo.png" alt="Root Fitness Logo" className="w-16 h-16 mr-6 object-contain" />
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">Nutrition Planning</h1>
                <p className="text-blue-100 text-lg">Choose your nutrition focus area</p>
              </div>
            </div>
          </div>
        </header>

        {/* Goal Selection */}
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">What's your nutrition focus?</h2>
            <p className="text-gray-600 text-lg">Select the area that best matches your goals</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Object.entries(NUTRITION_GOALS).map(([key, goal]) => {
              const GoalIcon =
                key === "general" ? AppleIcon :
                key === "weight_loss" ? ScaleIcon :
                key === "sports_performance" ? RunningIcon :
                key === "health_maintenance" ? HeartIcon : RocketIcon;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedGoal(key)}
                  className="group bg-white rounded-2xl p-8 shadow-lg border border-gray-200 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 hover:border-teal-300"
                >
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-r from-teal-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                      <GoalIcon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{goal.name}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{goal.description}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="text-center mt-12">
            <button
              onClick={() => router.push("/workout-plan")}
              className="bg-gray-200 text-gray-900 px-6 py-3 rounded-xl hover:bg-gray-300 transition-colors border border-gray-300"
            >
              ← Back to Workout Plan
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Chat interface
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="relative overflow-hidden bg-gradient-to-r from-teal-600 via-blue-600 to-indigo-700 shadow-2xl">
        <div className="absolute inset-0 bg-black/5"></div>
        <div className="relative px-6 py-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <img src="/logo.png" alt="Root Fitness Logo" className="w-16 h-16 mr-6 object-contain" />
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Nutrition Planning</h1>
              <p className="text-blue-100 text-lg">{NUTRITION_GOALS[selectedGoal as keyof typeof NUTRITION_GOALS].name}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Container */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
          {/* Chat Message Area */}
          <div className="h-[600px] p-8 overflow-y-auto bg-gray-50">
            <div className="space-y-6">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-2xl rounded-2xl p-6 shadow-lg ${
                    message.sender === "user" 
                      ? "bg-gradient-to-r from-teal-500 to-blue-600 text-white" 
                      : "bg-white text-gray-800 border border-gray-200"
                  }`}>
                    <p className="text-lg leading-relaxed">
                      {/* Strips the control token even mid-stream, where only a partial prefix like "[NUTRITION_C" has arrived so far */}
                      {message.text.replace(/\[N?U?T?R?I?T?I?O?N?_?C?O?M?P?L?E?T?E?\]?$/, "").trim()}
                    </p>
                    <p className={`text-sm mt-3 opacity-80 ${
                      message.sender === "user" ? "text-blue-100" : "text-gray-500"
                    }`}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              
              {/* Loading indicator */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 max-w-2xl">
                    <div className="flex items-center space-x-3">
                      <div className="flex space-x-1">
                        <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
                        <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                      <span className="text-gray-600">Root is thinking...</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Plan Generation indicator */}
              {isGeneratingPlan && (
                <div className="flex justify-start">
                  <div className="bg-gradient-to-r from-teal-500 to-blue-600 text-white rounded-2xl p-6 shadow-lg max-w-2xl">
                    <div className="flex items-center space-x-3">
                      <div className="w-5 h-5 bg-white/20 rounded-full animate-pulse"></div>
                      <span className="font-medium inline-flex items-center gap-1.5">
                        Generating your personalized nutrition plan...
                        <AppleIcon className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Input Form */}
          <div className="bg-gray-100 p-8 border-t border-gray-200">
            {/* Voice/Text Toggle */}
            <div className="flex items-center justify-center space-x-4 mb-6">
              <button
                onClick={() => setUseVoiceInput(false)}
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                  !useVoiceInput 
                    ? 'bg-gradient-to-r from-teal-500 to-blue-600 text-white shadow-lg' 
                    : 'bg-white text-gray-600 hover:bg-gray-50 shadow-md border border-gray-200'
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <NoteIcon className="w-4 h-4" />
                  Text
                </span>
              </button>
              <button
                onClick={() => setUseVoiceInput(true)}
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                  useVoiceInput
                    ? 'bg-gradient-to-r from-teal-500 to-blue-600 text-white shadow-lg'
                    : 'bg-white text-gray-600 hover:bg-gray-50 shadow-md border border-gray-200'
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <MicIcon className="w-4 h-4" />
                  Voice (Whisper)
                </span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex space-x-4">
              {useVoiceInput ? (
                <div className="flex-1 flex items-center justify-center">
                  <WhisperVoiceInput
                    onTranscript={(text) => {
                      if (text.trim()) {
                        handleSubmit(undefined, text);
                      }
                    }}
                    onError={(error) => {
                      console.error('Voice input error:', error);
                      alert(`Voice input error: ${error}`);
                    }}
                    disabled={isLoading || isGeneratingPlan}
                    className="flex-shrink-0"
                  />
                </div>
              ) : (
                <>
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="Tell me about your nutrition needs..."
                      className="w-full p-4 pr-12 text-lg border-0 rounded-2xl bg-white shadow-lg focus:outline-none focus:ring-4 focus:ring-teal-500/20 transition-all duration-200"
                      disabled={isLoading || isGeneratingPlan}
                    />
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                      <ChatBubbleIcon className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                  <button 
                    type="submit" 
                    className={`px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-200 transform hover:scale-105 ${
                      isLoading || isGeneratingPlan || !inputValue.trim()
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-gradient-to-r from-teal-500 to-blue-600 text-white shadow-lg hover:shadow-xl hover:from-teal-600 hover:to-blue-700"
                    }`}
                    disabled={isLoading || isGeneratingPlan || !inputValue.trim()}
                  >
                    {isGeneratingPlan ? "Generating..." : isLoading ? "Sending..." : "Send"}
                  </button>
                </>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}


