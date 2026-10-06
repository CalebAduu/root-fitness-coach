"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import WhisperVoiceInput from "../../components/WhisperVoiceInput";
import { parseInjuryReply } from "../../lib/injuries";

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

const LOADING_MESSAGES = [
  "Analyzing your goals...",
  "Reviewing your experience level...",
  "Selecting the best exercises for you...",
  "Building your weekly schedule...",
  "Optimizing for your equipment...",
  "Adding finishing touches...",
  "All done! Redirecting you now..."
];

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
  const [hasStartedChat, setHasStartedChat] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  // Function to parse user data from conversation
  const parseUserData = (messages: Message[]): UserData | null => {
    const userMessages = messages.filter(msg => msg.sender === "user");
    const botMessages = messages.filter(msg => msg.sender === "bot");
    
    // Check if we have the end message indicating onboarding is complete.
    // The AI is instructed to append this exact control token to its final
    // message - matching it directly is far more reliable than matching its
    // (creative, temperature>0) celebratory wording, which varies per request.
    const lastBotMessage = botMessages[botMessages.length - 1];
    if (!lastBotMessage?.text.includes("[ONBOARDING_COMPLETE]")) {
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
      // The name is always the user's first reply, since onboarding opens by asking for it.
      // Patterns are matched only within that reply - matching across the whole conversation
      // let later answers like "No injuries, I'm healthy" get mistaken for the name.
      const patterns = [
        /my name is\s+([^.,!\n\r]+)/i,
        /i am\s+([^.,!\n\r]+)/i,
        /i'm\s+([^.,!\n\r]+)/i
      ];

      const namePromptIdx = messages.findIndex(m => m.sender === 'bot' && /name/i.test(m.text));
      const userAfterPrompt = namePromptIdx >= 0
        ? messages.slice(namePromptIdx + 1).find(m => m.sender === 'user')
        : userMessages[0];

      if (userAfterPrompt && userAfterPrompt.text && userAfterPrompt.text.trim().length > 0) {
        const text = userAfterPrompt.text.trim();
        for (const p of patterns) {
          const m = text.match(p);
          if (m && m[1]) {
            const candidate = m[1].trim();
            if (candidate.length > 0) return candidate; // preserve as-is
          }
        }
        return text;
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

      // Injuries: use the user's reply to the injury question. (Matching the first message that mentions
      // "back" or "health" picked up unrelated answers, e.g. the goals reply, and missed the real injury.)
      const injuryPromptIdx = messages.findIndex(m => m.sender === 'bot' && /injur|medical|health condition/i.test(m.text));
      const injuryReply = injuryPromptIdx >= 0
        ? messages.slice(injuryPromptIdx + 1).find(m => m.sender === 'user')?.text
        : undefined;
      const injuries = parseInjuryReply(injuryReply);

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
    setPlanProgress(0);
    setLoadingMessageIndex(0);

    // Simulate progress updates, holding just under 100% until the real response lands
    const progressInterval = setInterval(() => {
      setPlanProgress(prev => (prev >= 92 ? prev : prev + Math.random() * 10));
    }, 400);

    const messageInterval = setInterval(() => {
      setLoadingMessageIndex(prev => (prev + 1) % (LOADING_MESSAGES.length - 1));
    }, 1800);

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
      
      // Add success message to chat (visible once the user is back on this page/history)
      const successMessage: Message = {
        id: Date.now().toString(),
        text: "🎉 Your workout plan has been generated and saved! Redirecting you to view it...",
        sender: "bot",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, successMessage]);

      // Finish the progress bar and show the "done" message before redirecting,
      // instead of yanking the user away mid-animation.
      clearInterval(progressInterval);
      clearInterval(messageInterval);
      setPlanProgress(100);
      setLoadingMessageIndex(LOADING_MESSAGES.length - 1);

      setTimeout(() => {
        router.push("/workout-plan");
      }, 1200);

    } catch (error) {
      console.error("Error generating workout plan:", error);
      clearInterval(progressInterval);
      clearInterval(messageInterval);
      // Add error message to chat
      const errorMessage: Message = {
        id: Date.now().toString(),
        text: "Sorry, I had trouble generating your workout plan. Please try again!",
        sender: "bot",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
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
    <div className="min-h-screen bg-gray-900 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />

      {/* Header */}
      <header className="relative bg-gray-900/80 backdrop-blur border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <img src="/logo.png" alt="Root AI Logo" className="w-10 h-10 mr-3 object-contain" />
                <span className="text-white text-xl font-bold">Root AI</span>
              </div>
            </div>

            {/* Step Indicator */}
            {hasStartedChat && (
              <div className="hidden sm:flex items-center gap-2 bg-gray-800/80 border border-gray-700 rounded-full px-4 py-1.5">
                <span className="w-2 h-2 bg-green-400 rounded-full" />
                <span className="text-sm text-gray-200 font-medium">
                  {currentStep === 1 ? "Onboarding" : currentStep === 2 ? "Your Goals" : currentStep === 3 ? "Your Experience" : currentStep === 4 ? "Your Setup" : "Your Plan"}
                </span>
              </div>
            )}

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

      {!hasStartedChat ? (
        /* Welcome Hero */
        <div
          className="relative flex flex-col items-center justify-center text-center px-6"
          style={{ minHeight: "calc(100vh - 4rem)" }}
        >
          <div className="relative w-36 h-36 sm:w-44 sm:h-44 mb-8 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-teal-400 via-blue-500 to-purple-500 blur-2xl opacity-40 animate-pulse-glow" />
            <img src="/logo.png" alt="Root AI" className="relative w-full h-full object-contain" />
          </div>

          <div className="inline-flex items-center gap-2 bg-gray-800/80 border border-gray-700 rounded-full px-4 py-1.5 mb-6">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-sm text-gray-300 font-medium">Online</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 max-w-xl">
            Your Personal AI Fitness Coach
          </h1>
          <p className="text-gray-400 max-w-md mb-10 leading-relaxed">
            {messages[0].text}
          </p>

          <button
            onClick={() => setHasStartedChat(true)}
            className="px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-full shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-105 transition-all duration-200"
          >
            Let's Start Chatting
          </button>
        </div>
      ) : (
        /* Main Chat Container */
        <div className="relative max-w-4xl mx-auto px-4 py-8">
          <div className="bg-gray-800/60 backdrop-blur border border-gray-700/50 rounded-3xl shadow-2xl overflow-hidden">
            {/* Chat header pill */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-700/50">
              <img src="/logo.png" alt="Root AI" className="w-10 h-10 object-contain flex-shrink-0" />
              <div>
                <p className="text-white font-semibold text-sm">Root AI Coach</p>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                  <span className="text-xs text-gray-400">Online</span>
                </div>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="h-[560px] p-6 overflow-y-auto">
              <div className="space-y-6">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
                    <div className="flex items-start space-x-3 max-w-2xl">
                      {message.sender === "bot" && (
                        <img src="/logo.png" alt="Root AI" className="w-9 h-9 object-contain flex-shrink-0" />
                      )}

                      <div className={`rounded-2xl px-4 py-3 ${
                        message.sender === "user"
                          ? "bg-gradient-to-br from-teal-500 to-teal-600 text-white"
                          : "bg-gray-800/80 border border-gray-700/60 text-gray-100"
                      }`}>
                        <p className="text-base leading-relaxed">
                          {/* Strips the control token even mid-stream, where only a partial prefix like "[ONBOARD" has arrived so far */}
                          {message.text.replace(/\[O?N?B?O?A?R?D?I?N?G?_?C?O?M?P?L?E?T?E?\]?$/, "").trim()}
                        </p>
                      </div>

                      {message.sender === "user" && (
                        <div className="w-9 h-9 bg-gray-700 border border-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-sm font-bold">U</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="flex items-start space-x-3">
                      <img src="/logo.png" alt="Root AI" className="w-9 h-9 object-contain flex-shrink-0" />
                      <div className="bg-gray-800/80 border border-gray-700/60 rounded-2xl p-4">
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

              </div>
            </div>

            {/* Input Area */}
            <div className="border-t border-gray-700/50 p-4 sm:p-6">
              {useVoiceInput ? (
                /* Voice Input Mode */
                <div className="flex flex-col items-center py-2">
                  <WhisperVoiceInput
                    variant="orb"
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
                  />
                  <button
                    onClick={() => setUseVoiceInput(false)}
                    className="mt-5 flex items-center gap-2 text-gray-400 hover:text-white text-sm font-medium transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Switch to text
                  </button>
                </div>
              ) : (
                /* Text Input Mode */
                <form onSubmit={handleSubmit} className="flex items-center gap-2 bg-gray-900/70 border border-gray-700 rounded-full pl-2 pr-2 py-2">
                  <button
                    type="button"
                    onClick={() => setUseVoiceInput(true)}
                    disabled={isLoading || isGeneratingPlan}
                    className="p-2.5 rounded-full text-gray-400 hover:text-teal-400 hover:bg-gray-800 transition-colors flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Switch to voice"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </button>

                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Tell me about yourself..."
                    className="flex-1 bg-transparent text-gray-100 placeholder-gray-500 focus:outline-none py-2 text-base min-w-0"
                    disabled={isLoading || isGeneratingPlan}
                  />

                  <button
                    type="submit"
                    className={`p-3 rounded-full transition-all duration-200 flex-shrink-0 flex items-center justify-center ${
                      isLoading || isGeneratingPlan || !inputValue.trim()
                        ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                        : "bg-gradient-to-br from-orange-500 to-orange-600 text-white hover:shadow-lg hover:shadow-orange-500/30 hover:scale-105"
                    }`}
                    disabled={isLoading || isGeneratingPlan || !inputValue.trim()}
                  >
                    {isLoading || isGeneratingPlan ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current" />
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-7 7m7-7l7 7" />
                      </svg>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Full-screen plan generation overlay */}
      {isGeneratingPlan && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-900/95 backdrop-blur-sm px-6 text-center">
          <div className="relative w-32 h-32 sm:w-40 sm:h-40 mb-8 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-teal-400 via-blue-500 to-purple-500 blur-2xl opacity-50 animate-pulse-glow" />
            <img src="/logo.png" alt="Root AI" className="relative w-full h-full object-contain animate-float" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Building Your Plan</h2>
          <p className="text-gray-400 mb-8 max-w-sm min-h-[1.5rem] transition-all duration-300">
            {LOADING_MESSAGES[loadingMessageIndex]}
          </p>

          <div className="w-full max-w-xs bg-gray-700 rounded-full h-2 mb-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-teal-400 to-orange-500 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.min(planProgress, 100)}%` }}
            />
          </div>
          <p className="text-sm text-gray-500">{Math.min(Math.round(planProgress), 100)}%</p>
        </div>
      )}
    </div>
  );
}