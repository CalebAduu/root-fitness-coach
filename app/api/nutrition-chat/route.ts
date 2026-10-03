import OpenAI from 'openai';

// Create an OpenAI API client
const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy-key',
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
});

// IMPORTANT! Set the runtime to edge
export const runtime = 'edge';

const NUTRITION_QUESTIONS = {
  general: [
    "Do you have any food allergies or intolerances (e.g., dairy, gluten, nuts)?",
    "Do you follow or prefer a specific dietary pattern (e.g., Mediterranean, American, vegetarian, vegan, ketogenic, intermittent fasting)?",
    "Do you have any medical conditions that affect diet (e.g., diabetes, hypertension, high cholesterol)?",
    "How many meals and snacks do you typically eat in a day?",
    "How often do you prepare meals at home versus eating out?",
    "Do you consume alcohol, and if so, how frequently?"
  ],
  weight_loss: [
    "What is your desired rate of weight loss (gradual, moderate, rapid)?",
    "Have you followed any weight loss diets before, and what challenges did you face?",
    "Do you tend to struggle more with portion sizes, snacking, or food choices?"
  ],
  sports_performance: [
    "Do you require higher protein intake to support training or recovery?",
    "Do you use or plan to use performance-related supplements (e.g., protein powders, creatine, electrolytes)?",
    "Do you experience difficulties meeting energy needs during periods of heavy training?"
  ],
  health_maintenance: [
    "Are you currently managing cholesterol, blood pressure, or blood sugar through diet?",
    "Do you monitor your intake of specific nutrients (e.g., fiber, sodium, added sugar)?",
    "Are there particular health concerns you want your diet to address (e.g., gut health, heart health, longevity)?"
  ],
  get_active: [
    "Do you want guidance on a balanced daily calorie intake for starting an active lifestyle?",
    "Do you have preferences for simpler, easy-to-prepare meals and snacks?",
    "Are you looking for portion guidance to help structure your eating habits?"
  ]
};

export async function POST(req: Request) {
  try {
    const { messages, goal, currentQuestionIndex } = await req.json();

    const questions = NUTRITION_QUESTIONS[goal as keyof typeof NUTRITION_QUESTIONS] || [];
    const totalQuestions = questions.length;

    // Create nutrition coach persona
    const systemPrompt = `You are "Root", a super friendly and encouraging AI nutrition coach with expertise in personalized nutrition planning.
    Your goal is to collect nutrition information from the user through a conversational chat.
    
    Current goal: ${goal}
    Question ${currentQuestionIndex + 1} of ${totalQuestions}: ${questions[currentQuestionIndex] || "All questions completed"}
    
    IMPORTANT RULES:
    - Ask ONE question at a time in a conversational, friendly manner
    - Keep responses short and encouraging
    - Use emojis occasionally to keep the tone friendly
    - If this is the last question, after getting the answer, give a motivational completion message
    - Be supportive and non-judgmental about dietary choices
    - If user provides incomplete information, gently ask for clarification
    
    Key characteristics:
    - Always encouraging and supportive
    - Provide practical, actionable advice
    - Keep responses concise but informative
    - Focus on sustainable, long-term nutrition habits
    - Be mindful of medical conditions and allergies
    
    IMPORTANT: Once you have collected ALL the required information for the ${goal} goal, give a motivational end message that:
    - Celebrates completing the nutrition assessment
    - Uses humor and emojis
    - Motivates them for their nutrition journey
    - Mentions that you're ready to create their personalized nutrition plan
    - Keep it under 3 sentences but make it memorable and fun
    - Ends with the exact literal text "[NUTRITION_COMPLETE]" as the very last characters of your message, on its own, after your celebratory message. This is a hidden control token the app uses to detect completion - it is never shown to the user, so do not explain it or mention it.

    Example end message style:
    "🎉 BOOM! We're all set up with your nutrition info! You've just leveled up from 'I should probably eat better' to 'I'm about to fuel my body like a champion' status! 🍎 Ready to turn those nutrition goals into reality? I will go ahead and create your personalized nutrition plan. Let's get this healthy eating party started! 🚀[NUTRITION_COMPLETE]"

    Do NOT include "[NUTRITION_COMPLETE]" in any message except the final completion message.
    
    Remember to:
    - Ask about their nutrition goals and current habits
    - Provide specific, personalized recommendations
    - Encourage consistency over perfection
    - Be mindful of safety and recommend consulting professionals when appropriate`;

    // Ask OpenAI for a streaming chat completion
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      stream: true,
      temperature: 0.7,
      max_tokens: 500,
    });

    // Create a streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              controller.enqueue(new TextEncoder().encode(content));
            }
          }
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Nutrition chat error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process nutrition chat request' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}


