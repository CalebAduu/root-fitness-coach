import OpenAI from 'openai';
// import { createClient } from '@supabase/supabase-js'; // Commented out - not using database yet
import { searchExercises, findExercisesByMuscleGroup } from '../../../lib/tools/wgerTools';
import { findHealthyMeals, findHighProteinMeals } from '../../../lib/tools/nutritionTools';

// Create an OpenAI API client
const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy-key',
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
});

// Create Supabase client with error handling (commented out - not using database yet)
let supabase: any = null;
// try {
//   if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
//     supabase = createClient(
//       process.env.NEXT_PUBLIC_SUPABASE_URL,
//       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
//     );
//   } else {
//     console.warn('Supabase environment variables not found. Database features will be disabled.');
//   }
// } catch (error) {
//   console.error('Failed to initialize Supabase client:', error);
// }
console.log('Supabase disabled - not using database functionality yet');

// Using Node.js runtime for better compatibility with external libraries
export const runtime = 'nodejs';

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
    [day: string]: {
      focus: string;
      exercises: Array<{
        name: string;
        sets: number;
        reps: string;
        rest: string;
        notes?: string;
      }>;
      duration: string;
      difficulty: string;
    };
  };
  recommendations: {
    warmup: string[];
    cooldown: string[];
    nutrition: string[];
    progression: string[];
  };
  safetyNotes: string[];
}

function normalizeGoals(goalsRaw: string): string {
  return goalsRaw.toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function mapGoalsToMuscles(goalsRaw: string, gender?: string): string[] {
  const goals = normalizeGoals(goalsRaw);
  const muscles: string[] = [];

  // Specific targets
  if (/(glute|butt|booty|hip thrust|peach)/.test(goals)) muscles.push('glute');
  if (/(hamstring|posterior chain)/.test(goals)) muscles.push('hamstring');
  if (/(quad|thigh|legs|lower body)/.test(goals)) muscles.push('quadriceps');
  if (/(calf)/.test(goals)) muscles.push('calves');
  if (/(abs|core|six pack|oblique|abdominal)/.test(goals)) muscles.push('abdominals');
  if (/(back|lats|lat|upper back)/.test(goals)) muscles.push('lats');
  if (/(chest|pec)/.test(goals)) muscles.push('chest');
  if (/(shoulder|delts?)/.test(goals)) muscles.push('shoulders');
  if (/(arm|bicep|tricep)/.test(goals)) muscles.push('arms');

  // General intents with enhanced gender-specific targeting
  if (/(build|gain).*muscle|hypertrophy|tone|toning/.test(goals)) {
    if (gender === 'female') {
      // Female-focused: prioritize lower body, glutes, and core (toning approach)
      muscles.push('glute', 'hamstring', 'quadriceps', 'abdominals', 'calves', 'hip flexors');
    } else if (gender === 'male') {
      // Male-focused: prioritize upper body strength
      muscles.push('chest', 'back', 'shoulders', 'arms', 'lats');
    } else {
      // Default balanced approach
      muscles.push('glute', 'hamstring', 'quadriceps', 'chest', 'back');
    }
  }
  if (/(lose|cut|fat|lean|tone)/.test(goals)) {
    muscles.push('full body', 'abdominals');
    if (gender === 'female') {
      // Female weight loss: focus on glutes, legs, and core
      muscles.push('glute', 'quadriceps', 'hamstring', 'calves');
    } else if (gender === 'male') {
      // Male weight loss: balanced with upper body emphasis
      muscles.push('chest', 'back', 'shoulders');
    }
  }
  if (/(general|stay fit|fitness|overall|wellness)/.test(goals)) {
    if (gender === 'female') {
      // Female general fitness: lower body and glute focus
      muscles.push('glute', 'hamstring', 'quadriceps', 'abdominals', 'calves');
    } else if (gender === 'male') {
      // Male general fitness: upper body and core focus
      muscles.push('chest', 'back', 'shoulders', 'arms');
    }
  }

  // Deduplicate while preserving order
  return Array.from(new Set(muscles));
}

// Helper function to create a timeout promise
function createTimeoutPromise(ms: number) {
  return new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Operation timeout')), ms)
  );
}

export async function POST(req: Request) {
  let userData: UserData;
  
  try {
    console.log('Generate-plan API called');
    userData = await req.json();
    console.log('User data received:', { 
      name: userData.name, 
      goals: userData.fitnessGoals, 
      workoutDays: userData.workoutDays 
    });

    // Check if API key is available
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'dummy-key') {
      throw new Error('OpenAI API key not configured');
    }
    
    console.log('OpenAI API key is configured, proceeding with generation...');

    // Enhanced prompt for comprehensive workout plans
    const systemPrompt = `You are an expert fitness coach. Create a comprehensive workout plan as valid JSON only. No explanations or markdown.

CRITICAL: You MUST create exactly ${userData.workoutDays} workout days named "Day 1", "Day 2", etc. up to "Day ${userData.workoutDays}".

Return this exact JSON structure:
{
  "userInfo": {
    "name": "${userData.name}",
    "age": ${userData.age},
    "height": "${userData.height}",
    "weight": ${userData.weight},
    "fitnessGoals": "${userData.fitnessGoals}",
    "workoutDays": ${userData.workoutDays}
  },
  "weeklyPlan": {
    "Day 1": {
      "focus": "Full Body Strength",
      "exercises": [
        {"name": "Squats", "sets": 3, "reps": "8-12", "rest": "60 seconds"},
        {"name": "Push-ups", "sets": 3, "reps": "8-12", "rest": "60 seconds"},
        {"name": "Lunges", "sets": 3, "reps": "10 each leg", "rest": "60 seconds"},
        {"name": "Plank", "sets": 3, "reps": "30-45 sec", "rest": "60 seconds"}
      ],
      "duration": "35-45 minutes",
      "difficulty": "${userData.experienceLevel}"
    },
    "Day 2": {
      "focus": "Upper Body & Core",
      "exercises": [
        {"name": "Rows", "sets": 3, "reps": "8-12", "rest": "60 seconds"},
        {"name": "Overhead Press", "sets": 3, "reps": "8-12", "rest": "60 seconds"},
        {"name": "Tricep Dips", "sets": 3, "reps": "8-12", "rest": "60 seconds"},
        {"name": "Russian Twists", "sets": 3, "reps": "20 each side", "rest": "45 seconds"}
      ],
      "duration": "35-45 minutes",
      "difficulty": "${userData.experienceLevel}"
    }
  },
  "recommendations": {
    "warmup": ["5 minutes light cardio", "Dynamic stretching", "Arm circles and leg swings"],
    "cooldown": ["5-10 minutes static stretching", "Deep breathing", "Hydrate"],
    "nutrition": ["Stay hydrated", "Eat protein within 30 min post-workout", "Include complex carbs", "Focus on whole foods"],
    "progression": ["Increase weight gradually", "Prioritize form over load", "Track progress", "Take rest days"]
  },
  "safetyNotes": ["Listen to your body", "Stop if you feel pain", "Consult doctor if needed", "Warm up properly"]
}

REQUIREMENTS:
- Create exactly ${userData.workoutDays} days (Day 1 through Day ${userData.workoutDays})
- Each day should have 4-6 exercises
- Vary the focus areas (Full Body, Upper Body, Lower Body, Cardio, Core, etc.)
- Consider goals: ${userData.fitnessGoals}
- Experience level: ${userData.experienceLevel}
- Age: ${userData.age} years old
- Equipment: ${userData.gymAccess ? 'Full gym access' : 'Home equipment: ' + (userData.equipment?.join(', ') || 'bodyweight')}
- Injuries: ${userData.injuries?.join(', ') || 'None'}

Make each day unique with different exercises and focus areas.`;

    // Ask OpenAI for a structured workout plan with retry logic
    console.log('Calling OpenAI API...');
    let response;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        attempts++;
        console.log(`OpenAI attempt ${attempts}/${maxAttempts}`);
        
        // Use gpt-3.5-turbo for faster response
        const model = 'gpt-3.5-turbo';
        const timeout = 20000; // 20 second timeout for comprehensive plans
        
        response = await Promise.race([
          openaiClient.chat.completions.create({
            model: model,
      stream: false,
      messages: [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
                content: `Create a ${userData.workoutDays}-day workout plan for ${userData.name}. Must include ALL ${userData.workoutDays} days (Day 1 through Day ${userData.workoutDays}). Goals: ${userData.fitnessGoals}. Experience: ${userData.experienceLevel}. Age: ${userData.age}. Equipment: ${userData.gymAccess ? 'Full gym' : 'Home equipment'}.` 
        }
      ],
      temperature: 0.3,
      max_tokens: 2000,
          }),
          createTimeoutPromise(timeout)
        ]);
        
        console.log(`✅ OpenAI API call successful on attempt ${attempts}`);
        break;
        
      } catch (apiError) {
        console.error(`❌ OpenAI API attempt ${attempts} failed:`, apiError);
        if (attempts >= maxAttempts) {
          throw new Error(`OpenAI API failed after ${maxAttempts} attempts: ${apiError instanceof Error ? apiError.message : 'Unknown error'}`);
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }

    const responseText = response.choices[0]?.message?.content || '';
    console.log('OpenAI response with real data:', responseText);
    console.log('Response length:', responseText.length);
    console.log('Response starts with:', responseText.substring(0, 100));

    try {
      const workoutPlan: WorkoutPlan = JSON.parse(responseText);
      console.log('✅ Successfully parsed workout plan from OpenAI');
      
      // Only attempt database operations if Supabase is available
      if (supabase) {
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .insert({
              onboarding_data: {
                name: userData.name,
                age: userData.age,
                height: userData.height,
                weight: userData.weight,
                fitnessGoals: userData.fitnessGoals,
                experienceLevel: userData.experienceLevel,
                gymAccess: userData.gymAccess,
                equipment: userData.equipment,
                injuries: userData.injuries,
                workoutDays: userData.workoutDays,
                gender: userData.gender || null
              }
            })
            .select()
            .single();

          if (profileError) {
            console.error('Error saving profile:', profileError);
            throw new Error('Failed to save profile');
          }

          const { data: planData, error: planError } = await supabase
            .from('plans')
            .insert({
              profile_id: profileData.id,
              plan_data: workoutPlan,
              feedback: null
            })
            .select()
            .single();

          if (planError) {
            console.error('Error saving plan:', planError);
            throw new Error('Failed to save plan');
          }

          const result = { ...workoutPlan, profileId: profileData.id, planId: planData.id };
          return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
        } catch (dbError) {
          console.error('Database error:', dbError);
          // Fall through to return workout plan without database IDs
        }
      } else {
        console.log('Supabase not available, returning workout plan without database storage');
      }
      
      // Return workout plan without database IDs if Supabase is not available or database operations failed
      return new Response(JSON.stringify(workoutPlan), { headers: { 'Content-Type': 'application/json' } });
    } catch (parseError) {
      console.error('❌ JSON parsing error:', parseError);
      console.error('Raw response:', responseText);
      console.error('Response length:', responseText.length);
      
      // Try to clean and parse the response
      let cleanedResponse = responseText.trim();
      
      // Remove any markdown formatting
      cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      // Try to find JSON object in the response
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const workoutPlan: WorkoutPlan = JSON.parse(jsonMatch[0]);
          console.log('✅ Successfully parsed cleaned JSON response');
          
          // Return workout plan without database IDs if Supabase is not available
          return new Response(JSON.stringify(workoutPlan), { headers: { 'Content-Type': 'application/json' } });
        } catch (cleanParseError) {
          console.error('❌ Even cleaned JSON failed to parse:', cleanParseError);
        }
      }
      
      // If all parsing attempts fail, throw an error
      throw new Error(`Failed to parse workout plan from OpenAI response. Raw response: ${responseText.substring(0, 200)}...`);
    }
  } catch (error) {
    console.error('Error in generate-plan API:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userData: userData ? { name: userData.name, goals: userData.fitnessGoals } : 'Not available'
    });
    
    // Return more detailed error information for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ 
      error: 'Failed to generate workout plan. Please try again.',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}
