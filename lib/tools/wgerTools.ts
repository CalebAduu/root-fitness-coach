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

// wger's text-search endpoints no longer filter results, so we pull the full English
// exercise list once, keep a slim copy in memory, and search it locally.
export interface WgerExerciseSummary {
  id: number;
  name: string;
  category: string;
  muscles: string[];
  musclesSecondary: string[];
  equipment: string[];
  description: string;
  muscleIds: number[];
  equipmentIds: number[];
  categoryId: number | null;
}

let exerciseIndexPromise: Promise<WgerExerciseSummary[]> | null = null;

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

async function loadExerciseIndex(): Promise<WgerExerciseSummary[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(`${WGER_CONFIG.baseUrl}/exerciseinfo/?language=2&limit=1000&format=json`, {
      headers: WGER_CONFIG.headers,
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`WGER API error: ${response.status} ${response.statusText}`);
    const data = await response.json();

    return (data.results as any[])
      .map((e) => {
        const translation = (e.translations || []).find((t: any) => t.language === 2);
        if (!translation?.name) return null;
        return {
          id: e.id,
          name: translation.name,
          category: e.category?.name ?? '',
          categoryId: e.category?.id ?? null,
          muscles: (e.muscles || []).map((m: any) => m.name_en || m.name),
          musclesSecondary: (e.muscles_secondary || []).map((m: any) => m.name_en || m.name),
          equipment: (e.equipment || []).map((q: any) => q.name),
          description: stripHtml(translation.description || '').slice(0, 240),
          muscleIds: (e.muscles || []).map((m: any) => m.id),
          equipmentIds: (e.equipment || []).map((q: any) => q.id),
        } as WgerExerciseSummary;
      })
      .filter((e): e is WgerExerciseSummary => e !== null);
  } finally {
    clearTimeout(timeoutId);
  }
}

function getExerciseIndex(): Promise<WgerExerciseSummary[]> {
  if (!exerciseIndexPromise) {
    exerciseIndexPromise = loadExerciseIndex().catch((err) => {
      exerciseIndexPromise = null; // allow a retry on the next call
      throw err;
    });
  }
  return exerciseIndexPromise;
}

const SEARCH_STOP_WORDS = new Set([
  'exercise', 'exercises', 'workout', 'workouts', 'for', 'the', 'a', 'an', 'good', 'best', 'to', 'do',
  'with', 'at', 'in', 'my', 'and', 'of', 'some', 'any', 'me', 'on', 'training'
]);

const stem = (word: string) => word.replace(/(ing|es|s)$/, '');

export async function searchExercises(
  query: string,
  options: {
    category?: string;
    muscle?: string;
    equipment?: string;
    limit?: number;
  } = {}
): Promise<WgerResult<WgerExerciseSummary[]>> {
  try {
    const index = await getExerciseIndex();
    const limit = options.limit || 10;
    const tokens = query
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t && !SEARCH_STOP_WORDS.has(t))
      .map(stem)
      .filter(Boolean);
    const phrase = query.toLowerCase().trim();

    const scored = index
      .filter((e) => {
        if (options.muscle && !e.muscleIds.includes(Number(options.muscle))) return false;
        if (options.equipment && !e.equipmentIds.includes(Number(options.equipment))) return false;
        if (options.category && String(e.categoryId) !== options.category) return false;
        return true;
      })
      .map((e) => {
        const name = e.name.toLowerCase();
        const primary = e.muscles.join(' ').toLowerCase();
        const secondary = e.musclesSecondary.join(' ').toLowerCase();
        const equip = e.equipment.join(' ').toLowerCase();
        const cat = e.category.toLowerCase();

        let score = tokens.length === 0 ? 1 : 0;
        if (phrase && name.includes(phrase)) score += 5;
        for (const t of tokens) {
          if (name.includes(t)) score += 3;
          if (primary.includes(t)) score += 2;
          if (secondary.includes(t)) score += 1;
          if (equip.includes(t)) score += 2;
          if (cat.includes(t)) score += 1.5;
        }
        return { e, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || a.e.name.length - b.e.name.length);

    return {
      success: true,
      data: scored.slice(0, limit).map((x) => x.e),
      count: scored.length
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? `WGER exercise lookup failed: ${error.message}` : 'WGER exercise lookup failed'
    };
  }
}

// Plain-language muscle names -> patterns that match wger's muscle names ("Quads", "Glutes", "Lats", ...)
const MUSCLE_PATTERNS: Record<string, RegExp> = {
  glute: /glut/,
  hamstring: /hamstring/,
  quadriceps: /quad/,
  calves: /calf|calves|gastrocnemius|soleus/,
  abdominals: /\babs?\b|abdom|oblique/,
  lats: /lat|trap|rhomboid/,
  back: /back|erector|lat|trap|rhomboid/,
  chest: /chest|pector/,
  shoulders: /shoulder|delt/,
  arms: /bicep|tricep|brachi|forearm/,
};

// Not strength exercises: skip them when proposing movements for a workout plan
const NON_TRAINING_NAME = /foam roll|smr|stretch|mobility|massage|warm.?up/i;

// Equipment words in an exercise's NAME. wger sometimes tags equipment-based exercises as bodyweight
// (e.g. "TRX Rows"), so without gym access these names are dropped unless the user owns that equipment.
const EQUIPMENT_IN_NAME = /trx|suspension|machine|cable|barbell|dumbbell|kettlebell|bench|pull.?up|chin.?up|\bbar\b|rope|sled|plate|smith|\bballs?\b|\bbands?\b|\bbosu\b|\bdips?\b|\bshrugs?\b|\bswim/i;

export interface ExerciseCandidateGroup {
  muscle: string;
  exercises: WgerExerciseSummary[];
}

// Real exercises (from wger) that fit a user's target muscles, equipment and injuries.
// The plan route hands these to the model so exercises come from a real database instead of
// being invented. Deterministic: the same inputs always give the same candidates.
export async function findExerciseCandidates(options: {
  muscles: string[];              // priority muscles (more candidates each)
  fillerMuscles?: string[];       // other muscles, kept small so full-body days are still possible
  gymAccess: boolean;             // true = every wger equipment type is allowed
  equipment?: string[];           // the user's own equipment (free text), used when gymAccess is false
  excludeKeywords?: string[];     // exercise-name keywords to avoid (e.g. derived from injuries)
  perMuscle?: number;
  fillerPerMuscle?: number;
}): Promise<WgerResult<ExerciseCandidateGroup[]>> {
  try {
    const index = await getExerciseIndex();
    const exclude = (options.excludeKeywords || []).map((k) => k.toLowerCase());

    // Free-text equipment ("dumbbells", "resistance bands") -> word stems matched against wger's equipment names
    const stems = (options.equipment || [])
      .flatMap((e) => e.toLowerCase().split(/[^a-z]+/))
      .filter((t) => t.length >= 4)
      .map((t) => t.replace(/s$/, ''));
    // wger leaves `equipment` empty on many machine exercises, so an empty list means "unknown", not
    // "bodyweight". Without gym access an exercise must carry an explicit bodyweight/mat tag or match
    // equipment the user owns.
    const equipmentOk = (e: WgerExerciseSummary) =>
      options.gymAccess ||
      (e.equipment.length > 0 &&
        e.equipment.every((name) => {
          const n = name.toLowerCase();
          return /none|bodyweight|gym mat/.test(n) || stems.some((s) => n.includes(s));
        }));

    const used = new Set<number>();
    const pick = (muscle: string, limit: number): WgerExerciseSummary[] => {
      const pattern = MUSCLE_PATTERNS[muscle];
      if (!pattern) return [];
      const picked = index
        .filter((e) => !used.has(e.id) && pattern.test(e.muscles.join(' ').toLowerCase()))
        .filter((e) => !NON_TRAINING_NAME.test(e.name) && !exclude.some((k) => e.name.toLowerCase().includes(k)))
        .filter(equipmentOk)
        .filter((e) => options.gymAccess || !EQUIPMENT_IN_NAME.test(e.name) || stems.some((st) => e.name.toLowerCase().includes(st)))
        // Prefer well-documented, simple-equipment exercises with short, standard names
        .sort((a, b) =>
          Number(!a.description) - Number(!b.description) ||
          a.equipment.length - b.equipment.length ||
          a.name.length - b.name.length ||
          a.name.localeCompare(b.name))
        .slice(0, limit);
      picked.forEach((e) => used.add(e.id));
      return picked;
    };

    const groups: ExerciseCandidateGroup[] = [];
    for (const m of options.muscles) groups.push({ muscle: m, exercises: pick(m, options.perMuscle ?? 8) });
    for (const m of options.fillerMuscles || []) {
      if (!options.muscles.includes(m)) groups.push({ muscle: m, exercises: pick(m, options.fillerPerMuscle ?? 4) });
    }
    return { success: true, data: groups.filter((g) => g.exercises.length > 0), count: groups.length };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? `WGER exercise lookup failed: ${error.message}` : 'WGER exercise lookup failed',
    };
  }
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
): Promise<WgerResult<WgerExerciseSummary[]>> {
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
  const allExercises: WgerExerciseSummary[] = [];
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
