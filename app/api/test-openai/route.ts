import OpenAI from 'openai';

const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy-key',
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
});

export async function GET() {
  try {
    console.log('Testing OpenAI API connection...');
    
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'dummy-key') {
      return new Response(JSON.stringify({ 
        error: 'OpenAI API key not configured',
        hasKey: false 
      }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    const response = await Promise.race([
      openaiClient.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Say "Hello, API is working!"' }],
        max_tokens: 10,
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 5000)
      )
    ]);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'OpenAI API is working',
      response: response.choices[0]?.message?.content 
    }), { 
      headers: { 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('OpenAI test failed:', error);
    return new Response(JSON.stringify({ 
      error: 'OpenAI API test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}
