import OpenAI from 'openai';
// import { createClient } from '@supabase/supabase-js'; // Commented out - not using database yet
import { findExerciseCandidates } from '../../../lib/tools/wgerTools';
import { avoidKeywordsFor } from '../../../lib/injuries';
import { EvalTracer, traceLlm, traceTool, usageFromOpenAI, withEval } from '../../../lib/evals/evalTrace'; // EVAL HOOK: import

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

// JSON schema for OpenAI structured outputs, mirroring the WorkoutPlan interface.
// weeklyPlan uses a fixed Day1..Day6 shape (with Day N keys unused by the prompt left
// as empty-string placeholders) since json_schema strict mode requires static properties.
const dayKeys = Array.from({ length: 7 }, (_, i) => `Day ${i + 1}`);
const daySchema = {
  type: 'object',
  properties: {
    focus: { type: 'string' },
    exercises: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          sets: { type: 'number' },
          reps: { type: 'string' },
          rest: { type: 'string' },
          notes: { type: ['string', 'null'] },
        },
        required: ['name', 'sets', 'reps', 'rest', 'notes'],
        additionalProperties: false,
      },
    },
    duration: { type: 'string' },
    difficulty: { type: 'string' },
  },
  required: ['focus', 'exercises', 'duration', 'difficulty'],
  additionalProperties: false,
};

function buildWorkoutPlanSchema(workoutDays: number) {
  const activeDayKeys = dayKeys.slice(0, Math.max(1, Math.min(workoutDays, 7)));
  return {
    type: 'object',
    properties: {
      userInfo: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
          height: { type: 'string' },
          weight: { type: 'number' },
          fitnessGoals: { type: 'string' },
          workoutDays: { type: 'number' },
        },
        required: ['name', 'age', 'height', 'weight', 'fitnessGoals', 'workoutDays'],
        additionalProperties: false,
      },
      weeklyPlan: {
        type: 'object',
        properties: Object.fromEntries(activeDayKeys.map((key) => [key, daySchema])),
        required: activeDayKeys,
        additionalProperties: false,
      },
      recommendations: {
        type: 'object',
        properties: {
          warmup: { type: 'array', items: { type: 'string' } },
          cooldown: { type: 'array', items: { type: 'string' } },
          nutrition: { type: 'array', items: { type: 'string' } },
          progression: { type: 'array', items: { type: 'string' } },
        },
        required: ['warmup', 'cooldown', 'nutrition', 'progression'],
        additionalProperties: false,
      },
      safetyNotes: { type: 'array', items: { type: 'string' } },
    },
    required: ['userInfo', 'weeklyPlan', 'recommendations', 'safetyNotes'],
    additionalProperties: false,
  };
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

// Muscle groups used when the user's goals don't point at specific ones, and as a small
// "filler" pool so full-body days are always possible.
const DEFAULT_TARGET_MUSCLES = ['quadriceps', 'glute', 'hamstring', 'chest', 'lats', 'shoulders', 'abdominals'];

const MUSCLE_LABELS: Record<string, string> = {
  glute: 'Glutes', hamstring: 'Hamstrings', quadriceps: 'Quadriceps', calves: 'Calves', abdominals: 'Abs / core',
  lats: 'Back (lats)', back: 'Back', chest: 'Chest', shoulders: 'Shoulders', arms: 'Arms',
};

// Helper function to create a timeout promise
function createTimeoutPromise(ms: number) {
  return new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Operation timeout')), ms)
  );
}

export async function POST(req: Request) {
  const tracer = EvalTracer.fromRequest(req); // EVAL HOOK: null unless EVAL_MODE + valid x-eval-token
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

    // Real exercises from wger, matched to the user's target muscles, equipment and injuries.
    // If wger is slow or unavailable the plan is still generated, just without the list.
    let exerciseOptionsBlock = '';
    try {
      const avoid = avoidKeywordsFor(userData.injuries);
      const mapped = mapGoalsToMuscles(userData.fitnessGoals || '', userData.gender).filter((m) => m !== 'full body' && m !== 'hip flexors');
      const targets = (mapped.length ? mapped : DEFAULT_TARGET_MUSCLES).slice(0, 6);
      const lookup = await Promise.race([
        traceTool(tracer, { name: 'findExerciseCandidates', args: { targets, gymAccess: !!userData.gymAccess, avoid }, round: 0 }, () =>
          findExerciseCandidates({
            muscles: targets,
            fillerMuscles: DEFAULT_TARGET_MUSCLES,
            gymAccess: !!userData.gymAccess,
            equipment: userData.equipment,
            excludeKeywords: avoid,
          })),
        createTimeoutPromise(12000),
      ]) as Awaited<ReturnType<typeof findExerciseCandidates>>;

      if (lookup.success && lookup.data.length > 0) {
        const lines = lookup.data.map((g) => `- ${MUSCLE_LABELS[g.muscle] || g.muscle}: ${g.exercises.map((e) => e.name).join(', ')}`);
        exerciseOptionsBlock = `

AVAILABLE EXERCISES (real exercises from the wger database, already matched to this user's target muscles, equipment and injuries):
${lines.join('\n')}
Build every day from the exercise names above, copying the names exactly. Only use an exercise that is not on this list if a day cannot be completed otherwise.`;
        tracer?.note('exercise_candidates', lookup.data.map((g) => ({ muscle: g.muscle, exercises: g.exercises.map((e) => e.name) })));
      }
    } catch (lookupError) {
      console.log('wger exercise lookup skipped:', lookupError instanceof Error ? lookupError.message : lookupError);
    }

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
      "focus": "<focus of this day, e.g. Lower Body Strength>",
      "exercises": [
        {"name": "<exercise name>", "sets": 3, "reps": "8-12", "rest": "60 seconds"},
        {"name": "<exercise name>", "sets": 3, "reps": "8-12", "rest": "60 seconds"},
        {"name": "<exercise name>", "sets": 3, "reps": "10 each leg", "rest": "60 seconds"},
        {"name": "<exercise name>", "sets": 3, "reps": "30-45 sec", "rest": "45 seconds"}
      ],
      "duration": "35-45 minutes",
      "difficulty": "${userData.experienceLevel}"
    },
    "Day 2": {
      "focus": "<focus of this day>",
      "exercises": [
        {"name": "<exercise name>", "sets": 3, "reps": "8-12", "rest": "60 seconds"},
        {"name": "<exercise name>", "sets": 3, "reps": "8-12", "rest": "60 seconds"},
        {"name": "<exercise name>", "sets": 3, "reps": "8-12", "rest": "60 seconds"},
        {"name": "<exercise name>", "sets": 3, "reps": "20 each side", "rest": "45 seconds"}
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
- Do not include any exercise that could aggravate the injuries above; choose safer alternatives
- If any injuries are listed, safetyNotes must include a specific note for each injury (what to avoid or modify, and when to stop), in addition to general notes
${exerciseOptionsBlock}

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

        const model = 'gpt-4o-mini';
        const timeout = 20000; // 20 second timeout for comprehensive plans

        response = await Promise.race([
          // EVAL HOOK: times this attempt and records token usage (one entry per retry)
          traceLlm(tracer, `plan_attempt_${attempts}`, () => openaiClient.chat.completions.create({
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
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'workout_plan',
          strict: true,
          schema: buildWorkoutPlanSchema(userData.workoutDays),
        },
      },
          }), usageFromOpenAI),
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

    const refusal = response.choices[0]?.message?.refusal;
    if (refusal) {
      throw new Error(`OpenAI refused the request: ${refusal}`);
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
      // EVAL HOOK: adds `_eval` to the body only in eval mode (the Supabase branch above is unreachable while it is disabled)
      return new Response(JSON.stringify(withEval(tracer, workoutPlan)), { headers: { 'Content-Type': 'application/json' } });
    } catch (parseError) {
      // With response_format: json_schema + strict mode, OpenAI guarantees valid JSON
      // matching the schema, so a parse failure here means the model refused the
      // request (responseText holds the refusal text) rather than malformed output.
      console.error('❌ JSON parsing error:', parseError);
      console.error('Raw response:', responseText);
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
    tracer?.recordError(error); // EVAL HOOK: keep the failure reason for the runner
    return new Response(JSON.stringify(withEval(tracer, { // EVAL HOOK
      error: 'Failed to generate workout plan. Please try again.',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    })), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}
