import { NextRequest, NextResponse } from 'next/server';
import { ChatOpenAI } from '@langchain/openai';
import { AIMessage, HumanMessage, SystemMessage, ToolMessage, BaseMessage } from '@langchain/core/messages';
import { allTools } from '@/lib/tools/langchainTools';
import { avoidKeywordsFor, injuryAreasFor, INJURY_SAFE_QUERIES } from '@/lib/injuries';
import { EvalTracer, traceLlm, traceTool, usageFromLangChain, withEval } from '@/lib/evals/evalTrace'; // EVAL HOOK: import

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_TOOL_ROUNDS = 5;

// Fitness and nutrition questions always start with a knowledge-base lookup, so the answer is grounded in
// real articles and can cite their links. Leaving it to the model was unreliable: it often skipped the tool.
// Symptoms that need a doctor, not a workout: no forced exercise search, and the prompt tells Root to stop and refer
const RED_FLAG = /chest pain|chest tight|dizz|faint|pass(?:ed)? out|short(?:ness)? of breath|can'?t breathe|heart palpit|numb|blurred vision|severe pain/i;
const MEAL_REQUEST = /dinner|lunch|breakfast|meal|recipe|snack|food|dish|eat\b/i;
const EXERCISE_REQUEST = /exercis|workout|routine|movement|drill|stretch|squat|lunge|quad|hamstring|glute|calf|biceps|triceps|chest|shoulder|\babs\b|\bcore\b|\bback\b|legs?\b|arms?\b/i;
const FITNESS_TOPIC =
  /exercis|workout|train|lift|muscle|protein|diet|nutrition|calori|carb|eat|food|meal|snack|supplement|creatine|squat|deadlift|bench|press|pull|push|cardio|stretch|mobility|recover|sleep|fasted|fasting|weight|fat|abs|core|glute|quad|hamstring|calf|biceps|triceps|shoulder|knee|back|form|technique|reps?|sets?|gym|health|pain|injur|sore|warm.?up|overload|hypertrophy|strength|endurance|run|swim|yoga|plank/i;

interface Source {
  url: string;
  title: string;
  relevanceScore?: number;
}

interface ToolUse {
  name: string;
  args: Record<string, unknown>;
}

interface UserContext {
  name?: string;
  age?: number;
  height?: string;
  weight?: number;
  fitnessGoals?: string;
  experienceLevel?: string;
  gymAccess?: boolean;
  equipment?: string[];
  injuries?: string[];
  workoutDays?: number;
}

function describeUser(user?: UserContext): string {
  if (!user) return 'No profile available.';
  const parts = [
    user.name && `Name: ${user.name}`,
    user.age && `Age: ${user.age}`,
    user.height && `Height: ${user.height}`,
    user.weight && `Weight: ${user.weight} lbs`,
    user.fitnessGoals && `Goals: ${user.fitnessGoals}`,
    user.experienceLevel && `Experience: ${user.experienceLevel}`,
    user.gymAccess !== undefined && `Equipment: ${user.gymAccess ? 'full gym access' : (user.equipment?.join(', ') || 'home/bodyweight')}`,
    user.injuries?.length && `Injuries/conditions: ${user.injuries.join(', ')}`,
    user.workoutDays && `Trains ${user.workoutDays} days/week`,
  ].filter(Boolean);
  return parts.length ? parts.join('; ') : 'No profile available.';
}

// Scraped page titles often carry nav-menu junk (e.g. "Asset 19angle-down-bold..."); trim it
function cleanTitle(title: string, url: string): string {
  const trimmed = title.split(/Asset \d+/)[0].trim().slice(0, 90);
  if (trimmed) return trimmed;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

// Pull citable links out of tool results so the UI can show where an answer came from
function extractSources(toolName: string, output: string): Source[] {
  try {
    const parsed = JSON.parse(output);
    if (toolName === 'ask_workout_question' && Array.isArray(parsed.sources)) {
      return parsed.sources
        .filter((s: Source) => s?.url && s?.title)
        .map((s: Source) => ({ ...s, title: cleanTitle(s.title, s.url) }));
    }
    if (toolName === 'search_workout_demonstrations' && Array.isArray(parsed.results)) {
      return parsed.results
        .filter((r: { url?: string; title?: string }) => r?.url && r?.title)
        .map((r: { url: string; title: string }) => ({ url: r.url, title: r.title }));
    }
  } catch {
    // Non-JSON tool output has no sources to extract
  }
  return [];
}

// Exercises returned by search_exercises, kept as candidate sources (link to the wger exercise page)
function extractExerciseCandidates(output: string): Source[] {
  try {
    const parsed = JSON.parse(output);
    if (!Array.isArray(parsed.exercises)) return [];
    return parsed.exercises
      .filter((ex: { id?: number; name?: string }) => ex?.id && ex?.name)
      .map((ex: { id: number; name: string }) => ({ url: `https://wger.de/en/exercise/${ex.id}/view/`, title: `${ex.name} (wger exercise database)` }));
  } catch {
    return [];
  }
}

// Removes exercises from a search_exercises result when their name matches a keyword the user's injury rules out.
// Done in code because relying on the model to filter its own search results was not reliable.
function filterExercisesForInjury(output: string, avoid: string[], limit: number): string {
  try {
    const parsed = JSON.parse(output);
    if (!Array.isArray(parsed.exercises)) return output;
    const kept = parsed.exercises.filter(
      (ex: { name?: string }) => !avoid.some((k) => String(ex.name || '').toLowerCase().includes(k))
    );
    const removed = parsed.exercises.length - kept.length;
    parsed.exercises = kept.slice(0, limit);
    parsed.count = parsed.exercises.length;
    if (removed > 0) {
      parsed.injuryFilter = `${removed} result(s) were removed because they could aggravate the user's injury. Do not suggest exercises that are not in this list.`;
    }
    if (parsed.exercises.length === 0) {
      parsed.injuryFilter = "Every result was removed because it could aggravate the user's injury. Try a gentler search term, or tell the user you could not find a suitable option and suggest checking with a physiotherapist.";
    }
    return JSON.stringify(parsed);
  } catch {
    return output;
  }
}

// Picks the knowledge-base mode for a question
function knowledgeQuestionType(message: string): 'general' | 'workout' | 'form' | 'nutrition' {
  if (/how (do|to|should)|form|technique|proper/i.test(message)) return 'form';
  if (/eat|food|protein|diet|meal|calori|carb|nutrition|fasted|fasting|supplement|creatine/i.test(message)) return 'nutrition';
  if (EXERCISE_REQUEST.test(message)) return 'workout';
  return 'general';
}

// Names of listed exercises ("1. Wall Sits: ...", "- Step-ups - ...") that match an avoid keyword for the user's injury
function unsafeListedExercises(answer: string, avoid: string[]): string[] {
  const unsafe: string[] = [];
  for (const line of answer.split(/\r?\n/)) {
    const item = line.match(/^\s*(?:\d+[.)]|[-*•])\s+(.*)$/);
    if (!item) continue;
    const name = item[1].split(/\s[-–]\s|:|\(/)[0].trim().toLowerCase();
    if (name && avoid.some((k) => name.includes(k))) unsafe.push(item[1].split(/\s[-–]\s|:|\(/)[0].trim());
  }
  return unsafe;
}

export async function POST(request: NextRequest) {
  const tracer = EvalTracer.fromRequest(request); // EVAL HOOK: null unless EVAL_MODE + valid x-eval-token
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    const { message, history = [], userContext } = await request.json();
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required and must be a string' }, { status: 400 });
    }

    const baseLlm = new ChatOpenAI({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      maxTokens: 600,
      apiKey: process.env.OPENAI_API_KEY,
    });
    const llm = baseLlm.bindTools(allTools);
    const redFlag = RED_FLAG.test(message);
    // Fitness questions always consult the knowledge base (for citable links). That lookup runs in code, in parallel
    // with the model's first step, instead of costing a model round of its own.
    const knowledgeLookup = !redFlag && FITNESS_TOPIC.test(message);
    // Pure exercise requests force the exercise search as the first model step (that is where the injury filter runs).
    // Requests that also ask for food go through the normal tool choice so the meal tools are not skipped.
    const forceExerciseSearch = knowledgeLookup && EXERCISE_REQUEST.test(message) && !MEAL_REQUEST.test(message);
    const forcedLlms = forceExerciseSearch ? [baseLlm.bindTools(allTools, { tool_choice: 'search_exercises' })] : [];

    const toolsByName = new Map(allTools.map((t) => [t.name, t]));

    // Injury handling: a strict prompt rule plus code that filters exercise search results
    const injuryAvoid = avoidKeywordsFor(userContext?.injuries);
    const injuryAreas = injuryAreasFor(userContext?.injuries);
    const injuryRule = injuryAreas.length
      ? `

INJURY RULE (strict): the user has an injury affecting: ${injuryAreas.join(', ')}. Never recommend, list or suggest any exercise that loads or stresses that area (for a knee: squats, lunges, jumps, leg press, step-ups, running, deep knee bends) - not even as an option or a "with caution" alternative. The exercise search results are already filtered, but check every name yourself before using it. You must still call search_exercises before recommending anything, and recommend only exercises that appear in its results. If nothing suitable comes back, search again using gentler search queries such as${injuryAreas.flatMap((a) => INJURY_SAFE_QUERIES[a] || []).slice(0, 4).map((q) => `"${q}"`).join(', ')}; if there is still nothing suitable, say so and suggest checking with a physiotherapist. Briefly tell the user you chose options with their injury in mind.`
      : '';

    const redFlagRule = redFlag
      ? `

RED FLAG (strict): the user describes symptoms that can be serious. Your answer must start by telling them to stop exercising now and get medical attention before doing any exercise. Do not suggest a workout or list exercises.`
      : '';

    const messages: BaseMessage[] = [
      new SystemMessage(
        `You are "Root", a friendly, encouraging AI fitness and nutrition coach inside a fitness app.
Answer the user's question concisely (a short paragraph or a tight list), in a motivating tone.
Format as plain text only: no markdown, no bold/asterisks, no headings, no images. Use simple numbered lines ("1. ...") for lists and write links as bare URLs.

You have tools. Use them whenever they would make the answer more accurate or useful:
- search_exercises / get_muscle_groups / get_equipment: look up real exercises, muscles, and equipment.
- find_meals_by_ingredient, get_meal_details, find_healthy_meals, find_high_protein_meals, find_vegetarian_meals, search_meals_by_name, get_random_meal: find real meal ideas and recipes.
- search_workout_demonstrations: find form videos/guides when the user asks how to do an exercise.
- ask_workout_question: consult the fitness knowledge base for training, form, or nutrition guidance.
Do not call tools for greetings or simple chit-chat. Never invent exercise or recipe names - use tool results. Whenever the user asks for exercise suggestions you MUST call search_exercises first and recommend only exercises that appear in its results (never list exercises from memory). For any question about training, technique, recovery, nutrition or health, and also when you suggest exercises, you MUST call ask_workout_question so your answer is backed by the knowledge base and can cite real websites; base the answer on what it returns, including its key form cues and safety advice. The knowledge base is for guidance only: take exercise names from search_exercises and dish names from the meal tools, never from the knowledge base text. Prioritize safety, and respect the user's injuries and equipment.

About the user: ${describeUser(userContext)}${injuryRule}${redFlagRule}`
      ),
      ...history.slice(-4).flatMap((h: { question: string; answer: string }) => [
        new HumanMessage(h.question),
        new AIMessage(h.answer),
      ]),
      new HumanMessage(message),
    ];

    const toolsUsed: ToolUse[] = [];
    const sources: Source[] = [];
    const exerciseCandidates: Array<Source & { name: string }> = [];
    let answer = '';

    // Start the knowledge-base lookup now so it overlaps with the first model call
    const kbArgs = { question: message, questionType: knowledgeQuestionType(message) };
    const kbTool = toolsByName.get('ask_workout_question');
    const kbPromise: Promise<string> | null =
      knowledgeLookup && kbTool
        ? traceTool(tracer, { name: 'ask_workout_question', args: kbArgs, round: 1 }, async () => String(await (kbTool as any).invoke(kbArgs))).catch((err) =>
            JSON.stringify({ success: false, error: err instanceof Error ? err.message : 'Tool failed' })
          )
        : null;
    let kbInjected = false;
    // Adds the lookup to the conversation as a normal tool call plus result, and collects its sources
    const injectKnowledge = async () => {
      if (!kbPromise || kbInjected) return;
      kbInjected = true;
      const output = String(await kbPromise);
      toolsUsed.push({ name: 'ask_workout_question', args: kbArgs });
      sources.push(...extractSources('ask_workout_question', output));
      messages.push(
        new AIMessage({ content: '', tool_calls: [{ name: 'ask_workout_question', args: kbArgs, id: 'kb_lookup', type: 'tool_call' }] }),
        new ToolMessage({ content: output, tool_call_id: 'kb_lookup' })
      );
    };

    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      // EVAL HOOK: times this model call and records its token usage (round number in the label)
      const ai = await traceLlm(tracer, `agent_round_${round + 1}`, () => (round < forcedLlms.length ? forcedLlms[round] : llm).invoke(messages), usageFromLangChain);
      messages.push(ai);

      const toolCalls = ai.tool_calls ?? [];
      // The model answered without tools before seeing the knowledge base: drop that draft and answer again with it
      if (toolCalls.length === 0 && kbPromise && !kbInjected && round < MAX_TOOL_ROUNDS) {
        messages.pop();
        await injectKnowledge();
        continue;
      }
      // EVAL HOOK: report when the loop gave up while the model still wanted tools (answer may be empty)
      if (round === MAX_TOOL_ROUNDS && toolCalls.length > 0) tracer?.note('max_rounds_reached', true);
      if (toolCalls.length === 0 || round === MAX_TOOL_ROUNDS) {
        answer = typeof ai.content === 'string' ? ai.content : JSON.stringify(ai.content);
        if (!kbInjected && kbPromise) {
          const output = String(await kbPromise);
          toolsUsed.push({ name: 'ask_workout_question', args: kbArgs });
          sources.push(...extractSources('ask_workout_question', output));
          kbInjected = true;
        }
        break;
      }

      const results = await Promise.all(
        toolCalls.map(async (call) => {
          const tool = toolsByName.get(call.name);
          let output: string;
          if (!tool) {
            output = JSON.stringify({ success: false, error: `Unknown tool: ${call.name}` });
          } else {
            try {
              // EVAL HOOK: times the tool and records a short summary of its result
              const filterForInjury = call.name === 'search_exercises' && injuryAvoid.length > 0;
              const requestedLimit = Number((call.args as { limit?: number }).limit) || 10;
              // Ask for extra results when filtering, so enough safe ones remain after unsafe ones are removed
              const invokeArgs = filterForInjury ? { ...call.args, limit: Math.max(requestedLimit * 4, 30) } : call.args;
              output = String(
                await traceTool(tracer, { name: call.name, args: call.args as Record<string, unknown>, round: round + 1 }, async () => {
                  const raw = await (tool as any).invoke(invokeArgs);
                  return filterForInjury ? filterExercisesForInjury(String(raw), injuryAvoid, requestedLimit) : raw;
                })
              );
            } catch (err) {
              output = JSON.stringify({ success: false, error: err instanceof Error ? err.message : 'Tool failed' });
            }
          }
          return { call, output };
        })
      );

      for (const { call, output } of results) {
        toolsUsed.push({ name: call.name, args: call.args as Record<string, unknown> });
        sources.push(...extractSources(call.name, output));
        if (call.name === 'search_exercises') {
          exerciseCandidates.push(...extractExerciseCandidates(output).map((c) => ({ ...c, name: c.title.replace(' (wger exercise database)', '') })));
        }
        messages.push(new ToolMessage({ content: output, tool_call_id: call.id ?? call.name }));
      }
      // The lookup has been running alongside this round; add its result before the model writes the answer
      await injectKnowledge();
    }

    // Safety net: the model sometimes lists exercises from memory that the injury rules out. Ask it to redo the
    // answer once, then drop any list line that is still unsafe.
    if (injuryAvoid.length > 0) {
      let unsafe = unsafeListedExercises(answer, injuryAvoid);
      if (unsafe.length > 0) {
        tracer?.note('injury_answer_rewritten', true);
        messages.push(
          new HumanMessage(
            `Your last answer listed ${unsafe.join(', ')}, which could aggravate my injury (${injuryAreas.join(', ')}). Rewrite the answer without them, using only exercises that appeared in the search_exercises results. Write it as a fresh first answer: do not apologise or mention the earlier answer.`
          )
        );
        const retry = await traceLlm(tracer, 'injury_rewrite', () => baseLlm.invoke(messages), usageFromLangChain);
        answer = typeof retry.content === 'string' ? retry.content : answer;
        unsafe = unsafeListedExercises(answer, injuryAvoid);
      }
      if (unsafe.length > 0) {
        answer = answer
          .split(/\r?\n/)
          .filter((line) => !unsafe.some((u) => line.includes(u)))
          .join('\n');
      }
    }

    // The UI renders plain text, so strip any markdown the model slips in despite instructions
    answer = answer
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1: $2')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .trim();

    // Cite only the wger exercises the answer actually names (the model rarely uses every search result)
    const answerLower = answer.toLowerCase();
    sources.push(
      ...exerciseCandidates
        .filter((c) => answerLower.includes(c.name.toLowerCase()))
        .slice(0, 5)
        .map(({ url, title }) => ({ url, title }))
    );

    // De-duplicate sources by URL
    const uniqueSources = Array.from(new Map(sources.map((s) => [s.url, s])).values());

    return NextResponse.json(
      // EVAL HOOK: adds `_eval` to the body only in eval mode
      withEval(tracer, {
        success: true,
        answer,
        sources: uniqueSources,
        toolsUsed,
      })
    );
  } catch (error) {
    console.error('Error in ask-root API:', error);
    tracer?.recordError(error); // EVAL HOOK: keep the failure reason so the runner can tell infra errors from AI errors
    return NextResponse.json(
      withEval(tracer, {
        error: 'Sorry, I encountered an error while processing your question. Please try again.',
        details: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined,
      }), // EVAL HOOK
      { status: 500 }
    );
  }
}
