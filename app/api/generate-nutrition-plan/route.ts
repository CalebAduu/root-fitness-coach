import OpenAI from 'openai';
// import { createClient } from '@supabase/supabase-js'; // Commented out - not using database yet
import { findHealthyMeals, findHighProteinMeals, findVegetarianMeals } from '../../../lib/tools/nutritionTools';
import { EvalTracer, traceLlm, traceTool, usageFromOpenAI, withEval } from '../../../lib/evals/evalTrace'; // EVAL HOOK: import

// Create an OpenAI API client
const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy-key',
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
});

// Create Supabase client (commented out for now - not using database yet)
// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
// );
const supabase = null;

// Using Node.js runtime for better compatibility with external libraries
export const runtime = 'nodejs';

interface NutritionData {
  goal: string;
  allergies?: string;
  dietaryPattern?: string;
  medicalConditions?: string;
  mealFrequency?: string;
  mealPreparation?: string;
  alcoholConsumption?: string;
  rateOfLoss?: string;
  previousDiets?: string;
  challenges?: string;
  proteinIntake?: string;
  supplements?: string;
  energyNeeds?: string;
  healthManagement?: string;
  nutrientMonitoring?: string;
  healthConcerns?: string;
  calorieGuidance?: string;
  mealPreferences?: string;
  portionGuidance?: string;
}

interface NutritionPlan {
  userInfo: {
    goal: string;
    dietaryPattern?: string;
    allergies?: string;
    medicalConditions?: string;
  };
  dailyGuidelines: {
    calories: string;
    macronutrients: {
      protein: string;
      carbohydrates: string;
      fats: string;
    };
    mealTiming: string[];
    hydration: string[];
  };
  mealPlan: {
    breakfast: {
      description: string;
      keyNutrients: string[];
      preparationTime: string;
    };
    lunch: {
      description: string;
      keyNutrients: string[];
      preparationTime: string;
    };
    dinner: {
      description: string;
      keyNutrients: string[];
      preparationTime: string;
    };
    snacks: {
      description: string;
      keyNutrients: string[];
      preparationTime: string;
    };
  };
  recommendations: {
    foodsToInclude: string[];
    foodsToLimit: string[];
    supplements: string[];
    mealPrep: string[];
    lifestyle: string[];
  };
  safetyNotes: string[];
}

export async function POST(req: Request) {
  const tracer = EvalTracer.fromRequest(req); // EVAL HOOK: null unless EVAL_MODE + valid x-eval-token
  try {
    const nutritionData: NutritionData = await req.json();

    // Get real nutrition data to enhance the prompt
    let mealData = '';
    let proteinData = '';
    let vegetarianData = '';
    
    try {
      // Get healthy meals
      const healthyMealsResult = await traceTool(tracer, { name: 'findHealthyMeals', args: { limit: 5 }, round: 0 }, () => findHealthyMeals({ limit: 5 })); // EVAL HOOK
      if (healthyMealsResult.success && healthyMealsResult.data.meals) {
        const meals = healthyMealsResult.data.meals.slice(0, 3).map(meal => meal.strMeal);
        mealData = `Healthy meal suggestions: ${meals.join(', ')}.`;
      }

      // Get high protein meals for sports performance
      if (nutritionData.goal === 'sports_performance') {
        const proteinMealsResult = await traceTool(tracer, { name: 'findHighProteinMeals', args: {}, round: 0 }, () => findHighProteinMeals()); // EVAL HOOK
        if (proteinMealsResult.success && proteinMealsResult.data.meals) {
          const proteinMeals = proteinMealsResult.data.meals.slice(0, 3).map(meal => meal.strMeal);
          proteinData = `High-protein meal suggestions: ${proteinMeals.join(', ')}.`;
        }
      }

      // Get vegetarian meals if applicable
      if (nutritionData.dietaryPattern?.toLowerCase().includes('vegetarian') || 
          nutritionData.dietaryPattern?.toLowerCase().includes('vegan')) {
        const vegetarianMealsResult = await traceTool(tracer, { name: 'findVegetarianMeals', args: {}, round: 0 }, () => findVegetarianMeals()); // EVAL HOOK
        if (vegetarianMealsResult.success && vegetarianMealsResult.data.meals) {
          const vegetarianMeals = vegetarianMealsResult.data.meals.slice(0, 3).map(meal => meal.strMeal);
          vegetarianData = `Vegetarian meal suggestions: ${vegetarianMeals.join(', ')}.`;
        }
      }
    } catch (toolError) {
      console.log('Tool data fetch failed, continuing without:', toolError);
    }

    // EVAL HOOK: record the meal suggestions injected into the prompt (e.g. to spot meat dishes in a vegan prompt)
    tracer?.note('injected_meal_context', { healthy: mealData, protein: proteinData, vegetarian: vegetarianData });

    // Create enhanced prompt with real data
    const systemPrompt = `You are an expert nutritionist and registered dietitian named "Root". 
    Create a comprehensive, personalized nutrition plan based on the user's specific goals and information.

    User's Nutrition Goal: ${nutritionData.goal}
    Dietary Pattern: ${nutritionData.dietaryPattern || 'Not specified'}
    Allergies/Intolerances: ${nutritionData.allergies || 'None reported'}
    Medical Conditions: ${nutritionData.medicalConditions || 'None reported'}
    Meal Frequency: ${nutritionData.mealFrequency || 'Not specified'}
    Meal Preparation: ${nutritionData.mealPreparation || 'Not specified'}
    Alcohol Consumption: ${nutritionData.alcoholConsumption || 'Not specified'}

    Additional Goal-Specific Information:
    ${nutritionData.goal === 'weight_loss' ? `
    Rate of Weight Loss: ${nutritionData.rateOfLoss || 'Not specified'}
    Previous Diets: ${nutritionData.previousDiets || 'Not specified'}
    Main Challenges: ${nutritionData.challenges || 'Not specified'}
    ` : ''}
    
    ${nutritionData.goal === 'sports_performance' ? `
    Protein Intake Needs: ${nutritionData.proteinIntake || 'Not specified'}
    Supplements: ${nutritionData.supplements || 'Not specified'}
    Energy Needs: ${nutritionData.energyNeeds || 'Not specified'}
    ` : ''}
    
    ${nutritionData.goal === 'health_maintenance' ? `
    Health Management: ${nutritionData.healthManagement || 'Not specified'}
    Nutrient Monitoring: ${nutritionData.nutrientMonitoring || 'Not specified'}
    Health Concerns: ${nutritionData.healthConcerns || 'Not specified'}
    ` : ''}
    
    ${nutritionData.goal === 'get_active' ? `
    Calorie Guidance: ${nutritionData.calorieGuidance || 'Not specified'}
    Meal Preferences: ${nutritionData.mealPreferences || 'Not specified'}
    Portion Guidance: ${nutritionData.portionGuidance || 'Not specified'}
    ` : ''}

    Real Meal Data: ${mealData} ${proteinData} ${vegetarianData}

    Create a detailed nutrition plan that includes:

    1. Daily Guidelines (calories, macronutrients, meal timing, hydration)
    2. Meal Plan (breakfast, lunch, dinner, snacks with descriptions and key nutrients)
    3. Recommendations (foods to include/limit, supplements, meal prep, lifestyle)
    4. Safety Notes (especially important for medical conditions and allergies)

    IMPORTANT SAFETY REQUIREMENTS:
    - Always include medical disclaimers
    - Be extra cautious with food allergies and medical conditions
    - Recommend consulting healthcare professionals when appropriate
    - Provide balanced, evidence-based recommendations
    - Consider the user's meal preparation preferences and constraints

    Return the response as a valid JSON object with this exact structure:
    {
      "userInfo": {
        "goal": "string",
        "dietaryPattern": "string",
        "allergies": "string",
        "medicalConditions": "string"
      },
      "dailyGuidelines": {
        "calories": "string",
        "macronutrients": {
          "protein": "string",
          "carbohydrates": "string",
          "fats": "string"
        },
        "mealTiming": ["string"],
        "hydration": ["string"]
      },
      "mealPlan": {
        "breakfast": {
          "description": "string",
          "keyNutrients": ["string"],
          "preparationTime": "string"
        },
        "lunch": {
          "description": "string",
          "keyNutrients": ["string"],
          "preparationTime": "string"
        },
        "dinner": {
          "description": "string",
          "keyNutrients": ["string"],
          "preparationTime": "string"
        },
        "snacks": {
          "description": "string",
          "keyNutrients": ["string"],
          "preparationTime": "string"
        }
      },
      "recommendations": {
        "foodsToInclude": ["string"],
        "foodsToLimit": ["string"],
        "supplements": ["string"],
        "mealPrep": ["string"],
        "lifestyle": ["string"]
      },
      "safetyNotes": ["string"]
    }

    Make sure the JSON is valid and complete.`;

    // EVAL HOOK: times the model call and records token usage
    const response = await traceLlm(tracer, 'nutrition_plan', () => openaiClient.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt }
      ],
      temperature: 0.3,
      max_tokens: 3000,
    }), usageFromOpenAI);

    const responseText = response.choices[0]?.message?.content || '';
    console.log('OpenAI nutrition response:', responseText);

    try {
      const nutritionPlan: NutritionPlan = JSON.parse(responseText);
      console.log('✅ Successfully parsed nutrition plan from OpenAI');

      // Save nutrition profile to database
      try {
        const { data: nutritionProfileData, error: nutritionError } = await supabase
          .from('nutrition_profiles')
          .insert({
            goal: nutritionData.goal,
            nutrition_data: nutritionData,
            plan_data: nutritionPlan
          })
          .select()
          .single();

        if (nutritionError) {
          console.error('Error saving nutrition profile:', nutritionError);
          // Continue without saving to database
        } else {
          console.log('✅ Nutrition profile saved with ID:', nutritionProfileData.id);
        }
      } catch (dbError) {
        console.error('Database error:', dbError);
        // Continue without saving to database
      }

      return Response.json(withEval(tracer, nutritionPlan)); // EVAL HOOK: adds `_eval` only in eval mode

    } catch (parseError) {
      console.error('Failed to parse nutrition plan JSON:', parseError);
      console.log('Raw response:', responseText);
      
      // Return a fallback nutrition plan
      const fallbackPlan: NutritionPlan = {
        userInfo: {
          goal: nutritionData.goal,
          dietaryPattern: nutritionData.dietaryPattern || 'Balanced',
          allergies: nutritionData.allergies || 'None reported',
          medicalConditions: nutritionData.medicalConditions || 'None reported'
        },
        dailyGuidelines: {
          calories: "Consult with a healthcare professional for personalized calorie recommendations",
          macronutrients: {
            protein: "15-25% of total calories",
            carbohydrates: "45-65% of total calories", 
            fats: "20-35% of total calories"
          },
          mealTiming: ["Eat every 3-4 hours", "Include protein with each meal", "Stay hydrated throughout the day"],
          hydration: ["Drink 8-10 glasses of water daily", "Increase intake during exercise", "Monitor urine color for hydration status"]
        },
        mealPlan: {
          breakfast: {
            description: "Balanced breakfast with protein, complex carbs, and healthy fats",
            keyNutrients: ["Protein", "Fiber", "Healthy fats"],
            preparationTime: "10-15 minutes"
          },
          lunch: {
            description: "Nutritious lunch with lean protein, vegetables, and whole grains",
            keyNutrients: ["Protein", "Vitamins", "Minerals"],
            preparationTime: "15-20 minutes"
          },
          dinner: {
            description: "Light dinner with protein and vegetables",
            keyNutrients: ["Protein", "Antioxidants", "Fiber"],
            preparationTime: "20-30 minutes"
          },
          snacks: {
            description: "Healthy snacks between meals",
            keyNutrients: ["Protein", "Fiber"],
            preparationTime: "5 minutes"
          }
        },
        recommendations: {
          foodsToInclude: ["Lean proteins", "Whole grains", "Fruits and vegetables", "Healthy fats"],
          foodsToLimit: ["Processed foods", "Added sugars", "Excessive sodium"],
          supplements: ["Consult healthcare provider for personalized supplement recommendations"],
          mealPrep: ["Plan meals ahead", "Prep ingredients in advance", "Use batch cooking"],
          lifestyle: ["Regular meal times", "Mindful eating", "Adequate sleep"]
        },
        safetyNotes: [
          "⚠️ IMPORTANT: This nutrition guidance is for informational purposes only.",
          "Consult with a healthcare professional before making significant dietary changes.",
          "If you have medical conditions or food allergies, seek professional guidance.",
          "Individual needs may vary based on age, activity level, and health status."
        ]
      };

      // EVAL HOOK: record that the fallback plan path was taken
      tracer?.note('fallback_plan_used', true);
      tracer?.note('raw_model_output_start', responseText.slice(0, 200));
      return Response.json(withEval(tracer, fallbackPlan)); // EVAL HOOK
    }

  } catch (error) {
    console.error('Error generating nutrition plan:', error);
    tracer?.recordError(error); // EVAL HOOK: keep the failure reason for the runner
    return Response.json(
      withEval(tracer, { error: 'Failed to generate nutrition plan' }), // EVAL HOOK
      { status: 500 }
    );
  }
}


