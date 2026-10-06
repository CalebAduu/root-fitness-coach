import { NextRequest, NextResponse } from 'next/server';
import { ChatOpenAI } from '@langchain/openai';
import { AIMessage, HumanMessage, SystemMessage, ToolMessage, BaseMessage } from '@langchain/core/messages';
import { allTools } from '@/lib/tools/langchainTools';
import { avoidKeywordsFor, injuryAreasFor, INJURY_SAFE_QUERIES } from '@/lib/injuries';
import { EvalTracer, traceLlm, traceTool, usageFromLangChain, withEval } from '@/lib/evals/evalTrace'; // EVAL HOOK: import

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_TOOL_ROUNDS = 5;

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

    const llm = new ChatOpenAI({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      maxTokens: 600,
      apiKey: process.env.OPENAI_API_KEY,
    }).bindTools(allTools);

    const toolsByName = new Map(allTools.map((t) => [t.name, t]));

    // Injury handling: a strict prompt rule plus code that filters exercise search results
    const injuryAvoid = avoidKeywordsFor(userContext?.injuries);
    const injuryAreas = injuryAreasFor(userContext?.injuries);
    const injuryRule = injuryAreas.length
      ? `

INJURY RULE (strict): the user has an injury affecting: ${injuryAreas.join(', ')}. Never recommend, list or suggest any exercise that loads or stresses that area (for a knee: squats, lunges, jumps, leg press, step-ups, running, deep knee bends) - not even as an option or a "with caution" alternative. The exercise search results are already filtered, but check every name yourself before using it. You must still call search_exercises before recommending anything, and recommend only exercises that appear in its results. If nothing suitable comes back, search again using gentler search queries such as${injuryAreas.flatMap((a) => INJURY_SAFE_QUERIES[a] || []).slice(0, 4).map((q) => `"${q}"`).join(', ')}; if there is still nothing suitable, say so and suggest checking with a physiotherapist. Briefly tell the user you chose options with their injury in mind.`
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
Do not call tools for greetings or simple chit-chat. Never invent exercise or recipe names - use tool results. Whenever the user asks for exercise suggestions you MUST call search_exercises first and recommend only exercises that appear in its results (never list exercises from memory). Prioritize safety, and respect the user's injuries and equipment.

About the user: ${describeUser(userContext)}${injuryRule}`
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

    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      // EVAL HOOK: times this model call and records its token usage (round number in the label)
      const ai = await traceLlm(tracer, `agent_round_${round + 1}`, () => llm.invoke(messages), usageFromLangChain);
      messages.push(ai);

      const toolCalls = ai.tool_calls ?? [];
      // EVAL HOOK: report when the loop gave up while the model still wanted tools (answer may be empty)
      if (round === MAX_TOOL_ROUNDS && toolCalls.length > 0) tracer?.note('max_rounds_reached', true);
      if (toolCalls.length === 0 || round === MAX_TOOL_ROUNDS) {
        answer = typeof ai.content === 'string' ? ai.content : JSON.stringify(ai.content);
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
