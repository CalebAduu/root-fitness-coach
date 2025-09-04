"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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
      const fitnessGoals = userMessages.find(msg => 
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

      // Parse gender (best-effort)
      const genderMessage = userMessages.find(msg => 
        /\b(male|man|boy|guy|he\/him|he\/ his|he\b)\b/i.test(msg.text) ||
        /\b(female|woman|girl|lady|she\/her|she\b)\b/i.test(msg.text) ||
        msg.text.toLowerCase().includes("gender")
      );
      let gender: string | undefined = undefined;
      if (genderMessage) {
        const t = genderMessage.text.toLowerCase();
        if (/(female|woman|girl|lady|she\/her|she\b)/.test(t)) gender = 'female';
        else if (/(male|man|boy|guy|he\/him|he\b)/.test(t)) gender = 'male';
      }

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
        msg.text.toLowerCase().includes("hurt")
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 shadow-2xl">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative px-6 py-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <img src="/logo.png" alt="Root Fitness Logo" className="w-16 h-16 mr-6" />
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Root AI Fitness Coach</h1>
              <p className="text-blue-100 text-lg">Your personal AI-powered fitness journey starts here</p>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Container */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
          {/* Chat Message Area */}
          <div className="h-[600px] p-8 overflow-y-auto bg-gradient-to-b from-white/90 to-blue-50/30">
            <div className="space-y-6">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-2xl rounded-2xl p-6 shadow-lg ${
                    message.sender === "user" 
                      ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white" 
                      : "bg-white text-gray-800 border border-gray-100"
                  }`}>
                    <p className="text-lg leading-relaxed">{message.text}</p>
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
                  <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 max-w-2xl">
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
                  <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl p-6 shadow-lg max-w-2xl">
                    <div className="flex items-center space-x-3">
                      <div className="w-5 h-5 bg-white/20 rounded-full animate-pulse"></div>
                      <span className="font-medium">Generating your personalized workout plan... 💪</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Input Form */}
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-8 border-t border-gray-100">
            <form onSubmit={handleSubmit} className="flex space-x-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Tell me about yourself..."
                  className="w-full p-4 pr-12 text-lg border-0 rounded-2xl bg-white shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all duration-200"
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
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg hover:shadow-xl hover:from-blue-600 hover:to-purple-700"
                }`}
                disabled={isLoading || isGeneratingPlan || !inputValue.trim()}
              >
                {isGeneratingPlan ? "Generating..." : isLoading ? "Sending..." : "Send"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
