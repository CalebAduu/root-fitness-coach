import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { searchExercises, findExercisesByMuscleGroup } from '../../../lib/tools/wgerTools';
import { findHealthyMeals, findHighProteinMeals } from '../../../lib/tools/nutritionTools';

// Create an OpenAI API client
const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy-key',
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
});

// Create Supabase client with error handling
let supabase: any = null;
try {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  } else {
    console.warn('Supabase environment variables not found. Database features will be disabled.');
  }
} catch (error) {
  console.error('Failed to initialize Supabase client:', error);
}

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
  try {
    console.log('Generate-plan API called');
    const userData: UserData = await req.json();
    console.log('User data received:', { 
      name: userData.name, 
      goals: userData.fitnessGoals, 
      workoutDays: userData.workoutDays 
    });

    // Get real exercise and nutrition data to enhance the prompt (with parallel execution and timeout)
    let exerciseData = '';
    let nutritionData = '';
    
    try {
      // Run exercise and nutrition API calls in parallel with timeout
      const [exerciseResult, nutritionResult] = await Promise.allSettled([
        // Exercise data fetching with timeout
        Promise.race([
          (async () => {
            const targetMuscles = mapGoalsToMuscles(userData.fitnessGoals, userData.gender);
            let exerciseNames: string[] = [];
            
            if (targetMuscles.length > 0) {
              const byMuscle = await findExercisesByMuscleGroup(targetMuscles, { limit: 12 });
              if (byMuscle.success) {
                exerciseNames = byMuscle.data.map((ex: any) => ex.name || 'Unknown').slice(0, 12);
              }
            }
            
            if (exerciseNames.length === 0) {
              const exercisesResult = await searchExercises(userData.fitnessGoals, { limit: 12 });
              if (exercisesResult.success) {
                const exercises = Array.isArray(exercisesResult.data) ? exercisesResult.data : [];
                exerciseNames = exercises.map((ex: any) => ex.name || 'Unknown').slice(0, 12);
              }
            }
            
            return exerciseNames;
          })(),
          createTimeoutPromise(6000) // 6 second timeout for exercises
        ]),
        
        // Nutrition data fetching with timeout
        Promise.race([
          (async () => {
            const goals = userData.fitnessGoals.toLowerCase();
            let proteinSource = 'chicken';
            let nutritionFocus = 'balanced nutrition';
            
            if (goals.includes('build') || goals.includes('muscle') || goals.includes('strength')) {
              proteinSource = 'beef';
              nutritionFocus = 'high protein diet for muscle building';
            } else if (goals.includes('lose') || goals.includes('weight') || goals.includes('fat')) {
              proteinSource = 'salmon';
              nutritionFocus = 'lean protein diet for weight loss';
            } else if (goals.includes('endurance') || goals.includes('cardio') || goals.includes('stamina')) {
              proteinSource = 'tuna';
              nutritionFocus = 'carbohydrate-rich diet for endurance';
            } else if (goals.includes('recovery') || goals.includes('flexibility')) {
              proteinSource = 'eggs';
              nutritionFocus = 'recovery-focused nutrition';
            }
            if (userData.experienceLevel.toLowerCase() === 'beginner') proteinSource = 'chicken';
            if (userData.age > 50) proteinSource = 'salmon';

            const nutritionResult = await findHealthyMeals({ protein: proteinSource });
            if (nutritionResult.success && nutritionResult.data.meals) {
              const meals = nutritionResult.data.meals.slice(0, 3).map(meal => meal.strMeal);
              return { meals, proteinSource, nutritionFocus };
            }
            return null;
          })(),
          createTimeoutPromise(4000) // 4 second timeout for nutrition
        ])
      ]);

      // Process exercise results - only use if API succeeded
      if (exerciseResult.status === 'fulfilled' && Array.isArray(exerciseResult.value) && exerciseResult.value.length > 0) {
        exerciseData = `Available exercises for ${userData.fitnessGoals}${userData.gender ? ' (' + userData.gender + ')' : ''}: ${exerciseResult.value.join(', ')}`;
      }

      // Process nutrition results - only use if API succeeded
      if (nutritionResult.status === 'fulfilled' && nutritionResult.value) {
        const { meals, proteinSource, nutritionFocus } = nutritionResult.value;
        nutritionData = `Personalized nutrition for ${userData.fitnessGoals}: ${nutritionFocus}. Meal suggestions: ${meals.join(', ')}. Protein focus: ${proteinSource}.`;
      }
      
    } catch (toolError) {
      console.log('Tool data fetch failed, continuing without external data:', toolError);
    }

    // Create enhanced prompt with real data (only if available)
    const systemPrompt = `You are an expert fitness coach and personal trainer named "Root". 

${exerciseData ? `EXERCISE DATA: ${exerciseData}` : ''}
${nutritionData ? `NUTRITION DATA: ${nutritionData}` : ''}

Create a comprehensive, personalized workout plan based on the user's information.

IMPORTANT: Return ONLY valid JSON. No conversational text, no explanations, just the structured workout plan.

The response must be a JSON object with this exact structure:
{
  "userInfo": {
    "name": "string",
    "age": number,
    "height": "string", 
    "weight": number,
    "fitnessGoals": "string",
    "workoutDays": number
  },
  "weeklyPlan": {
    "Monday": {
      "focus": "string",
      "exercises": [
        {
          "name": "string",
          "sets": number,
          "reps": "string",
          "rest": "string",
          "notes": "string (optional)"
        }
      ],
      "duration": "string",
      "difficulty": "string"
    }
  },
  "recommendations": {
    "warmup": ["string"],
    "cooldown": ["string"],
    "nutrition": ["string"],
    "progression": ["string"]
  },
  "safetyNotes": ["string"]
}

Guidelines:
- Create exactly ${userData.workoutDays} workout days per week
- Name the days sequentially as "Day 1", "Day 2", ..., "Day ${userData.workoutDays}" (do NOT use weekday names).
- Consider their fitness goals: ${userData.fitnessGoals}${userData.gender ? ` (gender: ${userData.gender})` : ''}
- Consider their experience level: ${userData.experienceLevel}
- Account for injuries and health conditions: ${userData.injuries.join(', ') || 'None'} - Modify exercises accordingly, avoid movements that could aggravate conditions, and suggest alternatives when needed
- Use available equipment: ${userData.gymAccess ? 'Full gym access' : 'Home equipment: ' + userData.equipment.join(', ')}
- Age-appropriate exercises for ${userData.age} years old
- Progressive difficulty levels based on experience:
  * Beginner: Focus on form, basic movements, lower intensity, 5-6 exercises per day
  * Intermediate: Moderate complexity, balanced intensity, 6-7 exercises per day
  * Advanced: Complex movements, higher intensity, advanced techniques, 7-8 exercises per day
- Each day must have a distinct focus (e.g., Lower Body, Upper Body, Push, Pull, Full Body, Conditioning & Core) without repeating the exact same focus on consecutive days.
- Exercises should vary across days; avoid repeating the same primary lifts day-to-day unless programmed as progression.
- Balance muscle groups across the ${userData.workoutDays} days.
- Emphasize gender-informed programming for optimal results:
  * Female: Prioritize lower-body and glute-centric emphasis with toning-focused exercises like hip thrusts, glute bridges, Bulgarian split squats, Romanian deadlifts, step-ups, lateral lunges, sumo squats, and glute-focused movements. Include 2-3 glute-focused exercises per lower body day. Use "toning" and "strengthening" language rather than "building muscle". Balance with functional upper body work.
  * Male: Favor upper-body strength emphasis with compound movements like bench press, rows, overhead press, pull-ups, and shoulder work. Balance with functional lower body training.
- If the user explicitly mentions specific body parts (e.g., glutes, arms, abs), prioritize exercises that target those muscles.
- Include proper warmup and cooldown routines
- Provide personalized nutrition guidance based on their goals:
  * Muscle building/Toning: High protein, moderate carbs, adequate calories (use "toning" language for females)
  * Weight loss: Lean protein, controlled calories, high fiber
  * Endurance: Balanced macros with focus on carbohydrates
  * General fitness: Balanced nutrition with whole foods
- Include comprehensive safety considerations:
  * If injuries or health conditions are mentioned, provide specific modifications and alternatives
  * Include proper form cues and progression warnings
  * Suggest consulting healthcare providers when appropriate
  * Emphasize listening to your body and stopping if pain occurs

Make the plan challenging but achievable, with clear progression paths.`;

    // Ask OpenAI for a structured workout plan
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4o-mini',
      stream: false,
      messages: [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: `Generate a workout plan for ${userData.name} (${userData.age} years old, ${userData.height}, ${userData.weight} lbs). Goals: ${userData.fitnessGoals}. Workout ${userData.workoutDays} days per week.` 
        }
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

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
      console.log('🚨 Using fallback plan instead of real workout data');

      // Dynamic fallback plan with Day 1..N and exercise count based on experience level
      const weeklyPlan: Record<string, any> = {};
      const exerciseCount = userData.experienceLevel.toLowerCase() === 'beginner' ? 3 : 
                           userData.experienceLevel.toLowerCase() === 'intermediate' ? 4 : 5;
      
      for (let i = 1; i <= userData.workoutDays; i++) {
        weeklyPlan[`Day ${i}`] = {
          focus: i % 2 === 1 ? 'Full Body Strength' : 'Conditioning & Core',
          exercises: [
            { name: i % 2 === 1 ? 'Squats' : 'Plank', sets: 3, reps: i % 2 === 1 ? '8-12' : '45-60 sec', rest: '60 seconds' },
            { name: i % 2 === 1 ? 'Push-ups' : 'Lunges', sets: 3, reps: '8-12', rest: '60 seconds' },
            ...(exerciseCount > 3 ? [{ name: i % 2 === 1 ? 'Rows' : 'Mountain Climbers', sets: 3, reps: '8-12', rest: '60 seconds' }] : []),
            ...(exerciseCount > 4 ? [{ name: i % 2 === 1 ? 'Overhead Press' : 'Burpees', sets: 3, reps: '8-12', rest: '90 seconds' }] : [])
          ],
          duration: '35 minutes',
          difficulty: userData.experienceLevel || 'Beginner'
        };
      }

      const fallbackPlan: WorkoutPlan = {
        userInfo: {
          name: userData.name,
          age: userData.age,
          height: userData.height,
          weight: userData.weight,
          fitnessGoals: userData.fitnessGoals,
          workoutDays: userData.workoutDays,
        },
        weeklyPlan,
        recommendations: {
          warmup: ['5 minutes light cardio', 'Dynamic mobility for hips/shoulders'],
          cooldown: ['Static stretching', 'Deep breathing'],
          nutrition: ['Stay hydrated', 'Eat protein-rich foods'],
          progression: ['Increase load gradually', 'Prioritize form over load']
        },
        safetyNotes: ['Listen to your body', 'Stop if you feel pain', 'Consult a doctor if needed']
      };

      return new Response(JSON.stringify(fallbackPlan), { headers: { 'Content-Type': 'application/json' } });
    }
  } catch (error) {
    console.error('Error in generate-plan API:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userData: userData
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
