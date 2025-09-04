// Nutrition Tools using TheMealDB API
// This file contains tools for nutrition planning, food database search, and meal suggestions
// TheMealDB is free and doesn't require API keys

// TheMealDB API Types
export interface TheMealDBMeal {
  idMeal: string;
  strMeal: string;
  strDrinkAlternate?: string;
  strCategory?: string;
  strArea?: string;
  strInstructions?: string;
  strMealThumb?: string;
  strTags?: string;
  strYoutube?: string;
  strIngredient1?: string;
  strIngredient2?: string;
  strIngredient3?: string;
  strIngredient4?: string;
  strIngredient5?: string;
  strIngredient6?: string;
  strIngredient7?: string;
  strIngredient8?: string;
  strIngredient9?: string;
  strIngredient10?: string;
  strIngredient11?: string;
  strIngredient12?: string;
  strIngredient13?: string;
  strIngredient14?: string;
  strIngredient15?: string;
  strIngredient16?: string;
  strIngredient17?: string;
  strIngredient18?: string;
  strIngredient19?: string;
  strIngredient20?: string;
  strMeasure1?: string;
  strMeasure2?: string;
  strMeasure3?: string;
  strMeasure4?: string;
  strMeasure5?: string;
  strMeasure6?: string;
  strMeasure7?: string;
  strMeasure8?: string;
  strMeasure9?: string;
  strMeasure10?: string;
  strMeasure11?: string;
  strMeasure12?: string;
  strMeasure13?: string;
  strMeasure14?: string;
  strMeasure15?: string;
  strMeasure16?: string;
  strMeasure17?: string;
  strMeasure18?: string;
  strMeasure19?: string;
  strMeasure20?: string;
  strSource?: string;
  strImageSource?: string;
  strCreativeCommonsConfirmed?: string;
  dateModified?: string;
}

export interface TheMealDBMealPreview {
  idMeal: string;
  strMeal: string;
  strMealThumb?: string;
}

export interface TheMealDBFilterResponse {
  meals: TheMealDBMealPreview[] | null;
}

export interface TheMealDBLookupResponse {
  meals: TheMealDBMeal[] | null;
}

export interface TheMealDBCategory {
  idCategory: string;
  strCategory: string;
  strCategoryThumb?: string;
  strCategoryDescription?: string;
}

export interface TheMealDBCategoriesResponse {
  categories: TheMealDBCategory[];
}

export interface TheMealDBArea {
  strArea: string;
}

export interface TheMealDBAreasResponse {
  meals: TheMealDBArea[] | null;
}

export interface TheMealDBIngredient {
  idIngredient: string;
  strIngredient: string;
  strDescription?: string;
  strType?: string;
}

export interface TheMealDBIngredientsResponse {
  meals: TheMealDBIngredient[] | null;
}

export type TheMealDBResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string; status?: number };

// TheMealDB API Configuration
const THEMEALDB_CONFIG = {
  baseUrl: 'https://www.themealdb.com/api/json/v1/1',
  timeout: 10000 // 10 seconds
};

// Utility function to make TheMealDB API requests
async function makeTheMealDBRequest<T>(
  endpoint: string,
  params?: Record<string, string>
): Promise<TheMealDBResult<T>> {
  try {
    const url = new URL(`${THEMEALDB_CONFIG.baseUrl}${endpoint}`);
    
    // Add parameters
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) url.searchParams.append(key, value);
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), THEMEALDB_CONFIG.timeout);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Root-AI-Fitness-Coach/1.0'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        error: `TheMealDB API error: ${response.status} ${response.statusText}`,
        status: response.status
      };
    }

    const data = await response.json();
    return {
      success: true,
      data: data
    };

  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timeout - TheMealDB API took too long to respond'
        };
      }
      return {
        success: false,
        error: `Network error: ${error.message}`
      };
    }
    return {
      success: false,
      error: 'Unknown error occurred'
    };
  }
}

// Core TheMealDB Functions

// Step 1: Filter meals by main ingredient
export async function findMealsByIngredient(
  ingredient: string
): Promise<TheMealDBResult<TheMealDBFilterResponse>> {
  return makeTheMealDBRequest<TheMealDBFilterResponse>(
    '/filter.php',
    { i: ingredient }
  );
}

// Step 2: Get detailed meal information by ID
export async function getMealDetails(
  mealId: string
): Promise<TheMealDBResult<TheMealDBLookupResponse>> {
  return makeTheMealDBRequest<TheMealDBLookupResponse>(
    '/lookup.php',
    { i: mealId }
  );
}

// Additional useful functions

// Search meals by name
export async function searchMealsByName(
  mealName: string
): Promise<TheMealDBResult<TheMealDBLookupResponse>> {
  return makeTheMealDBRequest<TheMealDBLookupResponse>(
    '/search.php',
    { s: mealName }
  );
}

// Get meals by category
export async function getMealsByCategory(
  category: string
): Promise<TheMealDBResult<TheMealDBFilterResponse>> {
  return makeTheMealDBRequest<TheMealDBFilterResponse>(
    '/filter.php',
    { c: category }
  );
}

// Get meals by area/cuisine
export async function getMealsByArea(
  area: string
): Promise<TheMealDBResult<TheMealDBFilterResponse>> {
  return makeTheMealDBRequest<TheMealDBFilterResponse>(
    '/filter.php',
    { a: area }
  );
}

// Get all categories
export async function getAllCategories(): Promise<TheMealDBResult<TheMealDBCategoriesResponse>> {
  return makeTheMealDBRequest<TheMealDBCategoriesResponse>('/categories.php');
}

// Get all areas/cuisines
export async function getAllAreas(): Promise<TheMealDBResult<TheMealDBAreasResponse>> {
  return makeTheMealDBRequest<TheMealDBAreasResponse>('/list.php?list=list');
}

// Get all ingredients
export async function getAllIngredients(): Promise<TheMealDBResult<TheMealDBIngredientsResponse>> {
  return makeTheMealDBRequest<TheMealDBIngredientsResponse>('/list.php?list=list');
}

// Get random meal
export async function getRandomMeal(): Promise<TheMealDBResult<TheMealDBLookupResponse>> {
  return makeTheMealDBRequest<TheMealDBLookupResponse>('/random.php');
}

// Specialized Functions for Common Use Cases

// Find healthy meals (filter by ingredients commonly associated with healthy eating)
export async function findHealthyMeals(
  options: {
    protein?: string;
    vegetables?: string;
    limit?: number;
  } = {}
): Promise<TheMealDBResult<TheMealDBFilterResponse>> {
  // Try common healthy ingredients
  const healthyIngredients = [
    options.protein || 'chicken',
    options.vegetables || 'spinach',
    'salmon',
    'quinoa',
    'avocado',
    'broccoli'
  ];

  // Try the first ingredient that works
  for (const ingredient of healthyIngredients) {
    const result = await findMealsByIngredient(ingredient);
    if (result.success && result.data.meals && result.data.meals.length > 0) {
      return result;
    }
  }

  return {
    success: false,
    error: 'No healthy meals found with the specified ingredients'
  };
}

// Find high-protein meals
export async function findHighProteinMeals(): Promise<TheMealDBResult<TheMealDBFilterResponse>> {
  const proteinIngredients = ['chicken', 'beef', 'salmon', 'tuna', 'eggs', 'tofu'];
  
  for (const ingredient of proteinIngredients) {
    const result = await findMealsByIngredient(ingredient);
    if (result.success && result.data.meals && result.data.meals.length > 0) {
      return result;
    }
  }

  return {
    success: false,
    error: 'No high-protein meals found'
  };
}

// Find vegetarian meals
export async function findVegetarianMeals(): Promise<TheMealDBResult<TheMealDBFilterResponse>> {
  const vegIngredients = ['spinach', 'mushroom', 'tofu', 'quinoa', 'lentil', 'chickpea'];
  
  for (const ingredient of vegIngredients) {
    const result = await findMealsByIngredient(ingredient);
    if (result.success && result.data.meals && result.data.meals.length > 0) {
      return result;
    }
  }

  return {
    success: false,
    error: 'No vegetarian meals found'
  };
}

// Helper Functions

// Extract ingredients and measures from a meal
export function extractIngredientsAndMeasures(meal: TheMealDBMeal): Array<{
  ingredient: string;
  measure: string;
}> {
  const ingredients: Array<{ ingredient: string; measure: string }> = [];
  
  for (let i = 1; i <= 20; i++) {
    const ingredient = meal[`strIngredient${i}` as keyof TheMealDBMeal] as string;
    const measure = meal[`strMeasure${i}` as keyof TheMealDBMeal] as string;
    
    if (ingredient && ingredient.trim()) {
      ingredients.push({
        ingredient: ingredient.trim(),
        measure: measure ? measure.trim() : ''
      });
    }
  }
  
  return ingredients;
}

// Format meal information for display
export function formatMealInfo(meal: TheMealDBMeal): string {
  const ingredients = extractIngredientsAndMeasures(meal);
  
  let formatted = `🍽️ ${meal.strMeal}\n\n`;
  
  if (meal.strCategory) {
    formatted += `📂 Category: ${meal.strCategory}\n`;
  }
  
  if (meal.strArea) {
    formatted += `🌍 Cuisine: ${meal.strArea}\n`;
  }
  
  if (meal.strTags) {
    formatted += `🏷️ Tags: ${meal.strTags}\n`;
  }
  
  formatted += `\n📋 Ingredients:\n`;
  ingredients.forEach(({ ingredient, measure }) => {
    formatted += `• ${measure} ${ingredient}\n`;
  });
  
  if (meal.strInstructions) {
    formatted += `\n📝 Instructions:\n${meal.strInstructions}\n`;
  }
  
  if (meal.strYoutube) {
    formatted += `\n📺 Watch: ${meal.strYoutube}\n`;
  }
  
  return formatted;
}

// Calculate estimated calories (rough approximation)
export function estimateCalories(meal: TheMealDBMeal): number {
  const ingredients = extractIngredientsAndMeasures(meal);
  let totalCalories = 0;
  
  // Rough calorie estimates for common ingredients
  const calorieEstimates: Record<string, number> = {
    'chicken': 165,
    'beef': 250,
    'salmon': 208,
    'rice': 130,
    'pasta': 131,
    'potato': 77,
    'tomato': 18,
    'onion': 40,
    'garlic': 4,
    'olive oil': 119,
    'butter': 102,
    'egg': 70,
    'milk': 42,
    'cheese': 113,
    'bread': 79,
    'spinach': 23,
    'broccoli': 34,
    'carrot': 41,
    'bell pepper': 31,
    'mushroom': 22
  };
  
  ingredients.forEach(({ ingredient, measure }) => {
    const lowerIngredient = ingredient.toLowerCase();
    
    // Find matching ingredient
    for (const [key, calories] of Object.entries(calorieEstimates)) {
      if (lowerIngredient.includes(key)) {
        // Rough estimate: assume 100g serving
        totalCalories += calories;
        break;
      }
    }
  });
  
  return totalCalories;
}

// Export configuration for external use
export { THEMEALDB_CONFIG };
