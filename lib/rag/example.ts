/**
 * Example usage of the RAG system
 * This file demonstrates how to use the RAG system in your application
 */

import { RAGManager } from './ragManager';

// Example 1: Basic usage
export async function basicRAGExample() {
  console.log('=== Basic RAG Example ===');
  
  const ragManager = new RAGManager();
  await ragManager.initialize();
  
  const response = await ragManager.askQuestion("What are some good beginner exercises?");
  console.log('Answer:', response.answer);
  console.log('Sources:', response.sources);
}

// Example 2: Workout suggestions
export async function workoutSuggestionExample() {
  console.log('=== Workout Suggestion Example ===');
  
  const ragManager = new RAGManager();
  await ragManager.initialize();
  
  const response = await ragManager.getWorkoutSuggestions("I want to build muscle");
  console.log('Workout Plan:', response.answer);
  console.log('Sources:', response.sources);
}

// Example 3: Exercise form
export async function exerciseFormExample() {
  console.log('=== Exercise Form Example ===');
  
  const ragManager = new RAGManager();
  await ragManager.initialize();
  
  const response = await ragManager.getExerciseForm("push-up");
  console.log('Form Guide:', response.answer);
  console.log('Sources:', response.sources);
}

// Example 4: Nutrition advice
export async function nutritionExample() {
  console.log('=== Nutrition Example ===');
  
  const ragManager = new RAGManager();
  await ragManager.initialize();
  
  const response = await ragManager.getWorkoutNutrition("What should I eat before a workout?");
  console.log('Nutrition Advice:', response.answer);
  console.log('Sources:', response.sources);
}

// Example 5: Adding custom URLs
export async function customUrlsExample() {
  console.log('=== Custom URLs Example ===');
  
  const ragManager = new RAGManager();
  await ragManager.initialize();
  
  // Add your own fitness URLs
  const customUrls = [
    'https://your-fitness-blog.com/workout-guide',
    'https://another-site.com/exercise-tips'
  ];
  
  try {
    await ragManager.addUrlsToKnowledgeBase(customUrls);
    console.log('Custom URLs added successfully!');
  } catch (error) {
    console.log('Note: Custom URLs example requires valid URLs');
  }
}

// Example 6: System status
export async function systemStatusExample() {
  console.log('=== System Status Example ===');
  
  const ragManager = new RAGManager();
  await ragManager.initialize();
  
  const status = ragManager.getStatus();
  console.log('System Status:', JSON.stringify(status, null, 2));
}

// Run all examples
export async function runAllExamples() {
  try {
    await basicRAGExample();
    await workoutSuggestionExample();
    await exerciseFormExample();
    await nutritionExample();
    await customUrlsExample();
    await systemStatusExample();
    
    console.log('\n✅ All examples completed successfully!');
  } catch (error) {
    console.error('❌ Error running examples:', error);
  }
}
