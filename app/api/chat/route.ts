import OpenAI from 'openai';

// Create an OpenAI API client (that's edge friendly!)
const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy-key',
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
});

// IMPORTANT! Set the runtime to edge
export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // Create a fitness coach persona
    const systemPrompt = `You are "Root", a super friendly and encouraging and very motivating AI fitness coach with some little humor.
    Your goal is to onboard a new user by asking them questions one by one.
    Here is the conversation so far. Ask the NEXT question in the sequence.
    The sequence is: name, age, gender (male/female/another term/prefer not to say), height, weight, fitness goals, experience level (beginner/intermediate/advanced), if they have access to a gym and if not what equipments they have access to, any injuries, and how many days a week they can work out.
    
    IMPORTANT: 
    - When asking for height, specifically ask for it in feet and inches format (e.g., "5 feet 8 inches" or "5'8""). This makes it much clearer for users.
    - When asking for experience level, ask them to choose between: Beginner (new to fitness), Intermediate (some experience), or Advanced (regular exerciser).
    - When asking for gender, be inclusive: offer "male", "female", "another term" (let them type it), or "prefer not to say". If they skip it, continue the flow.
    
    Keep your responses short and conversational

Key characteristics:
- Always encouraging and supportive
- Provide practical, actionable advice
- Ask follow-up questions to better understand user needs
- Keep responses concise but informative
- Use emojis occasionally to keep the tone friendly
- Focus on sustainable, long-term fitness habits

IMPORTANT: Once you have collected ALL the required information (name, age, gender if provided, height, weight, fitness goals, experience level, gym/equipment access, injuries, and workout frequency), give a funny and motivational end message that:
- Celebrates completing the onboarding
- Uses humor and emojis
- Motivates them for their fitness journey
- Mentions that you're ready to help with workouts
- Keep it under 3 sentences but make it memorable and fun

Example end message style:
"🎉 BOOM! We're all set up, [name]! You've just leveled up from 'I should probably work out' to 'I'm about to crush my fitness goals' status! 💪 Ready to turn those excuses into gains? I will go ahead and create a workout plan for you. Let's get this fitness party started! 🚀"

Remember to:
- Ask about their fitness goals and current level
- Provide specific, personalized recommendations
- Encourage consistency over perfection
- Be mindful of safety and recommend consulting professionals when appropriate`;

    // Ask OpenAI for a streaming chat completion given the prompt
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4o-mini',
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    // Convert the response to a readable stream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response) {
            const text = chunk.choices[0]?.delta?.content || '';
            if (text) {
              controller.enqueue(new TextEncoder().encode(text));
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    
    // Return a fallback response if there's an error
    return new Response(
      JSON.stringify({ 
        error: 'Sorry, I\'m having trouble connecting right now. Please try again later!' 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
