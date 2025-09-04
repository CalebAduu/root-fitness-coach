import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

// Import WGER tools
import {
  searchExercises,
  getMuscles,
  getEquipment
} from './wgerTools';

// Import TheMealDB tools
import {
  findMealsByIngredient,
  getMealDetails,
  findHealthyMeals,
  findHighProteinMeals,
  findVegetarianMeals,
  searchMealsByName,
  getAllCategories,
  getRandomMeal
} from './nutritionTools';

// Import RAG system
import { RAGManager } from '../rag/ragManager';

// WGER Exercise Tools

export const searchExercisesTool = new DynamicStructuredTool({
  name: 'search_exercises',
  description: 'Search for exercises by name or description. Useful for finding specific exercises like "push-ups", "squats", or "bench press".',
  schema: z.object({
    query: z.string().describe('The search query for exercises (e.g., "push-ups", "squats", "bench press")'),
    limit: z.number().optional().describe('Maximum number of exercises to return (default: 10)')
  }),
  func: async ({ query, limit = 10 }) => {
    try {
      const result = await searchExercises(query, { limit });
      if (result.success) {
        const exercises = Array.isArray(result.data) ? result.data : [];
        const limitedExercises = exercises.slice(0, limit);
        
        return JSON.stringify({
          success: true,
          count: limitedExercises.length,
          exercises: limitedExercises.map((ex: any) => ({
            id: ex.id,
            name: ex.name || 'Unknown',
            category: ex.category,
            muscles: ex.muscles || [],
            equipment: ex.equipment || []
          }))
        });
      } else {
        return JSON.stringify({ success: false, error: result.error });
      }
    } catch (error) {
      return JSON.stringify({ success: false, error: 'Failed to search exercises' });
    }
  }
});

export const getMusclesTool = new DynamicStructuredTool({
  name: 'get_muscle_groups',
  description: 'Get a list of all available muscle groups. Useful for understanding what muscle groups can be targeted in workouts.',
  schema: z.object({}),
  func: async () => {
    try {
      const result = await getMuscles();
      if (result.success) {
        const muscles = Array.isArray(result.data) ? result.data : [];
        return JSON.stringify({
          success: true,
          muscles: muscles.map((muscle: any) => ({
            id: muscle.id,
            name: muscle.name,
            isFront: muscle.is_front
          }))
        });
      } else {
        return JSON.stringify({ success: false, error: result.error });
      }
    } catch (error) {
      return JSON.stringify({ success: false, error: 'Failed to get muscle groups' });
    }
  }
});

export const getEquipmentTool = new DynamicStructuredTool({
  name: 'get_equipment',
  description: 'Get a list of all available exercise equipment. Useful for understanding what equipment options are available for workouts.',
  schema: z.object({}),
  func: async () => {
    try {
      const result = await getEquipment();
      if (result.success) {
        const equipment = Array.isArray(result.data) ? result.data : [];
        return JSON.stringify({
          success: true,
          equipment: equipment.map((equipment: any) => ({
            id: equipment.id,
            name: equipment.name
          }))
        });
      } else {
        return JSON.stringify({ success: false, error: result.error });
      }
    } catch (error) {
      return JSON.stringify({ success: false, error: 'Failed to get equipment' });
    }
  }
});

// TheMealDB Nutrition Tools

export const findMealsByIngredientTool = new DynamicStructuredTool({
  name: 'find_meals_by_ingredient',
  description: 'Find meals that contain a specific ingredient. This is the first step in TheMealDB workflow - you get a list of meal names and IDs.',
  schema: z.object({
    ingredient: z.string().describe('The main ingredient to search for (e.g., "chicken", "salmon", "spinach", "quinoa")')
  }),
  func: async ({ ingredient }) => {
    try {
      const result = await findMealsByIngredient(ingredient);
      if (result.success && result.data.meals) {
        return JSON.stringify({
          success: true,
          ingredient,
          count: result.data.meals.length,
          meals: result.data.meals.map(meal => ({
            id: meal.idMeal,
            name: meal.strMeal,
            image: meal.strMealThumb
          }))
        });
      } else {
        return JSON.stringify({ success: false, error: 'No meals found' });
      }
    } catch (error) {
      return JSON.stringify({ success: false, error: 'Failed to find meals by ingredient' });
    }
  }
});

export const getMealDetailsTool = new DynamicStructuredTool({
  name: 'get_meal_details',
  description: 'Get detailed recipe information for a specific meal by its ID. Use this after finding meals with find_meals_by_ingredient.',
  schema: z.object({
    mealId: z.string().describe('The ID of the meal to get details for')
  }),
  func: async ({ mealId }) => {
    try {
      const result = await getMealDetails(mealId);
      if (result.success && result.data.meals && result.data.meals.length > 0) {
        const meal = result.data.meals[0];
        return JSON.stringify({
          success: true,
          meal: {
            id: meal.idMeal,
            name: meal.strMeal,
            category: meal.strCategory,
            area: meal.strArea,
            tags: meal.strTags,
            instructions: meal.strInstructions,
            youtube: meal.strYoutube,
            image: meal.strMealThumb
          }
        });
      } else {
        return JSON.stringify({ success: false, error: 'Meal not found' });
      }
    } catch (error) {
      return JSON.stringify({ success: false, error: 'Failed to get meal details' });
    }
  }
});

export const findHealthyMealsTool = new DynamicStructuredTool({
  name: 'find_healthy_meals',
  description: 'Find meals that are generally considered healthy, focusing on ingredients like chicken, salmon, spinach, quinoa, etc.',
  schema: z.object({
    protein: z.string().optional().describe('Preferred protein source (e.g., "chicken", "salmon")'),
    vegetables: z.string().optional().describe('Preferred vegetable (e.g., "spinach", "broccoli")')
  }),
  func: async ({ protein, vegetables }) => {
    try {
      const result = await findHealthyMeals({ protein, vegetables });
      if (result.success && result.data.meals) {
        return JSON.stringify({
          success: true,
          count: result.data.meals.length,
          meals: result.data.meals.map(meal => ({
            id: meal.idMeal,
            name: meal.strMeal,
            image: meal.strMealThumb
          }))
        });
      } else {
        return JSON.stringify({ success: false, error: 'No healthy meals found' });
      }
    } catch (error) {
      return JSON.stringify({ success: false, error: 'Failed to find healthy meals' });
    }
  }
});

export const findHighProteinMealsTool = new DynamicStructuredTool({
  name: 'find_high_protein_meals',
  description: 'Find meals that are high in protein, focusing on ingredients like chicken, beef, salmon, tuna, eggs, tofu.',
  schema: z.object({}),
  func: async () => {
    try {
      const result = await findHighProteinMeals();
      if (result.success && result.data.meals) {
        return JSON.stringify({
          success: true,
          count: result.data.meals.length,
          meals: result.data.meals.map(meal => ({
            id: meal.idMeal,
            name: meal.strMeal,
            image: meal.strMealThumb
          }))
        });
      } else {
        return JSON.stringify({ success: false, error: 'No high-protein meals found' });
      }
    } catch (error) {
      return JSON.stringify({ success: false, error: 'Failed to find high-protein meals' });
    }
  }
});

export const findVegetarianMealsTool = new DynamicStructuredTool({
  name: 'find_vegetarian_meals',
  description: 'Find vegetarian meals, focusing on ingredients like spinach, mushroom, tofu, quinoa, lentil, chickpea.',
  schema: z.object({}),
  func: async () => {
    try {
      const result = await findVegetarianMeals();
      if (result.success && result.data.meals) {
        return JSON.stringify({
          success: true,
          count: result.data.meals.length,
          meals: result.data.meals.map(meal => ({
            id: meal.idMeal,
            name: meal.strMeal,
            image: meal.strMealThumb
          }))
        });
      } else {
        return JSON.stringify({ success: false, error: 'No vegetarian meals found' });
      }
    } catch (error) {
      return JSON.stringify({ success: false, error: 'Failed to find vegetarian meals' });
    }
  }
});

export const searchMealsByNameTool = new DynamicStructuredTool({
  name: 'search_meals_by_name',
  description: 'Search for meals by their name. Useful for finding specific dishes like "pasta", "curry", "salad".',
  schema: z.object({
    mealName: z.string().describe('The name of the meal to search for (e.g., "pasta", "curry", "salad")')
  }),
  func: async ({ mealName }) => {
    try {
      const result = await searchMealsByName(mealName);
      if (result.success && result.data.meals) {
        return JSON.stringify({
          success: true,
          mealName,
          count: result.data.meals.length,
          meals: result.data.meals.map(meal => ({
            id: meal.idMeal,
            name: meal.strMeal,
            category: meal.strCategory,
            area: meal.strArea,
            image: meal.strMealThumb
          }))
        });
      } else {
        return JSON.stringify({ success: false, error: 'No meals found' });
      }
    } catch (error) {
      return JSON.stringify({ success: false, error: 'Failed to search meals by name' });
    }
  }
});

export const getRandomMealTool = new DynamicStructuredTool({
  name: 'get_random_meal',
  description: 'Get a random meal suggestion. Useful for providing variety or when the user wants to try something new.',
  schema: z.object({}),
  func: async () => {
    try {
      const result = await getRandomMeal();
      if (result.success && result.data.meals && result.data.meals.length > 0) {
        const meal = result.data.meals[0];
        return JSON.stringify({
          success: true,
          meal: {
            id: meal.idMeal,
            name: meal.strMeal,
            category: meal.strCategory,
            area: meal.strArea,
            tags: meal.strTags
          }
        });
      } else {
        return JSON.stringify({ success: false, error: 'Failed to get random meal' });
      }
    } catch (error) {
      return JSON.stringify({ success: false, error: 'Failed to get random meal' });
    }
  }
});

export const searchWorkoutDemonstrationsTool = new DynamicStructuredTool({
  name: 'search_workout_demonstrations',
  description: 'Search for workout demonstration videos and guides (e.g., proper form tutorials). Returns URLs users can click to learn exercises.',
  schema: z.object({
    exerciseName: z.string().describe('Exercise name to search, e.g., "push-up", "squat"'),
    searchType: z.enum(['video', 'guide', 'tutorial']).optional().describe('Preferred demo content type'),
    limit: z.number().optional().describe('Max results to return (default 3)')
  }),
  func: async ({ exerciseName, searchType = 'video', limit = 3 }) => {
    try {
      let query = `${exerciseName} proper form exercise`;
      if (searchType === 'video') query += ' video tutorial';
      if (searchType === 'guide') query += ' step by step guide';
      if (searchType === 'tutorial') query += ' how to';

      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
      const res = await fetch(url, { headers: { 'Accept': 'application/json', 'User-Agent': 'Root-AI-Fitness-Coach/1.0' } });
      if (!res.ok) throw new Error(`DuckDuckGo API ${res.status}`);
      const data = await res.json();

      const results: Array<{ type: string; title: string; description?: string; url: string; source: string; }> = [];

      if (data.Abstract && data.AbstractURL) {
        results.push({
          type: 'guide',
          title: data.Heading || `${exerciseName} Exercise Guide`,
          description: data.Abstract,
          url: data.AbstractURL,
          source: 'DuckDuckGo'
        });
      }

      if (Array.isArray(data.RelatedTopics)) {
        for (const topic of data.RelatedTopics) {
          if (results.length >= limit) break;
          if (topic && topic.Text && topic.FirstURL) {
            results.push({
              type: 'related',
              title: (topic.Text as string).split(' - ')[0],
              description: topic.Text,
              url: topic.FirstURL,
              source: 'DuckDuckGo'
            });
          }
        }
      }

      if (results.length === 0) {
        results.push(
          {
            type: 'fallback',
            title: `YouTube: ${exerciseName} proper form`,
            url: `https://www.youtube.com/results?search_query=${encodeURIComponent(exerciseName + ' proper form exercise')}`,
            source: 'YouTube'
          },
          {
            type: 'fallback',
            title: `Google: ${exerciseName} exercise guide`,
            url: `https://www.google.com/search?q=${encodeURIComponent(exerciseName + ' proper form exercise guide')}`,
            source: 'Google'
          }
        );
      }

      return JSON.stringify({ success: true, exerciseName, count: Math.min(results.length, limit), results: results.slice(0, limit) });
    } catch (err) {
      return JSON.stringify({
        success: true,
        exerciseName,
        count: 2,
        results: [
          { type: 'fallback', title: `YouTube: ${exerciseName} proper form`, url: `https://www.youtube.com/results?search_query=${encodeURIComponent(exerciseName + ' proper form exercise')}`, source: 'YouTube' },
          { type: 'fallback', title: `Google: ${exerciseName} exercise guide`, url: `https://www.google.com/search?q=${encodeURIComponent(exerciseName + ' proper form exercise guide')}`, source: 'Google' }
        ]
      });
    }
  }
});

// RAG System Tool for Workout Knowledge
let ragManagerInstance: RAGManager | null = null;

async function getRAGManager(): Promise<RAGManager> {
  if (!ragManagerInstance) {
    ragManagerInstance = new RAGManager({
      vectorStorePath: './data/vectorstore',
      maxUrlsPerBatch: 3,
      minContentLength: 300
    });
    
    try {
      await ragManagerInstance.initialize();
    } catch (error) {
      console.error('Failed to initialize RAG manager:', error);
      throw error;
    }
  }
  
  return ragManagerInstance;
}

export const askWorkoutQuestionTool = new DynamicStructuredTool({
  name: 'ask_workout_question',
  description: 'Ask questions about workouts, exercises, fitness routines, form, technique, or general fitness advice. This tool has access to a comprehensive knowledge base of fitness information from reliable sources.',
  schema: z.object({
    question: z.string().describe('The fitness or workout question to ask (e.g., "How do I do a proper squat?", "What are good beginner exercises?", "What should I eat after a workout?")'),
    questionType: z.enum(['general', 'workout', 'form', 'nutrition']).optional().describe('Type of question: general (default), workout (routine suggestions), form (exercise technique), nutrition (diet advice)')
  }),
  func: async ({ question, questionType = 'general' }) => {
    try {
      const ragManager = await getRAGManager();
      
      let response;
      switch (questionType) {
        case 'workout':
          response = await ragManager.getWorkoutSuggestions(question);
          break;
        case 'form':
          response = await ragManager.getExerciseForm(question);
          break;
        case 'nutrition':
          response = await ragManager.getWorkoutNutrition(question);
          break;
        default:
          response = await ragManager.askQuestion(question);
      }

      const sourcesInfo = response.sources.length > 0 
        ? `\n\nSources: ${response.sources.map(s => `${s.title} (${s.url})`).join(', ')}`
        : '';

      return JSON.stringify({
        success: true,
        answer: response.answer + sourcesInfo,
        sources: response.sources,
        questionType
      });
    } catch (error) {
      return JSON.stringify({ 
        success: false, 
        error: 'Unable to access workout knowledge base. Please try again or ask a different question.',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

// Export all tools
export const allTools = [
  // WGER Exercise Tools
  searchExercisesTool,
  getMusclesTool,
  getEquipmentTool,
  
  // TheMealDB Nutrition Tools
  findMealsByIngredientTool,
  getMealDetailsTool,
  findHealthyMealsTool,
  findHighProteinMealsTool,
  findVegetarianMealsTool,
  searchMealsByNameTool,
  getRandomMealTool,

  // Workout Demonstration Tools
  searchWorkoutDemonstrationsTool,

  // RAG System Tool
  askWorkoutQuestionTool
];

// Export tool groups for convenience
export const exerciseTools = [
  searchExercisesTool,
  getMusclesTool,
  getEquipmentTool,
  searchWorkoutDemonstrationsTool,
  askWorkoutQuestionTool
];

export const nutritionTools = [
  findMealsByIngredientTool,
  getMealDetailsTool,
  findHealthyMealsTool,
  findHighProteinMealsTool,
  findVegetarianMealsTool,
  searchMealsByNameTool,
  getRandomMealTool
];
