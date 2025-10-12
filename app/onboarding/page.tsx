"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import WhisperVoiceInput from "../../components/WhisperVoiceInput";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
}

interface UserData {
  name: string;
  age: number;
  height: string;
  weight: number;
  fitnessGoals: string;
  experienceLevel: string;
  gymAccess: boolean;
  equipment: string[];
  injuries: string[];
  workoutDays: number;
  gender?: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hi! I'm Root, your personal AI fitness coach. To get started, what's your name?",
      sender: "bot",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [useVoiceInput, setUseVoiceInput] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [planProgress, setPlanProgress] = useState(0);

  // Function to parse user data from conversation
  const parseUserData = (messages: Message[]): UserData | null => {
    const userMessages = messages.filter(msg => msg.sender === "user");
    const botMessages = messages.filter(msg => msg.sender === "bot");
    
    // Check if we have the end message indicating onboarding is complete
    const lastBotMessage = botMessages[botMessages.length - 1];
    if (!lastBotMessage?.text.includes("BOOM! We're all set up")) {
      return null;
    }

    // Helper: basic Levenshtein distance
    const levenshtein = (a: string, b: string) => {
      const m = a.length, n = b.length;
      const dp = Array.from({ length: m + 1 }, (_, i) => Array(n + 1).fill(0));
      for (let i = 0; i <= m; i++) dp[i][0] = i;
      for (let j = 0; j <= n; j++) dp[0][j] = j;
      for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
          const cost = a[i - 1] === b[j - 1] ? 0 : 1;
          dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
        }
      }
      return dp[m][n];
    };

    const approxHasWord = (hay: string, word: string, threshold = 2) => {
      const tokens = hay.toLowerCase().split(/[^a-z]+/).filter(Boolean);
      return tokens.some(t => levenshtein(t, word) <= threshold);
    };

    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

    // Helper: extract name robustly
    const extractName = (): string => {
      // Search newest-to-oldest user messages using common patterns
      const patterns = [
        /my name is\s+([^.,!\n\r]+)/i,
        /i am\s+([^.,!\n\r]+)/i,
        /i'm\s+([^.,!\n\r]+)/i
      ];
      for (let i = userMessages.length - 1; i >= 0; i--) {
        const text = userMessages[i].text.trim();
        for (const p of patterns) {
          const m = text.match(p);
          if (m && m[1]) {
            const candidate = m[1].trim();
            if (candidate.length > 0) return candidate; // preserve as-is
          }
        }
      }

      // Fallback: use the first user reply after the name prompt, as-is
      const namePromptIdx = messages.findIndex(m => m.sender === 'bot' && /name/i.test(m.text));
      const userAfterPrompt = namePromptIdx >= 0
        ? messages.slice(namePromptIdx + 1).find(m => m.sender === 'user')
        : userMessages[0];
      if (userAfterPrompt && userAfterPrompt.text && userAfterPrompt.text.trim().length > 0) {
        return userAfterPrompt.text.trim();
      }

      // Final fallback: if absolutely nothing, return 'User'
      return "User";
    };

    try {
      // Extract user data from conversation
      const name = extractName();

      const ageMatch = userMessages.find(msg => /\d+/.test(msg.text))?.text.match(/\d+/);
      const age = ageMatch ? parseInt(ageMatch[0]) : 25;

      // Parse height with proper unit handling
      const heightMessage = userMessages.find(msg => 
        msg.text.toLowerCase().includes("height") || 
        msg.text.toLowerCase().includes("'") ||
        msg.text.toLowerCase().includes("cm") ||
        msg.text.toLowerCase().includes("inch") ||
        msg.text.toLowerCase().includes("feet")
      );
      
      let height = "5'10\"";
      if (heightMessage) {
        const heightText = heightMessage.text.toLowerCase();
        
        // Look for "X feet Y inches" format (e.g., "5 feet 8 inches", "5 ft 8 in")
        const feetInchesWordsMatch = heightText.match(/(\d+)\s*(?:feet?|ft)\s*(\d+)\s*(?:inches?|in)/);
        if (feetInchesWordsMatch) {
          const feet = parseInt(feetInchesWordsMatch[1]);
          const inches = parseInt(feetInchesWordsMatch[2]);
          height = `${feet}'${inches}"`;
        } else {
          // Look for feet and inches format with symbols (e.g., "5'10"", "5' 10\"")
          const feetInchesMatch = heightText.match(/(\d+)\s*['\u2032]\s*(\d+)\s*["\u2033]?/);
          if (feetInchesMatch) {
            const feet = parseInt(feetInchesMatch[1]);
            const inches = parseInt(feetInchesMatch[2]);
            height = `${feet}'${inches}"`;
          } else {
            // Look for just feet (e.g., "5 feet", "5 ft")
            const feetOnlyMatch = heightText.match(/(\d+)\s*(?:feet?|ft)/);
            if (feetOnlyMatch) {
              const feet = parseInt(feetOnlyMatch[1]);
              height = `${feet}'0"`;
            } else {
              // Look for cm format
              const cmMatch = heightText.match(/(\d+)\s*cm/);
              if (cmMatch) {
                const cm = parseInt(cmMatch[1]);
                const totalInches = Math.round(cm / 2.54);
                const feet = Math.floor(totalInches / 12);
                const inches = totalInches % 12;
                height = `${feet}'${inches}"`;
              } else {
                // Look for just inches
                const inchesMatch = heightText.match(/(\d+)\s*inches?/);
                if (inchesMatch) {
                  const totalInches = parseInt(inchesMatch[1]);
                  const feet = Math.floor(totalInches / 12);
                  const inches = totalInches % 12;
                  height = `${feet}'${inches}"`;
                }
              }
            }
          }
        }
      }

      // Parse weight with proper unit handling and conversion
      const weightMessage = userMessages.find(msg => 
        msg.text.toLowerCase().includes("weight") || 
        msg.text.toLowerCase().includes("lbs") ||
        msg.text.toLowerCase().includes("kg") ||
        msg.text.toLowerCase().includes("pound")
      );
      
      let weight = 150; // Default in lbs
      if (weightMessage) {
        const weightText = weightMessage.text.toLowerCase();
        // Look for kg format
        const kgMatch = weightText.match(/(\d+(?:\.\d+)?)\s*kg/);
        if (kgMatch) {
          const kg = parseFloat(kgMatch[1]);
          weight = Math.round(kg * 2.20462); // Convert kg to lbs
        } else {
          // Look for lbs format
          const lbsMatch = weightText.match(/(\d+(?:\.\d+)?)\s*lbs?/);
          if (lbsMatch) {
            weight = Math.round(parseFloat(lbsMatch[1]));
          } else {
            // Look for pounds format
            const poundsMatch = weightText.match(/(\d+(?:\.\d+)?)\s*pounds?/);
            if (poundsMatch) {
              weight = Math.round(parseFloat(poundsMatch[1]));
            } else {
              // If no unit specified, assume lbs (or you could make this configurable)
              const numberMatch = weightText.match(/(\d+(?:\.\d+)?)/);
              if (numberMatch) {
                weight = Math.round(parseFloat(numberMatch[1]));
              }
            }
          }
        }
      }

      // Parse goals (allow free text)
      const fitnessGoalsRaw = userMessages.find(msg => 
        msg.text.toLowerCase().includes("goal") || 
        msg.text.toLowerCase().includes("want") ||
        msg.text.toLowerCase().includes("build") ||
        msg.text.toLowerCase().includes("lose") ||
        msg.text.toLowerCase().includes("tone") ||
        msg.text.toLowerCase().includes("glute") ||
        msg.text.toLowerCase().includes("butt") ||
        msg.text.toLowerCase().includes("booty") ||
        msg.text.toLowerCase().includes("abs") ||
        msg.text.toLowerCase().includes("core") ||
        msg.text.toLowerCase().includes("arms") ||
        msg.text.toLowerCase().includes("shoulder") ||
        msg.text.toLowerCase().includes("back") ||
        msg.text.toLowerCase().includes("legs")
      )?.text || "General fitness";

      // Function to generalize fitness goals for display
      const generalizeFitnessGoals = (goalsText: string, gender?: string): string => {
        const text = goalsText.toLowerCase();
        
        // Check for common goal combinations
        if (text.includes("lose") && text.includes("weight") && (text.includes("build") || text.includes("muscle") || text.includes("gain"))) {
          return gender === 'female' ? "Lose Weight & Tone" : "Lose Weight & Build Muscle";
        }
        if (text.includes("lose") && text.includes("weight")) {
          return "Lose Weight";
        }
        if (text.includes("build") && text.includes("muscle")) {
          return gender === 'female' ? "Tone & Strengthen" : "Build Muscle";
        }
        if (text.includes("gain") && text.includes("muscle")) {
          return gender === 'female' ? "Tone & Strengthen" : "Build Muscle";
        }
        if (text.includes("tone") || text.includes("toning")) {
          return "Tone & Strengthen";
        }
        if (text.includes("strength") || text.includes("stronger")) {
          return gender === 'female' ? "Build Strength & Tone" : "Build Strength";
        }
        if (text.includes("endurance") || text.includes("stamina")) {
          return "Improve Endurance";
        }
        if (text.includes("flexibility") || text.includes("mobility")) {
          return "Improve Flexibility";
        }
        if (text.includes("abs") || text.includes("core")) {
          return gender === 'female' ? "Core Toning" : "Core Strength";
        }
        if (text.includes("glute") || text.includes("butt") || text.includes("booty")) {
          return "Glute Development";
        }
        if (text.includes("arms") || text.includes("bicep") || text.includes("tricep")) {
          return gender === 'female' ? "Arm Toning" : "Arm Development";
        }
        if (text.includes("legs") || text.includes("thigh") || text.includes("calf")) {
          return gender === 'female' ? "Leg Toning" : "Leg Development";
        }
        if (text.includes("back") || text.includes("shoulder")) {
          return gender === 'female' ? "Upper Body Toning" : "Upper Body Strength";
        }
        if (text.includes("cardio") || text.includes("fitness") || text.includes("health")) {
          return "General Fitness";
        }
        
        // Default fallback
        return "General Fitness";
      };

      // Parse gender first to use in goal generalization
      const genderMessage = userMessages.find(msg => 
        /\b(male|man|boy|guy|he\/him|he\/ his|he\b|masculine)\b/i.test(msg.text) ||
        /\b(female|woman|girl|lady|she\/her|she\b|feminine)\b/i.test(msg.text) ||
        msg.text.toLowerCase().includes("gender") ||
        msg.text.toLowerCase().includes("i am a") ||
        msg.text.toLowerCase().includes("i'm a")
      );
      let gender: string | undefined = undefined;
      if (genderMessage) {
        const t = genderMessage.text.toLowerCase();
        if (/(female|woman|girl|lady|she\/her|she\b|feminine)/.test(t)) gender = 'female';
        else if (/(male|man|boy|guy|he\/him|he\b|masculine)/.test(t)) gender = 'male';
      }

      const fitnessGoals = generalizeFitnessGoals(fitnessGoalsRaw, gender);

      // Parse experience level (with fuzzy matching)
      const combined = userMessages.map(m => m.text.toLowerCase()).join(" ");
      let experienceLevel = "Beginner"; // Default
      if (approxHasWord(combined, "advanced")) {
        experienceLevel = "Advanced";
      } else if (approxHasWord(combined, "intermediate")) {
        experienceLevel = "Intermediate";
      } else if (approxHasWord(combined, "beginner")) {
        experienceLevel = "Beginner";
      } else {
        // Try common misspellings explicitly
        if (/(intermidiate|intermediat|intermediatee)/.test(combined)) experienceLevel = "Intermediate";
        if (/(advnced|adavanced|advenced)/.test(combined)) experienceLevel = "Advanced";
      }

      const gymAccess = userMessages.some(msg => 
        msg.text.toLowerCase().includes("gym") && 
        !msg.text.toLowerCase().includes("no") &&
        !msg.text.toLowerCase().includes("don't")
      );

      const equipment = userMessages.find(msg => 
        msg.text.toLowerCase().includes("equipment") || 
        msg.text.toLowerCase().includes("dumbbell") ||
        msg.text.toLowerCase().includes("home")
      )?.text.split(",").map(item => item.trim()) || [];

      const injuries = userMessages.find(msg => 
        msg.text.toLowerCase().includes("injury") || 
        msg.text.toLowerCase().includes("pain") ||
        msg.text.toLowerCase().includes("hurt") ||
        msg.text.toLowerCase().includes("condition") ||
        msg.text.toLowerCase().includes("health") ||
        msg.text.toLowerCase().includes("medical") ||
        msg.text.toLowerCase().includes("chronic") ||
        msg.text.toLowerCase().includes("joint") ||
        msg.text.toLowerCase().includes("back") ||
        msg.text.toLowerCase().includes("knee") ||
        msg.text.toLowerCase().includes("shoulder") ||
        msg.text.toLowerCase().includes("wrist") ||
        msg.text.toLowerCase().includes("ankle") ||
        msg.text.toLowerCase().includes("none") ||
        msg.text.toLowerCase().includes("no injuries") ||
        msg.text.toLowerCase().includes("no health")
      )?.text.split(",").map(item => item.trim()) || [];

      // Parse workout days robustly
      let workoutDays = 3;
      const daysPatterns = [/(\d+)\s*days?/i, /workout\s*(\d+)/i, /available\s*(\d+)/i];
      // Prefer messages that mention days explicitly
      for (let i = userMessages.length - 1; i >= 0; i--) {
        const text = userMessages[i].text;
        for (const p of daysPatterns) {
          const m = text.match(p);
          if (m && m[1]) { workoutDays = Math.max(1, Math.min(7, parseInt(m[1]))); break; }
        }
        if (workoutDays !== 3) break;
      }
      // Fallback to last standalone number between 1..7
      if (workoutDays === 3) {
        for (let i = userMessages.length - 1; i >= 0; i--) {
          const nums = (userMessages[i].text.match(/\d+/g) || []).map(n => parseInt(n)).filter(n => n >= 1 && n <= 7);
          if (nums.length) { workoutDays = nums[nums.length - 1]; break; }
        }
      }

      return {
        name,
        age,
        height,
        weight,
        fitnessGoals,
        experienceLevel,
        gymAccess,
        equipment,
        injuries,
        workoutDays,
        gender
      };
    } catch (error) {
      console.error("Error parsing user data:", error);
      return null;
    }
  };

  // Function to generate workout plan
  const generateWorkoutPlan = async (userData: UserData) => {
    setIsGeneratingPlan(true);
    setCurrentStep(5);
    
    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setPlanProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 200);
    
    try {
      const response = await fetch("/api/generate-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        throw new Error("Failed to generate workout plan");
      }

      const result = await response.json();
      
      // Check if we have an error in the response
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Extract the workout plan (remove database IDs for storage)
      const { profileId, planId, ...workoutPlan } = result;
      
      // Store the workout plan in sessionStorage
      sessionStorage.setItem("workoutPlan", JSON.stringify(workoutPlan));
      sessionStorage.setItem("userData", JSON.stringify(userData));
      
      // Store database IDs separately
      if (profileId) {
        sessionStorage.setItem("profileId", profileId);
        console.log("Profile saved with ID:", profileId);
      }
      if (planId) {
        sessionStorage.setItem("planId", planId);
        console.log("Plan saved with ID:", planId);
      }
      
      // Add success message to chat
      const successMessage: Message = {
        id: Date.now().toString(),
        text: "🎉 Your workout plan has been generated and saved! Redirecting you to view it...",
        sender: "bot",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, successMessage]);
      
      // Navigate to workout plan page after a short delay
      setTimeout(() => {
        router.push("/workout-plan");
      }, 2000);
      
    } catch (error) {
      console.error("Error generating workout plan:", error);
      // Add error message to chat
      const errorMessage: Message = {
        id: Date.now().toString(),
        text: "Sorry, I had trouble generating your workout plan. Please try again!",
        sender: "bot",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsGeneratingPlan(false);
      clearInterval(progressInterval);
    }
  };

  // Watch for onboarding completion
  useEffect(() => {
    if (messages.length > 0 && !isGeneratingPlan) {
      const parsedData = parseUserData(messages);
      if (parsedData && !userData) {
        setUserData(parsedData);
        generateWorkoutPlan(parsedData);
      }
    }
  }, [messages, isGeneratingPlan, userData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (inputValue.trim() && !isLoading && !isGeneratingPlan) {
      setIsLoading(true);
      
      // Add user message
      const userMessage: Message = {
        id: Date.now().toString(),
        text: inputValue.trim(),
        sender: "user",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, userMessage]);
      const currentInput = inputValue.trim();
      setInputValue("");
      
      try {
        // Convert messages to AI SDK format
        const aiMessages = messages.concat(userMessage).map(msg => ({
          role: msg.sender === "user" ? "user" : "assistant",
          content: msg.text
        }));

        // Call the API
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: aiMessages
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to get response");
        }

        // Handle streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let botMessage = "";
        let messageId = Date.now().toString();

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            botMessage += chunk;
            
            // Update the message in real-time as it streams
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
      } catch (error) {
        console.error("Chat error:", error);
        // Add error message
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

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <img src="/logo.png" alt="Root AI Logo" className="w-8 h-8 mr-3" />
                <span className="text-white text-xl font-bold">Root AI</span>
              </div>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center">
              <span className="text-white text-lg font-medium">
                {currentStep === 1 ? "Onboarding" : currentStep === 2 ? "Your Goals" : currentStep === 3 ? "Your Experience" : currentStep === 4 ? "Your Setup" : "Your Plan"}
              </span>
              <div className="ml-4 w-2 h-2 bg-teal-500 rounded-full"></div>
            </div>

            {/* Hamburger Menu */}
            <div className="flex items-center">
              <button className="text-gray-400 hover:text-white p-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Chat Container */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
          {/* Chat Messages */}
          <div className="h-[600px] p-6 overflow-y-auto">
            <div className="space-y-6">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
                  <div className="flex items-start space-x-3 max-w-2xl">
                    {message.sender === "bot" && (
                      <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <img src="/logo.png" alt="Root AI" className="w-6 h-6" />
                      </div>
                    )}
                    
                    <div className={`rounded-2xl p-4 ${
                      message.sender === "user" 
                        ? "bg-teal-500 text-white" 
                        : "bg-gray-700 text-gray-100"
                    }`}>
                      <p className="text-base leading-relaxed">{message.text}</p>
                    </div>

                    {message.sender === "user" && (
                      <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-lg font-bold">U</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Loading indicator */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <img src="/logo.png" alt="Root AI" className="w-6 h-6" />
                    </div>
                    <div className="bg-gray-700 rounded-2xl p-4">
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                        <span className="text-gray-300 text-sm">Root is thinking...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Plan Generation Section */}
              {isGeneratingPlan && (
                <div className="flex justify-start">
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <img src="/logo.png" alt="Root AI" className="w-6 h-6" />
                    </div>
                    <div className="bg-gray-700 rounded-2xl p-6 max-w-md">
                      <p className="text-gray-100 mb-4">Based on your goals, experience, and equipment, I'm now creating your personalized 'Full Body Revival' plan.</p>
                      
                      <div className="mb-4">
                        <p className="text-white font-medium mb-2">Generating Plan...</p>
                        <div className="w-full bg-gray-600 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(planProgress, 100)}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                            <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 8 8">
                              <path d="M6.564.75a.75.75 0 0 1 1.06 1.06L3.06 6.314a.75.75 0 0 1-1.06 0L.44 4.694a.75.75 0 1 1 1.06-1.06l1.06 1.06L6.564.75Z"/>
                            </svg>
                          </div>
                          <span className="text-green-400 text-sm">Optimize Workouts...</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 bg-gray-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">N</span>
                          </div>
                          <span className="text-gray-400 text-sm">Finalizing Nutrition...</span>
                        </div>
                      </div>

                      {/* Decorative icons */}
                      <div className="flex justify-end mt-4">
                        <div className="flex space-x-1">
                          <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">H</span>
                          </div>
                          <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">W</span>
                          </div>
                          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">N</span>
                          </div>
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">P</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Input Area */}
          <div className="bg-gray-750 border-t border-gray-700 p-6">
            {useVoiceInput ? (
              /* Voice Input Mode */
              <div className="flex flex-col items-center space-y-4">
                <WhisperVoiceInput
                  onTranscript={(text) => {
                    setInputValue(text);
                    // Auto-send after transcription
                    setTimeout(() => {
                      if (text.trim()) {
                        handleSubmit(new Event('submit') as any);
                      }
                    }, 500);
                  }}
                  onError={(error) => {
                    console.error('Voice input error:', error);
                    alert(`Voice input error: ${error}`);
                  }}
                  disabled={isLoading || isGeneratingPlan}
                  className="flex-shrink-0"
                />
                <p className="text-gray-400 text-sm text-center">
                  Click the microphone to start recording your message
                </p>
              </div>
            ) : (
              /* Text Input Mode */
              <form onSubmit={handleSubmit} className="flex space-x-4">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Tell me about yourself..."
                    className="w-full p-4 pr-12 text-gray-100 bg-gray-700 border border-gray-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
                    disabled={isLoading || isGeneratingPlan}
                  />
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                    <span className="text-gray-400 text-xl">💬</span>
                  </div>
                </div>
                <button 
                  type="submit" 
                  className={`px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-200 transform hover:scale-105 ${
                    isLoading || isGeneratingPlan || !inputValue.trim()
                      ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                      : "bg-orange-500 text-white hover:bg-orange-600 shadow-lg hover:shadow-xl"
                  }`}
                  disabled={isLoading || isGeneratingPlan || !inputValue.trim()}
                >
                  {isGeneratingPlan ? "Generating..." : isLoading ? "Sending..." : "Send"}
                </button>
              </form>
            )}

            {/* Voice Input Toggle */}
            <div className="flex items-center justify-center space-x-4 mt-4">
              <button
                onClick={() => setUseVoiceInput(false)}
                className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 flex items-center space-x-2 ${
                  !useVoiceInput 
                    ? 'bg-teal-500 text-white' 
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Text</span>
              </button>
              <button
                onClick={() => setUseVoiceInput(true)}
                className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 flex items-center space-x-2 ${
                  useVoiceInput 
                    ? 'bg-teal-500 text-white' 
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                <span>Voice</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}