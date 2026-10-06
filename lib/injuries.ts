// Shared injury handling for the plan route and Ask Root.
//
// A free-text injury ("very bad knee") maps to an area, and each area maps to exercise-name keywords
// that should not be suggested. This is a best-effort keyword safety net, not medical advice: the
// prompts also tell the model to avoid aggravating the injury, and the eval suite measures how well
// the combination works.

export const INJURY_AVOID: Record<string, string[]> = {
  knee: ['lunge', 'jump', 'plyo', 'burpee', 'pistol', 'shrimp', 'box', 'sprint', 'skater', 'squat', 'leg press', 'sled', 'hack', 'leg extension', 'stair', 'climb', 'step', 'run', 'jog', 'wall-sit', 'wall sit', 'snap', 'battle', 'glider', 'single leg', 'single-leg', 'deadlift', 'sumo', 'swim'],
  back: ['deadlift', 'good morning', 'sit-up', 'situp', 'crunch', 'superman', 'hyperextension', 'bent over'],
  shoulder: ['overhead', 'military', 'upright', 'dip', 'behind the neck', 'snatch', 'handstand'],
  wrist: ['push-up', 'pushup', 'plank', 'handstand'],
  ankle: ['jump', 'plyo', 'skater', 'sprint', 'burpee', 'calf raise'],
  hip: ['lunge', 'sumo', 'deep'],
  neck: ['shrug', 'behind the neck'],
};

// Gentler search terms the assistant can fall back on when the first search returns nothing suitable
export const INJURY_SAFE_QUERIES: Record<string, string[]> = {
  knee: ['quad sets', 'straight leg raise', 'terminal knee extension', 'glute bridge', 'leg curl'],
  back: ['bird dog', 'dead bug', 'glute bridge', 'plank'],
  shoulder: ['band pull apart', 'external rotation', 'wall slide'],
  wrist: ['forearm', 'dumbbell curl'],
  ankle: ['seated', 'leg curl', 'glute bridge'],
  hip: ['glute bridge', 'clamshell', 'leg curl'],
  neck: ['bird dog', 'glute bridge'],
};

export function injuryAreasFor(injuries?: string[]): string[] {
  const text = (injuries || []).join(' ').toLowerCase();
  return Object.keys(INJURY_AVOID).filter((area) => text.includes(area));
}

export function avoidKeywordsFor(injuries?: string[]): string[] {
  return injuryAreasFor(injuries).flatMap((area) => INJURY_AVOID[area]);
}

// Reads the user's reply to the injury question.
// "No injuries, I'm healthy" -> [], "No, but my left knee clicks and sore back" -> two items.
// Generic words like "injury" or "pain" don't count as a specific problem; body parts and conditions do.
const SPECIFIC_PROBLEM = /knee|back|shoulder|wrist|ankle|hip|neck|elbow|hamstring|calf|groin|joint|arthritis|asthma|surgery|torn|sprain|fractur|diabet|heart|blood pressure|hernia|tendon|ligament|disc|acl|meniscus/i;
const MEANS_NONE = /^(no|none|nope|nothing|nil|n\/a|na)\b|don'?t have any|do not have any|\bhealthy\b|all good|nothing to report/i;

export function parseInjuryReply(reply?: string | null): string[] {
  const text = (reply || '').trim();
  if (!text) return [];
  if (!SPECIFIC_PROBLEM.test(text) && MEANS_NONE.test(text)) return [];
  return text
    .split(/,|;|\band\b/i)
    .map((s) => s.trim().replace(/^(no|nope)\b[,.\s]*(but\s+)?/i, '').replace(/^(also|but|and)\s+/i, '').trim())
    .filter((s) => s && !/^(no|nope)$/i.test(s));
}
