// WGER API Types
export interface WgerExercise {
  id: number;
  name: string;
  description?: string;
  
  
  category?: number;
  muscles?: number[];
  muscles_secondary?: number[];
  equipment?: number[];
  variations?: number[];
  images?: WgerImage[];
  instructions?: string[];
}

export interface WgerImage {
  id: number;
  uuid: string;
  exercise_base: number;
  image: string;
  is_main: boolean;
}



export interface WgerMuscle {
  id: number;
  name: string;
  is_front: boolean;
  image_url_main: string;
  image_url_secondary: string;
}

export interface WgerEquipment {
  id: number;
  name: string;
}

export interface WgerCategory {
  id: number;
  name: string;
}





export interface WgerExerciseImage {
  id: number;
  uuid: string;
  exercise_base: number;
  image: string;
  is_main: boolean;
  style: string;
}

// API Response Types
export interface WgerApiResponse<T> {
  count: number;
  next?: string;
  previous?: string;
  results: T[];
}

export interface WgerError {
  success: false;
  error: string;
  status?: number;
}

export interface WgerSuccess<T> {
  success: true;
  data: T;
  count?: number;
}

export type WgerResult<T> = WgerSuccess<T> | WgerError;

// WGER API Configuration
const WGER_CONFIG = {
  baseUrl: 'https://wger.de/api/v2',
  headers: {
    'Accept': 'application/json',
    'User-Agent': 'Root-AI-Fitness-Coach/1.0'
  },
  timeout: 10000 // 10 seconds
};



// Utility Functions
async function makeWgerRequest<T>(endpoint: string, params?: Record<string, string>): Promise<WgerResult<T>> {
  try {
    const url = new URL(`${WGER_CONFIG.baseUrl}${endpoint}`);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) url.searchParams.append(key, value);
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WGER_CONFIG.timeout);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: WGER_CONFIG.headers,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        error: `WGER API error: ${response.status} ${response.statusText}`,
        status: response.status
      };
    }

    const data = await response.json();
    return {
      success: true,
      data: data.results || data,
      count: data.count
    };

  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timeout - WGER API took too long to respond'
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

// Core WGER API Functions
export async function searchExercises(
  query: string,
  options: {
    category?: string;
    muscle?: string;
    equipment?: string;
    limit?: number;
  } = {}
): Promise<WgerResult<WgerExercise[]>> {
  const params: Record<string, string> = {
    search: query,
    limit: (options.limit || 10).toString()
  };

  if (options.category) params.category = options.category;
  if (options.muscle) params.muscles = options.muscle;
  if (options.equipment) params.equipment = options.equipment;

  return makeWgerRequest<WgerExercise[]>('/exercise/', params);
}

export async function getExerciseDetails(exerciseId: number): Promise<WgerResult<WgerExercise>> {
  return makeWgerRequest<WgerExercise>(`/exercise/${exerciseId}/`);
}





export async function getMuscles(): Promise<WgerResult<WgerMuscle[]>> {
  return makeWgerRequest<WgerMuscle[]>('/muscle/');
}

export async function getEquipment(): Promise<WgerResult<WgerEquipment[]>> {
  return makeWgerRequest<WgerEquipment[]>('/equipment/');
}

export async function getCategories(): Promise<WgerResult<WgerCategory[]>> {
  return makeWgerRequest<WgerCategory[]>('/exercisecategory/');
}

// Specialized Functions for Common Use Cases
export async function findExercisesByMuscleGroup(
  muscleGroups: string[],
  options: {
    category?: string;
    equipment?: string;
    limit?: number;
  } = {}
): Promise<WgerResult<WgerExercise[]>> {
  // First, get all muscles to find the correct IDs
  const musclesResult = await getMuscles();
  if (!musclesResult.success) {
    return musclesResult;
  }

  const muscleIds: number[] = [];
  for (const muscleGroup of muscleGroups) {
    const muscle = musclesResult.data.find(m => 
      m.name.toLowerCase().includes(muscleGroup.toLowerCase())
    );
    if (muscle) {
      muscleIds.push(muscle.id);
    }
  }

  if (muscleIds.length === 0) {
    return {
      success: false,
      error: `No muscles found for: ${muscleGroups.join(', ')}`
    };
  }

  // Search exercises for each muscle group
  const allExercises: WgerExercise[] = [];
  for (const muscleId of muscleIds) {
    const result = await searchExercises('', {
      ...options,
      muscle: muscleId.toString()
    });
    
    if (result.success) {
      allExercises.push(...result.data);
    }
  }

  // Remove duplicates and limit results
  const uniqueExercises = allExercises.filter((exercise, index, self) => 
    index === self.findIndex(e => e.id === exercise.id)
  );

  return {
    success: true,
    data: uniqueExercises.slice(0, options.limit || 10),
    count: uniqueExercises.length
  };
}



export async function getExerciseWithDetails(exerciseId: number): Promise<WgerResult<WgerExercise & {
  muscleNames: string[];
  equipmentNames: string[];
  categoryName?: string;
}>> {
  const exerciseResult = await getExerciseDetails(exerciseId);
  if (!exerciseResult.success) {
    return exerciseResult;
  }

  const exercise = exerciseResult.data;

  // Get muscle names
  let muscleNames: string[] = [];
  if (exercise.muscles && exercise.muscles.length > 0) {
    const musclesResult = await getMuscles();
    if (musclesResult.success) {
      muscleNames = exercise.muscles
        .map(muscleId => musclesResult.data.find(m => m.id === muscleId)?.name)
        .filter(Boolean) as string[];
    }
  }

  // Get equipment names
  let equipmentNames: string[] = [];
  if (exercise.equipment && exercise.equipment.length > 0) {
    const equipmentResult = await getEquipment();
    if (equipmentResult.success) {
      equipmentNames = exercise.equipment
        .map(equipmentId => equipmentResult.data.find(e => e.id === equipmentId)?.name)
        .filter(Boolean) as string[];
    }
  }

  // Get category name
  let categoryName: string | undefined;
  if (exercise.category) {
    const categoriesResult = await getCategories();
    if (categoriesResult.success) {
      categoryName = categoriesResult.data.find(c => c.id === exercise.category)?.name;
    }
  }

  return {
    success: true,
    data: {
      ...exercise,
      muscleNames,
      equipmentNames,
      categoryName
    }
  };
}





// Exercise Image Functions
export async function getExerciseImages(
  options: {
    exercise_base?: number;
    limit?: number;
    offset?: number;
  } = {}
): Promise<WgerResult<WgerExerciseImage[]>> {
  const params: Record<string, string> = {
    limit: (options.limit || 20).toString()
  };

  if (options.exercise_base) params.exercise_base = options.exercise_base.toString();
  if (options.offset) params.offset = options.offset.toString();

  return makeWgerRequest<WgerExerciseImage[]>('/exerciseimage/', params);
}

export async function getExerciseImageDetails(imageId: number): Promise<WgerResult<WgerExerciseImage>> {
  return makeWgerRequest<WgerExerciseImage>(`/exerciseimage/${imageId}/`);
}

export async function getImagesForExercise(exerciseBaseId: number): Promise<WgerResult<WgerExerciseImage[]>> {
  return getExerciseImages({ exercise_base: exerciseBaseId });
}

// Helper function to get exercise images
export function getExerciseImageUrl(exercise: WgerExercise, isMain: boolean = true): string | null {
  if (!exercise.images || exercise.images.length === 0) {
    return null;
  }

  const image = exercise.images.find(img => img.is_main === isMain) || exercise.images[0];
  if (!image) return null;
  
  // Fix double domain issue
  const imagePath = image.image.startsWith('https://') ? image.image : `https://wger.de${image.image}`;
  return imagePath;
}

// Helper function to format exercise instructions
export function formatExerciseInstructions(exercise: WgerExercise): string {
  if (!exercise.instructions || exercise.instructions.length === 0) {
    return exercise.description || 'No instructions available.';
  }

  return exercise.instructions
    .map((instruction, index) => `${index + 1}. ${instruction}`)
    .join('\n\n');
}

// Helper function to get image URL
export function getImageUrl(image: WgerExerciseImage): string {
  // Fix double domain issue
  const imagePath = image.image.startsWith('https://') ? image.image : `https://wger.de${image.image}`;
  return imagePath;
}

// Helper function to get main image for an exercise
export async function getMainImageForExercise(exerciseBaseId: number): Promise<WgerResult<WgerExerciseImage | null>> {
  const imagesResult = await getImagesForExercise(exerciseBaseId);
  if (!imagesResult.success) {
    return imagesResult;
  }

  const mainImage = imagesResult.data.find(image => image.is_main);
  return {
    success: true,
    data: mainImage || null
  };
}

// Export configuration for external use
export { WGER_CONFIG };
