"use client";

import {
  AppleIcon,
  BulbIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ClockIcon,
  EggIcon,
  MoonIcon,
  PillIcon,
  PlateIcon,
  RunningIcon,
  SunIcon,
  SunriseIcon,
  WarningIcon,
} from "./icons";

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

interface NutritionPlanDisplayProps {
  nutritionPlan: NutritionPlan;
}

export default function NutritionPlanDisplay({ nutritionPlan }: NutritionPlanDisplayProps) {
  return (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-8 mb-12 shadow-lg">
      <div className="flex items-center mb-8">
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4 rounded-full mr-6">
          <AppleIcon className="w-8 h-8 text-white" />
        </div>
        <div>
          <h3 className="text-3xl font-bold text-green-800 mb-2">Your Personalized Nutrition Plan</h3>
          <p className="text-green-600 text-lg">Tailored for {nutritionPlan.userInfo.goal.replace('_', ' ')} goals</p>
        </div>
      </div>

      {/* Daily Guidelines */}
      <div className="bg-white rounded-xl p-6 shadow-md border border-green-100 mb-8">
        <h4 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <ChartBarIcon className="w-6 h-6 text-green-600 mr-3" />
          Daily Guidelines
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-green-50 rounded-lg p-4">
            <h5 className="font-semibold text-green-800 mb-2">Calories</h5>
            <p className="text-green-700">{nutritionPlan.dailyGuidelines.calories}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <h5 className="font-semibold text-blue-800 mb-2">Protein</h5>
            <p className="text-blue-700">{nutritionPlan.dailyGuidelines.macronutrients.protein}</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-4">
            <h5 className="font-semibold text-orange-800 mb-2">Carbs</h5>
            <p className="text-orange-700">{nutritionPlan.dailyGuidelines.macronutrients.carbohydrates}</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <h5 className="font-semibold text-purple-800 mb-2">Fats</h5>
            <p className="text-purple-700">{nutritionPlan.dailyGuidelines.macronutrients.fats}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h5 className="font-semibold text-gray-900 mb-3">Meal Timing</h5>
            <ul className="space-y-2">
              {nutritionPlan.dailyGuidelines.mealTiming.map((item, index) => (
                <li key={index} className="text-gray-700 flex items-start">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h5 className="font-semibold text-gray-900 mb-3">Hydration</h5>
            <ul className="space-y-2">
              {nutritionPlan.dailyGuidelines.hydration.map((item, index) => (
                <li key={index} className="text-gray-700 flex items-start">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Meal Plan */}
      <div className="bg-white rounded-xl p-6 shadow-md border border-green-100 mb-8">
        <h4 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <PlateIcon className="w-6 h-6 text-green-600 mr-3" />
          Daily Meal Plan
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Breakfast */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 border border-yellow-200">
            <h5 className="font-bold text-yellow-800 mb-2 flex items-center">
              <SunriseIcon className="w-4 h-4 mr-2" />
              Breakfast
            </h5>
            <p className="text-gray-700 mb-3">{nutritionPlan.mealPlan.breakfast.description}</p>
            <div className="mb-3">
              <p className="text-sm font-semibold text-gray-600 mb-1">Key Nutrients:</p>
              <div className="flex flex-wrap gap-1">
                {nutritionPlan.mealPlan.breakfast.keyNutrients.map((nutrient, index) => (
                  <span key={index} className="bg-yellow-200 text-yellow-800 px-2 py-1 rounded text-xs">
                    {nutrient}
                  </span>
                ))}
              </div>
            </div>
            <p className="text-sm text-gray-600 flex items-center gap-1">
              <ClockIcon className="w-3.5 h-3.5" />
              {nutritionPlan.mealPlan.breakfast.preparationTime}
            </p>
          </div>

          {/* Lunch */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
            <h5 className="font-bold text-green-800 mb-2 flex items-center">
              <SunIcon className="w-4 h-4 mr-2" />
              Lunch
            </h5>
            <p className="text-gray-700 mb-3">{nutritionPlan.mealPlan.lunch.description}</p>
            <div className="mb-3">
              <p className="text-sm font-semibold text-gray-600 mb-1">Key Nutrients:</p>
              <div className="flex flex-wrap gap-1">
                {nutritionPlan.mealPlan.lunch.keyNutrients.map((nutrient, index) => (
                  <span key={index} className="bg-green-200 text-green-800 px-2 py-1 rounded text-xs">
                    {nutrient}
                  </span>
                ))}
              </div>
            </div>
            <p className="text-sm text-gray-600 flex items-center gap-1">
              <ClockIcon className="w-3.5 h-3.5" />
              {nutritionPlan.mealPlan.lunch.preparationTime}
            </p>
          </div>

          {/* Dinner */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-200">
            <h5 className="font-bold text-purple-800 mb-2 flex items-center">
              <MoonIcon className="w-4 h-4 mr-2" />
              Dinner
            </h5>
            <p className="text-gray-700 mb-3">{nutritionPlan.mealPlan.dinner.description}</p>
            <div className="mb-3">
              <p className="text-sm font-semibold text-gray-600 mb-1">Key Nutrients:</p>
              <div className="flex flex-wrap gap-1">
                {nutritionPlan.mealPlan.dinner.keyNutrients.map((nutrient, index) => (
                  <span key={index} className="bg-purple-200 text-purple-800 px-2 py-1 rounded text-xs">
                    {nutrient}
                  </span>
                ))}
              </div>
            </div>
            <p className="text-sm text-gray-600 flex items-center gap-1">
              <ClockIcon className="w-3.5 h-3.5" />
              {nutritionPlan.mealPlan.dinner.preparationTime}
            </p>
          </div>

          {/* Snacks */}
          <div className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg p-4 border border-pink-200">
            <h5 className="font-bold text-pink-800 mb-2 flex items-center">
              <AppleIcon className="w-4 h-4 mr-2" />
              Snacks
            </h5>
            <p className="text-gray-700 mb-3">{nutritionPlan.mealPlan.snacks.description}</p>
            <div className="mb-3">
              <p className="text-sm font-semibold text-gray-600 mb-1">Key Nutrients:</p>
              <div className="flex flex-wrap gap-1">
                {nutritionPlan.mealPlan.snacks.keyNutrients.map((nutrient, index) => (
                  <span key={index} className="bg-pink-200 text-pink-800 px-2 py-1 rounded text-xs">
                    {nutrient}
                  </span>
                ))}
              </div>
            </div>
            <p className="text-sm text-gray-600 flex items-center gap-1">
              <ClockIcon className="w-3.5 h-3.5" />
              {nutritionPlan.mealPlan.snacks.preparationTime}
            </p>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-xl p-6 shadow-md border border-green-100 mb-8">
        <h4 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <BulbIcon className="w-6 h-6 text-green-600 mr-3" />
          Recommendations
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <h5 className="font-semibold text-green-800 mb-3 flex items-center">
              <CheckCircleIcon className="w-4 h-4 mr-2" />
              Foods to Include
            </h5>
            <ul className="space-y-2">
              {nutritionPlan.recommendations.foodsToInclude.map((food, index) => (
                <li key={index} className="text-gray-700 flex items-start">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                  <span>{food}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h5 className="font-semibold text-red-800 mb-3 flex items-center">
              <WarningIcon className="w-4 h-4 mr-2" />
              Foods to Limit
            </h5>
            <ul className="space-y-2">
              {nutritionPlan.recommendations.foodsToLimit.map((food, index) => (
                <li key={index} className="text-gray-700 flex items-start">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                  <span>{food}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h5 className="font-semibold text-blue-800 mb-3 flex items-center">
              <PillIcon className="w-4 h-4 mr-2" />
              Supplements
            </h5>
            <ul className="space-y-2">
              {nutritionPlan.recommendations.supplements.map((supplement, index) => (
                <li key={index} className="text-gray-700 flex items-start">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                  <span>{supplement}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div>
            <h5 className="font-semibold text-purple-800 mb-3 flex items-center">
              <EggIcon className="w-4 h-4 mr-2" />
              Meal Prep Tips
            </h5>
            <ul className="space-y-2">
              {nutritionPlan.recommendations.mealPrep.map((tip, index) => (
                <li key={index} className="text-gray-700 flex items-start">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h5 className="font-semibold text-orange-800 mb-3 flex items-center">
              <RunningIcon className="w-4 h-4 mr-2" />
              Lifestyle Tips
            </h5>
            <ul className="space-y-2">
              {nutritionPlan.recommendations.lifestyle.map((tip, index) => (
                <li key={index} className="text-gray-700 flex items-start">
                  <span className="w-2 h-2 bg-orange-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Safety Notes */}
      <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-6">
        <div className="flex items-center mb-4">
          <div className="bg-gradient-to-r from-yellow-500 to-amber-600 p-3 rounded-full mr-4">
            <WarningIcon className="w-6 h-6 text-white" />
          </div>
          <h4 className="text-xl font-bold text-yellow-800">Important Safety Notes</h4>
        </div>
        <ul className="space-y-3">
          {nutritionPlan.safetyNotes.map((note, index) => (
            <li key={index} className="text-yellow-800 flex items-start">
              <span className="w-3 h-3 bg-yellow-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
              <span className="leading-relaxed">{note}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}


